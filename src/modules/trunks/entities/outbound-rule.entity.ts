import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@common/entities/base.entity';
import { Trunk } from './trunk.entity';

export enum OutboundRuleStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

@Entity('outbound_rules')
export class OutboundRule extends BaseEntity {
  @Column({ length: 100 })
  name: string;

  @Column({ name: 'number_pattern', length: 100 })
  numberPattern: string;

  @Column({ type: 'int', default: 100 })
  priority: number;

  @Column({ name: 'strip_digits', type: 'int', default: 0 })
  stripDigits: number;

  @Column({ length: 20, nullable: true })
  prepend?: string;

  @Column({ name: 'trunk_id' })
  trunkId: string;

  @ManyToOne(() => Trunk, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'trunk_id' })
  trunk: Trunk;

  @Column({ name: 'caller_id_mode', length: 50, default: 'extension' })
  callerIdMode: string;

  @Column({ name: 'custom_caller_id', length: 50, nullable: true })
  customCallerId?: string;

  @Column({ name: 'allowed_for_roles', type: 'text', array: true, default: () => "ARRAY['admin', 'supervisor', 'agent', 'user']" })
  allowedForRoles: string[];

  @Column({ name: 'max_duration_seconds', type: 'int', nullable: true })
  maxDurationSeconds?: number;

  @Column({
    type: 'enum',
    enum: OutboundRuleStatus,
    default: OutboundRuleStatus.ACTIVE,
  })
  status: OutboundRuleStatus;
}
