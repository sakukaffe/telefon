import { IsString, IsEnum, IsOptional, IsInt, IsArray, MaxLength, Min } from 'class-validator';
import { TrunkType, Transport, DtmfMode } from '../entities/trunk.entity';

export class CreateTrunkDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsEnum(TrunkType)
  trunkType: TrunkType;

  @IsString()
  @MaxLength(255)
  host: string;

  @IsInt()
  @IsOptional()
  port?: number;

  @IsEnum(Transport)
  @IsOptional()
  transport?: Transport;

  @IsString()
  @IsOptional()
  username?: string;

  @IsString()
  @IsOptional()
  password?: string;

  @IsArray()
  @IsOptional()
  codecPreferences?: string[];

  @IsEnum(DtmfMode)
  @IsOptional()
  dtmfMode?: DtmfMode;

  @IsInt()
  @Min(1)
  @IsOptional()
  maxConcurrentCalls?: number;
}
