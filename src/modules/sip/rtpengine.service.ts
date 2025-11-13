import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'rtpengine-client';

interface RtpengineOfferOptions {
  callId: string;
  fromTag: string;
  sdp: string;
  direction?: 'private' | 'public';
  transportProtocol?: 'RTP/AVP' | 'RTP/SAVP' | 'RTP/SAVPF';
}

interface RtpengineAnswerOptions {
  callId: string;
  fromTag: string;
  toTag: string;
  sdp: string;
  direction?: 'private' | 'public';
}

interface RtpengineResult {
  success: boolean;
  sdp?: string;
  error?: string;
}

/**
 * RTPEngine Service
 *
 * Manages media proxying via RTPEngine:
 * - Allocates RTP/RTCP ports
 * - Proxies media between endpoints
 * - Transcoding (optional)
 * - Recording (optional)
 * - DTMF detection
 */
@Injectable()
export class RtpengineService implements OnModuleInit {
  private readonly logger = new Logger(RtpengineService.name);
  private client: Client | null = null;
  private isConnected = false;
  private activeSessions: Map<string, any> = new Map();

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    this.logger.log('Initializing RTPEngine service...');

    const host = this.configService.get<string>('RTPENGINE_HOST', 'localhost');
    const port = this.configService.get<number>('RTPENGINE_PORT', 22222);
    const timeout = this.configService.get<number>('RTPENGINE_TIMEOUT', 5000);

