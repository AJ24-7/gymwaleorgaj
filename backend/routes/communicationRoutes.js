// ============= COMMUNICATION ROUTES =============
// Routes for admin communication and support system

const express = require('express');
const router = express.Router();
const {
    getSupportStats,
    getSupportTickets,
    getSupportTicketDetails,
    addTicketResponse,
    updateTicketStatus,
    escalateTicket,
    sendGymNotification,
    getGymCommunications,
    sendMessageToGym,
    getGymMessages,
    markGymMessageRead,
    getAdminNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
    bulkUpdateTicketStatus,
    exportSupportData,
    getCommunicationAnalytics,
    getSupportTrends
} = require('../controllers/communicationController');
const adminAuth = require('../middleware/adminAuth');

// ========== SUPPORT SYSTEM ROUTES ==========

// Get support statistics for dashboard
router.get('/support/stats', adminAuth, getSupportStats);

// Get support tickets with filtering and pagination
router.get('/support/tickets', adminAuth, getSupportTickets);

// Get specific support ticket details
router.get('/support/tickets/:ticketId', adminAuth, getSupportTicketDetails);

// Update support ticket status
router.patch('/support/tickets/:ticketId/status', adminAuth, updateTicketStatus);

// Add response to support ticket
router.post('/support/tickets/:ticketId/response', adminAuth, addTicketResponse);

// Escalate support ticket
router.post('/support/tickets/:ticketId/escalate', adminAuth, escalateTicket);

// ========== GYM ADMIN COMMUNICATION ROUTES ==========

// Send notification to gym admin
router.post('/gym/:gymId/notification', adminAuth, sendGymNotification);

// Get communication history with gym admin
router.get('/gym/:gymId/communications', adminAuth, getGymCommunications);

// Send message to gym admin
router.post('/gym/:gymId/message', adminAuth, sendMessageToGym);

// Get messages from gym admins
router.get('/gym-messages', adminAuth, getGymMessages);

// Mark gym message as read
router.patch('/gym-messages/:messageId/read', adminAuth, markGymMessageRead);

// ========== NOTIFICATION ROUTES ==========

// Get admin notifications
router.get('/notifications/admin', adminAuth, getAdminNotifications);

// Mark notification as read
router.patch('/notifications/:notificationId/read', adminAuth, markNotificationRead);

// Mark all notifications as read
router.patch('/notifications/mark-all-read', adminAuth, markAllNotificationsRead);

// Delete notification
router.delete('/notifications/:notificationId', adminAuth, deleteNotification);

// ========== BULK OPERATIONS ==========

// Bulk update ticket statuses
router.patch('/support/tickets/bulk/status', adminAuth, bulkUpdateTicketStatus);

// Export support data
router.get('/support/export', adminAuth, exportSupportData);

// ========== ANALYTICS ROUTES ==========

// Get communication analytics
router.get('/analytics/communication', adminAuth, getCommunicationAnalytics);

// Get support ticket trends
router.get('/analytics/support-trends', adminAuth, getSupportTrends);

module.exports = router;
