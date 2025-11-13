import { Entity, Column, ManyToOne, JoinColumn, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';
import { Extension } from './extension.entity';

export enum Transport {
  UDP = 'udp',
  TCP = 'tcp',
  TLS = 'tls',
  WSS = 'wss',
}

@Entity('extension_registrations')
export class ExtensionRegistration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'extension_id' })
  extensionId: string;

  @ManyToOne(() => Extension, (extension) => extension.registrations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'extension_id' })
  extension: Extension;

  @Column({ name: 'contact_uri' })
  contactUri: string;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent?: string;

  @Column({ name: 'ip_address', type: 'inet' })
  ipAddress: string;

  @Column({ type: 'int' })
  port: number;

  @Column({
    type: 'enum',
    enum: Transport,
  })
  transport: Transport;

  @Column({ name: 'expires_at', type: 'timestamp with time zone' })
  expiresAt: Date;

  @CreateDateColumn({ name: 'registered_at' })
  registeredAt: Date;
}
