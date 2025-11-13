import { Module } from '@nestjs/common';
import { SipService } from './sip.service';
import { RtpengineService } from './rtpengine.service';
import { ExtensionsModule } from '../extensions/extensions.module';
import { TrunksModule } from '../trunks/trunks.module';
import { CallsModule } from '../calls/calls.module';

@Module({
  imports: [ExtensionsModule, TrunksModule, CallsModule],
  providers: [SipService, RtpengineService],
  exports: [SipService, RtpengineService],
})
export class SipModule {}
