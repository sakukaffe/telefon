import { PartialType } from '@nestjs/mapped-types';
import { CreateTrunkDto } from './create-trunk.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { TrunkStatus } from '../entities/trunk.entity';

export class UpdateTrunkDto extends PartialType(CreateTrunkDto) {
  @IsEnum(TrunkStatus)
  @IsOptional()
  status?: TrunkStatus;
}
