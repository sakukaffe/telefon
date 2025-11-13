import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Queue, QueueStatus } from './entities/queue.entity';
import { QueueMember } from './entities/queue-member.entity';
import { AgentState, AgentStatus } from './entities/agent-state.entity';
import { CtiGateway } from '../websocket/gateway/cti.gateway';
import { CreateQueueDto } from './dto/create-queue.dto';
import { UpdateQueueDto } from './dto/update-queue.dto';
import { AddQueueMemberDto } from './dto/add-queue-member.dto';

@Injectable()
export class QueuesService {
  constructor(
    @InjectRepository(Queue)
    private readonly queueRepository: Repository<Queue>,
    @InjectRepository(QueueMember)
    private readonly queueMemberRepository: Repository<QueueMember>,
    @InjectRepository(AgentState)
    private readonly agentStateRepository: Repository<AgentState>,
    private readonly ctiGateway: CtiGateway,
  ) {}

  async create(createQueueDto: CreateQueueDto): Promise<Queue> {
    const existing = await this.queueRepository.findOne({
      where: { name: createQueueDto.name },
    });

    if (existing) {
      throw new ConflictException('Queue name already exists');
    }

    const queue = this.queueRepository.create(createQueueDto);
    return await this.queueRepository.save(queue);
  }

  async findAll(params: {
    page?: number;
    limit?: number;
    status?: QueueStatus;
  }): Promise<{ data: Queue[]; total: number }> {
    const { page = 1, limit = 50, status } = params;

    const query = this.queueRepository
      .createQueryBuilder('queue')
      .leftJoinAndSelect('queue.members', 'members')
      .leftJoinAndSelect('members.extension', 'extension')
      .leftJoinAndSelect('extension.user', 'user')
      .where('queue.deletedAt IS NULL');

    if (status) {
      query.andWhere('queue.status = :status', { status });
    }

    const [data, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total };
  }

  async findOne(id: string): Promise<Queue> {
    const queue = await this.queueRepository.findOne({
      where: { id },
      relations: ['members', 'members.extension', 'members.extension.user'],
    });

    if (!queue) {
      throw new NotFoundException('Queue not found');
    }

    return queue;
  }

  async update(id: string, updateQueueDto: UpdateQueueDto): Promise<Queue> {
    const queue = await this.findOne(id);
    Object.assign(queue, updateQueueDto);
    return await this.queueRepository.save(queue);
  }

  async remove(id: string): Promise<void> {
    const queue = await this.findOne(id);
    await this.queueRepository.softDelete(queue.id);
  }

  // Queue Member Management
  async addMember(queueId: string, memberDto: AddQueueMemberDto): Promise<QueueMember> {
    const queue = await this.findOne(queueId);

    const existing = await this.queueMemberRepository.findOne({
      where: {
        queueId: queue.id,
        extensionId: memberDto.extensionId,
      },
    });

    if (existing) {
      throw new ConflictException('Member already in queue');
    }

    const member = this.queueMemberRepository.create({
      queueId: queue.id,
      extensionId: memberDto.extensionId,
      priority: memberDto.priority || 0,
      skills: memberDto.skills || [],
    });

    return await this.queueMemberRepository.save(member);
  }

  async removeMember(queueId: string, memberId: string): Promise<void> {
    const member = await this.queueMemberRepository.findOne({
      where: { id: memberId, queueId },
    });

    if (!member) {
      throw new NotFoundException('Member not found in queue');
    }

    await this.queueMemberRepository.delete(member.id);
  }

  async getMembers(queueId: string): Promise<QueueMember[]> {
    return await this.queueMemberRepository.find({
      where: { queueId },
      relations: ['extension', 'extension.user'],
    });
  }

  // Agent State Management
  async setAgentState(
    extensionId: string,
    queueId: string | null,
    status: AgentStatus,
    reasonCode?: string,
  ): Promise<AgentState> {
    let agentState = await this.agentStateRepository.findOne({
      where: { extensionId, queueId: queueId || undefined },
    });

    if (agentState) {
      agentState.status = status;
      agentState.reasonCode = reasonCode;
      agentState.stateChangedAt = new Date();
    } else {
      agentState = this.agentStateRepository.create({
        extensionId,
        queueId: queueId || undefined,
        status,
        reasonCode,
        stateChangedAt: new Date(),
      });
    }

    const saved = await this.agentStateRepository.save(agentState);

    // Emit WebSocket event
    this.ctiGateway.emitAgentStateChanged({
      extensionId,
      queueId,
      status,
      reasonCode,
      timestamp: saved.stateChangedAt,
    });

    return saved;
  }

  async getAgentState(extensionId: string, queueId?: string): Promise<AgentState | null> {
    return await this.agentStateRepository.findOne({
      where: {
        extensionId,
        queueId: queueId || undefined,
      },
      relations: ['extension', 'queue'],
    });
  }

  async getQueueStats(queueId: string): Promise<{
    waitingCalls: number;
    activeCalls: number;
    availableAgents: number;
    busyAgents: number;
    wrapUpAgents: number;
  }> {
    const queue = await this.findOne(queueId);

    // Get agent states
    const agentStates = await this.agentStateRepository.find({
      where: { queueId: queue.id },
    });

    const stats = {
      waitingCalls: 0, // TODO: Count from calls table
      activeCalls: 0, // TODO: Count from calls table
      availableAgents: agentStates.filter((s) => s.status === AgentStatus.AVAILABLE).length,
      busyAgents: agentStates.filter((s) => s.status === AgentStatus.BUSY).length,
      wrapUpAgents: agentStates.filter((s) => s.status === AgentStatus.WRAP_UP).length,
    };

    // Emit stats update
    this.ctiGateway.emitQueueStatsUpdated({
      queueId: queue.id,
      queueName: queue.name,
      ...stats,
    });

    return stats;
  }

  async agentLogin(extensionId: string, queueIds: string[]): Promise<void> {
    for (const queueId of queueIds) {
      await this.setAgentState(extensionId, queueId, AgentStatus.AVAILABLE);
    }
  }

  async agentLogout(extensionId: string): Promise<void> {
    const states = await this.agentStateRepository.find({
      where: { extensionId },
    });

    for (const state of states) {
      await this.setAgentState(extensionId, state.queueId, AgentStatus.OFFLINE);
    }
  }
}
