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
        this.setupNotificationPolling();
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
                this.loadGrievances()
            ]);
        } catch (error) {
            console.error('Error loading support data:', error);
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

    // ========== EVENT LISTENERS ==========

    bindEventListeners() {
        // Support tab switching
        document.querySelectorAll('.support-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const userType = e.currentTarget.dataset.tab;
                this.switchSupportTab(userType);
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
