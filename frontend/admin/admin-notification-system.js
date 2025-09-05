// === ADMIN NOTIFICATION SYSTEM ===
// Comprehensive notification system for admin dashboard - Updated for enhanced communication

class AdminNotificationSystem {
  constructor() {
    this.notifications = new Map(); // For deduplication
    this.unreadCount = 0;
    this.pollingInterval = null;
    this.BASE_URL = "http://localhost:5000";
    this.lastFetchTime = null;
    
    // Prevent duplicate initialization
    if (window.adminNotificationSystem) {
      return window.adminNotificationSystem;
    }
    
    this.initializeSystem();
    window.adminNotificationSystem = this;
  }

  // Initialize the notification system
  initializeSystem() {
    console.log('🔔 Admin Notification System Initializing...');
    this.enhanceExistingNotificationUI();
    this.createNotificationDetailsModal();
    this.bindEventListeners();
    this.startPolling();
    this.loadExistingNotifications();
    
    // Integrate with enhanced communication system
    this.integrateWithEnhancedSystem();
    console.log('✅ Admin Notification System Ready');
  }

  // Integrate with enhanced communication system
  integrateWithEnhancedSystem() {
    // Wait for enhanced system to be ready
    const waitForEnhanced = () => {
      if (window.enhancedComm) {
        console.log('🔗 Integrating with Enhanced Communication System');
        this.enhancedComm = window.enhancedComm;
      } else {
        setTimeout(waitForEnhanced, 100);
      }
    };
    waitForEnhanced();
  }

  // Enhanced notification creation with deduplication
  createNotification(title, message, type = 'general', icon = 'fa-bell', color = '#3b82f6', metadata = {}) {
    // Create unique ID based on content for deduplication
    const notificationId = this.generateNotificationId(title, message, type);
    
    // Check if similar notification already exists
    if (this.notifications.has(notificationId)) {
      const existing = this.notifications.get(notificationId);
      existing.count = (existing.count || 1) + 1;
      existing.lastSeen = new Date();
      this.updateExistingNotificationDisplay(existing);
      return;
    }

    const notification = {
      id: notificationId,
      title,
      message,
      type,
      icon,
      color,
      metadata,
      timestamp: new Date(),
      count: 1,
      read: false
    };

    // Store notification
    this.notifications.set(notificationId, notification);
    
    // Show toast
    this.showNotificationToast(notification);
    
    // Update bell count
    this.updateNotificationCount();
    
    // Update dropdown if open
    this.updateNotificationDropdown();
    
    console.log(`📢 Notification created: ${title}`);
  }

  // Generate unique notification ID for deduplication
  generateNotificationId(title, message, type) {
    const content = `${type}-${title}-${message.substring(0, 50)}`;
    return btoa(content).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
  }

  // Update existing notification display when duplicates are found
  updateExistingNotificationDisplay(notification) {
    const toastElement = document.querySelector(`[data-notification-id="${notification.id}"]`);
    if (toastElement) {
      const countElement = toastElement.querySelector('.notification-count');
      if (countElement) {
        countElement.textContent = notification.count > 1 ? `(${notification.count})` : '';
        countElement.style.display = notification.count > 1 ? 'inline' : 'none';
      }
      
      // Update timestamp
      const timeElement = toastElement.querySelector('.notification-time');
      if (timeElement) {
        timeElement.textContent = this.getTimeAgo(notification.lastSeen);
      }
    }
  }

  // Enhanced notification toast with better styling
  showNotificationToast(notification) {
    const container = this.getToastContainer();
    
    const toast = document.createElement('div');
    toast.className = `admin-notification-toast ${notification.type}`;
    toast.dataset.notificationId = notification.id;
    
    toast.innerHTML = `
      <div class="notification-toast-content">
        <div class="notification-icon">
          <i class="${notification.icon}" style="color: ${notification.color};"></i>
        </div>
        <div class="notification-text">
          <div class="notification-title">
            ${notification.title}
            <span class="notification-count" style="display: none;"></span>
          </div>
          <div class="notification-message">${this.truncateMessage(notification.message, 80)}</div>
          <div class="notification-time">${this.getTimeAgo(notification.timestamp)}</div>
        </div>
        <div class="notification-actions">
          ${this.getToastActions(notification)}
        </div>
      </div>
    `;

    // Auto-remove after 8 seconds (longer for better UX)
    setTimeout(() => {
      if (toast.parentElement) {
        toast.classList.add('removing');
        setTimeout(() => toast.remove(), 300);
      }
    }, 8000);

    container.appendChild(toast);

    // Animate in
    setTimeout(() => toast.classList.add('show'), 10);
  }

