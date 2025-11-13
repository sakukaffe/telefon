import { IsString, IsInt, IsArray, IsOptional } from 'class-validator';

export class AddQueueMemberDto {
  @IsString()
  extensionId: string;

  @IsInt()
  @IsOptional()
  priority?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  skills?: string[];
}
