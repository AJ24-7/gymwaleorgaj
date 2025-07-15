// === AUTOMATED NOTIFICATION SYSTEM ===
// Integrated with Settings Tab - Real-time Notifications

class NotificationSystem {
  constructor() {
    this.settings = this.loadNotificationSettings();
    this.notifications = [];
    this.unreadCount = 0;
    this.websocket = null;
    this.pollingInterval = null;
    this.initializeSystem();
  }

  // Initialize the notification system
  initializeSystem() {
    this.createNotificationUI();
    this.bindEventListeners();
    this.startPolling();
    this.loadExistingNotifications();
    
    // Setup debug functions
    this.setupDebugFunctions();
    
    // Check for expiring memberships immediately after initialization
    setTimeout(() => {
      this.checkMembershipExpiry();
    }, 2000);
    
    console.log('🔔 Notification System Initialized');
  }

  // Load notification settings from localStorage or defaults
  loadNotificationSettings() {
    const defaultSettings = {
      newMemberNotif: true,
      paymentNotif: true,
      trainerNotif: true,
      emailNotif: false,
      membershipExpiryNotif: true,
      adminUpdateNotif: true
    };
    
    const saved = localStorage.getItem('notificationSettings');
    return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
  }

  // Save notification settings
  saveNotificationSettings(settings) {
    this.settings = { ...this.settings, ...settings };
    localStorage.setItem('notificationSettings', JSON.stringify(this.settings));
    console.log('✅ Notification settings saved', this.settings);
  }

  // Create notification UI elements
  createNotificationUI() {
    // Check if notification bell already exists
    let notificationBell = document.getElementById('notificationBell');
    if (!notificationBell) {
      // Find the user actions container
      const userActions = document.querySelector('.user-actions');
      if (userActions) {
        // Create notification bell HTML
        const bellHTML = `
          <div class="notification" id="notificationBell">
            <i class="fas fa-bell notification-icon" id="notificationIcon"></i>
            <span class="notification-badge" id="notificationBadge" style="display: none;">0</span>
            <div class="notification-dropdown" id="notificationDropdown">
              <div class="notification-header">
                <h4>Notifications</h4>
                <button class="mark-all-read" id="markAllRead">Mark All Read</button>
              </div>
              <div class="notification-list" id="notificationList">
                <div class="no-notifications">No new notifications</div>
              </div>
              <div class="notification-footer">
                <button class="view-all-notifications" id="viewAllNotifications">View All</button>
              </div>
            </div>
          </div>
        `;
        
        // Insert before user profile
        const userProfile = userActions.querySelector('.user-profile');
        if (userProfile) {
          userProfile.insertAdjacentHTML('beforebegin', bellHTML);
        } else {
          userActions.insertAdjacentHTML('afterbegin', bellHTML);
        }
      }
    }

    // Create notification toast container
    let toastContainer = document.getElementById('notificationToasts');
    if (!toastContainer) {
      const toastHTML = `
        <div class="notification-toasts" id="notificationToasts"></div>
      `;
      document.body.insertAdjacentHTML('beforeend', toastHTML);
    }

    // Create notification modal
    this.createNotificationModal();
  }

