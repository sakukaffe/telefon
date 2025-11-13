import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Trunk } from './entities/trunk.entity';
import { TrunksController } from './trunks.controller';
import { TrunksService } from './trunks.service';

@Module({
  imports: [TypeOrmModule.forFeature([Trunk])],
  controllers: [TrunksController],
  providers: [TrunksService],
  exports: [TrunksService],
})
export class TrunksModule {}
