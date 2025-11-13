import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@common/entities/base.entity';
import { VoicemailBox } from './voicemail-box.entity';

@Entity('voicemail_messages')
export class VoicemailMessage extends BaseEntity {
  @Column({ name: 'voicemail_box_id' })
  voicemailBoxId: string;

  @ManyToOne(() => VoicemailBox, (box) => box.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'voicemail_box_id' })
  voicemailBox: VoicemailBox;

  @Column({ name: 'caller_number', length: 50 })
  callerNumber: string;

  @Column({ name: 'caller_name', length: 100, nullable: true })
  callerName?: string;

  @Column({ name: 'storage_path', length: 500 })
  storagePath: string;

  @Column({ name: 'duration_seconds', type: 'int' })
  durationSeconds: number;

  @Column({ name: 'file_size_bytes', type: 'bigint', nullable: true })
  fileSizeBytes?: number;

  @Column({ name: 'is_read', default: false })
  isRead: boolean;

  @Column({ name: 'is_urgent', default: false })
  isUrgent: boolean;

  @Column({ name: 'received_at', type: 'timestamp with time zone' })
  receivedAt: Date;

  @Column({ name: 'read_at', type: 'timestamp with time zone', nullable: true })
  readAt?: Date;

  @Column({ name: 'delete_at', type: 'date', nullable: true })
  deleteAt?: Date;
}
