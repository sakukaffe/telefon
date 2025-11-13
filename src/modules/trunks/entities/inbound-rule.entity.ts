import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@common/entities/base.entity';
import { Trunk } from './trunk.entity';

export enum InboundRuleStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

@Entity('inbound_rules')
export class InboundRule extends BaseEntity {
  @Column({ length: 100 })
  name: string;

  @Column({ name: 'did_pattern', length: 50 })
  didPattern: string;

  @Column({ name: 'trunk_id', nullable: true })
  trunkId?: string;

  @ManyToOne(() => Trunk, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'trunk_id' })
  trunk?: Trunk;

  @Column({ type: 'int', default: 100 })
  priority: number;

  @Column({ name: 'time_profile_id', nullable: true })
  timeProfileId?: string;

  @Column({ name: 'caller_id_pattern', length: 50, nullable: true })
  callerIdPattern?: string;

  @Column({ name: 'destination_type', length: 50 })
  destinationType: string;

  @Column({ name: 'destination_id', nullable: true })
  destinationId?: string;

  @Column({ name: 'destination_number', length: 50, nullable: true })
  destinationNumber?: string;

  @Column({ name: 'fallback_destination_type', length: 50, nullable: true })
  fallbackDestinationType?: string;

  @Column({ name: 'fallback_destination_id', nullable: true })
  fallbackDestinationId?: string;

  @Column({ name: 'fallback_destination_number', length: 50, nullable: true })
  fallbackDestinationNumber?: string;

  @Column({
    type: 'enum',
    enum: InboundRuleStatus,
    default: InboundRuleStatus.ACTIVE,
  })
  status: InboundRuleStatus;
}
