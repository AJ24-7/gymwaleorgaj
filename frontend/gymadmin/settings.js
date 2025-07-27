// ===== EARLY SETTINGS APPLICATION (RUNS BEFORE DOM READY) =====
(function() {
  // Get gym ID early - moved outside to be accessible globally
  function getEarlyGymId() {
    // 1. From JWT token (most reliable)
    const token = localStorage.getItem('gymAdminToken');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        console.log('🔍 JWT payload structure:', payload);
        
        // Check the actual structure from gymController.js: payload.admin.id
        if (payload.admin && payload.admin.id) {
          console.log('✅ Found gym ID from JWT admin.id:', payload.admin.id);
          return payload.admin.id;
        }
        
        // Check other possible properties in JWT (fallback)
        const possibleIds = [payload.gymId, payload.id, payload._id, payload.userId, payload.gym];
        for (let id of possibleIds) {
          if (id) {
            console.log('✅ Found gym ID from JWT fallback:', id);
            return id;
          }
        }
      } catch (e) {
        console.warn('Early: Could not parse gym ID from token:', e);
      }
    }
    
    // 2. From global gym profile
    if (window.currentGymProfile && window.currentGymProfile._id) {
      console.log('✅ Found gym ID from currentGymProfile._id:', window.currentGymProfile._id);
      return window.currentGymProfile._id;
    }
    
    if (window.currentGymProfile && window.currentGymProfile.id) {
      console.log('✅ Found gym ID from currentGymProfile.id:', window.currentGymProfile.id);
      return window.currentGymProfile.id;
    }
    
    // 3. From session storage
    const sessionGymId = sessionStorage.getItem('currentGymId');
    if (sessionGymId) {
      console.log('✅ Found gym ID from sessionStorage:', sessionGymId);
      return sessionGymId;
    }
    
    // 4. Extract from token email/username (create pseudo-unique ID)
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const email = payload.admin?.email || payload.email;
        if (email) {
          // Create a deterministic ID based on email
          const emailHash = btoa(email).replace(/[^a-zA-Z0-9]/g, '').substring(0, 12);
          const pseudoId = 'gym_' + emailHash;
          console.log('✅ Created pseudo gym ID from email:', pseudoId);
          sessionStorage.setItem('currentGymId', pseudoId);
          return pseudoId;
        }
      } catch (e) {
        console.warn('Early: Could not extract email from token');
      }
    }
    
    // 5. Last resort - session-specific unique ID
    const sessionId = 'gym_session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    console.log('⚠️ Using session-specific fallback ID:', sessionId);
    sessionStorage.setItem('currentGymId', sessionId);
    return sessionId;
  }

  // Apply gym-specific settings immediately to prevent flash of hidden content
  function applyEarlyCustomization() {
    const gymId = getEarlyGymId();
    if (!gymId) return;
    
    const equipmentVisible = localStorage.getItem(`dashboardEquipmentVisible_${gymId}`) !== 'false';
    const paymentVisible = localStorage.getItem(`dashboardPaymentVisible_${gymId}`) !== 'false';
    
    console.log(`Early customization for gym ${gymId}:`, {
      equipment: equipmentVisible,
      payment: paymentVisible
    });
    
    // Add CSS to hide elements immediately if needed
    if (!equipmentVisible || !paymentVisible) {
      const style = document.createElement('style');
      style.id = 'earlyCustomizationStyles';
      let css = '';
      
      if (!equipmentVisible) {
        css += `
          /* Hide equipment menu items */
          .menu-item:has(.fa-dumbbell), 
          .menu-item:has([onclick*="equipment"]),
          .menu-item:has([onclick*="Equipment"]),
          /* Hide equipment quick actions */
          .quick-action-btn:has(.fa-dumbbell),
          .quick-action:has(.fa-dumbbell),
          /* Hide equipment activities */
          .activity-item:has(.fa-dumbbell),
          /* Hide equipment tab */
          #equipmentTab,
          /* Hide equipment gallery cards */
          .card:has(.card-title:contains("Equipment")) {
            display: none !important;
          }
        `;
      }
      
      if (!paymentVisible) {
        css += `
          /* Hide payment menu items */
          .menu-item:has(.fa-credit-card),
          .menu-item:has([onclick*="payment"]),
          .menu-item:has([onclick*="Payment"]),
          /* Hide payment quick actions */
          .quick-action-btn:has(.fa-credit-card),
          .quick-action:has(.fa-credit-card),
          /* Hide payment activities */
          .activity-item:has(.fa-credit-card),
          /* Hide payment tab */
          #paymentTab {
            display: none !important;
          }
        `;
      }
      
      style.textContent = css;
      document.head.appendChild(style);
    }
  }
  
  // Apply early customization as soon as possible
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyEarlyCustomization);
  } else {
    applyEarlyCustomization();
  }
  
  // Also apply on window load for additional safety
  window.addEventListener('load', applyEarlyCustomization);
  
  // Monitor for gym switches by watching for token/profile changes
  let lastKnownGymId = null;
  
  function monitorGymSwitch() {
    const currentGymId = getEarlyGymId();
    
    if (lastKnownGymId && lastKnownGymId !== currentGymId) {
      console.log(`🔄 Detected gym switch: ${lastKnownGymId} → ${currentGymId}`);
      // Reapply customization for new gym
      setTimeout(applyEarlyCustomization, 50);
    }
    
    lastKnownGymId = currentGymId;
  }
  
  // Monitor every 2 seconds for gym switches
  setInterval(monitorGymSwitch, 2000);
  
  // Also monitor on storage events
  window.addEventListener('storage', function(e) {
    if (e.key === 'gymAdminToken') {
      console.log('🔄 Token changed, checking for gym switch...');
      // Clear session gym ID to force re-detection
      sessionStorage.removeItem('currentGymId');
      setTimeout(monitorGymSwitch, 100);
    }
  });
  
  // Monitor for token changes in current tab too
  let lastKnownToken = localStorage.getItem('gymAdminToken');
  setInterval(() => {
    const currentToken = localStorage.getItem('gymAdminToken');
    if (currentToken !== lastKnownToken) {
      console.log('🔄 Token changed in current tab, checking for gym switch...');
      // Clear session gym ID to force re-detection
      sessionStorage.removeItem('currentGymId');
      lastKnownToken = currentToken;
      setTimeout(monitorGymSwitch, 100);
    }
  }, 1000);
})();

// ===== SETTINGS TAB FUNCTIONALITY =====

