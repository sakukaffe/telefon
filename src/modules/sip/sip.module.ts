import { Module } from '@nestjs/common';
import { SipService } from './sip.service';
import { ExtensionsModule } from '../extensions/extensions.module';
import { TrunksModule } from '../trunks/trunks.module';
import { CallsModule } from '../calls/calls.module';

@Module({
  imports: [ExtensionsModule, TrunksModule, CallsModule],
  providers: [SipService],
  exports: [SipService],
})
export class SipModule {}
