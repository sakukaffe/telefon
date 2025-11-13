import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IvrMenu } from './entities/ivr-menu.entity';
import { IvrMenuOption } from './entities/ivr-menu-option.entity';
import { IvrService } from './ivr.service';
import { IvrController } from './ivr.controller';

@Module({
  imports: [TypeOrmModule.forFeature([IvrMenu, IvrMenuOption])],
  controllers: [IvrController],
  providers: [IvrService],
  exports: [IvrService],
})
export class IvrModule {}
