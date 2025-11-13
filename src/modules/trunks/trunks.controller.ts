import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { TrunksService } from './trunks.service';
import { CreateTrunkDto } from './dto/create-trunk.dto';
import { UpdateTrunkDto } from './dto/update-trunk.dto';
import { TrunkStatus } from './entities/trunk.entity';

@Controller('trunks')
export class TrunksController {
  constructor(private readonly trunksService: TrunksService) {}

  @Post()
  async create(@Body() createTrunkDto: CreateTrunkDto) {
    return await this.trunksService.create(createTrunkDto);
  }

  @Get()
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: TrunkStatus,
  ) {
    const { data, total } = await this.trunksService.findAll({
      page,
      limit,
      status,
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
    return await this.trunksService.findOne(id);
  }

  @Post(':id/test')
  async testConnection(@Param('id') id: string) {
    return await this.trunksService.testConnection(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateTrunkDto: UpdateTrunkDto,
  ) {
    return await this.trunksService.update(id, updateTrunkDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.trunksService.remove(id);
    return { message: 'Trunk deleted successfully' };
  }
}
