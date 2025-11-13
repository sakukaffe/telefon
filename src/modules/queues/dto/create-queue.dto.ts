import { IsString, IsEnum, IsOptional, IsInt, IsBoolean, Min, Max } from 'class-validator';
import { QueueStrategy, OverflowAction } from '../entities/queue.entity';

export class CreateQueueDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  extensionNumber?: string;

  @IsEnum(QueueStrategy)
  @IsOptional()
  strategy?: QueueStrategy;

  @IsInt()
  @IsOptional()
  @Min(1)
  serviceLevelThresholdSeconds?: number;

  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(100)
  serviceLevelGoalPercent?: number;

  @IsInt()
  @IsOptional()
  @Min(1)
  maxWaitTimeSeconds?: number;

  @IsString()
  @IsOptional()
  musicOnHoldId?: string;

  @IsString()
  @IsOptional()
  welcomePromptId?: string;

  @IsBoolean()
  @IsOptional()
  positionAnnouncementEnabled?: boolean;

  @IsInt()
  @IsOptional()
  wrapUpTimeSeconds?: number;

  @IsEnum(OverflowAction)
  @IsOptional()
  overflowAction?: OverflowAction;
}
