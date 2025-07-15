// WhatsApp API Service
// This service provides WhatsApp integration functionality
// You can integrate with Twilio, WhatsApp Business API, or other providers

const axios = require('axios');

class WhatsAppService {
  constructor() {
    // Configuration for WhatsApp API
    this.config = {
      // Twilio configuration
      twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
      twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
      twilioWhatsAppNumber: process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886',
      
      // WhatsApp Business API configuration
      whatsappBusinessApiUrl: process.env.WHATSAPP_BUSINESS_API_URL,
      whatsappBusinessApiToken: process.env.WHATSAPP_BUSINESS_API_TOKEN,
      
      // Default provider
      provider: process.env.WHATSAPP_PROVIDER || 'twilio' // 'twilio' | 'business_api' | 'none'
    };
  }

  // Send WhatsApp message using Twilio
  async sendViaTwilio(phoneNumber, message) {
    try {
      const accountSid = this.config.twilioAccountSid;
      const authToken = this.config.twilioAuthToken;
      const client = require('twilio')(accountSid, authToken);
      
      const result = await client.messages.create({
        body: message,
        from: this.config.twilioWhatsAppNumber,
        to: `whatsapp:+91${phoneNumber}`
      });
      
      return {
        success: true,
        messageId: result.sid,
        status: result.status
      };
    } catch (error) {
      console.error('Twilio WhatsApp error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Send WhatsApp message using WhatsApp Business API
  async sendViaBusinessApi(phoneNumber, message) {
    try {
      const response = await axios.post(
        `${this.config.whatsappBusinessApiUrl}/messages`,
        {
          messaging_product: 'whatsapp',
          to: `91${phoneNumber}`,
          type: 'text',
          text: {
            body: message
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.config.whatsappBusinessApiToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return {
        success: true,
        messageId: response.data.messages[0].id,
        status: 'sent'
      };
    } catch (error) {
      console.error('WhatsApp Business API error:', error);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  // Send WhatsApp message using configured provider
  async sendMessage(phoneNumber, title, message) {
    // Clean phone number (remove any non-digits)
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    
    // Format message
    const formattedMessage = `*${title}*\n\n${message}\n\n_Best regards,_\n_Fit-Verse Team_`;
    
    console.log(`Sending WhatsApp message to ${cleanPhone}:`, formattedMessage);
    
    switch (this.config.provider) {
      case 'twilio':
        if (!this.config.twilioAccountSid || !this.config.twilioAuthToken) {
          throw new Error('Twilio credentials not configured');
        }
        return await this.sendViaTwilio(cleanPhone, formattedMessage);
        
      case 'business_api':
        if (!this.config.whatsappBusinessApiUrl || !this.config.whatsappBusinessApiToken) {
          throw new Error('WhatsApp Business API credentials not configured');
        }
        return await this.sendViaBusinessApi(cleanPhone, formattedMessage);
        
      case 'none':
      default:
        // Simulate sending for development
        console.log('WhatsApp simulation mode - message would be sent to:', cleanPhone);
        return {
          success: true,
          messageId: 'sim_' + Date.now(),
          status: 'simulated',
          note: 'Message simulated - configure WhatsApp provider for actual sending'
        };
    }
  }

  // Send WhatsApp messages to multiple recipients
  async sendBulkMessages(recipients, title, message) {
    const results = [];
    
    for (const phoneNumber of recipients) {
      try {
        const result = await this.sendMessage(phoneNumber, title, message);
        results.push({
          phoneNumber,
          success: result.success,
          messageId: result.messageId,
          status: result.status,
          error: result.error
        });
        
        // Add delay between messages to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        results.push({
          phoneNumber,
          success: false,
          error: error.message
        });
      }
    }
    
    return results;
  }

  // Generate WhatsApp web URL for manual sending
  generateWhatsAppUrl(phoneNumber, message) {
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    const encodedMessage = encodeURIComponent(message);
    return `https://api.whatsapp.com/send?phone=91${cleanPhone}&text=${encodedMessage}`;
  }

  // Check if WhatsApp service is configured
  isConfigured() {
    switch (this.config.provider) {
      case 'twilio':
        return !!(this.config.twilioAccountSid && this.config.twilioAuthToken);
      case 'business_api':
        return !!(this.config.whatsappBusinessApiUrl && this.config.whatsappBusinessApiToken);
      default:
        return true; // Always available in simulation mode
    }
  }

  // Get service status
  getStatus() {
    return {
      provider: this.config.provider,
      configured: this.isConfigured(),
      features: {
        bulkSending: true,
        templates: false,
        mediaSupport: this.config.provider !== 'none'
      }
    };
  }
}

module.exports = WhatsAppService;
