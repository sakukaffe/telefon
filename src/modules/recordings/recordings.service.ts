import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Recording, RecordingType } from './entities/recording.entity';

@Injectable()
export class RecordingsService {
  constructor(
    @InjectRepository(Recording)
    private readonly recordingRepository: Repository<Recording>,
  ) {}

  async create(data: {
    callId: string;
    recordingType: RecordingType;
    storagePath: string;
    durationSeconds: number;
    retentionDays?: number;
    initiatedByUserId?: string;
  }): Promise<Recording> {
    const retentionUntil = new Date();
    retentionUntil.setDate(retentionUntil.getDate() + (data.retentionDays || 90));

    const recording = this.recordingRepository.create({
      ...data,
      startedAt: new Date(),
      retentionUntil,
    });

    return await this.recordingRepository.save(recording);
  }

  async findAll(params: {
    page?: number;
    limit?: number;
    callerId?: string;
    recordingType?: RecordingType;
  }): Promise<{ data: Recording[]; total: number }> {
    const { page = 1, limit = 50, recordingType } = params;

    const query = this.recordingRepository.createQueryBuilder('recording');

    if (recordingType) {
      query.andWhere('recording.recordingType = :recordingType', { recordingType });
    }

    const [data, total] = await query
      .orderBy('recording.startedAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total };
  }

  async findOne(id: string): Promise<Recording> {
    const recording = await this.recordingRepository.findOne({ where: { id } });

    if (!recording) {
      throw new NotFoundException('Recording not found');
    }

    return recording;
  }

  async remove(id: string): Promise<void> {
    const recording = await this.findOne(id);
    await this.recordingRepository.remove(recording);
  }

  async cleanupExpired(): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = await this.recordingRepository.delete({
      retentionUntil: LessThan(today),
    });

    return result.affected || 0;
  }
}