  // Get appropriate actions for toast notifications
  getToastActions(notification) {
    let actions = `
      <button class="toast-action-btn close" onclick="this.closest('.admin-notification-toast').remove()">
        <i class="fas fa-times"></i>
      </button>
    `;

    // Add type-specific actions
    switch (notification.type) {
      case 'gym-registration':
        actions = `
          <button class="toast-action-btn view" onclick="window.enhancedComm?.viewGymDetails('${notification.metadata?.gymId}')">
            <i class="fas fa-eye"></i>
          </button>
          ${actions}
        `;
        break;
      case 'support-ticket':
      case 'grievance':
        actions = `
          <button class="toast-action-btn view" onclick="window.enhancedComm?.viewTicketDetails('${notification.metadata?.ticketId}')">
            <i class="fas fa-ticket-alt"></i>
          </button>
          ${actions}
        `;
        break;
    }

    return actions;
  }

  // Create notification modal for detailed view
  createNotificationModal() {
    let modal = document.getElementById('adminNotificationsModal');
    if (!modal) {
      const modalHTML = `
        <div class="admin-notifications-modal" id="adminNotificationsModal" style="display: none;">
          <div class="admin-notifications-modal-overlay"></div>
          <div class="admin-notifications-modal-content">
            <div class="admin-notifications-modal-header">
              <h3>All Notifications</h3>
              <button class="admin-notifications-modal-close" id="closeAdminNotificationsModal">&times;</button>
            </div>
            <div class="admin-notifications-modal-filters">
              <button class="admin-filter-btn active" data-filter="all">All</button>
              <button class="admin-filter-btn" data-filter="gym">Gym Registrations</button>
              <button class="admin-filter-btn" data-filter="trainer">Trainer Approvals</button>
              <button class="admin-filter-btn" data-filter="trial">Trial Bookings</button>
              <button class="admin-filter-btn" data-filter="payment">Payments</button>
              <button class="admin-filter-btn" data-filter="system">System</button>
              <button class="admin-filter-btn" data-filter="gym-admin">Gym Admin</button>
            </div>
            <div class="admin-notifications-modal-body">
              <div class="admin-notifications-modal-list" id="adminNotificationsModalList">
                <div class="admin-no-notifications">No notifications found</div>
              </div>
            </div>
          </div>
        </div>
      `;
      document.body.insertAdjacentHTML('beforeend', modalHTML);
    }
  }

