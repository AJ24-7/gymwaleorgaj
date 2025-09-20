// ============= UNIFIED ADMIN COMMUNICATION & SUPPORT SYSTEM =============
// Combined system for communication, support tickets, and contact management

class UnifiedCommunicationSystem {
    constructor() {
        this.BASE_URL = "http://localhost:5000";
        this.notifications = new Map(); // For deduplication
        this.activeTickets = new Map();
        this.notificationQueue = [];
        this.isProcessingQueue = false;
        this.lastFetchTime = null;
        this.maxRetries = 3;
        this.isInitialized = false;
        
        // Support system properties
        this.currentTab = 'users';
        this.currentFilters = {
            priority: 'all',
            status: 'all',
            category: 'all',
            search: ''
        };
        this.tickets = [];
        this.selectedTicket = null;
        this.templates = {};
        
        // Count update control
        this.isUpdatingCounts = false;
        this.lastCountUpdate = null;
        this.currentCounts = { users: 0, gymAdmins: 0, trainers: 0 };
        
        // WhatsApp integration
        this.whatsappEnabled = true;
        this.whatsappIntegrations = {
            supportResponse: true,
            membershipConfirmation: true,
            paymentReminder: true,
            classReminder: true,
            generalNotification: true
        };
        
        // Initialize async
        this.init();
    }

    // ========== INITIALIZATION ==========

    async init() {
        console.log('🔄 Unified Communication System Initializing...');
        try {
            this.injectRequiredStyles();
            this.bindEventListeners();
            this.initializeNotificationSystem();
            
            // Load all data asynchronously
            await Promise.all([
                this.loadSupportStats(),
                this.loadQuickReplyTemplates(),
                this.loadSupportData()
            ]).catch(error => {
                console.warn('⚠️ Some data loading failed, but system will continue:', error);
            });
            
            this.startPeriodicUpdates();
            this.forceRefreshWhenActive();
            this.isInitialized = true;
            
            console.log('✅ Unified Communication System Ready');
            
            // Dispatch event to signal initialization complete
            window.dispatchEvent(new CustomEvent('unifiedCommReady', { 
                detail: { system: this } 
            }));
        } catch (error) {
            console.error('❌ Error initializing Unified Communication System:', error);
            this.isInitialized = false;
        }
    }

    // ========== AUTHENTICATION HELPERS ==========

    getAdminToken() {
        const token = localStorage.getItem('adminToken');
        if (!token) {
            console.error('❌ No admin token found');
            this.showError('Authentication required. Please login again.');
            return null;
        }
        return token;
    }

    getAuthHeaders() {
        const token = this.getAdminToken();
        if (!token) {
            console.error('❌ No token available for authentication');
            return null;
        }
        
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
        
        console.log('🔑 Using auth headers with token:', token.substring(0, 20) + '...');
        return headers;
    }

    // ========== NOTIFICATION SYSTEM ==========

    initializeNotificationSystem() {
        this.createNotificationToastContainer();
        this.enhanceNotificationDropdown();
        this.initializeCountDisplays();
        // Note: Notification polling is handled by startPeriodicUpdates()
    }

