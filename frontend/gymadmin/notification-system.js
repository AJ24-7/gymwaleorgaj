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
    
    // Check for expiring memberships and gym admin notifications immediately after initialization
    setTimeout(() => {
      this.checkMembershipExpiry();
      this.checkForGymAdminNotifications();
    }, 2000);
    
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
  }

  // Create notification UI elements
  createNotificationUI() {
    // Check if notification bell already exists
    let notificationBell = document.getElementById('notificationBell');
    if (!notificationBell) {
      // Find the user actions container or page actions
      const userActions = document.querySelector('.user-actions');
      const pageActions = document.querySelector('.page-actions');
      const targetContainer = userActions || pageActions;
      
      if (targetContainer) {
        // Create notification bell HTML
        const bellHTML = `
          <div class="notification" id="notificationBell">
            <i class="fas fa-bell notification-icon" id="notificationIcon"></i>
            <span class="notification-badge" id="notificationBadge" style="display: none;">0</span>
            <div class="notification-dropdown" id="notificationDropdown">
              <div class="notification-header">
                <h4>All Notifications</h4>
                <button class="mark-all-read" id="markAllRead">Mark All Read</button>
              </div>
              <div class="notification-filters">
                <button class="notification-filter-btn active" data-filter="all">All</button>
                <button class="notification-filter-btn" data-filter="system">System</button>
                <button class="notification-filter-btn" data-filter="admin">Admin</button>
                <button class="notification-filter-btn" data-filter="grievance">Grievances</button>
                <button class="notification-filter-btn" data-filter="membership">Membership</button>
                <button class="notification-filter-btn" data-filter="unread">Unread</button>
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
        
        // Insert before user profile or at beginning
        const userProfile = targetContainer.querySelector('.user-profile');
        if (userProfile) {
          userProfile.insertAdjacentHTML('beforebegin', bellHTML);
        } else {
          targetContainer.insertAdjacentHTML('afterbegin', bellHTML);
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
    
    // Add notification styles
    this.addNotificationStyles();
  }

  // Add notification styles
  addNotificationStyles() {
    // Check if styles already exist
    if (document.getElementById('notificationStyles')) return;
    
    const style = document.createElement('style');
    style.id = 'notificationStyles';
    style.textContent = `
      .notification {
        position: relative;
        display: inline-block;
        margin-left: 20px;
        cursor: pointer;
      }

      .notification-icon {
        font-size: 20px;
        color: #2563eb;
        padding: 8px;
        border-radius: 50%;
        transition: all 0.3s ease;
      }

      .notification-icon:hover {
        background-color: rgba(37, 99, 235, 0.1);
        transform: scale(1.1);
      }

      .notification.has-unread .notification-icon {
        color: #dc3545;
        animation: pulse 2s infinite;
      }

      @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.05); }
        100% { transform: scale(1); }
      }

      .notification-badge {
        position: absolute;
        top: 0;
        right: 0;
        background: #dc3545;
        color: white;
        border-radius: 50%;
        padding: 2px 6px;
        font-size: 12px;
        font-weight: bold;
        min-width: 18px;
        text-align: center;
        border: 2px solid white;
        z-index: 10;
      }

      .notification-dropdown {
        position: absolute;
        top: 100%;
        right: 0;
        width: 400px;
        max-height: 600px;
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
        z-index: 1000;
        display: none;
        overflow: hidden;
      }

      .notification-dropdown.show {
        display: block;
        animation: slideDown 0.3s ease;
      }

      @keyframes slideDown {
        from {
          opacity: 0;
          transform: translateY(-10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .notification-header {
        padding: 15px 20px;
        border-bottom: 1px solid #e5e7eb;
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      }

      .notification-header h4 {
        margin: 0;
        font-size: 16px;
        color: #1f2937;
        font-weight: 600;
      }

      .mark-all-read {
        background: #2563eb;
        color: white;
        border: none;
        padding: 6px 12px;
        border-radius: 6px;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.3s ease;
        font-weight: 500;
      }

      .mark-all-read:hover {
        background: #1d4ed8;
        transform: translateY(-1px);
      }

      .notification-filters {
        display: flex;
        padding: 10px 15px;
        gap: 5px;
        border-bottom: 1px solid #f3f4f6;
        background: #fafbfc;
        flex-wrap: wrap;
      }

      .notification-filter-btn {
        padding: 6px 12px;
        border: 1px solid #d1d5db;
        background: white;
        border-radius: 20px;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.3s ease;
        font-weight: 500;
        color: #374151;
      }

      .notification-filter-btn:hover {
        background: #f3f4f6;
        border-color: #9ca3af;
      }

      .notification-filter-btn.active {
        background: #2563eb;
        color: white;
        border-color: #2563eb;
      }

      .notification-list {
        max-height: 400px;
        overflow-y: auto;
      }

      .notification-item {
        padding: 15px 20px;
        border-bottom: 1px solid #f3f4f6;
        cursor: pointer;
        transition: all 0.3s ease;
        position: relative;
      }

      .notification-item:hover {
        background-color: #f8f9fa;
        transform: translateX(2px);
      }

      .notification-item.unread {
        background-color: #eff6ff;
        border-left: 4px solid #2563eb;
      }

      .notification-item.grievance {
        border-left: 4px solid #dc3545;
      }

      .notification-item.grievance.unread {
        background-color: #fef2f2;
      }

      .notification-item.admin {
        border-left: 4px solid #7c3aed;
      }

      .notification-item.admin.unread {
        background-color: #f3f4f6;
      }

      .notification-item.system {
        border-left: 4px solid #059669;
      }

      .notification-item.system.unread {
        background-color: #f0fdf4;
      }

      .notification-item.membership {
        border-left: 4px solid #d97706;
      }

      .notification-item.membership.unread {
        background-color: #fffbeb;
      }

      .notification-title {
        font-weight: 600;
        color: #1f2937;
        margin-bottom: 5px;
        font-size: 14px;
      }

      .notification-message {
        color: #6b7280;
        font-size: 13px;
        margin-bottom: 8px;
        line-height: 1.4;
      }

      .notification-meta {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 12px;
        color: #9ca3af;
      }

      .notification-time {
        font-size: 11px;
      }

      .notification-priority {
        padding: 2px 6px;
        border-radius: 12px;
        font-size: 10px;
        font-weight: 500;
        text-transform: uppercase;
      }

      .priority-high, .priority-urgent {
        background: #fee2e2;
        color: #dc2626;
      }

      .priority-medium {
        background: #fef3c7;
        color: #d97706;
      }

      .priority-low, .priority-normal {
        background: #dcfce7;
        color: #16a34a;
      }

      .notification-footer {
        padding: 12px 20px;
        border-top: 1px solid #e5e7eb;
        background: #f8f9fa;
        text-align: center;
      }

      .view-all-notifications {
        background: none;
        border: none;
        color: #2563eb;
        font-size: 13px;
        cursor: pointer;
        font-weight: 500;
      }

      .view-all-notifications:hover {
        text-decoration: underline;
      }

      .no-notifications {
        padding: 40px 20px;
        text-align: center;
        color: #6b7280;
      }

      .loading-notifications {
        padding: 40px 20px;
        text-align: center;
        color: #6b7280;
      }

      .notification-toasts {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 1001;
        pointer-events: none;
      }

      .notification-toast {
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        padding: 15px 20px;
        margin-bottom: 10px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
        max-width: 350px;
        animation: slideInRight 0.3s ease;
        pointer-events: auto;
        position: relative;
      }

      .notification-toast.grievance {
        border-left: 4px solid #dc3545;
      }

      .notification-toast.admin {
        border-left: 4px solid #7c3aed;
      }

      .notification-toast.system {
        border-left: 4px solid #059669;
      }

      .notification-toast.membership {
        border-left: 4px solid #d97706;
      }

      .notification-toast.removing {
        animation: slideOutRight 0.3s ease;
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

      @keyframes slideOutRight {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(100%);
          opacity: 0;
        }
      }

      .toast-close {
        position: absolute;
        top: 8px;
        right: 8px;
        background: none;
        border: none;
        font-size: 16px;
        cursor: pointer;
        color: #9ca3af;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .toast-close:hover {
        color: #374151;
      }

      .toast-title {
        font-weight: 600;
        margin-bottom: 5px;
        color: #1f2937;
        padding-right: 25px;
      }

      .toast-message {
        color: #6b7280;
        font-size: 13px;
        line-height: 1.4;
      }

      @media (max-width: 768px) {
        .notification-dropdown {
          width: 350px;
          right: -50px;
        }
        
        .notification-toast {
          right: 10px;
          max-width: 300px;
        }
        
        .notification-filters {
          flex-wrap: wrap;
        }
        
        .notification-filter-btn {
          font-size: 11px;
          padding: 5px 10px;
        }
      }
    `;
    
    document.head.appendChild(style);
  }

  // Create notification modal for detailed view
  createNotificationModal() {
    let modal = document.getElementById('notificationsModal');
    if (!modal) {
      // Use the same filter options as the notification dropdown for consistency
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
                <button class="filter-btn" data-filter="system">System</button>
                <button class="filter-btn" data-filter="admin">Admin</button>
                <button class="filter-btn" data-filter="membership">Membership</button>
                <button class="filter-btn" data-filter="unread">Unread</button>
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

    // Filter buttons in dropdown
    const dropdownFilterBtns = document.querySelectorAll('.notification-filter-btn');
    dropdownFilterBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent dropdown from closing
        dropdownFilterBtns.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.filterDropdownNotifications(e.target.dataset.filter);
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
    }, 7200000); // Check every 2 hours (2 * 60 * 60 * 1000 ms)
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

      // Check for regular notifications
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

      // Check for gym admin notifications (admin replies)
      await this.checkForGymAdminNotifications();
      
    } catch (error) {
      console.error('Error checking for notifications:', error);
    }
  }

  // Check for gym admin notifications from admin replies
  async checkForGymAdminNotifications() {
    try {
      const token = localStorage.getItem('gymAdminToken') || localStorage.getItem('gymAuthToken');
      if (!token) return;


      const response = await fetch('/api/gym/notifications', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.success && data.notifications && data.notifications.length > 0) {
          data.notifications.forEach(notif => {
            // Convert gym admin notification to regular notification format
            const regularNotif = {
              id: notif._id,
              type: 'admin-reply',
              title: notif.title,
              message: notif.message,
              timestamp: new Date(notif.createdAt),
              read: notif.read,
              priority: notif.priority || 'normal',
              icon: notif.type === 'grievance-reply' ? 'fa-exclamation-triangle' : 'fa-reply',
              color: notif.type === 'grievance-reply' ? '#dc3545' : '#7c3aed',
              gymNotificationId: notif._id,
              ticketId: notif.metadata && notif.metadata.ticketId ? notif.metadata.ticketId : undefined,
              metadata: notif.metadata || {}
            };
            // Check if notification already exists
            const exists = this.notifications.find(n => n.gymNotificationId === notif._id);
            if (!exists) {
              this.addNotification(regularNotif);
            }
          });
        }
      }
    } catch (error) {
      console.error('Error checking gym admin notifications:', error);
    }
  }

  // Check for membership expiry and create notifications
  async checkMembershipExpiry() {
    
    if (!this.settings.membershipExpiryNotif) {
      return;
    }

    try {
      const token = localStorage.getItem('gymAdminToken');
      if (!token) {
        return;
      }

      // Fetch all three expiry groups in parallel
      const [oneDayResponse, threeDaysResponse, sevenDaysResponse] = await Promise.all([
        fetch('http://localhost:5000/api/members/expiring?days=1', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch('http://localhost:5000/api/members/expiring?days=3', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch('http://localhost:5000/api/members/expiring?days=7', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
      ]);

      let oneDayMembers = [];
      let threeDayMembers = [];
      let sevenDayMembers = [];

      if (oneDayResponse.ok) {
        const oneDayData = await oneDayResponse.json();
        if (oneDayData.success && oneDayData.members && oneDayData.members.length > 0) {
          oneDayMembers = oneDayData.members;
          this.createMembershipExpiryNotification(oneDayMembers, 1);
        }
      } else {
        console.error('❌ 1-day expiry check failed:', oneDayResponse.status);
      }

      if (threeDaysResponse.ok) {
        const threeDaysData = await threeDaysResponse.json();
        if (threeDaysData.success && threeDaysData.members && threeDaysData.members.length > 0) {
          // Exclude members already in 1-day
          const oneDayIds = new Set(oneDayMembers.map(m => m._id || m.membershipId));
          threeDayMembers = threeDaysData.members.filter(m => !oneDayIds.has(m._id || m.membershipId));
          if (threeDayMembers.length > 0) {
            this.createMembershipExpiryNotification(threeDayMembers, 3);
          }
        }
      } else {
        console.error('❌ 3-day expiry check failed:', threeDaysResponse.status);
      }

      if (sevenDaysResponse.ok) {
        const sevenDaysData = await sevenDaysResponse.json();
        if (sevenDaysData.success && sevenDaysData.members && sevenDaysData.members.length > 0) {
          // Exclude members already in 1-day or 3-day
          const excludeIds = new Set([
            ...oneDayMembers.map(m => m._id || m.membershipId),
            ...threeDayMembers.map(m => m._id || m.membershipId)
          ]);
          sevenDayMembers = sevenDaysData.members.filter(m => !excludeIds.has(m._id || m.membershipId));
          if (sevenDayMembers.length > 0) {
            this.createMembershipExpiryNotification(sevenDayMembers, 7);
          }
        }
      } else {
        console.error('❌ 7-day expiry check failed:', sevenDaysResponse.status);
      }
    } catch (error) {
      console.error('❌ Error checking membership expiry:', error);
    }
  }

  // Create membership expiry notification
  createMembershipExpiryNotification(members, days) {
    // Debug: Log the members and days
    console.log('[MembershipExpiry] Creating expiry notification:', { days, members });

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
      console.log('[MembershipExpiry] Skipping duplicate expiry notification:', existingNotification);
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

    // Force show toast for membership expiry notifications for debugging
    this.addNotification(notification, { silent: false });
    // Debug: Confirm notification was added
    setTimeout(() => {
    }, 500);
  }

  // Add a new notification
  addNotification(notification, { silent = false } = {}) {
    // Improved duplicate check: only treat as duplicate if both IDs are defined and equal
    const exists = this.notifications.find(n => {
      if (n.id && notification.id && n.id === notification.id) return true;
      if (n.gymNotificationId && notification.gymNotificationId && n.gymNotificationId === notification.gymNotificationId) return true;
      if (n.gymNotificationId && notification.id && n.gymNotificationId === notification.id) return true;
      if (n.id && notification.gymNotificationId && n.id === notification.gymNotificationId) return true;
      return false;
    });
    if (exists) {
      return;
    }

    notification.timestamp = new Date(notification.timestamp);
    this.notifications.unshift(notification);

    if (!notification.read) {
      this.unreadCount++;
      this.updateNotificationBadge();
      // Only show toast if not silent (i.e., not loading from backend)
      if (!silent && this.shouldShowNotification(notification.type)) {
        this.showToastNotification(notification);
        this.playNotificationSound();
      }
    }

    this.updateNotificationDropdown();
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
      'system': 'adminUpdateNotif',
      'admin-reply': 'adminUpdateNotif',
      'grievance-reply': 'adminUpdateNotif'
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

  // Update notification dropdown with filtering
  updateNotificationDropdown(filter = 'all') {
    const list = document.getElementById('notificationList');
    if (!list) return;

    let filteredNotifications = this.notifications;
    
    // Apply filter
    switch (filter) {
      case 'unread':
        filteredNotifications = this.notifications.filter(n => !n.read);
        break;
      case 'admin':
        filteredNotifications = this.notifications.filter(n => 
          n.type === 'admin-reply' || n.type === 'grievance-reply' || n.type === 'admin-message');
        break;
      case 'grievance':
        filteredNotifications = this.notifications.filter(n => 
          n.type === 'grievance-reply' || n.type === 'grievance' || (n.message && n.message.toLowerCase().includes('grievance')));
        break;
      case 'membership':
        filteredNotifications = this.notifications.filter(n => 
          n.type === 'membership-expiry' || n.type === 'membership' || n.type === 'new-member');
        break;
      case 'system':
        filteredNotifications = this.notifications.filter(n => 
          n.type === 'system' || n.type === 'payment' || n.type === 'trainer-approved' || n.type === 'trainer-rejected');
        break;
      default:
        filteredNotifications = this.notifications;
    }

    const recentNotifications = filteredNotifications.slice(0, 10);
    
    if (recentNotifications.length === 0) {
      list.innerHTML = '<div class="no-notifications">No notifications found</div>';
      return;
    }

    list.innerHTML = recentNotifications.map(notif => `
      <div class="notification-item ${notif.read ? 'read' : 'unread'} ${this.getNotificationClass(notif.type)}" data-id="${notif.id}">
        <div class="notification-icon-wrapper">
          <i class="fas ${notif.icon || 'fa-bell'}" style="color: ${notif.color || '#1976d2'}"></i>
        </div>
        <div class="notification-content">
          <div class="notification-title">${notif.title}</div>
          <div class="notification-message">${this.truncateMessage(notif.message, 60)}</div>
          <div class="notification-meta">
            <span class="notification-time">${this.formatTime(notif.timestamp)}</span>
            <span class="notification-priority priority-${notif.priority || 'normal'}">${notif.priority || 'normal'}</span>
          </div>
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

  // Get notification class based on type
  getNotificationClass(type) {
    if (type === 'admin-reply' || type === 'grievance-reply' || type === 'admin-message') {
      return 'admin';
    } else if (type === 'grievance-reply' || type === 'grievance') {
      return 'grievance';
    } else if (type === 'membership-expiry' || type === 'membership' || type === 'new-member') {
      return 'membership';
    } else if (type === 'system' || type === 'payment' || type === 'trainer-approved' || type === 'trainer-rejected') {
      return 'system';
    }
    return '';
  }

  // Filter dropdown notifications
  filterDropdownNotifications(filter) {
    this.updateNotificationDropdown(filter);
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
      const token = localStorage.getItem('gymAdminToken') || localStorage.getItem('gymAuthToken');
      if (token) {
        // Check if it's a gym admin notification
        if (notification.gymNotificationId) {
          // Mark gym admin notification as read
          fetch(`/api/gym/notifications/${notification.gymNotificationId}/read`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }).catch(err => console.error('Failed to mark gym notification as read:', err));
        } else if (notification._id || notification.id) {
          // Mark regular notification as read
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
  async showNotificationDetails(notification) {
    let content = '';
    // For admin/grievance replies, fetch and show full admin reply if ticketId is present
    if ((notification.type === 'admin-reply' || notification.type === 'grievance-reply') && notification.ticketId) {
      content = `<div class="dialog-message" style="min-height:40px;">Loading full reply...</div>`;
      // Use admin icon for admin/grievance notifications
      showDialog({
        title: notification.title,
        message: content,
        confirmText: 'OK',
        iconHtml: `<i class="fas fa-user-shield" style="color: #7c3aed; font-size: 2rem;"></i>`,
        onConfirm: null
      });
      let fallbackMsg = '';
      // Try to get adminMessage from notification.metadata if available
      if (notification.metadata && notification.metadata.adminMessage) {
        fallbackMsg = `<div style="white-space: pre-line;">${notification.metadata.adminMessage}</div>`;
      }
      // Always show ticketId
      let ticketIdHtml = `<div style="margin-bottom:8px;"><strong>Ticket ID:</strong> ${notification.ticketId}</div>`;
      try {
        const token = localStorage.getItem('gymAdminToken') || localStorage.getItem('gymAuthToken');
        const res = await fetch(`http://localhost:5000/api/support/tickets/${notification.ticketId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        let replyHtml = '';
        if (res.ok) {
          const data = await res.json();
          if (data.ticket && Array.isArray(data.ticket.messages)) {
            // Find the latest admin message
            const adminMsgs = data.ticket.messages.filter(m => m.sender === 'admin');
            const lastAdminMsg = adminMsgs.length > 0 ? adminMsgs[adminMsgs.length - 1] : null;
            if (lastAdminMsg) {
              replyHtml = `<div style="white-space: pre-line;">${lastAdminMsg.message}</div>`;
            } else if (fallbackMsg) {
              replyHtml = fallbackMsg;
            } else {
              replyHtml = `<div>No admin reply found for this ticket.</div>`;
            }
          } else {
            replyHtml = fallbackMsg || '<div>Could not load ticket details.</div>';
          }
        } else {
          replyHtml = fallbackMsg || '<div>Could not load ticket details.</div>';
        }
        // Add ticketId and reply only (no View Ticket button)
        replyHtml = ticketIdHtml + replyHtml;
        // Try to update dialog content
        let dialogMsg = document.querySelector('.dialog-message');
        if (dialogMsg) {
          dialogMsg.innerHTML = replyHtml;
        } else {
          // If not found, re-show dialog with correct content
          showDialog({
            title: notification.title,
            message: `<div class="dialog-message">${replyHtml}</div>`,
            confirmText: 'OK',
            iconHtml: `<i class="fas fa-user-shield" style="color: #7c3aed; font-size: 2rem;"></i>`,
            onConfirm: null
          });
        }
      } catch (err) {
        // On error, show fallback content
        let replyHtml = ticketIdHtml + (fallbackMsg || '<div>Error loading ticket details.</div>');
        let dialogMsg = document.querySelector('.dialog-message');
        if (dialogMsg) {
          dialogMsg.innerHTML = replyHtml;
        } else {
          showDialog({
            title: notification.title,
            message: `<div class="dialog-message">${replyHtml}</div>`,
            confirmText: 'OK',
            iconHtml: `<i class="fas fa-user-shield" style="color: #7c3aed; font-size: 2rem;"></i>`,
            onConfirm: null
          });
        }
      }
      // No View Ticket button, so no event listener needed
    } else {
      if (notification.message) {
        content += `<p>${notification.message}</p>`;
      }
      if (notification.members && notification.members.length > 0) {
        content += `<div class="expiring-members">
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

    // Apply filter (same logic as dropdown)
    switch (filter) {
      case 'unread':
        filteredNotifications = this.notifications.filter(n => !n.read);
        break;
      case 'admin':
        filteredNotifications = this.notifications.filter(n => 
          n.type === 'admin-reply' || n.type === 'grievance-reply' || n.type === 'admin-message');
        break;
      case 'grievance':
        filteredNotifications = this.notifications.filter(n => 
          n.type === 'grievance-reply' || n.type === 'grievance' || (n.message && n.message.toLowerCase().includes('grievance')));
        break;
      case 'membership':
        filteredNotifications = this.notifications.filter(n => 
          n.type === 'membership-expiry' || n.type === 'membership' || n.type === 'new-member');
        break;
      case 'system':
        filteredNotifications = this.notifications.filter(n => 
          n.type === 'system' || n.type === 'payment' || n.type === 'trainer-approved' || n.type === 'trainer-rejected');
        break;
      default:
        filteredNotifications = this.notifications;
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
          // Instead of resetting, merge notifications
          const existing = this.notifications.slice();
          data.notifications.forEach(notif => {
            this.addNotification({
              ...notif,
              timestamp: new Date(notif.timestamp)
            }, { silent: true }); // Prevent toast for loaded notifications
          });
          // Merge all unique notifications (robust)
          const allNotifs = [
            ...this.notifications,
            ...existing.filter(n =>
              !this.notifications.find(m => m.id === n.id || (m.gymNotificationId && m.gymNotificationId === n.gymNotificationId))
            )
          ];
          // Remove duplicates by id
          const unique = [];
          const seen = new Set();
          for (const n of allNotifs) {
            const key = n.id || n.gymNotificationId;
            if (!seen.has(key)) {
              unique.push(n);
              seen.add(key);
            }
          }
          this.notifications = unique;
          this.unreadCount = this.notifications.filter(n => !n.read).length;
          this.updateNotificationBadge();
          this.updateNotificationDropdown();
        }
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  }

 

 
  // Initialize global object for testing
  setupDebugFunctions() {
    window.notificationSystem = this;
    window.testMembershipExpiry = () => this.testMembershipExpiry();
    window.testGymAdminNotifications = () => this.testGymAdminNotifications();
    window.testUnifiedNotificationSystem = () => this.testUnifiedNotificationSystem();
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
  module.exports = { NotificationSystem };
}
