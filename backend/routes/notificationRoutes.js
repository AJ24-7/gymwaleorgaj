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

module.exports = router;