  // Bind event listeners
  bindEventListeners() {
    // Notification bell click
    const notificationBell = document.getElementById('notificationBell');
    if (notificationBell) {
      notificationBell.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleNotificationDropdown();
      });
    }

    // Mark all as read
    const markAllRead = document.querySelector('.notification-header a');
    if (markAllRead) {
      markAllRead.addEventListener('click', (e) => {
        e.preventDefault();
        this.markAllNotificationsRead();
      });
    }

    // View all notifications
    const viewAll = document.querySelector('.notification-footer a');
    if (viewAll) {
      viewAll.addEventListener('click', (e) => {
        e.preventDefault();
        this.openNotificationModal();
      });
    }

    // Modal close button
    const closeModal = document.getElementById('closeAdminNotificationsModal');
    if (closeModal) {
      closeModal.addEventListener('click', () => this.closeNotificationModal());
    }

    // Filter buttons in modal
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('admin-filter-btn')) {
        document.querySelectorAll('.admin-filter-btn').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        this.filterNotifications(e.target.dataset.filter);
      }
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      const dropdown = document.getElementById('notificationDropdown');
      if (dropdown && !dropdown.contains(e.target) && !e.target.closest('#notificationBell')) {
        dropdown.style.display = 'none';
      }
    });

    // Close modal when clicking overlay
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('admin-notifications-modal-overlay')) {
        this.closeNotificationModal();
      }
    });
  }

  // Toggle notification dropdown
  toggleNotificationDropdown() {
    const dropdown = document.getElementById('notificationDropdown');
    if (dropdown) {
      dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
    }
  }

  // Start polling for new notifications
  startPolling() {
    // Poll every 30 seconds
    this.pollingInterval = setInterval(() => {
      this.fetchNotifications();
    }, 30000);

    // Initial fetch
    this.fetchNotifications();
  }

  // Load existing notifications
  async loadExistingNotifications() {
    try {
      await this.fetchNotifications();
    } catch (error) {
      console.error('Error loading existing notifications:', error);
    }
  }

  // Fetch notifications from server
  async fetchNotifications() {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('❌ No admin token found in localStorage');
        return;
      }

      console.log('🔔 Fetching admin notifications...');
      
      const response = await fetch(`${this.BASE_URL}/api/admin/notifications`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Fetched notifications:', data);
        
        const newNotifications = data.notifications || [];
        
        // Check for new notifications to show toast
        if (this.notifications.length > 0) {
          const existingIds = this.notifications.map(n => n._id);
          const newOnes = newNotifications.filter(n => !existingIds.includes(n._id));
          
          // Show toast for new notifications
          newOnes.forEach(notification => {
            console.log('🔔 New notification received:', notification.title);
            this.showToast(notification);
          });
        }
        
        this.notifications = newNotifications;
        this.unreadCount = data.unreadCount || 0;
        this.updateNotificationUI();
      } else {
        console.error('❌ Failed to fetch notifications:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('❌ Error fetching notifications:', error);
    }
  }

  // Update notification UI
  updateNotificationUI() {
    this.updateNotificationBadge();
    this.updateNotificationDropdown();
  }

  // Update notification badge
  updateNotificationBadge() {
    const badge = document.getElementById('notificationCount');
    if (badge) {
      if (this.unreadCount > 0) {
        badge.textContent = this.unreadCount;
        badge.style.display = 'inline-block';
      } else {
        badge.style.display = 'none';
      }
    }
  }

  // Update notification dropdown
  updateNotificationDropdown() {
    const notificationList = document.getElementById('notificationList');
    if (!notificationList) return;

    if (this.notifications.length === 0) {
      notificationList.innerHTML = '<div class="no-notifications">No new notifications</div>';
      return;
    }

    const recentNotifications = this.notifications.slice(0, 5);
    const notificationHTML = recentNotifications.map(notification => this.createNotificationItem(notification)).join('');
    notificationList.innerHTML = notificationHTML;

    // Add click listeners to notification items
    notificationList.querySelectorAll('.notification-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const notificationId = e.currentTarget.dataset.id;
        this.markNotificationAsRead(notificationId);
        this.handleNotificationClick(notificationId);
      });
    });
  }

  // Create notification item HTML
  createNotificationItem(notification) {
    const timeAgo = this.getTimeAgo(notification.timestamp);
    const unreadClass = notification.read ? '' : 'unread';
    const isGrievance = this.isGrievanceNotification(notification);
    const grievanceClass = isGrievance ? 'grievance-notification' : '';
    
    return `
      <div class="notification-item ${unreadClass} ${grievanceClass}" data-id="${notification._id}">
        <div class="notification-content">
          <strong>${notification.title} ${isGrievance ? '🚨' : ''}</strong>
          <p>${notification.message}</p>
          <small>${timeAgo}</small>
          ${isGrievance ? '<div class="grievance-badge">GRIEVANCE</div>' : ''}
        </div>
        <div class="notification-icon">
          <i class="fas ${notification.icon || 'fa-bell'}" style="color: ${notification.color || '#2563eb'}"></i>
        </div>
      </div>
    `;
  }

  // Get time ago string
  getTimeAgo(timestamp) {
    const now = new Date();
    const notificationTime = new Date(timestamp);
    const diffInSeconds = Math.floor((now - notificationTime) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  }

  // Mark notification as read
  async markNotificationAsRead(notificationId) {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${this.BASE_URL}/api/admin/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        // Update local notification
        const notification = this.notifications.find(n => n._id === notificationId);
        if (notification && !notification.read) {
          notification.read = true;
          this.unreadCount = Math.max(0, this.unreadCount - 1);
          this.updateNotificationUI();
        }
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  // Mark all notifications as read
  async markAllNotificationsRead() {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${this.BASE_URL}/api/admin/notifications/mark-all-read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        this.notifications.forEach(n => n.read = true);
        this.unreadCount = 0;
        this.updateNotificationUI();
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }

  // Handle notification click
  handleNotificationClick(notificationId) {
    const notification = this.notifications.find(n => n._id === notificationId);
    if (!notification) return;

    console.log('🔔 Notification clicked:', {
      id: notificationId,
      title: notification.title,
      type: notification.type,
      metadata: notification.metadata
    });

    // Navigate to relevant section based on notification type
    switch (notification.type) {
      case 'gym-registration':
        this.navigateToGymManagement();
        break;
      case 'trainer-approval':
        this.navigateToTrainerManagement();
        break;
      case 'trial-booking':
        this.navigateToTrialBookings();
        break;
      case 'payment':
        this.navigateToPayments();
        break;
      case 'support':
      case 'support-reply':
        this.navigateToSupport(notification.metadata);
        break;
      case 'admin-system':
        // Check if this is an error/grievance notification
        const isGrievance = this.isGrievanceNotification(notification);
        console.log('📊 Admin-system notification - isGrievance:', isGrievance);
        
        if (isGrievance) {
          this.handleGrievanceNotification(notification);
        } else {
          // Show gym details modal with metadata for other admin-system notifications
          this.showGymDetailsModal(notification.metadata);
        }
        break;
      case 'system':
        // Handle system notifications
        console.log('System notification clicked:', notification.title);
        break;
      default:
        console.log('Unknown notification type:', notification.type);
    }

    // Close dropdown
    const dropdown = document.getElementById('notificationDropdown');
    if (dropdown) {
      dropdown.style.display = 'none';
    }
  }

  // Navigation methods
  navigateToGymManagement() {
    const gymTab = document.getElementById('gym-tab');
    if (gymTab) {
      gymTab.click();
    }
  }

  navigateToTrainerManagement() {
    const trainerTab = document.getElementById('trainer-management-tab');
    if (trainerTab) {
      trainerTab.click();
    }
  }

  navigateToTrialBookings() {
    const trialTab = document.getElementById('trial-booking-tab');
    if (trialTab) {
      trialTab.click();
    }
  }

  navigateToPayments() {
    const paymentTab = document.getElementById('payment-tab');
    if (paymentTab) {
      paymentTab.click();
    }
  }

  navigateToSupport(metadata = {}) {
    console.log('🎯 navigateToSupport called with metadata:', metadata);
    
    const supportTab = document.getElementById('support-tab');
    console.log('🔍 Support tab element:', supportTab);
    
    if (supportTab) {
      console.log('🖱️ Clicking support tab...');
      supportTab.click();
      
      // Wait for tab to be activated
      setTimeout(() => {
        console.log('🔍 Checking if support system is available...');
        
        // If support system is available, navigate with filters
        if (window.supportSystem) {
          console.log('✅ Support system found, applying filters...');
          
          const filters = {};
          
          // Extract filters from metadata
          if (metadata.userType) {
            filters.userType = metadata.userType;
          }
          if (metadata.priority) {
            filters.priority = metadata.priority;
          }
          if (metadata.category) {
            filters.category = metadata.category;
          }
          if (metadata.status) {
            filters.status = metadata.status;
          }
          if (metadata.ticketId) {
            filters.search = metadata.ticketId;
          }
          if (metadata.search) {
            filters.search = metadata.search;
          }
          
          console.log('📋 Applying filters to support system:', filters);
          
          // Navigate to support with filters
          window.supportSystem.navigateToSupportTab(filters);
        } else {
          console.error('❌ Support system not available on window object');
          console.log('🔍 Available window properties:', Object.keys(window).filter(k => k.includes('support')));
        }
      }, 200);
    } else {
      console.error('❌ Support tab element not found');
    }
  }

  // Check if notification is a grievance/error notification
  isGrievanceNotification(notification) {
    if (!notification || !notification.title) return false;
    
    // Check for error-related keywords in title or message
    const errorKeywords = [
      'error', 'issue', 'problem', 'failed', 'failure', 'grievance', 
      'complaint', 'bug', 'malfunction', 'broken', 'not working',
      'system error', 'payment failure', 'facility issue', 'security alert'
    ];
    
    const titleLower = notification.title.toLowerCase();
    const messageLower = (notification.message || '').toLowerCase();
    
    const isGrievance = errorKeywords.some(keyword => 
      titleLower.includes(keyword) || messageLower.includes(keyword)
    );
    
    console.log('🔍 Checking grievance for notification:', {
      title: notification.title,
      message: notification.message,
      isGrievance,
      matchedKeywords: errorKeywords.filter(keyword => 
        titleLower.includes(keyword) || messageLower.includes(keyword))
    });
    
    return isGrievance;
  }

  // Handle grievance notifications by routing to support
  handleGrievanceNotification(notification) {
    console.log('🚨 Handling grievance notification:', notification.title);
    console.log('📋 Notification metadata:', notification.metadata);
    
    // Navigate to support tab with gym admin filter and specific search
    const filters = {
      userType: 'gym-admins',
      category: 'complaint',
      priority: 'high',
      status: 'open',
      search: notification.metadata?.gymName || notification.metadata?.gym?.gymName || ''
    };
    
    console.log('🎯 Navigating to support with filters:', filters);
    this.navigateToSupport(filters);
    
    // Create a support ticket if one doesn't exist
    setTimeout(() => {
      this.createSupportTicketFromGrievance(notification);
    }, 1000); // Wait a bit for navigation to complete
  }

  // Create support ticket from grievance notification
  async createSupportTicketFromGrievance(notification) {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No admin token found for support ticket creation');
        return;
      }

      const gymInfo = notification.metadata?.gym || notification.metadata || {};
      
      // Check if a ticket already exists for this grievance
      const existingTicketResponse = await fetch(
        `${this.BASE_URL}/api/support/tickets?userType=gym&search=${encodeURIComponent(gymInfo.gymName || '')}&category=complaint&status=open`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (existingTicketResponse.ok) {
        const existingData = await existingTicketResponse.json();
        
        // If there's already an open complaint ticket for this gym, don't create another
        if (existingData.tickets && existingData.tickets.length > 0) {
          console.log('📋 Existing support ticket found, not creating duplicate');
          return;
        }
      }

      // Create new support ticket with proper admin data
      const ticketData = {
        category: 'complaint',
        priority: this.determineTicketPriority(notification),
        subject: `Gym Admin Grievance: ${notification.title}`,
        description: `
**Grievance Details:**
${notification.message || 'No additional details provided'}

**Gym Information:**
- Name: ${gymInfo.gymName || 'N/A'}
- Email: ${gymInfo.email || 'N/A'}
- Phone: ${gymInfo.phone || 'N/A'}
- Address: ${gymInfo.address || 'N/A'}

**Notification Timestamp:** ${new Date(notification.timestamp).toLocaleString()}

This ticket was automatically created from a gym admin notification marked as a grievance.
        `.trim(),
        userType: 'Gym',
        gymId: gymInfo.gymId || gymInfo._id,
        gymName: gymInfo.gymName || 'Unknown Gym',
        gymEmail: gymInfo.email || 'noemail@gym.com',
        gymPhone: gymInfo.phone || 'No phone provided',
        attachments: []
      };

      console.log('Creating support ticket with data:', ticketData);

      const response = await fetch(`${this.BASE_URL}/api/support/admin/tickets`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(ticketData)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Support ticket created from grievance:', result.ticket?.ticketId);
        
        // Show success notification
        this.showToast({
          _id: Date.now().toString(),
          title: 'Support Ticket Created',
          message: `Ticket #${result.ticket?.ticketId} created for gym grievance`,
          type: 'system',
          icon: 'fa-ticket-alt',
          color: '#28a745'
        });
        
        // Refresh support system if available
        if (window.supportSystem) {
          setTimeout(() => {
            window.supportSystem.loadSupportTickets();
            window.supportSystem.loadSupportStats();
          }, 500);
        }
      } else {
        const errorData = await response.json();
        console.error('❌ Failed to create support ticket:', errorData);
        
        this.showToast({
          _id: Date.now().toString(),
          title: 'Ticket Creation Failed',
          message: 'Failed to create support ticket for grievance',
          type: 'system',
          icon: 'fa-exclamation-triangle',
          color: '#dc3545'
        });
      }
    } catch (error) {
      console.error('Error creating support ticket from grievance:', error);
      
      this.showToast({
        _id: Date.now().toString(),
        title: 'Error',
        message: 'Error creating support ticket from grievance',
        type: 'system',
        icon: 'fa-exclamation-triangle',
        color: '#dc3545'
      });
    }
  }

  // Determine ticket priority based on notification content
  determineTicketPriority(notification) {
    const highPriorityKeywords = [
      'security alert', 'system error', 'payment failure', 'critical',
      'urgent', 'emergency', 'broken', 'not working'
    ];
    
    const mediumPriorityKeywords = [
      'facility issue', 'equipment', 'maintenance', 'bug', 'problem'
    ];
    
    const titleLower = notification.title.toLowerCase();
    const messageLower = (notification.message || '').toLowerCase();
    
    if (highPriorityKeywords.some(keyword => 
        titleLower.includes(keyword) || messageLower.includes(keyword))) {
      return 'high';
    }
    
    if (mediumPriorityKeywords.some(keyword => 
        titleLower.includes(keyword) || messageLower.includes(keyword))) {
      return 'medium';
    }
    
    return 'low';
  }

  // Open notification modal
  openNotificationModal() {
    const modal = document.getElementById('adminNotificationsModal');
    if (modal) {
      modal.style.display = 'flex';
      this.updateNotificationModal();
    }
  }

  // Close notification modal
  closeNotificationModal() {
    const modal = document.getElementById('adminNotificationsModal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  // Update notification modal
  updateNotificationModal() {
    const modalList = document.getElementById('adminNotificationsModalList');
    if (!modalList) return;

    if (this.notifications.length === 0) {
      modalList.innerHTML = '<div class="admin-no-notifications">No notifications found</div>';
      return;
    }

    const notificationHTML = this.notifications.map(notification => this.createModalNotificationItem(notification)).join('');
    modalList.innerHTML = notificationHTML;

    // Add click listeners
    modalList.querySelectorAll('.admin-modal-notification-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const notificationId = e.currentTarget.dataset.id;
        this.markNotificationAsRead(notificationId);
        this.handleNotificationClick(notificationId);
        this.closeNotificationModal();
      });
    });
  }

  // Create modal notification item
  createModalNotificationItem(notification) {
    const timeAgo = this.getTimeAgo(notification.timestamp);
    const unreadClass = notification.read ? '' : 'unread';
    const isGrievance = this.isGrievanceNotification(notification);
    const grievanceClass = isGrievance ? 'grievance-notification' : '';
    
    return `
      <div class="admin-modal-notification-item ${unreadClass} ${grievanceClass}" data-id="${notification._id}">
        <div class="admin-modal-notification-icon">
          <i class="fas ${notification.icon || 'fa-bell'}" style="color: ${notification.color || '#2563eb'}"></i>
        </div>
        <div class="admin-modal-notification-content">
          <div class="admin-modal-notification-title">
            ${notification.title} ${isGrievance ? '🚨' : ''}
            ${isGrievance ? '<span class="grievance-badge">GRIEVANCE</span>' : ''}
          </div>
          <div class="admin-modal-notification-message">${notification.message}</div>
          <div class="admin-modal-notification-time">${timeAgo}</div>
        </div>
        <div class="admin-modal-notification-type">${this.getNotificationTypeLabel(notification.type)}</div>
      </div>
    `;
  }

  // Get notification type label
  getNotificationTypeLabel(type) {
    const labels = {
      'gym-registration': 'Gym Registration',
      'trainer-approval': 'Trainer Approval',
      'trial-booking': 'Trial Booking',
      'payment': 'Payment',
      'system': 'System',
      'admin-system': 'Gym Admin'
    };
    return labels[type] || 'General';
  }

  // Filter notifications in modal
  filterNotifications(filter) {
    const modalList = document.getElementById('adminNotificationsModalList');
    if (!modalList) return;

    let filteredNotifications = this.notifications;
    
    if (filter !== 'all') {
      filteredNotifications = this.notifications.filter(n => {
        switch (filter) {
          case 'gym':
            return n.type === 'gym-registration';
          case 'trainer':
            return n.type === 'trainer-approval';
          case 'trial':
            return n.type === 'trial-booking';
          case 'payment':
            return n.type === 'payment';
          case 'system':
            return n.type === 'system';
          case 'gym-admin':
            return n.type === 'admin-system';
          default:
            return true;
        }
      });
    }

    if (filteredNotifications.length === 0) {
      modalList.innerHTML = '<div class="admin-no-notifications">No notifications found for this filter</div>';
      return;
    }

    const notificationHTML = filteredNotifications.map(notification => this.createModalNotificationItem(notification)).join('');
    modalList.innerHTML = notificationHTML;

    // Add click listeners
    modalList.querySelectorAll('.admin-modal-notification-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const notificationId = e.currentTarget.dataset.id;
        this.markNotificationAsRead(notificationId);
        this.handleNotificationClick(notificationId);
        this.closeNotificationModal();
      });
    });
  }

  // Show toast notification
  showToast(notification) {
    const toastContainer = document.getElementById('adminNotificationToasts');
    if (!toastContainer) return;

    const isGrievance = this.isGrievanceNotification(notification);
    const grievanceClass = isGrievance ? 'grievance-toast' : '';

    const toast = document.createElement('div');
    toast.className = `admin-notification-toast ${grievanceClass}`;
    toast.innerHTML = `
      <div class="admin-toast-icon">
        <i class="fas ${notification.icon || 'fa-bell'}" style="color: ${notification.color || '#2563eb'}"></i>
      </div>
      <div class="admin-toast-content">
        <div class="admin-toast-title">
          ${notification.title} ${isGrievance ? '🚨' : ''}
          ${isGrievance ? '<span class="grievance-badge">GRIEVANCE</span>' : ''}
        </div>
        <div class="admin-toast-message">${notification.message}</div>
      </div>
      <button class="admin-toast-close">&times;</button>
    `;

    // Add close functionality
    const closeBtn = toast.querySelector('.admin-toast-close');
    closeBtn.addEventListener('click', () => {
      toast.remove();
    });

    // Add click functionality
    toast.addEventListener('click', () => {
      this.handleNotificationClick(notification._id);
      toast.remove();
    });

    toastContainer.appendChild(toast);

    // Auto remove after longer time for grievances (8 seconds vs 5 seconds)
    setTimeout(() => {
      if (toast.parentNode) {
        toast.remove();
      }
    }, isGrievance ? 8000 : 5000);
  }

  // Create notification programmatically (for testing)
  createNotification(title, message, type = 'system', icon = 'fa-bell', color = '#2563eb') {
    const notification = {
      _id: Date.now().toString(),
      title,
      message,
      type,
      icon,
      color,
      timestamp: new Date().toISOString(),
      read: false
    };

    this.notifications.unshift(notification);
    this.unreadCount++;
    this.updateNotificationUI();
    this.showToast(notification);
  }

  // Test function to create a grievance notification
  testGrievanceNotification() {
    const testNotification = {
      _id: Date.now().toString(),
      title: 'System Error Alert',
      message: 'Payment failure reported at FitZone Gym',
      type: 'admin-system',
      icon: 'fa-exclamation-triangle',
      color: '#dc3545',
      timestamp: new Date().toISOString(),
      read: false,
      metadata: {
        gym: {
          gymName: 'FitZone Gym',
          email: 'fitzone@example.com',
          phone: '+1234567890',
          address: '123 Fitness Street',
          gymId: 'gym123'
        }
      }
    };

    console.log('🧪 Creating test grievance notification:', testNotification);
    
    this.notifications.unshift(testNotification);
    this.unreadCount++;
    this.updateNotificationUI();
    this.showToast(testNotification);
  }

  // Truncate message for toast display
  truncateMessage(message, maxLength = 80) {
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength) + '...';
  }

  // Get time ago format for timestamps
  getTimeAgo(timestamp) {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInSeconds = Math.floor((now - time) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  }

  // Get or create toast container
  getToastContainer() {
    let container = document.getElementById('adminNotificationToasts');
    if (!container) {
      container = document.createElement('div');
      container.id = 'adminNotificationToasts';
      container.className = 'admin-notification-toasts';
      document.body.appendChild(container);
    }
    return container;
  }

  // Enhanced create notification modal for detailed view
  createNotificationDetailsModal() {
    if (document.getElementById('notificationDetailsModal')) return;

    const modalHTML = `
      <div id="notificationDetailsModal" class="enhanced-modal" style="display: none;">
        <div class="enhanced-modal-content">
          <div class="enhanced-modal-header">
            <h3 id="modalNotificationTitle">Notification Details</h3>
            <button class="enhanced-close-btn" onclick="this.closest('.enhanced-modal').style.display='none'">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="enhanced-modal-body">
            <div id="modalNotificationContent">
              <!-- Notification details will be loaded here -->
            </div>
          </div>
          <div class="enhanced-modal-footer">
            <button class="enhanced-btn enhanced-btn-secondary" onclick="this.closest('.enhanced-modal').style.display='none'">
              Close
            </button>
            <button class="enhanced-btn enhanced-btn-primary" id="modalActionButton" style="display: none;">
              Take Action
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
  }

  // Show notification details in modal
  showNotificationDetails(notification) {
    const modal = document.getElementById('notificationDetailsModal');
    const title = document.getElementById('modalNotificationTitle');
    const content = document.getElementById('modalNotificationContent');
    const actionButton = document.getElementById('modalActionButton');

    if (!modal || !title || !content || !actionButton) return;

    title.textContent = notification.title;
    
    const detailsHTML = `
      <div class="notification-detail-item">
        <strong>Type:</strong> ${notification.type.replace(/-/g, ' ').toUpperCase()}
      </div>
      <div class="notification-detail-item">
        <strong>Time:</strong> ${new Date(notification.timestamp).toLocaleString()}
      </div>
      <div class="notification-detail-item">
        <strong>Message:</strong>
        <div class="notification-full-message">${notification.message}</div>
      </div>
      ${notification.metadata ? `
        <div class="notification-detail-item">
          <strong>Additional Details:</strong>
          <pre>${JSON.stringify(notification.metadata, null, 2)}</pre>
        </div>
      ` : ''}
    `;

    content.innerHTML = detailsHTML;

    // Configure action button based on notification type
    this.configureModalActionButton(notification, actionButton);

    modal.style.display = 'block';
  }

  // Configure modal action button based on notification type
  configureModalActionButton(notification, actionButton) {
    actionButton.style.display = 'none';
    actionButton.onclick = null;

    switch (notification.type) {
      case 'gym-registration':
        if (notification.metadata?.gymId) {
          actionButton.style.display = 'block';
          actionButton.textContent = 'Review Gym';
          actionButton.onclick = () => {
            window.enhancedComm?.viewGymDetails(notification.metadata.gymId);
            document.getElementById('notificationDetailsModal').style.display = 'none';
          };
        }
        break;
      case 'support-ticket':
      case 'grievance':
        if (notification.metadata?.ticketId) {
          actionButton.style.display = 'block';
          actionButton.textContent = 'View Ticket';
          actionButton.onclick = () => {
            window.enhancedComm?.viewTicketDetails(notification.metadata.ticketId);
            document.getElementById('notificationDetailsModal').style.display = 'none';
          };
        }
        break;
    }
  }

  // Integrate with enhanced communication system
  integrateWithEnhancedSystem() {
    if (window.enhancedComm) {
      // Subscribe to enhanced system notifications
      if (typeof window.enhancedComm.onNotificationReceived === 'function') {
        window.enhancedComm.onNotificationReceived = (notification) => {
          this.createNotification(
            notification.title,
            notification.message,
            notification.type,
            notification.metadata
          );
        };
      }

      // Provide deduplication service to enhanced system
      window.enhancedComm.notificationDeduplication = {
        isDuplicate: (notification) => {
          const id = this.generateNotificationId(notification.title, notification.message, notification.type);
          return this.notifications.has(id);
        },
        addNotification: (notification) => {
          const id = this.generateNotificationId(notification.title, notification.message, notification.type);
          if (this.notifications.has(id)) {
            const existing = this.notifications.get(id);
            existing.count++;
            existing.lastSeen = new Date();
            this.updateExistingNotificationDisplay(existing);
            return false; // Indicates duplicate
          } else {
            notification.id = id;
            notification.count = 1;
            notification.lastSeen = new Date();
            this.notifications.set(id, notification);
            return true; // Indicates new notification
          }
        }
      };

      console.log('Admin notification system integrated with enhanced communication system');
    }
  }
}

// Test functions for debugging
window.testGrievanceSystem = {
  createTestGrievance: () => {
    if (window.adminNotificationSystem) {
      window.adminNotificationSystem.testGrievanceNotification();
    } else {
      console.error('Admin notification system not initialized');
    }
  },
  
  testSupportNavigation: () => {
    if (window.supportSystem) {
      window.supportSystem.navigateToSupportTab({
        userType: 'gym-admins',
        category: 'complaint',
        priority: 'high',
        status: 'open',
        search: 'test'
      });
    } else {
      console.error('Support system not initialized');
    }
  },
  
  checkSystemsReady: () => {
    console.log('System Status:', {
      adminNotificationSystem: !!window.adminNotificationSystem,
      supportSystem: !!window.supportSystem,
      supportTab: !!document.getElementById('support-tab'),
      supportContent: !!document.getElementById('support-content'),
      gymAdminsSupport: !!document.getElementById('gym-admins-support')
    });
  }
};

// Initialize the admin notification system when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.adminNotificationSystem = new AdminNotificationSystem();
});

// Export for external use
window.AdminNotificationSystem = AdminNotificationSystem;
