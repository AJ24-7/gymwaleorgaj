// Notification System Configuration
// This file contains configuration settings for the enhanced notification system

const NotificationConfig = {
    // API endpoints
    endpoints: {
        system: '/api/notifications/send',
        email: '/api/notifications/send-email',
        whatsapp: '/api/notifications/send-whatsapp',
        members: '/api/members',
        trainers: '/api/trainers'
    },

    // Character limits
    limits: {
        title: 100,
        message: 500,
        recipients: 1000
    },

    // Default settings
    defaults: {
        channels: {
            system: true,
            email: false,
            whatsapp: false
        },
        sendTo: 'all-members',
        deliveryTime: 'now'
    },

    // Message templates
    templates: {
        'membership-expiry': {
            title: 'Membership Expiry Reminder',
            message: 'Dear {name},\n\nYour membership is expiring soon. Please renew to continue enjoying our services.\n\nExpiry Date: {expiryDate}\n\nBest regards,\nFit-Verse Team',
            category: 'membership',
            icon: 'fa-calendar-times'
        },
        'payment-reminder': {
            title: 'Payment Reminder',
            message: 'Dear {name},\n\nThis is a friendly reminder about your pending payment.\n\nAmount: ₹{amount}\nDue Date: {dueDate}\n\nPlease complete your payment to avoid service interruption.\n\nBest regards,\nFit-Verse Team',
            category: 'payment',
            icon: 'fa-credit-card'
        },
        'new-class': {
            title: 'New Class Alert',
            message: 'Exciting News! 🎉\n\nWe\'re introducing a new class: {className}\n\nSchedule: {schedule}\nInstructor: {instructor}\n\nLimited spots available. Book now!\n\nBest regards,\nFit-Verse Team',
            category: 'classes',
            icon: 'fa-plus-circle'
        },
        'holiday-notice': {
            title: 'Holiday Notice',
            message: 'Dear Members,\n\nPlease note that our gym will be closed on {holidayDate} due to {reason}.\n\nWe will resume normal operations on {resumeDate}.\n\nThank you for your understanding.\n\nBest regards,\nFit-Verse Team',
            category: 'announcements',
            icon: 'fa-calendar-alt'
        },
        'maintenance': {
            title: 'Maintenance Notice',
            message: 'Dear Members,\n\nWe will be conducting maintenance work on {maintenanceDate} from {startTime} to {endTime}.\n\nAffected areas: {areas}\n\nWe apologize for any inconvenience.\n\nBest regards,\nFit-Verse Team',
            category: 'maintenance',
            icon: 'fa-tools'
        },
        'achievement': {
            title: 'Congratulations!',
            message: 'Dear {name},\n\nCongratulations on your amazing achievement! 🏆\n\n{achievementDescription}\n\nKeep up the great work!\n\nBest regards,\nFit-Verse Team',
            category: 'achievements',
            icon: 'fa-trophy'
        },
        'welcome': {
            title: 'Welcome to Fit-Verse!',
            message: 'Dear {name},\n\nWelcome to Fit-Verse! We\'re excited to have you join our fitness community.\n\nYour membership details:\n- Plan: {planType}\n- Start Date: {startDate}\n- End Date: {endDate}\n\nFeel free to reach out if you have any questions!\n\nBest regards,\nFit-Verse Team',
            category: 'welcome',
            icon: 'fa-user-plus'
        },
        'class-cancellation': {
            title: 'Class Cancellation',
            message: 'Dear {name},\n\nWe regret to inform you that the {className} class scheduled for {date} at {time} has been cancelled.\n\nReason: {reason}\n\nWe apologize for any inconvenience and will reschedule soon.\n\nBest regards,\nFit-Verse Team',
            category: 'classes',
            icon: 'fa-times-circle'
        }
    },

    // Recipient filters
    recipientFilters: {
        'all-members': {
            label: 'All Members',
            description: 'Send to all registered members',
            icon: 'fa-users'
        },
        'active-members': {
            label: 'Active Membership Members Only',
            description: 'Members with active subscriptions',
            icon: 'fa-user-check'
        },
        'expiring-members': {
            label: 'Members with Expiring Membership (7 days)',
            description: 'Members whose membership expires within 7 days',
            icon: 'fa-clock'
        },
        'expired-members': {
            label: 'Members with Expired Membership',
            description: 'Members with expired subscriptions',
            icon: 'fa-user-times'
        },
        'premium-members': {
            label: 'Premium Members',
            description: 'Members with premium subscriptions',
            icon: 'fa-crown'
        },
        'standard-members': {
            label: 'Standard Members',
            description: 'Members with standard subscriptions',
            icon: 'fa-star'
        },
        'basic-members': {
            label: 'Basic Members',
            description: 'Members with basic subscriptions',
            icon: 'fa-leaf'
        },
        'trainers': {
            label: 'Trainers Only',
            description: 'Send to registered trainers',
            icon: 'fa-user-tie'
        },
        'admin': {
            label: 'Admin Only',
            description: 'Send to gym administrator',
            icon: 'fa-user-shield'
        },
        'new-members': {
            label: 'New Members (Last 30 days)',
            description: 'Members who joined in the last 30 days',
            icon: 'fa-user-plus'
        },
        'custom': {
            label: 'Custom Selection',
            description: 'Manually select recipients',
            icon: 'fa-hand-pointer'
        }
    },

    // Notification channels
    channels: {
        system: {
            label: 'System Notification',
            description: 'In-app notifications',
            icon: 'fa-bell',
            color: '#1976d2'
        },
        email: {
            label: 'Email',
            description: 'Email notifications',
            icon: 'fa-envelope',
            color: '#28a745'
        },
        whatsapp: {
            label: 'WhatsApp',
            description: 'WhatsApp messages',
            icon: 'fab fa-whatsapp',
            color: '#25d366'
        }
    },

    // Validation rules
    validation: {
        title: {
            required: true,
            minLength: 3,
            maxLength: 100,
            pattern: /^[a-zA-Z0-9\s\-\.\!\?]+$/
        },
        message: {
            required: true,
            minLength: 10,
            maxLength: 500
        },
        recipients: {
            required: true,
            minCount: 1,
            maxCount: 1000
        }
    },

    // UI settings
    ui: {
        animation: {
            duration: 300,
            easing: 'ease-out'
        },
        colors: {
            primary: '#1976d2',
            success: '#28a745',
            warning: '#ffc107',
            danger: '#dc3545',
            info: '#17a2b8'
        },
        breakpoints: {
            mobile: 480,
            tablet: 768,
            desktop: 1024
        }
    },

    // Feature flags
    features: {
        scheduledSending: false,
        messageTemplates: true,
        customRecipients: true,
        bulkSending: true,
        deliveryReports: false,
        messageHistory: true,
        attachments: false,
        richTextEditor: false
    },

    // Rate limiting
    rateLimits: {
        system: {
            perMinute: 60,
            perHour: 500,
            perDay: 2000
        },
        email: {
            perMinute: 10,
            perHour: 100,
            perDay: 500
        },
        whatsapp: {
            perMinute: 5,
            perHour: 50,
            perDay: 200
        }
    },

    // Error messages
    errors: {
        'missing-title': 'Please enter a notification title',
        'missing-message': 'Please enter a notification message',
        'no-recipients': 'Please select at least one recipient',
        'no-channels': 'Please select at least one notification channel',
        'title-too-long': 'Title must be less than 100 characters',
        'message-too-long': 'Message must be less than 500 characters',
        'invalid-email': 'Please enter a valid email address',
        'invalid-phone': 'Please enter a valid phone number',
        'network-error': 'Network error. Please check your connection and try again.',
        'server-error': 'Server error. Please try again later.',
        'unauthorized': 'You are not authorized to send notifications',
        'rate-limited': 'You have exceeded the rate limit. Please wait before sending again.'
    }
};

// Make config available globally
window.NotificationConfig = NotificationConfig;

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NotificationConfig;
}
