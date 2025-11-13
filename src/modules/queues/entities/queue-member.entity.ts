import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@common/entities/base.entity';
import { Queue } from './queue.entity';
import { Extension } from '@modules/extensions/entities/extension.entity';

@Entity('queue_members')
export class QueueMember extends BaseEntity {
  @Column({ name: 'queue_id' })
  queueId: string;

  @ManyToOne(() => Queue, (queue) => queue.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'queue_id' })
  queue: Queue;

  @Column({ name: 'extension_id' })
  extensionId: string;

  @ManyToOne(() => Extension, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'extension_id' })
  extension: Extension;

  @Column({ type: 'int', default: 0 })
  priority: number;

  @Column({ type: 'text', array: true, default: () => 'ARRAY[]::text[]' })
  skills: string[];

  @Column({ type: 'int', default: 0 })
  penalty: number;
}
