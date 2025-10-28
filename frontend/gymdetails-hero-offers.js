/**
 * Hero Offers Manager for Gym Details Page
 * Manages offers display in the hero section with user-based filtering
 */

class GymHeroOffersManager {
    constructor() {
        this.currentUser = null;
        this.offers = [];
        this.offersModal = null;
        this.modalOffersGrid = null;
        this.offersBtn = null;
        this.isLoading = false;
        
        this.init();
    }

    async init() {
        try {
            // Get DOM elements
            this.offersModal = document.getElementById('offers-modal');
            this.modalOffersGrid = document.getElementById('modal-offers-grid');
            this.offersBtn = document.getElementById('offers-btn');
            
            if (!this.offersModal || !this.modalOffersGrid || !this.offersBtn) {
                console.warn('Offers modal elements not found');
                return;
            }

            // Set up event listeners
            this.setupEventListeners();

            // Get current user data
            await this.loadCurrentUser();
            
            console.log('Hero Offers Manager initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Hero Offers Manager:', error);
        }
    }

    setupEventListeners() {
        // Offers button click
        this.offersBtn.addEventListener('click', () => this.openOffersModal());
        
        // Close modal events
        const closeBtn = document.getElementById('close-offers-modal');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeOffersModal());
        }
        
        // Refresh offers button
        const refreshBtn = document.getElementById('refresh-offers-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshOffers());
        }
        
        // Close modal when clicking outside
        this.offersModal.addEventListener('click', (e) => {
            if (e.target === this.offersModal) {
                this.closeOffersModal();
            }
        });
    }

    async openOffersModal() {
        this.offersModal.style.display = 'block';
        document.body.style.overflow = 'hidden';
        
        // Load offers if not already loaded
        if (this.offers.length === 0) {
            await this.loadOffers();
        } else {
            this.renderOffers();
        }
        
        // Load claimed offers
        await this.loadClaimedOffers();
    }

    closeOffersModal() {
        this.offersModal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }

    async loadCurrentUser() {
        try {
            // Try to get user from token first
            const token = localStorage.getItem('token');
            if (token) {
                // Fetch user profile from backend
                const response = await fetch('/api/users/profile', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (response.ok) {
                    const user = await response.json();
                    this.currentUser = {
                        ...user,
                        isNewUser: this.checkIfNewUser(user),
                        isGuest: false,
                        id: user._id || user.id
                    };
                    console.log('Current user loaded:', this.currentUser);
                    return;
                }
            }

            // Try sessionStorage
            const sessionUser = sessionStorage.getItem('userSession');
            if (sessionUser) {
                const user = JSON.parse(sessionUser);
                this.currentUser = {
                    ...user,
                    isNewUser: this.checkIfNewUser(user),
                    isGuest: false
                };
                return;
            }

            // If no user found, they are a guest/new user
            this.currentUser = { 
                isNewUser: true, 
                isGuest: true,
                id: null 
            };
            console.log('User detected as new/guest user');
            
        } catch (error) {
            console.error('Error loading current user:', error);
            this.currentUser = { 
                isNewUser: true, 
                isGuest: true,
                id: null 
            };
        }
    }

    checkIfNewUser(user) {
        if (!user) return true;
        
        // Check if user has any memberships or previous activity
        const hasMemeberships = user.memberships && user.memberships.length > 0;
        const hasBookings = user.bookings && user.bookings.length > 0;
        const accountAge = user.createdAt ? new Date() - new Date(user.createdAt) : 0;
        const daysOld = accountAge / (1000 * 60 * 60 * 24);
        
        // Consider as existing user if they have memberships, bookings, or account is older than 7 days
        return !(hasMemeberships || hasBookings || daysOld > 7);
    }

    async loadOffers() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        this.showLoadingState();

        try {
            // Try to load from API first
            const offers = await this.loadOffersFromAPI();
            
            if (offers && offers.length > 0) {
                this.offers = offers;
            } else {
                // Fallback to mock data if API fails
                this.offers = this.getMockOffers();
            }

            this.renderOffers();
            
        } catch (error) {
            console.error('Error loading offers:', error);
            // Use mock data on error
            this.offers = this.getMockOffers();
            this.renderOffers();
        } finally {
            this.isLoading = false;
        }
    }

    async loadOffersFromAPI() {
        try {
            // Get gym ID from URL params or page context
            const urlParams = new URLSearchParams(window.location.search);
            const gymId = urlParams.get('id') || this.getGymIdFromPage();
            
            const baseUrl = window.BASE_URL || 'http://localhost:5000';
            let apiUrl = `${baseUrl}/api/offers/active`;
            if (gymId) {
                apiUrl = `${baseUrl}/api/offers/gym/${gymId}/active`;
            }

            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('Offers loaded from API:', data);
                return data.offers || [];
            } else {
                console.warn('API response not ok:', response.status, response.statusText);
            }
        } catch (error) {
            console.warn('API request failed, using mock data:', error);
        }
        return null;
    }

    getGymIdFromPage() {
        // Try to get gym ID from various sources on the page
        const gymElement = document.querySelector('[data-gym-id]');
        if (gymElement) {
            return gymElement.dataset.gymId;
        }
        
        // Try from global variables
        if (typeof currentGymId !== 'undefined') {
            return currentGymId;
        }
        
        // Try from meta tags
        const metaGymId = document.querySelector('meta[name="gym-id"]');
        if (metaGymId) {
            return metaGymId.content;
        }
        
        return null;
    }

    getMockOffers() {
        return [
            {
                id: 'new-member-discount',
                title: 'New Member Special',
                description: 'Get 50% off your first month membership',
                discount: '50% OFF',
                validityDays: 7,
                isForNewUsers: true,
                type: 'discount',
                conditions: 'Valid for first-time members only'
            },
            {
                id: 'student-discount',
                title: 'Student Discount',
                description: 'Special rates for students with valid ID',
                discount: '30% OFF',
                validityDays: 30,
                isForNewUsers: false,
                type: 'discount',
                conditions: 'Valid student ID required'
            },
            {
                id: 'family-package',
                title: 'Family Package Deal',
                description: 'Join with family and save more',
                discount: '40% OFF',
                validityDays: 14,
                isForNewUsers: true,
                type: 'package',
                conditions: 'Minimum 2 family members'
            },
            {
                id: 'personal-training',
                title: 'Free Personal Training',
                description: 'Get 3 free PT sessions with annual membership',
                discount: 'FREE',
                validityDays: 10,
                isForNewUsers: false,
                type: 'bonus',
                conditions: 'With 12-month membership only'
            }
        ];
    }

    showLoadingState() {
        const loadingDiv = document.getElementById('modal-offers-loading');
        const gridDiv = document.getElementById('modal-offers-grid');
        const noOffersDiv = document.getElementById('modal-no-offers');
        
        if (loadingDiv) loadingDiv.style.display = 'block';
        if (gridDiv) gridDiv.style.display = 'none';
        if (noOffersDiv) noOffersDiv.style.display = 'none';
    }

    renderOffers() {
        const loadingDiv = document.getElementById('modal-offers-loading');
        const gridDiv = document.getElementById('modal-offers-grid');
        const noOffersDiv = document.getElementById('modal-no-offers');

        if (loadingDiv) loadingDiv.style.display = 'none';

        if (!this.offers || this.offers.length === 0) {
            if (gridDiv) gridDiv.style.display = 'none';
            if (noOffersDiv) noOffersDiv.style.display = 'block';
            return;
        }

        const filteredOffers = this.filterOffersForUser();
        
        if (filteredOffers.length === 0) {
            if (gridDiv) gridDiv.style.display = 'none';
            if (noOffersDiv) noOffersDiv.style.display = 'block';
            return;
        }

        if (gridDiv) {
            gridDiv.style.display = 'grid';
            gridDiv.innerHTML = filteredOffers
                .map(offer => this.createModalOfferCard(offer))
                .join('');
        }
        
        if (noOffersDiv) noOffersDiv.style.display = 'none';

        // Add event listeners to claim buttons
        this.attachClaimEventListeners();
    }

    filterOffersForUser() {
        if (!this.offers) return [];

        // Show all offers, but mark some as locked based on user status
        return this.offers.map(offer => ({
            ...offer,
            isLocked: this.isOfferLocked(offer)
        }));
    }

    isOfferLocked(offer) {
        if (!this.currentUser) return false;
        
        // If offer is for new users only and current user is not new
        if (offer.isForNewUsers && !this.currentUser.isNewUser && !this.currentUser.isGuest) {
            return true;
        }

        return false;
    }

    createModalOfferCard(offer) {
        const isLocked = offer.isLocked;
        const validUntil = this.calculateValidityDate(offer.validityDays);
        
        return `
            <div class="modal-offer-card ${isLocked ? 'locked' : ''}" data-offer-id="${offer.id}">
                <div class="modal-offer-badge ${isLocked ? 'locked-badge' : ''}">${isLocked ? 'LOCKED' : 'ACTIVE'}</div>
                
                <h4 class="modal-offer-title">${offer.title}</h4>
                <p class="modal-offer-description">${offer.description}</p>
                
                <div class="modal-offer-discount">
                    <i class="fas fa-tag"></i>
                    ${offer.discount}
                </div>
                
                <div class="modal-offer-validity">
                    <i class="fas fa-clock"></i>
                    Valid until ${validUntil}
                </div>
                
                ${isLocked ? this.createModalLockedMessage(offer) : this.createModalClaimButton(offer)}
            </div>
        `;
    }

    createModalClaimButton(offer) {
        return `
            <button class="modal-claim-btn" onclick="gymHeroOffersManager.claimOffer('${offer.id}')">
                <i class="fas fa-gift"></i> Claim Offer
            </button>
        `;
    }

    createModalLockedMessage(offer) {
        let message = 'Available for new members only';
        
        if (offer.isForNewUsers) {
            message = 'Sign up as a new member to unlock this offer';
        }
        
        return `
            <div class="modal-locked-message">
                <i class="fas fa-lock"></i>
                ${message}
            </div>
        `;
    }

    calculateValidityDate(validityDays) {
        const date = new Date();
        date.setDate(date.getDate() + validityDays);
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
        });
    }

    attachClaimEventListeners() {
        const claimButtons = this.modalOffersGrid.querySelectorAll('.modal-claim-btn');
        claimButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const card = button.closest('[data-offer-id]');
                if (card) {
                    const offerId = card.dataset.offerId;
                    this.claimOffer(offerId);
                }
            });
        });
    }

    async loadClaimedOffers() {
        try {
            const claimedSection = document.getElementById('my-claimed-offers');
            const claimedList = document.getElementById('claimed-offers-list');
            const claimedCount = document.getElementById('claimed-count');
            
            if (!claimedSection || !claimedList) return;

            // Try to load from backend first
            let claimedOffers = [];
            
            if (this.currentUser && !this.currentUser.isGuest) {
                claimedOffers = await this.loadClaimedFromBackend();
            }
            
            // Fallback to localStorage
            if (claimedOffers.length === 0) {
                claimedOffers = this.loadClaimedFromLocalStorage();
            }

            if (claimedOffers.length > 0) {
                claimedSection.style.display = 'block';
                claimedList.innerHTML = claimedOffers
                    .map(coupon => this.createClaimedOfferCard(coupon))
                    .join('');
                claimedCount.textContent = `${claimedOffers.length} claimed`;
            } else {
                claimedSection.style.display = 'none';
            }

        } catch (error) {
            console.error('Error loading claimed offers:', error);
        }
    }

    async loadClaimedFromBackend() {
        try {
            const userId = this.currentUser?.id || this.currentUser?.userId;
            if (!userId) return [];

            const response = await fetch(`/api/user/${userId}/coupons?status=active`, {
                headers: {
                    'Authorization': `Bearer ${this.getAuthToken()}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                return data.coupons || [];
            }
        } catch (error) {
            console.warn('Failed to load claimed offers from backend:', error);
        }
        return [];
    }

    loadClaimedFromLocalStorage() {
        try {
            const claimedOffers = JSON.parse(localStorage.getItem('claimedOffers') || '[]');
            const now = new Date();
            
            // Filter valid offers
            return claimedOffers.filter(coupon => 
                new Date(coupon.expiresAt) > now &&
                (coupon.userId === this.currentUser?.id || coupon.userId === 'guest')
            );
        } catch (error) {
            console.error('Error loading from localStorage:', error);
            return [];
        }
    }

    createClaimedOfferCard(coupon) {
        const expiryDate = new Date(coupon.expiresAt || coupon.validTill).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });

        return `
            <div class="claimed-offer-card">
                <h5 class="offer-title">${coupon.offer?.title || coupon.description || 'Special Offer'}</h5>
                <div class="offer-code">${coupon.code}</div>
                <div class="offer-expiry">
                    <i class="fas fa-clock"></i>
                    Expires: ${expiryDate}
                </div>
            </div>
        `;
    }

    async claimOffer(offerId) {
        try {
            const offer = this.offers.find(o => o.id === offerId);
            if (!offer) {
                throw new Error('Offer not found');
            }

            if (offer.isLocked) {
                this.showMessage('This offer is not available for your account type', 'error');
                return;
            }

            // Check if user is logged in
            if (!this.currentUser || this.currentUser.isGuest) {
                this.promptUserLogin(offer);
                return;
            }

            // Show loading state
            const button = document.querySelector(`[data-offer-id="${offerId}"] .claim-btn`);
            if (button) {
                button.disabled = true;
                button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Claiming...';
            }

            // Try to save to backend
            const saved = await this.saveOfferToBackend(offerId, offer);
            
            if (saved) {
                // Also save to localStorage as backup
                this.saveOfferToLocalStorage(offerId, offer);
                this.showMessage('Offer claimed successfully!', 'success');
                this.updateOfferCardToClaimed(offerId);
            } else {
                throw new Error('Failed to save offer');
            }

        } catch (error) {
            console.error('Error claiming offer:', error);
            this.showMessage('Failed to claim offer. Please try again.', 'error');
            
            // Reset button state
            const button = document.querySelector(`[data-offer-id="${offerId}"] .claim-btn`);
            if (button) {
                button.disabled = false;
                button.innerHTML = '<i class="fas fa-gift"></i> Claim Offer';
            }
        }
    }

    async saveOfferToBackend(offerId, offer) {
        try {
            const userId = this.currentUser?.id || this.currentUser?.userId;
            if (!userId) {
                console.warn('No user ID available for backend save');
                return false;
            }

            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:5000/api/user/${userId}/coupons`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    offerId: offerId,
                    offerData: offer,
                    claimedAt: new Date().toISOString(),
                    expiresAt: this.calculateExpiryDate(offer.validityDays || 30)
                })
            });

            if (response.ok) {
                const result = await response.json();
                console.log('Offer saved to backend:', result);
                return true;
            }
        } catch (error) {
            console.warn('Backend save failed, using localStorage:', error);
        }
        return false;
    }

    saveOfferToLocalStorage(offerId, offer) {
        try {
            const claimedOffers = JSON.parse(localStorage.getItem('claimedOffers') || '[]');
            
            const claimedOffer = {
                _id: offerId,
                id: offerId,
                offer: offer,
                title: offer.title || offer.name,
                description: offer.description || offer.subtitle,
                type: offer.discountType || 'percentage',
                value: offer.discountValue || offer.discount,
                code: this.generateCouponCode(),
                status: 'active',
                claimedAt: new Date().toISOString(),
                validTill: this.calculateExpiryDate(offer.validityDays || 30),
                expiresAt: this.calculateExpiryDate(offer.validityDays || 30),
                userId: this.currentUser?.id || 'guest',
                gymId: offer.gymId || offer.gym || { name: offer.gymName || 'General Offer' }
            };

            claimedOffers.push(claimedOffer);
            localStorage.setItem('claimedOffers', JSON.stringify(claimedOffers));
            
            console.log('Offer saved to localStorage:', claimedOffer);
            
            // Refresh coupons manager if available
            if (window.userCouponsManager) {
                window.userCouponsManager.loadUserCoupons();
            }
        } catch (error) {
            console.error('Failed to save to localStorage:', error);
        }
    }

    generateCouponCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 8; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    calculateExpiryDate(validityDays) {
        const date = new Date();
        date.setDate(date.getDate() + validityDays);
        return date.toISOString();
    }

    updateOfferCardToClaimed(offerId) {
        const card = document.querySelector(`[data-offer-id="${offerId}"]`);
        if (card) {
            const button = card.querySelector('.modal-claim-btn');
            if (button) {
                button.disabled = true;
                button.innerHTML = '<i class="fas fa-check"></i> Claimed';
                button.style.background = '#22c55e';
                button.style.color = 'white';
            }
        }
        
        // Refresh claimed offers section
        this.loadClaimedOffers();
    }

    promptUserLogin(offer) {
        const modal = document.createElement('div');
        modal.className = 'login-prompt-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-gift"></i> Claim Your Offer</h3>
                    <button class="close-btn" onclick="this.closest('.login-prompt-modal').remove()">×</button>
                </div>
                <div class="modal-body">
                    <p>To claim this exclusive offer, please sign in or create an account.</p>
                    <div class="offer-preview">
                        <h4>${offer.title}</h4>
                        <p>${offer.description}</p>
                        <div class="discount">${offer.discount}</div>
                    </div>
                </div>
                <div class="modal-actions">
                    <button class="btn-primary" onclick="window.location.href='register.html'">
                        <i class="fas fa-user-plus"></i> Sign Up
                    </button>
                    <button class="btn-secondary" onclick="window.location.href='register.html'">
                        <i class="fas fa-sign-in-alt"></i> Sign In
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Auto remove after 10 seconds
        setTimeout(() => {
            if (modal.parentNode) {
                modal.remove();
            }
        }, 10000);
    }

    getAuthToken() {
        return localStorage.getItem('authToken') || 
               sessionStorage.getItem('authToken') || 
               localStorage.getItem('adminToken') || '';
    }

    showMessage(message, type = 'info') {
        // Create toast notification
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
                <span>${message}</span>
            </div>
        `;
        
        // Add styles
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
        
        // Animate in
        setTimeout(() => {
            toast.style.transform = 'translateX(0)';
        }, 100);
        
        // Remove after 4 seconds
        setTimeout(() => {
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.remove();
                }
            }, 300);
        }, 4000);
    }

    // Public method to refresh offers
    async refreshOffers() {
        await this.loadOffers();
    }

    // Public method to check if user has claimed an offer
    hasClaimedOffer(offerId) {
        try {
            const claimedOffers = JSON.parse(localStorage.getItem('claimedOffers') || '[]');
            return claimedOffers.some(claimed => 
                claimed.id === offerId && 
                new Date(claimed.expiresAt) > new Date()
            );
        } catch (error) {
            console.error('Error checking claimed offers:', error);
            return false;
        }
    }
}

// Initialize when DOM is loaded
let gymHeroOffersManager = null;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        gymHeroOffersManager = new GymHeroOffersManager();
    });
} else {
    gymHeroOffersManager = new GymHeroOffersManager();
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GymHeroOffersManager;
}