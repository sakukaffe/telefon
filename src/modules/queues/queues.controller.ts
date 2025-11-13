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
import { QueuesService } from './queues.service';
import { CreateQueueDto } from './dto/create-queue.dto';
import { UpdateQueueDto } from './dto/update-queue.dto';
import { AddQueueMemberDto } from './dto/add-queue-member.dto';
import { QueueStatus } from './entities/queue.entity';
import { AgentStatus } from './entities/agent-state.entity';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('queues')
export class QueuesController {
  constructor(private readonly queuesService: QueuesService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  async create(@Body() createQueueDto: CreateQueueDto) {
    return await this.queuesService.create(createQueueDto);
  }

  @Get()
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: QueueStatus,
  ) {
    const { data, total} = await this.queuesService.findAll({ page, limit, status });

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
    return await this.queuesService.findOne(id);
  }

  @Get(':id/stats')
  async getStats(@Param('id') id: string) {
    return await this.queuesService.getQueueStats(id);
  }

  @Get(':id/members')
  async getMembers(@Param('id') id: string) {
    return {
      data: await this.queuesService.getMembers(id),
    };
  }

  @Post(':id/members')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  async addMember(
    @Param('id') id: string,
    @Body() addMemberDto: AddQueueMemberDto,
  ) {
    return await this.queuesService.addMember(id, addMemberDto);
  }

  @Delete(':id/members/:memberId')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  async removeMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
  ) {
    await this.queuesService.removeMember(id, memberId);
    return { message: 'Member removed successfully' };
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  async update(@Param('id') id: string, @Body() updateQueueDto: UpdateQueueDto) {
    return await this.queuesService.update(id, updateQueueDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  async remove(@Param('id') id: string) {
    await this.queuesService.remove(id);
    return { message: 'Queue deleted successfully' };
  }

  @Post('agents/login')
  async agentLogin(
    @Body() body: { extensionId: string; queueIds: string[] },
  ) {
    await this.queuesService.agentLogin(body.extensionId, body.queueIds);
    return { message: 'Agent logged in successfully' };
  }

  @Post('agents/logout')
  async agentLogout(@Body() body: { extensionId: string }) {
    await this.queuesService.agentLogout(body.extensionId);
    return { message: 'Agent logged out successfully' };
  }

  @Post('agents/state')
  async setAgentState(
    @Body()
    body: {
      extensionId: string;
      queueId?: string;
      status: AgentStatus;
      reasonCode?: string;
    },
  ) {
    return await this.queuesService.setAgentState(
      body.extensionId,
      body.queueId || null,
      body.status,
      body.reasonCode,
    );
  }
}
