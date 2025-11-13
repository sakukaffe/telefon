import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsInt,
  IsArray,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import {
  ExtensionType,
  CallRecordingPolicy,
} from '../entities/extension.entity';

export class CreateExtensionDto {
  @IsString()
  @MaxLength(20)
  number: string;

  @IsString()
  @IsOptional()
  userId?: string;

  @IsEnum(ExtensionType)
  @IsOptional()
  extensionType?: ExtensionType;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  sipPassword?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  displayName?: string;

  @IsBoolean()
  @IsOptional()
  voicemailEnabled?: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  voicemailPin?: string;

  @IsEnum(CallRecordingPolicy)
  @IsOptional()
  callRecordingPolicy?: CallRecordingPolicy;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  codecPreferences?: string[];

  @IsInt()
  @Min(1)
  @Max(10)
  @IsOptional()
  maxConcurrentCalls?: number;
}
