import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Extension } from './entities/extension.entity';
import { ExtensionRegistration } from './entities/extension-registration.entity';
import { ExtensionsController } from './extensions.controller';
import { ExtensionsService } from './extensions.service';

@Module({
  imports: [TypeOrmModule.forFeature([Extension, ExtensionRegistration])],
  controllers: [ExtensionsController],
  providers: [ExtensionsService],
  exports: [ExtensionsService],
})
export class ExtensionsModule {}
