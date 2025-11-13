import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Call, CallState, CallDirection, HangupCause } from './entities/call.entity';
import { CtiGateway } from '../websocket/gateway/cti.gateway';

@Injectable()
export class CallsService {
  constructor(
    @InjectRepository(Call)
    private readonly callRepository: Repository<Call>,
    private readonly ctiGateway: CtiGateway,
  ) {}

  async createCall(data: {
    callId: string;
    direction: CallDirection;
    callerNumber: string;
    callerName?: string;
    calleeNumber: string;
    calleeName?: string;
    callerExtensionId?: string;
    calleeExtensionId?: string;
    trunkId?: string;
  }): Promise<Call> {
    const call = this.callRepository.create({
      ...data,
      state: CallState.INITIATED,
      initiatedAt: new Date(),
    });

    const savedCall = await this.callRepository.save(call);

    // Emit WebSocket event
    this.ctiGateway.emitCallCreated({
      callId: savedCall.id,
      direction: savedCall.direction,
      caller: {
        number: savedCall.callerNumber,
        name: savedCall.callerName,
      },
      callee: {
        number: savedCall.calleeNumber,
        name: savedCall.calleeName,
      },
      state: savedCall.state,
    });

    return savedCall;
  }

  async updateCallState(
    id: string,
    state: CallState,
    additionalData?: Partial<Call>,
  ): Promise<Call> {
    const call = await this.findOne(id);

    const updateData: any = { state, ...additionalData };

    if (state === CallState.RINGING && !call.ringingAt) {
      updateData.ringingAt = new Date();
    }

    if (state === CallState.ANSWERED && !call.answeredAt) {
      updateData.answeredAt = new Date();
    }

    if (state === CallState.ENDED && !call.endedAt) {
      updateData.endedAt = new Date();
    }

    Object.assign(call, updateData);
    const updatedCall = await this.callRepository.save(call);

    // Emit appropriate WebSocket event
    switch (state) {
      case CallState.RINGING:
        this.ctiGateway.emitCallRinging(this.formatCallData(updatedCall));
        break;
      case CallState.ANSWERED:
        this.ctiGateway.emitCallAnswered(this.formatCallData(updatedCall));
        break;
      case CallState.ENDED:
        this.ctiGateway.emitCallEnded(this.formatCallData(updatedCall));
        break;
    }

    return updatedCall;
  }

  async holdCall(id: string): Promise<Call> {
    return await this.updateCallState(id, CallState.HELD);
  }

  async unholdCall(id: string): Promise<Call> {
    const call = await this.findOne(id);
    const previousState = call.answeredAt ? CallState.ANSWERED : CallState.RINGING;
    return await this.updateCallState(id, previousState);
  }

  async endCall(id: string, hangupCause: HangupCause): Promise<Call> {
    return await this.updateCallState(id, CallState.ENDED, { hangupCause });
  }

  async findOne(id: string): Promise<Call> {
    const call = await this.callRepository.findOne({
      where: { id },
      relations: ['callerExtension', 'calleeExtension', 'trunk'],
    });

    if (!call) {
      throw new NotFoundException('Call not found');
    }

    return call;
  }

  async findByCallId(callId: string): Promise<Call | null> {
    const call = await this.callRepository.findOne({
      where: { callId },
      relations: ['callerExtension', 'calleeExtension', 'trunk'],
    });

    return call;
  }

  async findAll(params: {
    page?: number;
    limit?: number;
    state?: CallState;
    direction?: CallDirection;
  }): Promise<{ data: Call[]; total: number }> {
    const { page = 1, limit = 50, state, direction } = params;

    const query = this.callRepository
      .createQueryBuilder('call')
      .leftJoinAndSelect('call.callerExtension', 'callerExtension')
      .leftJoinAndSelect('call.calleeExtension', 'calleeExtension')
      .leftJoinAndSelect('call.trunk', 'trunk');

    if (state) {
      query.andWhere('call.state = :state', { state });
    }

    if (direction) {
      query.andWhere('call.direction = :direction', { direction });
    }

    const [data, total] = await query
      .orderBy('call.initiatedAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total };
  }

  async getActiveCalls(): Promise<Call[]> {
    return await this.callRepository.find({
      where: [
        { state: CallState.INITIATED },
        { state: CallState.RINGING },
        { state: CallState.ANSWERED },
        { state: CallState.HELD },
      ],
      relations: ['callerExtension', 'calleeExtension', 'trunk'],
    });
  }

  private formatCallData(call: Call) {
    return {
      callId: call.id,
      direction: call.direction,
      caller: {
        number: call.callerNumber,
        name: call.callerName,
      },
      callee: {
        number: call.calleeNumber,
        name: call.calleeName,
      },
      state: call.state,
      initiatedAt: call.initiatedAt,
      answeredAt: call.answeredAt,
      endedAt: call.endedAt,
      hangupCause: call.hangupCause,
    };
  }
}
