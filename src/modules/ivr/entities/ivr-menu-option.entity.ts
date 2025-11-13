import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@common/entities/base.entity';
import { IvrMenu } from './ivr-menu.entity';

export enum IvrActionType {
  EXTENSION = 'extension',
  QUEUE = 'queue',
  IVR = 'ivr',
  VOICEMAIL = 'voicemail',
  EXTERNAL = 'external',
  HANGUP = 'hangup',
  REPEAT = 'repeat',
}

@Entity('ivr_menu_options')
export class IvrMenuOption extends BaseEntity {
  @Column({ name: 'ivr_menu_id' })
  ivrMenuId: string;

  @ManyToOne(() => IvrMenu, (menu) => menu.options, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ivr_menu_id' })
  ivrMenu: IvrMenu;

  @Column({ name: 'dtmf_digit', length: 2 })
  dtmfDigit: string;

  @Column({
    type: 'enum',
    enum: IvrActionType,
  })
  action: IvrActionType;

  @Column({ name: 'destination_id', nullable: true })
  destinationId?: string;

  @Column({ name: 'destination_number', length: 50, nullable: true })
  destinationNumber?: string;

  @Column({ name: 'pre_transfer_prompt_id', nullable: true })
  preTransferPromptId?: string;
}
