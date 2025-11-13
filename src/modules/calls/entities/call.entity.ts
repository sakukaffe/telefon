import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@common/entities/base.entity';
import { Extension } from '@modules/extensions/entities/extension.entity';
import { Trunk } from '@modules/trunks/entities/trunk.entity';

export enum CallDirection {
  INBOUND = 'inbound',
  OUTBOUND = 'outbound',
  INTERNAL = 'internal',
}

export enum CallState {
  INITIATED = 'initiated',
  RINGING = 'ringing',
  ANSWERED = 'answered',
  HELD = 'held',
  TRANSFERRED = 'transferred',
  ENDED = 'ended',
}

export enum HangupCause {
  NORMAL_CLEARING = 'normal_clearing',
  BUSY = 'busy',
  NO_ANSWER = 'no_answer',
  CANCEL = 'cancel',
  REJECTED = 'rejected',
  FAILED = 'failed',
  TIMEOUT = 'timeout',
}

@Entity('calls')
export class Call extends BaseEntity {
  @Column({ name: 'call_id', unique: true })
  callId: string;

  @Column({
    type: 'enum',
    enum: CallDirection,
  })
  direction: CallDirection;

  // Caller
  @Column({ name: 'caller_number', length: 50 })
  callerNumber: string;

  @Column({ name: 'caller_name', length: 100, nullable: true })
  callerName?: string;

  // Callee
  @Column({ name: 'callee_number', length: 50 })
  calleeNumber: string;

  @Column({ name: 'callee_name', length: 100, nullable: true })
  calleeName?: string;

  // Extension references
  @Column({ name: 'caller_extension_id', nullable: true })
  callerExtensionId?: string;

  @ManyToOne(() => Extension, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'caller_extension_id' })
  callerExtension?: Extension;

  @Column({ name: 'callee_extension_id', nullable: true })
  calleeExtensionId?: string;

  @ManyToOne(() => Extension, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'callee_extension_id' })
  calleeExtension?: Extension;

  // Trunk (for inbound/outbound)
  @Column({ name: 'trunk_id', nullable: true })
  trunkId?: string;

  @ManyToOne(() => Trunk, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'trunk_id' })
  trunk?: Trunk;

  // State
  @Column({
    type: 'enum',
    enum: CallState,
    default: CallState.INITIATED,
  })
  state: CallState;

  // Timestamps
  @Column({ name: 'initiated_at', type: 'timestamp with time zone' })
  initiatedAt: Date;

  @Column({ name: 'ringing_at', type: 'timestamp with time zone', nullable: true })
  ringingAt?: Date;

  @Column({ name: 'answered_at', type: 'timestamp with time zone', nullable: true })
  answeredAt?: Date;

  @Column({ name: 'ended_at', type: 'timestamp with time zone', nullable: true })
  endedAt?: Date;

  // Hangup
  @Column({
    name: 'hangup_cause',
    type: 'enum',
    enum: HangupCause,
    nullable: true,
  })
  hangupCause?: HangupCause;

  // Recording
  @Column({ name: 'recording_id', nullable: true })
  recordingId?: string;

  // Queue info
  @Column({ name: 'queue_id', nullable: true })
  queueId?: string;

  @Column({ name: 'agent_extension_id', nullable: true })
  agentExtensionId?: string;

  @Column({ name: 'queue_wait_time_seconds', type: 'int', nullable: true })
  queueWaitTimeSeconds?: number;
}
