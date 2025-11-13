import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { IvrService, CreateIvrMenuDto } from './ivr.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('ivr')
export class IvrController {
  constructor(private readonly ivrService: IvrService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  async create(@Body() createDto: CreateIvrMenuDto) {
    return await this.ivrService.create(createDto);
  }

  @Get()
  async findAll() {
    return {
      data: await this.ivrService.findAll(),
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.ivrService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  async update(
    @Param('id') id: string,
    @Body() updateDto: Partial<CreateIvrMenuDto>,
  ) {
    return await this.ivrService.update(id, updateDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  async remove(@Param('id') id: string) {
    await this.ivrService.remove(id);
    return { message: 'IVR menu deleted successfully' };
  }
}
