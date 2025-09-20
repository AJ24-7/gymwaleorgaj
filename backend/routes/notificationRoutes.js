// routes/notificationRoutes.js
const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const Member = require('../models/Member');
const { authMiddleware } = require('../middleware/authMiddleware');
const gymadminAuth = require('../middleware/gymadminAuth');

// Get all notifications for the authenticated gym admin
router.get('/all', gymadminAuth, async (req, res) => {
  try {
    const gymId = (req.admin && (req.admin.gymId || req.admin.id)) || req.body.gymId;
    if (!gymId) return res.status(400).json({ message: 'Gym ID is required.' });
    
    const notifications = await Notification.find({ 
      user: gymId 
    }).sort({ timestamp: -1 }).limit(50);
    
    res.json({
      success: true,
      notifications
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching notifications'
    });
  }
});

// Get unread notifications for the authenticated gym admin
router.get('/unread', gymadminAuth, async (req, res) => {
  try {
    const gymId = (req.admin && (req.admin.gymId || req.admin.id)) || req.body.gymId;
    if (!gymId) return res.status(400).json({ message: 'Gym ID is required.' });
    
    const notifications = await Notification.find({ 
      user: gymId,
      read: false 
    }).sort({ timestamp: -1 });
    
    res.json({
      success: true,
      notifications,
      count: notifications.length
    });
  } catch (error) {
    console.error('Error fetching unread notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching unread notifications'
    });
  }
});

// Mark notification as read
router.patch('/:id/read', gymadminAuth, async (req, res) => {
  try {
    const gymId = (req.admin && (req.admin.gymId || req.admin.id)) || req.body.gymId;
    if (!gymId) return res.status(400).json({ message: 'Gym ID is required.' });
    
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: gymId },
      { read: true },
      { new: true }
    );
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }
    
    res.json({
      success: true,
      notification
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating notification'
    });
  }
});

// Mark all notifications as read
router.patch('/mark-all-read', gymadminAuth, async (req, res) => {
  try {
    const gymId = (req.admin && (req.admin.gymId || req.admin.id)) || req.body.gymId;
    if (!gymId) return res.status(400).json({ message: 'Gym ID is required.' });
    
    await Notification.updateMany(
      { user: gymId, read: false },
      { read: true }
    );
    
    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating notifications'
    });
  }
});

// Create a new notification (for system use)
router.post('/', gymadminAuth, async (req, res) => {
  try {
    const { title, message, type, priority } = req.body;
    
    const notification = new Notification({
      title,
      message,
      type,
      priority: priority || 'normal',
      user: req.gymId
    });
    
    await notification.save();
    
    res.json({
      success: true,
      notification
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating notification'
    });
  }
});

// Get members with expiring memberships
router.get('/expiring-memberships', gymadminAuth, async (req, res) => {
  try {
    const { days = 3 } = req.query;
    const daysFromNow = new Date();
    daysFromNow.setDate(daysFromNow.getDate() + parseInt(days));
    
    const expiringMembers = await Member.find({
      gymId: req.gymId,
      membershipValidUntil: {
        $lte: daysFromNow,
        $gte: new Date()
      }
    }).select('name email phone membershipValidUntil planSelected');
    
    res.json({
      success: true,
      members: expiringMembers,
      count: expiringMembers.length
    });
  } catch (error) {
    console.error('Error fetching expiring memberships:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching expiring memberships'
    });
  }
});

// Delete notification
router.delete('/:id', gymadminAuth, async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      user: req.gymId
    });
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting notification'
    });
  }
});

