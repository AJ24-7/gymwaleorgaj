/**
 * User Coupons Manager
 * Handles loading, displaying, and managing user coupons across the application
 */

class UserCouponsManager {
    constructor() {
        this.currentUser = null;
        this.userCoupons = [];
        this.isLoading = false;
        
        this.init();
    }

    async init() {
        try {
            await this.loadCurrentUser();
            console.log('User Coupons Manager initialized');
        } catch (error) {
            console.error('Failed to initialize User Coupons Manager:', error);
        }
    }

    async loadCurrentUser() {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                this.currentUser = null;
                return;
            }

            const baseUrl = window.BASE_URL || 'http://localhost:5000';
            const response = await fetch(`${baseUrl}/api/users/profile`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                this.currentUser = await response.json();
                this.currentUser.id = this.currentUser._id || this.currentUser.id;
                return;
            }
            
            // If response is not ok, throw an error with status
            const error = new Error(`Failed to load current user with status: ${response.status}`);
            error.status = response.status;
            throw error;

        } catch (error) {
            // Only log out if it's an auth error
            if (error.status === 401 || error.status === 403) {
                console.warn('User token is invalid. Clearing user data for coupons manager.');
                localStorage.removeItem('token'); // Or handle logout globally
            } else if (error.message.includes('Failed to fetch')) {
                console.warn('Backend not reachable for coupons manager user check.');
            } else {
                console.error('Error loading current user for coupons:', error);
            }
            this.currentUser = null;
        }
    }

    async loadUserCoupons() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        
        try {
            // This will attempt to load the user but will not throw a fatal error on network failure.
            await this.loadCurrentUser();

            // If the backend is reachable and we have a user, try fetching from the backend.
            if (this.currentUser) {
                const backendCoupons = await this.loadCouponsFromBackend();
                if (backendCoupons && backendCoupons.length > 0) {
                    this.userCoupons = backendCoupons;
                    this.isLoading = false;
                    return this.userCoupons;
                }
            }

            // Fallback for offline mode or if backend has no coupons
            console.log('Falling back to loading coupons from localStorage.');
            this.userCoupons = this.loadCouponsFromLocalStorage();
            return this.userCoupons;
            
        } catch (error) {
            // This catch block will now only handle unexpected errors, not network failures.
            console.error('An unexpected error occurred while loading user coupons:', error);
            // Final fallback to local storage in case of any other error.
            this.userCoupons = this.loadCouponsFromLocalStorage();
            return this.userCoupons;
        } finally {
            this.isLoading = false;
        }
    }

    async loadCouponsFromBackend() {
        try {
            if (!this.currentUser?.id) return [];

            const token = localStorage.getItem('token');
            const baseUrl = window.BASE_URL || 'http://localhost:5000';
            const response = await fetch(`${baseUrl}/api/users/${this.currentUser.id}/coupons`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                console.log('Coupons loaded from backend:', data);
                return data.coupons || [];
            }
        } catch (error) {
            if (error.message.includes('Failed to fetch')) {
                console.warn('Backend not reachable for fetching coupons.');
            } else {
                console.warn('Failed to load coupons from backend:', error);
            }
        }
        return [];
    }

    loadCouponsFromLocalStorage() {
        try {
            const claimedOffers = JSON.parse(localStorage.getItem('claimedOffers') || '[]');
            const now = new Date();
            
            // Filter valid offers for current user
            return claimedOffers.filter(coupon => 
                new Date(coupon.expiresAt) > now &&
                (coupon.userId === this.currentUser?.id || 
                 coupon.userId === 'guest' || 
                 !this.currentUser)
            );
        } catch (error) {
            console.error('Error loading from localStorage:', error);
            return [];
        }
    }

    getCouponsByStatus(status) {
        const now = new Date();
        
        switch (status) {
            case 'active':
                return this.userCoupons.filter(coupon => 
                    coupon.status === 'active' && 
                    new Date(coupon.validTill || coupon.expiresAt) > now
                );
            case 'expired':
                return this.userCoupons.filter(coupon => 
                    coupon.status === 'expired' || 
                    new Date(coupon.validTill || coupon.expiresAt) <= now
                );
            case 'used':
                return this.userCoupons.filter(coupon => coupon.status === 'used');
            case 'expiring':
                const weekFromNow = new Date();
                weekFromNow.setDate(weekFromNow.getDate() + 7);
                return this.userCoupons.filter(coupon => {
                    const expiryDate = new Date(coupon.validTill || coupon.expiresAt);
                    return expiryDate > now && expiryDate <= weekFromNow && coupon.status === 'active';
                });
            default:
                return this.userCoupons;
        }
    }

    getCouponsStats() {
        const now = new Date();
        const weekFromNow = new Date();
        weekFromNow.setDate(weekFromNow.getDate() + 7);

        const activeCoupons = this.userCoupons.filter(coupon => 
            coupon.status === 'active' && 
            new Date(coupon.validTill || coupon.expiresAt) > now
        );

        const expiringSoon = activeCoupons.filter(coupon => 
            new Date(coupon.validTill || coupon.expiresAt) <= weekFromNow
        );

        const totalSavings = this.userCoupons.reduce((total, coupon) => {
            if (coupon.status === 'used' && coupon.value) {
                const value = typeof coupon.value === 'string' ? 
                    parseInt(coupon.value.replace(/\D/g, '')) : 
                    coupon.value;
                return total + (value || 0);
            }
            return total;
        }, 0);

        return {
            activeCoupons: activeCoupons.length,
            expiringSoon: expiringSoon.length,
            totalSavings: totalSavings
        };
    }

    createCouponCard(coupon, isSettings = false) {
        const now = new Date();
        const expiryDate = new Date(coupon.validTill || coupon.expiresAt);
        const isExpired = expiryDate <= now;
        const isExpiringSoon = !isExpired && expiryDate <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        
        const cardClass = isSettings ? 'settings-coupon-card' : 'coupon-card';
        const statusClass = isExpired ? 'expired' : coupon.status;
        
        const formattedExpiry = expiryDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });

        const discount = this.formatDiscount(coupon);
        const gymName = coupon.gymId?.name || coupon.gym?.name || 'General Offer';
        const title = coupon.offer?.title || coupon.description || 'Special Offer';
        const code = coupon.code || 'N/A';

        return `
            <div class="${cardClass} ${statusClass}" data-coupon-id="${coupon._id || coupon.id}">
                <div class="coupon-header">
                    <div>
                        <h4 class="coupon-title">${title}</h4>
                        <p class="coupon-gym">${gymName}</p>
                    </div>
                    <span class="coupon-status-badge ${statusClass}">${statusClass.toUpperCase()}</span>
                </div>
                
                <div class="coupon-discount">
                    <i class="fas fa-tag"></i>
                    ${discount}
                </div>
                
                <div class="${isSettings ? 'coupon-code-display' : 'coupon-code'}" onclick="copyCouponCode('${code}')">
                    ${code}
                </div>
                
                <div class="coupon-validity-info ${isExpiringSoon ? 'expiring-soon' : ''}">
                    <i class="fas fa-clock"></i>
                    ${isExpired ? 'Expired on' : 'Valid until'} ${formattedExpiry}
                </div>
                
                <div class="${isSettings ? 'coupon-card-actions' : 'coupon-actions'}">
                    <button class="${isSettings ? 'btn-use-coupon-settings' : 'btn-use-coupon'}" 
                            ${isExpired || coupon.status === 'used' ? 'disabled' : ''}>
                        <i class="fas fa-shopping-cart"></i> 
                        ${coupon.status === 'used' ? 'Used' : 'Use Coupon'}
                    </button>
                    <button class="${isSettings ? 'btn-view-coupon-details' : 'btn-view-details'}" 
                            onclick="viewCouponDetails('${coupon._id || coupon.id}')">
                        <i class="fas fa-info-circle"></i> Details
                    </button>
                </div>
            </div>
        `;
    }

    formatDiscount(coupon) {
        if (coupon.type === 'percentage' && coupon.value) {
            return `${coupon.value}% OFF`;
        } else if (coupon.type === 'fixed' && coupon.value) {
            return `₹${coupon.value} OFF`;
        } else if (coupon.offer?.discount) {
            return coupon.offer.discount;
        } else {
            return 'SPECIAL OFFER';
        }
    }

    async renderCouponsInProfile() {
        const activeCouponsGrid = document.getElementById('active-coupons-grid');
        const expiredCouponsGrid = document.getElementById('expired-coupons-grid');
        const usedCouponsGrid = document.getElementById('used-coupons-grid');
        const noCouponsState = document.getElementById('no-coupons-state');
        const couponsLoading = document.getElementById('coupons-loading');

        if (!activeCouponsGrid) return;

        // Show loading
        if (couponsLoading) couponsLoading.style.display = 'block';
        if (noCouponsState) noCouponsState.style.display = 'none';

        try {
            await this.loadUserCoupons();
            
            const activeCoupons = this.getCouponsByStatus('active');
            const expiredCoupons = this.getCouponsByStatus('expired');
            const usedCoupons = this.getCouponsByStatus('used');
            const stats = this.getCouponsStats();

            // Update stats
            this.updateStatsDisplay(stats);

            // Hide loading
            if (couponsLoading) couponsLoading.style.display = 'none';

            // Render active coupons
            if (activeCoupons.length > 0) {
                activeCouponsGrid.innerHTML = activeCoupons
                    .map(coupon => this.createCouponCard(coupon))
                    .join('');
            } else if (expiredCoupons.length === 0 && usedCoupons.length === 0) {
                if (noCouponsState) noCouponsState.style.display = 'block';
                activeCouponsGrid.innerHTML = '';
            } else {
                activeCouponsGrid.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">No active coupons</p>';
            }

            // Render expired coupons
            if (expiredCouponsGrid) {
                expiredCouponsGrid.innerHTML = expiredCoupons.length > 0 ?
                    expiredCoupons.map(coupon => this.createCouponCard(coupon)).join('') :
                    '<p style="text-align: center; color: #666; padding: 20px;">No expired coupons</p>';
            }

            // Render used coupons
            if (usedCouponsGrid) {
                usedCouponsGrid.innerHTML = usedCoupons.length > 0 ?
                    usedCoupons.map(coupon => this.createCouponCard(coupon)).join('') :
                    '<p style="text-align: center; color: #666; padding: 20px;">No used coupons</p>';
            }

        } catch (error) {
            console.error('Error rendering coupons:', error);
            if (couponsLoading) couponsLoading.style.display = 'none';
            if (noCouponsState) noCouponsState.style.display = 'block';
        }
    }

    async renderCouponsInSettings() {
        const settingsCouponsList = document.getElementById('settings-coupons-list');
        const loadingDiv = settingsCouponsList?.querySelector('.coupons-loading');

        if (!settingsCouponsList) return;

        try {
            await this.loadUserCoupons();
            
            const stats = this.getCouponsStats();
            this.updateSettingsStatsDisplay(stats);

            if (loadingDiv) loadingDiv.style.display = 'none';

            if (this.userCoupons.length === 0) {
                settingsCouponsList.innerHTML = `
                    <div style="text-align: center; padding: 3rem; color: #666;">
                        <i class="fas fa-gift" style="font-size: 3rem; margin-bottom: 1rem; color: var(--accent-color);"></i>
                        <h4>No Coupons Yet</h4>
                        <p>Start exploring offers to collect coupons and save on your fitness journey!</p>
                    </div>
                `;
                return;
            }

            settingsCouponsList.innerHTML = this.userCoupons
                .map(coupon => this.createCouponCard(coupon, true))
                .join('');

        } catch (error) {
            console.error('Error rendering settings coupons:', error);
            if (loadingDiv) loadingDiv.style.display = 'none';
            settingsCouponsList.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: #666;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 1rem; color: var(--danger-color);"></i>
                    <h4>Error Loading Coupons</h4>
                    <p>Please try refreshing the page.</p>
                </div>
            `;
        }
    }

    updateStatsDisplay(stats) {
        const activeCouponsCount = document.getElementById('active-coupons-count');
        const totalSavings = document.getElementById('total-savings');
        const expiringSoonCount = document.getElementById('expiring-soon-count');

        if (activeCouponsCount) activeCouponsCount.textContent = stats.activeCoupons;
        if (totalSavings) totalSavings.textContent = `₹${stats.totalSavings}`;
        if (expiringSoonCount) expiringSoonCount.textContent = stats.expiringSoon;
    }

    updateSettingsStatsDisplay(stats) {
        const settingsActiveCoupons = document.getElementById('settings-active-coupons');
        const settingsTotalSavings = document.getElementById('settings-total-savings');
        const settingsExpiringSoon = document.getElementById('settings-expiring-soon');

        if (settingsActiveCoupons) settingsActiveCoupons.textContent = stats.activeCoupons;
        if (settingsTotalSavings) settingsTotalSavings.textContent = `₹${stats.totalSavings}`;
        if (settingsExpiringSoon) settingsExpiringSoon.textContent = stats.expiringSoon;
    }

    filterCoupons(filter) {
        let couponsToShow = [];
        
        switch (filter) {
            case 'active':
                couponsToShow = this.getCouponsByStatus('active');
                break;
            case 'expired':
                couponsToShow = this.getCouponsByStatus('expired');
                break;
            case 'used':
                couponsToShow = this.getCouponsByStatus('used');
                break;
            case 'expiring':
                couponsToShow = this.getCouponsByStatus('expiring');
                break;
            default:
                couponsToShow = this.userCoupons;
        }

        const settingsCouponsList = document.getElementById('settings-coupons-list');
        if (settingsCouponsList) {
            if (couponsToShow.length === 0) {
                settingsCouponsList.innerHTML = `
                    <div style="text-align: center; padding: 3rem; color: #666;">
                        <i class="fas fa-search" style="font-size: 3rem; margin-bottom: 1rem; color: var(--accent-color);"></i>
                        <h4>No ${filter} Coupons</h4>
                        <p>No coupons found for the selected filter.</p>
                    </div>
                `;
            } else {
                settingsCouponsList.innerHTML = couponsToShow
                    .map(coupon => this.createCouponCard(coupon, true))
                    .join('');
            }
        }
    }

    setupEventListeners() {
        // Profile page category tabs
        document.querySelectorAll('.category-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                // Remove active class from all tabs
                document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.coupons-grid').forEach(g => g.style.display = 'none');
                
                // Add active class to clicked tab
                e.target.classList.add('active');
                
                // Show corresponding grid
                const category = e.target.dataset.category;
                const grid = document.getElementById(`${category}-coupons-grid`);
                if (grid) grid.style.display = 'grid';
            });
        });

        // Settings page filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                
                const filter = e.target.dataset.filter;
                this.filterCoupons(filter);
            });
        });
    }
}

// Global functions
function copyCouponCode(code) {
    navigator.clipboard.writeText(code).then(() => {
        showToast('Coupon code copied to clipboard!', 'success');
    }).catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = code;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showToast('Coupon code copied to clipboard!', 'success');
    });
}

function viewCouponDetails(couponId) {
    // Implementation for viewing coupon details
    console.log('View coupon details:', couponId);
    showToast('Coupon details feature coming soon!', 'info');
}

function findNewOffers() {
    window.location.href = '/frontend/membership-plans.html';
}

function exploreOffers() {
    window.location.href = '/frontend/membership-plans.html';
}

function refreshCoupons() {
    if (window.userCouponsManager) {
        window.userCouponsManager.renderCouponsInProfile();
        showToast('Coupons refreshed!', 'success');
    }
}

function refreshUserCoupons() {
    if (window.userCouponsManager) {
        window.userCouponsManager.renderCouponsInSettings();
        showToast('Coupons refreshed!', 'success');
    }
}

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

// Initialize when DOM is loaded
let userCouponsManager = null;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        userCouponsManager = new UserCouponsManager();
        window.userCouponsManager = userCouponsManager;
        
        // Set up event listeners
        userCouponsManager.setupEventListeners();
        
        // Auto-load coupons if on profile page
        if (document.getElementById('active-coupons-grid')) {
            userCouponsManager.renderCouponsInProfile();
        }
        
        // Auto-load coupons if on settings page
        if (document.getElementById('settings-coupons-list')) {
            userCouponsManager.renderCouponsInSettings();
        }
    });
} else {
    userCouponsManager = new UserCouponsManager();
    window.userCouponsManager = userCouponsManager;
    userCouponsManager.setupEventListeners();
    
    if (document.getElementById('active-coupons-grid')) {
        userCouponsManager.renderCouponsInProfile();
    }
    
    if (document.getElementById('settings-coupons-list')) {
        userCouponsManager.renderCouponsInSettings();
    }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UserCouponsManager;
}