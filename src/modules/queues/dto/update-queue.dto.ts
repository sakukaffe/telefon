import { PartialType } from '@nestjs/mapped-types';
import { CreateQueueDto } from './create-queue.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { QueueStatus } from '../entities/queue.entity';

export class UpdateQueueDto extends PartialType(CreateQueueDto) {
  @IsEnum(QueueStatus)
  @IsOptional()
  status?: QueueStatus;
}
