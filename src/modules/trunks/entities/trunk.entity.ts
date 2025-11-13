import { Entity, Column } from 'typeorm';
import { BaseEntity } from '@common/entities/base.entity';

export enum TrunkType {
  REGISTER = 'register',
  IP_AUTH = 'ip_auth',
  STATIC = 'static',
}

export enum Transport {
  UDP = 'udp',
  TCP = 'tcp',
  TLS = 'tls',
}

export enum DtmfMode {
  RFC2833 = 'rfc2833',
  INBAND = 'inband',
  INFO = 'info',
}

export enum TrunkStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  TESTING = 'testing',
}

export interface DidRange {
  start: string;
  end: string;
}

@Entity('trunks')
export class Trunk extends BaseEntity {
  @Column({ unique: true, length: 100 })
  name: string;

  @Column({
    name: 'trunk_type',
    type: 'enum',
    enum: TrunkType,
  })
  trunkType: TrunkType;

  // SIP Configuration
  @Column({ length: 255 })
  host: string;

  @Column({ type: 'int', default: 5060 })
  port: number;

  @Column({
    type: 'enum',
    enum: Transport,
    default: Transport.UDP,
  })
  transport: Transport;

  // Authentication (for 'register' type)
  @Column({ length: 100, nullable: true })
  username?: string;

  @Column({ length: 255, nullable: true })
  password?: string;

  @Column({ name: 'auth_username', length: 100, nullable: true })
  authUsername?: string;

  // IP Auth (for 'ip_auth' type)
  @Column({ name: 'allowed_ips', type: 'inet', array: true, nullable: true })
  allowedIps?: string[];

  // Codecs
  @Column({
    name: 'codec_preferences',
    type: 'text',
    array: true,
    default: () => "ARRAY['pcmu', 'pcma', 'g722', 'opus']",
  })
  codecPreferences: string[];

  // DTMF
  @Column({
    name: 'dtmf_mode',
    type: 'enum',
    enum: DtmfMode,
    default: DtmfMode.RFC2833,
  })
  dtmfMode: DtmfMode;

  // Caller ID
  @Column({ name: 'default_caller_id', length: 50, nullable: true })
  defaultCallerId?: string;

  // DID Ranges
  @Column({ name: 'did_ranges', type: 'jsonb', nullable: true })
  didRanges?: DidRange[];

  // Limits
  @Column({ name: 'max_concurrent_calls', type: 'int', default: 10 })
  maxConcurrentCalls: number;

  // Failover
  @Column({ name: 'backup_trunk_id', nullable: true })
  backupTrunkId?: string;

  @Column({
    type: 'enum',
    enum: TrunkStatus,
    default: TrunkStatus.ACTIVE,
  })
  status: TrunkStatus;
}
