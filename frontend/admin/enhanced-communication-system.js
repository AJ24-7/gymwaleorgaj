// ============= ENHANCED ADMIN COMMUNICATION SYSTEM =============
// Advanced communication and support management for admin dashboard

class EnhancedCommunicationSystem {
    constructor() {
        this.BASE_URL = "http://localhost:5000";
        this.notifications = new Map(); // For deduplication
        this.activeTickets = new Map();
        this.notificationQueue = [];
        this.isProcessingQueue = false;
        this.lastFetchTime = null;
        this.maxRetries = 3;
        this.isInitialized = false;
        
        // Call async init
        this.init();
    }

    async init() {
        console.log('🔄 Enhanced Communication System Initializing...');
        try {
            this.injectRequiredStyles();
            this.bindEventListeners();
            this.initializeNotificationSystem();
            
            // Load support data asynchronously but don't block initialization
            this.loadSupportData().catch(error => {
                console.warn('⚠️ Support data loading failed, but system will continue:', error);
            });
            
            this.startPeriodicUpdates();
            this.isInitialized = true;
            console.log('✅ Enhanced Communication System Ready - isInitialized:', this.isInitialized);
            
            // Dispatch event to signal initialization complete
            window.dispatchEvent(new CustomEvent('enhancedCommReady', { 
                detail: { system: this } 
            }));
            console.log('📡 Enhanced Communication Ready event dispatched');
        } catch (error) {
            console.error('❌ Error initializing Enhanced Communication System:', error);
            this.isInitialized = false;
        }
    }

    // ========== NOTIFICATION SYSTEM WITH DEDUPLICATION ==========

    initializeNotificationSystem() {
        this.createNotificationToastContainer();
        this.enhanceNotificationDropdown();
        // Note: Notification polling is handled by startPeriodicUpdates() called in init()
    }

    createNotificationToastContainer() {
        if (!document.getElementById('adminToastContainer')) {
            const toastContainer = document.createElement('div');
            toastContainer.id = 'adminToastContainer';
            toastContainer.style.cssText = `
                position: fixed;
                top: 90px;
                right: 20px;
                z-index: 10000;
                max-width: 380px;
                width: 100%;
            `;
            document.body.appendChild(toastContainer);
        }
    }

    enhanceNotificationDropdown() {
        const notificationList = document.getElementById('notificationList');
        if (notificationList) {
            // Add loading state
            notificationList.innerHTML = `
                <div class="notification-loading" id="notificationLoading">
                    <i class="fas fa-spinner fa-spin"></i>
                    <span>Loading notifications...</span>
                </div>
            `;
        }
    }