// ===== THEME MANAGEMENT =====
function applyTheme(theme) {
  const root = document.documentElement;
  
  if (theme === 'dark') {
    root.style.setProperty('--bg-primary', '#18191a');
    root.style.setProperty('--bg-secondary', '#23272f');
    root.style.setProperty('--card-bg', '#23272f');
    root.style.setProperty('--text-primary', '#ffffff');
    root.style.setProperty('--text-secondary', '#cccccc');
    root.style.setProperty('--border-color', '#33363d');
    root.style.setProperty('--border-light', '#23272f');
    root.style.setProperty('--bg-light', '#23272f');
    // Make all text white for visibility
    document.body.style.background = '#18191a';
    document.body.style.color = '#fff';
    // Set all headings, paragraphs, links, labels, etc. to white
    const allTextEls = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, label, li, th, td, .menu-text, .stat-title, .stat-value, .stat-change, .member-detail-label, .plan-badge, .edit-input, .sidebar, .sidebar .menu-link, .sidebar .menu-link .fa, .content, .modal-content, .modal, .tab-title, .tab-header, .tab-content, .quick-action, .info-list, .member-name, .member-id, .member-detail-title, .member-detail-modal, .profile-pic, .stat-card, .toggle-switch, .toggle-switch input, .toggle-switch label, .theme-option, .color-option, .settings-section, .settings-label, .settings-value, .settings-row, .settings-tab, .settings-content, .settings-header, .settings-title, .settings-description, .settings-group, .settings-btn, .settings-btn-primary, .settings-btn-secondary, .settings-btn-danger, .settings-btn-warning, .settings-btn-info, .settings-btn-success, .settings-btn-light, .settings-btn-dark, .settings-btn-outline, .settings-btn-link, .settings-btn-block, .settings-btn-lg, .settings-btn-sm, .settings-btn-xs, .settings-btn-icon, .settings-btn-circle, .settings-btn-square, .settings-btn-pill, .settings-btn-round, .settings-btn-flat, .settings-btn-ghost, .settings-btn-shadow, .settings-btn-gradient, .settings-btn-glow, .settings-btn-inverse, .settings-btn-transparent, .settings-btn-borderless, .settings-btn-text, .settings-btn-label, .settings-btn-value, .settings-btn-group, .settings-btn-toolbar, .settings-btn-dropdown, .settings-btn-toggle, .settings-btn-switch, .settings-btn-radio, .settings-btn-checkbox, .settings-btn-segment, .settings-btn-step, .settings-btn-progress, .settings-btn-spinner, .settings-btn-badge, .settings-btn-dot, .settings-btn-icon-left, .settings-btn-icon-right, .settings-btn-icon-top, .settings-btn-icon-bottom, .settings-btn-icon-only, .settings-btn-icon-text, .settings-btn-text-icon, .settings-btn-label-icon, .settings-btn-value-icon, .settings-btn-group-icon, .settings-btn-toolbar-icon, .settings-btn-dropdown-icon, .settings-btn-toggle-icon, .settings-btn-switch-icon, .settings-btn-radio-icon, .settings-btn-checkbox-icon, .settings-btn-segment-icon, .settings-btn-step-icon, .settings-btn-progress-icon, .settings-btn-spinner-icon, .settings-btn-badge-icon, .settings-btn-dot-icon');
    allTextEls.forEach(el => {
      el.style.color = '#fff';
    });
    // Set all links to white
    const allLinks = document.querySelectorAll('a');
    allLinks.forEach(a => {
      a.style.color = '#fff';
    });
    // Set all dashboard containers, cards, and sections to dark backgrounds
    const darkBgEls = document.querySelectorAll(`
      .stat-card,
      .content,
      .modal-content,
      .tab-content,
      .settings-section,
      .settings-tab,
      .settings-content,
      .settings-header,
      .settings-row,
      .settings-group,
      .dashboard-section,
      .dashboard-container,
      .dashboard-card,
      .card-bg,
      .section-bg,
      .admin-section,
      .admin-container,
      .admin-card,
      .quick-actions,
      .quick-action,
      .activities-offered,
      .activities-section,
      .activities-list,
      .gym-info,
      .gym-info-section,
      .membership-plan,
      .membership-plan-section,
      .membership-plans,
      .new-members,
      .new-members-section,
      .recent-activity,
      .recent-activity-section,
      .attendance-chart,
      .attendance-chart-section,
      .equipment-gallery,
      .equipment-gallery-section
    `);
    darkBgEls.forEach(el => {
      // Use a lighter dark/greyish shade for all cards/sections for contrast
      if (
        el.classList.contains('stat-card') ||
        el.classList.contains('dashboard-card') ||
        el.classList.contains('card-bg') ||
        el.classList.contains('modal-content') ||
        el.classList.contains('tab-content') ||
        el.classList.contains('settings-section') ||
        el.classList.contains('admin-card') ||
        el.classList.contains('quick-actions') ||
        el.classList.contains('activities-offered') ||
        el.classList.contains('activities-section') ||
        el.classList.contains('activities-list') ||
        el.classList.contains('quick-action-card') ||
        el.classList.contains('activities-offered-card') ||
        el.classList.contains('membership-plans-section') ||
        el.classList.contains('membership-plans') ||
        el.classList.contains('membership-plan-section') ||
        el.classList.contains('membership-plan') ||
        el.classList.contains('card') ||
        el.classList.contains('card-header') ||
        el.classList.contains('card-body') ||
        el.classList.contains('gym-info-card') ||
        el.classList.contains('gym-info-section') ||
        el.classList.contains('plans-list') ||
        el.classList.contains('main-content') ||
        el.classList.contains('dashboard-row') ||
        el.classList.contains('main-grid') ||
        el.classList.contains('left-column') ||
        el.classList.contains('right-column') ||
        el.id === 'membershipPlansSection' ||
        el.id === 'photoGridSection' ||
        el.id === 'newMembersCard'
      ) {
        el.style.background = '#23262b'; // slightly lighter black for all cards/sections
        el.style.backgroundColor = '#23262b';
        el.style.boxShadow = '0 2px 16px 0 rgba(0,0,0,0.18)';
      } else {
        el.style.background = '#18191a'; // main dark background
        el.style.backgroundColor = '#18191a';
      }
    });
    document.body.setAttribute('data-theme', 'dark');
  } else if (theme === 'light') {
    // Reset to light theme
    root.style.removeProperty('--bg-primary');
    root.style.removeProperty('--bg-secondary');
    root.style.removeProperty('--card-bg');
    root.style.removeProperty('--text-primary');
    root.style.removeProperty('--text-secondary');
    root.style.removeProperty('--border-color');
    root.style.removeProperty('--border-light');
    root.style.removeProperty('--bg-light');
    
    // Reset body styles
    document.body.style.background = '';
    document.body.style.color = '';
    
    // Reset all text elements
    const allTextEls = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, label, li, th, td, .menu-text, .stat-title, .stat-value, .stat-change, .member-detail-label, .plan-badge, .edit-input, .sidebar, .sidebar .menu-link, .sidebar .menu-link .fa, .content, .modal-content, .modal, .tab-title, .tab-header, .tab-content, .quick-action, .info-list, .member-name, .member-id, .member-detail-title, .member-detail-modal, .profile-pic, .stat-card, .toggle-switch, .toggle-switch input, .toggle-switch label, .theme-option, .color-option, .settings-section, .settings-label, .settings-value, .settings-row, .settings-tab, .settings-content, .settings-header, .settings-title, .settings-description, .settings-group, .settings-btn, .settings-btn-primary, .settings-btn-secondary, .settings-btn-danger, .settings-btn-warning, .settings-btn-info, .settings-btn-success, .settings-btn-light, .settings-btn-dark, .settings-btn-outline, .settings-btn-link, .settings-btn-block, .settings-btn-lg, .settings-btn-sm, .settings-btn-xs, .settings-btn-icon, .settings-btn-circle, .settings-btn-square, .settings-btn-pill, .settings-btn-round, .settings-btn-flat, .settings-btn-ghost, .settings-btn-shadow, .settings-btn-gradient, .settings-btn-glow, .settings-btn-inverse, .settings-btn-transparent, .settings-btn-borderless, .settings-btn-text, .settings-btn-label, .settings-btn-value, .settings-btn-group, .settings-btn-toolbar, .settings-btn-dropdown, .settings-btn-toggle, .settings-btn-switch, .settings-btn-radio, .settings-btn-checkbox, .settings-btn-segment, .settings-btn-step, .settings-btn-progress, .settings-btn-spinner, .settings-btn-badge, .settings-btn-dot, .settings-btn-icon-left, .settings-btn-icon-right, .settings-btn-icon-top, .settings-btn-icon-bottom, .settings-btn-icon-only, .settings-btn-icon-text, .settings-btn-text-icon, .settings-btn-label-icon, .settings-btn-value-icon, .settings-btn-group-icon, .settings-btn-toolbar-icon, .settings-btn-dropdown-icon, .settings-btn-toggle-icon, .settings-btn-switch-icon, .settings-btn-radio-icon, .settings-btn-checkbox-icon, .settings-btn-segment-icon, .settings-btn-step-icon, .settings-btn-progress-icon, .settings-btn-spinner-icon, .settings-btn-badge-icon, .settings-btn-dot-icon');
    allTextEls.forEach(el => {
      el.style.color = '';
    });
    
    // Reset all links
    const allLinks = document.querySelectorAll('a');
    allLinks.forEach(a => {
      a.style.color = '';
    });
    
    // Reset all background elements
    const darkBgEls = document.querySelectorAll(`
      .stat-card,
      .content,
      .modal-content,
      .tab-content,
      .settings-section,
      .settings-tab,
      .settings-content,
      .settings-header,
      .settings-row,
      .settings-group,
      .dashboard-section,
      .dashboard-container,
      .dashboard-card,
      .card-bg,
      .section-bg,
      .admin-section,
      .admin-container,
      .admin-card,
      .quick-actions,
      .quick-action,
      .activities-offered,
      .activities-section,
      .activities-list,
      .gym-info,
      .gym-info-section,
      .membership-plan,
      .membership-plan-section,
      .membership-plans,
      .new-members,
      .new-members-section,
      .recent-activity,
      .recent-activity-section,
      .attendance-chart,
      .attendance-chart-section,
      .equipment-gallery,
      .equipment-gallery-section
    `);
    darkBgEls.forEach(el => {
      el.style.background = '';
      el.style.backgroundColor = '';
      el.style.boxShadow = '';
    });
    
    document.body.setAttribute('data-theme', 'light');
  } else if (theme === 'auto') {
    // Auto theme - detect system preference
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(prefersDark ? 'dark' : 'light');
  }
}

