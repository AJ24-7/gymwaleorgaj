// routes/chatRoutes.js
const express = require('express');
const router = express.Router();
const Support = require('../models/Support');
const User = require('../models/User');
const Gym = require('../models/Gym');
const GymNotification = require('../models/GymNotification');
const authMiddleware = require('../middleware/authMiddleware');
const gymadminAuth = require('../middleware/gymadminAuth');

console.log('💬 Chat Routes loading...');

/**
 * Send a chat message from user to gym
 * POST /api/chat/send
 */
router.post('/send', authMiddleware, async (req, res) => {
    try {
        console.log('📨 User sending chat message to gym');
        const { gymId, message, quickMessage } = req.body;
        const userId = req.user._id;

        if (!gymId || !message) {
            return res.status(400).json({
                success: false,
                message: 'Gym ID and message are required'
            });
        }

        // Validate gym exists
        const gym = await Gym.findById(gymId);
        if (!gym) {
            return res.status(404).json({
                success: false,
                message: 'Gym not found'
            });
        }

        // Get user details
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Create or find existing chat conversation
        let chatTicket = await Support.findOne({
            userId: userId,
            gymId: gymId,
            category: 'chat',
            status: { $in: ['open', 'in-progress'] }
        });

        if (!chatTicket) {
            // Create new chat conversation
            const ticketCount = await Support.countDocuments();
            const ticketId = `CHAT-${Date.now()}-${ticketCount + 1}`;

            chatTicket = new Support({
                ticketId,
                userId: userId,
                gymId: gymId,
                userType: 'User',
                userEmail: user.email,
                userName: user.firstName && user.lastName 
                    ? `${user.firstName} ${user.lastName}` 
                    : (user.username || user.email || 'User'),
                userPhone: user.phone,
                category: 'chat',
                priority: 'medium',
                subject: `Chat with ${gym.gymName}`,
                description: message,
                status: 'open',
                messages: [],
                metadata: {
                    userAgent: req.headers['user-agent'],
                    ipAddress: req.ip,
                    source: 'chat',
                    isChat: true,
                    userProfileImage: user.profileImage || '/uploads/profile-pics/default.png',
                    quickMessage: quickMessage || null
                }
            });
        }

        // Add message to conversation
        chatTicket.messages.push({
            sender: 'user',
            senderName: user.firstName && user.lastName 
                ? `${user.firstName} ${user.lastName}` 
                : (user.username || user.email || 'User'),
            message: message,
            timestamp: new Date(),
            sentVia: ['notification'],
            metadata: {
                quickMessage: quickMessage || null,
                userProfileImage: user.profileImage || '/uploads/profile-pics/default.png'
            }
        });

        await chatTicket.save();

        // Create notification for gym admin
        try {
            const notification = new GymNotification({
                gymId: gymId,
                title: 'New Chat Message',
                message: message.substring(0, 100) + (message.length > 100 ? '...' : ''),
                type: 'chat',
                priority: 'medium',
                status: 'unread',
                metadata: {
                    ticketId: chatTicket.ticketId,
                    userId: userId,
                    userName: user.firstName && user.lastName 
                        ? `${user.firstName} ${user.lastName}` 
                        : (user.username || user.email || 'User'),
                    userEmail: user.email,
                    userProfileImage: user.profileImage || '/uploads/profile-pics/default.png',
                    isChat: true,
                    messagePreview: message.substring(0, 50)
                }
            });

            await notification.save();
            console.log('✅ Gym notification created for chat message');
        } catch (notificationError) {
            console.error('Error creating gym notification:', notificationError);
        }

        res.json({
            success: true,
            message: 'Message sent successfully',
            chatId: chatTicket._id,
            ticketId: chatTicket.ticketId,
            messageCount: chatTicket.messages.length
        });

    } catch (error) {
        console.error('Error sending chat message:', error);
        res.status(500).json({
            success: false,
            message: 'Error sending message',
            error: error.message
        });
    }
});

/**
 * Get chat history between user and gym
 * GET /api/chat/history/:gymId
 */
