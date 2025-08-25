// === AUTOMATED NOTIFICATION SYSTEM ===
// Integrated with Settings Tab - Real-time Notifications

class NotificationSystem {
  constructor() {
    this.settings = this.loadNotificationSettings();
    this.notifications = [];
    this.unreadCount = 0;
    this.websocket = null;
    this.pollingInterval = null;
    
    // Enhanced notification tracking system
    this.notificationSignatures = new Map(); // Track notification signatures
    this.suppressionCache = new Map(); // Cache for suppressed notifications
    
    this.initializeSystem();
  }

  // Initialize the notification system
  initializeSystem() {
    this.createNotificationUI();
    this.bindEventListeners();
    this.startPolling();
    this.loadExistingNotifications();
    
    // Load suppression cache for enhanced notification management
    this.loadSuppressionCache();
    
    // Setup debug functions
    this.setupDebugFunctions();
    
    // Check for expiring memberships and gym admin notifications immediately after initialization
    setTimeout(() => {
      this.checkMembershipExpiry();
      this.checkPendingPayments();
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
        z-index: 1210;
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
        z-index: 999999;
        display: none;
        overflow: hidden;
        max-height: calc(100vh - 120px);
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
        top: 80px;
        right: 20px;
        z-index: 999999;
        pointer-events: none;
        width: auto;
        max-width: 350px;
        max-height: calc(100vh - 100px);
        overflow-y: auto;
      }

      .notification-toast {
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        padding: 15px 20px;
        margin-bottom: 10px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
        width: 100%;
        max-width: 350px;
        min-width: 280px;
        animation: slideInRight 0.3s ease;
        pointer-events: auto;
        position: relative;
        word-wrap: break-word;
        overflow-wrap: break-word;
        box-sizing: border-box;
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
        line-height: 1.3;
      }

      .toast-message {
        color: #6b7280;
        font-size: 13px;
        line-height: 1.4;
        word-break: break-word;
      }

      @media (max-width: 768px) {
        .notification-dropdown {
          width: 320px;
          right: -50px;
          max-height: 500px;
        }
        
        .notification-toasts {
          top: 70px;
          right: 10px;
          left: 10px;
          width: auto;
          max-width: none;
        }
        
        .notification-toast {
          max-width: none;
          width: calc(100% - 20px);
          margin-left: 0;
          margin-right: 0;
          min-width: auto;
        }
        
        .notification-filters {
          flex-wrap: wrap;
          padding: 8px 12px;
        }
        
        .notification-filter-btn {
          font-size: 11px;
          padding: 5px 10px;
          margin: 2px;
        }
        
        .notification-header h4 {
          font-size: 14px;
        }
        
        .mark-all-read {
          font-size: 11px;
          padding: 5px 10px;
        }
      }

      @media (max-width: 480px) {
        .notification-dropdown {
          width: 300px;
          right: -60px;
          max-height: 400px;
        }
        
        .notification-toasts {
          top: 65px;
          right: 5px;
          left: 5px;
        }
        
        .notification-toast {
          padding: 12px 15px;
          font-size: 13px;
        }
        
        .toast-title {
          font-size: 13px;
        }
        
        .toast-message {
          font-size: 12px;
        }
      }

      @media (min-width: 1200px) {
        .notification-toasts {
          right: 30px;
        }
        
        .notification-toast {
          max-width: 380px;
        }
      }

      @media (min-width: 1600px) {
        .notification-toasts {
          right: 50px;
        }
        
        .notification-toast {
          max-width: 400px;
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
      markAllRead.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        this.markAllNotificationsRead();
      });
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

    // Listen for Mark as Paid buttons in notifications
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('mark-paid-btn') && e.target.dataset.source === 'notification') {
        e.preventDefault();
        e.stopPropagation();
        const memberId = e.target.dataset.memberId;
        if (memberId && window.sevenDayAllowanceManager) {
          window.sevenDayAllowanceManager.showMarkAsPaidModal(memberId, 'notification');
        }
      }
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
      this.checkPendingPayments();
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
        _id: member._id, // Keep the original _id for mark as paid functionality
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

  // Check for members with pending payments
  async checkPendingPayments() {
    if (!this.settings.paymentNotif) {
      return;
    }

    try {
      const token = localStorage.getItem('gymAdminToken');
      if (!token) {
        return;
      }

      // Fetch members with pending payments
      const response = await fetch('http://localhost:5000/api/members', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.error('❌ Failed to fetch members for payment check:', response.status);
        return;
      }

      const members = await response.json();
      if (!Array.isArray(members)) {
        console.error('❌ Invalid members data received');
        return;
      }

      // Filter members with pending payments or overdue status
      const pendingPaymentMembers = members.filter(member => {
        return (
          member.paymentStatus === 'pending' || 
          member.paymentStatus === 'overdue' ||
          (member.pendingPaymentAmount && member.pendingPaymentAmount > 0)
        );
      });

      if (pendingPaymentMembers.length > 0) {
        this.createPendingPaymentNotification(pendingPaymentMembers);
      }

    } catch (error) {
      console.error('❌ Error checking pending payments:', error);
    }
  }

  // Create pending payment notification
  createPendingPaymentNotification(members) {
    console.log('[PendingPayments] Creating pending payment notification:', { members });

    // Create unique ID to prevent duplicates
    const memberIds = members.map(m => m._id || m.membershipId).join(',');
    const notificationId = `pending-payments-${Date.now()}-${memberIds.slice(0, 20)}`;

    // Check if similar notification already exists (within last 4 hours)
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
    const existingNotification = this.notifications.find(n => 
      n.type === 'pending-payments' && 
      n.timestamp > fourHoursAgo &&
      n.members && n.members.length === members.length
    );

    if (existingNotification) {
      console.log('[PendingPayments] Skipping duplicate pending payment notification:', existingNotification);
      return;
    }

    // Separate overdue and pending members
    const overdueMembers = members.filter(m => m.paymentStatus === 'overdue');
    const pendingMembers = members.filter(m => m.paymentStatus === 'pending' || (m.pendingPaymentAmount && m.pendingPaymentAmount > 0 && m.paymentStatus !== 'overdue'));

    let title = '';
    let message = '';
    let priority = 'normal';
    let color = '#ffa726';

    if (overdueMembers.length > 0 && pendingMembers.length > 0) {
      title = `Payment Issues: ${overdueMembers.length} Overdue, ${pendingMembers.length} Pending`;
      message = `${overdueMembers.length} member${overdueMembers.length > 1 ? 's have' : ' has'} overdue payments and ${pendingMembers.length} member${pendingMembers.length > 1 ? 's have' : ' has'} pending payments`;
      priority = 'high';
      color = '#ff6b35';
    } else if (overdueMembers.length > 0) {
      title = `Overdue Payments: ${overdueMembers.length} Member${overdueMembers.length > 1 ? 's' : ''}`;
      message = `${overdueMembers.length} member${overdueMembers.length > 1 ? 's have' : ' has'} overdue payments requiring immediate attention`;
      priority = 'high';
      color = '#d63031';
    } else {
      title = `Pending Payments: ${pendingMembers.length} Member${pendingMembers.length > 1 ? 's' : ''}`;
      message = `${pendingMembers.length} member${pendingMembers.length > 1 ? 's have' : ' has'} pending payments`;
      priority = 'medium';
      color = '#ffa726';
    }

    const notification = {
      id: notificationId,
      type: 'pending-payments',
      title: title,
      message: message,
      timestamp: new Date(),
      read: false,
      priority: priority,
      members: members.map(member => ({
        _id: member._id, // Keep the original _id for mark as paid functionality
        name: member.memberName || member.name || 'Unknown',
        membershipId: member.membershipId || member._id,
        paymentStatus: member.paymentStatus || 'pending',
        pendingAmount: member.pendingPaymentAmount || 0,
        nextPaymentDue: member.nextPaymentDue,
        email: member.email,
        phone: member.phone,
        planSelected: member.planSelected
      })),
      icon: 'fa-credit-card',
      color: color
    };

    this.addNotification(notification, { silent: false });
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

    // Check if notification was recently read (within 2 hours)
    const readTimestamps = this.getNotificationReadTimestamps();
    const notifKey = notification.id || notification._id;
    let suppressPopup = false;
    if (notifKey && readTimestamps[notifKey]) {
      const lastRead = new Date(readTimestamps[notifKey]);
      const now = new Date();
      if (now - lastRead < 2 * 60 * 60 * 1000) { // 2 hours in milliseconds
        suppressPopup = true;
      }
    }

    if (!notification.read) {
      this.unreadCount++;
      this.updateNotificationBadge();
      // Only show toast if not silent (i.e., not loading from backend) and not suppressed
      if (!silent && this.shouldShowNotification(notification.type) && !suppressPopup) {
        this.showToastNotification(notification);
        this.playNotificationSound();
      }
    }

    this.updateNotificationDropdown();
  }

  // Helper to get notification read timestamps from localStorage
  getNotificationReadTimestamps() {
    try {
      return JSON.parse(localStorage.getItem('notificationReadTimestamps') || '{}');
    } catch (e) {
      return {};
    }
  }

  // Helper to set notification read timestamps in localStorage
  setNotificationReadTimestamp(id) {
    if (!id) return;
    const timestamps = this.getNotificationReadTimestamps();
    timestamps[id] = new Date().toISOString();
    // Clean up old timestamps (older than 7 days to prevent localStorage bloat)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    Object.keys(timestamps).forEach(key => {
      if (new Date(timestamps[key]) < sevenDaysAgo) {
        delete timestamps[key];
      }
    });
    localStorage.setItem('notificationReadTimestamps', JSON.stringify(timestamps));
  }

  // Enhanced notification signature system for popup suppression
  generateNotificationSignature(title, message, type = '') {
    const content = (title + message + type).toLowerCase().replace(/\s+/g, ' ').trim();
    const signature = btoa(content).substring(0, 16); // Base64 encoded, truncated
    return signature;
  }

  isNotificationSuppressed(signature) {
    const suppressionData = this.suppressionCache.get(signature);
    if (!suppressionData) return false;
    
    const now = Date.now();
    const timeDiff = now - suppressionData.timestamp;
    const suppressionDuration = 2 * 60 * 60 * 1000; // 2 hours
    
    return timeDiff < suppressionDuration;
  }

  suppressNotification(signature) {
    this.suppressionCache.set(signature, {
      timestamp: Date.now(),
      count: (this.suppressionCache.get(signature)?.count || 0) + 1
    });
    
    // Persist to localStorage
    this.saveSuppressionCache();
  }

  loadSuppressionCache() {
    try {
      const cached = localStorage.getItem('notification_suppression_cache');
      if (cached) {
        const data = JSON.parse(cached);
        this.suppressionCache = new Map(Object.entries(data));
      }
    } catch (error) {
      console.warn('Failed to load suppression cache:', error);
      this.suppressionCache = new Map();
    }
  }

  saveSuppressionCache() {
    try {
      const cacheData = Object.fromEntries(this.suppressionCache);
      localStorage.setItem('notification_suppression_cache', JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Failed to save suppression cache:', error);
    }
  }

  // Enhanced unified notification wrapper - use this for all new notifications
  addNotificationUnified(title, message, type = 'info', actionButton = null, priority = 'normal') {
    // Generate unique signature for this notification
    const signature = this.generateNotificationSignature(title, message, type);
    
    // Check if this notification is suppressed
    if (this.isNotificationSuppressed(signature)) {
      console.log(`Notification suppressed (signature: ${signature}):`, title);
      return { suppressed: true, signature };
    }

    // Create notification object
    const notification = {
      id: Date.now() + Math.random(),
      title,
      message,
      type,
      timestamp: new Date().toISOString(),
      read: false,
      signature,
      priority,
      actionButton
    };

    // Add to notifications array
    this.notifications.unshift(notification);
    this.unreadCount++;
    this.updateNotificationBadge();
    this.updateNotificationDropdown();

    // Show popup/toast only if enabled and not suppressed
    if (this.shouldShowNotification(type)) {
      this.showToastNotification(notification);
      this.playNotificationSound();
    }

    // Trigger callbacks
    if (typeof this.onNewNotification === 'function') {
      this.onNewNotification(notification);
    }

    return { success: true, notification, signature };
  }

  // Generic method for showing notifications (compatible with payment.js)
  showNotification(title, message, urgency = 'medium', type = 'info') {
    const urgencyColorMap = {
      'low': '#3b82f6',     // Blue
      'medium': '#f59e0b',  // Orange
      'high': '#ef4444'     // Red
    };

    const typeIconMap = {
      'info': 'fa-info-circle',
      'warning': 'fa-exclamation-triangle',
      'error': 'fa-times-circle',
      'success': 'fa-check-circle'
    };

    const notification = {
      id: `notification-${Date.now()}`,
      type: type === 'warning' ? 'payment' : type,
      title: title,
      message: message,
      timestamp: new Date(),
      read: false,
      icon: typeIconMap[type] || 'fa-bell',
      color: urgencyColorMap[urgency] || '#3b82f6'
    };

    this.addNotification(notification);
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

    // Show newest notifications at the top
    list.innerHTML = recentNotifications
      .slice() // copy array
      .reverse() // reverse so newest is first
      .map(notif => `
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
      `)
      .join('');

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

      // Persist read timestamp in localStorage for 2-hour suppression
      this.setNotificationReadTimestamp(notification.id || notification._id);
      
      // Enhanced: Add signature-based suppression for unified notification management
      if (notification.signature) {
        this.suppressNotification(notification.signature);
      } else if (notification.title && notification.message) {
        // Generate signature for existing notifications without one
        const signature = this.generateNotificationSignature(notification.title, notification.message, notification.type);
        this.suppressNotification(signature);
      }
      
      // Only persist to backend if it's a valid database notification
      const token = localStorage.getItem('gymAdminToken') || localStorage.getItem('gymAuthToken');
      if (token && this.isValidDatabaseNotification(notification)) {
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

  // Check if notification is a valid database notification
  isValidDatabaseNotification(notification) {
    const id = notification._id || notification.id;
    if (!id) return false;
    
    // Check if it's a MongoDB ObjectId (24 character hex string)
    const objectIdRegex = /^[a-f\d]{24}$/i;
    
    // Client-generated notifications have custom IDs that don't match ObjectId format
    // These include pending-payments, membership-expiry notifications created by the frontend
    if (typeof id === 'string' && !objectIdRegex.test(id)) {
      return false;
    }
    
    return true;
  }

  // Mark all notifications as read
  markAllNotificationsRead() {
    this.notifications.forEach(notif => {
      if (!notif.read) {
        notif.read = true;
        // Persist read timestamp for each notification
        this.setNotificationReadTimestamp(notif.id || notif._id);
        
        // Enhanced: Add signature-based suppression for unified notification management
        if (notif.signature) {
          this.suppressNotification(notif.signature);
        } else if (notif.title && notif.message) {
          // Generate signature for existing notifications without one
          const signature = this.generateNotificationSignature(notif.title, notif.message, notif.type);
          this.suppressNotification(signature);
        }
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
        content += `<div class="member-details">
          <ul style="text-align: left; margin-top: 10px;">
            ${notification.members.map(member => {
              let memberInfo = `<li style="margin-bottom: 8px; padding: 8px; background: #f5f5f5; border-radius: 4px;">
                <strong>${member.name}</strong>`;
              
              // Add payment status badge for pending payment notifications
              if (notification.type === 'pending-payments' && member.paymentStatus) {
                const statusColor = member.paymentStatus === 'overdue' ? '#d63031' : '#ffa726';
                const statusIcon = member.paymentStatus === 'overdue' ? '⚠️' : '💳';
                memberInfo += ` <span style="background:${statusColor};color:white;padding:2px 6px;border-radius:8px;font-size:0.8em;">${statusIcon} ${member.paymentStatus.toUpperCase()}</span>`;
              }
              
              memberInfo += `<br><small>ID: ${member.membershipId || 'N/A'}`;
              
              // Show plan and expiry for membership notifications
              if (notification.type === 'membership-expiry') {
                memberInfo += ` | Plan: ${member.planSelected || 'Unknown Plan'} | Expires: ${member.membershipValidUntil ? new Date(member.membershipValidUntil).toLocaleDateString() : 'N/A'}`;
              }
              
              // Show payment details for payment notifications
              if (notification.type === 'pending-payments') {
                if (member.pendingAmount && member.pendingAmount > 0) {
                  memberInfo += ` | Pending: ₹${member.pendingAmount}`;
                }
                if (member.nextPaymentDue) {
                  memberInfo += ` | Due: ${new Date(member.nextPaymentDue).toLocaleDateString()}`;
                }
                if (member.planSelected) {
                  memberInfo += ` | Plan: ${member.planSelected}`;
                }
              }
              
              memberInfo += `</small>`;
              
              // Add contact info
              if (member.email) {
                memberInfo += `<br><small><i class='fas fa-envelope' style='color:#1976d2;'></i> ${member.email}</small>`;
              }
              if (member.phone) {
                memberInfo += `<br><small><i class='fas fa-phone' style='color:#43a047;'></i> ${member.phone}</small>`;
              }
              
              memberInfo += `</li>`;
              return memberInfo;
            }).join('')}
          </ul>
        </div>`;
      }
      // Create custom footer based on notification type
      let customFooter = '';
      if ((notification.type === 'pending-payments' || notification.type === 'membership-expiry') && notification.members && notification.members.length > 0) {
        const hasPendingMembers = notification.members.some(member => 
          member.paymentStatus === 'pending' || member.paymentStatus === 'overdue' || notification.type === 'membership-expiry'
        );
        
        if (hasPendingMembers) {
          if (notification.members.length === 1) {
            // Single member - one Mark Paid button
            const member = notification.members[0];
            const memberId = member._id || member.membershipId;
            customFooter = `
              <div style="display:flex;gap:12px;justify-content:center;">
                <button class="mark-paid-btn-dialog" data-member-id="${memberId}" data-source="notification" style="background:#28a745;color:#fff;padding:10px 20px;border:none;border-radius:8px;font-size:1em;cursor:pointer;font-weight:600;transition:background 0.2s ease;display:flex;align-items:center;gap:6px;">
                  <i class="fas fa-check-circle"></i> Mark Paid
                </button>
                <button id="dialogConfirmBtn" style="background:#1976d2;color:#fff;padding:10px 28px;border:none;border-radius:8px;font-size:1em;cursor:pointer;font-weight:600;transition:background 0.2s ease;">OK</button>
              </div>`;
          } else {
            // Multiple members - Mark All Paid button
            customFooter = `
              <div style="display:flex;gap:12px;justify-content:center;">
                <button class="mark-all-paid-btn-dialog" data-notification-members='${JSON.stringify(notification.members.map(m => ({ id: m._id || m.membershipId, name: m.name })))}' data-source="notification" style="background:#28a745;color:#fff;padding:10px 20px;border:none;border-radius:8px;font-size:1em;cursor:pointer;font-weight:600;transition:background 0.2s ease;display:flex;align-items:center;gap:6px;">
                  <i class="fas fa-check-circle"></i> Mark All Paid
                </button>
                <button id="dialogConfirmBtn" style="background:#1976d2;color:#fff;padding:10px 28px;border:none;border-radius:8px;font-size:1em;cursor:pointer;font-weight:600;transition:background 0.2s ease;">OK</button>
              </div>`;
          }
        } else {
          // No pending members, just OK button
          customFooter = `<button id="dialogConfirmBtn" style="background:#1976d2;color:#fff;padding:10px 28px;border:none;border-radius:8px;font-size:1em;cursor:pointer;font-weight:600;transition:background 0.2s ease;">OK</button>`;
        }
      }

      showDialog({
        title: notification.title,
        message: content,
        customFooter: customFooter,
        iconHtml: `<i class="fas ${notification.icon || 'fa-bell'}" style="color: ${notification.color || '#1976d2'}; font-size: 2rem;"></i>`,
        onConfirm: () => {
          // Mark notification as read when OK is clicked
          if (this.isValidDatabaseNotification(notification.id || notification._id)) {
            this.markNotificationRead(notification.id || notification._id);
          }
        }
      });

      // Add event listeners for Mark Paid buttons after dialog is created
      setTimeout(() => {
        // Single member Mark Paid button
        const markPaidBtn = document.querySelector('.mark-paid-btn-dialog');
        if (markPaidBtn) {
          markPaidBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const memberId = e.target.closest('.mark-paid-btn-dialog').dataset.memberId;
            const dialog = document.getElementById('customDialogBox');
            if (dialog) {
              dialog.remove();
              document.body.style.overflow = '';
            }
            
            if (memberId && window.sevenDayAllowanceManager) {
              // Get member details to pass pending amount
              const member = notification.members.find(m => (m._id || m.membershipId) === memberId);
              if (member && member.pendingAmount) {
                // Pre-fill the amount in the mark as paid modal
                window.sevenDayAllowanceManager.showMarkAsPaidModal(memberId, 'notification', member.pendingAmount);
              } else {
                window.sevenDayAllowanceManager.showMarkAsPaidModal(memberId, 'notification');
              }
            }
          });
        }

        // Mark All Paid button
        const markAllPaidBtn = document.querySelector('.mark-all-paid-btn-dialog');
        if (markAllPaidBtn) {
          markAllPaidBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const dialog = document.getElementById('customDialogBox');
            if (dialog) {
              dialog.remove();
              document.body.style.overflow = '';
            }
            
            // Show confirmation for marking all as paid
            showDialog({
              title: 'Mark All Members as Paid',
              message: `Are you sure you want to mark all ${notification.members.length} members as paid? This will process payments for:\n\n${notification.members.map(m => `• ${m.name} (${m.membershipId || 'N/A'})`).join('\n')}`,
              confirmText: 'Mark All Paid',
              cancelText: 'Cancel',
              iconHtml: '<i class="fas fa-credit-card" style="color: #28a745; font-size: 2rem;"></i>',
              onConfirm: () => {
                // Process all members
                if (window.sevenDayAllowanceManager && notification.members) {
                  notification.members.forEach((member, index) => {
                    const memberId = member._id || member.membershipId;
                    if (memberId) {
                      setTimeout(() => {
                        if (member.pendingAmount) {
                          window.sevenDayAllowanceManager.showMarkAsPaidModal(memberId, 'notification', member.pendingAmount);
                        } else {
                          window.sevenDayAllowanceManager.showMarkAsPaidModal(memberId, 'notification');
                        }
                      }, index * 500); // Stagger the calls to avoid overwhelming
                    }
                  });
                }
              }
            });
          });
        }
      }, 100);
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
    window.testNotificationPositioning = () => this.testNotificationPositioning();
  }

  // Test notification positioning and z-index fix
  testNotificationPositioning() {
    console.log('🧪 Testing notification positioning...');
    
    // Create test membership expiry notification
    const testMembers = [
      {
        name: 'John Doe',
        membershipId: 'M001',
        membershipValidUntil: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        planSelected: 'Gold Plan',
        email: 'john@example.com',
        phone: '+1234567890'
      },
      {
        name: 'Jane Smith',
        membershipId: 'M002', 
        membershipValidUntil: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        planSelected: 'Silver Plan',
        email: 'jane@example.com',
        phone: '+1234567891'
      }
    ];
    
    this.createMembershipExpiryNotification(testMembers, 1);
    
    // Create test payment notification
    const testPaymentMembers = [
      {
        name: 'Bob Wilson',
        membershipId: 'M003',
        paymentStatus: 'overdue',
        pendingAmount: 2500,
        email: 'bob@example.com',
        phone: '+1234567892',
        planSelected: 'Platinum Plan'
      }
    ];
    
    this.createPendingPaymentNotification(testPaymentMembers);
    
    // Create test admin reply notification
    const adminReplyNotification = {
      id: `admin-reply-test-${Date.now()}`,
      type: 'admin-reply',
      title: 'Admin Reply to Your Query',
      message: 'Your membership renewal request has been processed successfully.',
      timestamp: new Date(),
      read: false,
      priority: 'normal',
      icon: 'fa-reply',
      color: '#7c3aed'
    };
    
    this.addNotification(adminReplyNotification);
    
    console.log('✅ Test notifications created! Check if:');
    console.log('   - Notifications appear above navbar (not behind it)');
    console.log('   - Notifications are properly positioned on mobile');
    console.log('   - Dropdown has correct z-index');
    console.log('   - Toast notifications slide in from right');
    
    return 'Test notifications created successfully!';
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

  notifyPaymentDue(paymentData, daysUntilDue) {
    if (!this.settings.paymentNotif) return;

    let urgency = 'low';
    let color = '#3b82f6';
    let title = 'Payment Reminder';
    let icon = 'fa-clock';

    if (daysUntilDue < 0) {
      urgency = 'high';
      color = '#ef4444';
      title = 'Payment Overdue';
      icon = 'fa-exclamation-triangle';
    } else if (daysUntilDue <= 1) {
      urgency = 'high';
      color = '#f59e0b';
      title = 'Payment Due Soon';
      icon = 'fa-bell';
    } else if (daysUntilDue <= 3) {
      urgency = 'medium';
      color = '#f59e0b';
    }

    const notification = {
      id: `payment-due-${paymentData._id || Date.now()}`,
      type: 'payment-reminder',
      title: title,
      message: this.getPaymentDueMessage(paymentData, daysUntilDue),
      timestamp: new Date(),
      read: false,
      icon: icon,
      color: color,
      urgency: urgency,
      paymentId: paymentData._id
    };

    this.addNotification(notification);
  }

  notifyMemberPaymentPending(memberData) {
    if (!this.settings.paymentNotif) return;

    const notification = {
      id: `member-payment-pending-${memberData._id || Date.now()}`,
      type: 'member-payment-pending',
      title: 'Member Payment Pending',
      message: `${memberData.memberName} has a pending payment of ₹${memberData.pendingPaymentAmount}`,
      timestamp: new Date(),
      read: false,
      icon: 'fa-user-clock',
      color: '#f59e0b',
      urgency: 'medium',
      memberId: memberData._id
    };

    this.addNotification(notification);
  }

  notifyMemberPaymentOverdue(memberData, daysOverdue) {
    if (!this.settings.paymentNotif) return;

    const notification = {
      id: `member-payment-overdue-${memberData._id || Date.now()}`,
      type: 'member-payment-overdue',
      title: 'Member Payment Overdue',
      message: `${memberData.memberName} payment is ${daysOverdue} days overdue (₹${memberData.pendingPaymentAmount})`,
      timestamp: new Date(),
      read: false,
      icon: 'fa-user-times',
      color: '#ef4444',
      urgency: 'high',
      memberId: memberData._id
    };

    this.addNotification(notification);
  }

  getPaymentDueMessage(paymentData, daysUntilDue) {
    const amount = paymentData.amount ? `₹${this.formatCurrency(paymentData.amount)}` : '';
    const description = paymentData.description || 'Payment';
    
    if (daysUntilDue < 0) {
      return `${description} is ${Math.abs(daysUntilDue)} day${Math.abs(daysUntilDue) !== 1 ? 's' : ''} overdue (${amount})`;
    } else if (daysUntilDue === 0) {
      return `${description} is due today (${amount})`;
    } else if (daysUntilDue === 1) {
      return `${description} is due tomorrow (${amount})`;
    } else {
      return `${description} is due in ${daysUntilDue} days (${amount})`;
    }
  }

  formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN').format(amount);
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

  // Enhanced Universal Notification Wrapper Methods for External JS Files
  
  // Universal notification method with enhanced suppression
  static notify(title, message, type = 'info', options = {}) {
    return new Promise((resolve) => {
      const waitForSystem = () => {
        if (window.notificationSystem && window.notificationSystem.addNotificationUnified) {
          const result = window.notificationSystem.addNotificationUnified(
            title, 
            message, 
            type, 
            options.actionButton, 
            options.priority || 'normal'
          );
          resolve(result);
        } else {
          setTimeout(waitForSystem, 100);
        }
      };
      waitForSystem();
    });
  }

  // Specific notification methods for common use cases
  static notifyPayment(memberName, amount, type = 'success') {
    const title = type === 'success' ? 'Payment Received' : 'Payment Issue';
    const message = type === 'success' 
      ? `Payment of ₹${amount} received from ${memberName}`
      : `Payment issue for ${memberName}: ₹${amount}`;
    return this.notify(title, message, type);
  }

  static notifyMemberAction(action, memberName, details = '') {
    const actionMap = {
      'added': { title: 'New Member Added', type: 'success' },
      'renewed': { title: 'Membership Renewed', type: 'info' },
      'expired': { title: 'Membership Expired', type: 'warning' },
      'updated': { title: 'Member Updated', type: 'info' }
    };
    
    const config = actionMap[action] || { title: 'Member Action', type: 'info' };
    const message = `${memberName} ${details ? '- ' + details : ''}`;
    return this.notify(config.title, message, config.type);
  }

  static notifyEquipment(action, equipmentName, details = '') {
    const title = action === 'added' ? 'Equipment Added' : 'Equipment Updated';
    const message = `${equipmentName} ${details ? '- ' + details : ''}`;
    return this.notify(title, message, 'info');
  }

  static notifySystem(title, message, type = 'info') {
    return this.notify(title, message, type, { priority: 'high' });
  }

  // Compatibility method for existing code
  static showNotification(title, message, urgency = 'medium', type = 'info') {
    const typeMap = {
      'low': 'info',
      'medium': 'warning',
      'high': 'error'
    };
    return this.notify(title, message, typeMap[urgency] || type);
  }
}

// Global notification system instance
window.notificationSystem = null;

// Enhanced Global Notification Wrapper for Universal Access
window.NotificationManager = {
  // Universal notification method
  notify: (title, message, type = 'info', options = {}) => 
    NotificationSystem.notify(title, message, type, options),
  
  // Specific notification methods
  notifyPayment: (memberName, amount, type = 'success') => 
    NotificationSystem.notifyPayment(memberName, amount, type),
  
  notifyMember: (action, memberName, details = '') => 
    NotificationSystem.notifyMemberAction(action, memberName, details),
  
  notifyEquipment: (action, equipmentName, details = '') => 
    NotificationSystem.notifyEquipment(action, equipmentName, details),
  
  notifySystem: (title, message, type = 'info') => 
    NotificationSystem.notifySystem(title, message, type),
  
  // Backward compatibility
  showNotification: (title, message, urgency = 'medium', type = 'info') => 
    NotificationSystem.showNotification(title, message, urgency, type),
  
  // Direct access to instance methods for advanced usage
  getInstance: () => window.notificationSystem,
  
  // Check if system is ready
  isReady: () => !!(window.notificationSystem && window.notificationSystem.addNotificationUnified)
};

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
