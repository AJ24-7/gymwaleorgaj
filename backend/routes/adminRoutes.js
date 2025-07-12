const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');
const adminController = require('../controllers/adminController');
const sendEmail = require('../utils/sendEmail');
const Notification = require('../models/Notification'); // Import Notification model

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
router.patch('/notifications/:id/read', adminAuth, adminController.markNotificationRead);  // Mark a notification as read

module.exports = router;