    initializeCountDisplays() {
        // Initialize count displays to prevent flickering
        const userCountElement = document.getElementById('userTicketsCount');
        const gymAdminCountElement = document.getElementById('gymAdminTicketsCount');
        const trainerCountElement = document.getElementById('trainerTicketsCount');

        if (userCountElement && userCountElement.textContent === '(0)') {
            userCountElement.textContent = '(...)';
        }
        if (gymAdminCountElement && gymAdminCountElement.textContent === '(0)') {
            gymAdminCountElement.textContent = '(...)';
        }
        if (trainerCountElement && trainerCountElement.textContent === '(0)') {
            trainerCountElement.textContent = '(...)';
        }
        
        console.log('🔢 Initialized count displays with loading state');
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
            notificationList.innerHTML = `
                <div class="notification-loading" id="notificationLoading">
                    <i class="fas fa-spinner fa-spin"></i>
                    <span>Loading notifications...</span>
                </div>
            `;
        }
    }

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

        notificationList.innerHTML = '';
        notifications.forEach(notification => {
            const notificationElement = this.createNotificationElement(notification);
            notificationList.appendChild(notificationElement);
        });
    }

    createNotificationElement(notification) {
        const notificationEl = document.createElement('div');
        notificationEl.className = `notification-item ${notification.read ? 'read' : 'unread'}`;
        notificationEl.dataset.notificationId = notification._id;

        const timeAgo = this.getTimeAgo(new Date(notification.createdAt));
        
        notificationEl.innerHTML = `
            <div class="notification-content">
                <div class="notification-header">
                    <div class="notification-title">
                        ${this.getNotificationIcon(notification.type)}
                        <span>${notification.title}</span>
                    </div>
                    <div class="notification-time">${timeAgo}</div>
                </div>
                <div class="notification-message">${this.truncateMessage(notification.message, 80)}</div>
            </div>
        `;

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

    // ========== SUPPORT DATA LOADING ==========

    async loadSupportData() {
        try {
            // Load current tab data
            await this.loadSupportTickets(this.currentTab);
        } catch (error) {
            console.error('Error loading support data:', error);
        }
    }

    async loadSupportStats() {
        try {
            const headers = this.getAuthHeaders();
            if (!headers) return;
            
            const response = await fetch(`${this.BASE_URL}/api/admin/communication/support/stats`, {
                headers: headers
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.updateSupportStats(data.stats);
                }
            }
        } catch (error) {
            console.error('Error loading support stats:', error);
        }
    }

    updateSupportStats(stats) {
        // Update support stats in UI (excluding tab counts - those are handled by updateDynamicCounts)
        const elements = {
            openTicketsCount: document.getElementById('openTicketsCount'),
            resolvedTodayCount: document.getElementById('resolvedTodayCount'),
            avgResponseTime: document.getElementById('avgResponseTime')
        };

        if (elements.openTicketsCount) elements.openTicketsCount.textContent = stats.openTickets || 0;
        if (elements.resolvedTodayCount) elements.resolvedTodayCount.textContent = stats.resolvedToday || 0;
        if (elements.avgResponseTime) elements.avgResponseTime.textContent = stats.averageResponseTime ? `${stats.averageResponseTime}m` : '--';
        
        console.log('📊 Support stats updated (excluding tab counts)');
    }

    async loadSupportTickets(userType = this.currentTab) {
        try {
            this.showLoading();
            const headers = this.getAuthHeaders();
            if (!headers) return;

            // Load data based on user type
            switch(userType) {
                case 'users':
                    await this.loadUsersData(headers);
                    break;
                case 'gym-admins':
                    await this.loadGymAdminsData(headers);
                    break;
                case 'trainers':
                    await this.loadTrainersData(headers);
                    break;
            }
            
            this.renderTickets();
            
            // Update dynamic counts after loading tickets
            await this.updateDynamicCounts();
        } catch (error) {
            console.error('Error loading support tickets:', error);
            this.showError('Failed to load support tickets');
        } finally {
            this.hideLoading();
        }
    }

    async loadUsersData(headers) {
        try {
            console.log('🔄 Loading users data with headers:', headers);
            const allItems = [];

            // Load support tickets for users
            const ticketParams = new URLSearchParams({
                userType: 'user',
                ...this.currentFilters
            });
            
            console.log('📋 Loading support tickets...');
            try {
                const ticketResponse = await fetch(`${this.BASE_URL}/api/admin/communication/support/tickets?${ticketParams}`, {
                    headers: headers
                });

                console.log('🎫 Support tickets response status:', ticketResponse.status);
                
                if (ticketResponse.ok) {
                    const ticketsData = await ticketResponse.json();
                    console.log('🎫 Support tickets data:', ticketsData);
                    
                    if (ticketsData.success && ticketsData.tickets) {
                        const tickets = ticketsData.tickets.map(ticket => ({
                            ...ticket,
                            itemType: 'support_ticket',
                            displayType: 'Support Ticket'
                        }));
                        allItems.push(...tickets);
                        console.log('✅ Added', tickets.length, 'support tickets');
                    }
                } else {
                    const errorText = await ticketResponse.text();
                    console.warn('⚠️ Support tickets request failed:', ticketResponse.status, errorText);
                }
            } catch (ticketError) {
                console.error('❌ Error loading support tickets:', ticketError);
            }

            // Load contact messages
            console.log('📧 Loading contact messages...');
            try {
                const messageResponse = await fetch(`${this.BASE_URL}/api/admin/communication/contact/messages`, {
                    headers: headers
                });

                console.log('📧 Contact messages response status:', messageResponse.status);
                
                if (messageResponse.ok) {
                    const messagesData = await messageResponse.json();
                    console.log('📧 Contact messages data:', messagesData);
                    
                    if (messagesData.success && messagesData.messages) {
                        // Convert contact messages to ticket-like format
                        const contactMessages = messagesData.messages.map(message => ({
                            ticketId: message._id,
                            subject: message.subject || 'Contact Inquiry',
                            description: message.message,
                            userName: message.name,
                            userEmail: message.email,
                            userPhone: message.phone || 'N/A',
                            category: message.category || 'general',
                            priority: message.priority || 'medium',
                            status: message.status || 'new',
                            createdAt: message.createdAt,
                            itemType: 'contact_message',
                            displayType: 'Contact Message',
                            _id: message._id
                        }));
                        allItems.push(...contactMessages);
                        console.log('✅ Added', contactMessages.length, 'contact messages');
                    }
                } else {
                    const errorText = await messageResponse.text();
                    console.error('❌ Contact messages request failed:', messageResponse.status, errorText);
                    // Show user-friendly error
                    this.showErrorToast(`Failed to load contact messages: ${messageResponse.status}`);
                }
            } catch (messageError) {
                console.error('❌ Error loading contact messages:', messageError);
                this.showErrorToast('Failed to connect to contact messages service');
            }

            // Sort by creation date (newest first)
            this.tickets = allItems.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            console.log('📊 Total items loaded:', this.tickets.length);

        } catch (error) {
            console.error('❌ Error in loadUsersData:', error);
            this.showErrorToast('Failed to load user data');
            this.tickets = [];
        }
    }

    async loadGymAdminsData(headers) {
        try {
            const ticketParams = new URLSearchParams({
                userType: 'gym-admin',
                ...this.currentFilters
            });

            const response = await fetch(`${this.BASE_URL}/api/admin/communication/support/tickets?${ticketParams}`, {
                headers: headers
            });

            if (response.ok) {
                const ticketsData = await response.json();
                if (ticketsData.success && ticketsData.tickets) {
                    this.tickets = ticketsData.tickets.map(ticket => ({
                        ...ticket,
                        itemType: 'support_ticket',
                        displayType: 'Support Ticket'
                    })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                } else {
                    this.tickets = [];
                }
            }
        } catch (error) {
            console.error('Error loading gym admins data:', error);
            this.tickets = [];
        }
    }

    async loadTrainersData(headers) {
        try {
            const ticketParams = new URLSearchParams({
                userType: 'trainer',
                ...this.currentFilters
            });

            const response = await fetch(`${this.BASE_URL}/api/admin/communication/support/tickets?${ticketParams}`, {
                headers: headers
            });

            if (response.ok) {
                const ticketsData = await response.json();
                if (ticketsData.success && ticketsData.tickets) {
                    this.tickets = ticketsData.tickets.map(ticket => ({
                        ...ticket,
                        itemType: 'support_ticket',
                        displayType: 'Support Ticket'
                    })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                } else {
                    this.tickets = [];
                }
            }
        } catch (error) {
            console.error('Error loading trainers data:', error);
            this.tickets = [];
        }
    }

    // ========== DYNAMIC COUNTS ==========

    async updateDynamicCounts() {
        // Prevent multiple simultaneous count updates
        if (this.isUpdatingCounts) {
            console.log('🔄 Count update already in progress, skipping...');
            return;
        }

        // Don't update too frequently (minimum 2 seconds between updates)
        const now = Date.now();
        if (this.lastCountUpdate && (now - this.lastCountUpdate) < 2000) {
            console.log('🔄 Count update too recent, skipping...');
            return;
        }

        try {
            this.isUpdatingCounts = true;
            console.log('🔢 Starting dynamic count update...');
            
            const headers = this.getAuthHeaders();
            if (!headers) return;

            // Fetch real-time counts for all user types
            const counts = await this.fetchRealTimeCounts(headers);
            
            // Update the UI with the new counts
            this.updateTicketCounts(counts);
            
            this.lastCountUpdate = now;
            console.log('✅ Dynamic count update completed');
            
        } catch (error) {
            console.error('Error updating dynamic counts:', error);
        } finally {
            this.isUpdatingCounts = false;
        }
    }

    async fetchRealTimeCounts(headers) {
        const counts = {
            users: 0,
            gymAdmins: 0,
            trainers: 0
        };

        try {
            // Fetch users count (support tickets + contact messages)
            const usersPromises = [
                fetch(`${this.BASE_URL}/api/admin/communication/support/tickets?userType=user&count=true`, { headers })
                    .catch(err => ({ ok: false, error: err })),
                fetch(`${this.BASE_URL}/api/admin/communication/contact/messages?count=true`, { headers })
                    .catch(err => ({ ok: false, error: err }))
            ];

            const [userTicketsResponse, contactMessagesResponse] = await Promise.all(usersPromises);
            
            let userTicketsCount = 0;
            let contactMessagesCount = 0;

            // Handle user tickets count
            if (userTicketsResponse.ok) {
                try {
                    const userTicketsData = await userTicketsResponse.json();
                    userTicketsCount = userTicketsData.count || userTicketsData.tickets?.length || 0;
                } catch (parseError) {
                    console.warn('Failed to parse user tickets response:', parseError);
                }
            } else {
                console.warn('User tickets API not available or failed');
            }

            // Handle contact messages count
            if (contactMessagesResponse.ok) {
                try {
                    const contactMessagesData = await contactMessagesResponse.json();
                    contactMessagesCount = contactMessagesData.count || contactMessagesData.messages?.length || 0;
                } catch (parseError) {
                    console.warn('Failed to parse contact messages response:', parseError);
                }
            } else {
                console.warn('Contact messages API not available or failed');
            }

            counts.users = userTicketsCount + contactMessagesCount;

            // Fetch gym admins count
            try {
                const gymAdminsResponse = await fetch(`${this.BASE_URL}/api/admin/communication/support/tickets?userType=gym-admin&count=true`, { headers });
                if (gymAdminsResponse.ok) {
                    const gymAdminsData = await gymAdminsResponse.json();
                    counts.gymAdmins = gymAdminsData.count || gymAdminsData.tickets?.length || 0;
                }
            } catch (gymAdminError) {
                console.warn('Gym admins API not available or failed:', gymAdminError);
            }

            // Fetch trainers count (sample implementation for future use)
            try {
                const trainersResponse = await fetch(`${this.BASE_URL}/api/admin/communication/support/tickets?userType=trainer&count=true`, { headers });
                if (trainersResponse.ok) {
                    const trainersData = await trainersResponse.json();
                    counts.trainers = trainersData.count || trainersData.tickets?.length || 0;
                } else {
                    // Sample data for trainers (since not implemented yet)
                    counts.trainers = Math.floor(Math.random() * 5); // 0-4 sample tickets
                    console.log('🎭 Using sample trainer tickets count:', counts.trainers);
                }
            } catch (trainerError) {
                console.warn('Trainers API not available, using sample data');
                counts.trainers = Math.floor(Math.random() * 5); // 0-4 sample tickets
            }

        } catch (error) {
            console.error('Error fetching real-time counts:', error);
        }

        return counts;
    }

    updateTicketCounts(counts) {
        console.log('🔢 Updating ticket counts:', counts);
        
        // Check if counts have actually changed to avoid unnecessary DOM updates
        const hasChanged = !this.currentCounts || 
                          this.currentCounts.users !== counts.users ||
                          this.currentCounts.gymAdmins !== counts.gymAdmins ||
                          this.currentCounts.trainers !== counts.trainers;

        if (!hasChanged) {
            console.log('📊 Counts unchanged, skipping DOM update');
            return;
        }
        
        // Update the count displays in the support tabs
        const userCountElement = document.getElementById('userTicketsCount');
        const gymAdminCountElement = document.getElementById('gymAdminTicketsCount');
        const trainerCountElement = document.getElementById('trainerTicketsCount');

        if (userCountElement) {
            userCountElement.textContent = `(${counts.users})`;
            console.log('✅ Updated user tickets count:', counts.users);
        }

        if (gymAdminCountElement) {
            gymAdminCountElement.textContent = `(${counts.gymAdmins})`;
            console.log('✅ Updated gym admin tickets count:', counts.gymAdmins);
        }

        if (trainerCountElement) {
            trainerCountElement.textContent = `(${counts.trainers})`;
            console.log('✅ Updated trainer tickets count:', counts.trainers);
        }

        // Store counts for reference
        this.currentCounts = { ...counts };
        
        // Update the total in support stats only if the element exists AND we're not conflicting with stats API
        const totalCount = counts.users + counts.gymAdmins + counts.trainers;
        const openTicketsElement = document.getElementById('openTicketsCount');
        if (openTicketsElement && openTicketsElement.textContent !== totalCount.toString()) {
            openTicketsElement.textContent = totalCount;
            console.log('✅ Updated total open tickets count:', totalCount);
        }
    }

    // Manual refresh counts method for testing/debugging
    async refreshTicketCounts() {
        console.log('🔄 Manually refreshing ticket counts...');
        // Reset the update flag and timer to allow immediate refresh
        this.isUpdatingCounts = false;
        this.lastCountUpdate = null;
        await this.updateDynamicCounts();
    }

    // ========== RENDERING ==========

    renderTickets() {
        const container = this.getTicketContainer();
        if (!container) {
            console.warn('⚠️ Ticket container not found for tab:', this.currentTab);
            return;
        }

        if (this.tickets.length === 0) {
            container.innerHTML = this.getEmptyStateHTML();
            return;
        }

        const ticketsHTML = this.tickets.map(ticket => this.createTicketCardHTML(ticket)).join('');
        container.innerHTML = ticketsHTML;

        // Add event listeners
        this.addTicketEventListeners(container);
    }

    getTicketContainer() {
        // First try the unified container (userTicketsList for all)
        let container = document.getElementById('userTicketsList');
        
        // Fallback to tab-specific containers
        if (!container) {
            const containerId = this.currentTab === 'gym-admins' ? 'gymAdminTicketsList' : 
                              this.currentTab === 'trainers' ? 'trainerTicketsList' : 'userTicketsList';
            container = document.getElementById(containerId);
        }
        
        // Last resort - try contactMessagesList from enhanced system
        if (!container) {
            container = document.getElementById('contactMessagesList');
        }
        
        return container;
    }

    createTicketCardHTML(ticket) {
        const timeAgo = this.getTimeAgo(ticket.createdAt);
        const priorityClass = `ticket-priority ${ticket.priority}`;
        const statusClass = `ticket-status ${ticket.status}`;
        const cardClass = `support-ticket-card ${ticket.priority === 'urgent' ? 'urgent-priority' : ''} ${ticket.priority === 'high' ? 'high-priority' : ''}`;
        
        // Add visual indicator for contact messages vs support tickets
        const typeIndicator = ticket.itemType === 'contact_message' ? 
            '<span class="item-type contact-message"><i class="fas fa-envelope"></i> Contact Form</span>' : 
            '<span class="item-type support-ticket"><i class="fas fa-ticket-alt"></i> Support Ticket</span>';

        return `
            <div class="${cardClass}" data-ticket-id="${ticket.ticketId}" data-item-type="${ticket.itemType}">
                <div class="ticket-card-header">
                    <div class="ticket-card-left">
                        <div class="ticket-id">#${ticket.ticketId}</div>
                        <div class="ticket-subject">${ticket.subject}</div>
                        <div class="ticket-from">
                            <i class="fas fa-user"></i>
                            ${ticket.userName} (${ticket.userEmail})
                        </div>
                        ${typeIndicator}
                    </div>
                    <div class="ticket-card-right">
                        <span class="ticket-category">${this.getCategoryLabel(ticket.category)}</span>
                        <span class="${priorityClass}">${ticket.priority}</span>
                        <span class="${statusClass}">${ticket.status}</span>
                    </div>
                </div>
                <div class="ticket-card-body">
                    <div class="ticket-description">${ticket.description.substring(0, 150)}${ticket.description.length > 150 ? '...' : ''}</div>
                </div>
                <div class="ticket-card-footer">
                    <div class="ticket-time">
                        <i class="fas fa-clock"></i>
                        ${timeAgo}
                    </div>
                    <div class="ticket-actions">
                        <button class="ticket-action-btn quick-reply-btn" data-ticket-id="${ticket.ticketId}" data-item-type="${ticket.itemType}">
                            <i class="fas fa-reply"></i>
                            Quick Reply
                        </button>
                        <button class="ticket-action-btn view-ticket-btn" data-ticket-id="${ticket.ticketId}" data-item-type="${ticket.itemType}">
                            <i class="fas fa-eye"></i>
                            View
                        </button>
                        ${ticket.itemType === 'contact_message' ? 
                            `<button class="ticket-action-btn convert-ticket-btn" data-message-id="${ticket._id}">
                                <i class="fas fa-exchange-alt"></i>
                                Convert to Ticket
                            </button>` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    addTicketEventListeners(container) {
        // Quick reply buttons
        container.querySelectorAll('.quick-reply-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const ticketId = btn.dataset.ticketId;
                const itemType = btn.dataset.itemType;
                this.showQuickReplyModal(ticketId, itemType);
            });
        });

        // View ticket buttons
        container.querySelectorAll('.view-ticket-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const ticketId = btn.dataset.ticketId;
                const itemType = btn.dataset.itemType;
                this.openSupportTicketModal(ticketId, itemType);
            });
        });

        // Convert to ticket buttons
        container.querySelectorAll('.convert-ticket-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const messageId = btn.dataset.messageId;
                this.convertContactToTicket(messageId);
            });
        });
    }

    // ========== MODAL SYSTEMS ==========

    showQuickReplyModal(ticketId, itemType = 'support_ticket') {
        const ticket = this.tickets.find(t => t.ticketId === ticketId);
        if (!ticket) {
            this.showError('Ticket not found');
            return;
        }

        this.selectedTicket = ticket;
        
        // Remove existing modal
        const existingModal = document.getElementById('quickReplyModal');
        if (existingModal) {
            existingModal.remove();
        }

        const modal = document.createElement('div');
        modal.id = 'quickReplyModal';
        modal.className = 'unified-modal';
        modal.innerHTML = `
            <div class="unified-modal-overlay"></div>
            <div class="unified-modal-content">
                <div class="unified-modal-header">
                    <h3><i class="fas fa-reply"></i> Quick Reply - ${ticket.displayType} #${ticketId}</h3>
                    <button class="unified-modal-close">&times;</button>
                </div>
                <div class="unified-modal-body">
                    <!-- Ticket Summary -->
                    <div class="ticket-summary">
                        <div class="ticket-summary-header">
                            <h4>${ticket.subject}</h4>
                            <div class="ticket-meta">
                                <span class="ticket-from"><i class="fas fa-user"></i> ${ticket.userName} (${ticket.userEmail})</span>
                                <span class="ticket-category"><i class="fas fa-tag"></i> ${this.getCategoryLabel(ticket.category)}</span>
                                <span class="ticket-time"><i class="fas fa-clock"></i> ${this.getTimeAgo(ticket.createdAt)}</span>
                            </div>
                        </div>
                        <div class="ticket-description">
                            <p><strong>Message:</strong> ${ticket.description}</p>
                        </div>
                    </div>

                    <!-- Quick Reply Templates -->
                    <div class="reply-templates">
                        <h4><i class="fas fa-magic"></i> Quick Templates:</h4>
                        <div class="template-buttons">
                            <button class="template-btn" data-template="acknowledge">
                                <i class="fas fa-check"></i> Acknowledge
                            </button>
                            <button class="template-btn" data-template="investigating">
                                <i class="fas fa-search"></i> Investigating
                            </button>
                            <button class="template-btn" data-template="resolved">
                                <i class="fas fa-check-circle"></i> Resolved
                            </button>
                            <button class="template-btn" data-template="more-info">
                                <i class="fas fa-question-circle"></i> Need Info
                            </button>
                            <button class="template-btn" data-template="follow-up">
                                <i class="fas fa-calendar"></i> Follow Up
                            </button>
                        </div>
                    </div>

                    <!-- Reply Form -->
                    <div class="reply-form">
                        <div class="form-group">
                            <label for="quickReplyMessage"><i class="fas fa-envelope"></i> Reply Message:</label>
                            <textarea id="quickReplyMessage" placeholder="Type your reply..." rows="5"></textarea>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label for="replyStatus"><i class="fas fa-flag"></i> Update Status:</label>
                                <select id="replyStatus">
                                    <option value="">Keep Current (${ticket.status})</option>
                                    <option value="replied">Replied</option>
                                    <option value="in-progress">In Progress</option>
                                    <option value="resolved">Resolved</option>
                                    <option value="closed">Close Ticket</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="replyPriority"><i class="fas fa-exclamation-triangle"></i> Update Priority:</label>
                                <select id="replyPriority">
                                    <option value="">Keep Current (${ticket.priority})</option>
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                    <option value="urgent">Urgent</option>
                                </select>
                            </div>
                        </div>

                        <div class="form-group">
                            <label><i class="fas fa-share"></i> Communication Channels:</label>
                            <div class="channel-checkboxes">
                                <label class="channel-option">
                                    <input type="checkbox" value="email" checked>
                                    <i class="fas fa-envelope"></i> Email
                                </label>
                                <label class="channel-option">
                                    <input type="checkbox" value="notification" checked>
                                    <i class="fas fa-bell"></i> In-App Notification
                                </label>
                                ${ticket.userPhone && ticket.userPhone !== 'N/A' ? `
                                    <label class="channel-option">
                                        <input type="checkbox" value="whatsapp">
                                        <i class="fab fa-whatsapp"></i> WhatsApp
                                    </label>
                                ` : ''}
                            </div>
                        </div>

                        <div class="reply-actions">
                            <button class="btn btn-secondary" onclick="document.getElementById('quickReplyModal').remove()">
                                <i class="fas fa-times"></i> Cancel
                            </button>
                            <button class="btn btn-primary" id="sendQuickReplyBtn">
                                <i class="fas fa-paper-plane"></i> Send Reply
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Add event listeners
        modal.querySelector('.unified-modal-close').onclick = () => modal.remove();
        modal.querySelector('.unified-modal-overlay').onclick = () => modal.remove();
        modal.querySelector('#sendQuickReplyBtn').onclick = () => this.submitQuickReply(ticketId, itemType);

        // Template buttons
        modal.querySelectorAll('.template-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.selectTemplate(btn.dataset.template);
                // Update active template
                modal.querySelectorAll('.template-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        // Show modal with animation
        setTimeout(() => modal.classList.add('show'), 10);
    }

    async openSupportTicketModal(ticketId, itemType = 'support_ticket') {
        try {
            const ticket = this.tickets.find(t => t.ticketId === ticketId);
            if (!ticket) {
                this.showError('Ticket not found');
                return;
            }

            this.selectedTicket = ticket;
            
            // Remove existing modal
            const existingModal = document.getElementById('supportTicketViewModal');
            if (existingModal) {
                existingModal.remove();
            }

            const modal = document.createElement('div');
            modal.id = 'supportTicketViewModal';
            modal.className = 'unified-modal large-modal';
            modal.innerHTML = `
                <div class="unified-modal-overlay"></div>
                <div class="unified-modal-content large">
                    <div class="unified-modal-header">
                        <h3><i class="fas fa-eye"></i> View ${ticket.displayType} - #${ticketId}</h3>
                        <button class="unified-modal-close">&times;</button>
                    </div>
                    <div class="unified-modal-body">
                        <!-- Ticket Header -->
                        <div class="ticket-view-header">
                            <div class="ticket-info">
                                <h2 class="ticket-title">${ticket.subject}</h2>
                                <div class="ticket-metadata">
                                    <div class="meta-row">
                                        <div class="meta-item">
                                            <i class="fas fa-user"></i>
                                            <strong>From:</strong> ${ticket.userName}
                                        </div>
                                        <div class="meta-item">
                                            <i class="fas fa-envelope"></i>
                                            <strong>Email:</strong> ${ticket.userEmail}
                                        </div>
                                        ${ticket.userPhone && ticket.userPhone !== 'N/A' ? `
                                            <div class="meta-item">
                                                <i class="fas fa-phone"></i>
                                                <strong>Phone:</strong> ${ticket.userPhone}
                                            </div>
                                        ` : ''}
                                    </div>
                                    <div class="meta-row">
                                        <div class="meta-item">
                                            <i class="fas fa-tag"></i>
                                            <strong>Category:</strong> 
                                            <span class="category-badge">${this.getCategoryLabel(ticket.category)}</span>
                                        </div>
                                        <div class="meta-item">
                                            <i class="fas fa-clock"></i>
                                            <strong>Created:</strong> ${new Date(ticket.createdAt).toLocaleString()}
                                        </div>
                                        <div class="meta-item">
                                            <i class="fas fa-info-circle"></i>
                                            <strong>Type:</strong> ${ticket.displayType}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="ticket-status-panel">
                                <div class="status-badges">
                                    <div class="status-badge ${ticket.status}">${ticket.status.toUpperCase()}</div>
                                    <div class="priority-badge ${ticket.priority}">${ticket.priority.toUpperCase()}</div>
                                </div>
                                <div class="status-actions">
                                    <select id="ticketStatusUpdate" class="status-select">
                                        <option value="">Change Status</option>
                                        <option value="open" ${ticket.status === 'open' ? 'selected' : ''}>Open</option>
                                        <option value="replied" ${ticket.status === 'replied' ? 'selected' : ''}>Replied</option>
                                        <option value="in-progress" ${ticket.status === 'in-progress' ? 'selected' : ''}>In Progress</option>
                                        <option value="resolved" ${ticket.status === 'resolved' ? 'selected' : ''}>Resolved</option>
                                        <option value="closed" ${ticket.status === 'closed' ? 'selected' : ''}>Closed</option>
                                    </select>
                                    <select id="ticketPriorityUpdate" class="priority-select">
                                        <option value="">Change Priority</option>
                                        <option value="low" ${ticket.priority === 'low' ? 'selected' : ''}>Low</option>
                                        <option value="medium" ${ticket.priority === 'medium' ? 'selected' : ''}>Medium</option>
                                        <option value="high" ${ticket.priority === 'high' ? 'selected' : ''}>High</option>
                                        <option value="urgent" ${ticket.priority === 'urgent' ? 'selected' : ''}>Urgent</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <!-- Original Message -->
                        <div class="ticket-original-message">
                            <h4><i class="fas fa-comment"></i> Original Message</h4>
                            <div class="message-content">
                                <p>${ticket.description}</p>
                                <div class="message-time">
                                    <i class="fas fa-clock"></i> ${this.getTimeAgo(ticket.createdAt)} ago
                                </div>
                            </div>
                        </div>

                        <!-- Quick Actions -->
                        <div class="ticket-actions">
                            <div class="action-buttons">
                                <button class="btn btn-primary" onclick="window.unifiedComm.showQuickReplyModal('${ticketId}', '${itemType}'); document.getElementById('supportTicketViewModal').remove();">
                                    <i class="fas fa-reply"></i> Quick Reply
                                </button>
                                ${ticket.itemType === 'contact_message' ? `
                                    <button class="btn btn-info" onclick="window.unifiedComm.convertContactToTicket('${ticket._id}')">
                                        <i class="fas fa-exchange-alt"></i> Convert to Support Ticket
                                    </button>
                                ` : ''}
                                <button class="btn btn-warning" onclick="window.unifiedComm.updateTicketStatus('${ticketId}', 'resolved')">
                                    <i class="fas fa-check-circle"></i> Mark Resolved
                                </button>
                                <button class="btn btn-danger" onclick="window.unifiedComm.updateTicketStatus('${ticketId}', 'closed')">
                                    <i class="fas fa-times-circle"></i> Close Ticket
                                </button>
                                <button class="btn btn-secondary" onclick="document.getElementById('supportTicketViewModal').remove()">
                                    <i class="fas fa-times"></i> Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            // Add event listeners
            modal.querySelector('.unified-modal-close').onclick = () => modal.remove();
            modal.querySelector('.unified-modal-overlay').onclick = () => modal.remove();

            // Status and priority change handlers
            modal.querySelector('#ticketStatusUpdate').onchange = (e) => {
                if (e.target.value) {
                    this.updateTicketStatus(ticketId, e.target.value);
                }
            };

            modal.querySelector('#ticketPriorityUpdate').onchange = (e) => {
                if (e.target.value) {
                    this.updateTicketPriority(ticketId, e.target.value);
                }
            };

            // Show modal with animation
            setTimeout(() => modal.classList.add('show'), 10);

        } catch (error) {
            console.error('Error opening ticket modal:', error);
            this.showErrorToast('Failed to open ticket details');
        }
    }

    async updateTicketStatus(ticketId, newStatus) {
        try {
            const headers = this.getAuthHeaders();
            if (!headers) return;

            const response = await fetch(`${this.BASE_URL}/api/admin/communication/support/tickets/${ticketId}/status`, {
                method: 'PATCH',
                headers: headers,
                body: JSON.stringify({ status: newStatus })
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    this.showSuccessToast(`Ticket status updated to ${newStatus}`);
                    this.loadSupportTickets(); // Refresh the list
                    
                    // Close modal if it exists
                    const modal = document.getElementById('supportTicketViewModal');
                    if (modal) modal.remove();
                }
            }
        } catch (error) {
            console.error('Error updating ticket status:', error);
            this.showErrorToast('Failed to update ticket status');
        }
    }

    async updateTicketPriority(ticketId, newPriority) {
        try {
            const headers = this.getAuthHeaders();
            if (!headers) return;

            const response = await fetch(`${this.BASE_URL}/api/admin/communication/support/tickets/${ticketId}/priority`, {
                method: 'PATCH',
                headers: headers,
                body: JSON.stringify({ priority: newPriority })
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    this.showSuccessToast(`Ticket priority updated to ${newPriority}`);
                    this.loadSupportTickets(); // Refresh the list
                }
            }
        } catch (error) {
            console.error('Error updating ticket priority:', error);
            this.showErrorToast('Failed to update ticket priority');
        }
    }

    async convertContactToTicket(contactId) {
        try {
            if (!confirm('Convert this contact message to a support ticket? This will create a formal ticket for better tracking.')) {
                return;
            }

            const headers = this.getAuthHeaders();
            if (!headers) return;

            const loadingToast = this.showLoadingToast('Converting to support ticket...');

            const response = await fetch(`${this.BASE_URL}/api/admin/communication/convert-to-ticket`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({ 
                    contactId: contactId,
                    adminId: this.currentUser?.id || 'admin'
                })
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    this.dismissToast(loadingToast);
                    this.showSuccessToast('Contact message converted to support ticket successfully!');
                    
                    // Refresh both contact messages and support tickets
                    this.loadContactMessages();
                    this.loadSupportTickets();
                    
                    // Close any open modals
                    const modal = document.getElementById('supportTicketViewModal');
                    if (modal) modal.remove();
                } else {
                    throw new Error(result.message || 'Conversion failed');
                }
            } else {
                throw new Error('Server error during conversion');
            }

        } catch (error) {
            console.error('Error converting to ticket:', error);
            this.showErrorToast(`Failed to convert to ticket: ${error.message}`);
        }
    }

    // ========== WHATSAPP INTEGRATION METHODS ==========

    // Check if WhatsApp integration is enabled and configured
    async isWhatsAppAvailable() {
        try {
            if (!this.whatsappEnabled) return false;

            const headers = this.getAuthHeaders();
            if (!headers) return false;

            const response = await fetch(`${this.BASE_URL}/api/whatsapp/status`, {
                method: 'GET',
                headers: headers
            });

            if (response.ok) {
                const result = await response.json();
                const status = result.data;
                return status && (status.businessApiConfigured || status.twilioConfigured) && status.provider !== 'none';
            }
            return false;

        } catch (error) {
            console.error('Error checking WhatsApp availability:', error);
            return false;
        }
    }

    // Send WhatsApp notification for support response
    async sendWhatsAppSupportNotification(userPhone, userName, ticketId, response) {
        try {
            if (!this.whatsappIntegrations.supportResponse) return { success: false, message: 'Integration disabled' };

            const headers = this.getAuthHeaders();
            if (!headers) return { success: false, message: 'Auth required' };

            const whatsappResponse = await fetch(`${this.BASE_URL}/api/whatsapp/support/notify`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    ticketId: ticketId,
                    userPhone: userPhone,
                    userName: userName,
                    response: response
                })
            });

            const result = await whatsappResponse.json();
            return result;

        } catch (error) {
            console.error('Error sending WhatsApp support notification:', error);
            return { success: false, error: error.message };
        }
    }

    // Send WhatsApp membership confirmation
    async sendWhatsAppMembershipNotification(userPhone, userName, membershipPlan, validTill) {
        try {
            if (!this.whatsappIntegrations.membershipConfirmation) return { success: false, message: 'Integration disabled' };

            const headers = this.getAuthHeaders();
            if (!headers) return { success: false, message: 'Auth required' };

            const response = await fetch(`${this.BASE_URL}/api/whatsapp/membership/notify`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    userPhone: userPhone,
                    userName: userName,
                    membershipPlan: membershipPlan,
                    validTill: validTill
                })
            });

            const result = await response.json();
            return result;

        } catch (error) {
            console.error('Error sending WhatsApp membership notification:', error);
            return { success: false, error: error.message };
        }
    }

    // Send WhatsApp payment reminder
    async sendWhatsAppPaymentReminder(userPhone, userName, amount, dueDate) {
        try {
            if (!this.whatsappIntegrations.paymentReminder) return { success: false, message: 'Integration disabled' };

            const headers = this.getAuthHeaders();
            if (!headers) return { success: false, message: 'Auth required' };

            const response = await fetch(`${this.BASE_URL}/api/whatsapp/payment/notify`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    userPhone: userPhone,
                    userName: userName,
                    amount: amount,
                    dueDate: dueDate
                })
            });

            const result = await response.json();
            return result;

        } catch (error) {
            console.error('Error sending WhatsApp payment reminder:', error);
            return { success: false, error: error.message };
        }
    }

    // Send WhatsApp class reminder
    async sendWhatsAppClassReminder(userPhone, userName, className, classTime, instructor) {
        try {
            if (!this.whatsappIntegrations.classReminder) return { success: false, message: 'Integration disabled' };

            const headers = this.getAuthHeaders();
            if (!headers) return { success: false, message: 'Auth required' };

            const response = await fetch(`${this.BASE_URL}/api/whatsapp/class/notify`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    userPhone: userPhone,
                    userName: userName,
                    className: className,
                    classTime: classTime,
                    instructor: instructor
                })
            });

            const result = await response.json();
            return result;

        } catch (error) {
            console.error('Error sending WhatsApp class reminder:', error);
            return { success: false, error: error.message };
        }
    }

    // Send general WhatsApp notification
    async sendWhatsAppGeneralNotification(userPhone, userName, title, content) {
        try {
            if (!this.whatsappIntegrations.generalNotification) return { success: false, message: 'Integration disabled' };

            const headers = this.getAuthHeaders();
            if (!headers) return { success: false, message: 'Auth required' };

            const response = await fetch(`${this.BASE_URL}/api/whatsapp/notify`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    phoneNumber: userPhone,
                    type: 'general_notification',
                    data: {
                        userName: userName,
                        title: title,
                        content: content
                    }
                })
            });

            const result = await response.json();
            return result;

        } catch (error) {
            console.error('Error sending WhatsApp general notification:', error);
            return { success: false, error: error.message };
        }
    }

    // Enhanced submit reply with WhatsApp integration
    async submitQuickReply(ticketId, itemType) {
        const message = document.getElementById('quickReplyMessage')?.value.trim();
        const status = document.getElementById('replyStatus')?.value;
        const priority = document.getElementById('replyPriority')?.value;
        const channels = Array.from(document.querySelectorAll('#quickReplyModal .channel-checkboxes input:checked'))
            .map(cb => cb.value);

        if (!message) {
            this.showErrorToast('Please enter a reply message');
            return;
        }

        if (channels.length === 0) {
            this.showErrorToast('Please select at least one communication channel');
            return;
        }

        // Capture original button text in outer scope so it's available in finally
        let originalText = null;
        let attemptedStatus = status; // track for fallback
        try {
            const headers = this.getAuthHeaders();
            if (!headers) return;

            // Show loading state
            const sendBtn = document.getElementById('sendQuickReplyBtn');
            if (sendBtn) {
                originalText = sendBtn.innerHTML;
                sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
                sendBtn.disabled = true;
            }

            // Determine correct backend endpoint structure (communicationRoutes vs adminRoutes)
            // Existing adminRoutes defines: POST /api/admin/support/tickets/:ticketId/reply
            // communicationRoutes defines: POST /api/admin/communication/contact/messages/:messageId/reply
            const endpoint = itemType === 'contact_message'
                ? `/api/admin/communication/contact/messages/${this.selectedTicket._id}/reply`
                : `/api/admin/support/tickets/${ticketId}/reply`;

            // Backend expects 'channels' for contact messages route and 'sendVia' for support tickets (replyToTicket)
            const requestBody = { message: message };
            if (itemType === 'contact_message') {
                requestBody.channels = channels; // contact message route signature
            } else {
                requestBody.sendVia = channels; // support ticket controller uses sendVia
            }

            // Add status and priority updates if provided
            // Avoid sending 'replied' for contact messages to prevent enum mismatch during rollout; backend will auto-mark
            if (status && !(itemType === 'contact_message' && status === 'replied')) {
                requestBody.status = status;
            } else if (status === 'replied' && itemType === 'contact_message') {
                console.info('Skipping explicit "replied" status for contact message; relying on backend auto-transition.');
            }
            if (priority) requestBody.priority = priority;

            let response = await fetch(`${this.BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(requestBody)
            });

            // Fallback: if status==='replied' and backend rejects (likely schema not reloaded yet), retry without status
            if (!response.ok && attemptedStatus === 'replied') {
                try {
                    const errorClone = await response.clone().text();
                    console.warn('Initial reply request failed with status "replied". Retrying without status. Body:', errorClone.slice(0,300));
                } catch(_) {}
                delete requestBody.status;
                attemptedStatus = null;
                response = await fetch(`${this.BASE_URL}${endpoint}`, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify(requestBody)
                });
            }

            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    // Optimistic local ticket update so UI reflects immediately
                    const localTicket = this.tickets.find(t => t.ticketId === ticketId);
                    if (localTicket) {
                        if (status) localTicket.status = status;
                        else if (!status && localTicket.status === 'open') localTicket.status = 'replied';
                        if (priority) localTicket.priority = priority;
                        if (!localTicket.messages) localTicket.messages = [];
                        localTicket.messages.push({
                            sender: 'admin',
                            message,
                            timestamp: new Date().toISOString(),
                            sentVia: channels
                        });
                    }

                    let successMessage = 'Reply sent successfully!';
                    
                    // Add status update info to success message
                    if (status) {
                        const statusLabels = {
                            'replied': 'marked as replied',
                            'in-progress': 'moved to in-progress',
                            'resolved': 'marked as resolved',
                            'closed': 'closed'
                        };
                        successMessage += ` Ticket ${statusLabels[status] || 'status updated'}.`;
                    }

                    if (priority) {
                        successMessage += ` Priority updated to ${priority}.`;
                    }

                    // Show channels used
                    const channelLabels = { email: 'Email', notification: 'In-App', whatsapp: 'WhatsApp' };
                    const channelNames = channels.map(c => channelLabels[c] || c).join(', ');
                    successMessage += ` Sent via: ${channelNames}.`;

                    // Send WhatsApp notification if enabled and channel selected
                    if (channels.includes('whatsapp') && await this.isWhatsAppAvailable()) {
                        try {
                            const ticket = this.tickets.find(t => t.ticketId === ticketId);
                            if (ticket && ticket.userPhone) {
                                const whatsappResult = await this.sendWhatsAppSupportNotification(
                                    ticket.userPhone,
                                    ticket.userName,
                                    ticketId,
                                    message
                                );

                                if (whatsappResult.success) {
                                    console.log('✅ WhatsApp notification sent successfully');
                                } else {
                                    console.warn('⚠️ WhatsApp notification failed:', whatsappResult.message);
                                    successMessage += ' (WhatsApp notification failed)';
                                }
                            } else {
                                console.warn('⚠️ No phone number found for WhatsApp notification');
                                successMessage += ' (No phone number for WhatsApp)';
                            }
                        } catch (whatsappError) {
                            console.error('❌ WhatsApp notification error:', whatsappError);
                            successMessage += ' (WhatsApp notification error)';
                        }
                    }

                    this.showSuccessToast(successMessage);
                    document.getElementById('quickReplyModal').remove();

                    // Re-render ticket list quickly (optimistic), then fetch authoritative data
                    this.renderTickets();
                    this.updateDynamicCounts();
                    setTimeout(() => this.loadSupportTickets(), 300); // small delay to avoid flicker
                } else {
                    throw new Error(result.message || 'Failed to send reply');
                }
            } else {
                let errorBodyText = '';
                try { errorBodyText = await response.text(); } catch(_) {}
                console.error('Reply request failed:', {
                    status: response.status,
                    statusText: response.statusText,
                    bodyPreview: errorBodyText.slice(0,500)
                });
                let parsed;
                try { parsed = JSON.parse(errorBodyText); } catch(_) {}
                const errorMsg = parsed?.message || `HTTP ${response.status}: ${response.statusText}`;
                throw new Error(errorMsg);
            }
        } catch (error) {
            console.error('Error sending reply:', error);
            this.showErrorToast(error.message || 'Failed to send reply');
        } finally {
            // Restore button state
            const sendBtn = document.getElementById('sendQuickReplyBtn');
            if (sendBtn) {
                if (originalText) sendBtn.innerHTML = originalText;
                sendBtn.disabled = false;
            }
        }
    }

    selectTemplate(templateType) {
        const templates = {
            acknowledge: `Thank you for contacting us. We have received your message and will review it shortly. Our team will get back to you within 24 hours.`,
            investigating: `We are currently investigating your inquiry and gathering the necessary information. We'll provide you with an update within 24 hours.`,
            resolved: `Thank you for reaching out to us. We have reviewed your request and believe it has been resolved. Please let us know if you need any further assistance.`,
            'more-info': `Thank you for contacting us. To better assist you, could you please provide more details about your inquiry? This will help us give you the most accurate response.`,
            'follow-up': `We wanted to follow up on your recent inquiry. Please let us know if you have any additional questions or if there's anything else we can help you with.`
        };

        const textarea = document.getElementById('quickReplyMessage');
        if (textarea && templates[templateType]) {
            let message = templates[templateType];
            
            // Personalize the template if we have ticket info
            if (this.selectedTicket) {
                const name = this.selectedTicket.userName.split(' ')[0]; // Use first name
                message = `Hi ${name},\n\n${message}\n\nBest regards,\nGym-Wale Support Team`;
            }
            
            textarea.value = message;
            
            // Auto-select appropriate status based on template
            const statusSelect = document.getElementById('replyStatus');
            if (statusSelect) {
                switch(templateType) {
                    case 'acknowledge':
                        statusSelect.value = 'replied';
                        break;
                    case 'investigating':
                        statusSelect.value = 'in-progress';
                        break;
                    case 'resolved':
                        statusSelect.value = 'resolved';
                        break;
                    case 'more-info':
                        statusSelect.value = 'replied';
                        break;
                    case 'follow-up':
                        statusSelect.value = 'replied';
                        break;
                }
            }
        }
    }

    async convertContactToTicket(messageId) {
        try {
            const headers = this.getAuthHeaders();
            if (!headers) return;

            const response = await fetch(`${this.BASE_URL}/api/admin/communication/contact/messages/${messageId}/convert-ticket`, {
                method: 'POST',
                headers: headers
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    this.showSuccessToast(`Contact message converted to support ticket #${result.ticketId}`);
                    this.loadSupportTickets(); // Refresh the list
                } else {
                    throw new Error(result.message || 'Failed to convert to ticket');
                }
            }
        } catch (error) {
            console.error('Error converting to ticket:', error);
            this.showErrorToast(error.message || 'Failed to convert to support ticket');
        }
    }

    // ========== EVENT HANDLERS ==========

    bindEventListeners() {
        // Support tab switching
        document.querySelectorAll('.support-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                const tabType = tab.dataset.tab;
                if (tabType) {
                    this.switchUserType(tabType);
                }
            });
        });

        // Filter changes
        const priorityFilter = document.getElementById('priorityFilter');
        if (priorityFilter) {
            priorityFilter.addEventListener('change', (e) => {
                this.currentFilters.priority = e.target.value;
                this.applyFilters();
            });
        }

        const statusFilter = document.getElementById('statusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.currentFilters.status = e.target.value;
                this.applyFilters();
            });
        }

        const categoryFilter = document.getElementById('categoryFilter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', (e) => {
                this.currentFilters.category = e.target.value;
                this.applyFilters();
            });
        }

        const searchTickets = document.getElementById('searchTickets');
        if (searchTickets) {
            searchTickets.addEventListener('input', (e) => {
                this.currentFilters.search = e.target.value;
                this.applyFilters();
            });
        }

        // Notification dropdown toggle
        const notificationBell = document.getElementById('notificationBell');
        if (notificationBell) {
            notificationBell.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleNotificationDropdown();
            });
        }
    }

    switchUserType(userType) {
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

        this.currentTab = userType;
        
        // Load data for the selected tab and update counts
        this.loadSupportTickets(userType);
        
        // Update counts when switching tabs (but don't conflict with loadSupportTickets)
        setTimeout(() => {
            if (!this.isUpdatingCounts) {
                this.updateDynamicCounts();
            }
        }, 1000);
    }

    applyFilters() {
        this.loadSupportTickets();
    }

    forceRefresh() {
        // Clear cached data
        this.currentFilters = {
            priority: 'all',
            status: 'all',
            category: 'all',
            search: ''
        };
        
        // Reload stats, current tab, and dynamic counts
        this.loadSupportStats();
        this.loadSupportTickets();
        this.updateDynamicCounts();
    }

    forceRefreshWhenActive() {
        const supportTab = document.getElementById('support-tab');
        if (supportTab) {
            supportTab.addEventListener('click', () => {
                setTimeout(() => {
                    this.forceRefresh();
                    // Ensure counts are loaded when switching to support tab
                    this.updateDynamicCounts();
                }, 100);
            });
        }
        
        // Listen for when support content becomes visible
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const target = mutation.target;
                    if (target.id === 'support-content' && target.classList.contains('active')) {
                        setTimeout(() => {
                            this.forceRefresh();
                            // Load counts when support content becomes active
                            this.updateDynamicCounts();
                        }, 100);
                    }
                }
            });
        });
        
        const supportContent = document.getElementById('support-content');
        if (supportContent) {
            observer.observe(supportContent, { attributes: true });
        }
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

        // Refresh tickets every 2 minutes if support tab is active
        setInterval(() => {
            const supportContent = document.getElementById('support-content');
            if (supportContent && supportContent.classList.contains('active')) {
                this.loadSupportTickets();
            }
        }, 120000);

        // Update dynamic counts every 2 minutes (increased from 1 minute to reduce flickering)
        setInterval(() => {
            this.updateDynamicCounts();
        }, 120000);

        // Initial count update (delayed to avoid conflicts with other initialization)
        setTimeout(() => {
            this.updateDynamicCounts();
        }, 3000); // Increased delay from 2 to 3 seconds
    }

    // ========== UTILITY METHODS ==========

    getCategoryLabel(category) {
        const labels = {
            'technical': 'Technical',
            'billing': 'Billing', 
            'membership': 'Membership',
            'equipment': 'Equipment',
            'general': 'General',
            'complaint': 'Complaint',
            'service': 'Service Support',
            'partnership': 'Partnership'
        };
        return labels[category] || category;
    }

    getTimeAgo(timestamp) {
        const now = new Date();
        const time = new Date(timestamp);
        const diffInSeconds = Math.floor((now - time) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        return `${Math.floor(diffInSeconds / 86400)}d ago`;
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

    showLoading() {
        const containers = ['userTicketsList', 'gymAdminTicketsList', 'trainerTicketsList', 'contactMessagesList'];
        containers.forEach(id => {
            const container = document.getElementById(id);
            if (container) {
                container.innerHTML = `
                    <div class="loading-state">
                        <i class="fas fa-spinner fa-spin"></i>
                        <p>Loading tickets...</p>
                    </div>
                `;
            }
        });
    }

    hideLoading() {
        // Loading will be hidden when tickets are rendered
    }

    getEmptyStateHTML() {
        return `
            <div class="support-empty-state">
                <div class="support-empty-icon">
                    <i class="fas fa-inbox"></i>
                </div>
                <h3>No ${this.currentTab === 'users' ? 'Messages or ' : ''}Support Tickets</h3>
                <p>There are no ${this.currentTab === 'users' ? 'contact messages or ' : ''}support tickets to display for the current filters.</p>
            </div>
        `;
    }

    showError(message) {
        console.error('Unified communication system error:', message);
        this.showErrorToast(message);
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
            if (toast.parentNode) {
                toast.remove();
            }
        }, 5000);
    }

    async loadQuickReplyTemplates() {
        try {
            const headers = this.getAuthHeaders();
            if (!headers) return;

            const response = await fetch(`${this.BASE_URL}/api/admin/support/templates`, {
                headers: headers
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.templates = data.templates.reduce((acc, template) => {
                        acc[template.type] = template;
                        return acc;
                    }, {});
                }
            }
        } catch (error) {
            console.error('Error loading templates:', error);
        }
    }

    // ========== CSS INJECTION ==========

    injectRequiredStyles() {
        if (document.getElementById('unifiedCommStyles')) return;

        const style = document.createElement('style');
        style.id = 'unifiedCommStyles';
        style.textContent = `
            /* Unified Modal Styles */
            .unified-modal {
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

            .unified-modal.show {
                opacity: 1;
                visibility: visible;
            }

            .unified-modal-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                backdrop-filter: blur(4px);
            }

            .unified-modal-content {
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

            .unified-modal-header {
                padding: 20px 24px;
                border-bottom: 1px solid #e5e7eb;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .unified-modal-header h3 {
                margin: 0;
                color: #111827;
                font-size: 18px;
            }

            .unified-modal-close {
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

            .unified-modal-close:hover {
                background: #f3f4f6;
                color: #374151;
            }

            .unified-modal-body {
                padding: 24px;
            }

            /* Support Ticket Cards */
            .support-ticket-card {
                background: #fff;
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                padding: 16px;
                margin-bottom: 12px;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                transition: all 0.3s ease;
            }

            .support-ticket-card:hover {
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                transform: translateY(-1px);
            }

            .support-ticket-card.urgent-priority {
                border-left: 4px solid #ef4444;
            }

            .support-ticket-card.high-priority {
                border-left: 4px solid #f59e0b;
            }

            .ticket-card-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 12px;
            }

            .ticket-id {
                font-size: 12px;
                color: #6b7280;
                font-weight: 500;
            }

            .ticket-subject {
                font-size: 16px;
                font-weight: 600;
                color: #111827;
                margin: 4px 0;
            }

            .ticket-from {
                font-size: 13px;
                color: #6b7280;
            }

            .ticket-card-right {
                display: flex;
                flex-direction: column;
                align-items: flex-end;
                gap: 4px;
            }

            .ticket-category, .ticket-priority, .ticket-status {
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 12px;
                font-weight: 500;
            }

            .ticket-category {
                background: #dbeafe;
                color: #1d4ed8;
            }

            .ticket-priority.high {
                background: #fed7aa;
                color: #c2410c;
            }

            .ticket-priority.urgent {
                background: #fecaca;
                color: #dc2626;
            }

            .ticket-priority.medium {
                background: #e0e7ff;
                color: #3730a3;
            }

            .ticket-status.new {
                background: #fef3c7;
                color: #92400e;
            }

            .ticket-status.replied {
                background: #d1fae5;
                color: #065f46;
            }

            .ticket-status.resolved {
                background: #dcfce7;
                color: #166534;
            }

            .ticket-card-body {
                margin-bottom: 12px;
            }

            .ticket-description {
                color: #374151;
                line-height: 1.5;
            }

            .ticket-card-footer {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding-top: 12px;
                border-top: 1px solid #f3f4f6;
            }

            .ticket-time {
                color: #6b7280;
                font-size: 12px;
            }

            .ticket-actions {
                display: flex;
                gap: 8px;
            }

            .ticket-action-btn {
                padding: 6px 12px;
                border: 1px solid #d1d5db;
                border-radius: 4px;
                background: #fff;
                color: #374151;
                font-size: 12px;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .ticket-action-btn:hover {
                background: #f9fafb;
                border-color: #9ca3af;
            }

            .item-type {
                padding: 2px 6px;
                border-radius: 4px;
                font-size: 11px;
                font-weight: 500;
                margin-top: 4px;
                display: inline-block;
            }

            .item-type.contact-message {
                background: #ede9fe;
                color: #5b21b6;
            }

            .item-type.support-ticket {
                background: #dbeafe;
                color: #1d4ed8;
            }

            /* Empty State */
            .support-empty-state, .loading-state {
                text-align: center;
                padding: 40px 20px;
                color: #6b7280;
            }

            .support-empty-icon, .loading-state i {
                font-size: 48px;
                margin-bottom: 16px;
                opacity: 0.5;
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

            /* Reply Templates */
            .reply-templates {
                margin-bottom: 20px;
            }

            .template-buttons {
                display: flex;
                gap: 8px;
                flex-wrap: wrap;
                margin-top: 8px;
            }

            .template-btn {
                padding: 8px 12px;
                border: 1px solid #d1d5db;
                border-radius: 4px;
                background: #fff;
                color: #374151;
                font-size: 13px;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .template-btn:hover {
                background: #f9fafb;
                border-color: #9ca3af;
            }

            .template-btn.active {
                background: #2563eb;
                color: #fff;
                border-color: #2563eb;
            }

            /* Action Buttons */
            .reply-actions {
                display: flex;
                gap: 12px;
                justify-content: flex-end;
                padding-top: 16px;
                border-top: 1px solid #e5e7eb;
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

            /* Large Modal Styles */
            .unified-modal-content.large {
                max-width: 900px;
                width: 95%;
                max-height: 90vh;
            }

            .large-modal .unified-modal-header {
                background: #f8fafc;
                border-bottom: 2px solid #e5e7eb;
            }

            /* Ticket View Styles */
            .ticket-view-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 24px;
                padding: 20px;
                background: #f8fafc;
                border-radius: 8px;
                border: 1px solid #e5e7eb;
            }

            .ticket-info h2 {
                color: #111827;
                margin: 0 0 12px 0;
                font-size: 20px;
                font-weight: 600;
            }

            .ticket-metadata {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }

            .meta-row {
                display: flex;
                gap: 24px;
                flex-wrap: wrap;
            }

            .meta-item {
                display: flex;
                align-items: center;
                gap: 6px;
                color: #6b7280;
                font-size: 14px;
            }

            .meta-item strong {
                color: #374151;
                font-weight: 500;
            }

            .meta-item i {
                color: #9ca3af;
                width: 16px;
            }

            .category-badge {
                background: #dbeafe;
                color: #1d4ed8;
                padding: 2px 8px;
                border-radius: 12px;
                font-size: 12px;
                font-weight: 500;
            }

            .ticket-status-panel {
                text-align: right;
            }

            .status-badges {
                display: flex;
                flex-direction: column;
                gap: 6px;
                margin-bottom: 12px;
            }

            .status-badge, .priority-badge {
                padding: 4px 12px;
                border-radius: 12px;
                font-size: 11px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.05em;
            }

            .status-badge.open { background: #fef3c7; color: #92400e; }
            .status-badge.replied { background: #dbeafe; color: #1d4ed8; }
            .status-badge.in-progress { background: #fed7d7; color: #c53030; }
            .status-badge.resolved { background: #d1fae5; color: #065f46; }
            .status-badge.closed { background: #f3f4f6; color: #4b5563; }

            .priority-badge.low { background: #f0f9ff; color: #0284c7; }
            .priority-badge.medium { background: #fef3c7; color: #d97706; }
            .priority-badge.high { background: #fed7d7; color: #dc2626; }
            .priority-badge.urgent { background: #fde7e7; color: #991b1b; }

            .status-actions {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }

            .status-select, .priority-select {
                padding: 6px 10px;
                border: 1px solid #d1d5db;
                border-radius: 6px;
                font-size: 12px;
                background: #fff;
                color: #374151;
                cursor: pointer;
            }

            .status-select:focus, .priority-select:focus {
                outline: none;
                border-color: #2563eb;
                box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
            }

            /* Original Message Section */
            .ticket-original-message {
                margin-bottom: 24px;
            }

            .ticket-original-message h4 {
                color: #111827;
                margin: 0 0 12px 0;
                font-size: 16px;
                font-weight: 600;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .message-content {
                background: #f9fafb;
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                padding: 16px;
                position: relative;
            }

            .message-content p {
                margin: 0;
                color: #374151;
                line-height: 1.6;
            }

            .message-time {
                display: flex;
                align-items: center;
                gap: 6px;
                margin-top: 12px;
                padding-top: 12px;
                border-top: 1px solid #e5e7eb;
                color: #6b7280;
                font-size: 12px;
            }

            /* Ticket Actions */
            .ticket-actions {
                border-top: 2px solid #e5e7eb;
                padding-top: 20px;
                margin-top: 24px;
            }

            .action-buttons {
                display: flex;
                gap: 10px;
                flex-wrap: wrap;
            }

            .btn {
                padding: 8px 16px;
                border: none;
                border-radius: 6px;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 6px;
                transition: all 0.2s ease;
                text-decoration: none;
                white-space: nowrap;
            }

            .btn-primary {
                background: #2563eb;
                color: #fff;
            }

            .btn-primary:hover {
                background: #1d4ed8;
                transform: translateY(-1px);
            }

            .btn-info {
                background: #0891b2;
                color: #fff;
            }

            .btn-info:hover {
                background: #0e7490;
                transform: translateY(-1px);
            }

            .btn-warning {
                background: #d97706;
                color: #fff;
            }

            .btn-warning:hover {
                background: #b45309;
                transform: translateY(-1px);
            }

            .btn-danger {
                background: #dc2626;
                color: #fff;
            }

            .btn-danger:hover {
                background: #b91c1c;
                transform: translateY(-1px);
            }

            .btn-secondary {
                background: #6b7280;
                color: #fff;
            }

            .btn-secondary:hover {
                background: #4b5563;
                transform: translateY(-1px);
            }

            /* Responsive Design for Ticket View */
            @media (max-width: 768px) {
                .ticket-view-header {
                    flex-direction: column;
                    gap: 16px;
                }

                .ticket-status-panel {
                    text-align: left;
                }

                .meta-row {
                    flex-direction: column;
                    gap: 8px;
                }

                .action-buttons {
                    flex-direction: column;
                }

                .btn {
                    justify-content: center;
                }

                .unified-modal-content.large {
                    width: 98%;
                    margin: 10px;
                }
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
        `;

        document.head.appendChild(style);
    }
}

// Initialize the unified system and disable the old systems
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM Content Loaded - Initializing Unified Communication System');
    
    // Disable old systems
    window.enhancedComm = null;
    window.supportSystem = null;
    
    // Initialize unified system
    window.unifiedComm = new UnifiedCommunicationSystem();
    
    console.log('🌐 window.unifiedComm assigned:', !!window.unifiedComm);
});

// Export for external use
window.UnifiedCommunicationSystem = UnifiedCommunicationSystem;