function applyColorScheme(color) {
  const root = document.documentElement;
  const colorSchemes = {
    blue: { primary: '#007bff', primaryDark: '#0056b3', success: '#28a745', warning: '#ffc107', danger: '#dc3545' },
    green: { primary: '#28a745', primaryDark: '#1e7e34', success: '#20c997', warning: '#ffc107', danger: '#dc3545' },
    purple: { primary: '#6f42c1', primaryDark: '#5a32a3', success: '#28a745', warning: '#ffc107', danger: '#dc3545' },
    orange: { primary: '#fd7e14', primaryDark: '#e55a00', success: '#28a745', warning: '#ffc107', danger: '#dc3545' },
    red: { primary: '#dc3545', primaryDark: '#c82333', success: '#28a745', warning: '#ffc107', danger: '#e74c3c' }
  };
  
  const scheme = colorSchemes[color];
  if (scheme) {
    Object.entries(scheme).forEach(([key, value]) => {
      // Use --primary for primary, --primary-dark for primaryDark, etc.
      let cssVar = '--' + key.replace(/([A-Z])/g, '-$1').toLowerCase();
      // Special case: primaryDark should be --primary-dark
      if (key === 'primaryDark') cssVar = '--primary-dark';
      root.style.setProperty(cssVar, value);
    });
  }
}

// ===== SETTINGS MANAGEMENT =====
function saveAllSettings() {
  const settings = {
    theme: document.querySelector('.theme-option.active')?.dataset.theme || 'light',
    color: document.querySelector('.color-option.active')?.dataset.color || 'blue',
    notifications: {
      newMembers: document.getElementById('newMemberNotif')?.checked || false,
      payments: document.getElementById('paymentNotif')?.checked || false,
      trainers: document.getElementById('trainerNotif')?.checked || false,
      email: document.getElementById('emailNotif')?.checked || false
    },
    services: {
      onlineBooking: document.getElementById('onlineBooking')?.checked || false,
      personalTraining: document.getElementById('personalTraining')?.checked || false,
      groupClasses: document.getElementById('groupClasses')?.checked || false,
      equipmentReservation: document.getElementById('equipmentReservation')?.checked || false,
      memberCheckin: document.getElementById('memberCheckin')?.checked || false
    },
    security: {
      twoFactorAuth: document.getElementById('twoFactorAuth')?.checked || false,
      loginAlerts: document.getElementById('loginAlerts')?.checked || false
    },
    operatingHours: getOperatingHours()
  };
  
  // Save to localStorage
  localStorage.setItem('gymAdminSettings', JSON.stringify(settings));
  
  // Show success message
  showNotification('Settings saved successfully!', 'success');
}

