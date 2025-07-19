// routes/supportRoutes.js
const express = require('express');
const router = express.Router();
const Support = require('../models/Support');
const User = require('../models/User');
const Gym = require('../models/gym');
const Trainer = require('../models/trainerModel');
const Notification = require('../models/Notification');
const GymNotification = require('../models/GymNotification');
const authMiddleware = require('../middleware/authMiddleware');
const adminAuth = require('../middleware/adminAuth');
const sendEmail = require('../utils/sendEmail');
const whatsappService = require('../services/whatsappService');

// Get support statistics for admin dashboard
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const stats = await Support.aggregate([
      {
        $facet: {
          totalTickets: [{ $count: "count" }],
          openTickets: [{ $match: { status: { $in: ['open', 'in-progress'] } } }, { $count: "count" }],
          resolvedToday: [
            { $match: { resolvedAt: { $gte: today } } },
            { $count: "count" }
          ],
          averageResponseTime: [
            { $match: { responseTime: { $exists: true } } },
            { $group: { _id: null, avgTime: { $avg: "$responseTime" } } }
          ],
          byUserType: [
            { $group: { _id: "$userType", count: { $sum: 1 } } }
          ],
          byPriority: [
            { $group: { _id: "$priority", count: { $sum: 1 } } }
          ],
          byStatus: [
            { $group: { _id: "$status", count: { $sum: 1 } } }
          ]
        }
      }
    ]);

    const result = {
      totalTickets: stats[0].totalTickets[0]?.count || 0,
      openTickets: stats[0].openTickets[0]?.count || 0,
      resolvedToday: stats[0].resolvedToday[0]?.count || 0,
      averageResponseTime: Math.round(stats[0].averageResponseTime[0]?.avgTime || 0),
      byUserType: stats[0].byUserType.reduce((acc, item) => {
        acc[item._id.toLowerCase()] = item.count;
        return acc;
      }, { user: 0, gym: 0, trainer: 0 }),
      byPriority: stats[0].byPriority.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      byStatus: stats[0].byStatus.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {})
    };

    res.json({
      success: true,
      stats: result
    });
  } catch (error) {
    console.error('Error fetching support stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching support statistics'
    });
  }
});

// Get support tickets with filtering
router.get('/tickets', adminAuth, async (req, res) => {
  try {
    const {
      userType,
      status,
      priority,
      category,
      search,
      page = 1,
      limit = 20
    } = req.query;

    const filter = {};
    
    if (userType && userType !== 'all') {
      filter.userType = userType.charAt(0).toUpperCase() + userType.slice(1);
    }
    
    if (status && status !== 'all') {
      filter.status = status;
    }
    
    if (priority && priority !== 'all') {
      filter.priority = priority;
    }
    
    if (category && category !== 'all') {
      filter.category = category;
    }
    
    if (search) {
      filter.$or = [
        { subject: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { userName: { $regex: search, $options: 'i' } },
        { userEmail: { $regex: search, $options: 'i' } },
        { ticketId: { $regex: search, $options: 'i' } }
      ];
    }

    const tickets = await Support.find(filter)
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const totalTickets = await Support.countDocuments(filter);

    res.json({
      success: true,
      tickets,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalTickets / limit),
        totalTickets,
        hasNext: page * limit < totalTickets,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching support tickets:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching support tickets'
    });
  }
});

// Get specific ticket details
router.get('/tickets/:ticketId', adminAuth, async (req, res) => {
  try {
    const ticket = await Support.findOne({ ticketId: req.params.ticketId })
      .populate('assignedTo', 'name email')
      .populate('relatedTickets', 'ticketId subject status');

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    res.json({
      success: true,
      ticket
    });
  } catch (error) {
    console.error('Error fetching ticket details:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching ticket details'
    });
  }
});

