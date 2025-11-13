import { Entity, Column, OneToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseEntity } from '@common/entities/base.entity';
import { Extension } from '@modules/extensions/entities/extension.entity';
import { VoicemailMessage } from './voicemail-message.entity';

@Entity('voicemail_boxes')
export class VoicemailBox extends BaseEntity {
  @Column({ name: 'extension_id' })
  extensionId: string;

  @OneToOne(() => Extension, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'extension_id' })
  extension: Extension;

  @Column({ length: 20, nullable: true })
  pin?: string;

  @Column({ name: 'greeting_prompt_id', nullable: true })
  greetingPromptId?: string;

  @Column({ name: 'email_notification', default: true })
  emailNotification: boolean;

  @Column({ name: 'email_address', nullable: true })
  emailAddress?: string;

  @Column({ name: 'attach_audio', default: true })
  attachAudio: boolean;

  @Column({ name: 'retention_days', type: 'int', default: 90 })
  retentionDays: number;

  @OneToMany(() => VoicemailMessage, (message) => message.voicemailBox)
  messages: VoicemailMessage[];
}
