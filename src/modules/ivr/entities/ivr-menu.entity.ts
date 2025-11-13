import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from '@common/entities/base.entity';
import { IvrMenuOption } from './ivr-menu-option.entity';

@Entity('ivr_menus')
export class IvrMenu extends BaseEntity {
  @Column({ unique: true, length: 100 })
  name: string;

  @Column({ name: 'welcome_prompt_id', nullable: true })
  welcomePromptId?: string;

  @Column({ name: 'digit_timeout_seconds', type: 'int', default: 5 })
  digitTimeoutSeconds: number;

  @Column({ name: 'max_retries', type: 'int', default: 3 })
  maxRetries: number;

  @Column({ name: 'invalid_prompt_id', nullable: true })
  invalidPromptId?: string;

  @Column({ name: 'timeout_prompt_id', nullable: true })
  timeoutPromptId?: string;

  @Column({ name: 'timeout_destination_type', length: 50, nullable: true })
  timeoutDestinationType?: string;

  @Column({ name: 'timeout_destination_id', nullable: true })
  timeoutDestinationId?: string;

  @OneToMany(() => IvrMenuOption, (option) => option.ivrMenu)
  options: IvrMenuOption[];
}
