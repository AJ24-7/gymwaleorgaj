// Admin Authentication Guard
// This script should be included in admin.html to ensure proper authentication

class AdminAuthGuard {
    constructor() {
        // Prevent multiple instances
        if (window.adminAuthGuardInstance) {
            console.log('⚠️ AdminAuthGuard already exists, skipping duplicate');
            return window.adminAuthGuardInstance;
        }
        
        window.adminAuthGuardInstance = this;
        this.baseURL = 'http://localhost:5000/api/admin';
        this.isCheckingAuth = false;
        
        console.log('🔐 AdminAuthGuard initialized');
        this.checkAuthentication();
    }

    async checkAuthentication() {
        if (this.isCheckingAuth) {
            console.log('⚠️ Authentication check already in progress');
            return;
        }
        
        this.isCheckingAuth = true;
        console.log('🔍 Starting authentication check...');

        const token = localStorage.getItem('adminToken');
        const loginTimestamp = localStorage.getItem('loginTimestamp');
        
        console.log('🔑 Token exists:', !!token);
        console.log('⏰ Login timestamp:', loginTimestamp);
        
        if (!token) {
            console.log('❌ No token found, redirecting to login');
            this.redirectToLogin('No authentication token found');
            return;
        }

        // Check token expiration
        if (loginTimestamp) {
            const sessionAge = Date.now() - new Date(loginTimestamp).getTime();
            const sessionTimeout = parseInt(localStorage.getItem('sessionTimeout')) || 1800000; // 30 minutes
            
            console.log(`⏰ Session age: ${Math.round(sessionAge / 1000)}s, timeout: ${sessionTimeout / 1000}s`);
            
            if (sessionAge > sessionTimeout) {
                console.log('⏰ Session expired, clearing and redirecting');
                this.clearSession();
                this.redirectToLogin('Session expired');
                return;
            }
        }

        // Verify token with server
        try {
            console.log('🔍 Verifying token with server...');
            const response = await fetch(`${this.baseURL}/profile`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('📡 Server response status:', response.status);

            if (response.status === 401) {
                // Token is invalid or expired
                console.log('❌ Token invalid/expired, clearing session');
                this.clearSession();
                this.redirectToLogin('Authentication expired');
                return;
            }

            if (response.ok) {
                const result = await response.json();
                console.log('✅ Authentication verified successfully');
                console.log('👤 Admin data:', result.admin);
                
                // Store admin info for use in the dashboard
                localStorage.setItem('currentAdmin', JSON.stringify(result.admin));
                
                // Start session monitoring
                this.startSessionMonitoring();
                
                // Show the main content with a small delay to ensure DOM is ready
                setTimeout(() => {
                    console.log('🎨 Showing main content...');
                    this.showMainContent();
                    this.isCheckingAuth = false;
                }, 200);
                
                console.log('🎉 Auth guard setup complete');
            } else {
                console.log('❌ Server returned non-OK status:', response.status);
                const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
                throw new Error(`Authentication verification failed: ${errorData.message}`);
            }
        } catch (error) {
            console.error('❌ Authentication check failed:', error);
            this.isCheckingAuth = false;
            this.redirectToLogin('Authentication verification failed');
        }
    }

    startSessionMonitoring() {
        // Auto-refresh token every 25 minutes
        setInterval(async () => {
            await this.refreshToken();
        }, 25 * 60 * 1000);

        // Monitor for inactivity
        let lastActivity = Date.now();
        const inactivityTimeout = 30 * 60 * 1000; // 30 minutes

        const resetActivity = () => {
            lastActivity = Date.now();
        };

        // Track user activity
        ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'].forEach(event => {
            document.addEventListener(event, resetActivity, { passive: true });
        });