function resetSettings() {
  if (confirm('Are you sure you want to reset all settings to default? This will only affect the current gym\'s settings.')) {
    const gymId = getGymId();
    
    console.log(`🔄 Resetting settings for gym: ${gymId}`);
    
    // Clear saved settings (global)
    localStorage.removeItem('gymAdminSettings');
    localStorage.removeItem('gymAdminTheme');
    localStorage.removeItem('gymAdminColor');
    
    // Clear gym-specific dashboard customization settings
    if (gymId) {
      removeGymSpecificSetting(`dashboardEquipmentVisible_${gymId}`);
      removeGymSpecificSetting(`dashboardPaymentVisible_${gymId}`);
      
      console.log(`✅ Cleared gym-specific settings for gym: ${gymId}`);
    }
    
    // Reset UI to defaults
    applyTheme('light');
    applyColorScheme('blue');
    
    // Reset all toggles and inputs
    document.querySelectorAll('.toggle-switch input').forEach(input => {
      input.checked = input.id.includes('newMemberNotif') || 
                      input.id.includes('paymentNotif') || 
                      input.id.includes('trainerNotif') ||
                      input.id.includes('onlineBooking') ||
                      input.id.includes('personalTraining') ||
                      input.id.includes('groupClasses') ||
                      input.id.includes('memberCheckin') ||
                      input.id.includes('loginAlerts');
    });
    
    // Reset dashboard customization toggles to default (enabled)
    const equipmentToggle = document.getElementById('toggleEquipmentTab');
    const paymentToggle = document.getElementById('togglePaymentTab');
    if (equipmentToggle) {
      equipmentToggle.checked = true;
      applyTabVisibility('equipment', true);
    }
    if (paymentToggle) {
      paymentToggle.checked = true;
      applyTabVisibility('payment', true);
    }
    
    // Reset theme and color selections
    document.querySelectorAll('.theme-option').forEach(opt => {
      opt.classList.toggle('active', opt.dataset.theme === 'light');
    });
    
    document.querySelectorAll('.color-option').forEach(opt => {
      opt.classList.toggle('active', opt.dataset.color === 'blue');
    });
    
    showNotification(`Settings reset to defaults for gym ${gymId.substring(0, 8)}...!`, 'info');
  }
}

function loadSavedSettings() {
  const saved = localStorage.getItem('gymAdminSettings');
  if (saved) {
    try {
      const settings = JSON.parse(saved);
      
      // Apply notification settings
      if (settings.notifications) {
        Object.entries(settings.notifications).forEach(([key, value]) => {
          const element = document.getElementById(key === 'newMembers' ? 'newMemberNotif' : 
                                              key === 'payments' ? 'paymentNotif' :
                                              key === 'trainers' ? 'trainerNotif' : 'emailNotif');
          if (element) element.checked = value;
        });
      }
      
      // Apply service settings
      if (settings.services) {
        Object.entries(settings.services).forEach(([key, value]) => {
          const element = document.getElementById(key);
          if (element) element.checked = value;
        });
      }
      
      // Apply security settings
      if (settings.security) {
        Object.entries(settings.security).forEach(([key, value]) => {
          const element = document.getElementById(key);
          if (element) element.checked = value;
        });
      }
      
      // Apply operating hours
      if (settings.operatingHours) {
        setOperatingHours(settings.operatingHours);
      }
      
    } catch (e) {
      console.error('Error loading settings:', e);
    }
  }
}

// ===== OPERATING HOURS MANAGEMENT =====
function getOperatingHours() {
  const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const hours = {};
  
  days.forEach(day => {
    const openTime = document.getElementById(`${day}Open`)?.value;
    const closeTime = document.getElementById(`${day}Close`)?.value;
    const isClosed = document.getElementById(`${day}Closed`)?.checked;
    
    hours[day] = {
      open: openTime,
      close: closeTime,
      closed: isClosed
    };
  });
  
  return hours;
}

function setOperatingHours(hours) {
  Object.entries(hours).forEach(([day, schedule]) => {
    const openInput = document.getElementById(`${day}Open`);
    const closeInput = document.getElementById(`${day}Close`);
    const closedInput = document.getElementById(`${day}Closed`);
    
    if (openInput) openInput.value = schedule.open || '06:00';
    if (closeInput) closeInput.value = schedule.close || '22:00';
    if (closedInput) closedInput.checked = schedule.closed || false;
  });
}

function setupOperatingHoursHandlers() {
  const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  
  days.forEach(day => {
    const closedCheckbox = document.getElementById(`${day}Closed`);
    const openInput = document.getElementById(`${day}Open`);
    const closeInput = document.getElementById(`${day}Close`);
    
    if (closedCheckbox) {
      closedCheckbox.addEventListener('change', function() {
        if (openInput) openInput.disabled = this.checked;
        if (closeInput) closeInput.disabled = this.checked;
      });
    }
  });
}

// ===== DATA EXPORT =====
function exportData(type) {
  // Placeholder for data export functionality
  showNotification(`Exporting ${type} data...`, 'info');
  
  // In a real implementation, this would call an API endpoint
  setTimeout(() => {
    showNotification(`${type.charAt(0).toUpperCase() + type.slice(1)} data exported successfully!`, 'success');
  }, 2000);
}

// ===== MODAL FUNCTIONS =====
function openChangePasswordModal() {
  // Placeholder for change password modal
  alert('Change password functionality would be implemented here');
}

function openUpdateProfileModal() {
  // Placeholder for update profile modal
  alert('Update profile functionality would be implemented here');
}

