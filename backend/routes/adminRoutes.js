const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');
const adminController = require('../controllers/adminController');
const sendEmail = require('../utils/sendEmail');
const Notification = require('../models/Notification'); // Import Notification model
const Admin = require('../models/admin'); // Import Admin model

// Helper route to create default admin for development
router.post('/create-default-admin', async (req, res) => {
  try {
    // Check if default admin already exists
    const existingAdmin = await Admin.findById('507f1f77bcf86cd799439011');
    if (existingAdmin) {
      return res.json({ message: 'Default admin already exists', adminId: existingAdmin._id });
    }

    // Create default admin with specific ID
    const defaultAdmin = new Admin({
      _id: '507f1f77bcf86cd799439011',
      name: 'Default Admin',
      email: 'admin@fit-verse.com',
      password: 'hashedpassword123', // This should be properly hashed in production
      role: 'admin'
    });

    await defaultAdmin.save();
    res.json({ message: 'Default admin created successfully', adminId: defaultAdmin._id });
  } catch (error) {
    console.error('Error creating default admin:', error);
    res.status(500).json({ message: 'Error creating default admin' });
  }
});

const { getDashboardData } = require('../controllers/adminController');

// Dashboard route
router.get('/dashboard', adminAuth, adminController.getDashboardData);

// Gym Management Routes
router.get('/gyms', adminAuth, adminController.getAllGyms);  // Get all gyms for admin
router.get('/gyms/status/:status', adminAuth, adminController.getGymsByStatus);  // Get gyms by status for admin
router.get('/gyms/:id', adminAuth, adminController.getGymById);  // Admin-specific gym details

// Gym Approval Routes
router.patch('/gyms/:id/approve', adminAuth, adminController.approveGym);
router.patch('/gyms/:id/reject', adminAuth, adminController.rejectGym);
router.patch('/gyms/:id/revoke', adminAuth, adminController.revokeGym);
router.patch('/gyms/:id/reconsider', adminAuth, adminController.reconsiderGym);

// Delete gym route
router.delete('/gyms/:id', adminAuth, adminController.deleteGym);


// Notification Routes
router.get('/notifications', adminAuth, adminController.getNotifications);  // Get all notifications for admin
router.put('/notifications/:id/read', adminAuth, adminController.markNotificationRead);  // Mark a notification as read
router.put('/notifications/mark-all-read', adminAuth, adminController.markAllNotificationsRead);  // Mark all notifications as read

module.exports = router;
