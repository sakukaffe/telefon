import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThan, LessThan } from 'typeorm';
import { Call, CallState, CallDirection } from '../calls/entities/call.entity';
import { Extension } from '../extensions/entities/extension.entity';
import { Queue } from '../queues/entities/queue.entity';
import { AgentState, AgentStatus } from '../queues/entities/agent-state.entity';

export interface DashboardStats {
  calls: {
    active: number;
    total24h: number;
    inbound: number;
    outbound: number;
    internal: number;
    answered: number;
    missed: number;
    avgDuration: number;
  };
  extensions: {
    total: number;
    registered: number;
    active: number;
  };
  queues: {
    total: number;
    agentsAvailable: number;
    agentsBusy: number;
    agentsTotal: number;
    callsWaiting: number;
  };
  system: {
    uptime: number;
    sipConnected: boolean;
    rtpengineConnected: boolean;
  };
}

export interface CallReport {
  period: string;
  totalCalls: number;
  answeredCalls: number;
  missedCalls: number;
  avgDuration: number;
  totalDuration: number;
  byDirection: {
    inbound: number;
    outbound: number;
    internal: number;
  };
  byHour: Array<{
    hour: number;
    calls: number;
  }>;
  topCallers: Array<{
    number: string;
    calls: number;
    duration: number;
  }>;
  topDestinations: Array<{
    number: string;
    calls: number;
    duration: number;
  }>;
}

export interface QueueReport {
  queueId: string;
  queueName: string;
  period: string;
  totalCalls: number;
  answeredCalls: number;
  abandonedCalls: number;
  avgWaitTime: number;
  maxWaitTime: number;
  avgTalkTime: number;
  serviceLevelMet: number;
  serviceLevelTarget: number;
  agentStats: Array<{
    extensionId: string;
    extensionNumber: string;
    callsHandled: number;
    avgTalkTime: number;
    totalLoginTime: number;
    totalBreakTime: number;
  }>;
}

/**
 * Reports & Analytics Service
 *
 * Provides comprehensive reporting and analytics:
 * - Real-time dashboard statistics
 * - Call reports (CDR)
 * - Queue performance reports
 * - Agent performance reports
 * - System health monitoring
 * - Trend analysis
 */