    // Fetch notifications with deduplication
    async fetchNotifications(page = 1, limit = 20) {
        try {
            const token = localStorage.getItem('adminToken');
            if (!token) return;

            const response = await fetch(`${this.BASE_URL}/api/admin/communication/notifications/admin?page=${page}&limit=${limit}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (data.success) {
                this.updateNotificationDisplay(data.notifications);
                this.updateNotificationCount(data.unreadCount);
                this.lastFetchTime = new Date();
            }

        } catch (error) {
            console.error('Error fetching notifications:', error);
            this.showNotificationError('Failed to load notifications');
        }
    }

    updateNotificationDisplay(notifications) {
        const notificationList = document.getElementById('notificationList');
        const notificationLoading = document.getElementById('notificationLoading');
        
        if (notificationLoading) {
            notificationLoading.remove();
        }

        if (!notificationList) return;

        if (notifications.length === 0) {
            notificationList.innerHTML = `
                <div class="no-notifications">
                    <i class="fas fa-bell-slash"></i>
                    <p>No new notifications</p>
                </div>
            `;
            return;
        }

        // Clear existing notifications
        notificationList.innerHTML = '';

        notifications.forEach(notification => {
            const notificationElement = this.createNotificationElement(notification);
            notificationList.appendChild(notificationElement);
        });

        // Add "Load More" button if needed
        if (notifications.length >= 20) {
            const loadMoreBtn = document.createElement('button');
            loadMoreBtn.className = 'load-more-notifications';
            loadMoreBtn.innerHTML = '<i class="fas fa-plus"></i> Load More';
            loadMoreBtn.onclick = () => this.loadMoreNotifications();
            notificationList.appendChild(loadMoreBtn);
        }
    }

    createNotificationElement(notification) {
        const notificationEl = document.createElement('div');
        notificationEl.className = `notification-item ${notification.read ? 'read' : 'unread'}`;
        notificationEl.dataset.notificationId = notification._id;

        const timeAgo = this.getTimeAgo(new Date(notification.createdAt));
        const groupIndicator = notification.isGrouped ? 
            `<span class="notification-group-count">${notification.count}</span>` : '';

        notificationEl.innerHTML = `
            <div class="notification-content">
                <div class="notification-header">
                    <div class="notification-title">
                        ${this.getNotificationIcon(notification.type)}
                        <span>${notification.title}</span>
                        ${groupIndicator}
                    </div>
                    <div class="notification-time">${timeAgo}</div>
                </div>
                <div class="notification-message">${this.truncateMessage(notification.message, 80)}</div>
                <div class="notification-actions">
                    ${this.getNotificationActions(notification)}
                </div>
            </div>
        `;

        // Add click handler
        notificationEl.onclick = (e) => {
            if (!e.target.closest('.notification-actions')) {
                this.handleNotificationClick(notification);
            }
        };

        return notificationEl;
    }

    getNotificationIcon(type) {
        const iconMap = {
            'gym-registration': '<i class="fas fa-dumbbell" style="color: #f59e0b;"></i>',
            'trainer-approval': '<i class="fas fa-user-check" style="color: #10b981;"></i>',
            'support-ticket': '<i class="fas fa-headset" style="color: #3b82f6;"></i>',
            'grievance': '<i class="fas fa-exclamation-triangle" style="color: #ef4444;"></i>',
            'payment': '<i class="fas fa-credit-card" style="color: #059669;"></i>',
            'system': '<i class="fas fa-cog" style="color: #6b7280;"></i>',
            'escalation': '<i class="fas fa-arrow-up" style="color: #dc2626;"></i>',
            default: '<i class="fas fa-bell" style="color: #6b7280;"></i>'
        };
        return iconMap[type] || iconMap.default;
    }

    getNotificationActions(notification) {
        let actions = `
            <button class="notification-action-btn mark-read" onclick="event.stopPropagation(); window.enhancedComm.markNotificationRead('${notification._id}')">
                <i class="fas fa-check"></i>
            </button>
        `;

        // Add specific actions based on notification type
        switch (notification.type) {
            case 'gym-registration':
                actions += `
                    <button class="notification-action-btn view-gym" onclick="event.stopPropagation(); window.enhancedComm.viewGymDetails('${notification.metadata?.gymId}')">
                        <i class="fas fa-eye"></i> View
                    </button>
                `;
                break;
            case 'support-ticket':
            case 'grievance':
                actions += `
                    <button class="notification-action-btn view-ticket" onclick="event.stopPropagation(); window.enhancedComm.viewTicketDetails('${notification.metadata?.ticketId}')">
                        <i class="fas fa-ticket-alt"></i> View
                    </button>
                `;
                break;
            case 'escalation':
                actions += `
                    <button class="notification-action-btn handle-escalation" onclick="event.stopPropagation(); window.enhancedComm.handleEscalation('${notification.metadata?.ticketId}')">
                        <i class="fas fa-fire"></i> Handle
                    </button>
                `;
                break;
        }

        return actions;
    }

    // ========== SUPPORT TICKET MANAGEMENT ==========

    async loadSupportData() {
        try {
            await Promise.all([
                this.loadSupportStats(),
                this.loadSupportTickets(),
                this.loadGrievances(),
                this.loadUserCommunications()
            ]);
        } catch (error) {
            console.error('Error loading support data:', error);
        }
    }

    // ========== USER COMMUNICATION INTEGRATION ==========

    async loadUserCommunications(filters = {}) {
        // If filters are provided, use the filtered loading method
        if (Object.keys(filters).length > 0) {
            return this.loadContactMessagesWithFilters(filters);
        }
        
        try {
            const token = localStorage.getItem('adminToken');
            const response = await fetch(`${this.BASE_URL}/api/admin/communication/contact/messages`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.updateUserCommunicationsDisplay(data.messages);
                }
            }
        } catch (error) {
            console.error('Error loading user communications:', error);
        }
    }

    updateUserCommunicationsDisplay(messages) {
        const communicationsList = document.getElementById('contactMessagesList');
        if (!communicationsList) return;

        if (messages.length === 0) {
            communicationsList.innerHTML = `
                <div class="no-communications">
                    <i class="fas fa-comments"></i>
                    <p>No user communications found</p>
                </div>
            `;
            return;
        }

        communicationsList.innerHTML = '';
        messages.forEach(message => {
            const messageElement = this.createUserCommunicationElement(message);
            communicationsList.appendChild(messageElement);
        });
    }

    createUserCommunicationElement(message) {
        const messageEl = document.createElement('div');
        messageEl.className = `user-communication-card ${message.priority}`;
        messageEl.dataset.messageId = message._id;

        const timeAgo = this.getTimeAgo(new Date(message.createdAt));
        const statusClass = message.status?.replace('-', '') || 'new';

        messageEl.innerHTML = `
            <div class="communication-header">
                <div class="communication-info">
                    <h4 class="communication-subject">${message.subject}</h4>
                    <div class="communication-meta">
                        <span class="communication-from">${message.name} (${message.email})</span>
                        <span class="communication-category">${this.getCategoryDisplayName(message.category)}</span>
                        ${message.phone ? `<span class="communication-phone"><i class="fas fa-phone"></i> ${message.phone}</span>` : ''}
                    </div>
                </div>
                <div class="communication-status">
                    <span class="status-badge ${statusClass}">${message.status || 'New'}</span>
                    <span class="priority-badge ${message.priority || 'medium'}">${message.priority || 'Medium'}</span>
                </div>
            </div>
            <div class="communication-content">
                <div class="communication-message">${this.truncateMessage(message.message, 150)}</div>
                ${message.quickMessage ? `
                    <div class="quick-message-info">
                        <i class="fas fa-flash"></i> Quick Message: ${message.quickMessage}
                    </div>
                ` : ''}
                ${message.interestedActivities && message.interestedActivities.length > 0 ? `
                    <div class="interested-activities">
                        <i class="fas fa-star"></i> Interested in: ${message.interestedActivities.join(', ')}
                    </div>
                ` : ''}
            </div>
            <div class="communication-footer">
                <div class="communication-time">
                    <i class="fas fa-clock"></i> ${timeAgo}
                </div>
                <div class="communication-actions">
                    <button class="btn btn-sm btn-primary" onclick="window.enhancedComm.viewUserCommunication('${message._id}')">
                        <i class="fas fa-eye"></i> View
                    </button>
                    <button class="btn btn-sm btn-success" onclick="window.enhancedComm.replyToUserCommunication('${message._id}')">
                        <i class="fas fa-reply"></i> Reply
                    </button>
                    <button class="btn btn-sm btn-info" onclick="window.enhancedComm.convertToTicket('${message._id}')">
                        <i class="fas fa-ticket-alt"></i> Convert to Ticket
                    </button>
                </div>
            </div>
        `;

        return messageEl;
    }

    getCategoryDisplayName(category) {
        const categoryMap = {
            'general': 'General Inquiry',
            'membership': 'Membership',
            'service': 'Service Support', 
            'technical': 'Technical Support',
            'partnership': 'Partnership',
            'complaint': 'Complaint/Feedback'
        };
        return categoryMap[category] || category;
    }

    async viewUserCommunication(messageId) {
        try {
            const token = localStorage.getItem('adminToken');
            const response = await fetch(`${this.BASE_URL}/api/admin/communication/contact/messages/${messageId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.showUserCommunicationModal(data.message);
                }
            }
        } catch (error) {
            console.error('Error loading user communication:', error);
            this.showErrorToast('Failed to load communication details');
        }
    }

