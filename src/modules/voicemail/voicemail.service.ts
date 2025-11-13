import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VoicemailBox } from './entities/voicemail-box.entity';
import { VoicemailMessage } from './entities/voicemail-message.entity';

@Injectable()
export class VoicemailService {
  constructor(
    @InjectRepository(VoicemailBox)
    private readonly voicemailBoxRepository: Repository<VoicemailBox>,
    @InjectRepository(VoicemailMessage)
    private readonly voicemailMessageRepository: Repository<VoicemailMessage>,
  ) {}

  async createBox(extensionId: string, pin?: string): Promise<VoicemailBox> {
    const box = this.voicemailBoxRepository.create({
      extensionId,
      pin,
    });
    return await this.voicemailBoxRepository.save(box);
  }

  async findBoxByExtension(extensionId: string): Promise<VoicemailBox | null> {
    return await this.voicemailBoxRepository.findOne({
      where: { extensionId },
      relations: ['extension'],
    });
  }

  async getMessages(
    boxId: string,
    isRead?: boolean,
  ): Promise<VoicemailMessage[]> {
    const where: any = { voicemailBoxId: boxId };
    if (isRead !== undefined) {
      where.isRead = isRead;
    }

    return await this.voicemailMessageRepository.find({
      where,
      order: { receivedAt: 'DESC' },
    });
  }

  async getMessage(id: string): Promise<VoicemailMessage> {
    const message = await this.voicemailMessageRepository.findOne({
      where: { id },
      relations: ['voicemailBox'],
    });

    if (!message) {
      throw new NotFoundException('Voicemail message not found');
    }

    return message;
  }

  async createMessage(data: {
    voicemailBoxId: string;
    callerNumber: string;
    callerName?: string;
    storagePath: string;
    durationSeconds: number;
    fileSizeBytes?: number;
  }): Promise<VoicemailMessage> {
    const message = this.voicemailMessageRepository.create({
      ...data,
      receivedAt: new Date(),
    });

    return await this.voicemailMessageRepository.save(message);
  }

  async markAsRead(id: string): Promise<VoicemailMessage> {
    const message = await this.getMessage(id);
    message.isRead = true;
    message.readAt = new Date();
    return await this.voicemailMessageRepository.save(message);
  }

  async deleteMessage(id: string): Promise<void> {
    const message = await this.getMessage(id);
    await this.voicemailMessageRepository.remove(message);
  }
}
