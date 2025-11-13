import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { Call } from '../calls/entities/call.entity';
import { Extension } from '../extensions/entities/extension.entity';
import { Queue } from '../queues/entities/queue.entity';
import { AgentState } from '../queues/entities/agent-state.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Call, Extension, Queue, AgentState])],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
