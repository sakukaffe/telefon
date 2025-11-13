import { PartialType } from '@nestjs/mapped-types';
import { CreateExtensionDto } from './create-extension.dto';
import { IsEnum, IsOptional, IsBoolean, IsString, MaxLength } from 'class-validator';
import { ExtensionStatus, PresenceStatus } from '../entities/extension.entity';

export class UpdateExtensionDto extends PartialType(CreateExtensionDto) {
  @IsEnum(ExtensionStatus)
  @IsOptional()
  status?: ExtensionStatus;

  @IsBoolean()
  @IsOptional()
  dndEnabled?: boolean;

  @IsEnum(PresenceStatus)
  @IsOptional()
  presenceStatus?: PresenceStatus;

  @IsBoolean()
  @IsOptional()
  forwardOnBusyEnabled?: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  forwardOnBusyDestination?: string;

  @IsBoolean()
  @IsOptional()
  forwardOnNoAnswerEnabled?: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  forwardOnNoAnswerDestination?: string;

  @IsBoolean()
  @IsOptional()
  forwardUnconditionalEnabled?: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  forwardUnconditionalDestination?: string;
}