// ===== NOTIFICATION SYSTEM =====
function showNotification(message, type = 'info') {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    border-radius: 8px;
    color: white;
    font-weight: 600;
    z-index: 10000;
    transform: translateX(400px);
    transition: transform 0.3s ease;
  `;
  
  // Set background color based on type
  const colors = {
    success: '#28a745',
    error: '#dc3545',
    warning: '#ffc107',
    info: '#007bff'
  };
  notification.style.backgroundColor = colors[type] || colors.info;
  
  notification.textContent = message;
  document.body.appendChild(notification);
  
  // Animate in
  setTimeout(() => {
    notification.style.transform = 'translateX(0)';
  }, 100);
  
  // Remove after 3 seconds
  setTimeout(() => {
    notification.style.transform = 'translateX(400px)';
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 300);
  }, 3000);
}

// ===== SETTINGS INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function() {
  // Theme Management
  const themeOptions = document.querySelectorAll('.theme-option');
  const colorOptions = document.querySelectorAll('.color-option');

  // Load saved theme and color
  const savedTheme = localStorage.getItem('gymAdminTheme') || 'light';
  const savedColor = localStorage.getItem('gymAdminColor') || 'blue';

  // Apply saved theme and color
  applyTheme(savedTheme);
  applyColorScheme(savedColor);

  // Update UI to reflect saved theme
  themeOptions.forEach(option => {
    option.classList.toggle('active', option.dataset.theme === savedTheme);
    // Add click handler for theme selection
    option.addEventListener('click', function() {
      themeOptions.forEach(opt => opt.classList.remove('active'));
      this.classList.add('active');
      const theme = this.dataset.theme;
      applyTheme(theme);
      localStorage.setItem('gymAdminTheme', theme);
    });
  });

  // Enhanced Color Scheme Selector: always visible, interactive, horizontal
  const colorMap = {
    blue: '#1976d2',
    green: '#388e3c',
    purple: '#7b1fa2',
    orange: '#f57c00',
    red: '#d32f2f'
  };
  colorOptions.forEach(option => {
    const color = option.dataset.color;
    const circle = option.querySelector('.color-circle');
    if (circle) {
      circle.style.background = colorMap[color] || '#1976d2';
      circle.style.border = '2px solid #fff';
      circle.style.boxShadow = '0 1px 6px rgba(0,0,0,0.10)';
      circle.style.width = '28px';
      circle.style.height = '28px';
      circle.style.borderRadius = '50%';
      circle.style.display = 'inline-block';
      circle.style.transition = 'box-shadow 0.2s, border 0.2s';
      option.style.display = 'inline-block';
      option.style.marginRight = '18px';
      option.style.cursor = 'pointer';
      option.style.verticalAlign = 'middle';
    }
    // Set active state
    if (color === savedColor) {
      option.classList.add('active');
      if (circle) {
        circle.style.boxShadow = '0 0 0 3px var(--primary, #1976d2)';
        circle.style.border = '2px solid var(--primary, #1976d2)';
      }
    } else {
      option.classList.remove('active');
      if (circle) {
        circle.style.boxShadow = '0 1px 6px rgba(0,0,0,0.10)';
        circle.style.border = '2px solid #fff';
      }
    }
    // Hover effect
    option.addEventListener('mouseenter', function() {
      if (circle) {
        circle.style.boxShadow = '0 0 0 3px var(--primary-dark, #0056b3)';
        circle.style.border = '2px solid var(--primary-dark, #0056b3)';
      }
    });
    option.addEventListener('mouseleave', function() {
      if (option.classList.contains('active')) {
        if (circle) {
          circle.style.boxShadow = '0 0 0 3px var(--primary, #1976d2)';
          circle.style.border = '2px solid var(--primary, #1976d2)';
        }
      } else {
        if (circle) {
          circle.style.boxShadow = '0 1px 6px rgba(0,0,0,0.10)';
          circle.style.border = '2px solid #fff';
        }
      }
    });
    // Click handler
    option.addEventListener('click', function() {
      const color = this.dataset.color;
      // Update active state
      colorOptions.forEach(opt => {
        opt.classList.remove('active');
        const c = opt.querySelector('.color-circle');
        if (c) {
          c.style.boxShadow = '0 1px 6px rgba(0,0,0,0.10)';
          c.style.border = '2px solid #fff';
        }
      });
      this.classList.add('active');
      if (circle) {
        circle.style.boxShadow = '0 0 0 3px var(--primary, #1976d2)';
        circle.style.border = '2px solid var(--primary, #1976d2)';
      }
      // Apply color scheme
      applyColorScheme(color);
      // Save preference
      localStorage.setItem('gymAdminColor', color);
    });
  });
  
  // Settings action handlers
  document.getElementById('saveSettingsBtn')?.addEventListener('click', saveAllSettings);
  document.getElementById('resetSettingsBtn')?.addEventListener('click', resetSettings);
  document.getElementById('changePasswordBtn')?.addEventListener('click', openChangePasswordModal);
  document.getElementById('updateProfileBtn')?.addEventListener('click', openUpdateProfileModal);
  
  // Data export handlers
  document.getElementById('exportMembersBtn')?.addEventListener('click', () => exportData('members'));
  document.getElementById('exportPaymentsBtn')?.addEventListener('click', () => exportData('payments'));
  document.getElementById('exportAttendanceBtn')?.addEventListener('click', () => exportData('attendance'));
  
  // Operating hours handlers
  setupOperatingHoursHandlers();
  
  // Load and apply saved settings
  loadSavedSettings();
  
  // ===== DASHBOARD CUSTOMIZATION HANDLERS =====
  // Apply dashboard customization immediately, then set up handlers
  setTimeout(() => {
    setupDashboardCustomization();
  }, 100); // Small delay to ensure all DOM elements are ready
});

// ===== GYM-SPECIFIC SETTINGS MANAGEMENT =====
function getGymId() {
  console.log('🔍 Getting gym ID...');
  
  // 1. From JWT token (most reliable)
  const token = localStorage.getItem('gymAdminToken');
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      console.log('JWT payload:', payload);
      
      // Check the actual structure from gymController.js: payload.admin.id
      if (payload.admin && payload.admin.id) {
        console.log('✅ Found gym ID from JWT admin.id:', payload.admin.id);
        // Store in session for consistency
        sessionStorage.setItem('currentGymId', payload.admin.id);
        return payload.admin.id;
      }
      
      // Check other possible properties in JWT (fallback)
      const possibleIds = [payload.gymId, payload.id, payload._id, payload.userId, payload.gym];
      for (let id of possibleIds) {
        if (id) {
          console.log('✅ Found gym ID from JWT fallback:', id);
          sessionStorage.setItem('currentGymId', id);
          return id;
        }
      }
    } catch (e) {
      console.warn('❌ Could not parse gym ID from token:', e);
    }
  }
  
  // 2. From global gym profile if available
  if (window.currentGymProfile && window.currentGymProfile._id) {
    console.log('✅ Found gym ID from currentGymProfile._id:', window.currentGymProfile._id);
    sessionStorage.setItem('currentGymId', window.currentGymProfile._id);
    return window.currentGymProfile._id;
  }
  
  // 3. Try to extract from admin profile data
  if (window.currentGymProfile && window.currentGymProfile.id) {
    console.log('✅ Found gym ID from currentGymProfile.id:', window.currentGymProfile.id);
    sessionStorage.setItem('currentGymId', window.currentGymProfile.id);
    return window.currentGymProfile.id;
  }
  
  // 4. From session storage (temporary storage)
  const sessionGymId = sessionStorage.getItem('currentGymId');
  if (sessionGymId) {
    console.log('✅ Found gym ID from sessionStorage:', sessionGymId);
    return sessionGymId;
  }
  
  // 5. Try to get from URL parameters (if redirected with gymId)
  const urlParams = new URLSearchParams(window.location.search);
  const gymIdFromUrl = urlParams.get('gymId');
  if (gymIdFromUrl) {
    console.log('✅ Found gym ID from URL:', gymIdFromUrl);
    // Store in session for future use
    sessionStorage.setItem('currentGymId', gymIdFromUrl);
    return gymIdFromUrl;
  }
  
  // 6. Extract from token email/username (create pseudo-unique ID)
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const email = payload.admin?.email || payload.email;
      if (email) {
        // Create a deterministic ID based on email
        const emailHash = btoa(email).replace(/[^a-zA-Z0-9]/g, '').substring(0, 12);
        const pseudoId = 'gym_' + emailHash;
        console.log('✅ Created pseudo gym ID from email:', pseudoId);
        sessionStorage.setItem('currentGymId', pseudoId);
        return pseudoId;
      }
    } catch (e) {
      console.warn('Could not extract email from token');
    }
  }
  
  // 7. Last resort - create a session-specific unique ID (will be different each session)
  const sessionId = 'gym_session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  console.log('⚠️ Using session-specific fallback ID:', sessionId);
  sessionStorage.setItem('currentGymId', sessionId);
  return sessionId;
}

function getGymSpecificSetting(key) {
  return localStorage.getItem(key);
}

function setGymSpecificSetting(key, value) {
  localStorage.setItem(key, value);
}

function removeGymSpecificSetting(key) {
  localStorage.removeItem(key);
}

// Clear all settings for a specific gym
function clearGymSpecificSettings(gymId) {
  const keys = Object.keys(localStorage);
  keys.forEach(key => {
    if (key.includes(`_${gymId}`)) {
      localStorage.removeItem(key);
    }
  });
}

// Function to handle gym login/logout - call this when switching gyms
function handleGymSwitch(newGymId) {
  const currentGymId = sessionStorage.getItem('currentGymId');
  
  if (currentGymId && currentGymId !== newGymId) {
    console.log(`🔄 Switching from gym ${currentGymId} to ${newGymId}`);
  }
  
  // Update session storage with new gym ID
  sessionStorage.setItem('currentGymId', newGymId);
  
  // Force reapply settings for the new gym
  setTimeout(() => {
    if (typeof setupDashboardCustomization === 'function') {
      setupDashboardCustomization();
    }
    
    if (typeof forceReapplySettings === 'function') {
      forceReapplySettings();
    }
  }, 100);
}

// Function to verify gym isolation is working
function verifyGymIsolation() {
  const gymId = getGymId();
  const allStorageKeys = Object.keys(localStorage);
  const gymSpecificKeys = allStorageKeys.filter(key => key.includes('dashboard') && key.includes('_'));
  
  console.log('=== Gym Isolation Verification ===');
  console.log('Current Gym ID:', gymId);
  console.log('All dashboard-related storage keys:', gymSpecificKeys);
  
  const thisGymKeys = gymSpecificKeys.filter(key => key.includes(`_${gymId}`));
  const otherGymKeys = gymSpecificKeys.filter(key => !key.includes(`_${gymId}`));
  
  console.log('Keys for current gym:', thisGymKeys);
  console.log('Keys for other gyms:', otherGymKeys);
  console.log('==================================');
  
  return {
    currentGymId: gymId,
    thisGymKeys,
    otherGymKeys,
    isolated: thisGymKeys.length >= 0 // At least some settings exist for this gym
  };
}

// Debug function to show current gym ID and settings
function debugGymSettings() {
  const gymId = getGymId();
  const equipmentVisible = getGymSpecificSetting(`dashboardEquipmentVisible_${gymId}`);
  const paymentVisible = getGymSpecificSetting(`dashboardPaymentVisible_${gymId}`);
  
  // Check actual DOM visibility
  const equipmentMenuItems = document.querySelectorAll('.menu-item:has(.fa-dumbbell), .menu-item');
  const paymentMenuItems = document.querySelectorAll('.menu-item:has(.fa-credit-card), .menu-item');
  
  let visibleEquipmentItems = 0;
  let visiblePaymentItems = 0;
  
  equipmentMenuItems.forEach(item => {
    const icon = item.querySelector('i.fa-dumbbell');
    const onclick = item.getAttribute('onclick');
    if (icon || (onclick && onclick.includes('equipment'))) {
      if (item.style.display !== 'none') visibleEquipmentItems++;
    }
  });
  
  paymentMenuItems.forEach(item => {
    const icon = item.querySelector('i.fa-credit-card');
    const onclick = item.getAttribute('onclick');
    if (icon || (onclick && onclick.includes('payment'))) {
      if (item.style.display !== 'none') visiblePaymentItems++;
    }
  });
  
  console.log('=== Gym Dashboard Settings Debug ===');
  console.log('Current Gym ID:', gymId);
  console.log('Equipment Setting:', equipmentVisible, '(Expected:', equipmentVisible !== 'false', ')');
  console.log('Payment Setting:', paymentVisible, '(Expected:', paymentVisible !== 'false', ')');
  console.log('Visible Equipment Items:', visibleEquipmentItems);
  console.log('Visible Payment Items:', visiblePaymentItems);
  console.log('Storage Keys for this gym:', Object.keys(localStorage).filter(key => key.includes(gymId)));
  console.log('Early styles present:', !!document.getElementById('earlyCustomizationStyles'));
  console.log('=====================================');
  
  return {
    gymId,
    equipmentVisible: equipmentVisible !== 'false',
    paymentVisible: paymentVisible !== 'false',
    actualEquipmentVisible: visibleEquipmentItems > 0,
    actualPaymentVisible: visiblePaymentItems > 0
  };
}

// Add function to force reapply settings (useful for debugging)
function forceReapplySettings() {
  const gymId = getGymId();
  if (!gymId) {
    console.error('No gym ID found');
    return;
  }
  
  const equipmentVisible = getGymSpecificSetting(`dashboardEquipmentVisible_${gymId}`) !== 'false';
  const paymentVisible = getGymSpecificSetting(`dashboardPaymentVisible_${gymId}`) !== 'false';
  
  console.log('Force reapplying settings for gym', gymId);
  applyTabVisibility('equipment', equipmentVisible);
  applyTabVisibility('payment', paymentVisible);
  
  return debugGymSettings();
}

// Function to debug JWT token contents
function debugJWTToken() {
  const token = localStorage.getItem('gymAdminToken');
  if (!token) {
    console.log('❌ No JWT token found');
    return null;
  }
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    console.log('=== JWT Token Debug ===');
    console.log('Full payload:', payload);
    console.log('Available properties:', Object.keys(payload));
    console.log('Possible gym IDs found:');
    
    // Check the actual structure first
    if (payload.admin) {
      console.log('  admin object found:', payload.admin);
      if (payload.admin.id) {
        console.log('  ✅ admin.id (MAIN):', payload.admin.id);
      }
      if (payload.admin.email) {
        console.log('  admin.email:', payload.admin.email);
      }
    }
    
    // Check other possible locations
    const possibleIds = [
      { key: 'gymId', value: payload.gymId },
      { key: 'id', value: payload.id },
      { key: '_id', value: payload._id },
      { key: 'userId', value: payload.userId },
      { key: 'gym', value: payload.gym },
      { key: 'email', value: payload.email }
    ];
    
    possibleIds.forEach(item => {
      if (item.value) {
        console.log(`  ${item.key}:`, item.value);
      }
    });
    
    console.log('Current session gym ID:', sessionStorage.getItem('currentGymId'));
    console.log('=====================');
    return payload;
  } catch (e) {
    console.error('❌ Error parsing JWT token:', e);
    return null;
  }
}

// Function to manually reset gym detection (useful for testing)
function resetGymDetection() {
  console.log('🔄 Manually resetting gym detection...');
  
  // Clear session storage
  sessionStorage.removeItem('currentGymId');
  
  // Force re-detection
  const newGymId = getGymId();
  
  console.log('✅ New gym ID detected:', newGymId);
  
  // Reapply settings
  if (typeof forceReapplySettings === 'function') {
    return forceReapplySettings();
  }
  
  return { newGymId };
}

// Make debug and utility functions globally available
window.debugGymSettings = debugGymSettings;
window.forceReapplySettings = forceReapplySettings;
window.handleGymSwitch = handleGymSwitch;
window.verifyGymIsolation = verifyGymIsolation;
window.debugJWTToken = debugJWTToken;
window.resetGymDetection = resetGymDetection;
function setupDashboardCustomization() {
  const equipmentToggle = document.getElementById('toggleEquipmentTab');
  const paymentToggle = document.getElementById('togglePaymentTab');
  
  // Get gym-specific identifier
  const gymId = getGymId();
  if (!gymId) {
    console.warn('No gym ID found, dashboard customization will not work properly');
    return;
  }
  
  // Load saved dashboard preferences for this specific gym
  const savedEquipmentVisible = getGymSpecificSetting(`dashboardEquipmentVisible_${gymId}`) !== 'false';
  const savedPaymentVisible = getGymSpecificSetting(`dashboardPaymentVisible_${gymId}`) !== 'false';
  
  console.log(`Loading dashboard settings for gym ${gymId}:`, {
    equipment: savedEquipmentVisible,
    payment: savedPaymentVisible
  });
  
  // Set initial toggle states
  if (equipmentToggle) {
    equipmentToggle.checked = savedEquipmentVisible;
  }
  if (paymentToggle) {
    paymentToggle.checked = savedPaymentVisible;
  }
  
  // Apply visibility immediately and forcefully
  applyTabVisibility('equipment', savedEquipmentVisible);
  applyTabVisibility('payment', savedPaymentVisible);
  
  // Add event listeners
  if (equipmentToggle) {
    equipmentToggle.addEventListener('change', function() {
      const isVisible = this.checked;
      applyTabVisibility('equipment', isVisible);
      setGymSpecificSetting(`dashboardEquipmentVisible_${gymId}`, isVisible.toString());
      showCustomizationFeedback('Equipment tab ' + (isVisible ? 'enabled' : 'disabled'));
    });
  }
  
  if (paymentToggle) {
    paymentToggle.addEventListener('change', function() {
      const isVisible = this.checked;
      applyTabVisibility('payment', isVisible);
      setGymSpecificSetting(`dashboardPaymentVisible_${gymId}`, isVisible.toString());
      showCustomizationFeedback('Payment tab ' + (isVisible ? 'enabled' : 'disabled'));
    });
  }
}

// ===== UNIFIED TAB VISIBILITY MANAGEMENT =====
function applyTabVisibility(tabType, isVisible) {
  console.log(`Applying ${tabType} tab visibility:`, isVisible);
  
  const displayValue = isVisible ? 'block' : 'none';
  const flexDisplayValue = isVisible ? 'flex' : 'none';
  
  if (tabType === 'equipment') {
    // Equipment menu items in sidebar
    const equipmentSelectors = [
      '.menu-item:has(.fa-dumbbell)',
      '.menu-item:has([onclick*="equipment"])',
      '.menu-item:has([onclick*="Equipment"])'
    ];
    
    equipmentSelectors.forEach(selector => {
      try {
        const items = document.querySelectorAll(selector);
        items.forEach(item => {
          item.style.display = displayValue;
          item.style.setProperty('display', displayValue, 'important');
        });
      } catch (e) {
        // Fallback for browsers that don't support :has()
        console.warn('CSS :has() not supported, using fallback');
      }
    });
    
    // Fallback method for equipment menu items
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
      const link = item.querySelector('.menu-link');
      const icon = item.querySelector('i.fa-dumbbell');
      const onclick = item.getAttribute('onclick') || (link && link.getAttribute('onclick'));
      
      if (icon || (onclick && onclick.includes('equipment')) || (onclick && onclick.includes('Equipment'))) {
        item.style.display = displayValue;
        item.style.setProperty('display', displayValue, 'important');
      }
    });
    
    // Equipment quick action buttons
    const quickActions = document.querySelectorAll('.quick-action-btn, .quick-action');
    quickActions.forEach(btn => {
      const icon = btn.querySelector('i.fa-dumbbell');
      const onclick = btn.getAttribute('onclick');
      
      if (icon || (onclick && onclick.includes('equipment'))) {
        const parentElement = btn.parentElement;
        if (parentElement) {
          parentElement.style.display = flexDisplayValue;
          parentElement.style.setProperty('display', flexDisplayValue, 'important');
        }
      }
    });
    
    // Equipment gallery section
    const equipmentCards = document.querySelectorAll('.card');
    equipmentCards.forEach(card => {
      const title = card.querySelector('.card-title');
      if (title && title.textContent.includes('Equipment Gallery')) {
        card.style.display = displayValue;
        card.style.setProperty('display', displayValue, 'important');
      }
    });
    
    // Equipment tab content
    const equipmentTab = document.getElementById('equipmentTab');
    if (equipmentTab) {
      if (!isVisible && equipmentTab.style.display !== 'none') {
        // Switch to dashboard if equipment tab is currently visible
        hideAllMainTabs();
        const dashboardContent = document.querySelector('.content');
        if (dashboardContent) {
          dashboardContent.style.display = 'block';
          updateActiveMenuItem('dashboard');
        }
      }
    }
    
  } else if (tabType === 'payment') {
    // Payment menu items in sidebar
    const paymentSelectors = [
      '.menu-item:has(.fa-credit-card)',
      '.menu-item:has([onclick*="payment"])',
      '.menu-item:has([onclick*="Payment"])'
    ];
    
    paymentSelectors.forEach(selector => {
      try {
        const items = document.querySelectorAll(selector);
        items.forEach(item => {
          item.style.display = displayValue;
          item.style.setProperty('display', displayValue, 'important');
        });
      } catch (e) {
        // Fallback for browsers that don't support :has()
        console.warn('CSS :has() not supported, using fallback');
      }
    });
    
    // Fallback method for payment menu items
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
      const link = item.querySelector('.menu-link');
      const icon = item.querySelector('i.fa-credit-card');
      const onclick = item.getAttribute('onclick') || (link && link.getAttribute('onclick'));
      
      if (icon || (onclick && onclick.includes('payment')) || (onclick && onclick.includes('Payment'))) {
        item.style.display = displayValue;
        item.style.setProperty('display', displayValue, 'important');
      }
    });
    
    // Payment quick action buttons
    const quickActions = document.querySelectorAll('.quick-action-btn, .quick-action');
    quickActions.forEach(btn => {
      const icon = btn.querySelector('i.fa-credit-card');
      const onclick = btn.getAttribute('onclick');
      
      if (icon || (onclick && onclick.includes('payment'))) {
        const parentElement = btn.parentElement;
        if (parentElement) {
          parentElement.style.display = flexDisplayValue;
          parentElement.style.setProperty('display', flexDisplayValue, 'important');
        }
      }
    });
    
    // Payment tab content
    const paymentTab = document.getElementById('paymentTab');
    if (paymentTab) {
      if (!isVisible && paymentTab.style.display !== 'none') {
        // Switch to dashboard if payment tab is currently visible
        hideAllMainTabs();
        const dashboardContent = document.querySelector('.content');
        if (dashboardContent) {
          dashboardContent.style.display = 'block';
          updateActiveMenuItem('dashboard');
        }
      }
    }
  }
  
  // Remove early customization styles if they exist (since we're now applying proper styles)
  const earlyStyles = document.getElementById('earlyCustomizationStyles');
  if (earlyStyles) {
    earlyStyles.remove();
  }
}

function updateActiveMenuItem(activeTab) {
  const sidebarMenuLinks = document.querySelectorAll('.sidebar .menu-link');
  sidebarMenuLinks.forEach(link => link.classList.remove('active'));
  
  let targetIcon = '';
  if (activeTab === 'dashboard') targetIcon = '.fa-tachometer-alt';
  else if (activeTab === 'members') targetIcon = '.fa-users';
  else if (activeTab === 'trainers') targetIcon = '.fa-user-tie';
  
  if (targetIcon) {
    const activeMenuLink = Array.from(sidebarMenuLinks).find(link => link.querySelector(targetIcon));
    if (activeMenuLink) activeMenuLink.classList.add('active');
  }
}

// Helper function to hide all tabs (should match the one in gymadmin.js)
function hideAllMainTabs() {
  const dashboardContent = document.querySelector('.content');
  const memberDisplayTab = document.getElementById('memberDisplayTab');
  const trainerTab = document.getElementById('trainerTab');
  const settingsTab = document.getElementById('settingsTab');
  const attendanceTab = document.getElementById('attendanceTab');
  const paymentTab = document.getElementById('paymentTab');
  const equipmentTab = document.getElementById('equipmentTab');
  const supportReviewsTab = document.getElementById('supportReviewsTab');
  
  if (dashboardContent) dashboardContent.style.display = 'none';
  if (memberDisplayTab) memberDisplayTab.style.display = 'none';
  if (trainerTab) trainerTab.style.display = 'none';
  if (settingsTab) settingsTab.style.display = 'none';
  if (attendanceTab) attendanceTab.style.display = 'none';
  if (paymentTab) paymentTab.style.display = 'none';
  if (equipmentTab) equipmentTab.style.display = 'none';
  if (supportReviewsTab) supportReviewsTab.style.display = 'none';
}

function showCustomizationFeedback(message) {
  const gymId = getGymId();
  const gymSpecificMessage = `${message} (Gym: ${gymId ? gymId.substring(0, 8) + '...' : 'Unknown'})`;
  
  // Create feedback toast
  const toast = document.createElement('div');
  toast.className = 'customization-feedback-toast';
  toast.textContent = gymSpecificMessage;
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: var(--success, #28a745);
    color: white;
    padding: 12px 20px;
    border-radius: 6px;
    font-weight: 500;
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    transform: translateX(100%);
    transition: transform 0.3s ease;
  `;
  
  document.body.appendChild(toast);
  
  // Animate in
  setTimeout(() => {
    toast.style.transform = 'translateX(0)';
  }, 100);
  
  // Animate out and remove
  setTimeout(() => {
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, 2000);
}