    showUserCommunicationModal(message) {
        const existingModal = document.getElementById('userCommunicationModal');
        if (existingModal) existingModal.remove();

        const modal = document.createElement('div');
        modal.id = 'userCommunicationModal';
        modal.className = 'enhanced-modal';
        modal.innerHTML = `
            <div class="enhanced-modal-overlay"></div>
            <div class="enhanced-modal-content large">
                <div class="enhanced-modal-header">
                    <h3><i class="fas fa-envelope"></i> User Communication Details</h3>
                    <button class="enhanced-modal-close" onclick="this.closest('.enhanced-modal').remove()">&times;</button>
                </div>
                <div class="enhanced-modal-body">
                    <div class="communication-details">
                        <div class="detail-section">
                            <h4>Contact Information</h4>
                            <div class="detail-grid">
                                <div class="detail-item">
                                    <label>Name:</label>
                                    <span>${message.name}</span>
                                </div>
                                <div class="detail-item">
                                    <label>Email:</label>
                                    <span>${message.email}</span>
                                </div>
                                ${message.phone ? `
                                    <div class="detail-item">
                                        <label>Phone:</label>
                                        <span>${message.phone}</span>
                                    </div>
                                ` : ''}
                                <div class="detail-item">
                                    <label>Category:</label>
                                    <span class="category-badge">${this.getCategoryDisplayName(message.category)}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="detail-section">
                            <h4>Message Details</h4>
                            <div class="detail-item full-width">
                                <label>Subject:</label>
                                <span class="subject-text">${message.subject}</span>
                            </div>
                            <div class="detail-item full-width">
                                <label>Message:</label>
                                <div class="message-content">${message.message.replace(/\n/g, '<br>')}</div>
                            </div>
                            ${message.quickMessage ? `
                                <div class="detail-item full-width">
                                    <label>Quick Message Template:</label>
                                    <span class="quick-message-tag">${message.quickMessage}</span>
                                </div>
                            ` : ''}
                            ${message.interestedActivities && message.interestedActivities.length > 0 ? `
                                <div class="detail-item full-width">
                                    <label>Interested Activities:</label>
                                    <div class="activity-tags">
                                        ${message.interestedActivities.map(activity => 
                                            `<span class="activity-tag">${activity}</span>`
                                        ).join('')}
                                    </div>
                                </div>
                            ` : ''}
                        </div>

                        <div class="detail-section">
                            <h4>Metadata</h4>
                            <div class="detail-grid">
                                <div class="detail-item">
                                    <label>Received:</label>
                                    <span>${new Date(message.createdAt).toLocaleString()}</span>
                                </div>
                                <div class="detail-item">
                                    <label>Status:</label>
                                    <span class="status-badge ${message.status || 'new'}">${message.status || 'New'}</span>
                                </div>
                                <div class="detail-item">
                                    <label>Priority:</label>
                                    <span class="priority-badge ${message.priority || 'medium'}">${message.priority || 'Medium'}</span>
                                </div>
                                ${message.ticketId ? `
                                    <div class="detail-item">
                                        <label>Ticket ID:</label>
                                        <span class="ticket-link" onclick="window.enhancedComm.viewTicketDetails('${message.ticketId}')">#${message.ticketId}</span>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                    
                    <div class="communication-actions">
                        <button class="btn btn-success" onclick="window.enhancedComm.replyToUserCommunication('${message._id}')">
                            <i class="fas fa-reply"></i> Send Reply
                        </button>
                        ${!message.ticketId ? `
                            <button class="btn btn-info" onclick="window.enhancedComm.convertToTicket('${message._id}')">
                                <i class="fas fa-ticket-alt"></i> Convert to Support Ticket
                            </button>
                        ` : ''}
                        <button class="btn btn-warning" onclick="window.enhancedComm.updateCommunicationStatus('${message._id}', 'resolved')">
                            <i class="fas fa-check"></i> Mark as Resolved
                        </button>
                        <button class="btn btn-secondary" onclick="this.closest('.enhanced-modal').remove()">
                            <i class="fas fa-times"></i> Close
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        setTimeout(() => modal.classList.add('show'), 10);
    }

