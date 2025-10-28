/**
 * Settings Page Enhancements
 * Handles coupons tab functionality and other settings features
 */

// Tab switching functionality
function switchTab(tabId) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Remove active class from all tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab content
    const selectedTab = document.getElementById(tabId);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }
    
    // Add active class to clicked tab button
    const selectedBtn = document.querySelector(`[onclick="switchTab('${tabId}')"]`);
    if (selectedBtn) {
        selectedBtn.classList.add('active');
    }
    
    // Initialize coupons when coupons tab is opened
    if (tabId === 'coupons-tab' && window.userCouponsManager) {
        setTimeout(() => {
            window.userCouponsManager.renderCouponsInSettings();
        }, 100);
    }
}

// Filter coupons functionality
function filterCoupons(filter) {
    // Remove active class from all filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Add active class to clicked filter button
    const activeBtn = document.querySelector(`[data-filter="${filter}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
    
    // Apply filter using coupons manager
    if (window.userCouponsManager) {
        window.userCouponsManager.filterCoupons(filter);
    }
}

// Enhanced notification handling
function handleNotificationPreference(type, enabled) {
    const settings = JSON.parse(localStorage.getItem('notificationSettings') || '{}');
    settings[type] = enabled;
    localStorage.setItem('notificationSettings', JSON.stringify(settings));
    
    console.log(`Notification preference updated: ${type} = ${enabled}`);
    
    // Show confirmation toast
    showToast(`${type.replace(/([A-Z])/g, ' $1').toLowerCase()} notifications ${enabled ? 'enabled' : 'disabled'}`, 'success');
}

// Privacy settings handler
function updatePrivacySetting(setting, value) {
    const privacy = JSON.parse(localStorage.getItem('privacySettings') || '{}');
    privacy[setting] = value;
    localStorage.setItem('privacySettings', JSON.stringify(privacy));
    
    console.log(`Privacy setting updated: ${setting} = ${value}`);
    showToast('Privacy settings updated', 'success');
}

// Language change handler
function changeLanguage(language) {
    localStorage.setItem('selectedLanguage', language);
    console.log(`Language changed to: ${language}`);
    showToast('Language preference saved', 'success');
    
    // In a real implementation, you would reload the page with new language
    // location.reload();
}

// Theme change handler
function changeTheme(theme) {
    localStorage.setItem('selectedTheme', theme);
    document.body.className = `theme-${theme}`;
    console.log(`Theme changed to: ${theme}`);
    showToast('Theme updated', 'success');
}

// Initialize settings page
document.addEventListener('DOMContentLoaded', function() {
    // Load saved settings
    loadSavedSettings();
    
    // Set up event listeners for settings
    setupSettingsEventListeners();
    
    // Initialize first tab
    const firstTab = document.querySelector('.tab-btn.active');
    if (firstTab) {
        const tabId = firstTab.getAttribute('onclick').match(/'([^']+)'/)[1];
        switchTab(tabId);
    }
});

function loadSavedSettings() {
    // Load notification settings
    const notificationSettings = JSON.parse(localStorage.getItem('notificationSettings') || '{}');
    Object.keys(notificationSettings).forEach(key => {
        const checkbox = document.getElementById(`${key}Notifications`);
        if (checkbox) {
            checkbox.checked = notificationSettings[key];
        }
    });
    
    // Load privacy settings
    const privacySettings = JSON.parse(localStorage.getItem('privacySettings') || '{}');
    Object.keys(privacySettings).forEach(key => {
        const element = document.getElementById(`${key}Privacy`);
        if (element) {
            if (element.type === 'checkbox') {
                element.checked = privacySettings[key];
            } else {
                element.value = privacySettings[key];
            }
        }
    });
    
    // Load language setting
    const selectedLanguage = localStorage.getItem('selectedLanguage');
    if (selectedLanguage) {
        const languageSelect = document.getElementById('languageSelect');
        if (languageSelect) {
            languageSelect.value = selectedLanguage;
        }
    }
    
    // Load theme setting
    const selectedTheme = localStorage.getItem('selectedTheme');
    if (selectedTheme) {
        const themeSelect = document.getElementById('themeSelect');
        if (themeSelect) {
            themeSelect.value = selectedTheme;
        }
        document.body.className = `theme-${selectedTheme}`;
    }
}

function setupSettingsEventListeners() {
    // Notification checkboxes
    document.querySelectorAll('input[type="checkbox"][id$="Notifications"]').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const type = this.id.replace('Notifications', '');
            handleNotificationPreference(type, this.checked);
        });
    });
    
    // Privacy settings
    document.querySelectorAll('input[id$="Privacy"], select[id$="Privacy"]').forEach(element => {
        element.addEventListener('change', function() {
            const setting = this.id.replace('Privacy', '');
            updatePrivacySetting(setting, this.type === 'checkbox' ? this.checked : this.value);
        });
    });
    
    // Language selector
    const languageSelect = document.getElementById('languageSelect');
    if (languageSelect) {
        languageSelect.addEventListener('change', function() {
            changeLanguage(this.value);
        });
    }
    
    // Theme selector
    const themeSelect = document.getElementById('themeSelect');
    if (themeSelect) {
        themeSelect.addEventListener('change', function() {
            changeTheme(this.value);
        });
    }
}

// Toast notification function
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#22c55e' : type === 'error' ? '#ef4444' : '#3b82f6'};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 10px;
        font-weight: 500;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        max-width: 400px;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.transform = 'translateX(0)';
    }, 100);
    
    setTimeout(() => {
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 300);
    }, 4000);
}

// Export functions for global use
window.switchTab = switchTab;
window.filterCoupons = filterCoupons;
window.handleNotificationPreference = handleNotificationPreference;
window.updatePrivacySetting = updatePrivacySetting;
window.changeLanguage = changeLanguage;
window.changeTheme = changeTheme;
window.showToast = showToast;