// Create new support ticket (for users)
router.post('/tickets', authMiddleware, async (req, res) => {
  try {
    const {
      category,
      priority = 'medium',
      subject,
      description,
      userType,
      attachments = []
    } = req.body;

    let userId, userEmail, userName, userPhone;
    
    // Determine user details based on user type
    if (userType === 'User') {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      userId = user._id;
      userEmail = user.email;
      userName = user.name;
      userPhone = user.phone;
    } else if (userType === 'Gym') {
      const gym = await Gym.findById(req.user.id);
      if (!gym) {
        return res.status(404).json({
          success: false,
          message: 'Gym not found'
        });
      }
      userId = gym._id;
      userEmail = gym.email;
      userName = gym.gymName;
      userPhone = gym.phone;
    } else if (userType === 'Trainer') {
      const trainer = await Trainer.findById(req.user.id);
      if (!trainer) {
        return res.status(404).json({
          success: false,
          message: 'Trainer not found'
        });
      }
      userId = trainer._id;
      userEmail = trainer.email;
      userName = trainer.name;
      userPhone = trainer.phone;
    }

    const ticket = new Support({
      userId,
      userType,
      userEmail,
      userName,
      userPhone,
      category,
      priority,
      subject,
      description,
      attachments,
      messages: [{
        sender: 'user',
        message: description,
        timestamp: new Date()
      }],
      metadata: {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
        source: 'web'
      }
    });

    await ticket.save();

    // Create notification for admin
    const notification = new Notification({
      recipient: 'admin',
      title: 'New Support Ticket',
      message: `New ${priority} priority ticket from ${userName}: ${subject}`,
      type: 'support',
      metadata: {
        ticketId: ticket.ticketId,
        userType,
        priority,
        category
      }
    });

    await notification.save();

    res.status(201).json({
      success: true,
      message: 'Support ticket created successfully',
      ticket: {
        ticketId: ticket.ticketId,
        status: ticket.status,
        priority: ticket.priority,
        createdAt: ticket.createdAt
      }
    });
  } catch (error) {
    console.error('Error creating support ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating support ticket'
    });
  }
});

// Reply to support ticket
router.post('/tickets/:ticketId/reply', adminAuth, async (req, res) => {
  try {
    const {
      message,
      status,
      priority,
      channels = ['notification'] // email, notification, whatsapp
    } = req.body;

    const ticket = await Support.findOne({ ticketId: req.params.ticketId });
    
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    // Add reply message
    ticket.messages.push({
      sender: 'admin',
      message,
      timestamp: new Date(),
      sentVia: channels
    });

    // Update ticket status and priority if provided
    if (status) ticket.status = status;
    if (priority) ticket.priority = priority;
    
    // Assign ticket to current admin if not already assigned
    if (!ticket.assignedTo) {
      ticket.assignedTo = req.admin.id;
    }

    await ticket.save();

    // Send notifications via selected channels
    const notificationPromises = [];

    if (channels.includes('email')) {
      notificationPromises.push(
        sendEmail(
          ticket.userEmail,
          `Re: ${ticket.subject} [Ticket #${ticket.ticketId}]`,
          `
            <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
              <h2 style="color: #2563eb;">Support Team Reply</h2>
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3>Ticket Details</h3>
                <p><strong>Ticket ID:</strong> ${ticket.ticketId}</p>
                <p><strong>Subject:</strong> ${ticket.subject}</p>
                <p><strong>Status:</strong> ${ticket.status.toUpperCase()}</p>
                <p><strong>Priority:</strong> ${ticket.priority.toUpperCase()}</p>
              </div>
              <div style="background: #ffffff; padding: 20px; border-left: 4px solid #2563eb; margin: 20px 0;">
                <h4>Admin Reply:</h4>
                <p>${message}</p>
              </div>
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                <p style="color: #6b7280; font-size: 12px;">
                  This is an automated message from Fit-Verse Support Team.
                  Please do not reply to this email directly.
                </p>
              </div>
            </div>
          `
        )
      );
    }

    if (channels.includes('notification')) {
      
      // If this is a grievance from a gym user, also notify the gym admin
      
      if (ticket.userType === 'Gym') {
        
        // Check for grievance keywords in both description and subject
        const grievanceKeywords = ['grievance', 'complaint', 'issue', 'problem', 'dissatisfied', 'unhappy', 'poor service', 'bad experience'];
        const textToCheck = (ticket.description + ' ' + ticket.subject).toLowerCase();
        const isGrievance = grievanceKeywords.some(keyword => textToCheck.includes(keyword));
        
        
        if (isGrievance) {
          try {
            // For gym tickets, userId is already the gym ID
            const gymId = ticket.userId;
            
            // Create notification for gym admin
            const notification = await GymNotification.createGrievanceReply({
              gymId: gymId,
              ticketId: ticket.ticketId,
              adminMessage: message,
              ticketSubject: ticket.subject,
              ticketStatus: ticket.status,
              ticketPriority: ticket.priority,
              adminId: req.admin.id,
              priority: ticket.priority === 'high' || ticket.priority === 'urgent' ? 'urgent' : ticket.priority
            });
            
            
            // Find gym details for logging
            const gym = await Gym.findById(gymId);
            if (gym) {
            }
          } catch (notificationError) {
          }
        } else {
        }
      } else {
      }
      
      // TODO: Implement user notification system for ticket replies
      // This should send a notification to the user's dashboard/app
    }

    if (channels.includes('whatsapp') && ticket.userPhone) {
      notificationPromises.push(
        whatsappService.sendMessage({
          to: ticket.userPhone,
          message: `🎯 *Support Team Reply*\n\n*Ticket:* ${ticket.ticketId}\n*Subject:* ${ticket.subject}\n\n*Reply:* ${message}\n\nStatus: ${ticket.status.toUpperCase()}\nPriority: ${ticket.priority.toUpperCase()}\n\n_Please check your Fit-Verse account for full details._`
        })
      );
    }

    await Promise.all(notificationPromises);

    res.json({
      success: true,
      message: 'Reply sent successfully',
      ticket: {
        ticketId: ticket.ticketId,
        status: ticket.status,
        priority: ticket.priority,
        messagesCount: ticket.messages.length
      }
    });
  } catch (error) {
    console.error('Error replying to ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending reply'
    });
  }
});

