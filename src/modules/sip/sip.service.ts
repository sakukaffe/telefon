import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ExtensionsService } from '../extensions/extensions.service';
import { TrunksService } from '../trunks/trunks.service';
import { CallsService } from '../calls/calls.service';
import { CallDirection } from '../calls/entities/call.entity';

/**
 * SIP Service
 *
 * This is a placeholder for SIP server integration.
 * In production, this would integrate with Drachtio SIP server.
 *
 * TODO: Implement full Drachtio integration
 * - Connect to Drachtio server via drachtio-srf
 * - Handle REGISTER requests
 * - Handle INVITE/ACK/BYE for call setup
 * - Handle SDP negotiation
 * - Implement DTMF handling (RFC2833)
 * - Implement call features (Hold, Transfer, Conference)
 */
@Injectable()
export class SipService implements OnModuleInit {
  private readonly logger = new Logger(SipService.name);
  private isConnected = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly extensionsService: ExtensionsService,
    private readonly trunksService: TrunksService,
    private readonly callsService: CallsService,
  ) {}

  async onModuleInit() {
    this.logger.log('SIP Service initializing...');

    // TODO: Initialize Drachtio connection
    // const srf = new Srf();
    // await srf.connect({
    //   host: this.configService.get('DRACHTIO_HOST'),
    //   port: this.configService.get('DRACHTIO_PORT'),
    //   secret: this.configService.get('DRACHTIO_SECRET'),
    // });

    this.logger.warn('SIP integration not yet implemented - placeholder active');
    this.isConnected = false;
  }

  /**
   * Handle SIP REGISTER request
   * Registers an extension with the PBX
   */
  async handleRegister(
    extensionNumber: string,
    contactUri: string,
    ipAddress: string,
    port: number,
    transport: 'udp' | 'tcp' | 'tls' | 'wss',
    userAgent?: string,
    expiresIn?: number,
  ): Promise<boolean> {
    try {
      const extension = await this.extensionsService.findByNumber(extensionNumber);

      if (!extension) {
        this.logger.error(`Extension not found: ${extensionNumber}`);
        return false;
      }

      await this.extensionsService.registerExtension(
        extension.id,
        contactUri,
        ipAddress,
        port,
        transport,
        userAgent,
        expiresIn,
      );

      this.logger.log(`Extension registered: ${extensionNumber} from ${ipAddress}:${port}`);
      return true;
    } catch (error) {
      this.logger.error(`Registration failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Handle SIP INVITE (incoming call)
   */
  async handleInvite(
    fromNumber: string,
    toNumber: string,
    callId: string,
    sdp: string,
  ): Promise<{ success: boolean; sdpAnswer?: string }> {
    try {
      this.logger.log(`Incoming call: ${fromNumber} -> ${toNumber}`);

      // Determine direction
      const callerExtension = await this.extensionsService.findByNumber(fromNumber);
      const calleeExtension = await this.extensionsService.findByNumber(toNumber);

      let direction: CallDirection;
      if (callerExtension && calleeExtension) {
        direction = CallDirection.INTERNAL;
      } else if (callerExtension) {
        direction = CallDirection.OUTBOUND;
      } else {
        direction = CallDirection.INBOUND;
      }

      // Create call record
      await this.callsService.createCall({
        callId,
        direction,
        callerNumber: fromNumber,
        calleeNumber: toNumber,
        callerExtensionId: callerExtension?.id,
        calleeExtensionId: calleeExtension?.id,
      });

      // TODO: Generate SDP answer based on codec negotiation
      const sdpAnswer = this.generateSdpAnswer(sdp);

      return { success: true, sdpAnswer };
    } catch (error) {
      this.logger.error(`INVITE handling failed: ${error.message}`);
      return { success: false };
    }
  }

  /**
   * Handle call hangup
   */
  async handleBye(callId: string): Promise<void> {
    try {
      const call = await this.callsService.findOne(callId);
      await this.callsService.endCall(call.id, 'normal_clearing' as any);
      this.logger.log(`Call ended: ${callId}`);
    } catch (error) {
      this.logger.error(`BYE handling failed: ${error.message}`);
    }
  }

  /**
   * Originate outbound call
   */
  async originateCall(
    fromExtension: string,
    toNumber: string,
  ): Promise<{ success: boolean; callId?: string }> {
    try {
      this.logger.log(`Originating call: ${fromExtension} -> ${toNumber}`);

      // TODO: Implement actual SIP INVITE sending via Drachtio
      const callId = `call-${Date.now()}`;

      await this.callsService.createCall({
        callId,
        direction: CallDirection.OUTBOUND,
        callerNumber: fromExtension,
        calleeNumber: toNumber,
      });

      return { success: true, callId };
    } catch (error) {
      this.logger.error(`Call origination failed: ${error.message}`);
      return { success: false };
    }
  }

  /**
   * Hold call
   */
  async holdCall(callId: string): Promise<boolean> {
    try {
      // TODO: Send re-INVITE with sendonly/inactive SDP
      await this.callsService.holdCall(callId);
      return true;
    } catch (error) {
      this.logger.error(`Hold failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Unhold call
   */
  async unholdCall(callId: string): Promise<boolean> {
    try {
      // TODO: Send re-INVITE with sendrecv SDP
      await this.callsService.unholdCall(callId);
      return true;
    } catch (error) {
      this.logger.error(`Unhold failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Transfer call (blind transfer)
   */
  async transferCall(callId: string, destination: string): Promise<boolean> {
    try {
      this.logger.log(`Transferring call ${callId} to ${destination}`);
      // TODO: Implement SIP REFER
      return true;
    } catch (error) {
      this.logger.error(`Transfer failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Get SIP service status
   */
  getStatus(): {
    connected: boolean;
    registeredExtensions: number;
    activeCalls: number;
  } {
    return {
      connected: this.isConnected,
      registeredExtensions: 0, // TODO: Get from Drachtio
      activeCalls: 0, // TODO: Get from Drachtio
    };
  }

  /**
   * Generate SDP answer (placeholder)
   */
  private generateSdpAnswer(sdpOffer: string): string {
    // TODO: Implement proper SDP negotiation
    // - Parse SDP offer
    // - Match codecs
    // - Generate appropriate answer
    return sdpOffer; // Placeholder
  }
}