        // Check for inactivity every minute
        setInterval(() => {
            if (Date.now() - lastActivity > inactivityTimeout) {
                this.logout('Session expired due to inactivity');
            }
        }, 60000);
    }

    async refreshToken() {
        const refreshToken = localStorage.getItem('adminRefreshToken');
        const deviceFingerprint = this.getDeviceFingerprint();

        if (!refreshToken) {
            this.logout('No refresh token available');
            return;
        }

        try {
            const response = await fetch(`${this.baseURL}/auth/refresh-token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    refreshToken,
                    deviceFingerprint
                })
            });

            if (response.ok) {
                const result = await response.json();
                localStorage.setItem('adminToken', result.token);
                localStorage.setItem('loginTimestamp', new Date().toISOString());
                console.log('Token refreshed successfully');
            } else {
                throw new Error('Token refresh failed');
            }
        } catch (error) {
            console.error('Token refresh error:', error);
            this.logout('Session expired');
        }
    }

    getDeviceFingerprint() {
        // Same fingerprint generation as in login
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('Device fingerprint', 2, 2);
        
        const fingerprint = [
            navigator.userAgent,
            navigator.language,
            screen.width + 'x' + screen.height,
            new Date().getTimezoneOffset(),
            canvas.toDataURL()
        ].join('|');
        
        return btoa(fingerprint).substring(0, 32);
    }

    showMainContent() {
        console.log('🎨 showMainContent() called');
        
        // Hide loading screen if present
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            console.log('📴 Hiding loading screen');
            loadingScreen.style.display = 'none';
        } else {
            console.log('⚠️ No loading screen found');
        }

        // Show main admin interface
        const mainContent = document.getElementById('mainContent');
        if (mainContent) {
            console.log('📱 Showing main content');
            mainContent.style.display = 'block';
            mainContent.style.visibility = 'visible';
            mainContent.style.opacity = '1';
        } else {
            console.error('❌ mainContent element not found!');
        }

        // Update admin info in UI
        this.updateAdminInfo();
        
        console.log('✅ Main content should now be visible');
    }

    updateAdminInfo() {
        const currentAdmin = JSON.parse(localStorage.getItem('currentAdmin') || '{}');
        
        // Update admin name in header
        const adminNameElements = document.querySelectorAll('.admin-name, .admin-user span');
        adminNameElements.forEach(element => {
            if (currentAdmin.name) {
                element.textContent = currentAdmin.name;
            }
        });

        // Update admin email if shown anywhere
        const adminEmailElements = document.querySelectorAll('.admin-email');
        adminEmailElements.forEach(element => {
            if (currentAdmin.email) {
                element.textContent = currentAdmin.email;
            }
        });

        // Show role-based features
        if (currentAdmin.role === 'super_admin') {
            this.showSuperAdminFeatures();
        }
    }

    showSuperAdminFeatures() {
        // Show features only available to super admins
        const superAdminElements = document.querySelectorAll('.super-admin-only');
        superAdminElements.forEach(element => {
            element.style.display = 'block';
        });
    }

    clearSession() {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminRefreshToken');
        localStorage.removeItem('adminUser');
        localStorage.removeItem('currentAdmin');
        localStorage.removeItem('loginTimestamp');
        localStorage.removeItem('sessionTimeout');
    }

    async logout(reason = 'Logged out') {
        const refreshToken = localStorage.getItem('adminRefreshToken');
        
        // Notify server of logout
        if (refreshToken) {
            try {
                await fetch(`${this.baseURL}/auth/logout`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
                    },
                    body: JSON.stringify({ refreshToken })
                });
            } catch (error) {
                console.error('Logout notification failed:', error);
            }
        }

        this.clearSession();
        this.redirectToLogin(reason);
    }

    redirectToLogin(reason = '') {
        console.log('🔄 redirectToLogin called with reason:', reason);
        
        // Prevent redirecting if we're already on the login page
        if (window.location.pathname.includes('admin-login.html')) {
            console.log('⚠️ Already on login page, skipping redirect');
            return;
        }
        
        // Mark that we're being redirected due to auth issues
        sessionStorage.setItem('adminLoggedOut', 'true');
        
        // Show a brief message if needed
        if (reason && reason !== 'No authentication token found') {
            console.log('📢 Showing alert:', reason);
            alert(reason + '. Please login again.');
        }
        
        console.log('🚀 Redirecting to login page...');
        // Redirect to professional login page
        window.location.href = 'admin-login.html';
    }

    redirectToSetup(reason = '') {
        console.log('Redirecting to setup:', reason);
        
        // Show a brief message
        if (reason) {
            alert(reason);
        }
        
        // Redirect to admin setup page
        window.location.href = 'admin-setup.html';
    }
}

// Initialize authentication guard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM loaded, initializing auth guard...');
    
    // Prevent multiple initializations
    if (window.adminAuthGuardInitialized) {
        console.log('⚠️ Auth guard already initialized, skipping');
        return;
    }
    window.adminAuthGuardInitialized = true;
    // Add loading screen if not present
    if (!document.getElementById('loading-screen')) {
        console.log('📱 Creating loading screen...');
        const loadingScreen = document.createElement('div');
        loadingScreen.id = 'loading-screen';
        loadingScreen.innerHTML = `
            <div style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
                color: white;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            ">
                <div style="text-align: center;">
                    <div style="
                        width: 50px;
                        height: 50px;
                        border: 3px solid rgba(255,255,255,0.3);
                        border-top: 3px solid white;
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                        margin: 0 auto 20px;
                    "></div>
                    <h3>Verifying Authentication...</h3>
                    <p style="margin-top: 10px; opacity: 0.8;">Please wait while we secure your session</p>
                </div>
            </div>
            <style>
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            </style>
        `;
        document.body.appendChild(loadingScreen);
    }

    // Hide main content initially
    const mainContent = document.getElementById('mainContent');
    if (mainContent) {
        console.log('👻 Hiding main content during auth check');
        mainContent.style.display = 'none';
    } else {
        console.warn('⚠️ mainContent element not found!');
    }

    // Initialize auth guard (only once)
    console.log('🔐 Creating AdminAuthGuard instance...');
    new AdminAuthGuard();
});

// Global logout function that can be called from anywhere
window.adminLogout = function() {
    console.log('🚪 Admin logout requested');
    if (window.adminAuthGuardInstance) {
        window.adminAuthGuardInstance.logout('User requested logout');
    } else {
        // Fallback if no instance exists
        localStorage.clear();
        window.location.href = 'admin-login.html';
    }
};

// Handle browser back/forward button - but don't create new instances
window.addEventListener('popstate', () => {
    console.log('🔄 Browser navigation detected');
    // Just re-check auth with existing instance if available
    if (window.adminAuthGuardInstance && !window.adminAuthGuardInstance.isCheckingAuth) {
        console.log('🔍 Re-checking authentication...');
        window.adminAuthGuardInstance.checkAuthentication();
    }
});
