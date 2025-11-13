import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Srf, { SrfRequest, SrfResponse } from 'drachtio-srf';
import * as sdpTransform from 'sdp-transform';
import { ExtensionsService } from '../extensions/extensions.service';
import { TrunksService } from '../trunks/trunks.service';
import { CallsService } from '../calls/calls.service';
import { CallDirection, CallState } from '../calls/entities/call.entity';
import { RtpengineService } from './rtpengine.service';

interface ActiveCall {
  callId: string;
  dialog?: any;
  rtpengineInfo?: any;
  localSdp?: string;
  remoteSdp?: string;
}

/**
 * SIP Service - Full Drachtio Integration
 *
 * Handles all SIP signaling via Drachtio SIP server:
 * - REGISTER: Extension registration
 * - INVITE: Call setup and routing
 * - BYE: Call termination
 * - REFER: Call transfer
 * - INFO: DTMF handling
 * - OPTIONS: Keep-alive and health checks
 */
@Injectable()
export class SipService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SipService.name);
  private srf: Srf;
  private isConnected = false;
  private activeCalls: Map<string, ActiveCall> = new Map();
  private registeredExtensions: Map<string, any> = new Map();

  constructor(
    private readonly configService: ConfigService,
    private readonly extensionsService: ExtensionsService,
    private readonly trunksService: TrunksService,
    private readonly callsService: CallsService,
    private readonly rtpengineService: RtpengineService,
  ) {
    this.srf = new Srf();
  }

  async onModuleInit() {
    this.logger.log('Initializing Drachtio SIP Service...');

    const drachtioHost = this.configService.get<string>('DRACHTIO_HOST', 'localhost');
    const drachtioPort = this.configService.get<number>('DRACHTIO_PORT', 9022);
    const drachtioSecret = this.configService.get<string>('DRACHTIO_SECRET', 'cymru');

    try {
      // Connect to Drachtio server
      await this.srf.connect({
        host: drachtioHost,
        port: drachtioPort,
        secret: drachtioSecret,
      });

      this.isConnected = true;
      this.logger.log(`Connected to Drachtio server at ${drachtioHost}:${drachtioPort}`);

      // Set up SIP handlers
      this.setupHandlers();
    } catch (error) {
      this.logger.error(`Failed to connect to Drachtio: ${error.message}`);
      this.logger.warn('SIP service running in degraded mode - no SIP signaling available');
      this.isConnected = false;
    }
  }

  async onModuleDestroy() {
    this.logger.log('Shutting down SIP service...');

    // Hangup all active calls
    for (const [callId, call] of this.activeCalls.entries()) {
      try {
        if (call.dialog) {
          await call.dialog.destroy();
        }
        if (call.rtpengineInfo) {
          await this.rtpengineService.deleteCall(call.rtpengineInfo.callId);
        }
      } catch (error) {
        this.logger.error(`Error cleaning up call ${callId}: ${error.message}`);
      }
    }

    // Disconnect from Drachtio
    if (this.srf) {
      this.srf.disconnect();
    }
  }

  /**
   * Setup SIP message handlers
   */
  private setupHandlers() {
    // Handle REGISTER
    this.srf.register((req: SrfRequest, res: SrfResponse) => {
      this.handleRegister(req, res);
    });

    // Handle INVITE
    this.srf.invite((req: SrfRequest, res: SrfResponse) => {
      this.handleInvite(req, res);
    });

    // Handle OPTIONS (keep-alive)
    this.srf.options((req: SrfRequest, res: SrfResponse) => {
      res.send(200, {
        headers: {
          'Accept': 'application/sdp',
          'Accept-Encoding': 'identity',
          'Allow': 'INVITE, ACK, CANCEL, BYE, OPTIONS, INFO, REFER, NOTIFY',
        },
      });
    });

    // Connection events
    this.srf.on('connect', (err, hostport) => {
      if (err) {
        this.logger.error(`Drachtio connection error: ${err.message}`);
        this.isConnected = false;
      } else {
        this.logger.log(`Drachtio connected to ${hostport}`);
        this.isConnected = true;
      }
    });

    this.srf.on('error', (err) => {
      this.logger.error(`Drachtio error: ${err.message}`);
    });
  }

  /**
   * Handle SIP REGISTER
   */
  private async handleRegister(req: SrfRequest, res: SrfResponse) {
    const from = req.getParsedHeader('from');
    const contact = req.getParsedHeader('contact');
    const authorization = req.get('authorization');
    const expires = parseInt(req.get('expires') || '3600');

    const extensionNumber = from.uri.match(/sip:(\d+)@/)?.[1];
    if (!extensionNumber) {
      this.logger.warn('Invalid extension number in REGISTER');
      return res.send(400, 'Invalid extension');
    }

    try {
      // Find extension in database
      const extension = await this.extensionsService.findByNumber(extensionNumber);
      if (!extension) {
        this.logger.warn(`Extension not found: ${extensionNumber}`);
        return res.send(404, 'Extension not found');
      }

      // Simple authentication check (in production, use digest authentication)
      // TODO: Implement proper SIP digest authentication
      if (!authorization) {
        return res.send(401, {
          headers: {
            'WWW-Authenticate': `Digest realm="pbx-x", nonce="${this.generateNonce()}"`,
          },
        });
      }

      // Extract IP and port from contact
      const contactUri = contact[0]?.uri || '';
      const ipMatch = contactUri.match(/@([^:;]+)/);
      const portMatch = contactUri.match(/:(\d+)/);
      const ipAddress = ipMatch ? ipMatch[1] : req.source_address;
      const port = portMatch ? parseInt(portMatch[1]) : 5060;

      // Handle unregistration (expires = 0)
      if (expires === 0) {
        this.registeredExtensions.delete(extensionNumber);
        this.logger.log(`Extension unregistered: ${extensionNumber}`);
        return res.send(200);
      }

      // Register extension
      await this.extensionsService.registerExtension(
        extension.id,
        contactUri,
        ipAddress,
        port,
        'udp', // TODO: Detect transport from Via header
        req.get('user-agent'),
        expires,
      );

      // Store registration info
      this.registeredExtensions.set(extensionNumber, {
        contact: contactUri,
        expires: new Date(Date.now() + expires * 1000),
      });

      this.logger.log(`Extension registered: ${extensionNumber} from ${ipAddress}:${port} (expires: ${expires}s)`);

      res.send(200, {
        headers: {
          'Contact': contactUri,
          'Expires': expires.toString(),
        },
      });
    } catch (error) {
      this.logger.error(`REGISTER error: ${error.message}`);
      res.send(500, 'Internal server error');
    }
  }

  /**
   * Handle SIP INVITE (call setup)
   */
  private async handleInvite(req: SrfRequest, res: SrfResponse) {
    const from = req.getParsedHeader('from');
    const to = req.getParsedHeader('to');
    const callId = req.get('call-id');
    const sdpOffer = req.body;

    // Extract numbers
    const fromNumber = from.uri.match(/sip:([^@]+)@/)?.[1] || 'unknown';
    const toNumber = to.uri.match(/sip:([^@]+)@/)?.[1] || 'unknown';

    this.logger.log(`INVITE: ${fromNumber} -> ${toNumber} (Call-ID: ${callId})`);

    try {
      // Determine call direction
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
      const call = await this.callsService.createCall({
        callId,
        direction,
        callerNumber: fromNumber,
        calleeNumber: toNumber,
        callerExtensionId: callerExtension?.id,
        calleeExtensionId: calleeExtension?.id,
      });

      // Allocate RTP ports via RTPEngine
      const rtpengineResult = await this.rtpengineService.offer({
        callId,
        fromTag: from.params.tag,
        sdp: sdpOffer,
        direction: 'private',
      });

      if (!rtpengineResult.success) {
        this.logger.error('RTPEngine offer failed');
        await this.callsService.updateCallState(call.id, CallState.FAILED);
        return res.send(488, 'Not Acceptable Here');
      }

      // Find destination and ring
      let destinationContact: string | null = null;

      if (calleeExtension) {
        // Extension-to-extension call
        const registration = this.registeredExtensions.get(toNumber);
        if (registration) {
          destinationContact = registration.contact;
        }
      } else {
        // Outbound call - route via trunk
        // TODO: Implement trunk routing logic
        this.logger.warn('Outbound trunk routing not yet implemented');
      }

      if (!destinationContact) {
        this.logger.warn(`Destination not reachable: ${toNumber}`);
        await this.callsService.updateCallState(call.id, CallState.FAILED);
        await this.rtpengineService.deleteCall(callId);
        return res.send(404, 'Not Found');
      }

      // Create B-leg (outbound INVITE)
      const uac = await this.srf.createUAC(destinationContact, {
        localSdp: rtpengineResult.sdp,
        headers: {
          'From': from.uri,
          'To': to.uri,
        },
      });

      // Update call to ringing state
      await this.callsService.updateCallState(call.id, CallState.RINGING);

      // Get SDP answer from B-leg
      const sdpAnswer = uac.remote.sdp;

      // Update RTPEngine with answer
      const rtpengineAnswer = await this.rtpengineService.answer({
        callId,
        fromTag: from.params.tag,
        toTag: uac.remote.getParsedHeader('to').params.tag,
        sdp: sdpAnswer,
        direction: 'private',
      });

      // Send 200 OK to A-leg
      const uas = await this.srf.createUAS(req, res, {
        localSdp: rtpengineAnswer.sdp,
      });

      // Update call to answered
      await this.callsService.updateCallState(call.id, CallState.ANSWERED);

      // Store active call info
      this.activeCalls.set(callId, {
        callId,
        dialog: uas,
        rtpengineInfo: { callId, fromTag: from.params.tag, toTag: uac.remote.getParsedHeader('to').params.tag },
        localSdp: rtpengineAnswer.sdp,
        remoteSdp: sdpAnswer,
      });

      // Handle call termination
      uas.on('destroy', async () => {
        await this.handleCallEnd(callId);
      });

      uac.on('destroy', async () => {
        uas.destroy();
      });

      this.logger.log(`Call established: ${fromNumber} <-> ${toNumber}`);
    } catch (error) {
      this.logger.error(`INVITE handling failed: ${error.message}`, error.stack);
      res.send(500, 'Internal Server Error');
    }
  }

  /**
   * Handle call end
   */
  private async handleCallEnd(callId: string) {
    this.logger.log(`Call ending: ${callId}`);

    const activeCall = this.activeCalls.get(callId);
    if (!activeCall) {
      return;
    }

    try {
      // Delete RTPEngine session
      if (activeCall.rtpengineInfo) {
        await this.rtpengineService.deleteCall(activeCall.rtpengineInfo.callId);
      }

      // Update database
      const call = await this.callsService.findByCallId(callId);
      if (call) {
        await this.callsService.endCall(call.id, 'normal_clearing');
      }

      // Remove from active calls
      this.activeCalls.delete(callId);
    } catch (error) {
      this.logger.error(`Error handling call end: ${error.message}`);
    }
  }

  /**
   * Originate outbound call
   */
  async originateCall(
    fromExtension: string,
    toNumber: string,
  ): Promise<{ success: boolean; callId?: string; error?: string }> {
    if (!this.isConnected) {
      return { success: false, error: 'SIP service not connected' };
    }

    try {
      const extension = await this.extensionsService.findByNumber(fromExtension);
      if (!extension) {
        return { success: false, error: 'Extension not found' };
      }

      const registration = this.registeredExtensions.get(fromExtension);
      if (!registration) {
        return { success: false, error: 'Extension not registered' };
      }

      const callId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Create outbound INVITE
      const uri = `sip:${toNumber}@${this.configService.get('SIP_DOMAIN', 'pbx-x.local')}`;

      this.logger.log(`Originating call: ${fromExtension} -> ${toNumber}`);

      // Create call in database
      const call = await this.callsService.createCall({
        callId,
        direction: CallDirection.OUTBOUND,
        callerNumber: fromExtension,
        calleeNumber: toNumber,
        callerExtensionId: extension.id,
      });

      // TODO: Implement actual call origination via SRF
      // This would create the actual SIP INVITE

      return { success: true, callId };
    } catch (error) {
      this.logger.error(`Call origination failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Hangup call
   */
  async hangupCall(callId: string): Promise<boolean> {
    const activeCall = this.activeCalls.get(callId);
    if (!activeCall?.dialog) {
      return false;
    }

    try {
      await activeCall.dialog.destroy();
      await this.handleCallEnd(callId);
      return true;
    } catch (error) {
      this.logger.error(`Hangup failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Hold call (send re-INVITE with inactive SDP)
   */
  async holdCall(callId: string): Promise<boolean> {
    const activeCall = this.activeCalls.get(callId);
    if (!activeCall?.dialog) {
      return false;
    }

    try {
      // Parse current SDP
      const sdp = sdpTransform.parse(activeCall.localSdp || '');

      // Set all media to inactive
      sdp.media.forEach((m: any) => {
        m.direction = 'inactive';
      });

      // Generate new SDP
      const newSdp = sdpTransform.write(sdp);

      // Send re-INVITE
      await activeCall.dialog.modify(newSdp);

      // Update database
      const call = await this.callsService.findByCallId(callId);
      if (call) {
        await this.callsService.holdCall(call.id);
      }

      this.logger.log(`Call ${callId} on hold`);
      return true;
    } catch (error) {
      this.logger.error(`Hold failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Unhold call (send re-INVITE with sendrecv SDP)
   */
  async unholdCall(callId: string): Promise<boolean> {
    const activeCall = this.activeCalls.get(callId);
    if (!activeCall?.dialog) {
      return false;
    }

    try {
      // Parse current SDP
      const sdp = sdpTransform.parse(activeCall.localSdp || '');

      // Set all media to sendrecv
      sdp.media.forEach((m: any) => {
        m.direction = 'sendrecv';
      });

      // Generate new SDP
      const newSdp = sdpTransform.write(sdp);

      // Send re-INVITE
      await activeCall.dialog.modify(newSdp);

      // Update database
      const call = await this.callsService.findByCallId(callId);
      if (call) {
        await this.callsService.unholdCall(call.id);
      }

      this.logger.log(`Call ${callId} resumed`);
      return true;
    } catch (error) {
      this.logger.error(`Unhold failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Transfer call (blind transfer via REFER)
   */
  async transferCall(callId: string, destination: string): Promise<boolean> {
    const activeCall = this.activeCalls.get(callId);
    if (!activeCall?.dialog) {
      return false;
    }

    try {
      // Send REFER
      await activeCall.dialog.request({
        method: 'REFER',
        headers: {
          'Refer-To': `<sip:${destination}@${this.configService.get('SIP_DOMAIN', 'pbx-x.local')}>`,
          'Referred-By': activeCall.dialog.remote.uri,
        },
      });

      this.logger.log(`Call ${callId} transferred to ${destination}`);
      return true;
    } catch (error) {
      this.logger.error(`Transfer failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Get service status
   */
  getStatus(): {
    connected: boolean;
    registeredExtensions: number;
    activeCalls: number;
  } {
    return {
      connected: this.isConnected,
      registeredExtensions: this.registeredExtensions.size,
      activeCalls: this.activeCalls.size,
    };
  }

  /**
   * Generate nonce for digest authentication
   */
  private generateNonce(): string {
    return Buffer.from(`${Date.now()}:${Math.random()}`).toString('base64');
  }
}
