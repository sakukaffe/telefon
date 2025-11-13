import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@common/entities/base.entity';
import { Extension } from '@modules/extensions/entities/extension.entity';
import { Queue } from './queue.entity';

export enum AgentStatus {
  AVAILABLE = 'available',
  BUSY = 'busy',
  WRAP_UP = 'wrap_up',
  BREAK = 'break',
  OFFLINE = 'offline',
}

@Entity('agent_states')
export class AgentState extends BaseEntity {
  @Column({ name: 'extension_id' })
  extensionId: string;

  @ManyToOne(() => Extension, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'extension_id' })
  extension: Extension;

  @Column({ name: 'queue_id', nullable: true })
  queueId?: string;

  @ManyToOne(() => Queue, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'queue_id' })
  queue?: Queue;

  @Column({
    type: 'enum',
    enum: AgentStatus,
  })
  status: AgentStatus;

  @Column({ name: 'reason_code', length: 100, nullable: true })
  reasonCode?: string;

  @Column({ name: 'state_changed_at', type: 'timestamp with time zone' })
  stateChangedAt: Date;

  @Column({ name: 'last_call_ended_at', type: 'timestamp with time zone', nullable: true })
  lastCallEndedAt?: Date;
}
