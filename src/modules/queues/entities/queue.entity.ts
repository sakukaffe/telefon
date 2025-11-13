import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from '@common/entities/base.entity';
import { QueueMember } from './queue-member.entity';

export enum QueueStrategy {
  RING_ALL = 'ring_all',
  LONGEST_IDLE = 'longest_idle',
  LEAST_TALK_TIME = 'least_talk_time',
  ROUND_ROBIN = 'round_robin',
  RANDOM = 'random',
}

export enum QueueStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  INACTIVE = 'inactive',
}

export enum OverflowAction {
  VOICEMAIL = 'voicemail',
  IVR = 'ivr',
  EXTERNAL = 'external',
  HANGUP = 'hangup',
}

@Entity('queues')
export class Queue extends BaseEntity {
  @Column({ unique: true, length: 100 })
  name: string;

  @Column({ name: 'extension_number', unique: true, length: 20, nullable: true })
  extensionNumber?: string;

  @Column({
    type: 'enum',
    enum: QueueStrategy,
    default: QueueStrategy.LONGEST_IDLE,
  })
  strategy: QueueStrategy;

  @Column({ name: 'service_level_threshold_seconds', type: 'int', default: 20 })
  serviceLevelThresholdSeconds: number;

  @Column({ name: 'service_level_goal_percent', type: 'int', default: 80 })
  serviceLevelGoalPercent: number;

  @Column({ name: 'max_wait_time_seconds', type: 'int', default: 300 })
  maxWaitTimeSeconds: number;

  @Column({ name: 'music_on_hold_id', nullable: true })
  musicOnHoldId?: string;

  @Column({ name: 'welcome_prompt_id', nullable: true })
  welcomePromptId?: string;

  @Column({ name: 'position_announcement_enabled', default: true })
  positionAnnouncementEnabled: boolean;

  @Column({ name: 'position_announcement_interval_seconds', type: 'int', default: 30 })
  positionAnnouncementIntervalSeconds: number;

  @Column({ name: 'max_queue_size', type: 'int', default: 50 })
  maxQueueSize: number;

  @Column({ name: 'wrap_up_time_seconds', type: 'int', default: 10 })
  wrapUpTimeSeconds: number;

  @Column({
    name: 'overflow_action',
    type: 'enum',
    enum: OverflowAction,
    default: OverflowAction.VOICEMAIL,
  })
  overflowAction: OverflowAction;

  @Column({ name: 'overflow_destination_id', nullable: true })
  overflowDestinationId?: string;

  @Column({ name: 'overflow_destination_number', length: 50, nullable: true })
  overflowDestinationNumber?: string;

  @Column({ name: 'callback_enabled', default: false })
  callbackEnabled: boolean;

  @Column({
    type: 'enum',
    enum: QueueStatus,
    default: QueueStatus.ACTIVE,
  })
  status: QueueStatus;

  @OneToMany(() => QueueMember, (member) => member.queue)
  members: QueueMember[];
}
