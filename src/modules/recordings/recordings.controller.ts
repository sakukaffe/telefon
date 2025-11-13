import {
  Controller,
  Get,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { RecordingsService } from './recordings.service';
import { RecordingType } from './entities/recording.entity';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('recordings')
export class RecordingsController {
  constructor(private readonly recordingsService: RecordingsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('recordingType') recordingType?: RecordingType,
  ) {
    const { data, total } = await this.recordingsService.findAll({
      page,
      limit,
      recordingType,
    });

    return {
      data,
      meta: {
        page: page || 1,
        limit: limit || 50,
        total,
        totalPages: Math.ceil(total / (limit || 50)),
      },
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.recordingsService.findOne(id);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  async remove(@Param('id') id: string) {
    await this.recordingsService.remove(id);
    return { message: 'Recording deleted successfully' };
  }
}
