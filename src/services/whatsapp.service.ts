import { Client, LocalAuth } from 'whatsapp-web.js';
import { whatsappConfig } from '../config/whatsapp.config';
import { logger } from '../utils/logger';
import * as fs from 'fs';
import * as path from 'path';

export class WhatsAppService {
  private client: Client;
  private isConnected: boolean = false;

  constructor() {
    // Use LocalAuth for session persistence
    // This saves session data locally so you don't need to scan QR code every time
    this.client = new Client({
      authStrategy: new LocalAuth(),
      puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      },
    });

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // QR Code event - only fires on first login
    this.client.on('qr', (qr: string) => {
      logger.info('QR Code received - Scan this with your WhatsApp mobile app');
      console.log('\n=== WHATSAPP QR CODE ===');
      console.log('Please scan the QR code below with your WhatsApp mobile device');
      console.log('Go to: Settings > Linked Devices > Link a Device');
      console.log(qr); // Display QR code as text
      console.log('========================\n');
    });

    // Authenticated event - fires after successful QR scan
    this.client.on('authenticated', (session) => {
      logger.info('WhatsApp authenticated successfully!', {
        whatsappNumber: whatsappConfig.whatsappNumber,
      });
      console.log('✅ Device linked successfully to WhatsApp!');
    });

    // Ready event - fires when client is fully initialized
    this.client.on('ready', () => {
      this.isConnected = true;
      logger.info('WhatsApp client is ready', {
        whatsappNumber: whatsappConfig.whatsappNumber,
      });
      console.log(`🚀 WhatsApp AI Chatbot ready for number: ${whatsappConfig.whatsappNumber}`);
    });

    // Disconnected event
    this.client.on('disconnected', (reason) => {
      this.isConnected = false;
      logger.warn('WhatsApp client disconnected', { reason });
      console.log('❌ WhatsApp disconnected:', reason);
    });

    // Message received event
    this.client.on('message', (message) => {
      logger.info('Message received', {
        from: message.from,
        body: message.body,
      });
    });

    // Error handling
    this.client.on('error', (error) => {
      logger.error('WhatsApp client error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    });
  }

  /**
   * Initialize WhatsApp connection
   */
  async initialize(): Promise<void> {
    try {
      logger.info('Initializing WhatsApp service', {
        whatsappNumber: whatsappConfig.whatsappNumber,
      });

      // Check if session already exists
      const sessionExists = await this.checkSessionExists();
      
      if (sessionExists) {
        console.log('✅ Existing session found - resuming connection...');
        logger.info('Resuming WhatsApp session');
      } else {
        console.log('\n📱 First time setup - QR code will appear below');
        console.log('Please scan the QR code with your WhatsApp mobile device\n');
      }

      // Initialize the client
      await this.client.initialize();
      
      logger.info('WhatsApp service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize WhatsApp service', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Check if a saved session exists
   */
  private async checkSessionExists(): Promise<boolean> {
    const sessionPath = path.join(process.cwd(), '.wwebjs_auth', 'session');
    return fs.existsSync(sessionPath);
  }

  /**
   * Send a message
   */
  async sendMessage(chatId: string, message: string): Promise<void> {
    try {
      if (!this.isConnected) {
        throw new Error('WhatsApp client is not connected');
      }
      await this.client.sendMessage(chatId, message);
      logger.info('Message sent', { chatId, message: message.substring(0, 50) });
    } catch (error) {
      logger.error('Failed to send message', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get the hardcoded WhatsApp number
   */
  getWhatsAppNumber(): string {
    return whatsappConfig.whatsappNumber;
  }

  /**
   * Check if connected
   */
  isWhatsAppConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Shutdown WhatsApp service
   */
  async shutdown(): Promise<void> {
    try {
      await this.client.destroy();
      logger.info('WhatsApp service shutdown completed');
    } catch (error) {
      logger.error('Error during WhatsApp shutdown', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}