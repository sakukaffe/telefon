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
import { ExtensionsService } from './extensions.service';
import { CreateExtensionDto } from './dto/create-extension.dto';
import { UpdateExtensionDto } from './dto/update-extension.dto';
import { ExtensionStatus } from './entities/extension.entity';

@Controller('extensions')
export class ExtensionsController {
  constructor(private readonly extensionsService: ExtensionsService) {}

  @Post()
  async create(@Body() createExtensionDto: CreateExtensionDto) {
    return await this.extensionsService.create(createExtensionDto);
  }

  @Get()
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: ExtensionStatus,
    @Query('search') search?: string,
  ) {
    const { data, total } = await this.extensionsService.findAll({
      page,
      limit,
      status,
      search,
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
    return await this.extensionsService.findOne(id);
  }

  @Get(':id/registrations')
  async getRegistrations(@Param('id') id: string) {
    return {
      data: await this.extensionsService.getRegistrations(id),
    };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateExtensionDto: UpdateExtensionDto,
  ) {
    return await this.extensionsService.update(id, updateExtensionDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.extensionsService.remove(id);
    return { message: 'Extension deleted successfully' };
  }
}
