import { Module } from '@nestjs/common';
import { CtiGateway } from './gateway/cti.gateway';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [CtiGateway],
  exports: [CtiGateway],
})
export class WebsocketModule {}
