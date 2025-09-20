// models/Support.js
const mongoose = require('mongoose');

const supportMessageSchema = new mongoose.Schema({
  sender: {
    type: String,
    required: true,
    enum: ['user', 'admin']
  },
  message: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  attachments: [{
    filename: String,
    originalName: String,
    mimetype: String,
    size: Number,
    path: String
  }],
  sentVia: {
    type: [String],
    enum: ['email', 'notification', 'whatsapp'],
    default: ['notification']
  }
});

const supportTicketSchema = new mongoose.Schema({
  ticketId: {
    type: String,
    unique: true,
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'userType'
  },
  userType: {
    type: String,
    required: true,
    enum: ['User', 'Gym', 'Trainer']
  },
  userEmail: {
    type: String,
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  userPhone: {
    type: String
  },
  category: {
    type: String,
    required: true,
    enum: ['technical', 'billing', 'membership', 'equipment', 'general', 'complaint']
  },
  priority: {
    type: String,
    required: true,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    required: true,
    // Added 'replied' to support intermediate state after an admin response
    enum: ['open', 'replied', 'in-progress', 'resolved', 'closed'],
    default: 'open'
  },
  subject: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  messages: [supportMessageSchema],
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  tags: [{
    type: String
  }],
  attachments: [{
    filename: String,
    originalName: String,
    mimetype: String,
    size: Number,
    path: String
  }],
  escalationLevel: {
    type: Number,
    default: 0
  },
  resolvedAt: {
    type: Date
  },
  responseTime: {
    type: Number // in minutes
  },
  resolutionTime: {
    type: Number // in minutes
  },
  satisfactionRating: {
    type: Number,
    min: 1,
    max: 5
  },
  satisfactionFeedback: {
    type: String
  },
  relatedTickets: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Support'
  }],
  metadata: {
    userAgent: String,
    ipAddress: String,
    source: {
      type: String,
      enum: ['web', 'mobile', 'email', 'phone', 'notification', 'admin'],
      default: 'web'
    },
    contactFormSubmission: {
      type: Boolean,
      default: false
    },
    quickMessage: String,
    interestedActivities: [String],
    contactMethod: {
      type: String,
      enum: ['phone', 'email'],
      default: 'email'
    },
    isGuestUser: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true
});

// Auto-generate ticket ID
supportTicketSchema.pre('save', async function(next) {
  if (!this.ticketId) {
    const count = await mongoose.model('Support').countDocuments();
    this.ticketId = `SUP-${Date.now().toString().slice(-6)}-${(count + 1).toString().padStart(4, '0')}`;
  }
  next();
});

// Calculate response time when first admin message is added
supportTicketSchema.pre('save', function(next) {
  if (this.isModified('messages') && this.messages.length > 1) {
    const firstUserMessage = this.messages.find(msg => msg.sender === 'user');
    const firstAdminMessage = this.messages.find(msg => msg.sender === 'admin');
    
    if (firstUserMessage && firstAdminMessage && !this.responseTime) {
      this.responseTime = Math.round((firstAdminMessage.timestamp - firstUserMessage.timestamp) / (1000 * 60));
    }
  }
  next();
});

// Calculate resolution time when ticket is resolved
supportTicketSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'resolved' && !this.resolvedAt) {
    this.resolvedAt = new Date();
    this.resolutionTime = Math.round((this.resolvedAt - this.createdAt) / (1000 * 60));
  }
  next();
});

// Indexes for better performance
supportTicketSchema.index({ ticketId: 1 });
supportTicketSchema.index({ userId: 1, userType: 1 });
supportTicketSchema.index({ status: 1 });
supportTicketSchema.index({ priority: 1 });
supportTicketSchema.index({ category: 1 });
supportTicketSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Support', supportTicketSchema);