// Utility function to create notifications (exported for use in other routes)
const createNotification = async (gymId, title, message, type, priority = 'normal', metadata = {}) => {
  try {
    const notification = new Notification({
      title,
      message,
      type,
      priority,
      user: gymId,
      metadata
    });
    
    await notification.save();
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

// Export the utility function
router.createNotification = createNotification;

// Send notification via email
router.post('/send-email', gymadminAuth, async (req, res) => {
  try {
    const { title, message, recipients } = req.body;
    const gymId = (req.admin && (req.admin.gymId || req.admin.id)) || req.body.gymId;
    
    if (!gymId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Gym ID is required.' 
      });
    }
    
    if (!title || !message || !recipients || recipients.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Title, message, and recipients are required.' 
      });
    }

    const sendEmail = require('../utils/sendEmail');
    const successCount = [];
    const failedCount = [];

    // Send emails to all recipients
    for (const email of recipients) {
      try {
        await sendEmail(email, title, `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
            <div style="background: linear-gradient(135deg, #1976d2, #42a5f5); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
              <h1 style="margin: 0; font-size: 24px;">
                <i class="fas fa-dumbbell"></i> Gym-Wale
              </h1>
            </div>
            <div style="padding: 20px; background: #f8f9fa; border-radius: 0 0 8px 8px;">
              <h2 style="color: #1976d2; margin-top: 0;">${title}</h2>
              <div style="background: white; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #1976d2;">
                <p style="margin: 0; line-height: 1.6; color: #333; white-space: pre-wrap;">${message}</p>
              </div>
              <div style="text-align: center; margin-top: 20px; padding: 15px; background: white; border-radius: 6px;">
                <p style="margin: 0; color: #666; font-size: 14px;">
                  Best regards,<br>
                  <strong style="color: #1976d2;">Gym-Wale Team</strong>
                </p>
              </div>
            </div>
          </div>
        `);
        successCount.push(email);
      } catch (error) {
        console.error(`Failed to send email to ${email}:`, error);
        failedCount.push(email);
      }
    }

    // Log email notification in the database
    const notification = new Notification({
      user: gymId,
      title: `Email: ${title}`,
      message: `Sent to ${successCount.length} recipients. ${failedCount.length} failed.`,
      type: 'email',
      metadata: {
        successCount: successCount.length,
        failedCount: failedCount.length,
        successEmails: successCount,
        failedEmails: failedCount
      }
    });
    await notification.save();

    res.json({
      success: true,
      message: `Email sent successfully to ${successCount.length} recipients. ${failedCount.length} failed.`,
      successCount: successCount.length,
      failedCount: failedCount.length
    });
  } catch (error) {
    console.error('Error sending email notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending email notifications'
    });
  }
});

// Send notification via WhatsApp
router.post('/send-whatsapp', gymadminAuth, async (req, res) => {
  try {
    const { title, message, recipients } = req.body;
    const gymId = (req.admin && (req.admin.gymId || req.admin.id)) || req.body.gymId;
    
    if (!gymId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Gym ID is required.' 
      });
    }
    
    if (!title || !message || !recipients || recipients.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Title, message, and recipients are required.' 
      });
    }

    const WhatsAppService = require('../services/whatsappService');
    const whatsappService = new WhatsAppService();
    
    // Check if WhatsApp service is configured
    const serviceStatus = whatsappService.getStatus();
    
    // Send WhatsApp messages to all recipients
    const results = await whatsappService.sendBulkMessages(recipients, title, message);
    
    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;
    
    // Log WhatsApp notification in the database
    const notification = new Notification({
      user: gymId,
      title: `WhatsApp: ${title}`,
      message: `Sent to ${successCount} recipients. ${failedCount} failed.`,
      type: 'whatsapp',
      metadata: {
        successCount,
        failedCount,
        provider: serviceStatus.provider,
        configured: serviceStatus.configured,
        results: results.map(r => ({
          phoneNumber: r.phoneNumber,
          success: r.success,
          messageId: r.messageId,
          status: r.status,
          error: r.error
        }))
      }
    });
    await notification.save();

    res.json({
      success: true,
      message: `WhatsApp message sent successfully to ${successCount} recipients. ${failedCount} failed.`,
      successCount,
      failedCount,
      provider: serviceStatus.provider,
      configured: serviceStatus.configured,
      results: results
    });
  } catch (error) {
    console.error('Error sending WhatsApp notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending WhatsApp notifications',
      error: error.message
    });
  }
});

// Send system notification
router.post('/send', gymadminAuth, async (req, res) => {
  try {
    const { title, message, recipients, type = 'system' } = req.body;
    const gymId = (req.admin && (req.admin.gymId || req.admin.id)) || req.body.gymId;
    
    if (!gymId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Gym ID is required.' 
      });
    }
    
    if (!title || !message || !recipients || recipients.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Title, message, and recipients are required.' 
      });
    }

    const notifications = [];
    
    // Create system notifications for each recipient
    for (const recipientId of recipients) {
      const notification = new Notification({
        user: gymId,
        recipient: recipientId,
        title,
        message,
        type,
        read: false,
        timestamp: new Date()
      });
      notifications.push(notification);
    }

    // Save all notifications
    await Notification.insertMany(notifications);

    res.json({
      success: true,
      message: `System notification sent successfully to ${recipients.length} recipients.`,
      count: recipients.length
    });
  } catch (error) {
    console.error('Error sending system notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending system notifications'
    });
  }
});

module.exports = router;