@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);
  private systemStartTime: Date;

  constructor(
    @InjectRepository(Call)
    private readonly callRepository: Repository<Call>,
    @InjectRepository(Extension)
    private readonly extensionRepository: Repository<Extension>,
    @InjectRepository(Queue)
    private readonly queueRepository: Repository<Queue>,
    @InjectRepository(AgentState)
    private readonly agentStateRepository: Repository<AgentState>,
  ) {
    this.systemStartTime = new Date();
  }

  /**
   * Get dashboard statistics
   */
  async getDashboardStats(): Promise<DashboardStats> {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Call statistics
    const activeCalls = await this.callRepository.count({
      where: [
        { state: CallState.INITIATED },
        { state: CallState.RINGING },
        { state: CallState.ANSWERED },
        { state: CallState.HELD },
      ],
    });

    const calls24h = await this.callRepository.find({
      where: {
        initiatedAt: MoreThan(last24h),
      },
    });

    const inbound = calls24h.filter((c) => c.direction === CallDirection.INBOUND).length;
    const outbound = calls24h.filter((c) => c.direction === CallDirection.OUTBOUND).length;
    const internal = calls24h.filter((c) => c.direction === CallDirection.INTERNAL).length;
    const answered = calls24h.filter((c) => c.state === CallState.ANSWERED || c.answeredAt).length;
    const missed = calls24h.filter((c) => c.state === CallState.FAILED || (c.state === CallState.ENDED && !c.answeredAt)).length;

    // Calculate average duration (in seconds)
    const answeredCalls = calls24h.filter((c) => c.answeredAt && c.endedAt);
    const avgDuration =
      answeredCalls.length > 0
        ? answeredCalls.reduce((sum, call) => {
            const duration = Math.floor((call.endedAt!.getTime() - call.answeredAt!.getTime()) / 1000);
            return sum + duration;
          }, 0) / answeredCalls.length
        : 0;

    // Extension statistics
    const totalExtensions = await this.extensionRepository.count();
    const activeExtensions = await this.extensionRepository
      .createQueryBuilder('extension')
      .leftJoin('extension.registrations', 'registration')
      .where('registration.expiresAt > :now', { now })
      .getCount();

    // Queue statistics
    const totalQueues = await this.queueRepository.count();

    const agentStates = await this.agentStateRepository.find({
      order: { changedAt: 'DESC' },
    });

    // Get latest state for each agent
    const latestStates = new Map<string, AgentState>();
    agentStates.forEach((state) => {
      const key = `${state.extensionId}-${state.queueId || 'global'}`;
      if (!latestStates.has(key)) {
        latestStates.set(key, state);
      }
    });

    const availableAgents = Array.from(latestStates.values()).filter((s) => s.status === AgentStatus.AVAILABLE).length;
    const busyAgents = Array.from(latestStates.values()).filter((s) => s.status === AgentStatus.BUSY).length;

    return {
      calls: {
        active: activeCalls,
        total24h: calls24h.length,
        inbound,
        outbound,
        internal,
        answered,
        missed,
        avgDuration: Math.round(avgDuration),
      },
      extensions: {
        total: totalExtensions,
        registered: activeExtensions,
        active: activeCalls, // Approximation: extensions with active calls
      },
      queues: {
        total: totalQueues,
        agentsAvailable: availableAgents,
        agentsBusy: busyAgents,
        agentsTotal: latestStates.size,
        callsWaiting: 0, // TODO: Implement queue waiting calls tracking
      },
      system: {
        uptime: Math.floor((now.getTime() - this.systemStartTime.getTime()) / 1000),
        sipConnected: true, // TODO: Get from SipService
        rtpengineConnected: true, // TODO: Get from RtpengineService
      },
    };
  }

  /**
   * Generate call report for a time period
   */
  async getCallReport(startDate: Date, endDate: Date): Promise<CallReport> {
    const calls = await this.callRepository.find({
      where: {
        initiatedAt: Between(startDate, endDate),
      },
      relations: ['callerExtension', 'calleeExtension'],
    });

    const answered = calls.filter((c) => c.answeredAt);
    const missed = calls.filter((c) => c.state === CallState.FAILED || (c.state === CallState.ENDED && !c.answeredAt));

    // Calculate durations
    const durations = answered
      .filter((c) => c.endedAt)
      .map((c) => Math.floor((c.endedAt!.getTime() - c.answeredAt!.getTime()) / 1000));

    const avgDuration = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
    const totalDuration = durations.reduce((a, b) => a + b, 0);

    // By direction
    const inbound = calls.filter((c) => c.direction === CallDirection.INBOUND).length;
    const outbound = calls.filter((c) => c.direction === CallDirection.OUTBOUND).length;
    const internal = calls.filter((c) => c.direction === CallDirection.INTERNAL).length;

    // By hour
    const byHour = new Array(24).fill(0).map((_, hour) => ({ hour, calls: 0 }));
    calls.forEach((call) => {
      const hour = call.initiatedAt.getHours();
      byHour[hour].calls++;
    });

    // Top callers
    const callerStats = new Map<string, { calls: number; duration: number }>();
    calls.forEach((call) => {
      const number = call.callerNumber;
      const existing = callerStats.get(number) || { calls: 0, duration: 0 };
      existing.calls++;
      if (call.answeredAt && call.endedAt) {
        existing.duration += Math.floor((call.endedAt.getTime() - call.answeredAt.getTime()) / 1000);
      }
      callerStats.set(number, existing);
    });

    const topCallers = Array.from(callerStats.entries())
      .map(([number, stats]) => ({ number, ...stats }))
      .sort((a, b) => b.calls - a.calls)
      .slice(0, 10);

    // Top destinations
    const destStats = new Map<string, { calls: number; duration: number }>();
    calls.forEach((call) => {
      const number = call.calleeNumber;
      const existing = destStats.get(number) || { calls: 0, duration: 0 };
      existing.calls++;
      if (call.answeredAt && call.endedAt) {
        existing.duration += Math.floor((call.endedAt.getTime() - call.answeredAt.getTime()) / 1000);
      }
      destStats.set(number, existing);
    });

    const topDestinations = Array.from(destStats.entries())
      .map(([number, stats]) => ({ number, ...stats }))
      .sort((a, b) => b.calls - a.calls)
      .slice(0, 10);

    return {
      period: `${startDate.toISOString()} - ${endDate.toISOString()}`,
      totalCalls: calls.length,
      answeredCalls: answered.length,
      missedCalls: missed.length,
      avgDuration: Math.round(avgDuration),
      totalDuration,
      byDirection: { inbound, outbound, internal },
      byHour,
      topCallers,
      topDestinations,
    };
  }

  /**
   * Generate queue performance report
   */
  async getQueueReport(queueId: string, startDate: Date, endDate: Date): Promise<QueueReport> {
    const queue = await this.queueRepository.findOne({
      where: { id: queueId },
    });

    if (!queue) {
      throw new Error('Queue not found');
    }

    const calls = await this.callRepository.find({
      where: {
        queueId,
        initiatedAt: Between(startDate, endDate),
      },
    });

    const answered = calls.filter((c) => c.answeredAt);
    const abandoned = calls.filter((c) => !c.answeredAt && c.state === CallState.ENDED);

    // Wait times
    const waitTimes = calls
      .filter((c) => c.answeredAt && c.ringingAt)
      .map((c) => Math.floor((c.answeredAt!.getTime() - c.ringingAt!.getTime()) / 1000));

    const avgWaitTime = waitTimes.length > 0 ? waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length : 0;
    const maxWaitTime = waitTimes.length > 0 ? Math.max(...waitTimes) : 0;

    // Talk times
    const talkTimes = answered
      .filter((c) => c.endedAt)
      .map((c) => Math.floor((c.endedAt!.getTime() - c.answeredAt!.getTime()) / 1000));

    const avgTalkTime = talkTimes.length > 0 ? talkTimes.reduce((a, b) => a + b, 0) / talkTimes.length : 0;

    // Service level (calls answered within threshold)
    const threshold = queue.serviceLevelThreshold || 30;
    const metSL = waitTimes.filter((wt) => wt <= threshold).length;
    const serviceLevelMet = calls.length > 0 ? Math.round((metSL / calls.length) * 100) : 0;

    return {
      queueId: queue.id,
      queueName: queue.name,
      period: `${startDate.toISOString()} - ${endDate.toISOString()}`,
      totalCalls: calls.length,
      answeredCalls: answered.length,
      abandonedCalls: abandoned.length,
      avgWaitTime: Math.round(avgWaitTime),
      maxWaitTime,
      avgTalkTime: Math.round(avgTalkTime),
      serviceLevelMet,
      serviceLevelTarget: queue.serviceLevelTarget || 80,
      agentStats: [], // TODO: Implement detailed agent statistics
    };
  }

  /**
   * Get call trends (hourly, daily, weekly)
   */
  async getCallTrends(period: 'hour' | 'day' | 'week', count: number = 24): Promise<Array<{ timestamp: string; calls: number; answered: number; missed: number }>> {
    const now = new Date();
    const trends: Array<{ timestamp: string; calls: number; answered: number; missed: number }> = [];

    for (let i = count - 1; i >= 0; i--) {
      let startDate: Date;
      let endDate: Date;
      let label: string;

      if (period === 'hour') {
        startDate = new Date(now.getTime() - (i + 1) * 60 * 60 * 1000);
        endDate = new Date(now.getTime() - i * 60 * 60 * 1000);
        label = `${startDate.getHours()}:00`;
      } else if (period === 'day') {
        startDate = new Date(now.getTime() - (i + 1) * 24 * 60 * 60 * 1000);
        endDate = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        label = startDate.toISOString().split('T')[0];
      } else {
        startDate = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
        endDate = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
        label = `Week ${i}`;
      }

      const calls = await this.callRepository.find({
        where: {
          initiatedAt: Between(startDate, endDate),
        },
      });

      trends.push({
        timestamp: label,
        calls: calls.length,
        answered: calls.filter((c) => c.answeredAt).length,
        missed: calls.filter((c) => !c.answeredAt && c.state === CallState.ENDED).length,
      });
    }

    return trends;
  }

  /**
   * Export call detail records (CDR)
   */
  async exportCDR(startDate: Date, endDate: Date, format: 'json' | 'csv' = 'json'): Promise<any> {
    const calls = await this.callRepository.find({
      where: {
        initiatedAt: Between(startDate, endDate),
      },
      relations: ['callerExtension', 'calleeExtension', 'trunk'],
      order: {
        initiatedAt: 'DESC',
      },
    });

    if (format === 'json') {
      return calls.map((call) => ({
        callId: call.callId,
        direction: call.direction,
        callerNumber: call.callerNumber,
        calleeNumber: call.calleeNumber,
        state: call.state,
        initiatedAt: call.initiatedAt,
        answeredAt: call.answeredAt,
        endedAt: call.endedAt,
        duration: call.answeredAt && call.endedAt ? Math.floor((call.endedAt.getTime() - call.answeredAt.getTime()) / 1000) : 0,
        hangupCause: call.hangupCause,
        trunkName: call.trunk?.name,
      }));
    } else {
      // CSV format
      const header = 'Call ID,Direction,Caller,Callee,State,Initiated,Answered,Ended,Duration(s),Hangup Cause,Trunk\n';
      const rows = calls
        .map((call) => {
          const duration = call.answeredAt && call.endedAt ? Math.floor((call.endedAt.getTime() - call.answeredAt.getTime()) / 1000) : 0;
          return [
            call.callId,
            call.direction,
            call.callerNumber,
            call.calleeNumber,
            call.state,
            call.initiatedAt?.toISOString() || '',
            call.answeredAt?.toISOString() || '',
            call.endedAt?.toISOString() || '',
            duration,
            call.hangupCause || '',
            call.trunk?.name || '',
          ].join(',');
        })
        .join('\n');

      return header + rows;
    }
  }
}
