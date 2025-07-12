// models/Notification.js
const mongoose = require('mongoose');

// Notification Schema
const notificationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  read: {
    type: Boolean,
    default: false
  },
  type: {
    type: String, // e.g., "new-member", "payment", "trainer-approved", "membership-expiry"
    required: true
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'medium', 'high'],
    default: 'normal'
  },
  icon: {
    type: String,
    default: 'fa-bell'
  },
  color: {
    type: String,
    default: '#1976d2'
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',  // This will reference the Admin model for notifications
    required: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
});

// Helper methods
notificationSchema.methods.markAsRead = function() {
  this.read = true;
  return this.save();
};

// Static methods
notificationSchema.statics.getUnreadNotifications = function(adminId) {
  return this.find({ user: adminId, read: false });
};

notificationSchema.statics.getAllNotifications = function(adminId) {
  return this.find({ user: adminId });
};

// Model export
const Notification = mongoose.model('Notification', notificationSchema);
module.exports = Notification;
