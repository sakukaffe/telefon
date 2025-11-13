import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseEntity } from '@common/entities/base.entity';
import { User } from '@modules/users/entities/user.entity';
import { ExtensionRegistration } from './extension-registration.entity';

export enum ExtensionType {
  SIP = 'sip',
  WEBRTC = 'webrtc',
  VIRTUAL = 'virtual',
}

export enum ExtensionStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export enum CallRecordingPolicy {
  OFF = 'off',
  ON_DEMAND = 'on_demand',
  ALWAYS = 'always',
}

export enum PresenceStatus {
  AVAILABLE = 'available',
  BUSY = 'busy',
  AWAY = 'away',
  DND = 'dnd',
  OFFLINE = 'offline',
}

@Entity('extensions')
export class Extension extends BaseEntity {
  @Column({ unique: true, length: 20 })
  number: string;

  @Column({ name: 'user_id', nullable: true })
  userId?: string;

  @ManyToOne(() => User, (user) => user.extensions, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({
    name: 'extension_type',
    type: 'enum',
    enum: ExtensionType,
    default: ExtensionType.SIP,
  })
  extensionType: ExtensionType;

  @Column({ name: 'sip_password', length: 100 })
  sipPassword: string;

  @Column({ name: 'display_name', length: 100, nullable: true })
  displayName?: string;

  // Voicemail
  @Column({ name: 'voicemail_enabled', default: true })
  voicemailEnabled: boolean;

  @Column({ name: 'voicemail_pin', length: 20, nullable: true })
  voicemailPin?: string;

  @Column({ name: 'voicemail_email_notification', default: true })
  voicemailEmailNotification: boolean;

  // Call Recording
  @Column({
    name: 'call_recording_policy',
    type: 'enum',
    enum: CallRecordingPolicy,
    default: CallRecordingPolicy.OFF,
  })
  callRecordingPolicy: CallRecordingPolicy;

  @Column({ name: 'can_record_calls', default: false })
  canRecordCalls: boolean;

  @Column({ name: 'allow_international', default: true })
  allowInternational: boolean;

  @Column({ name: 'allow_mobile', default: true })
  allowMobile: boolean;

  // Forwarding
  @Column({ name: 'forward_on_busy_enabled', default: false })
  forwardOnBusyEnabled: boolean;

  @Column({ name: 'forward_on_busy_destination', length: 50, nullable: true })
  forwardOnBusyDestination?: string;

  @Column({ name: 'forward_on_no_answer_enabled', default: false })
  forwardOnNoAnswerEnabled: boolean;

  @Column({
    name: 'forward_on_no_answer_destination',
    length: 50,
    nullable: true,
  })
  forwardOnNoAnswerDestination?: string;

  @Column({ name: 'forward_on_no_answer_timeout', default: 20 })
  forwardOnNoAnswerTimeout: number;

  @Column({ name: 'forward_unconditional_enabled', default: false })
  forwardUnconditionalEnabled: boolean;

  @Column({
    name: 'forward_unconditional_destination',
    length: 50,
    nullable: true,
  })
  forwardUnconditionalDestination?: string;

  // DND & Presence
  @Column({ name: 'dnd_enabled', default: false })
  dndEnabled: boolean;

  @Column({
    name: 'presence_status',
    type: 'enum',
    enum: PresenceStatus,
    default: PresenceStatus.AVAILABLE,
  })
  presenceStatus: PresenceStatus;

  // Codec Preferences
  @Column({
    name: 'codec_preferences',
    type: 'text',
    array: true,
    default: () => "ARRAY['opus', 'g722', 'pcmu', 'pcma']",
  })
  codecPreferences: string[];

  // Limits
  @Column({ name: 'max_concurrent_calls', default: 2 })
  maxConcurrentCalls: number;

  @Column({
    type: 'enum',
    enum: ExtensionStatus,
    default: ExtensionStatus.ACTIVE,
  })
  status: ExtensionStatus;

  // Relations
  @OneToMany(
    () => ExtensionRegistration,
    (registration) => registration.extension,
  )
  registrations: ExtensionRegistration[];
}
