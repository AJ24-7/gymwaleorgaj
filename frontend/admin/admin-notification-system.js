// === ADMIN NOTIFICATION SYSTEM ===
// Comprehensive notification system for admin dashboard

class AdminNotificationSystem {
  constructor() {
    this.notifications = [];
    this.unreadCount = 0;
    this.pollingInterval = null;
    this.BASE_URL = "http://localhost:5000";
    this.initializeSystem();
  }

  // Initialize the notification system
  initializeSystem() {
    this.enhanceExistingNotificationUI();
    this.bindEventListeners();
    this.startPolling();
    this.loadExistingNotifications();
    console.log('🔔 Admin Notification System Initialized');
  }

  // Enhance existing notification UI in admin.html
  enhanceExistingNotificationUI() {
    // The notification bell already exists in admin.html, we just need to enhance it
    const notificationBell = document.getElementById('notificationBell');
    const notificationDropdown = document.getElementById('notificationDropdown');
    const notificationList = document.getElementById('notificationList');
    
    if (notificationBell && notificationDropdown && notificationList) {
      // Add additional functionality to existing elements
      
      // Create notification toast container if it doesn't exist
      let toastContainer = document.getElementById('adminNotificationToasts');
      if (!toastContainer) {
        const toastHTML = `
          <div class="admin-notification-toasts" id="adminNotificationToasts"></div>
        `;
        document.body.insertAdjacentHTML('beforeend', toastHTML);
      }

      // Create notification modal for detailed view
      this.createNotificationModal();
    }
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
      if (!token) return;

      const response = await fetch(`${this.BASE_URL}/api/admin/notifications`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        this.notifications = data.notifications || [];
        this.unreadCount = data.unreadCount || 0;
        this.updateNotificationUI();
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
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
    
    return `
      <div class="notification-item ${unreadClass}" data-id="${notification._id}">
        <div class="notification-content">
          <strong>${notification.title}</strong>
          <p>${notification.message}</p>
          <small>${timeAgo}</small>
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
    
    return `
      <div class="admin-modal-notification-item ${unreadClass}" data-id="${notification._id}">
        <div class="admin-modal-notification-icon">
          <i class="fas ${notification.icon || 'fa-bell'}" style="color: ${notification.color || '#2563eb'}"></i>
        </div>
        <div class="admin-modal-notification-content">
          <div class="admin-modal-notification-title">${notification.title}</div>
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
      'system': 'System'
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

    const toast = document.createElement('div');
    toast.className = 'admin-notification-toast';
    toast.innerHTML = `
      <div class="admin-toast-icon">
        <i class="fas ${notification.icon || 'fa-bell'}" style="color: ${notification.color || '#2563eb'}"></i>
      </div>
      <div class="admin-toast-content">
        <div class="admin-toast-title">${notification.title}</div>
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

    // Auto remove after 5 seconds
    setTimeout(() => {
      if (toast.parentNode) {
        toast.remove();
      }
    }, 5000);
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

  // Cleanup method
  destroy() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
  }
}

// Initialize the admin notification system when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.adminNotificationSystem = new AdminNotificationSystem();
});

// Export for external use
window.AdminNotificationSystem = AdminNotificationSystem;
