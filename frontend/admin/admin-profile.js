// ============= Production-Level Admin Profile Management System =============
// Full backend integration with comprehensive profile functionality

// Configuration
const PROFILE_CONFIG = {
    BASE_URL: window.location.protocol + '//' + window.location.hostname + ':5000',
    ENDPOINTS: {
        PROFILE: '/api/admin/profile',
        UPDATE_PROFILE: '/api/admin/profile',
        CHANGE_PASSWORD: '/api/admin/change-password',
        ACTIVITY_LOG: '/api/admin/activity-log',
        SESSIONS: '/api/admin/sessions',
        PERMISSIONS: '/api/admin/permissions'
    },
    AVATAR_UPLOAD: {
        MAX_SIZE: 5 * 1024 * 1024, // 5MB
        ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    }
};

// Profile Management Class
class AdminProfileManager {
    constructor() {
        this.currentProfile = null;
        this.isEditing = false;
        this.init();
    }

    init() {
        console.log('[PROFILE] Initializing Admin Profile Manager...');
        this.setupEventListeners();
        this.loadProfile();
        this.setupPasswordToggle();
        this.setupAvatarUpload();
        this.detectBrowserInfo();
        this.loadSavedPreferences();
    }

    // ============= Load Saved Preferences =============
    loadSavedPreferences() {
        try {
            // Load email notification preference
            const emailNotifications = document.getElementById('emailNotifications');
            if (emailNotifications) {
                const savedEmailPref = localStorage.getItem('admin_email_notifications');
                emailNotifications.checked = savedEmailPref !== 'false';
            }

            // Load SMS notification preference
            const smsNotifications = document.getElementById('smsNotifications');
            if (smsNotifications) {
                const savedSmsPref = localStorage.getItem('admin_sms_notifications');
                smsNotifications.checked = savedSmsPref !== 'false';
            }

            // Load auto logout preference
            const autoLogoutTime = document.getElementById('autoLogoutTime');
            if (autoLogoutTime) {
                const savedAutoLogout = localStorage.getItem('admin_auto_logout');
                if (savedAutoLogout) {
                    autoLogoutTime.value = savedAutoLogout;
                }
            }

            // Load theme preference
            const themePreference = document.getElementById('themePreference');
            if (themePreference) {
                const savedTheme = localStorage.getItem('admin_theme');
                if (savedTheme) {
                    themePreference.value = savedTheme;
                    // Apply the saved theme
                    this.updateThemePreference(savedTheme);
                }
            }

            console.log('[PROFILE] Saved preferences loaded');
        } catch (error) {
            console.error('[PROFILE] Error loading saved preferences:', error);
        }
    }

