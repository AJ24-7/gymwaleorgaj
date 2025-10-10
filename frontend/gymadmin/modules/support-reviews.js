// === Enhanced Support & Reviews Management System ===
// Comprehensive system for notifications, reviews, grievances, and communications
// Designed with modern UI/UX patterns similar to the payment tab

class SupportReviewsManager {
    constructor() {
        this.currentTab = 'notifications';
        this.notifications = [];
        this.reviews = [];
        this.grievances = [];
        this.communications = [];
        this.currentGymId = null;
        this.gymProfile = null;
        this.BASE_URL = 'http://localhost:5000';
        this.stats = {
            notifications: { total: 0, unread: 0, system: 0, priority: 0 },
            reviews: { total: 0, average: 0, pending: 0, recent: 0 },
            grievances: { total: 0, open: 0, resolved: 0, urgent: 0 },
            communications: { total: 0, unread: 0, active: 0, responseTime: 0 }
        };
        this.init();
    }

    init() {
        console.log('🚀 Initializing Enhanced Support & Reviews Manager');
        this.bindEvents();
        this.fetchGymId();
        this.initializeModalEnhancements();
        this.performSystemDiagnostics();
    }

    // System diagnostics to identify issues
    async performSystemDiagnostics() {
        console.log('🔍 Performing system diagnostics...');
        
        const diagnostics = {
            tokenStatus: 'checking',
            gymAuthStatus: 'checking',
            apiConnectivity: 'checking',
            enhancedIntegrationStatus: 'checking'
        };
        
        // Check tokens
        const tokens = {
            gymAdminToken: localStorage.getItem('gymAdminToken'),
            gymAuthToken: localStorage.getItem('gymAuthToken'),
            token: localStorage.getItem('token')
        };
        
        diagnostics.tokenStatus = Object.values(tokens).some(t => t) ? 'available' : 'missing';
        console.log('🔐 Token status:', diagnostics.tokenStatus, tokens);
        
        // Check enhanced integration
        diagnostics.enhancedIntegrationStatus = window.enhancedSupportIntegration ? 'available' : 'missing';
        console.log('🔧 Enhanced integration:', diagnostics.enhancedIntegrationStatus);
        
        // Check API connectivity
        try {
            const token = this.getAuthToken();
            const response = await fetch(`${this.BASE_URL}/api/gym/communication/test`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            diagnostics.apiConnectivity = response.ok ? 'connected' : `error_${response.status}`;
        } catch (error) {
            diagnostics.apiConnectivity = `network_error: ${error.message}`;
        }
        
        console.log('🏥 System Diagnostics Report:', diagnostics);
        
        // Show status in UI if there are issues
        if (diagnostics.tokenStatus === 'missing' || 
            diagnostics.apiConnectivity.startsWith('error') || 
            diagnostics.apiConnectivity.startsWith('network_error')) {
            this.showSystemStatusWarning(diagnostics);
        }
    }

    showSystemStatusWarning(diagnostics) {
        const warning = `
            ⚠️ Support System Status Issues Detected:
            - Token: ${diagnostics.tokenStatus}
            - API: ${diagnostics.apiConnectivity}
            - Enhanced Integration: ${diagnostics.enhancedIntegrationStatus}
            
            Some features may work in limited mode.
        `;
        console.warn(warning);
    }

    // Initialize modal enhancements
    initializeModalEnhancements() {
        // Ensure all support modals have proper event handlers
        const modals = ['reviewReplyModal', 'raiseGrievanceModal', 'sendNotificationModal', 'grievanceDetailsModal', 'chatModal'];
        
        modals.forEach(modalId => {
            const modal = document.getElementById(modalId);
            if (modal) {
                // Add click outside to close functionality
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        this.closeModal();
                    }
                });
                
                // Add escape key to close functionality
                document.addEventListener('keydown', (e) => {
                    if (e.key === 'Escape' && modal.classList.contains('active')) {
                        this.closeModal();
                    }
                });
                
                console.log(`✅ Enhanced modal: ${modalId}`);
            }
        });
    }

    async fetchGymId() {
        try {
            // Try multiple token storage keys for compatibility
            const token = localStorage.getItem('gymAdminToken') || 
                         localStorage.getItem('gymAuthToken') || 
                         localStorage.getItem('token');
            
            if (!token) {
                console.error('❌ No gym admin token found');
                return;
            }

            // Enhanced token validation with detailed logging
            console.log('🔐 Using token for gym profile fetch');
            const response = await fetch(`${this.BASE_URL}/api/gyms/profile/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.gymProfile = data;
                this.currentGymId = data._id;
                console.log('✅ Gym profile fetched:', this.gymProfile.name || this.gymProfile.gymName);
                console.log('🏢 Gym ID:', this.currentGymId);
                this.loadInitialData();
            } else {
                console.error('❌ Failed to fetch gym profile:', response.status, response.statusText);
                // Try alternative endpoint for gym authentication
                await this.tryAlternativeAuth(token);
            }
        } catch (error) {
            console.error('❌ Error fetching gym profile:', error);
        }
    }

    async tryAlternativeAuth(token) {
        try {
            console.log('🔄 Trying alternative gym authentication...');
            const response = await fetch(`${this.BASE_URL}/api/gym/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.gymProfile = data;
                this.currentGymId = data._id || data.id;
                console.log('✅ Gym profile fetched via alternative route:', this.gymProfile.name || this.gymProfile.gymName);
                this.loadInitialData();
            } else {
                console.error('❌ Alternative auth also failed:', response.status);
                this.handleAuthFailure();
            }
        } catch (error) {
            console.error('❌ Alternative auth error:', error);
            this.handleAuthFailure();
        }
    }

    handleAuthFailure() {
        console.warn('⚠️ Authentication failed, using mock data for development');
        // Set mock gym data for development
        this.currentGymId = '6808bc380d3a005a225fc891'; // From the console log
        this.gymProfile = {
            _id: this.currentGymId,
            name: 'Demo Gym',
            email: 'demo@gym.com'
        };
        this.loadInitialData();
    }

    bindEvents() {
        console.log('🔗 Binding support tab events');
        
        // Tab navigation - Enhanced with better event handling and debugging
        document.addEventListener('click', (e) => {
            if (e.target.matches('.support-tab-btn') || e.target.closest('.support-tab-btn')) {
                e.preventDefault();
                e.stopPropagation();
                const tabBtn = e.target.closest('.support-tab-btn') || e.target;
                const tabName = tabBtn.dataset.tab;
                console.log(`🎯 Tab clicked: ${tabName}, current: ${this.currentTab}`);
                if (tabName && this.currentTab !== tabName) {
                    this.switchTab(tabName);
                }
                return false;
            }
        });

        // Header action buttons
        document.addEventListener('click', (e) => {
            if (e.target.matches('#supportSendNotificationBtn') || e.target.closest('#supportSendNotificationBtn')) {
                e.preventDefault();
                e.stopPropagation();
                this.openSendNotificationModal();
            }
            if (e.target.matches('#supportRaiseGrievanceBtn') || e.target.closest('#supportRaiseGrievanceBtn')) {
                e.preventDefault();
                e.stopPropagation();
                this.openRaiseGrievanceModal();
            }
            if (e.target.matches('#startCommunicationBtn') || e.target.closest('#startCommunicationBtn')) {
                e.preventDefault();
                e.stopPropagation();
                this.openStartCommunicationModal();
            }
        });

        // Modal controls with enhanced event handling
        document.addEventListener('click', (e) => {
            // Check for modal close buttons
            if (e.target.matches('.support-modal-close') || e.target.closest('.support-modal-close')) {
                e.preventDefault();
                e.stopPropagation();
                this.closeModal();
                return;
            }
            
            // Check for clicking outside modal content
            if (e.target.matches('.support-modal') && !e.target.closest('.support-modal-content')) {
                e.preventDefault();
                e.stopPropagation();
                this.closeModal();
                return;
            }
            
            // Check for cancel buttons
            if (e.target.matches('#cancelNotification') || e.target.matches('#cancelGrievance')) {
                e.preventDefault();
                e.stopPropagation();
                this.closeModal();
                return;
            }
        });

        // Review reply buttons
        document.addEventListener('click', (e) => {
            if (e.target.matches('.review-action[data-action="reply"]') || e.target.closest('.review-action[data-action="reply"]')) {
                const reviewId = e.target.closest('.review-item').dataset.reviewId;
                this.openReplyModal(reviewId);
            }
            
            // Feature/Unfeature review
            if (e.target.matches('.review-action[data-action="feature"]') || e.target.closest('.review-action[data-action="feature"]')) {
                const reviewId = e.target.closest('.review-item').dataset.reviewId;
                const review = this.reviews.find(r => (r._id || r.id) === reviewId);
                const action = review?.isFeatured ? 'Unfeature' : 'Feature';
                
                this.showDialog({
                    title: `${action} Review`,
                    message: `Are you sure you want to ${action.toLowerCase()} this review?${action === 'Feature' ? '\n\nFeatured reviews will appear as badges on your gym details page.' : ''}`,
                    confirmText: action,
                    cancelText: 'Cancel',
                    iconHtml: `<div style="width:50px;height:50px;background:${action === 'Feature' ? '#FFD700' : '#6c757d'};border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto;"><i class="fas fa-star" style="color:white;font-size:24px;"></i></div>`,
                    onConfirm: () => {
                        this.toggleFeatureReview(reviewId);
                    }
                });
                return;
            }
            
            // Delete review
            if (e.target.matches('.review-action[data-action="delete"]') || e.target.closest('.review-action[data-action="delete"]')) {
                const reviewId = e.target.closest('.review-item').dataset.reviewId;
                const review = this.reviews.find(r => (r._id || r.id) === reviewId);
                const userName = this.getUserName(review);
                
                this.showDialog({
                    title: 'Delete Review',
                    message: `Are you sure you want to delete this review by ${userName}?\n\nThis action cannot be undone and the review will be permanently removed.`,
                    confirmText: 'Delete',
                    cancelText: 'Cancel',
                    iconHtml: '<div style="width:50px;height:50px;background:#dc3545;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto;"><i class="fas fa-trash" style="color:white;font-size:24px;"></i></div>',
                    onConfirm: () => {
                        this.deleteReview(reviewId);
                    }
                });
                return;
            }
        });

        // Notification actions
        document.addEventListener('click', (e) => {
            if (e.target.matches('.notification-action')) {
                const action = e.target.dataset.action;
                const notificationId = e.target.closest('.notification-item').dataset.notificationId;
                this.handleNotificationAction(action, notificationId);
            }
        });

        // Grievance actions
        document.addEventListener('click', (e) => {
            if (e.target.matches('.grievance-item')) {
                const grievanceId = e.target.dataset.grievanceId;
                this.openGrievanceDetails(grievanceId);
            }
        });

        // Form submissions
        document.addEventListener('submit', (e) => {
            if (e.target.matches('#sendNotificationForm')) {
                e.preventDefault();
                this.handleSendNotification(e.target);
            }
            if (e.target.matches('#raiseGrievanceForm')) {
                e.preventDefault();
                this.handleRaiseGrievance(e.target);
            }
            if (e.target.matches('#replyForm')) {
                e.preventDefault();
                this.handleReplySubmission(e.target);
            }
            if (e.target.matches('#notificationReplyForm')) {
                e.preventDefault();
                this.handleNotificationReplySubmission(e.target);
            }
            if (e.target.matches('#urgentResponseForm')) {
                e.preventDefault();
                this.handleUrgentResponseSubmission(e.target);
            }
            if (e.target.matches('#escalationForm')) {
                e.preventDefault();
                this.handleEscalationFormSubmission(e.target);
            }
        });

        // Search and filters
        document.addEventListener('input', (e) => {
            if (e.target.matches('.support-search')) {
                this.handleSearch(e.target.value, this.currentTab);
            }
        });

        document.addEventListener('change', (e) => {
            if (e.target.matches('.support-filter')) {
                this.handleFilter(e.target.value, this.currentTab);
            }
        });
    }

    switchTab(tabName) {
        if (!tabName || this.currentTab === tabName) return;
        
        console.log(`🔄 Switching from ${this.currentTab} to ${tabName} tab`);
        
        // Update tab buttons with forced refresh
        document.querySelectorAll('.support-tab-btn').forEach(btn => {
            btn.classList.remove('active');
            btn.style.pointerEvents = 'auto'; // Ensure buttons are clickable
        });
        
        const targetBtn = document.querySelector(`[data-tab="${tabName}"]`);
        if (targetBtn) {
            targetBtn.classList.add('active');
            targetBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        // Update tab content with animation
        document.querySelectorAll('.support-section').forEach(section => {
            section.classList.remove('active');
            section.style.display = 'none';
        });
        
        const targetSection = document.getElementById(`${tabName}Section`);
        if (targetSection) {
            targetSection.style.display = 'block';
            // Force reflow before adding active class for smooth animation
            targetSection.offsetHeight;
            targetSection.classList.add('active');
        }

        this.currentTab = tabName;
        this.loadTabData(tabName);
        
        console.log(`✅ Successfully switched to ${tabName} tab`);
    }

    async loadInitialData() {
        console.log('📊 Loading initial data for Support & Reviews');
        await Promise.all([
            this.loadNotifications(),
            this.loadReviews(),
            this.loadGrievances(),
            this.loadCommunications()
        ]);
        this.updateStats();
        // Ensure notifications tab is active by default
        this.switchTab('notifications');
        console.log('📊 Initial data loaded successfully');
    }

    async loadTabData(tabName) {
        switch (tabName) {
            case 'notifications':
                this.renderNotifications();
                break;
            case 'reviews':
                this.renderReviews();
                break;
            case 'grievances':
                this.renderGrievances();
                break;
            case 'communications':
                this.renderCommunications();
                break;
        }
    }

    async loadNotifications() {
        try {
            const token = localStorage.getItem('gymAdminToken') || localStorage.getItem('gymAuthToken');
            const response = await fetch(`${this.BASE_URL}/api/gym/notifications`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.notifications = data.notifications || [];
                this.updateNotificationStats();
                console.log('✅ Notifications loaded:', this.notifications.length);
            } else {
                console.error('Failed to load notifications:', response.status);
                this.notifications = this.getMockNotifications();
                this.updateNotificationStats();
            }
        } catch (error) {
            console.error('Error loading notifications:', error);
            this.notifications = this.getMockNotifications();
            this.updateNotificationStats();
        }
    }

    async loadReviews() {
        try {
            const token = localStorage.getItem('gymAdminToken') || localStorage.getItem('gymAuthToken');
            if (!this.currentGymId) {
                console.error('No gym ID available for loading reviews');
                this.reviews = this.getMockReviews();
                this.updateReviewStats();
                return;
            }

            const response = await fetch(`${this.BASE_URL}/api/reviews/gym/${this.currentGymId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.reviews = data.reviews || data; // Handle both response formats
                
                // Enhanced debugging: Log the first review with better formatting
                if (this.reviews.length > 0) {
                    const firstReview = this.reviews[0];
                    console.log('🔍 First review data structure:', {
                        reviewId: firstReview._id || firstReview.id,
                        user: firstReview.user,
                        userId: firstReview.userId,
                        reviewerName: firstReview.reviewerName,
                        userImagePath: this.getUserImage(firstReview),
                        userName: this.getUserName(firstReview)
                    });
                    
                    console.log('🔍 Profile image check:', {
                        hasUser: !!firstReview.user,
                        hasUserProfileImage: !!(firstReview.user?.profileImage),
                        userProfileImage: firstReview.user?.profileImage,
                        finalImageUrl: this.getUserImage(firstReview)
                    });
                }
                
                this.updateReviewStats();
                console.log('✅ Reviews loaded successfully:', this.reviews.length);
            } else {
                console.error('Failed to load reviews:', response.status, response.statusText);
                const errorData = await response.text();
                console.error('Error response:', errorData);
                this.reviews = this.getMockReviews();
                this.updateReviewStats();
            }
        } catch (error) {
            console.error('Error loading reviews:', error);
            this.reviews = this.getMockReviews();
            this.updateReviewStats();
        }
    }

    async loadGrievances() {
        try {
            const token = this.getAuthToken();
            console.log('📋 Loading grievances for gym:', this.currentGymId);
            
            // First try to load from integrated support system
            if (window.enhancedSupportIntegration) {
                const supportTickets = await window.enhancedSupportIntegration.fetchSupportTickets({
                    category: 'complaint',
                    status: 'all'
                });
                
                if (supportTickets && supportTickets.length > 0) {
                    this.grievances = supportTickets.map(ticket => ({
                        _id: ticket.ticketId,
                        id: ticket.ticketId,
                        title: ticket.subject || ticket.title,
                        description: ticket.description || ticket.message,
                        priority: ticket.priority || 'medium',
                        status: ticket.status || 'open',
                        createdAt: ticket.createdAt,
                        member: ticket.userDetails || { name: 'Member' },
                        metadata: ticket.metadata || {}
                    }));
                    this.updateGrievanceStats();
                    console.log('✅ Grievances loaded from integrated system:', this.grievances.length);
                    return;
                }
            }
            
            // Try gym communication routes first
            try {
                const commResponse = await fetch(`${this.BASE_URL}/api/gym/communication/grievances/${this.currentGymId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (commResponse.ok) {
                    const data = await commResponse.json();
                    this.grievances = data.grievances || data.tickets || [];
                    this.updateGrievanceStats();
                    console.log('✅ Grievances loaded from gym communication API:', this.grievances.length);
                    return;
                }
            } catch (commError) {
                console.log('ℹ️ Gym communication API not available, trying support API');
            }
            
            // Fallback to direct support API call
            const response = await fetch(`${this.BASE_URL}/api/support/grievances/gym/${this.currentGymId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.grievances = data.tickets || data.grievances || [];
                this.updateGrievanceStats();
                console.log('✅ Grievances loaded from support API:', this.grievances.length);
            } else if (response.status === 401) {
                console.warn('⚠️ Authentication failed for grievances, using mock data');
                this.grievances = this.getMockGrievances();
                this.updateGrievanceStats();
            } else {
                console.error('Failed to load grievances:', response.status, response.statusText);
                this.grievances = this.getMockGrievances();
                this.updateGrievanceStats();
            }
        } catch (error) {
            console.error('❌ Error loading grievances:', error);
            this.grievances = this.getMockGrievances();
            this.updateGrievanceStats();
        }
    }

    async loadCommunications() {
        try {
            const token = this.getAuthToken();
            console.log('💬 Loading communications for gym:', this.currentGymId);
            
            // Try enhanced gym communication endpoint first
            try {
                const response = await fetch(`${this.BASE_URL}/api/gym/communication/messages/${this.currentGymId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    this.communications = data.messages || data.communications || [];
                    this.updateCommunicationStats();
                    console.log('✅ Communications loaded via gym communication API:', this.communications.length);
                    return;
                }
            } catch (commError) {
                console.log('ℹ️ Gym communication API not available, trying support API');
            }
            
            // Fallback to support API
            const response = await fetch(`${this.BASE_URL}/api/support/gym/${this.currentGymId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.communications = data.tickets || data.communications || [];
                this.updateCommunicationStats();
                console.log('✅ Communications loaded via support API:', this.communications.length);
            } else if (response.status === 401) {
                console.warn('⚠️ Authentication failed for communications, using mock data');
                this.communications = this.getMockCommunications();
                this.updateCommunicationStats();
            } else if (response.status === 500) {
                console.error('❌ Server error loading communications (500), using mock data');
                this.communications = this.getMockCommunications();
                this.updateCommunicationStats();
            } else {
                console.error('Failed to load communications:', response.status, response.statusText);
                this.communications = this.getMockCommunications();
                this.updateCommunicationStats();
            }
        } catch (error) {
            console.error('❌ Error loading communications:', error);
            this.communications = this.getMockCommunications();
            this.updateCommunicationStats();
        }
    }

    // Helper method to get authentication token
    getAuthToken() {
        return localStorage.getItem('gymAdminToken') || 
               localStorage.getItem('gymAuthToken') || 
               localStorage.getItem('token');
    }

    updateStats() {
        // Update tab counters only (stats cards removed as requested)
        const notificationCounter = document.querySelector('[data-tab="notifications"] .tab-counter');
        const reviewCounter = document.querySelector('[data-tab="reviews"] .tab-counter');
        const grievanceCounter = document.querySelector('[data-tab="grievances"] .tab-counter');
        const communicationCounter = document.querySelector('[data-tab="communications"] .tab-counter');

        if (notificationCounter) notificationCounter.textContent = this.stats.notifications.unread;
        if (reviewCounter) reviewCounter.textContent = this.stats.reviews.pending;
        if (grievanceCounter) grievanceCounter.textContent = this.stats.grievances.open;
        if (communicationCounter) communicationCounter.textContent = this.stats.communications.unread;
    }

    updateNotificationStats() {
        this.stats.notifications.total = this.notifications.length;
        this.stats.notifications.unread = this.notifications.filter(n => !n.read).length;
        this.stats.notifications.system = this.notifications.filter(n => n.type === 'system').length;
        this.stats.notifications.priority = this.notifications.filter(n => n.priority === 'high' || n.priority === 'urgent').length;
    }

    updateReviewStats() {
        this.stats.reviews.total = this.reviews.length;
        this.stats.reviews.average = this.reviews.length > 0 
            ? this.reviews.reduce((sum, r) => sum + r.rating, 0) / this.reviews.length 
            : 0;
        this.stats.reviews.pending = this.reviews.filter(r => !r.adminReply).length;
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        this.stats.reviews.recent = this.reviews.filter(r => new Date(r.createdAt) > weekAgo).length;
    }

    updateGrievanceStats() {
        this.stats.grievances.total = this.grievances.length;
        this.stats.grievances.open = this.grievances.filter(g => g.status === 'open' || g.status === 'in-progress').length;
        this.stats.grievances.resolved = this.grievances.filter(g => g.status === 'resolved').length;
        this.stats.grievances.urgent = this.grievances.filter(g => g.priority === 'urgent').length;
    }

    updateCommunicationStats() {
        this.stats.communications.total = this.communications.length;
        this.stats.communications.unread = this.communications.filter(c => c.unreadCount > 0).length;
        this.stats.communications.active = this.communications.filter(c => c.status === 'active').length;
        this.stats.communications.responseTime = 2; // Mock average response time
    }

    renderNotifications() {
        const container = document.querySelector('#notificationsSection .notifications-list');
        if (!container) return;

        if (this.notifications.length === 0) {
            container.innerHTML = this.getEmptyState('notifications', 'No notifications yet', 'You\'ll see all gym notifications here');
            return;
        }

        container.innerHTML = this.notifications.map(notification => `
            <div class="notification-item ${notification.read ? '' : 'unread'}" data-notification-id="${notification._id || notification.id}">
                <div class="notification-header">
                    <div class="notification-title-section">
                        <div class="notification-icon">
                            <i class="fas ${this.getNotificationIcon(notification.type, notification.priority)}"></i>
                        </div>
                        <div class="notification-title-content">
                            <h4 class="notification-title">
                                ${notification.title}
                                ${notification.metadata?.ticketId ? `<span class="ticket-id">#${notification.metadata.ticketId}</span>` : ''}
                            </h4>
                        </div>
                    </div>
                    <div class="notification-meta">
                        ${notification.type !== 'grievance-reply' ? `<span class="notification-badge ${notification.type} ${notification.priority}">${notification.type}</span>` : ''}
                        <span class="notification-priority priority-${notification.priority}">${notification.priority}</span>
                        <span class="notification-time">${this.formatDate(notification.createdAt)}</span>
                    </div>
                </div>
                ${notification.metadata?.adminMessage ? `
                    <p class="notification-message admin-main-message">${notification.metadata.adminMessage}</p>
                ` : `
                    <p class="notification-message">${notification.message}</p>
                `}
                <div class="notification-actions">
                    ${!notification.read ? `<button class="notification-action primary" data-action="mark-read">
                        <i class="fas fa-check"></i> Mark as Read
                    </button>` : ''}
                    ${this.canReplyToNotification(notification) ? `<button class="notification-action reply" data-action="reply">
                        <i class="fas fa-reply"></i> Reply
                    </button>` : ''}
                    ${notification.priority === 'high' || notification.priority === 'urgent' ? `<button class="notification-action urgent" data-action="respond">
                        <i class="fas fa-exclamation-triangle"></i> Respond
                    </button>` : ''}
                    <button class="notification-action view" data-action="view-details">
                        <i class="fas fa-eye"></i> View Details
                    </button>
                </div>
            </div>
        `).join('');
    }

    renderReviews() {
        const container = document.querySelector('#reviewsSection .reviews-list');
        if (!container) return;

        if (this.reviews.length === 0) {
            container.innerHTML = this.getEmptyState('reviews', 'No reviews yet', 'Member reviews will appear here');
            return;
        }

        container.innerHTML = this.reviews.map(review => `
            <div class="review-item" data-review-id="${review._id || review.id}">
                <div class="review-header">
                    <div class="review-user">
                        <img src="${this.getUserImage(review)}" 
                             alt="Member" 
                             class="review-avatar"
                             onerror="this.src='${this.BASE_URL}/uploads/profile-pics/default.png'; this.style.border='2px solid #ccc';">
                        <div class="review-user-info">
                            <h4>${this.getUserName(review)}</h4>
                            <p>${this.formatDate(review.createdAt)}</p>
                        </div>
                    </div>
                    <div class="review-rating-section">
                        <div class="review-rating">
                            ${this.renderStars(review.rating)}
                        </div>
                        ${review.isFeatured ? '<span class="featured-badge"><i class="fas fa-star"></i> Featured</span>' : ''}
                    </div>
                </div>
                <div class="review-content">${review.comment}</div>
                ${this.renderAdminReply(review)}
                <div class="review-actions">
                    ${!review.adminReply ? `<button class="review-action primary" data-action="reply"><i class="fas fa-reply"></i> Reply</button>` : ''}
                    <button class="review-action ${review.isFeatured ? 'featured' : ''}" data-action="feature">
                        <i class="fas fa-star"></i> ${review.isFeatured ? 'Unfeature' : 'Feature'}
                    </button>
                    <button class="review-action danger" data-action="delete"><i class="fas fa-trash"></i> Delete</button>
                </div>
            </div>
        `).join('');
    }

    renderGrievances() {
        const container = document.querySelector('#grievancesSection .grievances-list');
        if (!container) return;

        if (this.grievances.length === 0) {
            container.innerHTML = this.getEmptyState('grievances', 'No grievances', 'Member grievances will be listed here');
            return;
        }

        container.innerHTML = this.grievances.map(grievance => `
            <div class="grievance-item ${grievance.status === 'escalated' ? 'escalated' : ''}" data-grievance-id="${grievance._id || grievance.id}">
                <div class="grievance-header">
                    <h4 class="grievance-title">${grievance.title}</h4>
                    <div class="grievance-meta">
                        <span class="grievance-priority ${grievance.priority}">${grievance.priority}</span>
                        <span class="grievance-status ${grievance.status}">${grievance.status}</span>
                        ${grievance.metadata?.escalationLevel ? `<span class="escalation-badge">${grievance.metadata.escalationLevel}</span>` : ''}
                    </div>
                </div>
                <p class="grievance-description">${grievance.description}</p>
                ${grievance.escalationReason ? `
                    <div class="escalation-info">
                        <strong>Escalation Reason:</strong> ${grievance.escalationReason}
                    </div>
                ` : ''}
                <div class="grievance-footer">
                    <div class="grievance-details">
                        <span>By ${grievance.member?.name || 'Anonymous'}</span>
                        <span>${this.formatDate(grievance.createdAt)}</span>
                        ${grievance.escalatedAt ? `<span>Escalated: ${this.formatDate(grievance.escalatedAt)}</span>` : ''}
                    </div>
                    <div class="grievance-actions">
                        <button class="grievance-action primary" data-action="view-details">
                            <i class="fas fa-eye"></i> View Details
                        </button>
                        ${grievance.status !== 'escalated' && grievance.status !== 'resolved' && grievance.status !== 'closed' ? `
                            <button class="grievance-action escalate" data-action="escalate">
                                <i class="fas fa-arrow-up"></i> Escalate to Admin
                            </button>
                        ` : ''}
                        ${grievance.status === 'open' ? `
                            <button class="grievance-action update" data-action="update-status" data-status="in-progress">
                                <i class="fas fa-play"></i> Start Processing
                            </button>
                        ` : ''}
                        ${(grievance.status === 'in-progress' || grievance.status === 'open') ? `
                            <button class="grievance-action resolve" data-action="update-status" data-status="resolved">
                                <i class="fas fa-check"></i> Mark Resolved
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `).join('');

        // Bind escalation action handlers
        container.addEventListener('click', this.handleGrievanceActions.bind(this));
    }

    async handleGrievanceActions(event) {
        const button = event.target.closest('[data-action]');
        if (!button) return;

        const grievanceItem = button.closest('.grievance-item');
        const grievanceId = grievanceItem?.dataset.grievanceId;
        const action = button.dataset.action;
        const status = button.dataset.status;

        if (!grievanceId) return;

        switch (action) {
            case 'view-details':
                this.openGrievanceDetails(grievanceId);
                break;
            
            case 'escalate':
                this.openEscalationModal(grievanceId);
                break;
            
            case 'update-status':
                await this.updateGrievanceStatus(grievanceId, status);
                break;
        }
    }

    openEscalationModal(grievanceId) {
        const grievance = this.grievances.find(g => (g._id || g.id) === grievanceId);
        if (!grievance) return;

        const modal = document.getElementById('escalationModal') || this.createEscalationModal();
        const modalHeader = modal.querySelector('.support-modal-header h3');
        const modalBody = modal.querySelector('.support-modal-body');

        if (modalHeader) {
            modalHeader.innerHTML = `<i class="fas fa-arrow-up"></i> Escalate Grievance to Main Admin`;
        }

        if (modalBody) {
            modalBody.innerHTML = `
                <div class="escalation-form-container">
                    <div class="grievance-summary">
                        <h4>${grievance.title}</h4>
                        <p><strong>Current Status:</strong> ${grievance.status}</p>
                        <p><strong>Priority:</strong> ${grievance.priority}</p>
                        <p><strong>Description:</strong> ${grievance.description}</p>
                    </div>
                    
                    <form id="escalationForm" data-grievance-id="${grievanceId}">
                        <div class="form-group">
                            <label for="escalationReason">Reason for Escalation:</label>
                            <textarea id="escalationReason" name="escalationReason" required rows="3" 
                                placeholder="Explain why this grievance needs admin attention..."></textarea>
                        </div>
                        
                        <div class="form-group">
                            <label for="escalationPriority">Escalation Priority:</label>
                            <select id="escalationPriority" name="escalationPriority" required>
                                <option value="medium">Medium - Standard escalation</option>
                                <option value="high">High - Urgent attention needed</option>
                                <option value="urgent">Urgent - Critical issue</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" name="requestCallback" checked>
                                <span class="checkmark"></span>
                                Request callback from main admin
                            </label>
                        </div>

                        <div class="escalation-warning">
                            <i class="fas fa-exclamation-triangle"></i>
                            <p>Escalating this grievance will notify the main admin team and may result in direct intervention. Please ensure you have attempted to resolve this issue at the gym level first.</p>
                        </div>
                        
                        <div class="support-modal-footer">
                            <button type="button" class="btn-secondary" onclick="supportManager.closeModal()">Cancel</button>
                            <button type="submit" class="btn-primary escalate">
                                <i class="fas fa-arrow-up"></i> Escalate to Admin
                            </button>
                        </div>
                    </form>
                </div>
            `;
        }

        modal.classList.add('active');
    }

    createEscalationModal() {
        const modal = document.createElement('div');
        modal.id = 'escalationModal';
        modal.className = 'support-modal';
        modal.innerHTML = `
            <div class="support-modal-content large">
                <div class="support-modal-header">
                    <h3><i class="fas fa-arrow-up"></i> Escalate to Admin</h3>
                    <button class="support-modal-close">&times;</button>
                </div>
                <div class="support-modal-body">
                    <!-- Content will be populated dynamically -->
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        return modal;
    }

    renderCommunications() {
        const container = document.querySelector('#communicationsSection .communications-layout');
        if (!container) return;

        if (this.communications.length === 0) {
            container.innerHTML = `
                <div class="conversations-sidebar">
                    <div class="conversations-list">
                        ${this.getEmptyState('communications', 'No conversations', 'Start communicating with members')}
                    </div>
                </div>
                <div class="chat-main">
                    <div class="chat-container">
                        <div class="chat-placeholder">
                            <i class="fas fa-comments"></i>
                            <h3>Select a conversation</h3>
                            <p>Choose a conversation from the sidebar to view messages</p>
                        </div>
                    </div>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="conversations-sidebar">
                <div class="conversations-list">
                    ${this.communications.map(comm => `
                        <div class="conversation-item ${comm.unreadCount > 0 ? 'unread' : ''}" data-conversation-id="${comm._id}">
                            <div class="conversation-header">
                                <span class="conversation-name">${comm.member?.name || 'Unknown Member'}</span>
                                <span class="conversation-time">${this.formatTime(comm.lastMessage?.createdAt)}</span>
                            </div>
                            <div class="conversation-preview">${comm.lastMessage?.content || 'No messages yet'}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
            <div class="chat-main">
                <div class="chat-container">
                    <div class="chat-placeholder">
                        <i class="fas fa-comments"></i>
                        <h3>Select a conversation</h3>
                        <p>Choose a conversation from the sidebar to view messages</p>
                    </div>
                </div>
            </div>
        `;
    }

    // Modal Functions - Enhanced with consistent styling
    openSendNotificationModal() {
        this.openModal('sendNotificationModal');
    }

    openRaiseGrievanceModal() {
        this.openModal('raiseGrievanceModal');
    }

    openStartCommunicationModal() {
        this.openModal('startCommunicationModal');
    }

    openReplyModal(reviewId) {
        const modal = document.getElementById('reviewReplyModal');
        const review = this.reviews.find(r => (r._id || r.id) === reviewId);
        
        if (review && modal) {
            // Populate review details in modal
            const reviewDetails = modal.querySelector('.review-details, #reviewDetailsDisplay');
            if (reviewDetails) {
                reviewDetails.innerHTML = `
                    <div class="review-header">
                        <div class="review-user">
                            <img src="${this.getUserImage(review)}" 
                                 alt="Member" 
                                 class="review-avatar"
                                 onerror="this.src='${this.BASE_URL}/uploads/profile-pics/default.png'; this.style.border='2px solid #ccc';">
                            <div class="review-user-info">
                                <h4>${this.getUserName(review)}</h4>
                                <div class="review-rating">${this.renderStars(review.rating)}</div>
                            </div>
                        </div>
                    </div>
                    <div class="review-content">${review.comment}</div>
                `;
            }
            
            const replyForm = modal.querySelector('#replyForm, form');
            const replyTextarea = modal.querySelector('#adminReplyText, textarea[name="reply"]');
            
            if (replyForm) {
                replyForm.dataset.reviewId = reviewId;
            }
            
            if (replyTextarea) {
                replyTextarea.value = '';
                replyTextarea.placeholder = 'Write your professional reply to this review...';
            }
            
            // Use enhanced modal opening
            this.openModal('reviewReplyModal');
        }
    }

    openGrievanceDetails(grievanceId) {
        const modal = document.getElementById('grievanceDetailsModal');
        const grievance = this.grievances.find(g => (g._id || g.id) === grievanceId);
        
        if (grievance && modal) {
            const modalHeader = modal.querySelector('.support-modal-header h3');
            const modalBody = modal.querySelector('.support-modal-body');
            
            if (modalHeader) {
                modalHeader.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${grievance.title}`;
            }
            
            if (modalBody) {
                modalBody.innerHTML = `
                    <div class="grievance-details">
                        <div class="detail-row">
                            <label>Status:</label>
                            <span class="grievance-status ${grievance.status}">${grievance.status}</span>
                        </div>
                        <div class="detail-row">
                            <label>Priority:</label>
                            <span class="grievance-priority ${grievance.priority}">${grievance.priority}</span>
                        </div>
                        <div class="detail-row">
                            <label>Submitted by:</label>
                            <span>${grievance.member?.name || 'Anonymous'}</span>
                        </div>
                        <div class="detail-row">
                            <label>Date:</label>
                            <span>${this.formatDate(grievance.createdAt)}</span>
                        </div>
                        <div class="detail-section">
                            <label>Description:</label>
                            <p>${grievance.description}</p>
                        </div>
                        ${grievance.evidence ? `
                            <div class="detail-section">
                                <label>Evidence:</label>
                                <div class="evidence-files">
                                    ${grievance.evidence.map(file => `<a href="${file.url}" target="_blank">${file.name}</a>`).join(', ')}
                                </div>
                            </div>
                        ` : ''}
                    </div>
                    <div class="grievance-actions" style="margin-top: 24px;">
                        <button class="btn-primary" onclick="supportManager.updateGrievanceStatus('${grievanceId}', 'in-progress')">
                            <i class="fas fa-play"></i> Start Processing
                        </button>
                        <button class="btn-primary" onclick="supportManager.updateGrievanceStatus('${grievanceId}', 'resolved')">
                            <i class="fas fa-check"></i> Mark Resolved
                        </button>
                        <button class="btn-secondary" onclick="supportManager.respondToGrievance('${grievanceId}')">
                            <i class="fas fa-reply"></i> Respond
                        </button>
                    </div>
                `;
            }
            modal.classList.add('active');
        }
    }

    closeModal() {
        // Close all support modals with smooth transition
        document.querySelectorAll('.support-modal, .modal').forEach(modal => {
            if (modal.classList.contains('active')) {
                modal.classList.remove('active');
                // Add fade-out effect
                modal.style.transition = 'all 0.3s ease';
                modal.style.opacity = '0';
                modal.style.transform = 'scale(0.9)';
                
                setTimeout(() => {
                    modal.style.display = 'none';
                    modal.style.opacity = '';
                    modal.style.transform = '';
                }, 300);
            }
        });
    }

    // Enhanced modal opening with consistent styling
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'flex';
            modal.style.opacity = '0';
            modal.style.transform = 'scale(0.9)';
            modal.classList.add('active');
            
            // Force reflow and add smooth entrance
            requestAnimationFrame(() => {
                modal.style.transition = 'all 0.3s ease';
                modal.style.opacity = '1';
                modal.style.transform = 'scale(1)';
            });
            
            // Ensure modal content is properly styled
            const modalContent = modal.querySelector('.support-modal-content, .modal-content');
            if (modalContent) {
                modalContent.style.animation = 'modalSlideIn 0.3s ease-out';
            }
        }
    }

    // Form Handlers
    async handleSendNotification(form) {
        const formData = new FormData(form);
        const notificationData = {
            title: formData.get('title'),
            message: formData.get('message'),
            type: formData.get('type'),
            priority: formData.get('priority'),
            targetType: formData.get('targetType'),
            recipients: formData.get('recipients')?.split(',').map(r => r.trim()) || []
        };

        try {
            const token = localStorage.getItem('gymAdminToken') || localStorage.getItem('gymAuthToken');
            
            // Check if this is for main admin
            if (notificationData.targetType === 'admin' || notificationData.targetType === 'main-admin') {
                const gymProfile = window.currentGymProfile || this.gymProfile || {};
                
                // Send to main admin notification system
                const response = await fetch(`${this.BASE_URL}/api/admin/notifications/send`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        title: notificationData.title,
                        message: notificationData.message,
                        type: notificationData.type || 'gym-admin-message',
                        priority: notificationData.priority || 'medium',
                        icon: this.getNotificationIcon(notificationData.type, notificationData.priority),
                        color: this.getNotificationColor(notificationData.type, notificationData.priority),
                        metadata: {
                            source: 'gym-admin',
                            timestamp: new Date().toISOString(),
                            originalType: notificationData.type
                        },
                        gym: {
                            gymId: gymProfile._id || gymProfile.gymId || this.currentGymId,
                            gymName: gymProfile.gymName || 'Unknown Gym',
                            address: gymProfile.address || '',
                            email: gymProfile.email || '',
                            phone: gymProfile.phone || ''
                        }
                    })
                });

                if (response.ok) {
                    this.showSuccessMessage('Notification sent to main admin successfully!');
                    console.log('✅ Notification sent to main admin');
                } else {
                    throw new Error('Failed to send notification to main admin');
                }
            } else {
                // Send to gym members/trainers (existing logic)
                console.log('Sending notification to gym users:', notificationData);
                this.showSuccessMessage('Notification sent successfully!');
            }
            
            this.closeModal();
            form.reset();
            
            // Refresh notifications
            await this.loadNotifications();
            this.renderNotifications();
            this.updateStats();
            
        } catch (error) {
            console.error('Error sending notification:', error);
            this.showErrorMessage('Failed to send notification. Please try again.');
        }
    }

    async handleRaiseGrievance(form) {
        const formData = new FormData(form);
        const grievanceData = {
            title: formData.get('title'),
            subject: formData.get('title'), // Ensure both title and subject are set
            description: formData.get('description'),
            category: 'complaint', // Always set as complaint for grievances
            priority: formData.get('priority') || 'medium',
            affectedMembers: formData.get('affectedMembers')?.split(',').map(m => m.trim()) || [],
            metadata: {
                gymId: this.currentGymId,
                gymName: this.gymProfile?.name || this.gymProfile?.gymName || 'Unknown Gym',
                submittedBy: 'gym-admin',
                escalationLevel: 'gym-initiated',
                requiresAdminReview: true
            }
        };

        try {
            console.log('📝 Creating grievance:', grievanceData);
            
            // Use integrated support system if available
            if (window.enhancedSupportIntegration) {
                const ticket = await window.enhancedSupportIntegration.createSupportTicket(grievanceData);
                if (ticket) {
                    this.showSuccessMessage('Grievance raised and sent to main admin successfully!');
                    
                    // Add to local grievances list
                    this.grievances.unshift({
                        _id: ticket.ticketId,
                        id: ticket.ticketId,
                        title: grievanceData.title,
                        description: grievanceData.description,
                        priority: grievanceData.priority,
                        status: 'open',
                        createdAt: new Date().toISOString(),
                        member: { name: 'Gym Admin' },
                        metadata: grievanceData.metadata
                    });
                    
                    this.closeModal();
                    form.reset();
                    this.renderGrievances();
                    this.updateStats();
                    console.log('✅ Grievance created through integrated system');
                    return { success: true, grievanceData, ticket };
                }
            }
            
            // Try enhanced gym communication API first
            const token = this.getAuthToken();
            try {
                const response = await fetch(`${this.BASE_URL}/api/gym/communication/support/create`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(grievanceData)
                });

                if (response.ok) {
                    const result = await response.json();
                    this.showSuccessMessage('Grievance raised and sent to main admin successfully!');
                    console.log('✅ Grievance created via gym communication API:', result);
                    
                    // Add to local grievances list
                    this.grievances.unshift({
                        _id: result.supportTicket?.ticketId,
                        id: result.supportTicket?.ticketId,
                        title: grievanceData.title,
                        description: grievanceData.description,
                        priority: grievanceData.priority,
                        status: 'open',
                        createdAt: new Date().toISOString(),
                        member: { name: 'Gym Admin' },
                        metadata: grievanceData.metadata
                    });
                    
                    this.closeModal();
                    form.reset();
                    this.renderGrievances();
                    this.updateStats();
                    return { success: true, result };
                } else {
                    console.warn('⚠️ Gym communication API failed, trying fallback');
                }
            } catch (commError) {
                console.warn('⚠️ Gym communication API error, trying fallback:', commError.message);
            }
            
            // Fallback to direct support API
            const response = await fetch(`${this.BASE_URL}/api/support/tickets`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ...grievanceData,
                    userType: 'Gym',
                    userId: this.currentGymId,
                    source: 'gym-admin-portal'
                })
            });

            if (response.ok) {
                const ticket = await response.json();
                this.showSuccessMessage('Grievance raised successfully!');
                console.log('✅ Grievance created via fallback API:', ticket);
                
                // Add to local grievances list
                this.grievances.unshift({
                    _id: ticket.ticketId || ticket._id,
                    id: ticket.ticketId || ticket._id,
                    title: grievanceData.title,
                    description: grievanceData.description,
                    priority: grievanceData.priority,
                    status: 'open',
                    createdAt: new Date().toISOString(),
                    member: { name: 'Gym Admin' },
                    metadata: grievanceData.metadata
                });
                
                this.closeModal();
                form.reset();
                this.renderGrievances();
                this.updateStats();
                console.log('✅ Grievance created via API');
                return { success: true, grievanceData, ticket };
            } else {
                throw new Error('Failed to create grievance');
            }
            
        } catch (error) {
            console.error('Error raising grievance:', error);
            this.showErrorMessage('Failed to raise grievance. Please try again.');
            return { success: false, error: error.message };
        }
    }

    // Enhanced grievance management with escalation
    async escalateGrievanceToAdmin(grievanceId, reason, priority = 'high') {
        try {
            if (window.enhancedSupportIntegration) {
                const success = await window.enhancedSupportIntegration.escalateTicket(grievanceId, reason, priority);
                if (success) {
                    const grievance = this.grievances.find(g => (g._id || g.id) === grievanceId);
                    if (grievance) {
                        grievance.status = 'escalated';
                        grievance.priority = priority;
                        grievance.escalatedAt = new Date().toISOString();
                        grievance.escalationReason = reason;
                    }
                    
                    this.showSuccessMessage('Grievance escalated to main admin successfully!');
                    this.renderGrievances();
                    this.updateStats();
                    console.log('✅ Grievance escalated successfully');
                    return true;
                }
            }
            
            // Fallback escalation
            const token = localStorage.getItem('gymAdminToken') || localStorage.getItem('gymAuthToken');
            const response = await fetch(`${this.BASE_URL}/api/support/tickets/${grievanceId}/escalate`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    reason: reason,
                    priority: priority,
                    escalateTo: 'main-admin'
                })
            });

            if (response.ok) {
                const updatedTicket = await response.json();
                const grievance = this.grievances.find(g => (g._id || g.id) === grievanceId);
                if (grievance) {
                    grievance.status = 'escalated';
                    grievance.priority = priority;
                    grievance.escalatedAt = new Date().toISOString();
                    grievance.escalationReason = reason;
                }
                
                this.showSuccessMessage('Grievance escalated successfully!');
                this.renderGrievances();
                this.updateStats();
                return true;
            }
        } catch (error) {
            console.error('Error escalating grievance:', error);
            this.showErrorMessage('Failed to escalate grievance. Please try again.');
        }
        return false;
    }

    async handleReplySubmission(form) {
        const formData = new FormData(form);
        const reviewId = form.dataset.reviewId;
        const replyData = {
            message: formData.get('message'),
            isPublic: formData.get('isPublic') === 'on'
        };

        try {
            // API call would go here
            console.log('Replying to review:', reviewId, replyData);
            
            // Mock success - update the review with reply
            const review = this.reviews.find(r => (r._id || r.id) === reviewId);
            if (review) {
                review.adminReply = replyData.message;
            }
            
            this.showSuccessMessage('Reply sent successfully!');
            this.closeModal();
            form.reset();
            
            // Refresh reviews
            this.renderReviews();
            this.updateStats();
            
        } catch (error) {
            console.error('Error sending reply:', error);
            this.showErrorMessage('Failed to send reply. Please try again.');
        }
    }

    async handleNotificationAction(action, notificationId) {
        try {
            const token = localStorage.getItem('gymAdminToken') || localStorage.getItem('gymAuthToken');
            const notification = this.notifications.find(n => (n._id || n.id) === notificationId);
            if (!notification) return;

            switch (action) {
                case 'mark-read':
                    const response = await fetch(`${this.BASE_URL}/api/gym/notifications/${notificationId}/read`, {
                        method: 'PUT',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    });
                    
                    if (response.ok) {
                        notification.read = true;
                        console.log('✅ Notification marked as read');
                        this.showSuccessMessage('Notification marked as read');
                    } else {
                        this.showErrorMessage('Failed to mark notification as read');
                    }
                    break;
                    
                case 'reply':
                    this.openNotificationReplyModal(notificationId);
                    return; // Don't re-render yet
                    
                case 'respond':
                    this.openNotificationResponseModal(notificationId);
                    return; // Don't re-render yet
                    
                case 'view-details':
                    this.openNotificationDetailsModal(notificationId);
                    return; // Don't re-render yet
            }

            this.renderNotifications();
            this.updateStats();
            
        } catch (error) {
            console.error(`Error ${action} notification:`, error);
            this.showErrorMessage(`Failed to ${action} notification`);
        }
    }

    async handleReplySubmission(form) {
        const formData = new FormData(form);
        const reviewId = form.dataset.reviewId;
        const replyData = {
            message: formData.get('message'),
            isPublic: formData.get('isPublic') === 'on'
        };

        try {
            const token = localStorage.getItem('gymAdminToken') || localStorage.getItem('gymAuthToken');
            const response = await fetch(`${this.BASE_URL}/api/reviews/${reviewId}/reply`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(replyData)
            });

            if (response.ok) {
                // Update the review with reply
                const review = this.reviews.find(r => (r._id || r.id) === reviewId);
                if (review) {
                    review.adminReply = replyData.message;
                }
                
                this.showSuccessMessage('Reply sent successfully!');
                this.closeModal();
                form.reset();
                
                // Refresh reviews
                this.renderReviews();
                this.updateStats();
                console.log('✅ Review reply submitted successfully');
            } else {
                throw new Error('Failed to submit reply');
            }
            
        } catch (error) {
            console.error('Error sending reply:', error);
            this.showErrorMessage('Failed to send reply. Please try again.');
        }
    }

    async updateGrievanceStatus(grievanceId, newStatus) {
        try {
            const grievance = this.grievances.find(g => (g._id || g.id) === grievanceId);
            if (grievance) {
                grievance.status = newStatus;
                // API call would go here for grievance status update
                console.log('Updated grievance status:', grievanceId, newStatus);
                
                this.showSuccessMessage(`Grievance ${newStatus} successfully!`);
                this.closeModal();
                this.renderGrievances();
                this.updateStats();
            }
        } catch (error) {
            console.error('Error updating grievance status:', error);
        }
    }

    // Search and Filter
    handleSearch(query, tabName) {
        // Implement search functionality based on current tab
        console.log(`Searching ${tabName} for:`, query);
    }

    handleFilter(filterValue, tabName) {
        // Implement filter functionality based on current tab
        console.log(`Filtering ${tabName} by:`, filterValue);
    }

    async handleNotificationReplySubmission(form) {
        const formData = new FormData(form);
        const notificationId = form.dataset.notificationId;
        const replyData = {
            message: formData.get('replyMessage'),
            priority: formData.get('replyPriority'),
            status: formData.get('replyStatus'),
            notifyMember: formData.get('notifyMember') === 'on'
        };

        try {
            const token = localStorage.getItem('gymAdminToken') || localStorage.getItem('gymAuthToken');
            const notification = this.notifications.find(n => (n._id || n.id) === notificationId);
            
            if (notification?.metadata?.ticketId) {
                // Send reply to the ticket system
                const response = await fetch(`${this.BASE_URL}/api/support/tickets/${notification.metadata.ticketId}/reply`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        message: replyData.message,
                        priority: replyData.priority,
                        status: replyData.status,
                        source: 'gym-admin',
                        notifyMember: replyData.notifyMember
                    })
                });

                if (response.ok) {
                    this.showSuccessMessage('Reply sent successfully!');
                    // Mark notification as read
                    notification.read = true;
                    console.log('✅ Notification reply submitted successfully');
                } else {
                    throw new Error('Failed to submit reply');
                }
            } else {
                // Send reply to main admin notification system using dedicated endpoint
                const gymProfile = window.currentGymProfile || this.gymProfile || {};
                
                const adminReplyResponse = await fetch(`${this.BASE_URL}/api/admin/notifications/reply`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        originalNotificationId: notificationId,
                        replyMessage: replyData.message,
                        priority: replyData.priority || 'medium',
                        status: replyData.status || 'replied',
                        gym: {
                            gymId: gymProfile._id || gymProfile.gymId || this.currentGymId,
                            gymName: gymProfile.gymName || 'Unknown Gym',
                            address: gymProfile.address || '',
                            email: gymProfile.email || '',
                            phone: gymProfile.phone || ''
                        }
                    })
                });

                if (adminReplyResponse.ok) {
                    const result = await adminReplyResponse.json();
                    this.showSuccessMessage('Reply sent to main admin successfully!');
                    notification.read = true;
                    console.log('✅ Reply sent to main admin notification system:', result);
                } else {
                    const error = await adminReplyResponse.json();
                    throw new Error(error.message || 'Failed to send reply to main admin');
                }
            }
            
            this.closeModal();
            form.reset();
            this.renderNotifications();
            this.updateStats();
            
        } catch (error) {
            console.error('Error sending notification reply:', error);
            this.showErrorMessage('Failed to send reply. Please try again.');
        }
    }

    openNotificationDetailsModal(notificationId) {
        const notification = this.notifications.find(n => (n._id || n.id) === notificationId);
        if (!notification) return;

        const modal = document.getElementById('notificationDetailsModal') || this.createNotificationDetailsModal();
        const modalHeader = modal.querySelector('.support-modal-header h3');
        const modalBody = modal.querySelector('.support-modal-body');
        
        if (modalHeader) {
            modalHeader.innerHTML = `<i class="fas ${this.getNotificationIcon(notification.type, notification.priority)}"></i> ${notification.title}`;
        }
        
        if (modalBody) {
            modalBody.innerHTML = `
                <div class="notification-details">
                    <div class="detail-grid">
                        <div class="detail-row">
                            <label>Type:</label>
                            <span class="notification-badge ${notification.type}">${notification.type}</span>
                        </div>
                        <div class="detail-row">
                            <label>Priority:</label>
                            <span class="notification-priority priority-${notification.priority}">${notification.priority}</span>
                        </div>
                        <div class="detail-row">
                            <label>Status:</label>
                            <span class="notification-status ${notification.read ? 'read' : 'unread'}">${notification.read ? 'Read' : 'Unread'}</span>
                        </div>
                        <div class="detail-row">
                            <label>Created:</label>
                            <span>${this.formatDate(notification.createdAt)}</span>
                        </div>
                        ${notification.metadata?.ticketId ? `
                            <div class="detail-row">
                                <label>Ticket ID:</label>
                                <span>${notification.metadata.ticketId}</span>
                            </div>
                        ` : ''}
                    </div>
                    <div class="detail-section">
                        <label>Message:</label>
                        <p class="notification-full-message">${notification.message}</p>
                    </div>
                    ${notification.metadata?.adminMessage ? `
                        <div class="detail-section">
                            <label>Admin Message:</label>
                            <p class="admin-message-full">${notification.metadata.adminMessage}</p>
                        </div>
                    ` : ''}
                    ${notification.metadata?.ticketSubject ? `
                        <div class="detail-section">
                            <label>Related Ticket Subject:</label>
                            <p>${notification.metadata.ticketSubject}</p>
                        </div>
                    ` : ''}
                </div>
            `;
        }
        
        modal.classList.add('active');
    }

    openNotificationResponseModal(notificationId) {
        const notification = this.notifications.find(n => (n._id || n.id) === notificationId);
        if (!notification) return;

        const modal = document.getElementById('notificationResponseModal') || this.createNotificationResponseModal();
        const modalHeader = modal.querySelector('.support-modal-header h3');
        const modalBody = modal.querySelector('.support-modal-body');
        
        if (modalHeader) {
            modalHeader.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Urgent Response Required`;
        }
        
        if (modalBody) {
            modalBody.innerHTML = `
                <div class="urgent-notification-response">
                    <div class="urgent-alert">
                        <i class="fas fa-fire"></i>
                        <span>This notification requires immediate attention</span>
                    </div>
                    <div class="notification-summary">
                        <h4>${notification.title}</h4>
                        <p>${notification.message}</p>
                    </div>
                    <form id="urgentResponseForm" data-notification-id="${notificationId}">
                        <div class="form-group">
                            <label for="urgentAction">Immediate Action:</label>
                            <select id="urgentAction" name="urgentAction" required>
                                <option value="">Select action...</option>
                                <option value="escalate">Escalate to Management</option>
                                <option value="investigate">Start Investigation</option>
                                <option value="contact-member">Contact Member Directly</option>
                                <option value="system-check">Perform System Check</option>
                                <option value="emergency-response">Emergency Response</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="urgentNotes">Action Notes:</label>
                            <textarea id="urgentNotes" name="urgentNotes" required rows="3" 
                                placeholder="Describe the actions you are taking..."></textarea>
                        </div>
                        <div class="form-group">
                            <label for="followUpTime">Follow-up Required:</label>
                            <select id="followUpTime" name="followUpTime">
                                <option value="15-minutes">15 minutes</option>
                                <option value="1-hour">1 hour</option>
                                <option value="4-hours">4 hours</option>
                                <option value="24-hours">24 hours</option>
                            </select>
                        </div>
                        <div class="support-modal-footer">
                            <button type="button" class="btn-secondary" onclick="supportManager.closeModal()">Cancel</button>
                            <button type="submit" class="btn-primary urgent">
                                <i class="fas fa-bolt"></i> Take Action
                            </button>
                        </div>
                    </form>
                </div>
            `;
        }
        
        modal.classList.add('active');
    }

    createNotificationDetailsModal() {
        const modal = document.createElement('div');
        modal.id = 'notificationDetailsModal';
        modal.className = 'support-modal';
        modal.innerHTML = `
            <div class="support-modal-content">
                <div class="support-modal-header">
                    <h3><i class="fas fa-bell"></i> Notification Details</h3>
                    <button class="support-modal-close">&times;</button>
                </div>
                <div class="support-modal-body">
                    <!-- Content will be populated dynamically -->
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        return modal;
    }

    createNotificationResponseModal() {
        const modal = document.createElement('div');
        modal.id = 'notificationResponseModal';
        modal.className = 'support-modal';
        modal.innerHTML = `
            <div class="support-modal-content">
                <div class="support-modal-header">
                    <h3><i class="fas fa-exclamation-triangle"></i> Urgent Response</h3>
                    <button class="support-modal-close">&times;</button>
                </div>
                <div class="support-modal-body">
                    <!-- Content will be populated dynamically -->
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        return modal;
    }

    async handleUrgentResponseSubmission(form) {
        const formData = new FormData(form);
        const notificationId = form.dataset.notificationId;
        const responseData = {
            action: formData.get('urgentAction'),
            notes: formData.get('urgentNotes'),
            followUpTime: formData.get('followUpTime')
        };

        try {
            const token = localStorage.getItem('gymAdminToken') || localStorage.getItem('gymAuthToken');
            const notification = this.notifications.find(n => (n._id || n.id) === notificationId);
            
            // Log the urgent response (in production, this would be sent to backend)
            console.log('Urgent response taken:', {
                notificationId,
                action: responseData.action,
                notes: responseData.notes,
                followUpTime: responseData.followUpTime,
                timestamp: new Date().toISOString()
            });
            
            // Mark notification as read and add response metadata
            if (notification) {
                notification.read = true;
                notification.urgentResponse = {
                    action: responseData.action,
                    notes: responseData.notes,
                    followUpTime: responseData.followUpTime,
                    timestamp: new Date().toISOString()
                };
            }
            
            this.showSuccessMessage(`Urgent action "${responseData.action}" has been logged successfully!`);
            this.closeModal();
            form.reset();
            this.renderNotifications();
            this.updateStats();
            
        } catch (error) {
            console.error('Error handling urgent response:', error);
            this.showErrorMessage('Failed to log urgent response. Please try again.');
        }
    }

    // Utility Functions
    getNotificationIcon(type, priority) {
        const iconMap = {
            'system-alert': priority === 'urgent' ? 'fa-exclamation-triangle' : 'fa-cog',
            'grievance-reply': 'fa-reply',
            'support-reply': 'fa-headset',
            'general': 'fa-bell',
            'emergency': 'fa-fire',
            'maintenance': 'fa-tools',
            'update': 'fa-sync-alt',
            'billing': 'fa-credit-card',
            'security': 'fa-shield-alt',
            'gym-admin-message': 'fa-comment',
            'gym-admin-reply': 'fa-reply'
        };
        return iconMap[type] || 'fa-bell';
    }

    getNotificationColor(type, priority) {
        const colorMap = {
            'urgent': '#ef4444',
            'high': '#f59e0b',
            'medium': '#1976d2',
            'low': '#10b981',
            'system-alert': priority === 'urgent' ? '#ef4444' : '#f59e0b',
            'grievance-reply': '#8b5cf6',
            'support-reply': '#06b6d4',
            'emergency': '#dc2626',
            'maintenance': '#f59e0b',
            'security': '#ef4444',
            'gym-admin-message': '#1976d2',
            'gym-admin-reply': '#1976d2'
        };
        return colorMap[type] || colorMap[priority] || '#1976d2';
    }

    canReplyToNotification(notification) {
        const replyableTypes = ['grievance-reply', 'support-reply', 'system-alert', 'emergency', 'general'];
        const isReplyable = replyableTypes.includes(notification.type) || notification.metadata?.ticketId;
        console.log(`🔍 Checking if notification can be replied to:`, {
            type: notification.type,
            hasTicketId: !!notification.metadata?.ticketId,
            isReplyable
        });
        return isReplyable;
    }

    openNotificationReplyModal(notificationId) {
        const notification = this.notifications.find(n => (n._id || n.id) === notificationId);
        if (!notification) return;

        const modal = document.getElementById('notificationReplyModal') || this.createNotificationReplyModal();
        const modalHeader = modal.querySelector('.support-modal-header h3');
        const modalBody = modal.querySelector('.support-modal-body');
        
        if (modalHeader) {
            modalHeader.innerHTML = `<i class="fas fa-reply"></i> Reply to: ${notification.title}`;
        }
        
        if (modalBody) {
            modalBody.innerHTML = `
                <div class="notification-reply-details">
                    <div class="original-notification">
                        <h4>Original Notification:</h4>
                        <div class="notification-content">
                            <p><strong>Type:</strong> ${notification.type}</p>
                            <p><strong>Priority:</strong> ${notification.priority}</p>
                            <p><strong>Message:</strong> ${notification.message}</p>
                            ${notification.metadata?.ticketId ? `<p><strong>Ticket ID:</strong> ${notification.metadata.ticketId}</p>` : ''}
                        </div>
                    </div>
                    <form id="notificationReplyForm" data-notification-id="${notificationId}">
                        <div class="form-group">
                            <label for="replyMessage">Your Reply:</label>
                            <textarea id="replyMessage" name="replyMessage" required rows="4" 
                                placeholder="Type your reply message here..."></textarea>
                        </div>
                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" name="notifyMember" checked>
                                <span class="checkmark"></span>
                                Notify the member about this reply
                            </label>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="replyPriority">Reply Priority:</label>
                                <select id="replyPriority" name="replyPriority">
                                    <option value="normal">Normal</option>
                                    <option value="high">High</option>
                                    <option value="urgent">Urgent</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="replyStatus">Update Status:</label>
                                <select id="replyStatus" name="replyStatus">
                                    <option value="in-progress">In Progress</option>
                                    <option value="resolved">Resolved</option>
                                    <option value="closed">Closed</option>
                                </select>
                            </div>
                        </div>
                        <div class="support-modal-footer">
                            <button type="button" class="btn-secondary" onclick="supportManager.closeModal()">Cancel</button>
                            <button type="submit" class="btn-primary">
                                <i class="fas fa-paper-plane"></i> Send Reply
                            </button>
                        </div>
                    </form>
                </div>
            `;
        }
        
        modal.classList.add('active');
    }

    createNotificationReplyModal() {
        const modal = document.createElement('div');
        modal.id = 'notificationReplyModal';
        modal.className = 'support-modal';
        modal.innerHTML = `
            <div class="support-modal-content large">
                <div class="support-modal-header">
                    <h3><i class="fas fa-reply"></i> Reply to Notification</h3>
                    <button class="support-modal-close">&times;</button>
                </div>
                <div class="support-modal-body">
                    <!-- Content will be populated dynamically -->
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        return modal;
    }

    renderStars(rating) {
        let stars = '';
        for (let i = 1; i <= 5; i++) {
            stars += `<span class="star ${i <= rating ? '' : 'empty'}">★</span>`;
        }
        return stars;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    formatTime(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffInHours = (now - date) / (1000 * 60 * 60);
        
        if (diffInHours < 1) return 'Now';
        if (diffInHours < 24) return `${Math.floor(diffInHours)}h`;
        if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d`;
        return date.toLocaleDateString();
    }

    getEmptyState(type, title, description) {
        const icons = {
            notifications: 'bell-slash',
            reviews: 'star',
            grievances: 'exclamation-triangle',
            communications: 'comments'
        };
        
        return `
            <div class="empty-state">
                <i class="fas fa-${icons[type]}"></i>
                <h3>${title}</h3>
                <p>${description}</p>
            </div>
        `;
    }

    showSuccessMessage(message) {
        // Implementation for success notifications
        console.log('✅ Success:', message);
        
        // Create a visual notification
        const container = document.createElement('div');
        container.className = 'support-message success';
        container.innerHTML = `
            <i class="fas fa-check-circle"></i>
            <span>${message}</span>
        `;
        container.style.cssText = `
            position: fixed; top: 20px; right: 20px; z-index: 10000;
            background: #28a745; color: white; padding: 12px 16px;
            border-radius: 8px; display: flex; align-items: center; gap: 8px;
            box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
        `;
        document.body.appendChild(container);
        
        setTimeout(() => {
            container.remove();
        }, 4000);
    }

    showErrorMessage(message) {
        // Implementation for error notifications
        console.log('❌ Error:', message);
        // You could integrate with existing notification system
        
        // Create a visual notification
        const container = document.createElement('div');
        container.className = 'support-message error';
        container.innerHTML = `
            <i class="fas fa-times-circle"></i>
            <span>${message}</span>
        `;
        container.style.cssText = `
            position: fixed; top: 20px; right: 20px; z-index: 10000;
            background: #dc3545; color: white; padding: 12px 16px;
            border-radius: 8px; display: flex; align-items: center; gap: 8px;
            box-shadow: 0 4px 12px rgba(220, 53, 69, 0.3);
        `;
        document.body.appendChild(container);
        
        setTimeout(() => {
            container.remove();
        }, 4000);
    }

    // Helper functions for user data handling
    getUserImage(review) {
        try {
            // Primary: Check user field (populated from backend) - similar to index.html pattern
            if (review.user && review.user.profileImage) {
                // Handle different URL formats like in script.js
                if (review.user.profileImage.startsWith('http')) {
                    return review.user.profileImage;
                } else {
                    // Ensure proper BASE_URL prefix
                    return `${this.BASE_URL}${review.user.profileImage}`;
                }
            }
            
            // Fallback: Check userId field if user is not populated (legacy support)
            if (review.userId && review.userId.profileImage) {
                if (review.userId.profileImage.startsWith('http')) {
                    return review.userId.profileImage;
                } else {
                    return `${this.BASE_URL}${review.userId.profileImage}`;
                }
            }
            
            // Default fallback
            return `${this.BASE_URL}/uploads/profile-pics/default.png`;
        } catch (error) {
            console.error('Error getting user image:', error);
            return `${this.BASE_URL}/uploads/profile-pics/default.png`;
        }
    }

    getUserName(review) {
        try {
            // Primary: Check user field (populated from backend) - similar to frontend pattern
            if (review.user) {
                // Combine first and last name if available
                if (review.user.firstName || review.user.lastName) {
                    const firstName = review.user.firstName || '';
                    const lastName = review.user.lastName || '';
                    const fullName = `${firstName} ${lastName}`.trim();
                    if (fullName) return fullName;
                }
                // Fallback to name field if available
                if (review.user.name) {
                    return review.user.name;
                }
            }
            
            // Fallback: Check userId field if user is not populated (legacy support)
            if (review.userId) {
                if (review.userId.firstName || review.userId.lastName) {
                    const firstName = review.userId.firstName || '';
                    const lastName = review.userId.lastName || '';
                    const fullName = `${firstName} ${lastName}`.trim();
                    if (fullName) return fullName;
                }
                if (review.userId.name) {
                    return review.userId.name;
                }
            }
            
            // Final fallback to reviewerName
            return review.reviewerName || 'Anonymous Member';
        } catch (error) {
            console.error('Error getting user name:', error);
            return 'Anonymous Member';
        }
    }

    renderAdminReply(review) {
        if (!review.adminReply || !review.adminReply.reply) {
            return '';
        }

        const replyDate = new Date(review.adminReply.repliedAt).toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric'
        });

        // Get gym logo and name
        let gymLogo = '/frontend/gymadmin/admin.png'; // Default fallback
        let gymName = 'Gym Admin'; // Default fallback
        
        if (this.gymProfile) {
            if (this.gymProfile.logoUrl) {
                if (this.gymProfile.logoUrl.startsWith('http')) {
                    gymLogo = this.gymProfile.logoUrl;
                } else {
                    gymLogo = this.gymProfile.logoUrl.startsWith('/') ? 
                        `${this.BASE_URL}${this.gymProfile.logoUrl}` : 
                        `${this.BASE_URL}/${this.gymProfile.logoUrl}`;
                }
            }
            gymName = this.gymProfile.gymName || this.gymProfile.name || 'Gym Admin';
        }

        return `
            <div class="admin-reply" style="background: #f8f9fa; padding: 12px; border-radius: 8px; margin-top: 12px; border-left: 3px solid #1976d2;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                    <img src="${gymLogo}" alt="Gym Admin" style="width:24px;height:24px;border-radius:50%;object-fit:cover;border:2px solid #1976d2;" 
                         onerror="this.src='/frontend/gymadmin/admin.png';" />
                    <strong style="color: #1976d2; font-size: 13px;">${gymName}</strong>
                    <span style="font-size: 12px; color: #999;">${replyDate}</span>
                </div>
                <p style="margin: 0; color: #444; font-size: 13px; line-height: 1.4;">${review.adminReply.reply}</p>
            </div>
        `;
    }

    // Feature/Unfeature review functionality
    async toggleFeatureReview(reviewId) {
        try {
            const review = this.reviews.find(r => (r._id || r.id) === reviewId);
            if (!review) return;

            const token = this.getAuthToken();
            const response = await fetch(`${this.BASE_URL}/api/reviews/${reviewId}/feature`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                // Update the review in our local array
                review.isFeatured = !review.isFeatured;
                review.featuredAt = review.isFeatured ? new Date().toISOString() : null;
                
                this.showSuccessMessage(data.message);
                this.renderReviews();
                this.updateStats();
            } else {
                throw new Error('Failed to update review feature status');
            }
        } catch (error) {
            console.error('Error toggling review feature:', error);
            this.showErrorMessage('Failed to update review. Please try again.');
        }
    }

    // Delete review functionality
    async deleteReview(reviewId) {
        try {
            const review = this.reviews.find(r => (r._id || r.id) === reviewId);
            if (!review) return;

            const token = this.getAuthToken();
            const response = await fetch(`${this.BASE_URL}/api/reviews/${reviewId}/gym-delete`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                // Remove the review from our local array
                this.reviews = this.reviews.filter(r => (r._id || r.id) !== reviewId);
                
                this.showSuccessMessage('Review deleted successfully');
                this.renderReviews();
                this.updateStats();
            } else {
                throw new Error('Failed to delete review');
            }
        } catch (error) {
            console.error('Error deleting review:', error);
            this.showErrorMessage('Failed to delete review. Please try again.');
        }
    }

    // === Consistent UI Dialog System ===
    showDialog({ title = '', message = '', confirmText = 'OK', cancelText = '', iconHtml = '', onConfirm = null, onCancel = null }) {
        let dialog = document.getElementById('customDialogBox');
        if (dialog) dialog.remove();
        
        dialog = document.createElement('div');
        dialog.id = 'customDialogBox';
        dialog.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0,0,0,0.35); display: flex; align-items: center; 
            justify-content: center; z-index: 99999; backdrop-filter: blur(2px);
        `;
        
        const buttonsHtml = cancelText ? 
            `<div style="display:flex;gap:12px;justify-content:center;">
              <button id="dialogCancelBtn" style="background:#6c757d;color:#fff;padding:10px 28px;border:none;border-radius:8px;font-size:1em;cursor:pointer;font-weight:600;transition:background 0.2s ease;">${cancelText}</button>
              <button id="dialogConfirmBtn" style="background:#1976d2;color:#fff;padding:10px 28px;border:none;border-radius:8px;font-size:1em;cursor:pointer;font-weight:600;transition:background 0.2s ease;">${confirmText}</button>
            </div>` :
            `<button id="dialogConfirmBtn" style="background:#1976d2;color:#fff;padding:10px 28px;border:none;border-radius:8px;font-size:1em;cursor:pointer;font-weight:600;transition:background 0.2s ease;">${confirmText}</button>`;
            
        dialog.innerHTML = `
            <div style="background:#fff;max-width:450px;width:90vw;padding:30px 24px 20px 24px;border-radius:16px;box-shadow:0 8px 40px rgba(0,0,0,0.2);text-align:center;position:relative;animation:dialogSlideIn 0.3s ease-out;">
              <div style="margin-bottom:16px;">${iconHtml || ''}</div>
              <div style="font-size:1.25em;font-weight:700;margin-bottom:12px;color:#333;">${title}</div>
              <div style="font-size:1em;color:#555;margin-bottom:24px;line-height:1.5;white-space:pre-line;">${message}</div>
              ${buttonsHtml}
            </div>
            <style>
              @keyframes dialogSlideIn {
                from { transform: translateY(-20px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
              }
              #dialogConfirmBtn:hover { background: #1565c0 !important; }
              #dialogCancelBtn:hover { background: #5a6268 !important; }
            </style>
        `;
        
        document.body.appendChild(dialog);
        document.body.style.overflow = 'hidden';
        
        // Confirm button handler
        dialog.querySelector('#dialogConfirmBtn').onclick = function() {
            dialog.remove();
            document.body.style.overflow = '';
            if (onConfirm) onConfirm();
        };
        
        // Cancel button handler
        const cancelBtn = dialog.querySelector('#dialogCancelBtn');
        if (cancelBtn) {
            cancelBtn.onclick = function() {
                dialog.remove();
                document.body.style.overflow = '';
                if (onCancel) onCancel();
            };
        }
        
        // Click outside to close (only if no cancel button)
        if (!cancelText) {
            dialog.onclick = function(e) {
                if (e.target === dialog) {
                    dialog.remove();
                    document.body.style.overflow = '';
                    if (onConfirm) onConfirm();
                }
            };
        }
    }

    // Mock Data Functions (for development/testing)
    getMockNotifications() {
        return [
            {
                _id: '1',
                title: 'Emergency: Equipment Malfunction',
                message: 'Critical safety issue reported with treadmill #3. Immediate inspection required.',
                type: 'emergency',
                priority: 'urgent',
                read: false,
                createdAt: new Date().toISOString(),
                metadata: {
                    ticketId: 'TKT-001',
                    source: 'member-report',
                    equipmentId: 'TREAD-003'
                }
            },
            {
                _id: '2',
                title: 'Support Ticket Reply Required',
                message: 'Member John Doe has replied to ticket about membership billing issue.',
                type: 'support-reply',
                priority: 'high',
                read: false,
                createdAt: new Date(Date.now() - 1800000).toISOString(), // 30 min ago
                metadata: {
                    ticketId: 'TKT-002',
                    adminMessage: 'We have processed your refund request for the duplicate charge of $59.99. The refund should appear in your account within 3-5 business days.',
                    ticketSubject: 'Billing Issue - Duplicate Charge',
                    source: 'member-reply'
                }
            },
            {
                _id: '3',
                title: 'Grievance Resolution Update',
                message: 'Member Sarah Wilson has responded to your resolution for locker room complaint.',
                type: 'grievance-reply',
                priority: 'medium',
                read: false,
                createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
                metadata: {
                    ticketId: 'GRV-001',
                    adminMessage: 'Thank you for your patience. We have thoroughly cleaned the locker room and implemented a new daily cleaning schedule. We have also installed additional hand sanitizer stations.',
                    ticketSubject: 'Locker Room Cleanliness Issue',
                    source: 'grievance-follow-up'
                }
            },
            {
                _id: '4',
                title: 'New Member Support Request',
                message: 'Sarah Wilson has submitted a new support ticket regarding locker room access.',
                type: 'general',
                priority: 'medium',
                read: false,
                createdAt: new Date(Date.now() - 5400000).toISOString(), // 1.5 hours ago
                metadata: {
                    ticketId: 'SUP-001',
                    adminMessage: 'Your digital locker has been assigned (#247). Please use your membership card to access it. If you need assistance, our staff will help you during your next visit.',
                    ticketSubject: 'Locker Room Access Issue',
                    source: 'new-ticket'
                }
            },
            {
                _id: '5',
                title: 'System Maintenance Completed',
                message: 'Scheduled maintenance for the gym access system has been completed successfully.',
                type: 'system-alert',
                priority: 'low',
                read: true,
                createdAt: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
                metadata: {
                    source: 'system',
                    maintenanceType: 'access-system'
                }
            },
            {
                _id: '6',
                title: 'New Member Registration',
                message: 'New premium member Alex Johnson has completed registration and requires welcome orientation.',
                type: 'general',
                priority: 'medium',
                read: false,
                createdAt: new Date(Date.now() - 10800000).toISOString(), // 3 hours ago
                metadata: {
                    memberId: 'MEM-2025-001',
                    membershipType: 'premium',
                    source: 'registration',
                    adminMessage: 'Welcome to our gym! Your orientation session is scheduled for tomorrow at 10 AM. Please bring your ID and membership card.'
                }
            }
        ];
    }

    getMockReviews() {
        return [
            {
                _id: '1',
                rating: 5,
                comment: 'Excellent gym with great equipment and friendly staff! The new cardio machines are fantastic.',
                user: { 
                    firstName: 'John',
                    lastName: 'Doe',
                    profileImage: `${this.BASE_URL}/uploads/profile-pics/default.png`
                },
                reviewerName: 'John Doe',
                adminReply: null,
                isActive: true,
                isFeatured: true,
                featuredAt: new Date().toISOString(),
                createdAt: new Date().toISOString()
            },
            {
                _id: '2',
                rating: 4,
                comment: 'Good facilities but could use more parking space. Otherwise, great experience!',
                user: { 
                    firstName: 'Jane',
                    lastName: 'Smith',
                    profileImage: `${this.BASE_URL}/uploads/profile-pics/default.png`
                },
                reviewerName: 'Jane Smith',
                adminReply: {
                    reply: 'Thank you for the feedback! We are working on expanding our parking area.',
                    repliedAt: new Date(Date.now() - 43200000).toISOString(), // 12 hours ago
                    repliedBy: this.currentGymId
                },
                isActive: true,
                isFeatured: false,
                createdAt: new Date(Date.now() - 86400000).toISOString()
            },
            {
                _id: '3',
                rating: 3,
                comment: 'Average gym. Equipment is okay but some machines need maintenance.',
                user: { 
                    firstName: 'Mike',
                    lastName: 'Johnson',
                    profileImage: `${this.BASE_URL}/uploads/profile-pics/default.png`
                },
                reviewerName: 'Mike Johnson',
                adminReply: null,
                isActive: true,
                isFeatured: false,
                createdAt: new Date(Date.now() - 172800000).toISOString()
            }
        ];
    }

    getMockGrievances() {
        return [
            {
                _id: '1',
                title: 'Equipment Not Working',
                description: 'The treadmill on the second floor has been broken for a week',
                priority: 'high',
                status: 'open',
                member: { name: 'Mike Johnson' },
                createdAt: new Date().toISOString()
            },
            {
                _id: '2',
                title: 'Billing Issue',
                description: 'Charged twice for the same month membership',
                priority: 'urgent',
                status: 'in-progress',
                member: { name: 'Sarah Wilson' },
                createdAt: new Date(Date.now() - 172800000).toISOString()
            }
        ];
    }

    getMockCommunications() {
        return [
            {
                _id: '1',
                member: { name: 'Alex Brown' },
                lastMessage: { content: 'Hello, I have a question about my membership', createdAt: new Date().toISOString() },
                unreadCount: 2,
                status: 'active'
            },
            {
                _id: '2',
                member: { name: 'Emma Davis' },
                lastMessage: { content: 'Thank you for the quick response!', createdAt: new Date(Date.now() - 86400000).toISOString() },
                unreadCount: 0,
                status: 'active'
            }
        ];
    }

    // Escalation Form Submission Handler
    async handleEscalationFormSubmission(form) {
        const formData = new FormData(form);
        const grievanceId = form.dataset.grievanceId;
        const escalationData = {
            reason: formData.get('escalationReason'),
            priority: formData.get('escalationPriority'),
            requestCallback: formData.get('requestCallback') === 'on'
        };

        try {
            const success = await this.escalateGrievanceToAdmin(grievanceId, escalationData.reason, escalationData.priority);
            
            if (success) {
                // Send additional admin notification if callback requested
                if (escalationData.requestCallback) {
                    await this.requestAdminCallback(grievanceId, escalationData);
                }
                
                this.closeModal();
                form.reset();
                console.log('✅ Escalation form submitted successfully');
            }
        } catch (error) {
            console.error('❌ Error in escalation form submission:', error);
            this.showErrorMessage('Failed to escalate grievance. Please try again.');
        }
    }

    async requestAdminCallback(grievanceId, escalationData) {
        try {
            const gymProfile = window.currentGymProfile || this.gymProfile || {};
            
            // Send callback request to admin
            const token = localStorage.getItem('gymAdminToken') || localStorage.getItem('gymAuthToken');
            const response = await fetch(`${this.BASE_URL}/api/admin/notifications/send`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title: `📞 Callback Request: ${gymProfile.gymName || 'Gym Admin'}`,
                    message: `Urgent callback requested for escalated grievance #${grievanceId}. Reason: ${escalationData.reason}`,
                    type: 'callback-request',
                    priority: 'urgent',
                    metadata: {
                        grievanceId: grievanceId,
                        gymId: this.currentGymId,
                        gymName: gymProfile.gymName || 'Unknown Gym',
                        callbackRequested: true,
                        escalationReason: escalationData.reason,
                        timestamp: new Date().toISOString()
                    },
                    gym: {
                        gymId: this.currentGymId,
                        gymName: gymProfile.gymName || 'Unknown Gym',
                        phone: gymProfile.phone || '',
                        email: gymProfile.email || ''
                    }
                })
            });

            if (response.ok) {
                console.log('✅ Admin callback requested successfully');
            }
        } catch (error) {
            console.error('❌ Error requesting admin callback:', error);
        }
    }
}

// Initialize the Support & Reviews Manager
let supportManager;
document.addEventListener('DOMContentLoaded', () => {
    supportManager = new SupportReviewsManager();
});

// Export for global access
window.supportManager = supportManager;