  // Create notification modal for detailed view
  createNotificationModal() {
    let modal = document.getElementById('notificationsModal');
    if (!modal) {
      const modalHTML = `
        <div class="modal" id="notificationsModal" style="display: none;">
          <div class="modal-content notification-modal-content">
            <div class="modal-header">
              <h2><i class="fas fa-bell"></i> All Notifications</h2>
              <span class="modal-close" id="closeNotificationsModal">&times;</span>
            </div>
            <div class="modal-body">
              <div class="notification-filters">
                <button class="filter-btn active" data-filter="all">All</button>
                <button class="filter-btn" data-filter="unread">Unread</button>
                <button class="filter-btn" data-filter="member">Members</button>
                <button class="filter-btn" data-filter="payment">Payments</button>
                <button class="filter-btn" data-filter="trainer">Trainers</button>
                <button class="filter-btn" data-filter="system">System</button>
              </div>
              <div class="all-notifications-list" id="allNotificationsList">
                <!-- Notifications will be loaded here -->
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
    const bell = document.getElementById('notificationBell');
    const dropdown = document.getElementById('notificationDropdown');
    
    if (bell && dropdown) {
      bell.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('show');
      });

      // Close dropdown when clicking outside
      document.addEventListener('click', (e) => {
        if (!bell.contains(e.target)) {
          dropdown.classList.remove('show');
        }
      });
    }

    // Mark all read button
    const markAllRead = document.getElementById('markAllRead');
    if (markAllRead) {
      markAllRead.addEventListener('click', () => this.markAllNotificationsRead());
    }

    // View all notifications button
    const viewAll = document.getElementById('viewAllNotifications');
    if (viewAll) {
      viewAll.addEventListener('click', () => this.openNotificationModal());
    }

    // Modal close button
    const closeModal = document.getElementById('closeNotificationsModal');
    if (closeModal) {
      closeModal.addEventListener('click', () => this.closeNotificationModal());
    }

    // Filter buttons in modal
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        filterBtns.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.filterNotifications(e.target.dataset.filter);
      });
    });

    // Listen for settings changes
    this.bindSettingsListeners();
  }

  // Bind settings tab listeners
  bindSettingsListeners() {
    const settingsInputs = [
      'newMemberNotif',
      'paymentNotif', 
      'trainerNotif',
      'emailNotif',
      'membershipExpiryNotif'
    ];

    settingsInputs.forEach(id => {
      const input = document.getElementById(id);
      if (input) {
        input.addEventListener('change', (e) => {
          this.saveNotificationSettings({
            [id]: e.target.checked
          });
        });
      }
    });

    // Update UI based on saved settings
    this.updateSettingsUI();
  }

  // Update settings UI with saved values
  updateSettingsUI() {
    Object.keys(this.settings).forEach(key => {
      const input = document.getElementById(key);
      if (input && typeof this.settings[key] === 'boolean') {
        input.checked = this.settings[key];
      }
    });
  }

  // Start polling for new notifications
  startPolling() {
    this.pollingInterval = setInterval(() => {
      this.checkForNewNotifications();
      this.checkMembershipExpiry();
    }, 30000); // Check every 30 seconds
  }

  // Stop polling
  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  // Check for new notifications from backend
  async checkForNewNotifications() {
    try {
      const token = localStorage.getItem('gymAdminToken');
      if (!token) return;

      const response = await fetch('http://localhost:5000/api/notifications/unread', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.notifications && data.notifications.length > 0) {
          data.notifications.forEach(notif => this.addNotification(notif));
        }
      }
    } catch (error) {
      console.error('Error checking for notifications:', error);
    }
  }

  // Check for membership expiry and create notifications
  async checkMembershipExpiry() {
    console.log('🔍 Checking membership expiry...', this.settings.membershipExpiryNotif);
    
    if (!this.settings.membershipExpiryNotif) {
      console.log('⚠️ Membership expiry notifications are disabled');
      return;
    }

    try {
      const token = localStorage.getItem('gymAdminToken');
      if (!token) {
        console.log('❌ No auth token found for membership expiry check');
        return;
      }

      console.log('📡 Fetching expiring members...');

      // Check for memberships expiring in 7 days
      const sevenDaysResponse = await fetch('http://localhost:5000/api/members/expiring?days=7', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      // Check for memberships expiring in 3 days
      const threeDaysResponse = await fetch('http://localhost:5000/api/members/expiring?days=3', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      // Check for memberships expiring in 1 day
      const oneDayResponse = await fetch('http://localhost:5000/api/members/expiring?days=1', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (sevenDaysResponse.ok) {
        const sevenDaysData = await sevenDaysResponse.json();
        console.log('📊 7-day expiry response:', sevenDaysData);
        if (sevenDaysData.success && sevenDaysData.members && sevenDaysData.members.length > 0) {
          console.log(`📢 Found ${sevenDaysData.members.length} members expiring in 7 days`);
          this.createMembershipExpiryNotification(sevenDaysData.members, 7);
        }
      } else {
        console.error('❌ 7-day expiry check failed:', sevenDaysResponse.status);
      }

      if (threeDaysResponse.ok) {
        const threeDaysData = await threeDaysResponse.json();
        console.log('📊 3-day expiry response:', threeDaysData);
        if (threeDaysData.success && threeDaysData.members && threeDaysData.members.length > 0) {
          console.log(`📢 Found ${threeDaysData.members.length} members expiring in 3 days`);
          this.createMembershipExpiryNotification(threeDaysData.members, 3);
        }
      } else {
        console.error('❌ 3-day expiry check failed:', threeDaysResponse.status);
      }

      if (oneDayResponse.ok) {
        const oneDayData = await oneDayResponse.json();
        console.log('📊 1-day expiry response:', oneDayData);
        if (oneDayData.success && oneDayData.members && oneDayData.members.length > 0) {
          console.log(`📢 Found ${oneDayData.members.length} members expiring in 1 day`);
          this.createMembershipExpiryNotification(oneDayData.members, 1);
        }
      } else {
        console.error('❌ 1-day expiry check failed:', oneDayResponse.status);
      }
    } catch (error) {
      console.error('❌ Error checking membership expiry:', error);
    }
  }

  // Create membership expiry notification
  createMembershipExpiryNotification(members, days) {
    // Create unique ID to prevent duplicates
    const memberIds = members.map(m => m._id || m.membershipId).join(',');
    const notificationId = `expiry-${days}d-${Date.now()}-${memberIds.slice(0, 20)}`;
    
    // Check if similar notification already exists (within last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const existingNotification = this.notifications.find(n => 
      n.type === 'membership-expiry' && 
      n.timestamp > oneHourAgo &&
      n.message.includes(`${days} day`) &&
      n.members && n.members.length === members.length
    );
    
    if (existingNotification) {
      console.log(`⚠️ Similar expiry notification already exists for ${days} days`);
      return;
    }

    const notification = {
      id: notificationId,
      type: 'membership-expiry',
      title: `Membership${members.length > 1 ? 's' : ''} Expiring ${days === 1 ? 'Tomorrow' : `in ${days} Day${days > 1 ? 's' : ''}`}`,
      message: `${members.length} member${members.length > 1 ? 's have' : ' has'} membership${members.length > 1 ? 's' : ''} expiring ${days === 1 ? 'tomorrow' : `in ${days} day${days > 1 ? 's' : ''}`}`,
      timestamp: new Date(),
      read: false,
      priority: days === 1 ? 'high' : days === 3 ? 'medium' : 'normal',
      members: members.map(member => ({
        name: member.memberName || member.name || 'Unknown',
        membershipId: member.membershipId || member._id,
        membershipValidUntil: member.membershipValidUntil,
        planSelected: member.planSelected,
        email: member.email,
        phone: member.phone
      })),
      icon: 'fa-exclamation-triangle',
      color: days === 1 ? '#ff6b35' : days === 3 ? '#ffa726' : '#ffb74d'
    };

    console.log(`📢 Creating membership expiry notification: ${notification.title}`);
    this.addNotification(notification);
  }

  // Add a new notification
  addNotification(notification) {
    // Check if notification already exists
    const exists = this.notifications.find(n => n.id === notification.id);
    if (exists) return;

    notification.timestamp = new Date(notification.timestamp);
    this.notifications.unshift(notification);
    
    if (!notification.read) {
      this.unreadCount++;
      this.updateNotificationBadge();
    }

    this.updateNotificationDropdown();
    
    // Show toast notification if enabled
    if (this.shouldShowNotification(notification.type)) {
      this.showToastNotification(notification);
    }

    // Play notification sound
    this.playNotificationSound();
  }

  // Check if notification should be shown based on settings
  shouldShowNotification(type) {
    const typeMap = {
      'new-member': 'newMemberNotif',
      'payment': 'paymentNotif',
      'trainer-approved': 'trainerNotif',
      'trainer-rejected': 'trainerNotif',
      'trainer-application': 'trainerNotif',
      'membership-expiry': 'membershipExpiryNotif',
      'system': 'adminUpdateNotif'
    };

    const settingKey = typeMap[type];
    return settingKey ? this.settings[settingKey] : true;
  }

  // Show toast notification
  showToastNotification(notification) {
    const toastContainer = document.getElementById('notificationToasts');
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `notification-toast ${notification.priority || 'normal'}`;
    toast.innerHTML = `
      <div class="toast-icon">
        <i class="fas ${notification.icon || 'fa-bell'}"></i>
      </div>
      <div class="toast-content">
        <div class="toast-title">${notification.title}</div>
        <div class="toast-message">${notification.message}</div>
      </div>
      <button class="toast-close">&times;</button>
    `;

    // Add close functionality
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => this.removeToast(toast));

    // Add click to open details
    toast.addEventListener('click', () => {
      this.showNotificationDetails(notification);
      this.removeToast(toast);
    });

    toastContainer.appendChild(toast);

    // Auto remove after 5 seconds
    setTimeout(() => this.removeToast(toast), 5000);

    // Animate in
    setTimeout(() => toast.classList.add('show'), 100);
  }

  // Remove toast notification
  removeToast(toast) {
    if (toast && toast.parentNode) {
      toast.classList.add('removing');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }
  }

  // Update notification badge
  updateNotificationBadge() {
    const badge = document.getElementById('notificationBadge');
    const bell = document.getElementById('notificationBell');
    if (badge) {
      if (this.unreadCount > 0) {
        badge.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
        badge.style.display = 'flex';
        if (bell) bell.classList.add('has-unread');
      } else {
        badge.style.display = 'none';
        if (bell) bell.classList.remove('has-unread');
      }
    }
  }

  // Update notification dropdown
  updateNotificationDropdown() {
    const list = document.getElementById('notificationList');
    if (!list) return;

    const recentNotifications = this.notifications.slice(0, 5);
    
    if (recentNotifications.length === 0) {
      list.innerHTML = '<div class="no-notifications">No new notifications</div>';
      return;
    }

    list.innerHTML = recentNotifications.map(notif => `
      <div class="notification-item ${notif.read ? 'read' : 'unread'}" data-id="${notif.id}">
        <div class="notification-icon-wrapper">
          <i class="fas ${notif.icon || 'fa-bell'}" style="color: ${notif.color || '#1976d2'}"></i>
        </div>
        <div class="notification-content">
          <div class="notification-title">${notif.title}</div>
          <div class="notification-message">${this.truncateMessage(notif.message, 60)}</div>
          <div class="notification-time">${this.formatTime(notif.timestamp)}</div>
        </div>
        ${!notif.read ? '<div class="unread-indicator"></div>' : ''}
      </div>
    `).join('');

    // Add click listeners to notification items
    list.querySelectorAll('.notification-item').forEach(item => {
      item.addEventListener('click', () => {
        const id = item.dataset.id;
        const notification = this.notifications.find(n => n.id === id);
        if (notification) {
          this.markNotificationRead(id);
          this.showNotificationDetails(notification);
        }
      });
    });
  }

  // Mark notification as read
  markNotificationRead(id) {
    const notification = this.notifications.find(n => n.id === id || n._id === id);
    if (notification && !notification.read) {
      // Optimistically update UI
      notification.read = true;
      this.unreadCount = Math.max(0, this.unreadCount - 1);
      this.updateNotificationBadge();
      this.updateNotificationDropdown();
      // Persist to backend
      const token = localStorage.getItem('gymAdminToken');
      if (token && (notification._id || notification.id)) {
        fetch(`http://localhost:5000/api/notifications/${notification._id || notification.id}/read`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }).catch(err => console.error('Failed to mark notification as read on backend:', err));
      }
    }
  }

  // Mark all notifications as read
  markAllNotificationsRead() {
    this.notifications.forEach(notif => {
      if (!notif.read) {
        notif.read = true;
      }
    });
    this.unreadCount = 0;
    this.updateNotificationBadge();
    this.updateNotificationDropdown();
    // Persist to backend
    const token = localStorage.getItem('gymAdminToken');
    if (token) {
      fetch('http://localhost:5000/api/notifications/mark-all-read', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }).catch(err => console.error('Failed to mark all notifications as read on backend:', err));
    }
    // Close dropdown
    const dropdown = document.getElementById('notificationDropdown');
    if (dropdown) {
      dropdown.classList.remove('show');
    }
  }

  // Show notification details
  showNotificationDetails(notification) {
    let content = `<h3>${notification.title}</h3><p>${notification.message}</p>`;
    
    if (notification.members && notification.members.length > 0) {
      content += `<div class="expiring-members">
        <h4>Members with expiring memberships:</h4>
        <ul style="text-align: left; margin-top: 10px;">
          ${notification.members.map(member => 
            `<li style="margin-bottom: 8px; padding: 8px; background: #f5f5f5; border-radius: 4px;">
              <strong>${member.name}</strong> (${member.planSelected || 'Unknown Plan'})
              <br><small>ID: ${member.membershipId || 'N/A'} | Expires: ${member.membershipValidUntil ? new Date(member.membershipValidUntil).toLocaleDateString() : 'N/A'}</small>
              ${member.email ? `<br><small><i class='fas fa-envelope' style='color:#1976d2;'></i> ${member.email}</small>` : ''}
              ${member.phone ? `<br><small><i class='fas fa-phone' style='color:#43a047;'></i> ${member.phone}</small>` : ''}
            </li>`
          ).join('')}
        </ul>
      </div>`;
    }

    showDialog({
      title: notification.title,
      message: content,
      confirmText: 'OK',
      iconHtml: `<i class="fas ${notification.icon || 'fa-bell'}" style="color: ${notification.color || '#1976d2'}; font-size: 2rem;"></i>`,
      onConfirm: null
    });
  }

  // Open notification modal
  openNotificationModal() {
    const modal = document.getElementById('notificationsModal');
    if (modal) {
      modal.style.display = 'flex';
      this.loadAllNotifications();
      
      // Close dropdown
      const dropdown = document.getElementById('notificationDropdown');
      if (dropdown) {
        dropdown.classList.remove('show');
      }
    }
  }

  // Close notification modal
  closeNotificationModal() {
    const modal = document.getElementById('notificationsModal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  // Load all notifications in modal
  loadAllNotifications(filter = 'all') {
    const container = document.getElementById('allNotificationsList');
    if (!container) return;

    let filteredNotifications = this.notifications;

    // Apply filter
    switch (filter) {
      case 'unread':
        filteredNotifications = this.notifications.filter(n => !n.read);
        break;
      case 'member':
        filteredNotifications = this.notifications.filter(n => 
          n.type.includes('member') || n.type.includes('membership'));
        break;
      case 'payment':
        filteredNotifications = this.notifications.filter(n => n.type.includes('payment'));
        break;
      case 'trainer':
        filteredNotifications = this.notifications.filter(n => n.type.includes('trainer'));
        break;
      case 'system':
        filteredNotifications = this.notifications.filter(n => n.type.includes('system'));
        break;
    }

    if (filteredNotifications.length === 0) {
      container.innerHTML = '<div class="no-notifications">No notifications found</div>';
      return;
    }

    container.innerHTML = filteredNotifications.map(notif => `
      <div class="notification-item-full ${notif.read ? 'read' : 'unread'}" data-id="${notif.id}">
        <div class="notification-header-full">
          <div class="notification-icon-full">
            <i class="fas ${notif.icon || 'fa-bell'}" style="color: ${notif.color || '#1976d2'}"></i>
          </div>
          <div class="notification-title-full">${notif.title}</div>
          <div class="notification-time-full">${this.formatTime(notif.timestamp)}</div>
          ${!notif.read ? '<div class="unread-dot"></div>' : ''}
        </div>
        <div class="notification-body-full">
          ${notif.message}
        </div>
        ${notif.members ? `
          <div class="notification-extra">
            <small>${notif.members.length} member${notif.members.length > 1 ? 's' : ''} affected</small>
          </div>
        ` : ''}
      </div>
    `).join('');

    // Add click listeners
    container.querySelectorAll('.notification-item-full').forEach(item => {
      item.addEventListener('click', () => {
        const id = item.dataset.id;
        const notification = this.notifications.find(n => n.id === id);
        if (notification) {
          this.markNotificationRead(id);
          this.showNotificationDetails(notification);
        }
      });
    });
  }

  // Filter notifications in modal
  filterNotifications(filter) {
    this.loadAllNotifications(filter);
  }

  // Load existing notifications from backend
  async loadExistingNotifications() {
    try {
      const token = localStorage.getItem('gymAdminToken');
      if (!token) return;

      const response = await fetch('http://localhost:5000/api/notifications/all', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.notifications) {
          this.notifications = data.notifications.map(notif => ({
            ...notif,
            timestamp: new Date(notif.timestamp)
          }));
          
          this.unreadCount = this.notifications.filter(n => !n.read).length;
          this.updateNotificationBadge();
          this.updateNotificationDropdown();
        }
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  }

  // Debug function to manually test membership expiry
  async testMembershipExpiry() {
    console.log('🧪 Testing membership expiry notifications...');
    await this.checkMembershipExpiry();
  }

  // Initialize global object for testing
  setupDebugFunctions() {
    window.notificationSystem = this;
    window.testMembershipExpiry = () => this.testMembershipExpiry();
  }

  // Utility functions
  truncateMessage(message, length) {
    return message.length > length ? message.substring(0, length) + '...' : message;
  }

  formatTime(timestamp) {
    const now = new Date();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return timestamp.toLocaleDateString();
  }

  // Play notification sound
  playNotificationSound() {
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N+QQAoUXrTp66hVFApGn+DyvmAYAjSS2e/RgzAFJoDQ8dGmRAoWZ73k3KpQEAnTp+j0vGQYAjSSm+7RgjIJJn7J8dyNOwkUYrHm4qNMDAg/ltvz4nNMDAhJ4dvz4HBNDQc4jdL34H8TCtJ++N2z8nTJC3YOyf2A4mjP9OQ');
      audio.volume = 0.3;
      audio.play().catch(() => {}); // Ignore errors if sound can't play
    } catch (error) {
      // Ignore sound errors
    }
  }

  // Public methods for triggering notifications
  notifyNewMember(memberData) {
    if (!this.settings.newMemberNotif) return;

    const notification = {
      id: `new-member-${Date.now()}`,
      type: 'new-member',
      title: 'New Member Added',
      message: `${memberData.name} has joined your gym with ${memberData.planSelected} plan`,
      timestamp: new Date(),
      read: false,
      icon: 'fa-user-plus',
      color: '#4caf50'
    };

    this.addNotification(notification);
  }

  notifyPaymentReceived(paymentData) {
    if (!this.settings.paymentNotif) return;

    const notification = {
      id: `payment-${Date.now()}`,
      type: 'payment',
      title: 'Payment Received',
      message: `₹${paymentData.amount} received from ${paymentData.memberName} for ${paymentData.plan}`,
      timestamp: new Date(),
      read: false,
      icon: 'fa-rupee-sign',
      color: '#2196f3'
    };

    this.addNotification(notification);
  }

  notifyTrainerApproval(trainerData, status) {
    if (!this.settings.trainerNotif) return;

    const notification = {
      id: `trainer-${status}-${Date.now()}`,
      type: `trainer-${status}`,
      title: `Trainer ${status === 'approved' ? 'Approved' : 'Rejected'}`,
      message: `${trainerData.name}'s trainer application has been ${status}`,
      timestamp: new Date(),
      read: false,
      icon: status === 'approved' ? 'fa-check-circle' : 'fa-times-circle',
      color: status === 'approved' ? '#4caf50' : '#f44336'
    };

    this.addNotification(notification);
  }

  // Cleanup method
  destroy() {
    this.stopPolling();
  }
}

// Global notification system instance
window.notificationSystem = null;

// Initialize notification system when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Wait for the main profile to load
  setTimeout(() => {
    window.notificationSystem = new NotificationSystem();
  }, 1000);
});

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NotificationSystem;
}
