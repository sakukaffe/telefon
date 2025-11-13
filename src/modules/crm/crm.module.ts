import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CrmIntegration } from './entities/crm-integration.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CrmIntegration])],
  controllers: [],
  providers: [],
  exports: [],
})
export class CrmModule {}