router.get('/history/:gymId', authMiddleware, async (req, res) => {
    try {
        const { gymId } = req.params;
        const userId = req.user._id;

        console.log('📜 Fetching chat history for user:', userId, 'gym:', gymId);

        // Get all chat conversations between user and gym
        const chatTickets = await Support.find({
            userId: userId,
            gymId: gymId,
            category: 'chat'
        })
        .sort({ updatedAt: -1 })
        .limit(10);

        // Get the most recent active conversation
        const activeChat = chatTickets.find(ticket => 
            ticket.status === 'open' || ticket.status === 'in-progress'
        );

        // Format messages
        const messages = activeChat ? activeChat.messages.map(msg => ({
            id: msg._id,
            sender: msg.sender,
            senderName: msg.senderName || (msg.sender === 'user' ? 'You' : 'Gym Admin'),
            message: msg.message,
            timestamp: msg.timestamp,
            read: msg.read || false,
            metadata: msg.metadata
        })) : [];

        res.json({
            success: true,
            chatId: activeChat?._id,
            ticketId: activeChat?.ticketId,
            status: activeChat?.status || 'new',
            messages: messages,
            hasActiveChat: !!activeChat,
            totalConversations: chatTickets.length
        });

    } catch (error) {
        console.error('Error fetching chat history:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching chat history',
            error: error.message
        });
    }
});

/**
 * Mark chat messages as read
 * PUT /api/chat/read/:chatId
 */
router.put('/read/:chatId', authMiddleware, async (req, res) => {
    try {
        const { chatId } = req.params;
        const userId = req.user._id;

        const chatTicket = await Support.findOne({
            _id: chatId,
            userId: userId,
            category: 'chat'
        });

        if (!chatTicket) {
            return res.status(404).json({
                success: false,
                message: 'Chat not found'
            });
        }

        // Mark all admin messages as read
        let updatedCount = 0;
        chatTicket.messages.forEach(msg => {
            if (msg.sender === 'admin' && !msg.read) {
                msg.read = true;
                updatedCount++;
            }
        });

        if (updatedCount > 0) {
            await chatTicket.save();
        }

        res.json({
            success: true,
            message: 'Messages marked as read',
            markedCount: updatedCount
        });

    } catch (error) {
        console.error('Error marking messages as read:', error);
        res.status(500).json({
            success: false,
            message: 'Error marking messages as read'
        });
    }
});

/**
 * Get gym chat conversations (for gym admin)
 * GET /api/chat/gym/conversations
 */
router.get('/gym/conversations', gymadminAuth, async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        
        console.log('📋 Fetching gym admin conversations');
        
        // Get gymId from authenticated gym admin
        const gymId = req.admin?.id || req.gym?.id || req.gymId;
        
        console.log('🏢 Gym ID:', gymId);
        console.log('🔍 Auth data:', { admin: req.admin, gym: req.gym });
        
        if (!gymId) {
            return res.status(400).json({
                success: false,
                message: 'Gym ID not found in authentication',
                debug: { admin: req.admin, gym: req.gym }
            });
        }
        
        // Find all chat tickets for this gym
        const chatTickets = await Support.find({
            gymId: gymId,
            category: 'chat'
        })
        .populate('userId', 'firstName lastName email profileImage username')
        .sort({ updatedAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));

        const totalChats = await Support.countDocuments({
            gymId: gymId,
            category: 'chat'
        });

        // Format conversations for gym admin
        const conversations = chatTickets.map(ticket => {
            const lastMessage = ticket.messages && ticket.messages.length > 0 
                ? ticket.messages[ticket.messages.length - 1] 
                : null;
            
            const unreadCount = ticket.messages?.filter(m => 
                m.sender === 'user' && !m.read
            ).length || 0;

            return {
                _id: ticket._id,
                ticketId: ticket.ticketId,
                userId: ticket.userId?._id,
                userName: ticket.userName,
                userEmail: ticket.userEmail,
                status: ticket.status,
                category: ticket.category,
                subject: ticket.subject,
                createdAt: ticket.createdAt,
                updatedAt: ticket.updatedAt,
                messages: ticket.messages,
                lastMessage: lastMessage,
                unreadCount: unreadCount,
                metadata: {
                    userProfileImage: ticket.userId?.profileImage || ticket.metadata?.userProfileImage || '/uploads/profile-pics/default.png',
                    isChat: true,
                    source: 'chat'
                }
            };
        });

        console.log(`✅ Found ${conversations.length} chat conversations for gym`);

        res.json({
            success: true,
            conversations: conversations,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalChats / parseInt(limit)),
                totalItems: totalChats
            }
        });

    } catch (error) {
        console.error('Error fetching gym conversations:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching conversations',
            error: error.message
        });
    }
});