    async replyToUserCommunication(messageId) {
        const existingModal = document.getElementById('replyToUserModal');
        if (existingModal) existingModal.remove();

        const modal = document.createElement('div');
        modal.id = 'replyToUserModal';
        modal.className = 'enhanced-modal';
        modal.innerHTML = `
            <div class="enhanced-modal-overlay"></div>
            <div class="enhanced-modal-content">
                <div class="enhanced-modal-header">
                    <h3><i class="fas fa-reply"></i> Reply to User Communication</h3>
                    <button class="enhanced-modal-close" onclick="this.closest('.enhanced-modal').remove()">&times;</button>
                </div>
                <div class="enhanced-modal-body">
                    <div class="reply-form">
                        <div class="form-group">
                            <label>Reply Message:</label>
                            <textarea id="userReplyMessage" placeholder="Type your reply message..." rows="6"></textarea>
                        </div>
                        
                        <div class="form-group">
                            <label>Communication Channels:</label>
                            <div class="channel-checkboxes">
                                <label><input type="checkbox" value="email" checked> Email</label>
                                <label><input type="checkbox" value="notification" checked> In-App Notification</label>
                                <label><input type="checkbox" value="sms"> SMS (if phone available)</label>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label>Update Status:</label>
                            <select id="communicationStatus">
                                <option value="">Keep Current Status</option>
                                <option value="replied">Replied</option>
                                <option value="in-progress">In Progress</option>
                                <option value="resolved">Resolved</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label>
                                <input type="checkbox" id="createTicketAfterReply"> 
                                Convert to Support Ticket after reply
                            </label>
                        </div>
                    </div>
                    
                    <div class="reply-actions">
                        <button class="btn btn-secondary" onclick="this.closest('.enhanced-modal').remove()">Cancel</button>
                        <button class="btn btn-primary" onclick="window.enhancedComm.submitUserReply('${messageId}')">
                            <i class="fas fa-paper-plane"></i> Send Reply
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        setTimeout(() => modal.classList.add('show'), 10);
    }

    async submitUserReply(messageId) {
        const replyMessage = document.getElementById('userReplyMessage')?.value;
        const status = document.getElementById('communicationStatus')?.value;
        const createTicket = document.getElementById('createTicketAfterReply')?.checked;
        const channels = Array.from(document.querySelectorAll('#replyToUserModal .channel-checkboxes input:checked'))
            .map(cb => cb.value);

        if (!replyMessage.trim()) {
            this.showErrorToast('Please enter a reply message');
            return;
        }

        try {
            const token = localStorage.getItem('adminToken');
            const response = await fetch(`${this.BASE_URL}/api/admin/communication/contact/messages/${messageId}/reply`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: replyMessage,
                    status: status || null,
                    channels: channels,
                    createTicket: createTicket
                })
            });

            if (response.ok) {
                const data = await response.json();
                document.getElementById('replyToUserModal')?.remove();
                this.showSuccessToast('Reply sent successfully');
                this.loadUserCommunications(); // Refresh the list
                
                if (data.ticketId) {
                    this.showSuccessToast(`Support ticket #${data.ticketId} created`);
                }
            } else {
                throw new Error('Failed to send reply');
            }
        } catch (error) {
            console.error('Error sending reply:', error);
            this.showErrorToast('Failed to send reply');
        }
    }

    async convertToTicket(messageId) {
        try {
            const token = localStorage.getItem('adminToken');
            const response = await fetch(`${this.BASE_URL}/api/admin/communication/contact/messages/${messageId}/convert-ticket`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.showSuccessToast(`Successfully converted to support ticket #${data.ticketId}`);
                this.loadUserCommunications(); // Refresh communications
                this.loadSupportTickets(); // Refresh support tickets
                
                // Close any open modal
                document.querySelector('.enhanced-modal')?.remove();
            } else {
                throw new Error('Failed to convert to ticket');
            }
        } catch (error) {
            console.error('Error converting to ticket:', error);
            this.showErrorToast('Failed to convert to support ticket');
        }
    }

    async updateCommunicationStatus(messageId, status) {
        try {
            const token = localStorage.getItem('adminToken');
            const response = await fetch(`${this.BASE_URL}/api/admin/communication/contact/messages/${messageId}/status`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status })
            });

            if (response.ok) {
                this.showSuccessToast(`Status updated to ${status}`);
                this.loadUserCommunications(); // Refresh the list
                
                // Close any open modal
                document.querySelector('.enhanced-modal')?.remove();
            } else {
                throw new Error('Failed to update status');
            }
        } catch (error) {
            console.error('Error updating status:', error);
            this.showErrorToast('Failed to update status');
        }
    }

    async loadSupportStats() {
        try {
            const token = localStorage.getItem('adminToken');
            const response = await fetch(`${this.BASE_URL}/api/admin/support/stats`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.updateSupportStatsDisplay(data.stats);
                }
            }
        } catch (error) {
            console.error('Error loading support stats:', error);
        }
    }

    async loadSupportTickets(filters = {}) {
        try {
            const token = localStorage.getItem('adminToken');
            const params = new URLSearchParams(filters);
            
            const response = await fetch(`${this.BASE_URL}/api/admin/support/tickets?${params}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.updateSupportTicketsDisplay(data.tickets);
                }
            }
        } catch (error) {
            console.error('Error loading support tickets:', error);
        }
    }

    async loadGrievances(filters = {}) {
        try {
            const token = localStorage.getItem('adminToken');
            const params = new URLSearchParams(filters);
            
            const response = await fetch(`${this.BASE_URL}/api/admin/grievances?${params}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.updateGrievancesDisplay(data.grievances);
                }
            }
        } catch (error) {
            console.error('Error loading grievances:', error);
        }
    }

    // ========== QUICK REPLY SYSTEM ==========

    async sendQuickReply(ticketId, message, status = null, channels = ['notification']) {
        try {
            const token = localStorage.getItem('adminToken');
            const response = await fetch(`${this.BASE_URL}/api/admin/support/tickets/${ticketId}/reply`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message,
                    status,
                    sendVia: channels
                })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.showSuccessToast('Quick reply sent successfully');
                    this.loadSupportTickets(); // Refresh tickets
                    return data;
                }
            }

            throw new Error('Failed to send quick reply');
        } catch (error) {
            console.error('Error sending quick reply:', error);
            this.showErrorToast('Failed to send quick reply');
            throw error;
        }
    }

    // ========== GRIEVANCE ESCALATION ==========

    async escalateGrievance(ticketId, reason, escalateTo = null) {
        try {
            const token = localStorage.getItem('adminToken');
            const response = await fetch(`${this.BASE_URL}/api/admin/grievances/${ticketId}/escalate`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    reason,
                    escalateTo
                })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.showSuccessToast('Grievance escalated successfully');
                    this.loadGrievances(); // Refresh grievances
                    return data;
                }
            }

            throw new Error('Failed to escalate grievance');
        } catch (error) {
            console.error('Error escalating grievance:', error);
            this.showErrorToast('Failed to escalate grievance');
            throw error;
        }
    }

    // ========== BULK COMMUNICATION ==========

    async sendBulkNotification(recipients, title, message, priority = 'medium', channels = ['notification']) {
        try {
            const token = localStorage.getItem('adminToken');
            const response = await fetch(`${this.BASE_URL}/api/admin/communication/bulk-notification`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    recipients,
                    title,
                    message,
                    priority,
                    sendVia: channels
                })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.showSuccessToast(`Notification sent to ${data.recipientCount} recipients`);
                    return data;
                }
            }

            throw new Error('Failed to send bulk notification');
        } catch (error) {
            console.error('Error sending bulk notification:', error);
            this.showErrorToast('Failed to send notification');
            throw error;
        }
    }

    // ========== UI UPDATE METHODS ==========

    updateSupportStatsDisplay(stats) {
        // Update support stats on dashboard
        const elements = {
            openTicketsCount: document.getElementById('openTicketsCount'),
            resolvedTodayCount: document.getElementById('resolvedTodayCount'),
            avgResponseTime: document.getElementById('avgResponseTime'),
            userTicketsCount: document.getElementById('userTicketsCount'),
            gymAdminTicketsCount: document.getElementById('gymAdminTicketsCount'),
            trainerTicketsCount: document.getElementById('trainerTicketsCount')
        };

        if (elements.openTicketsCount) {
            elements.openTicketsCount.textContent = stats.open + stats.inProgress;
        }
        if (elements.resolvedTodayCount) {
            elements.resolvedTodayCount.textContent = stats.resolved || 0;
        }
        if (elements.avgResponseTime) {
            elements.avgResponseTime.textContent = stats.avgResponseTime || '--';
        }
        if (elements.userTicketsCount) {
            elements.userTicketsCount.textContent = `(${stats.userTypes.users || 0})`;
        }
        if (elements.gymAdminTicketsCount) {
            elements.gymAdminTicketsCount.textContent = `(${stats.userTypes.gyms || 0})`;
        }
        if (elements.trainerTicketsCount) {
            elements.trainerTicketsCount.textContent = `(${stats.userTypes.trainers || 0})`;
        }
    }

    updateSupportTicketsDisplay(tickets) {
        // Update support tickets lists
        const activeTab = document.querySelector('.support-tab.active')?.dataset.tab || 'users';
        const ticketsList = document.getElementById(`${activeTab}TicketsList`);
        
        if (!ticketsList) return;

        if (tickets.length === 0) {
            ticketsList.innerHTML = `
                <div class="no-tickets">
                    <i class="fas fa-inbox"></i>
                    <p>No support tickets found</p>
                </div>
            `;
            return;
        }

        ticketsList.innerHTML = '';
        tickets.forEach(ticket => {
            const ticketElement = this.createTicketElement(ticket);
            ticketsList.appendChild(ticketElement);
        });
    }

    createTicketElement(ticket) {
        const ticketEl = document.createElement('div');
        ticketEl.className = `support-ticket-card ${ticket.priority}`;
        ticketEl.dataset.ticketId = ticket.ticketId;

        const timeAgo = this.getTimeAgo(new Date(ticket.createdAt));
        const statusClass = ticket.status.replace('-', '');

        ticketEl.innerHTML = `
            <div class="ticket-header">
                <div class="ticket-info">
                    <h4 class="ticket-title">${ticket.subject}</h4>
                    <div class="ticket-meta">
                        <span class="ticket-id">#${ticket.ticketId}</span>
                        <span class="ticket-category">${ticket.category}</span>
                        <span class="ticket-user">${ticket.userName}</span>
                    </div>
                </div>
                <div class="ticket-status">
                    <span class="status-badge ${statusClass}">${ticket.status}</span>
                    <span class="priority-badge ${ticket.priority}">${ticket.priority}</span>
                </div>
            </div>
            <div class="ticket-description">
                ${this.truncateMessage(ticket.description, 120)}
            </div>
            <div class="ticket-footer">
                <div class="ticket-time">
                    <i class="fas fa-clock"></i> ${timeAgo}
                </div>
                <div class="ticket-actions">
                    <button class="btn btn-sm btn-primary" onclick="window.enhancedComm.viewTicketDetails('${ticket.ticketId}')">
                        <i class="fas fa-eye"></i> View
                    </button>
                    <button class="btn btn-sm btn-success" onclick="window.enhancedComm.showQuickReplyModal('${ticket.ticketId}')">
                        <i class="fas fa-reply"></i> Reply
                    </button>
                    ${ticket.category === 'complaint' ? `
                        <button class="btn btn-sm btn-warning" onclick="window.enhancedComm.showEscalationModal('${ticket.ticketId}')">
                            <i class="fas fa-arrow-up"></i> Escalate
                        </button>
                    ` : ''}
                </div>
            </div>
        `;

        return ticketEl;
    }

    // ========== MODAL HANDLERS ==========

    showQuickReplyModal(ticketId) {
        const existingModal = document.getElementById('enhancedQuickReplyModal');
        if (existingModal) existingModal.remove();

        const modal = document.createElement('div');
        modal.id = 'enhancedQuickReplyModal';
        modal.className = 'enhanced-modal';
        modal.innerHTML = `
            <div class="enhanced-modal-overlay"></div>
            <div class="enhanced-modal-content">
                <div class="enhanced-modal-header">
                    <h3><i class="fas fa-reply"></i> Quick Reply - Ticket #${ticketId}</h3>
                    <button class="enhanced-modal-close">&times;</button>
                </div>
                <div class="enhanced-modal-body">
                    <div class="reply-templates">
                        <h4>Quick Templates:</h4>
                        <div class="template-buttons">
                            <button class="template-btn" data-template="acknowledge">Acknowledge</button>
                            <button class="template-btn" data-template="investigating">Investigating</button>
                            <button class="template-btn" data-template="resolved">Resolved</button>
                            <button class="template-btn" data-template="more-info">Need Info</button>
                        </div>
                    </div>
                    <div class="reply-form">
                        <textarea id="quickReplyText" placeholder="Type your reply..." rows="4"></textarea>
                        <div class="reply-options">
                            <div class="status-update">
                                <label>Update Status:</label>
                                <select id="replyStatus">
                                    <option value="">Keep Current</option>
                                    <option value="in-progress">In Progress</option>
                                    <option value="resolved">Resolved</option>
                                    <option value="closed">Closed</option>
                                </select>
                            </div>
                            <div class="send-channels">
                                <label>Send via:</label>
                                <div class="channel-checkboxes">
                                    <label><input type="checkbox" value="notification" checked> Notification</label>
                                    <label><input type="checkbox" value="email"> Email</label>
                                    <label><input type="checkbox" value="whatsapp"> WhatsApp</label>
                                </div>
                            </div>
                        </div>
                        <div class="reply-actions">
                            <button class="btn btn-secondary" onclick="document.getElementById('enhancedQuickReplyModal').remove()">Cancel</button>
                            <button class="btn btn-primary" onclick="window.enhancedComm.submitQuickReply('${ticketId}')">Send Reply</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Add template handlers
        modal.querySelectorAll('.template-btn').forEach(btn => {
            btn.onclick = () => this.useReplyTemplate(btn.dataset.template);
        });

        // Show modal
        setTimeout(() => modal.classList.add('show'), 10);
    }

    useReplyTemplate(templateType) {
        const templates = {
            acknowledge: "Thank you for contacting us. We have received your request and will review it shortly.",
            investigating: "We are currently investigating your issue and will provide an update within 24 hours.",
            resolved: "Your issue has been resolved. Please let us know if you need any further assistance.",
            'more-info': "We need additional information to assist you better. Please provide more details about your concern."
        };

        const textarea = document.getElementById('quickReplyText');
        if (textarea && templates[templateType]) {
            textarea.value = templates[templateType];
        }
    }

    async submitQuickReply(ticketId) {
        const message = document.getElementById('quickReplyText')?.value;
        const status = document.getElementById('replyStatus')?.value;
        const channels = Array.from(document.querySelectorAll('.channel-checkboxes input:checked'))
            .map(cb => cb.value);

        if (!message.trim()) {
            this.showErrorToast('Please enter a reply message');
            return;
        }

        try {
            await this.sendQuickReply(ticketId, message, status || null, channels);
            document.getElementById('enhancedQuickReplyModal')?.remove();
            this.showSuccessToast('Reply sent successfully');
        } catch (error) {
            this.showErrorToast('Failed to send reply');
        }
    }

    // ========== UTILITY METHODS ==========

    getTimeAgo(date) {
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (days > 0) return `${days}d ago`;
        if (hours > 0) return `${hours}h ago`;
        if (minutes > 0) return `${minutes}m ago`;
        return 'Just now';
    }

    truncateMessage(message, maxLength) {
        if (message.length <= maxLength) return message;
        return message.substring(0, maxLength) + '...';
    }

    updateNotificationCount(count) {
        const countElement = document.getElementById('notificationCount');
        if (countElement) {
            countElement.textContent = count;
            countElement.style.display = count > 0 ? 'block' : 'none';
        }
    }

    showSuccessToast(message) {
        this.showToast(message, 'success');
    }

    showErrorToast(message) {
        this.showToast(message, 'error');
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('adminToastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `admin-toast ${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
                <span>${message}</span>
            </div>
            <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
        `;

        container.appendChild(toast);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 5000);
    }

    // ========== DYNAMIC CSS INJECTION ==========

    injectRequiredStyles() {
        if (document.getElementById('enhancedCommStyles')) return;

        const style = document.createElement('style');
        style.id = 'enhancedCommStyles';
        style.textContent = `
            /* User Communication Cards */
            .user-communication-card {
                background: #fff;
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                padding: 16px;
                margin-bottom: 12px;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                transition: all 0.3s ease;
            }

            .user-communication-card:hover {
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                transform: translateY(-1px);
            }

            .user-communication-card.urgent {
                border-left: 4px solid #ef4444;
            }

            .user-communication-card.high {
                border-left: 4px solid #f59e0b;
            }

            .communication-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 12px;
            }

            .communication-subject {
                font-size: 16px;
                font-weight: 600;
                color: #111827;
                margin: 0 0 4px 0;
            }

            .communication-meta {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                font-size: 13px;
                color: #6b7280;
            }

            .communication-meta span {
                background: #f3f4f6;
                padding: 2px 6px;
                border-radius: 4px;
            }

            .communication-status {
                display: flex;
                flex-direction: column;
                align-items: flex-end;
                gap: 4px;
            }

            .communication-content {
                margin-bottom: 12px;
            }

            .communication-message {
                color: #374151;
                line-height: 1.5;
                margin-bottom: 8px;
            }

            .quick-message-info {
                background: #dbeafe;
                color: #1d4ed8;
                padding: 6px 10px;
                border-radius: 4px;
                font-size: 12px;
                display: inline-block;
                margin-bottom: 4px;
            }

            .interested-activities {
                background: #f0fdf4;
                color: #166534;
                padding: 6px 10px;
                border-radius: 4px;
                font-size: 12px;
                display: inline-block;
            }

            .communication-footer {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding-top: 12px;
                border-top: 1px solid #f3f4f6;
            }

            .communication-time {
                color: #6b7280;
                font-size: 12px;
            }

            .communication-actions {
                display: flex;
                gap: 8px;
            }

            /* Enhanced Modal Styles */
            .enhanced-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 10000;
                opacity: 0;
                visibility: hidden;
                transition: all 0.3s ease;
            }

            .enhanced-modal.show {
                opacity: 1;
                visibility: visible;
            }

            .enhanced-modal-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                backdrop-filter: blur(4px);
            }

            .enhanced-modal-content {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: #fff;
                border-radius: 12px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                max-width: 600px;
                width: 90%;
                max-height: 80vh;
                overflow-y: auto;
            }

            .enhanced-modal-content.large {
                max-width: 800px;
            }

            .enhanced-modal-header {
                padding: 20px 24px;
                border-bottom: 1px solid #e5e7eb;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .enhanced-modal-header h3 {
                margin: 0;
                color: #111827;
                font-size: 18px;
            }

            .enhanced-modal-close {
                background: none;
                border: none;
                font-size: 24px;
                color: #6b7280;
                cursor: pointer;
                padding: 0;
                width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                transition: all 0.2s ease;
            }

            .enhanced-modal-close:hover {
                background: #f3f4f6;
                color: #374151;
            }

            .enhanced-modal-body {
                padding: 24px;
            }

            /* Communication Detail Styles */
            .communication-details {
                margin-bottom: 24px;
            }

            .detail-section {
                margin-bottom: 24px;
            }

            .detail-section h4 {
                color: #111827;
                font-size: 16px;
                margin: 0 0 12px 0;
                padding-bottom: 8px;
                border-bottom: 1px solid #e5e7eb;
            }

            .detail-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 12px;
            }

            .detail-item {
                display: flex;
                flex-direction: column;
            }

            .detail-item.full-width {
                grid-column: 1 / -1;
            }

            .detail-item label {
                font-weight: 600;
                color: #374151;
                font-size: 13px;
                margin-bottom: 4px;
            }

            .detail-item span {
                color: #111827;
            }

            .subject-text {
                font-size: 16px;
                font-weight: 500;
            }

            .message-content {
                background: #f9fafb;
                padding: 12px;
                border-radius: 6px;
                border: 1px solid #e5e7eb;
                line-height: 1.6;
            }

            .category-badge, .status-badge, .priority-badge {
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 12px;
                font-weight: 500;
            }

            .category-badge {
                background: #dbeafe;
                color: #1d4ed8;
            }

            .status-badge.new {
                background: #fef3c7;
                color: #92400e;
            }

            .status-badge.replied {
                background: #d1fae5;
                color: #065f46;
            }

            .status-badge.resolved {
                background: #dcfce7;
                color: #166534;
            }

            .priority-badge.high {
                background: #fed7aa;
                color: #c2410c;
            }

            .priority-badge.urgent {
                background: #fecaca;
                color: #dc2626;
            }

            .priority-badge.medium {
                background: #e0e7ff;
                color: #3730a3;
            }

            .quick-message-tag {
                background: #ede9fe;
                color: #5b21b6;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 12px;
                font-weight: 500;
            }

            .activity-tags {
                display: flex;
                flex-wrap: wrap;
                gap: 6px;
            }

            .activity-tag {
                background: #f0fdf4;
                color: #166534;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 12px;
            }

            .ticket-link {
                color: #2563eb;
                cursor: pointer;
                text-decoration: underline;
            }

            .ticket-link:hover {
                color: #1d4ed8;
            }

            /* Form Styles */
            .form-group {
                margin-bottom: 16px;
            }

            .form-group label {
                display: block;
                font-weight: 600;
                color: #374151;
                margin-bottom: 6px;
            }

            .form-group textarea, .form-group select {
                width: 100%;
                padding: 10px 12px;
                border: 1px solid #d1d5db;
                border-radius: 6px;
                font-size: 14px;
                transition: border-color 0.2s ease;
            }

            .form-group textarea:focus, .form-group select:focus {
                outline: none;
                border-color: #2563eb;
                box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
            }

            .channel-checkboxes {
                display: flex;
                gap: 16px;
                flex-wrap: wrap;
            }

            .channel-checkboxes label {
                display: flex;
                align-items: center;
                gap: 6px;
                font-weight: normal;
                cursor: pointer;
            }

            /* Action Buttons */
            .communication-actions, .reply-actions {
                display: flex;
                gap: 12px;
                justify-content: flex-end;
                padding-top: 16px;
                border-top: 1px solid #e5e7eb;
            }

            /* Urgent Communication Alert */
            .urgent-communication-alert {
                position: fixed;
                top: 100px;
                right: 20px;
                z-index: 9999;
                background: linear-gradient(135deg, #ef4444, #dc2626);
                color: white;
                border-radius: 8px;
                box-shadow: 0 10px 30px rgba(239, 68, 68, 0.3);
                animation: slideInRight 0.3s ease;
            }

            .urgent-communication-alert .alert-content {
                padding: 16px 20px;
                display: flex;
                align-items: center;
                gap: 12px;
            }

            .urgent-communication-alert button {
                background: rgba(255, 255, 255, 0.2);
                color: white;
                border: 1px solid rgba(255, 255, 255, 0.3);
                padding: 6px 12px;
                border-radius: 4px;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .urgent-communication-alert button:hover {
                background: rgba(255, 255, 255, 0.3);
            }

            .urgent-communication-alert .close-btn {
                background: none;
                border: none;
                font-size: 18px;
                padding: 4px 8px;
            }

            @keyframes slideInRight {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }

            /* No Communications State */
            .no-communications {
                text-align: center;
                padding: 40px 20px;
                color: #6b7280;
            }

            .no-communications i {
                font-size: 48px;
                margin-bottom: 16px;
                opacity: 0.5;
            }

            .no-communications p {
                margin: 0;
                font-size: 16px;
            }

            /* Toast Styles */
            .admin-toast {
                background: white;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
                margin-bottom: 12px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 12px 16px;
                animation: slideInRight 0.3s ease;
            }

            .admin-toast.success {
                border-left: 4px solid #10b981;
            }

            .admin-toast.error {
                border-left: 4px solid #ef4444;
            }

            .admin-toast.info {
                border-left: 4px solid #3b82f6;
            }

            .toast-content {
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .toast-close {
                background: none;
                border: none;
                font-size: 18px;
                color: #6b7280;
                cursor: pointer;
                padding: 0;
                width: 24px;
                height: 24px;
            }
        `;

        document.head.appendChild(style);
    }

    // ========== EVENT LISTENERS ==========

    bindEventListeners() {
        // Main tab switching - Users tab removed, now integrated into Support tab

        // Support tab switching
        document.querySelectorAll('.support-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const userType = e.currentTarget.dataset.tab;
                this.switchSupportTab(userType);
            });
        });

        // Communication tab switching
        document.querySelectorAll('.communication-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const commType = e.currentTarget.dataset.tab;
                this.switchCommunicationTab(commType);
            });
        });

        // Notification dropdown toggle
        const notificationBell = document.getElementById('notificationBell');
        if (notificationBell) {
            notificationBell.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleNotificationDropdown();
            });
        }

        // Mark all notifications as read
        const markAllReadBtn = document.querySelector('[onclick*="markAllAsRead"]');
        if (markAllReadBtn) {
            markAllReadBtn.onclick = () => this.markAllNotificationsAsRead();
        }

        // Communication filters
        document.querySelectorAll('.communication-filter').forEach(filter => {
            filter.addEventListener('change', (e) => {
                this.filterCommunications(e.target.name, e.target.value);
            });
        });

        // Real-time updates for user communications
        this.setupUserCommunicationPolling();
    }

    switchCommunicationTab(commType) {
        // Update active tab
        document.querySelectorAll('.communication-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-tab="${commType}"]`)?.classList.add('active');

        // Update active content
        document.querySelectorAll('.communication-tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${commType}-communications`)?.classList.add('active');

        // Load data for this communication type
        if (commType === 'contact') {
            this.loadUserCommunications();
        } else if (commType === 'support') {
            this.loadSupportTickets();
        }
    }

    filterCommunications(filterType, filterValue) {
        // Apply filters to communications based on type and value
        this.currentFilters = this.currentFilters || {};
        this.currentFilters[filterType] = filterValue;
        
        // Reload communications with filters
        this.loadUserCommunications(this.currentFilters);
    }

    filterContactMessages(filterType, filterValue) {
        // Apply filters to contact messages in Users tab
        this.contactFilters = this.contactFilters || {};
        this.contactFilters[filterType] = filterValue;
        
        // Reload contact messages with filters
        this.loadContactMessagesWithFilters(this.contactFilters);
    }

    async loadContactMessagesWithFilters(filters = {}) {
        try {
            const token = localStorage.getItem('adminToken');
            const queryParams = new URLSearchParams();
            
            Object.entries(filters).forEach(([key, value]) => {
                if (value && value.trim()) {
                    queryParams.append(key, value);
                }
            });
            
            const response = await fetch(`${this.BASE_URL}/api/admin/communication/contact/messages?${queryParams}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.updateUserCommunicationsDisplay(data.messages);
                }
            }
        } catch (error) {
            console.error('Error loading filtered contact messages:', error);
        }
    }

    setupUserCommunicationPolling() {
        // Poll for new user communications every 15 seconds
        setInterval(() => {
            this.loadUserCommunications();
        }, 15000);
    }

    switchSupportTab(userType) {
        // Update active tab
        document.querySelectorAll('.support-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-tab="${userType}"]`)?.classList.add('active');

        // Update active content
        document.querySelectorAll('.support-tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${userType}-support`)?.classList.add('active');

        // Load tickets for this user type
        this.loadSupportTickets({ userType });
    }

    toggleNotificationDropdown() {
        const dropdown = document.getElementById('notificationDropdown');
        if (dropdown) {
            const isVisible = dropdown.style.display === 'block';
            dropdown.style.display = isVisible ? 'none' : 'block';
            
            if (!isVisible) {
                this.fetchNotifications();
            }
        }
    }

    async markAllNotificationsAsRead() {
        try {
            const token = localStorage.getItem('adminToken');
            const response = await fetch(`${this.BASE_URL}/api/admin/communication/notifications/mark-all-read`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.updateNotificationCount(0);
                    this.fetchNotifications(); // Refresh list
                    this.showSuccessToast('All notifications marked as read');
                }
            }
        } catch (error) {
            console.error('Error marking notifications as read:', error);
            this.showErrorToast('Failed to mark notifications as read');
        }
    }

    // ========== PERIODIC UPDATES ==========

    startPeriodicUpdates() {
        // Update notifications every 30 seconds
        setInterval(() => {
            this.fetchNotifications();
        }, 30000);

        // Update support stats every 2 minutes
        setInterval(() => {
            this.loadSupportStats();
        }, 120000);

        // Update user communications every minute
        setInterval(() => {
            if (this.isUsersTabActive()) {
                this.loadUserCommunications();
            }
        }, 60000);

        // Check for urgent communications every 30 seconds
        setInterval(() => {
            this.checkUrgentCommunications();
        }, 30000);
    }

    isCurrentTab(tabId) {
        const activeTab = document.querySelector('.communication-tab.active');
        return activeTab && activeTab.dataset.tab === tabId.replace('-communications', '');
    }

    isUsersTabActive() {
        const usersContent = document.getElementById('users-content');
        return usersContent && usersContent.classList.contains('active');
    }

    async checkUrgentCommunications() {
        try {
            const token = localStorage.getItem('adminToken');
            const response = await fetch(`${this.BASE_URL}/api/admin/communication/contact/urgent`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.urgentCount > 0) {
                    this.showUrgentCommunicationAlert(data.urgentCount);
                }
            }
        } catch (error) {
            console.error('Error checking urgent communications:', error);
        }
    }

    showUrgentCommunicationAlert(count) {
        // Only show if not already showing
        if (document.getElementById('urgentCommAlert')) return;

        const alert = document.createElement('div');
        alert.id = 'urgentCommAlert';
        alert.className = 'urgent-communication-alert';
        alert.innerHTML = `
            <div class="alert-content">
                <i class="fas fa-exclamation-triangle"></i>
                <span>${count} urgent communication${count > 1 ? 's' : ''} require${count === 1 ? 's' : ''} immediate attention</span>
                <button onclick="window.enhancedComm.goToUrgentCommunications(); this.parentElement.parentElement.remove()">
                    View Now
                </button>
                <button onclick="this.parentElement.parentElement.remove()" class="close-btn">&times;</button>
            </div>
        `;

        document.body.appendChild(alert);

        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (alert.parentElement) {
                alert.remove();
            }
        }, 10000);
    }

    goToUrgentCommunications() {
        // Switch to communications tab and filter by urgent
        showTab('communication-content');
        this.switchCommunicationTab('contact');
        this.filterCommunications('priority', 'urgent');
    }

    // ========== PUBLIC API METHODS ==========

    async markNotificationRead(notificationId) {
        try {
            const token = localStorage.getItem('adminToken');
            const response = await fetch(`${this.BASE_URL}/api/admin/communication/notifications/${notificationId}/read`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                // Update UI
                const notificationEl = document.querySelector(`[data-notification-id="${notificationId}"]`);
                if (notificationEl) {
                    notificationEl.classList.remove('unread');
                    notificationEl.classList.add('read');
                }
                
                // Update count
                const currentCount = parseInt(document.getElementById('notificationCount')?.textContent || '0');
                this.updateNotificationCount(Math.max(0, currentCount - 1));
            }
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    }

    viewTicketDetails(ticketId) {
        // Open support tab and focus on the ticket
        showTab('support-content');
        // Additional logic to highlight/open specific ticket
        console.log(`Viewing ticket: ${ticketId}`);
    }

    viewGymDetails(gymId) {
        // Open gym management tab and focus on the gym
        showTab('gym-content');
        // Additional logic to highlight/open specific gym
        console.log(`Viewing gym: ${gymId}`);
    }

    handleEscalation(ticketId) {
        this.showEscalationModal(ticketId);
    }

    showEscalationModal(ticketId) {
        // Implementation for escalation modal
        console.log(`Escalating ticket: ${ticketId}`);
    }
}

// Initialize the enhanced communication system
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM Content Loaded - Initializing Enhanced Communication System');
    window.enhancedComm = new EnhancedCommunicationSystem();
    console.log('🌐 window.enhancedComm assigned:', !!window.enhancedComm);
});
