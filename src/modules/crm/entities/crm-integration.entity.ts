import { Entity, Column } from 'typeorm';
import { BaseEntity } from '@common/entities/base.entity';

export enum CrmType {
  SALESFORCE = 'salesforce',
  ZOHO = 'zoho',
  HUBSPOT = 'hubspot',
  FRESHDESK = 'freshdesk',
  DYNAMICS365 = 'dynamics365',
  CUSTOM = 'custom',
}

export enum AuthType {
  OAUTH2 = 'oauth2',
  API_KEY = 'api_key',
  BASIC = 'basic',
}

export enum CrmIntegrationStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ERROR = 'error',
}

@Entity('crm_integrations')
export class CrmIntegration extends BaseEntity {
  @Column({ length: 100 })
  name: string;

  @Column({
    name: 'crm_type',
    type: 'enum',
    enum: CrmType,
  })
  crmType: CrmType;

  @Column({ name: 'base_url', length: 500, nullable: true })
  baseUrl?: string;

  @Column({ name: 'api_version', length: 20, nullable: true })
  apiVersion?: string;

  @Column({
    name: 'auth_type',
    type: 'enum',
    enum: AuthType,
  })
  authType: AuthType;

  @Column({ name: 'auth_credentials', type: 'jsonb' })
  authCredentials: object;

  @Column({ name: 'lookup_endpoint', length: 500, nullable: true })
  lookupEndpoint?: string;

  @Column({ name: 'create_contact_endpoint', length: 500, nullable: true })
  createContactEndpoint?: string;

  @Column({ name: 'log_call_endpoint', length: 500, nullable: true })
  logCallEndpoint?: string;

  @Column({ name: 'field_mappings', type: 'jsonb', nullable: true })
  fieldMappings?: object;

  @Column({ name: 'screen_pop_enabled', default: true })
  screenPopEnabled: boolean;

  @Column({ name: 'screen_pop_url_template', type: 'text', nullable: true })
  screenPopUrlTemplate?: string;

  @Column({ name: 'webhook_url', length: 500, nullable: true })
  webhookUrl?: string;

  @Column({ name: 'webhook_events', type: 'text', array: true, nullable: true })
  webhookEvents?: string[];

  @Column({
    type: 'enum',
    enum: CrmIntegrationStatus,
    default: CrmIntegrationStatus.ACTIVE,
  })
  status: CrmIntegrationStatus;

  @Column({ name: 'last_sync_at', type: 'timestamp with time zone', nullable: true })
  lastSyncAt?: Date;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError?: string;
}