/**
 * Gym admin reply to chat message
 * POST /api/chat/gym/reply/:chatId
 */
router.post('/gym/reply/:chatId', gymadminAuth, async (req, res) => {
    try {
        const { chatId } = req.params;
        const { message } = req.body;
        
        console.log('💬 Gym admin replying to chat:', chatId);
        
        if (!message || message.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Message is required'
            });
        }

        const gymId = req.admin?.id || req.gym?.id || req.gymId;

        // Find the chat ticket
        const chatTicket = await Support.findOne({
            _id: chatId,
            gymId: gymId,
            category: 'chat'
        }).populate('userId', 'firstName lastName email');

        if (!chatTicket) {
            return res.status(404).json({
                success: false,
                message: 'Chat conversation not found'
            });
        }

        // Add gym admin reply to messages
        chatTicket.messages.push({
            sender: 'admin',
            senderName: 'Gym Admin',
            message: message.trim(),
            timestamp: new Date(),
            read: false,
            sentVia: ['notification'],
            metadata: {
                gymId: gymId,
                replyType: 'chat'
            }
        });

        // Update ticket status
        if (chatTicket.status === 'open') {
            chatTicket.status = 'in-progress';
        }

        await chatTicket.save();

        // Create notification for user
        try {
            const Notification = require('../models/Notification');
            
            const notification = new Notification({
                user: chatTicket.userId._id,
                title: 'New message from gym',
                message: message.substring(0, 100) + (message.length > 100 ? '...' : ''),
                type: 'chat',
                priority: 'medium',
                metadata: {
                    chatId: chatTicket._id,
                    ticketId: chatTicket.ticketId,
                    gymId: gymId
                }
            });

            await notification.save();
            console.log('✅ User notification created for gym reply');
        } catch (notificationError) {
            console.error('Error creating user notification:', notificationError);
        }

        res.json({
            success: true,
            message: 'Reply sent successfully',
            messageCount: chatTicket.messages.length,
            chatStatus: chatTicket.status
        });

    } catch (error) {
        console.error('Error sending gym reply:', error);
        res.status(500).json({
            success: false,
            message: 'Error sending reply',
            error: error.message
        });
    }
});

/**
 * Close/end a chat conversation
 * PUT /api/chat/close/:chatId
 */
router.put('/close/:chatId', authMiddleware, async (req, res) => {
    try {
        const { chatId } = req.params;
        const userId = req.user._id;

        const chatTicket = await Support.findOne({
            _id: chatId,
            userId: userId,
            category: 'chat'
        });

        if (!chatTicket) {
            return res.status(404).json({
                success: false,
                message: 'Chat not found'
            });
        }

        chatTicket.status = 'closed';
        chatTicket.resolvedAt = new Date();
        
        // Add system message
        chatTicket.messages.push({
            sender: 'system',
            message: 'Chat conversation ended by user',
            timestamp: new Date(),
            sentVia: ['notification']
        });

        await chatTicket.save();

        res.json({
            success: true,
            message: 'Chat conversation closed'
        });

    } catch (error) {
        console.error('Error closing chat:', error);
        res.status(500).json({
            success: false,
            message: 'Error closing chat'
        });
    }
});

console.log('✅ Chat Routes loaded successfully');

module.exports = router;