    try {
      // Initialize RTPEngine client
      this.client = new Client({
        host,
        port,
        timeout,
      });

      // Test connection with ping
      const pingResult = await this.ping();
      if (pingResult) {
        this.isConnected = true;
        this.logger.log(`Connected to RTPEngine at ${host}:${port}`);
      } else {
        throw new Error('Ping failed');
      }
    } catch (error) {
      this.logger.error(`Failed to connect to RTPEngine: ${error.message}`);
      this.logger.warn('RTPEngine service running in degraded mode - media proxying unavailable');
      this.isConnected = false;
      this.client = null;
    }
  }

  /**
   * Ping RTPEngine to check connection
   */
  async ping(): Promise<boolean> {
    if (!this.client) {
      return false;
    }

    try {
      const result = await this.client.ping();
      return result?.result === 'pong';
    } catch (error) {
      this.logger.error(`RTPEngine ping failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Offer - Allocate RTP ports for incoming call
   */
  async offer(options: RtpengineOfferOptions): Promise<RtpengineResult> {
    if (!this.client || !this.isConnected) {
      this.logger.warn('RTPEngine not available, returning original SDP');
      return { success: true, sdp: options.sdp };
    }

    try {
      const params = {
        'call-id': options.callId,
        'from-tag': options.fromTag,
        sdp: options.sdp,
        direction: [options.direction || 'private', 'private'],
        'transport-protocol': options.transportProtocol || 'RTP/AVP',
        flags: ['trust-address'],
        'replace': ['origin', 'session-connection'],
      };

      this.logger.debug(`RTPEngine offer: ${JSON.stringify(params)}`);

      const result = await this.client.offer(params);

      if (result?.result === 'ok' && result?.sdp) {
        this.activeSessions.set(options.callId, {
          callId: options.callId,
          fromTag: options.fromTag,
          createdAt: new Date(),
        });

        this.logger.log(`RTPEngine offer successful for call ${options.callId}`);
        return { success: true, sdp: result.sdp };
      } else {
        this.logger.error(`RTPEngine offer failed: ${JSON.stringify(result)}`);
        return { success: false, error: 'Offer failed', sdp: options.sdp };
      }
    } catch (error) {
      this.logger.error(`RTPEngine offer error: ${error.message}`);
      return { success: false, error: error.message, sdp: options.sdp };
    }
  }

  /**
   * Answer - Update RTP ports with answer SDP
   */
  async answer(options: RtpengineAnswerOptions): Promise<RtpengineResult> {
    if (!this.client || !this.isConnected) {
      this.logger.warn('RTPEngine not available, returning original SDP');
      return { success: true, sdp: options.sdp };
    }

    try {
      const params = {
        'call-id': options.callId,
        'from-tag': options.fromTag,
        'to-tag': options.toTag,
        sdp: options.sdp,
        direction: [options.direction || 'private', 'private'],
        flags: ['trust-address'],
        'replace': ['origin', 'session-connection'],
      };

      this.logger.debug(`RTPEngine answer: ${JSON.stringify(params)}`);

      const result = await this.client.answer(params);

      if (result?.result === 'ok' && result?.sdp) {
        // Update session info
        const session = this.activeSessions.get(options.callId);
        if (session) {
          session.toTag = options.toTag;
          session.answeredAt = new Date();
        }

        this.logger.log(`RTPEngine answer successful for call ${options.callId}`);
        return { success: true, sdp: result.sdp };
      } else {
        this.logger.error(`RTPEngine answer failed: ${JSON.stringify(result)}`);
        return { success: false, error: 'Answer failed', sdp: options.sdp };
      }
    } catch (error) {
      this.logger.error(`RTPEngine answer error: ${error.message}`);
      return { success: false, error: error.message, sdp: options.sdp };
    }
  }

  /**
   * Delete call from RTPEngine
   */
  async deleteCall(callId: string, fromTag?: string, toTag?: string): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      return true; // Gracefully handle when RTPEngine is not available
    }

    try {
      const session = this.activeSessions.get(callId);
      const params: any = {
        'call-id': callId,
      };

      if (fromTag || session?.fromTag) {
        params['from-tag'] = fromTag || session.fromTag;
      }

      if (toTag || session?.toTag) {
        params['to-tag'] = toTag || session.toTag;
      }

      this.logger.debug(`RTPEngine delete: ${JSON.stringify(params)}`);

      const result = await this.client.delete(params);

      if (result?.result === 'ok') {
        this.activeSessions.delete(callId);
        this.logger.log(`RTPEngine session deleted for call ${callId}`);
        return true;
      } else {
        this.logger.error(`RTPEngine delete failed: ${JSON.stringify(result)}`);
        return false;
      }
    } catch (error) {
      this.logger.error(`RTPEngine delete error: ${error.message}`);
      return false;
    }
  }

  /**
   * Start recording for a call
   */
  async startRecording(callId: string, recordingPath: string): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      return false;
    }

    try {
      const session = this.activeSessions.get(callId);
      if (!session) {
        this.logger.warn(`Session not found for call ${callId}`);
        return false;
      }

      const params = {
        'call-id': callId,
        'from-tag': session.fromTag,
        'to-tag': session.toTag,
        flags: ['start recording'],
        'recording-file': recordingPath,
        'recording-format': 'wav',
      };

      const result = await this.client.startRecording(params);

      if (result?.result === 'ok') {
        this.logger.log(`Recording started for call ${callId}: ${recordingPath}`);
        return true;
      } else {
        this.logger.error(`Failed to start recording: ${JSON.stringify(result)}`);
        return false;
      }
    } catch (error) {
      this.logger.error(`Start recording error: ${error.message}`);
      return false;
    }
  }

  /**
   * Stop recording for a call
   */
  async stopRecording(callId: string): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      return false;
    }

    try {
      const session = this.activeSessions.get(callId);
      if (!session) {
        this.logger.warn(`Session not found for call ${callId}`);
        return false;
      }

      const params = {
        'call-id': callId,
        'from-tag': session.fromTag,
        'to-tag': session.toTag,
        flags: ['stop recording'],
      };

      const result = await this.client.stopRecording(params);

      if (result?.result === 'ok') {
        this.logger.log(`Recording stopped for call ${callId}`);
        return true;
      } else {
        this.logger.error(`Failed to stop recording: ${JSON.stringify(result)}`);
        return false;
      }
    } catch (error) {
      this.logger.error(`Stop recording error: ${error.message}`);
      return false;
    }
  }

  /**
   * Get call statistics from RTPEngine
   */
  async getCallStats(callId: string): Promise<any> {
    if (!this.client || !this.isConnected) {
      return null;
    }

    try {
      const session = this.activeSessions.get(callId);
      if (!session) {
        return null;
      }

      const params = {
        'call-id': callId,
        'from-tag': session.fromTag,
        'to-tag': session.toTag,
      };

      const result = await this.client.query(params);

      if (result?.result === 'ok') {
        return result;
      } else {
        this.logger.error(`Failed to get call stats: ${JSON.stringify(result)}`);
        return null;
      }
    } catch (error) {
      this.logger.error(`Get call stats error: ${error.message}`);
      return null;
    }
  }

  /**
   * Get service status
   */
  getStatus(): {
    connected: boolean;
    activeSessions: number;
  } {
    return {
      connected: this.isConnected,
      activeSessions: this.activeSessions.size,
    };
  }

  /**
   * List all active sessions
   */
  getActiveSessions(): string[] {
    return Array.from(this.activeSessions.keys());
  }
}
