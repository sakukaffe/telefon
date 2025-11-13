import { Entity, Column } from 'typeorm';
import { BaseEntity } from '@common/entities/base.entity';

export enum RecordingType {
  ON_DEMAND = 'on_demand',
  AUTOMATIC = 'automatic',
  COMPLIANCE = 'compliance',
}

@Entity('recordings')
export class Recording extends BaseEntity {
  @Column({ name: 'call_id' })
  callId: string;

  @Column({
    name: 'recording_type',
    type: 'enum',
    enum: RecordingType,
  })
  recordingType: RecordingType;

  @Column({ name: 'initiated_by_user_id', nullable: true })
  initiatedByUserId?: string;

  @Column({ name: 'storage_path', length: 500 })
  storagePath: string;

  @Column({ name: 'duration_seconds', type: 'int' })
  durationSeconds: number;

  @Column({ name: 'file_size_bytes', type: 'bigint', nullable: true })
  fileSizeBytes?: number;

  @Column({ name: 'is_encrypted', default: false })
  isEncrypted: boolean;

  @Column({ name: 'encryption_key_id', length: 100, nullable: true })
  encryptionKeyId?: string;

  @Column({ name: 'allowed_user_ids', type: 'uuid', array: true, nullable: true })
  allowedUserIds?: string[];

  @Column({ name: 'allowed_roles', type: 'text', array: true, nullable: true })
  allowedRoles?: string[];

  @Column({ name: 'retention_until', type: 'date' })
  retentionUntil: Date;

  @Column({ name: 'started_at', type: 'timestamp with time zone' })
  startedAt: Date;

  @Column({ name: 'stopped_at', type: 'timestamp with time zone', nullable: true })
  stoppedAt?: Date;
}
