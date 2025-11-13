import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VoicemailBox } from './entities/voicemail-box.entity';
import { VoicemailMessage } from './entities/voicemail-message.entity';
import { VoicemailService } from './voicemail.service';
import { VoicemailController } from './voicemail.controller';

@Module({
  imports: [TypeOrmModule.forFeature([VoicemailBox, VoicemailMessage])],
  controllers: [VoicemailController],
  providers: [VoicemailService],
  exports: [VoicemailService],
})
export class VoicemailModule {}
