import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CallsService } from './calls.service';
import { CallState, CallDirection, HangupCause } from './entities/call.entity';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('calls')
export class CallsController {
  constructor(private readonly callsService: CallsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('state') state?: CallState,
    @Query('direction') direction?: CallDirection,
  ) {
    const { data, total } = await this.callsService.findAll({
      page,
      limit,
      state,
      direction,
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

  @Get('active')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  async getActiveCalls() {
    return {
      data: await this.callsService.getActiveCalls(),
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.callsService.findOne(id);
  }

  @Post(':id/hold')
  @HttpCode(HttpStatus.OK)
  async hold(@Param('id') id: string) {
    return await this.callsService.holdCall(id);
  }

  @Post(':id/unhold')
  @HttpCode(HttpStatus.OK)
  async unhold(@Param('id') id: string) {
    return await this.callsService.unholdCall(id);
  }

  @Post(':id/hangup')
  @HttpCode(HttpStatus.OK)
  async hangup(
    @Param('id') id: string,
    @Body('hangupCause') hangupCause: HangupCause = HangupCause.NORMAL_CLEARING,
  ) {
    return await this.callsService.endCall(id, hangupCause);
  }
}
