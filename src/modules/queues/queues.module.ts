import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Queue } from './entities/queue.entity';
import { QueueMember } from './entities/queue-member.entity';
import { AgentState } from './entities/agent-state.entity';
import { QueuesService } from './queues.service';
import { QueuesController } from './queues.controller';
import { WebsocketModule } from '../websocket/websocket.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Queue, QueueMember, AgentState]),
    WebsocketModule,
  ],
  controllers: [QueuesController],
  providers: [QueuesService],
  exports: [QueuesService],
})
export class QueuesModule {}
