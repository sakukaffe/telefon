import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from '@common/entities/base.entity';

export enum ConferenceType {
  AUDIO = 'audio',
  WEBRTC = 'webrtc',
}

export enum ConferenceStatus {
  SCHEDULED = 'scheduled',
  ACTIVE = 'active',
  ENDED = 'ended',
}

@Entity('conferences')
export class Conference extends BaseEntity {
  @Column({ length: 100 })
  name: string;

  @Column({ name: 'extension_number', length: 20, unique: true, nullable: true })
  extensionNumber?: string;

  @Column({
    name: 'conference_type',
    type: 'enum',
    enum: ConferenceType,
    default: ConferenceType.AUDIO,
  })
  conferenceType: ConferenceType;

  @Column({ length: 20, nullable: true })
  pin?: string;

  @Column({ name: 'moderator_pin', length: 20, nullable: true })
  moderatorPin?: string;

  @Column({ name: 'owner_user_id', nullable: true })
  ownerUserId?: string;

  @Column({ name: 'wait_for_moderator', default: false })
  waitForModerator: boolean;

  @Column({ name: 'record_conference', default: false })
  recordConference: boolean;

  @Column({ name: 'max_participants', type: 'int', default: 25 })
  maxParticipants: number;

  @Column({ name: 'enable_screen_sharing', default: true })
  enableScreenSharing: boolean;

  @Column({ name: 'enable_chat', default: true })
  enableChat: boolean;

  @Column({ name: 'scheduled_start', type: 'timestamp with time zone', nullable: true })
  scheduledStart?: Date;

  @Column({ name: 'scheduled_end', type: 'timestamp with time zone', nullable: true })
  scheduledEnd?: Date;

  @Column({
    type: 'enum',
    enum: ConferenceStatus,
    default: ConferenceStatus.SCHEDULED,
  })
  status: ConferenceStatus;
}