// Update ticket status/priority
router.put('/tickets/:ticketId', adminAuth, async (req, res) => {
  try {
    const { status, priority, assignedTo, tags } = req.body;
    
    const ticket = await Support.findOne({ ticketId: req.params.ticketId });
    
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    if (status) ticket.status = status;
    if (priority) ticket.priority = priority;
    if (assignedTo) ticket.assignedTo = assignedTo;
    if (tags) ticket.tags = tags;

    await ticket.save();

    res.json({
      success: true,
      message: 'Ticket updated successfully',
      ticket: {
        ticketId: ticket.ticketId,
        status: ticket.status,
        priority: ticket.priority,
        assignedTo: ticket.assignedTo
      }
    });
  } catch (error) {
    console.error('Error updating ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating ticket'
    });
  }
});

// Get quick reply templates
router.get('/templates', adminAuth, async (req, res) => {
  try {
    const templates = {
      acknowledge: {
        title: 'Acknowledge Receipt',
        message: 'Thank you for contacting us. We have received your support request and will respond within 24 hours. Your ticket number is #{ticketId}.'
      },
      investigating: {
        title: 'Investigating Issue',
        message: 'We are currently investigating your issue and will update you as soon as we have more information. Thank you for your patience.'
      },
      resolved: {
        title: 'Issue Resolved',
        message: 'Your issue has been resolved. If you continue to experience problems, please let us know and we will reopen this ticket.'
      },
      'more-info': {
        title: 'Need More Information',
        message: 'To better assist you, we need some additional information. Please provide more details about your issue.'
      },
      escalate: {
        title: 'Escalate to Team',
        message: 'Your request has been escalated to our specialized team. They will contact you within 2 business hours.'
      }
    };

    res.json({
      success: true,
      templates
    });
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching templates'
    });
  }
});

// Delete support ticket
router.delete('/tickets/:ticketId', adminAuth, async (req, res) => {
  try {
    const ticket = await Support.findOneAndDelete({ ticketId: req.params.ticketId });
    
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    res.json({
      success: true,
      message: 'Ticket deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting ticket'
    });
  }
});

// Admin-specific endpoint for creating support tickets (from grievance notifications)
router.post('/admin/tickets', adminAuth, async (req, res) => {
  try {
    const {
      category,
      priority = 'medium',
      subject,
      description,
      userType,
      gymId,
      gymName,
      gymEmail,
      gymPhone,
      attachments = []
    } = req.body;

   

    // Generate ticket ID
    const ticketCount = await Support.countDocuments();
    const ticketId = `TKT-${Date.now()}-${ticketCount + 1}`;

    // Create the support ticket
    const ticket = new Support({
      ticketId,
      userId: gymId || req.admin.id,
      userType: userType || 'Gym',
      userEmail: gymEmail || 'admin@fitverse.com',
      userName: gymName || 'Gym Admin',
      userPhone: gymPhone || 'N/A',
      category,
      priority,
      subject,
      description,
      status: 'open',
      attachments,
      messages: [{
        sender: 'user',
        senderName: gymName || 'Gym Admin',
        message: description,
        timestamp: new Date()
      }],
      metadata: {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
        source: 'admin',
        createdBy: 'admin'
      }
    });

    await ticket.save();


    res.status(201).json({
      success: true,
      message: 'Support ticket created successfully by admin',
      ticket: {
        ticketId: ticket.ticketId,
        status: ticket.status,
        priority: ticket.priority,
        createdAt: ticket.createdAt
      }
    });
  } catch (error) {
    console.error('Error creating admin support ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating support ticket',
      error: error.message
    });
  }
});

module.exports = router;
