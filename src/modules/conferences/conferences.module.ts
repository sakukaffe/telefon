import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Conference } from './entities/conference.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Conference])],
  controllers: [],
  providers: [],
  exports: [],
})
export class ConferencesModule {}
