# Enhanced Notification System - Setup Guide

## Overview
The enhanced notification system supports multiple channels:
- **System Notifications** - In-app notifications
- **Email Notifications** - HTML email notifications
- **WhatsApp Notifications** - WhatsApp message notifications

## Features

### 1. Interactive Notification Modal
- Quick message templates for common notifications
- Recipient filtering (active members, trainers, admins, etc.)
- Multi-channel selection
- Real-time message preview
- Character count limits
- Scheduled sending (future feature)

### 2. Recipient Filters
- **All Members** - Send to all registered members
- **Active Members** - Members with active subscriptions
- **Expiring Members** - Members with subscriptions expiring in 7 days
- **Expired Members** - Members with expired subscriptions
- **Premium/Standard/Basic Members** - Filter by membership plan
- **Trainers Only** - Send to registered trainers
- **Admin Only** - Send to gym admin
- **New Members** - Members who joined in last 30 days
- **Custom Selection** - Manually select recipients

### 3. Quick Message Templates
- **Membership Expiry** - Automated expiry reminders
- **Payment Reminder** - Payment due notifications
- **New Class** - Announce new classes or programs
- **Holiday Notice** - Gym closure notifications
- **Maintenance** - Maintenance schedule announcements
- **Achievement** - Congratulate member achievements

## Setup Instructions

### 1. System Notifications
System notifications are enabled by default and work with the existing notification system.

### 2. Email Notifications

#### Prerequisites
- Gmail account or SMTP server
- App password for Gmail (if using Gmail)

#### Configuration
Add these environment variables to your `.env` file:

```bash
# Email Configuration
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

#### Gmail Setup
1. Go to your Google Account settings
2. Enable 2-factor authentication
3. Generate an app password:
   - Go to Security > App passwords
   - Select "Mail" and generate password
   - Use the generated password in `EMAIL_PASS`

### 3. WhatsApp Notifications

#### Option A: Twilio WhatsApp API (Recommended)
1. Create a Twilio account at https://twilio.com
2. Set up WhatsApp sandbox or get approved for production
3. Add environment variables:

```bash
# Twilio WhatsApp Configuration
WHATSAPP_PROVIDER=twilio
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

#### Option B: WhatsApp Business API
1. Apply for WhatsApp Business API access
2. Set up webhook and verify your business
3. Add environment variables:

```bash
# WhatsApp Business API Configuration
WHATSAPP_PROVIDER=business_api
WHATSAPP_BUSINESS_API_URL=https://graph.facebook.com/v17.0/YOUR_PHONE_NUMBER_ID
WHATSAPP_BUSINESS_API_TOKEN=your-access-token
```

#### Option C: Development Mode (Default)
For development/testing, the system will simulate WhatsApp sending:

```bash
# Development Mode (default)
WHATSAPP_PROVIDER=none
```

## Usage

### Opening the Notification Modal
1. Click the "Send Notification" button in the dashboard header
2. The enhanced modal will open with all available options

### Sending Notifications
1. **Select Template** (optional) - Click on quick message templates
2. **Choose Recipients** - Select who should receive the notification
3. **Select Channels** - Choose system, email, and/or WhatsApp
4. **Write Message** - Enter title and message content
5. **Preview** - Review the message preview
6. **Send** - Click "Send Notification"

### Custom Recipients
1. Select "Custom Selection" from the recipient filter
2. Search for specific members or trainers
3. Check the boxes for desired recipients
4. Send the notification

## API Endpoints

### Send System Notification
```
POST /api/notifications/send
Authorization: Bearer <gym-admin-token>
Content-Type: application/json

{
  "title": "Notification Title",
  "message": "Notification message",
  "recipients": ["recipient-id-1", "recipient-id-2"],
  "type": "system"
}
```

### Send Email Notification
```
POST /api/notifications/send-email
Authorization: Bearer <gym-admin-token>
Content-Type: application/json

{
  "title": "Email Subject",
  "message": "Email message content",
  "recipients": ["email1@example.com", "email2@example.com"]
}
```

### Send WhatsApp Notification
```
POST /api/notifications/send-whatsapp
Authorization: Bearer <gym-admin-token>
Content-Type: application/json

{
  "title": "WhatsApp Message Title",
  "message": "WhatsApp message content",
  "recipients": ["1234567890", "0987654321"]
}
```

## Message Templates

### Template Variables
Use these placeholders in your message templates:
- `{name}` - Recipient name
- `{expiryDate}` - Membership expiry date
- `{amount}` - Payment amount
- `{dueDate}` - Payment due date
- `{className}` - Class name
- `{schedule}` - Class schedule
- `{instructor}` - Instructor name
- `{holidayDate}` - Holiday date
- `{reason}` - Holiday reason
- `{resumeDate}` - Resume date
- `{maintenanceDate}` - Maintenance date
- `{startTime}` - Start time
- `{endTime}` - End time
- `{areas}` - Affected areas
- `{achievementDescription}` - Achievement description

## Troubleshooting

### Email Issues
- Check EMAIL_USER and EMAIL_PASS in environment variables
- Verify Gmail app password is correct
- Check spam folder for test emails
- Ensure 2-factor authentication is enabled on Gmail

### WhatsApp Issues
- Verify Twilio credentials are correct
- Check WhatsApp sandbox setup
- Ensure phone numbers are in correct format (+91xxxxxxxxxx)
- Check Twilio console for delivery status

### System Notification Issues
- Verify authentication token is valid
- Check recipient IDs are correct
- Ensure database connection is working

## Security Considerations

1. **Environment Variables** - Never commit API keys to version control
2. **Authentication** - All endpoints require gym admin authentication
3. **Rate Limiting** - Implement rate limiting for bulk notifications
4. **Data Validation** - All inputs are validated before processing
5. **Error Handling** - Comprehensive error handling prevents system crashes

## Future Enhancements

1. **Scheduled Notifications** - Send notifications at specific times
2. **Message Templates Management** - Admin interface for custom templates
3. **Delivery Reports** - Track notification delivery status
4. **Push Notifications** - Mobile push notifications
5. **SMS Integration** - SMS notifications as backup channel
6. **Notification History** - View all sent notifications
7. **Bulk Import** - Import recipient lists from CSV/Excel
8. **A/B Testing** - Test different message versions

## Support

For technical support or feature requests:
1. Check the troubleshooting section
2. Review API documentation
3. Check server logs for error details
4. Contact the development team

## License

This notification system is part of the Fit-Verse gym management system and is proprietary software.