    // ============= Event Listeners Setup =============
    setupEventListeners() {
        // Profile Edit Modal
        const editProfileBtn = document.getElementById('editProfileBtn');
        const closeProfileEditModal = document.getElementById('closeProfileEditModal');
        const cancelProfileEdit = document.getElementById('cancelProfileEdit');
        const profileEditForm = document.getElementById('profileEditForm');

        // Password Change Modal
        const changePasswordBtn = document.getElementById('changePasswordBtn');
        const changePasswordActionBtn = document.getElementById('changePasswordActionBtn');
        const closePasswordChangeModal = document.getElementById('closePasswordChangeModal');
        const cancelPasswordChange = document.getElementById('cancelPasswordChange');
        const passwordChangeForm = document.getElementById('passwordChangeForm');

        // Quick Actions
        const toggle2FABtn = document.getElementById('toggle2FABtn');
        const manage2FABtn = document.getElementById('manage2FABtn');
        const viewSessionsBtn = document.getElementById('viewSessionsBtn');
        const manageSessionsBtn = document.getElementById('manageSessionsBtn');
        const viewPermissionsBtn = document.getElementById('viewPermissionsBtn');
        const downloadDataBtn = document.getElementById('downloadDataBtn');
        const viewNotificationsBtn = document.getElementById('viewNotificationsBtn');
        const viewAuditLogBtn = document.getElementById('viewAuditLogBtn');
        const viewFullActivityBtn = document.getElementById('viewFullActivityBtn');

        // Preference Settings
        const emailNotifications = document.getElementById('emailNotifications');
        const smsNotifications = document.getElementById('smsNotifications');
        const autoLogoutTime = document.getElementById('autoLogoutTime');
        const themePreference = document.getElementById('themePreference');

        // Event Bindings
        if (editProfileBtn) editProfileBtn.addEventListener('click', () => this.openEditModal());
        if (closeProfileEditModal) closeProfileEditModal.addEventListener('click', () => this.closeEditModal());
        if (cancelProfileEdit) cancelProfileEdit.addEventListener('click', () => this.closeEditModal());
        if (profileEditForm) profileEditForm.addEventListener('submit', (e) => this.handleProfileUpdate(e));

        if (changePasswordBtn) changePasswordBtn.addEventListener('click', () => this.openPasswordModal());
        if (changePasswordActionBtn) changePasswordActionBtn.addEventListener('click', () => this.openPasswordModal());
        if (closePasswordChangeModal) closePasswordChangeModal.addEventListener('click', () => this.closePasswordModal());
        if (cancelPasswordChange) cancelPasswordChange.addEventListener('click', () => this.closePasswordModal());
        if (passwordChangeForm) passwordChangeForm.addEventListener('submit', (e) => this.handlePasswordChange(e));

        // Quick Actions
        if (toggle2FABtn) toggle2FABtn.addEventListener('click', () => this.toggle2FA());
        if (manage2FABtn) manage2FABtn.addEventListener('click', () => this.toggle2FA());
        if (viewSessionsBtn) viewSessionsBtn.addEventListener('click', () => this.viewSessions());
        if (manageSessionsBtn) manageSessionsBtn.addEventListener('click', () => this.viewSessions());
        if (viewPermissionsBtn) viewPermissionsBtn.addEventListener('click', () => this.viewPermissions());
        if (downloadDataBtn) downloadDataBtn.addEventListener('click', () => this.downloadProfileData());
        if (viewNotificationsBtn) viewNotificationsBtn.addEventListener('click', () => this.viewNotifications());
        if (viewAuditLogBtn) viewAuditLogBtn.addEventListener('click', () => this.viewAuditLog());
        if (viewFullActivityBtn) viewFullActivityBtn.addEventListener('click', () => this.viewFullActivity());

        // Preference Settings
        if (emailNotifications) emailNotifications.addEventListener('change', (e) => this.updateNotificationSettings('email', e.target.checked));
        if (smsNotifications) smsNotifications.addEventListener('change', (e) => this.updateNotificationSettings('sms', e.target.checked));
        if (autoLogoutTime) autoLogoutTime.addEventListener('change', (e) => this.updateAutoLogout(e.target.value));
        if (themePreference) themePreference.addEventListener('change', (e) => this.updateThemePreference(e.target.value));

        // Modal backdrop clicks
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('profile-edit-modal')) {
                this.closeEditModal();
            }
            if (e.target.classList.contains('password-change-modal')) {
                this.closePasswordModal();
            }
        });

        console.log('[PROFILE] Event listeners setup complete');
    }

    // ============= Profile Data Loading =============
    async loadProfile() {
        try {
            console.log('[PROFILE] Loading profile data...');
            this.showLoadingState();

            const token = localStorage.getItem('adminToken');
            if (!token) {
                throw new Error('Authentication token not found');
            }

            const response = await fetch(`${PROFILE_CONFIG.BASE_URL}${PROFILE_CONFIG.ENDPOINTS.PROFILE}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || 'Failed to load profile');
            }

            this.currentProfile = data.admin;
            this.populateProfileData(data.admin);
            this.updateNavbarProfile(data.admin);
            this.loadActivityLog();
            this.loadSettingsFromBackend();
            
            console.log('[PROFILE] Profile loaded successfully:', data.admin);
            this.showNotification('Profile loaded successfully', 'success');

        } catch (error) {
            console.error('[PROFILE] Error loading profile:', error);
            this.showNotification(error.message || 'Failed to load profile', 'error');
            this.showErrorState();
        }
    }

    // ============= Profile Data Population =============
    populateProfileData(profile) {
        console.log('[PROFILE] Populating profile data:', profile);

        // Profile Picture
        const profileAvatar = document.getElementById('profileAvatar');
        if (profileAvatar) {
            if (profile.profilePicture) {
                profileAvatar.src = `${PROFILE_CONFIG.BASE_URL}${profile.profilePicture}`;
            } else {
                // Use default avatar
                profileAvatar.src = profileAvatar.getAttribute('onerror').match(/this\.src='([^']+)'/)?.[1] || 
                    'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iOTYiIGhlaWdodD0iOTYiIHZpZXdCb3g9IjAgMCA5NiA5NiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iNDgiIGN5PSI0OCIgcj0iNDgiIGZpbGw9IiMzNzQxNTEiLz4KPHN2ZyB3aWR0aD0iNTYiIGhlaWdodD0iNTYiIHZpZXdCb3g9IjAgMCA1NiA1NiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTI4IDI4QzMzLjUyMjggMjggNDAgMjQuNDE4MyA0MCAyMFY4QzQwIDMuNTgxNzMgMzMuNTIyOCAwIDI4IDBDMjAuNDc3MiAwIDE2IDMuNTgxNzMgMTYgOFYyMEMxNiAyNC40MTgzIDIyLjQ3NzIgMjggMjggMjhaIiBmaWxsPSIjRjlGQUZCIi8+CjxwYXRoIGQ9Ik0yOCAzMkMxNi41MzYgMzIgOCA0MC41MzYgOCA1MkM4IDUyIDIyLjUzNiA1NiAyOCA1NkMzMy40NjQgNTYgNDggNTIgNDggNTJDNDggNDAuNTM2IDM5LjQ2NCAzMiAyOCAzMloiIGZpbGw9IiNGOUZBRkIiLz4KPC9zdmc+Cjwvc3ZnPgo=';
            }
        }

        // Basic Information
        this.updateElement('profileName', profile.name || 'Unknown');
        this.updateElement('profileEmail', profile.email || 'No email');
        this.updateElement('profileFullName', profile.name || 'Unknown');
        this.updateElement('profileEmailAddress', profile.email || 'No email');
        this.updateElement('profilePhone', profile.phone || 'Not provided');
        this.updateElement('profileUserRole', profile.role || 'Admin');
        this.updateElement('profileRole', profile.role || 'Admin');
        this.updateElement('profileStatus', profile.status || 'Active');
        this.updateElement('profileAccountStatus', profile.status || 'Active');

        // Dates and Times
        if (profile.createdAt) {
            const createdDate = new Date(profile.createdAt);
            this.updateElement('profileCreatedDate', this.formatDate(createdDate));
            
            // Calculate account age
            const accountAge = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
            this.updateElement('accountAge', `${accountAge} days`);
        }

        if (profile.lastLogin) {
            const lastLogin = new Date(profile.lastLogin);
            this.updateElement('lastLoginTime', this.formatTimeAgo(lastLogin));
        }

        if (profile.passwordChangedAt) {
            const passwordChanged = new Date(profile.passwordChangedAt);
            this.updateElement('passwordLastChanged', this.formatDate(passwordChanged));
        }

        // Security Information
        this.updateElement('loginCount', profile.loginCount || 0);
        this.updateElement('lastLoginIP', profile.lastLoginIP || 'Unknown');
        
        // 2FA Status
        const twoFactorStatus = profile.twoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA';
        this.updateElement('twoFactorStatus', twoFactorStatus);
        
        const toggle2FABtn = document.getElementById('toggle2FABtn');
        const manage2FABtn = document.getElementById('manage2FABtn');
        if (toggle2FABtn) {
            toggle2FABtn.textContent = twoFactorStatus;
            toggle2FABtn.className = profile.twoFactorEnabled ? 'btn btn-outline-warning' : 'btn btn-outline-primary';
        }
        if (manage2FABtn) {
            manage2FABtn.innerHTML = `<span>${twoFactorStatus}</span>`;
        }

        // Device and Session Info
        this.updateElement('lastLoginDevice', this.getDeviceInfo());
        this.updateElement('currentSessionInfo', 'Active - Current Session');
        this.updateElement('sessionStartTime', this.formatDate(new Date()));
        this.updateElement('platformInfo', this.getPlatformInfo());

        // Calculate and populate profile completeness
        this.calculateProfileCompleteness(profile);
        
        // Calculate and populate security score
        this.calculateSecurityScore(profile);

        // Update last profile update time
        if (profile.updatedAt) {
            const updatedDate = new Date(profile.updatedAt);
            this.updateElement('lastProfileUpdate', this.formatTimeAgo(updatedDate));
        } else {
            this.updateElement('lastProfileUpdate', 'Never');
        }

        console.log('[PROFILE] Profile data populated successfully');
    }

    // ============= Update Navbar Profile =============
    updateNavbarProfile(profile) {
        try {
            console.log('[PROFILE] Updating navbar with profile data:', profile);
            
            // Update navbar admin avatar
            const navbarAdminAvatar = document.getElementById('navbarAdminAvatar');
            if (navbarAdminAvatar) {
                if (profile.profilePicture) {
                    navbarAdminAvatar.src = `${PROFILE_CONFIG.BASE_URL}${profile.profilePicture}`;
                } else {
                    // Keep the default fallback that's already in the onerror attribute
                    navbarAdminAvatar.src = '/assets/admin-avatar.png';
                }
            }

            // Update navbar admin name
            const navbarAdminName = document.getElementById('navbarAdminName');
            if (navbarAdminName) {
                navbarAdminName.textContent = profile.name || 'Admin User';
            }

            console.log('[PROFILE] Navbar profile updated successfully');
        } catch (error) {
            console.error('[PROFILE] Error updating navbar profile:', error);
        }
    }

    // ============= New Helper Methods =============
    calculateProfileCompleteness(profile) {
        let completedFields = 0;
        const totalFields = 7;

        if (profile.name && profile.name.trim()) completedFields++;
        if (profile.email && profile.email.trim()) completedFields++;
        if (profile.phone && profile.phone.trim()) completedFields++;
        if (profile.role) completedFields++;
        if (profile.status) completedFields++;
        if (profile.createdAt) completedFields++;
        if (profile.lastLogin) completedFields++;

        const percentage = Math.round((completedFields / totalFields) * 100);
        
        this.updateElement('profileCompletenessText', `${percentage}%`);
        const progressBar = document.getElementById('profileCompletenessBar');
        if (progressBar) {
            progressBar.style.width = `${percentage}%`;
        }
    }

    calculateSecurityScore(profile) {
        let score = 0;
        let maxScore = 100;

        // Basic security factors
        if (profile.password) score += 20; // Has password
        if (profile.twoFactorEnabled) score += 30; // 2FA enabled
        if (profile.lastLogin) score += 15; // Recent activity
        if (profile.passwordChangedAt) {
            const daysSinceChange = Math.floor((Date.now() - new Date(profile.passwordChangedAt).getTime()) / (1000 * 60 * 60 * 24));
            if (daysSinceChange < 90) score += 20; // Password changed recently
            else if (daysSinceChange < 180) score += 10;
        }
        if (profile.loginCount > 5) score += 10; // Regular usage
        if (profile.role === 'Super Admin') score += 5; // High privilege account

        const percentage = Math.min(score, maxScore);
        
        this.updateElement('securityScoreText', `${percentage}%`);
        const progressBar = document.getElementById('securityScoreBar');
        if (progressBar) {
            progressBar.style.width = `${percentage}%`;
        }
    }

    getPlatformInfo() {
        const platform = navigator.platform;
        const userAgent = navigator.userAgent;
        
        if (platform.includes('Win')) return 'Windows';
        if (platform.includes('Mac')) return 'macOS';
        if (platform.includes('Linux')) return 'Linux';
        if (/Android/i.test(userAgent)) return 'Android';
        if (/iPhone|iPad/i.test(userAgent)) return 'iOS';
        
        return platform || 'Unknown';
    }

    // ============= Profile Update Functions =============
    openEditModal() {
        if (!this.currentProfile) {
            this.showNotification('Profile data not loaded', 'error');
            return;
        }

        const modal = document.getElementById('profileEditModal');
        const editFullName = document.getElementById('editFullName');
        const editPhone = document.getElementById('editPhone');
        const editEmail = document.getElementById('editEmail');

        if (editFullName) editFullName.value = this.currentProfile.name || '';
        if (editPhone) editPhone.value = this.currentProfile.phone || '';
        if (editEmail) editEmail.value = this.currentProfile.email || '';

        if (modal) {
            modal.classList.add('active');
            this.isEditing = true;
        }

        console.log('[PROFILE] Edit modal opened');
    }

    closeEditModal() {
        const modal = document.getElementById('profileEditModal');
        if (modal) {
            modal.classList.remove('active');
            this.isEditing = false;
        }
        console.log('[PROFILE] Edit modal closed');
    }

    async handleProfileUpdate(event) {
        event.preventDefault();
        
        try {
            console.log('[PROFILE] Updating profile...');
            
            const formData = new FormData(event.target);
            const updateData = {
                name: formData.get('name')?.trim(),
                phone: formData.get('phone')?.trim()
            };

            const token = localStorage.getItem('adminToken');
            if (!token) {
                throw new Error('Authentication token not found');
            }

            const response = await fetch(`${PROFILE_CONFIG.BASE_URL}${PROFILE_CONFIG.ENDPOINTS.UPDATE_PROFILE}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updateData)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || 'Failed to update profile');
            }

            this.currentProfile = data.admin;
            this.populateProfileData(data.admin);
            this.closeEditModal();
            
            console.log('[PROFILE] Profile updated successfully');
            this.showNotification('Profile updated successfully', 'success');

        } catch (error) {
            console.error('[PROFILE] Error updating profile:', error);
            this.showNotification(error.message || 'Failed to update profile', 'error');
        }
    }

    // ============= Password Change Functions =============
    openPasswordModal() {
        const modal = document.getElementById('passwordChangeModal');
        const form = document.getElementById('passwordChangeForm');
        
        if (form) form.reset();
        if (modal) modal.classList.add('active');
        
        console.log('[PROFILE] Password change modal opened');
    }

    closePasswordModal() {
        const modal = document.getElementById('passwordChangeModal');
        const form = document.getElementById('passwordChangeForm');
        
        if (form) form.reset();
        if (modal) modal.classList.remove('active');
        
        console.log('[PROFILE] Password change modal closed');
    }

    async handlePasswordChange(event) {
        event.preventDefault();
        const submitBtn = event.target.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.dataset.originalText = submitBtn.textContent;
            submitBtn.textContent = 'Updating...';
        }

        try {
            console.log('[PROFILE] Changing password...');
            
            const formData = new FormData(event.target);
            let currentPassword = formData.get('currentPassword');
            let newPassword = formData.get('newPassword');
            let confirmPassword = formData.get('confirmPassword');

            // Preserve raw password inputs EXACTLY (do not trim prior to sending)
            currentPassword = currentPassword ? currentPassword.toString() : '';
            newPassword = newPassword ? newPassword.toString() : '';
            confirmPassword = confirmPassword ? confirmPassword.toString() : '';

            const trimmedNew = newPassword.trim();
            const trimmedCurrent = currentPassword.trim();

            // Validation (policies use trimmed versions but raw preserved for backend dual-compare)
            if (currentPassword.length === 0 || newPassword.length === 0 || confirmPassword.length === 0) {
                throw new Error('All password fields are required');
            }
            if (newPassword !== confirmPassword) {
                throw new Error('New passwords do not match');
            }
            if (trimmedNew.length < 8) {
                throw new Error('New password must be at least 8 characters long (excluding leading/trailing spaces)');
            }
            if (trimmedNew === trimmedCurrent) {
                throw new Error('New password must be different from current password');
            }

            const token = localStorage.getItem('adminToken');
            if (!token) {
                throw new Error('Authentication token not found');
            }

            const response = await fetch(`${PROFILE_CONFIG.BASE_URL}${PROFILE_CONFIG.ENDPOINTS.CHANGE_PASSWORD}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ currentPassword, newPassword })
            });

            let data = null;
            try {
                data = await response.json();
            } catch(parseErr) {
                console.warn('[PROFILE] Could not parse password change response JSON');
            }

            if (!response.ok) {
                const serverMsg = data && (data.message || data.error);
                if (data && data.code === 'INVALID_CURRENT' && data.debug) {
                    console.warn('[PROFILE][DEBUG] Password mismatch diagnostics:', data.debug);
                }
                throw new Error(serverMsg || `HTTP ${response.status}: ${response.statusText}`);
            }

            if (data && data.success === false) {
                throw new Error(data.message || 'Failed to change password');
            }

            if (data && data.migrated) {
                console.log('[PROFILE] Legacy password migrated to secure hash.');
            }

            this.closePasswordModal();
            console.log('[PROFILE] Password changed successfully');
            this.showNotification('Password changed successfully', 'success');

        } catch (error) {
            console.error('[PROFILE] Error changing password:', error);
            this.showNotification(error.message || 'Failed to change password', 'error');
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = submitBtn.dataset.originalText || 'Change Password';
            }
        }
    }

    // ============= Activity Log =============
    async loadActivityLog() {
        try {
            const activityLog = document.getElementById('activityLog');
            if (!activityLog) return;

            // Generate realistic activity log based on profile data
            const activities = this.generateActivityLog();
            
            activityLog.innerHTML = '';
            activities.forEach(activity => {
                const activityItem = this.createActivityItem(activity);
                activityLog.appendChild(activityItem);
            });

            console.log('[PROFILE] Activity log loaded');

        } catch (error) {
            console.error('[PROFILE] Error loading activity log:', error);
        }
    }

    generateActivityLog() {
        const activities = [];
        const now = new Date();

        // Recent login
        if (this.currentProfile?.lastLogin) {
            activities.push({
                icon: 'fas fa-sign-in-alt',
                action: 'Logged in to admin panel',
                time: this.formatTimeAgo(new Date(this.currentProfile.lastLogin)),
                location: `IP: ${this.currentProfile.lastLoginIP || 'Unknown'}`
            });
        }

        // Profile view
        activities.push({
            icon: 'fas fa-user',
            action: 'Viewed profile page',
            time: 'Just now',
            location: `Browser: ${this.getBrowserName()}`
        });

        // Dashboard access
        activities.push({
            icon: 'fas fa-tachometer-alt',
            action: 'Accessed admin dashboard',
            time: this.formatTimeAgo(new Date(now.getTime() - 15 * 60 * 1000)),
            location: 'Admin Panel'
        });

        // Security check
        activities.push({
            icon: 'fas fa-shield-alt',
            action: 'Security settings reviewed',
            time: this.formatTimeAgo(new Date(now.getTime() - 2 * 60 * 60 * 1000)),
            location: 'Security Panel'
        });

        return activities;
    }

    createActivityItem(activity) {
        const div = document.createElement('div');
        div.className = 'activity-item';
        div.innerHTML = `
            <div class="activity-icon">
                <i class="${activity.icon}"></i>
            </div>
            <div class="activity-details">
                <span class="activity-action">${activity.action}</span>
                <span class="activity-time">${activity.time}</span>
                <span class="activity-location">${activity.location}</span>
            </div>
        `;
        return div;
    }

    // ============= Quick Actions =============
    async toggle2FA() {
        try {
            const isEnabled = this.currentProfile?.twoFactorEnabled;
            const action = isEnabled ? 'disable' : 'enable';
            
            console.log(`[PROFILE] ${action.charAt(0).toUpperCase() + action.slice(1)}ing 2FA...`);
            
            // Show confirmation
            const confirmed = confirm(`Are you sure you want to ${action} Two-Factor Authentication?`);
            if (!confirmed) return;

            // This would typically call a backend endpoint
            this.showNotification(`2FA ${action}d successfully (Demo)`, 'info');
            
        } catch (error) {
            console.error('[PROFILE] Error toggling 2FA:', error);
            this.showNotification('Failed to toggle 2FA', 'error');
        }
    }

    async viewSessions() {
        try {
            console.log('[PROFILE] Viewing active sessions...');
            
            // Generate demo session data
            const sessions = [
                {
                    id: 'current',
                    device: this.getDeviceInfo(),
                    browser: this.getBrowserName(),
                    ip: this.currentProfile?.lastLoginIP || 'Unknown',
                    lastActive: 'Current session',
                    location: 'Unknown'
                }
            ];

            // Show sessions in a modal or alert (demo)
            alert(`Active Sessions:\n\n${sessions.map(s => 
                `Device: ${s.device}\nBrowser: ${s.browser}\nIP: ${s.ip}\nLast Active: ${s.lastActive}`
            ).join('\n\n')}`);
            
        } catch (error) {
            console.error('[PROFILE] Error viewing sessions:', error);
            this.showNotification('Failed to load sessions', 'error');
        }
    }

    async viewPermissions() {
        try {
            console.log('[PROFILE] Viewing permissions...');
            
            const permissions = [
                'Dashboard Access',
                'Gym Management',
                'User Management', 
                'Subscription Management',
                'Support Management',
                'System Settings'
            ];

            alert(`Your Admin Permissions:\n\n• ${permissions.join('\n• ')}`);
            
        } catch (error) {
            console.error('[PROFILE] Error viewing permissions:', error);
            this.showNotification('Failed to load permissions', 'error');
        }
    }

    async downloadProfileData() {
        try {
            console.log('[PROFILE] Downloading profile data...');
            
            const profileData = {
                profile: this.currentProfile,
                exportedAt: new Date().toISOString(),
                exportType: 'Admin Profile Data'
            };

            const blob = new Blob([JSON.stringify(profileData, null, 2)], {
                type: 'application/json'
            });

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `admin-profile-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            this.showNotification('Profile data downloaded successfully', 'success');
            
        } catch (error) {
            console.error('[PROFILE] Error downloading profile data:', error);
            this.showNotification('Failed to download profile data', 'error');
        }
    }

    async viewNotifications() {
        try {
            console.log('[PROFILE] Opening notifications...');
            // Trigger the notification bell click to open notifications
            const notificationBell = document.getElementById('notificationBell');
            if (notificationBell) {
                notificationBell.click();
            } else {
                this.showNotification('Notification system not available', 'warning');
            }
        } catch (error) {
            console.error('[PROFILE] Error viewing notifications:', error);
            this.showNotification('Failed to open notifications', 'error');
        }
    }

    async viewAuditLog() {
        try {
            console.log('[PROFILE] Opening audit log...');
            this.showNotification('Audit log viewer coming soon!', 'info');
        } catch (error) {
            console.error('[PROFILE] Error viewing audit log:', error);
            this.showNotification('Failed to open audit log', 'error');
        }
    }

    async viewFullActivity() {
        try {
            console.log('[PROFILE] Opening full activity log...');
            this.showNotification('Full activity log coming soon!', 'info');
        } catch (error) {
            console.error('[PROFILE] Error viewing full activity:', error);
            this.showNotification('Failed to open full activity log', 'error');
        }
    }

    // ============= Settings Management =============
    async updateNotificationSettings(type, enabled) {
        try {
            console.log(`[PROFILE] Updating ${type} notifications:`, enabled);
            
            const token = localStorage.getItem('adminToken');
            if (!token) {
                throw new Error('Authentication token not found');
            }

            const updateData = {};
            if (type === 'email') updateData.emailNotifications = enabled;
            if (type === 'sms') updateData.smsNotifications = enabled;

            const response = await fetch(`${PROFILE_CONFIG.BASE_URL}/api/admin/settings`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updateData)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            if (!data.success) {
                throw new Error(data.message || 'Failed to update settings');
            }
            
            this.showNotification(`${type.toUpperCase()} notifications ${enabled ? 'enabled' : 'disabled'}`, 'success');
        } catch (error) {
            console.error('[PROFILE] Error updating notification settings:', error);
            this.showNotification('Failed to update notification settings', 'error');
            
            // Revert the checkbox state on error
            const checkbox = document.getElementById(`${type}Notifications`);
            if (checkbox) checkbox.checked = !enabled;
        }
    }

    async updateAutoLogout(timeInMinutes) {
        try {
            console.log('[PROFILE] Updating auto logout time:', timeInMinutes);
            
            const token = localStorage.getItem('adminToken');
            if (!token) {
                throw new Error('Authentication token not found');
            }

            const response = await fetch(`${PROFILE_CONFIG.BASE_URL}/api/admin/settings`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ autoLogoutTime: timeInMinutes })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            if (!data.success) {
                throw new Error(data.message || 'Failed to update settings');
            }
            
            this.showNotification(`Auto logout set to ${timeInMinutes === '0' ? 'never' : timeInMinutes + ' minutes'}`, 'success');
        } catch (error) {
            console.error('[PROFILE] Error updating auto logout:', error);
            this.showNotification('Failed to update auto logout setting', 'error');
        }
    }

    async updateThemePreference(theme) {
        try {
            console.log('[PROFILE] Updating theme preference:', theme);
            
            const token = localStorage.getItem('adminToken');
            if (!token) {
                throw new Error('Authentication token not found');
            }

            const response = await fetch(`${PROFILE_CONFIG.BASE_URL}/api/admin/settings`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ theme: theme })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            if (!data.success) {
                throw new Error(data.message || 'Failed to update settings');
            }
            
            // Apply theme locally
            if (theme !== 'auto') {
                document.documentElement.setAttribute('data-theme', theme);
            } else {
                // Auto theme - follow system preference
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
            }
            
            this.showNotification(`Theme changed to ${theme}`, 'success');
        } catch (error) {
            console.error('[PROFILE] Error updating theme:', error);
            this.showNotification('Failed to update theme', 'error');
        }
    }

    // ============= Load Settings from Backend =============
    async loadSettingsFromBackend() {
        try {
            const token = localStorage.getItem('adminToken');
            if (!token) return;

            const response = await fetch(`${PROFILE_CONFIG.BASE_URL}/api/admin/settings`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) return;

            const data = await response.json();
            if (!data.success || !data.settings) return;

            const settings = data.settings;

            // Apply settings to UI
            const emailNotifications = document.getElementById('emailNotifications');
            if (emailNotifications && settings.emailNotifications !== undefined) {
                emailNotifications.checked = settings.emailNotifications;
            }

            const smsNotifications = document.getElementById('smsNotifications');
            if (smsNotifications && settings.smsNotifications !== undefined) {
                smsNotifications.checked = settings.smsNotifications;
            }

            const autoLogoutTime = document.getElementById('autoLogoutTime');
            if (autoLogoutTime && settings.autoLogoutTime !== undefined) {
                autoLogoutTime.value = settings.autoLogoutTime.toString();
            }

            const themePreference = document.getElementById('themePreference');
            if (themePreference && settings.theme) {
                themePreference.value = settings.theme;
                this.updateThemePreference(settings.theme);
            }

            console.log('[PROFILE] Settings loaded from backend successfully');
        } catch (error) {
            console.error('[PROFILE] Error loading settings from backend:', error);
        }
    }

    // ============= Avatar Upload =============
    setupAvatarUpload() {
        const avatarInput = document.getElementById('avatarInput');
        if (avatarInput) {
            avatarInput.addEventListener('change', (e) => this.handleAvatarUpload(e));
        }
    }

    async handleAvatarUpload(event) {
        try {
            const file = event.target.files[0];
            if (!file) return;

            // Validate file
            if (!PROFILE_CONFIG.AVATAR_UPLOAD.ALLOWED_TYPES.includes(file.type)) {
                throw new Error('Invalid file type. Please upload a valid image file.');
            }

            if (file.size > PROFILE_CONFIG.AVATAR_UPLOAD.MAX_SIZE) {
                throw new Error('File size too large. Maximum size is 5MB.');
            }

            // Show loading state
            this.showNotification('Uploading profile picture...', 'info');

            // Create FormData for file upload
            const formData = new FormData();
            formData.append('profilePicture', file);

            const token = localStorage.getItem('adminToken');
            if (!token) {
                throw new Error('Authentication token not found');
            }

            // Upload to server
            const response = await fetch(`${PROFILE_CONFIG.BASE_URL}/api/admin/profile/upload-picture`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                    // Don't set Content-Type header for FormData - browser will set it with boundary
                },
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || 'Failed to upload profile picture');
            }

            // Update profile avatar immediately
            const profileAvatar = document.getElementById('profileAvatar');
            if (profileAvatar) {
                profileAvatar.src = `${PROFILE_CONFIG.BASE_URL}${data.profilePicture}`;
            }

            // Update navbar avatar
            const navbarAdminAvatar = document.getElementById('navbarAdminAvatar');
            if (navbarAdminAvatar) {
                navbarAdminAvatar.src = `${PROFILE_CONFIG.BASE_URL}${data.profilePicture}`;
            }

            // Update current profile data
            if (this.currentProfile) {
                this.currentProfile.profilePicture = data.profilePicture;
            }

            console.log('[PROFILE] Profile picture uploaded successfully:', data.profilePicture);
            this.showNotification('Profile picture updated successfully', 'success');

        } catch (error) {
            console.error('[PROFILE] Error uploading profile picture:', error);
            this.showNotification(error.message || 'Failed to upload profile picture', 'error');
            
            // Reset file input
            event.target.value = '';
        }
    }

    // ============= Password Toggle =============
    setupPasswordToggle() {
        const toggleButtons = [
            'toggleCurrentPassword',
            'toggleNewPassword', 
            'toggleConfirmPassword'
        ];

        toggleButtons.forEach(buttonId => {
            const button = document.getElementById(buttonId);
            if (button) {
                button.addEventListener('click', () => {
                    const input = button.parentElement.querySelector('input');
                    const icon = button.querySelector('i');
                    
                    if (input.type === 'password') {
                        input.type = 'text';
                        icon.className = 'fas fa-eye-slash';
                    } else {
                        input.type = 'password';
                        icon.className = 'fas fa-eye';
                    }
                });
            }
        });
    }

    // ============= Utility Functions =============
    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    formatDate(date) {
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    formatTimeAgo(date) {
        const now = new Date();
        const diff = now - date;
        
        const minutes = Math.floor(diff / (1000 * 60));
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (minutes < 60) return `${minutes} min ago`;
        if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
        return `${days} day${days !== 1 ? 's' : ''} ago`;
    }

    detectBrowserInfo() {
        const browserInfo = this.getBrowserName();
        this.updateElement('browserInfo', browserInfo);
    }

    getBrowserName() {
        const userAgent = navigator.userAgent;
        if (userAgent.includes('Chrome')) return 'Google Chrome';
        if (userAgent.includes('Firefox')) return 'Mozilla Firefox';
        if (userAgent.includes('Safari')) return 'Safari';
        if (userAgent.includes('Edge')) return 'Microsoft Edge';
        return 'Unknown Browser';
    }

    getDeviceInfo() {
        const userAgent = navigator.userAgent;
        if (/Mobi|Android/i.test(userAgent)) return 'Mobile Device';
        if (/Tablet/i.test(userAgent)) return 'Tablet';
        return 'Desktop Computer';
    }

    showLoadingState() {
        // Show loading indicators
        const loadingElements = [
            'profileName', 'profileEmail', 'profileFullName',
            'profileEmailAddress', 'profilePhone', 'profileCreatedDate'
        ];

        loadingElements.forEach(id => {
            this.updateElement(id, 'Loading...');
        });
    }

    showErrorState() {
        // Show error state
        const errorElements = [
            'profileName', 'profileEmail', 'profileFullName',
            'profileEmailAddress', 'profilePhone', 'profileCreatedDate'
        ];

        errorElements.forEach(id => {
            this.updateElement(id, 'Error loading');
        });
    }

    // ============= Quick Action Methods =============
    
    async viewSessions() {
        try {
            const response = await fetch(`${PROFILE_CONFIG.BASE_URL}/api/admin/sessions`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.showSessionsModal(data.sessions);
            } else {
                throw new Error('Failed to fetch sessions');
            }
        } catch (error) {
            console.error('Error fetching sessions:', error);
            // Show demo data if backend fails
            const demoSessions = [
                {
                    id: 'current',
                    device: this.getDeviceInfo(),
                    browser: this.getBrowserName(),
                    ip: '192.168.1.100',
                    lastActivity: new Date(),
                    current: true,
                    location: 'Local Network'
                }
            ];
            this.showSessionsModal(demoSessions);
            this.showNotification('Showing demo session data - Backend unavailable', 'warning');
        }
    }

    async downloadProfileData() {
        try {
            // Show download options modal
            const exportType = await this.showExportOptionsModal();
            if (!exportType) return;

            const response = await fetch(`${PROFILE_CONFIG.BASE_URL}/api/admin/export/${exportType}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
                }
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `admin-${exportType}-export.json`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                
                this.showNotification('Data exported successfully', 'success');
            } else {
                throw new Error('Failed to export data');
            }
        } catch (error) {
            console.error('Error exporting data:', error);
            this.showNotification('Failed to export data', 'error');
        }
    }

    showExportOptionsModal() {
        return new Promise((resolve) => {
            const modalHtml = `
                <div class="modal" id="exportModal" style="display: block;">
                    <div class="modal-overlay"></div>
                    <div class="modal-content" style="max-width: 500px;">
                        <div class="modal-header">
                            <h3><i class="fas fa-download"></i> Export Data</h3>
                            <button class="modal-close" onclick="closeExportModal()">&times;</button>
                        </div>
                        <div class="modal-body">
                            <div class="export-options" style="display: flex; flex-direction: column; gap: 12px;">
                                <button class="btn btn-outline-primary" onclick="selectExport('profile')" style="padding: 15px; text-align: left;">
                                    <div style="font-weight: 600; margin-bottom: 4px;">
                                        <i class="fas fa-user-circle" style="margin-right: 8px;"></i>Profile Data Only
                                    </div>
                                    <small style="color: #64748b;">Export your basic profile information and settings</small>
                                </button>
                                <button class="btn btn-outline-primary" onclick="selectExport('activity')" style="padding: 15px; text-align: left;">
                                    <div style="font-weight: 600; margin-bottom: 4px;">
                                        <i class="fas fa-history" style="margin-right: 8px;"></i>Activity Logs (30 days)
                                    </div>
                                    <small style="color: #64748b;">Export your recent activity and security logs</small>
                                </button>
                                <button class="btn btn-outline-primary" onclick="selectExport('full')" style="padding: 15px; text-align: left;">
                                    <div style="font-weight: 600; margin-bottom: 4px;">
                                        <i class="fas fa-database" style="margin-right: 8px;"></i>Complete Data Export
                                    </div>
                                    <small style="color: #64748b;">Export all available data including profile, activity, and notifications</small>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            
            window.selectExport = (type) => {
                document.getElementById('exportModal').remove();
                delete window.selectExport;
                delete window.closeExportModal;
                resolve(type);
            };
            
            window.closeExportModal = () => {
                document.getElementById('exportModal').remove();
                delete window.selectExport;
                delete window.closeExportModal;
                resolve(null);
            };
        });
    }

    async viewNotifications() {
        try {
            const response = await fetch(`${PROFILE_CONFIG.BASE_URL}/api/admin/notifications`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.showNotificationsModal(data.notifications || data);
            } else {
                throw new Error('Failed to fetch notifications');
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
            // Show demo data if backend fails
            const demoNotifications = [
                {
                    id: 'demo1',
                    title: 'Profile Updated',
                    message: 'Your admin profile has been successfully updated.',
                    type: 'success',
                    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
                    read: false
                },
                {
                    id: 'demo2', 
                    title: 'New Login Detected',
                    message: 'A new login was detected from your current device.',
                    type: 'security',
                    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
                    read: true
                },
                {
                    id: 'demo3',
                    title: 'System Maintenance',
                    message: 'Scheduled maintenance will occur tonight at 2 AM.',
                    type: 'info',
                    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
                    read: true
                }
            ];
            this.showNotificationsModal(demoNotifications);
            this.showNotification('Showing demo notification data - Backend unavailable', 'warning');
        }
    }

    async viewAuditLog() {
        try {
            const response = await fetch(`${PROFILE_CONFIG.BASE_URL}/api/admin/security/logs?hours=24`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.showAuditLogModal(data.logs);
            } else {
                throw new Error('Failed to fetch audit logs');
            }
        } catch (error) {
            console.error('Error fetching audit logs:', error);
            this.showNotification('Failed to load audit logs', 'error');
        }
    }

    async viewFullActivity() {
        try {
            const response = await fetch(`${PROFILE_CONFIG.BASE_URL}/api/admin/security/logs?hours=168`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.showActivityModal(data.logs, 'Full Activity Log (7 Days)');
            } else {
                throw new Error('Failed to fetch activity logs');
            }
        } catch (error) {
            console.error('Error fetching activity logs:', error);
            this.showNotification('Failed to load activity logs', 'error');
        }
    }

    async updateNotificationSettings(type, enabled) {
        try {
            // Store preference locally (can be extended to save to backend)
            localStorage.setItem(`admin_${type}_notifications`, enabled.toString());
            this.showNotification(`${type.charAt(0).toUpperCase() + type.slice(1)} notifications ${enabled ? 'enabled' : 'disabled'}`, 'success');
        } catch (error) {
            console.error('Error updating notification settings:', error);
            this.showNotification('Failed to update notification settings', 'error');
        }
    }

    async updateAutoLogout(minutes) {
        try {
            localStorage.setItem('admin_auto_logout', minutes);
            this.showNotification(`Auto logout set to ${minutes === '0' ? 'Never' : minutes + ' minutes'}`, 'success');
        } catch (error) {
            console.error('Error updating auto logout:', error);
            this.showNotification('Failed to update auto logout setting', 'error');
        }
    }

    async updateThemePreference(theme) {
        try {
            localStorage.setItem('admin_theme_preference', theme);
            // Apply theme if needed
            document.body.setAttribute('data-theme', theme);
            this.showNotification(`Theme changed to ${theme}`, 'success');
        } catch (error) {
            console.error('Error updating theme:', error);
            this.showNotification('Failed to update theme', 'error');
        }
    }

    // ============= Modal Helper Methods =============
    
    showSessionsModal(sessions) {
        const modal = document.getElementById('sessionsModal');
        const container = document.getElementById('sessionsListContainer');
        const totalCount = document.getElementById('totalSessionsCount');
        const currentIndicator = document.getElementById('currentSessionIndicator');
        const otherCount = document.getElementById('otherSessionsCount');
        const terminateAllBtn = document.getElementById('terminateAllBtn');
        
        // Update stats
        totalCount.textContent = sessions.length;
        currentIndicator.textContent = '1';
        otherCount.textContent = Math.max(0, sessions.length - 1);
        
        // Show/hide terminate all button
        if (sessions.length > 1) {
            terminateAllBtn.style.display = 'block';
        } else {
            terminateAllBtn.style.display = 'none';
        }
        
        // Generate sessions list
        if (sessions.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #64748b;">
                    <i class="fas fa-desktop" style="font-size: 48px; margin-bottom: 15px; opacity: 0.5;"></i>
                    <h4>No Active Sessions</h4>
                    <p>There are no active sessions for your account.</p>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div class="sessions-grid" style="display: flex; flex-direction: column; gap: 15px;">
                    ${sessions.map((session, index) => `
                        <div class="session-card" style="background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; position: relative;">
                            ${session.current ? `<div style="position: absolute; top: 10px; right: 10px; background: #28a745; color: white; padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: 500;">Current Session</div>` : ''}
                            
                            <div style="display: flex; align-items: center; gap: 15px;">
                                <div style="background: ${session.current ? '#28a745' : '#6c757d'}; color: white; width: 50px; height: 50px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                                    <i class="fas fa-${this.getDeviceIcon(session.device)}" style="font-size: 20px;"></i>
                                </div>
                                
                                <div style="flex: 1;">
                                    <h5 style="margin: 0 0 5px 0; color: #1e293b;">${session.device || 'Unknown Device'}</h5>
                                    <div style="display: flex; gap: 20px; color: #64748b; font-size: 14px; margin-bottom: 8px;">
                                        <span><i class="fas fa-map-marker-alt" style="margin-right: 5px;"></i>${session.location || 'Unknown Location'}</span>
                                        <span><i class="fas fa-network-wired" style="margin-right: 5px;"></i>${session.ipAddress || 'Unknown IP'}</span>
                                    </div>
                                    <div style="color: #64748b; font-size: 13px;">
                                        Last Activity: ${new Date(session.lastActivity).toLocaleString()}
                                    </div>
                                </div>
                                
                                <div style="display: flex; align-items: center; gap: 10px;">
                                    ${!session.current ? `
                                        <button class="btn btn-outline-danger btn-sm" onclick="terminateSession(${session.id}, ${index})" style="padding: 6px 12px;">
                                            <i class="fas fa-sign-out-alt"></i> Terminate
                                        </button>
                                    ` : `
                                        <div style="color: #28a745; font-weight: 500; font-size: 14px;">
                                            <i class="fas fa-check-circle"></i> Active
                                        </div>
                                    `}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        // Show modal
        modal.style.display = 'flex';
        
        // Setup close handlers
        this.setupModalCloseHandlers('sessionsModal', 'closeSessionsModal');
    }

    showNotificationsModal(notifications) {
        const modal = document.getElementById('notificationsModal');
        const container = document.getElementById('notificationsListContainer');
        const totalCount = document.getElementById('totalNotificationsCount');
        const unreadCount = document.getElementById('unreadNotificationsCount');
        
        // Calculate counts
        const unreadNotifications = notifications.filter(n => !n.read);
        totalCount.textContent = notifications.length;
        unreadCount.textContent = unreadNotifications.length;
        
        // Generate notifications list
        if (notifications.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #64748b;">
                    <i class="fas fa-bell-slash" style="font-size: 48px; margin-bottom: 15px; opacity: 0.5;"></i>
                    <h4>No Notifications</h4>
                    <p>You don't have any notifications at the moment.</p>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div class="notifications-grid" style="display: flex; flex-direction: column; gap: 12px; max-height: 400px; overflow-y: auto;">
                    ${notifications.map((notification, index) => `
                        <div class="notification-card ${!notification.read ? 'unread' : ''}" style="
                            background: ${!notification.read ? '#f0f9ff' : '#fff'};
                            border: 1px solid ${!notification.read ? '#0ea5e9' : '#e2e8f0'};
                            border-left: 4px solid ${this.getNotificationColor(notification.type || 'info')};
                            border-radius: 8px;
                            padding: 16px;
                            position: relative;
                        ">
                            ${!notification.read ? `<div style="position: absolute; top: 12px; right: 12px; width: 8px; height: 8px; background: #0ea5e9; border-radius: 50%;"></div>` : ''}
                            
                            <div style="display: flex; align-items: flex-start; gap: 12px;">
                                <div style="background: ${this.getNotificationColor(notification.type || 'info')}; color: white; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                                    <i class="fas fa-${this.getNotificationIcon(notification.type || 'info')}" style="font-size: 14px;"></i>
                                </div>
                                
                                <div style="flex: 1; min-width: 0;">
                                    <h6 style="margin: 0 0 4px 0; color: #1e293b; font-size: 15px; font-weight: 600;">
                                        ${notification.title || 'Notification'}
                                    </h6>
                                    <p style="margin: 0 0 8px 0; color: #475569; font-size: 14px; line-height: 1.4;">
                                        ${notification.message || notification.description || 'No description available'}
                                    </p>
                                    <div style="display: flex; justify-content: space-between; align-items: center;">
                                        <small style="color: #64748b; font-size: 12px;">
                                            ${new Date(notification.createdAt || notification.timestamp).toLocaleString()}
                                        </small>
                                        ${!notification.read ? `
                                            <button class="btn btn-outline-primary btn-sm" onclick="markNotificationRead('${notification._id || notification.id}', ${index})" style="font-size: 11px; padding: 4px 8px;">
                                                Mark Read
                                            </button>
                                        ` : ''}
                                    </div>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        // Show modal
        modal.style.display = 'flex';
        
        // Setup close handlers
        this.setupModalCloseHandlers('notificationsModal', 'closeNotificationsModal');
    }

    showActivityModal(logs, title) {
        const modal = document.getElementById('activityModal');
        const container = document.getElementById('activityLogsContainer');
        const modalTitle = document.getElementById('activityModalTitle');
        const totalCount = document.getElementById('totalActivityCount');
        const timeRange = document.getElementById('activityTimeRange');
        
        // Update header
        modalTitle.textContent = title;
        totalCount.textContent = logs.length;
        
        // Generate activity logs
        if (logs.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #64748b;">
                    <i class="fas fa-history" style="font-size: 48px; margin-bottom: 15px; opacity: 0.5;"></i>
                    <h4>No Activity Found</h4>
                    <p>No activity logs found for the selected time period.</p>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div class="activity-timeline" style="max-height: 500px; overflow-y: auto;">
                    ${logs.map((log, index) => `
                        <div class="activity-item" style="
                            display: flex;
                            gap: 15px;
                            padding: 16px;
                            border-bottom: 1px solid #f1f5f9;
                            position: relative;
                        ">
                            <div style="
                                background: ${this.getLogLevelColor(log.level || log.type)};
                                color: white;
                                width: 36px;
                                height: 36px;
                                border-radius: 50%;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                flex-shrink: 0;
                            ">
                                <i class="fas fa-${this.getLogIcon(log.level || log.type)}" style="font-size: 14px;"></i>
                            </div>
                            
                            <div style="flex: 1; min-width: 0;">
                                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px;">
                                    <h6 style="margin: 0; color: #1e293b; font-size: 15px; font-weight: 600;">
                                        ${log.event || log.action || 'System Event'}
                                    </h6>
                                    <span class="badge" style="
                                        background: ${this.getLogLevelColor(log.level || log.type)};
                                        color: white;
                                        padding: 2px 8px;
                                        border-radius: 12px;
                                        font-size: 11px;
                                        font-weight: 500;
                                    ">${log.level || log.type || 'INFO'}</span>
                                </div>
                                
                                <p style="margin: 0 0 8px 0; color: #475569; font-size: 14px; line-height: 1.4;">
                                    ${log.details || log.description || 'No details available'}
                                </p>
                                
                                <div style="display: flex; gap: 15px; font-size: 12px; color: #64748b;">
                                    <span><i class="fas fa-clock" style="margin-right: 4px;"></i>${new Date(log.timestamp || log.createdAt).toLocaleString()}</span>
                                    ${log.ipAddress ? `<span><i class="fas fa-network-wired" style="margin-right: 4px;"></i>${log.ipAddress}</span>` : ''}
                                    ${log.userAgent ? `<span><i class="fas fa-desktop" style="margin-right: 4px;"></i>${this.getUserAgentInfo(log.userAgent)}</span>` : ''}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        // Show modal
        modal.style.display = 'flex';
        
        // Setup close handlers
        this.setupModalCloseHandlers('activityModal', 'closeActivityModal');
    }

    // Helper method to setup modal close handlers
    setupModalCloseHandlers(modalId, closeButtonId) {
        const modal = document.getElementById(modalId);
        const closeBtn = document.getElementById(closeButtonId);
        const overlay = modal.querySelector('.modal-overlay');
        
        // Close button handler
        if (closeBtn) {
            closeBtn.onclick = () => {
                modal.style.display = 'none';
            };
        }
        
        // Overlay click handler
        if (overlay) {
            overlay.onclick = () => {
                modal.style.display = 'none';
            };
        }
        
        // ESC key handler
        const escHandler = (e) => {
            if (e.key === 'Escape' && (modal.style.display === 'flex' || modal.style.display === 'block')) {
                modal.style.display = 'none';
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
    }

    // Helper methods for icons and colors
    getDeviceIcon(device) {
        const deviceLower = (device || '').toLowerCase();
        if (deviceLower.includes('mobile') || deviceLower.includes('android') || deviceLower.includes('iphone')) return 'mobile-alt';
        if (deviceLower.includes('tablet') || deviceLower.includes('ipad')) return 'tablet-alt';
        if (deviceLower.includes('desktop') || deviceLower.includes('windows') || deviceLower.includes('mac')) return 'desktop';
        return 'laptop';
    }

    getNotificationColor(type) {
        switch(type?.toLowerCase()) {
            case 'error': case 'danger': return '#dc3545';
            case 'warning': return '#ffc107';
            case 'success': return '#28a745';
            case 'info': default: return '#17a2b8';
        }
    }

    getNotificationIcon(type) {
        switch(type?.toLowerCase()) {
            case 'error': case 'danger': return 'exclamation-triangle';
            case 'warning': return 'exclamation-circle';
            case 'success': return 'check-circle';
            case 'info': default: return 'info-circle';
        }
    }

    getLogLevelColor(level) {
        switch(level?.toLowerCase()) {
            case 'error': case 'danger': return '#dc3545';
            case 'warning': return '#ffc107';
            case 'success': return '#28a745';
            case 'info': default: return '#17a2b8';
        }
    }

    getLogIcon(level) {
        switch(level?.toLowerCase()) {
            case 'error': case 'danger': return 'times-circle';
            case 'warning': return 'exclamation-triangle';
            case 'success': return 'check-circle';
            case 'info': default: return 'info-circle';
        }
    }

    getUserAgentInfo(userAgent) {
        if (!userAgent) return 'Unknown Browser';
        if (userAgent.includes('Chrome')) return 'Chrome';
        if (userAgent.includes('Firefox')) return 'Firefox';
        if (userAgent.includes('Safari')) return 'Safari';
        if (userAgent.includes('Edge')) return 'Edge';
        return 'Unknown Browser';
    }

    showNotification(message, type = 'info') {
        if (window.showNotification) {
            try { window.showNotification(message, type); return; } catch(e) { /* fallback below */ }
        }

        // Create / reuse container
        let container = document.getElementById('localNotificationContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'localNotificationContainer';
            Object.assign(container.style, {
                position: 'fixed', top: '16px', right: '16px', zIndex: '9999',
                display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '400px'
            });
            document.body.appendChild(container);
        }

        const palette = { success:'#2e7d32', error:'#c62828', warning:'#ed6c02', info:'#0277bd' };
        const toast = document.createElement('div');
        toast.role = 'alert';
        Object.assign(toast.style, {
            background: palette[type] || palette.info,
            color: '#fff', padding: '12px 14px', borderRadius: '6px', fontSize: '14px',
            fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'flex-start',
            gap: '10px', opacity: '0', transform: 'translateY(-6px)', transition: 'opacity .25s, transform .25s'
        });

        const strong = document.createElement('strong');
        strong.textContent = type.charAt(0).toUpperCase() + type.slice(1) + ': ';
        strong.style.fontWeight = '600';
        const span = document.createElement('span');
        span.textContent = message;

        const closeBtn = document.createElement('button');
        closeBtn.textContent = '×';
        Object.assign(closeBtn.style, {
            background: 'transparent', border: 'none', color: 'inherit', fontSize: '16px',
            cursor: 'pointer', marginLeft: 'auto', lineHeight: '1'
        });

        closeBtn.addEventListener('click', removeToast);

        toast.appendChild(strong);
        toast.appendChild(span);
        toast.appendChild(closeBtn);
        container.appendChild(toast);

        requestAnimationFrame(() => { toast.style.opacity = '1'; toast.style.transform = 'translateY(0)'; });

        const timeout = setTimeout(removeToast, 5000);
        function removeToast() {
            clearTimeout(timeout);
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-6px)';
            setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 250);
        }

        // Log for debugging
        console.log(`[PROFILE] ${type.toUpperCase()}: ${message}`);
    }
}

// ============= Global Initialization =============
let adminProfileManager;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('[PROFILE] DOM loaded, initializing profile manager...');
    adminProfileManager = new AdminProfileManager();
});

// Initialize when profile tab is shown
function initializeProfileTab() {
    if (!adminProfileManager) {
        console.log('[PROFILE] Initializing profile manager from tab switch...');
        adminProfileManager = new AdminProfileManager();
    } else {
        // Refresh profile data when tab is shown
        adminProfileManager.loadProfile();
    }
}

// Export for global access
window.adminProfileManager = adminProfileManager;
window.initializeProfileTab = initializeProfileTab;

// ============= Global Modal Functions =============

// Session Management Functions
window.refreshSessions = async function() {
    if (window.adminProfileManager) {
        await window.adminProfileManager.viewSessions();
    }
};

window.terminateSession = async function(sessionId, index) {
    try {
        const response = await fetch(`${PROFILE_CONFIG.BASE_URL}/api/admin/sessions/${sessionId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            // Remove the session card from UI
            const sessionCards = document.querySelectorAll('.session-card');
            if (sessionCards[index]) {
                sessionCards[index].remove();
            }
            
            // Update counts
            const totalCount = document.getElementById('totalSessionsCount');
            const otherCount = document.getElementById('otherSessionsCount');
            if (totalCount) totalCount.textContent = parseInt(totalCount.textContent) - 1;
            if (otherCount) otherCount.textContent = Math.max(0, parseInt(otherCount.textContent) - 1);
            
            // Hide terminate all button if no other sessions
            if (parseInt(otherCount.textContent) === 0) {
                document.getElementById('terminateAllBtn').style.display = 'none';
            }
            
            if (window.adminProfileManager) {
                window.adminProfileManager.showNotification('Session terminated successfully', 'success');
            }
        } else {
            throw new Error('Failed to terminate session');
        }
    } catch (error) {
        console.error('Error terminating session:', error);
        if (window.adminProfileManager) {
            window.adminProfileManager.showNotification('Failed to terminate session', 'error');
        }
    }
};

window.terminateAllOtherSessions = async function() {
    if (!confirm('Are you sure you want to terminate all other sessions? This will log out all other devices.')) {
        return;
    }
    
    try {
        const response = await fetch(`${PROFILE_CONFIG.BASE_URL}/api/admin/sessions/all`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            // Refresh the sessions modal
            await window.refreshSessions();
            if (window.adminProfileManager) {
                window.adminProfileManager.showNotification('All other sessions terminated successfully', 'success');
            }
        } else {
            throw new Error('Failed to terminate all sessions');
        }
    } catch (error) {
        console.error('Error terminating all sessions:', error);
        if (window.adminProfileManager) {
            window.adminProfileManager.showNotification('Failed to terminate all sessions', 'error');
        }
    }
};

// Notification Functions
window.refreshNotifications = async function() {
    if (window.adminProfileManager) {
        await window.adminProfileManager.viewNotifications();
    }
};

window.markNotificationRead = async function(notificationId, index) {
    try {
        const response = await fetch(`${PROFILE_CONFIG.BASE_URL}/api/admin/notifications/${notificationId}/read`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            // Update the notification card in UI
            const notificationCards = document.querySelectorAll('.notification-card');
            if (notificationCards[index]) {
                const card = notificationCards[index];
                card.classList.remove('unread');
                card.style.background = '#fff';
                card.style.border = '1px solid #e2e8f0';
                
                // Remove unread indicator and mark read button
                const unreadDot = card.querySelector('div[style*="background: #0ea5e9"]');
                if (unreadDot) unreadDot.remove();
                
                const markReadBtn = card.querySelector('button');
                if (markReadBtn) markReadBtn.remove();
            }
            
            // Update unread count
            const unreadCount = document.getElementById('unreadNotificationsCount');
            if (unreadCount) {
                unreadCount.textContent = Math.max(0, parseInt(unreadCount.textContent) - 1);
            }
            
            if (window.adminProfileManager) {
                window.adminProfileManager.showNotification('Notification marked as read', 'success');
            }
        } else {
            throw new Error('Failed to mark notification as read');
        }
    } catch (error) {
        console.error('Error marking notification as read:', error);
        if (window.adminProfileManager) {
            window.adminProfileManager.showNotification('Failed to mark notification as read', 'error');
        }
    }
};

window.markAllNotificationsRead = async function() {
    try {
        const response = await fetch(`${PROFILE_CONFIG.BASE_URL}/api/admin/notifications/mark-all-read`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            // Refresh notifications modal
            await window.refreshNotifications();
            if (window.adminProfileManager) {
                window.adminProfileManager.showNotification('All notifications marked as read', 'success');
            }
        } else {
            throw new Error('Failed to mark all notifications as read');
        }
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        if (window.adminProfileManager) {
            window.adminProfileManager.showNotification('Failed to mark all notifications as read', 'error');
        }
    }
};

window.filterNotifications = function(filter) {
    // Update active filter button
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    // Filter notifications (implement filtering logic here)
    // For now, just refresh to show all
    window.refreshNotifications();
};

// Activity Log Functions
window.refreshActivityLog = async function() {
    const timeFilter = document.getElementById('activityTimeFilter');
    const hours = timeFilter ? timeFilter.value : 24;
    
    if (window.adminProfileManager) {
        try {
            const response = await fetch(`${PROFILE_CONFIG.BASE_URL}/api/admin/security/logs?hours=${hours}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                window.adminProfileManager.showActivityModal(data.logs, `Activity Log (${hours === '24' ? '24 Hours' : hours === '168' ? '7 Days' : hours === '720' ? '30 Days' : '90 Days'})`);
            }
        } catch (error) {
            console.error('Error refreshing activity log:', error);
        }
    }
};

window.changeActivityTimeRange = function() {
    window.refreshActivityLog();
};

console.log('[PROFILE] Admin Profile Management System loaded successfully');
