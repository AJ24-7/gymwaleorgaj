/**
 * Gym Details Offers Module
 * Handles offer display, claiming, and coupon functionality on gym details page
 */

class GymOffersManager {
    constructor() {
        this.currentGymId = null;
        this.activeOffers = [];
        this.userCoupons = JSON.parse(localStorage.getItem('userCoupons') || '[]');
        this.userOffers = JSON.parse(localStorage.getItem('userOffers') || '[]');
        this.baseUrl = 'http://localhost:5000/api'; // Backend API base URL
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkForAutoShowOffers();
        
        // Also try to get gym ID from localStorage as fallback
        if (!this.currentGymId) {
            const fallbackGymId = localStorage.getItem('gymId') || localStorage.getItem('adminGymId');
            if (fallbackGymId) {
                console.log('🏢 Using fallback gym ID:', fallbackGymId);
                this.currentGymId = fallbackGymId;
                this.loadActiveOffers();
            }
        }
    }

    setupEventListeners() {
        // Listen for gym data loaded event
        document.addEventListener('gymDataLoaded', (event) => {
            this.currentGymId = event.detail.gymId;
            this.loadActiveOffers();
        });

        // Setup claim buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('claim-offer-btn')) {
                this.handleOfferClaim(e.target.dataset.offerId);
            }
            if (e.target.classList.contains('apply-coupon-btn')) {
                this.handleCouponApplication(e.target.dataset.couponCode);
            }
        });
    }

    async loadActiveOffers() {
        if (!this.currentGymId) return;

        try {
            // Show loading state
            this.showOffersLoading();

            let offersFromBackend = [];
            let offersFromLocalStorage = [];

            // Try to fetch active offers from backend first
            try {
                console.log('Loading offers for gym:', this.currentGymId);
                const response = await fetch(`${this.baseUrl}/offers/gym/${this.currentGymId}/active`);
                
                if (response.ok) {
                    offersFromBackend = await response.json();
                    console.log('Active offers received from backend:', offersFromBackend.length);
                }
            } catch (backendError) {
                console.warn('Backend fetch failed, checking localStorage:', backendError);
            }

            // Also check localStorage for offers (from admin dashboard)
            try {
                const gymOffersKey = `gymOffers_${this.currentGymId}`;
                const localOffers = JSON.parse(localStorage.getItem(gymOffersKey) || '[]');
                offersFromLocalStorage = localOffers.filter(offer => 
                    offer.status === 'active' && 
                    new Date(offer.validUntil) > new Date()
                );
                console.log('Active offers from localStorage:', offersFromLocalStorage.length);
            } catch (localError) {
                console.warn('LocalStorage fetch failed:', localError);
            }

            // Combine offers from both sources (localStorage takes precedence for same IDs)
            const combinedOffers = [...offersFromBackend];
            offersFromLocalStorage.forEach(localOffer => {
                const existingIndex = combinedOffers.findIndex(o => 
                    o._id === localOffer._id || o.id === localOffer.id
                );
                if (existingIndex >= 0) {
                    combinedOffers[existingIndex] = localOffer; // LocalStorage takes precedence
                } else {
                    combinedOffers.push(localOffer);
                }
            });

            this.activeOffers = combinedOffers;
            console.log('Total active offers loaded:', this.activeOffers.length);

            // Update offers tab
            this.updateOffersTab();
            
            // Only show popup if there are active offers
            if (this.activeOffers.length > 0) {
                this.showOffersPopup();
            }
            
        } catch (error) {
            console.error('Error loading active offers:', error);
            this.activeOffers = [];
            this.updateOffersTab();
        }
    }

    showOffersLoading() {
        const loadingEl = document.getElementById('offers-loading');
        const noOffersEl = document.getElementById('no-offers');
        const gridEl = document.getElementById('active-offers-grid');
        
        if (loadingEl) loadingEl.style.display = 'block';
        if (noOffersEl) noOffersEl.style.display = 'none';
        if (gridEl) {
            // Clear existing offers
            const existingOffers = gridEl.querySelectorAll('.tab-offer-card');
            existingOffers.forEach(card => card.remove());
        }
    }

    updateOffersTab() {
        const gridEl = document.getElementById('active-offers-grid');
        const loadingEl = document.getElementById('offers-loading');
        const noOffersEl = document.getElementById('no-offers');
        const offersCountBadge = document.getElementById('offers-count');
        
        if (!gridEl) return;

        // Hide loading
        if (loadingEl) loadingEl.style.display = 'none';
        
        // Update offers count badge
        if (offersCountBadge) {
            if (this.activeOffers.length > 0) {
                offersCountBadge.textContent = this.activeOffers.length;
                offersCountBadge.style.display = 'flex';
            } else {
                offersCountBadge.style.display = 'none';
            }
        }

        if (this.activeOffers.length === 0) {
            if (noOffersEl) noOffersEl.style.display = 'block';
            return;
        }

        if (noOffersEl) noOffersEl.style.display = 'none';

        // Clear existing offers
        const existingOffers = gridEl.querySelectorAll('.tab-offer-card');
        existingOffers.forEach(card => card.remove());

        // Add new offers
        this.activeOffers.forEach(offer => {
            const offerCard = this.createTabOfferCard(offer);
            gridEl.appendChild(offerCard);
        });

        // Update claimed offers
        this.updateClaimedOffersList();
    }

    createTabOfferCard(offer) {
        const offerId = offer._id || offer.id;
        const isAlreadyClaimed = this.userOffers.some(userOffer => 
            (userOffer._id === offerId || userOffer.id === offerId)
        );
        const maxUses = offer.maxUses || 100; // Default if not set
        const usageCount = offer.usageCount || 0;
        const canClaim = usageCount < maxUses && !isAlreadyClaimed;

        const card = document.createElement('div');
        card.className = 'tab-offer-card';
        card.dataset.offerId = offerId;

        // Determine discount display based on offer type
        let discountDisplay = 'Special Offer';
        if (offer.type === 'percentage') {
            discountDisplay = `${offer.value}% OFF`;
        } else if (offer.type === 'fixed') {
            discountDisplay = `₹${offer.value} OFF`;
        } else if (offer.type === 'free_trial') {
            discountDisplay = 'FREE TRIAL';
        }

        // Use template style if available, otherwise default
        const templateStyle = offer.templateId || 'default';
        const backgroundImage = offer.backgroundImage || '';

        card.innerHTML = `
            <div class="tab-offer-header ${templateStyle}" style="background-image: url('${backgroundImage}')">
                <h4 class="tab-offer-title">${offer.title}</h4>
            </div>
            <div class="tab-offer-body">
                <p class="tab-offer-description">${offer.description}</p>
                <div class="tab-offer-meta">
                    <span class="tab-offer-discount">${discountDisplay}</span>
                    <span class="tab-offer-validity">Until: ${new Date(offer.endDate).toLocaleDateString()}</span>
                </div>
                <div class="tab-offer-progress">
                    <div class="tab-progress-bar">
                        <div class="tab-progress-fill" style="width: ${(usageCount / maxUses) * 100}%"></div>
                    </div>
                    <span class="tab-progress-text">${usageCount}/${maxUses} claimed</span>
                </div>
                <div class="tab-offer-action">
                    ${canClaim ? 
                        `<button class="tab-claim-btn claim-offer-btn" data-offer-id="${offerId}">
                            <i class="fas fa-gift"></i> Claim Offer
                        </button>` :
                        `<button class="tab-claimed-btn" disabled>
                            <i class="fas fa-check"></i> ${isAlreadyClaimed ? 'Already Claimed' : 'Limit Reached'}
                        </button>`
                    }
                </div>
            </div>
        `;

        return card;
    }

    updateClaimedOffersList() {
        const claimedListEl = document.getElementById('claimed-offers-list');
        if (!claimedListEl) return;

        const gymCoupons = this.userCoupons.filter(coupon => 
            coupon.status === 'active' && 
            new Date(coupon.validUntil) > new Date() &&
            coupon.gymId === this.currentGymId
        );

        // Clear existing content
        claimedListEl.innerHTML = '';

        if (gymCoupons.length === 0) {
            claimedListEl.innerHTML = `
                <div class="no-claimed-offers">
                    <i class="fas fa-inbox"></i>
                    <p>You haven't claimed any offers yet.</p>
                    <p>Browse available offers above to start saving!</p>
                </div>
            `;
            return;
        }

        gymCoupons.forEach(coupon => {
            const claimedItem = document.createElement('div');
            claimedItem.className = 'claimed-offer-item';
            claimedItem.innerHTML = `
                <div class="claimed-offer-header">
                    <h4 class="claimed-offer-title">
                        ${coupon.discountType === 'percentage' ? coupon.discountValue + '% OFF' : 'FREE SERVICE'}
                    </h4>
                    <span class="claimed-offer-status">Active</span>
                </div>
                <div class="claimed-offer-coupon">${coupon.code}</div>
                <div class="claimed-offer-details">
                    <span>Valid until: ${new Date(coupon.validUntil).toLocaleDateString()}</span>
                    <button class="apply-coupon-btn" data-coupon-code="${coupon.code}" style="background: #28a745; color: white; border: none; padding: 5px 10px; border-radius: 5px; font-size: 0.8rem;">
                        Apply Now
                    </button>
                </div>
            `;
            claimedListEl.appendChild(claimedItem);
        });
    }

    showOffersPopup() {
        if (this.activeOffers.length === 0) return;

        // Check if user has already seen offers for this gym today
        const lastShown = localStorage.getItem(`offersShown_${this.currentGymId}`);
        const today = new Date().toDateString();
        
        if (lastShown === today) {
            console.log('Offers already shown today for this gym');
            return;
        }

        // Create and show offers popup
        this.createOffersPopup();
        
        // Mark as shown today
        localStorage.setItem(`offersShown_${this.currentGymId}`, today);
    }

    createOffersPopup() {
        // Remove existing popup if any
        const existingPopup = document.getElementById('gym-offers-popup');
        if (existingPopup) {
            existingPopup.remove();
        }

        const popup = document.createElement('div');
        popup.id = 'gym-offers-popup';
        popup.className = 'gym-offers-popup';
        popup.innerHTML = `
            <div class="offers-popup-overlay" onclick="this.parentElement.remove()"></div>
            <div class="offers-popup-content">
                <div class="offers-popup-header">
                    <h3>🎉 Exclusive Offers Available!</h3>
                    <button class="close-popup-btn" onclick="this.closest('.gym-offers-popup').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="offers-carousel">
                    ${this.renderOfferCards()}
                </div>
                <div class="offers-popup-footer">
                    <button class="view-all-offers-btn" onclick="gymOffersManager.showAllOffersModal()">
                        View All Offers
                    </button>
                    <button class="maybe-later-btn" onclick="this.closest('.gym-offers-popup').remove()">
                        Maybe Later
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(popup);

        // Animate in
        setTimeout(() => {
            popup.classList.add('show');
        }, 100);
    }

    renderOfferCards() {
        return this.activeOffers.slice(0, 3).map(offer => {
            const isAlreadyClaimed = this.userOffers.some(userOffer => userOffer.id === offer.id);
            const canClaim = offer.claimedCount < offer.claimLimit && !isAlreadyClaimed;

            return `
                <div class="offer-card ${offer.templateStyle}" data-offer-id="${offer.id}">
                    <div class="offer-background" style="background-image: url('${offer.backgroundImage}')"></div>
                    <div class="offer-content">
                        <h4>${offer.title}</h4>
                        <p>${offer.description}</p>
                        <div class="offer-details">
                            <span class="discount-badge">
                                ${offer.discountType === 'percentage' ? offer.discountValue + '% OFF' : 'FREE SERVICE'}
                            </span>
                            <span class="validity">Valid until: ${new Date(offer.validUntil).toLocaleDateString()}</span>
                        </div>
                        <div class="offer-actions">
                            ${canClaim ? 
                                `<button class="claim-offer-btn" data-offer-id="${offer.id}">
                                    <i class="fas fa-gift"></i> Claim Offer
                                </button>` :
                                `<button class="already-claimed-btn" disabled>
                                    <i class="fas fa-check"></i> ${isAlreadyClaimed ? 'Already Claimed' : 'Limit Reached'}
                                </button>`
                            }
                        </div>
                        <div class="claim-progress">
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${(offer.claimedCount / offer.claimLimit) * 100}%"></div>
                            </div>
                            <span class="claim-count">${offer.claimedCount}/${offer.claimLimit} claimed</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    async handleOfferClaim(offerId) {
        const offer = this.activeOffers.find(o => o._id === offerId || o.id === offerId);
        if (!offer) {
            console.error('Offer not found:', offerId);
            return;
        }

        try {
            // Get user token (if user is logged in)
            const userToken = localStorage.getItem('token');
            const userId = localStorage.getItem('userId');

            if (!userToken || !userId) {
                alert('Please login to claim offers');
                return;
            }

            // Claim via backend
            const response = await fetch(`${this.baseUrl}/offers/${offerId}/claim`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${userToken}`
                },
                body: JSON.stringify({
                    userId: userId,
                    gymId: this.currentGymId
                })
            });

            if (response.ok) {
                const result = await response.json();
                this.processClaim(offer, result.couponCode);
            } else {
                const error = await response.json();
                console.error('Failed to claim offer:', error);
                alert(error.message || 'Failed to claim offer. Please try again.');
            }
        } catch (error) {
            console.error('Error claiming offer:', error);
            alert('Failed to claim offer. Please check your connection and try again.');
        }
    }

    processClaim(offer, couponCode = null) {
        // Generate coupon code if not provided
        if (!couponCode) {
            couponCode = this.generateCouponCode(offer);
        }

        // Add to user offers
        const claimedOffer = {
            ...offer,
            claimedAt: new Date().toISOString(),
            couponCode: couponCode,
            status: 'active'
        };

        this.userOffers.push(claimedOffer);
        localStorage.setItem('userOffers', JSON.stringify(this.userOffers));

        // Add to user coupons
        const coupon = {
            code: couponCode,
            discountType: offer.discountType,
            discountValue: offer.discountValue,
            validUntil: offer.validUntil,
            gymId: offer.gymId,
            offerId: offer.id,
            status: 'active'
        };

        this.userCoupons.push(coupon);
        localStorage.setItem('userCoupons', JSON.stringify(this.userCoupons));

        // Update UI
        this.showClaimSuccessMessage(offer, couponCode);
        this.updateOfferCard(offer.id);
    }

    generateCouponCode(offer) {
        const prefix = offer.discountType === 'percentage' ? 'PCT' : 'FREE';
        const random = Math.random().toString(36).substr(2, 6).toUpperCase();
        return `${prefix}${random}`;
    }

    showClaimSuccessMessage(offer, couponCode) {
        const message = document.createElement('div');
        message.className = 'claim-success-message';
        message.innerHTML = `
            <div class="success-content">
                <i class="fas fa-check-circle"></i>
                <h4>Offer Claimed Successfully!</h4>
                <p>Your coupon code: <strong>${couponCode}</strong></p>
                <p>Use this code during membership purchase to get your discount.</p>
                <button onclick="this.parentElement.parentElement.remove()">Got it!</button>
            </div>
        `;

        document.body.appendChild(message);

        setTimeout(() => {
            message.classList.add('show');
        }, 100);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (message.parentElement) {
                message.remove();
            }
        }, 5000);
    }

    updateOfferCard(offerId) {
        // Update popup offer card
        const offerCard = document.querySelector(`[data-offer-id="${offerId}"]`);
        if (offerCard) {
            const claimBtn = offerCard.querySelector('.claim-offer-btn');
            if (claimBtn) {
                claimBtn.outerHTML = `
                    <button class="already-claimed-btn" disabled>
                        <i class="fas fa-check"></i> Claimed!
                    </button>
                `;
            }
        }

        // Update tab offer card
        const tabOfferCard = document.querySelector(`.tab-offer-card[data-offer-id="${offerId}"]`);
        if (tabOfferCard) {
            const tabClaimBtn = tabOfferCard.querySelector('.tab-claim-btn');
            if (tabClaimBtn) {
                tabClaimBtn.outerHTML = `
                    <button class="tab-claimed-btn" disabled>
                        <i class="fas fa-check"></i> Claimed!
                    </button>
                `;
            }
        }

        // Update claimed offers list
        this.updateClaimedOffersList();
        
        // Update offers count badge
        const offersCountBadge = document.getElementById('offers-count');
        if (offersCountBadge && this.activeOffers.length > 0) {
            offersCountBadge.textContent = this.activeOffers.length;
            offersCountBadge.style.display = 'flex';
        }
    }

    showAllOffersModal() {
        // Close popup first
        const popup = document.getElementById('gym-offers-popup');
        if (popup) popup.remove();

        // Create full offers modal
        const modal = document.createElement('div');
        modal.id = 'all-offers-modal';
        modal.className = 'support-modal active';
        modal.innerHTML = `
            <div class="support-modal-content">
                <div class="support-modal-header">
                    <h2>All Available Offers</h2>
                    <button class="close-modal-btn" onclick="this.closest('.support-modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="offers-grid">
                    ${this.renderAllOffers()}
                </div>
                <div class="my-coupons-section">
                    <h3>My Claimed Coupons</h3>
                    <div class="coupons-list">
                        ${this.renderMyCoupons()}
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    renderAllOffers() {
        return this.activeOffers.map(offer => {
            const isAlreadyClaimed = this.userOffers.some(userOffer => userOffer.id === offer.id);
            const canClaim = offer.claimedCount < offer.claimLimit && !isAlreadyClaimed;

            return `
                <div class="full-offer-card ${offer.templateStyle}" data-offer-id="${offer.id}">
                    <div class="offer-image" style="background-image: url('${offer.backgroundImage}')"></div>
                    <div class="offer-info">
                        <h4>${offer.title}</h4>
                        <p>${offer.description}</p>
                        <div class="offer-meta">
                            <span class="discount">
                                ${offer.discountType === 'percentage' ? offer.discountValue + '% OFF' : 'FREE SERVICE'}
                            </span>
                            <span class="validity">Until: ${new Date(offer.validUntil).toLocaleDateString()}</span>
                        </div>
                        <div class="claim-info">
                            <span>${offer.claimedCount}/${offer.claimLimit} claimed</span>
                            ${canClaim ? 
                                `<button class="claim-offer-btn" data-offer-id="${offer.id}">Claim</button>` :
                                `<button class="claimed-btn" disabled>
                                    ${isAlreadyClaimed ? 'Claimed' : 'Full'}
                                </button>`
                            }
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    renderMyCoupons() {
        const activeCoupons = this.userCoupons.filter(coupon => 
            coupon.status === 'active' && 
            new Date(coupon.validUntil) > new Date() &&
            coupon.gymId === this.currentGymId
        );

        if (activeCoupons.length === 0) {
            return '<p class="no-coupons">No active coupons for this gym.</p>';
        }

        return activeCoupons.map(coupon => `
            <div class="coupon-item">
                <div class="coupon-code">${coupon.code}</div>
                <div class="coupon-details">
                    <span class="discount">
                        ${coupon.discountType === 'percentage' ? coupon.discountValue + '% OFF' : 'FREE SERVICE'}
                    </span>
                    <span class="validity">Valid until: ${new Date(coupon.validUntil).toLocaleDateString()}</span>
                </div>
                <button class="apply-coupon-btn" data-coupon-code="${coupon.code}">
                    Apply to Purchase
                </button>
            </div>
        `).join('');
    }

    handleCouponApplication(couponCode) {
        // Store selected coupon for purchase
        localStorage.setItem('selectedCoupon', couponCode);
        
        // Close modal and redirect to membership plans
        const modal = document.getElementById('all-offers-modal');
        if (modal) modal.remove();

        // Show success message
        this.showCouponSelectedMessage(couponCode);

        // Optionally redirect to membership plans
        setTimeout(() => {
            if (confirm('Redirect to membership plans to complete your purchase?')) {
                window.location.href = 'membership-plans.html';
            }
        }, 2000);
    }

    showCouponSelectedMessage(couponCode) {
        const message = document.createElement('div');
        message.className = 'coupon-selected-message';
        message.innerHTML = `
            <div class="message-content">
                <i class="fas fa-ticket-alt"></i>
                <h4>Coupon Selected!</h4>
                <p>Coupon <strong>${couponCode}</strong> is ready to be applied to your purchase.</p>
            </div>
        `;

        document.body.appendChild(message);

        setTimeout(() => {
            message.classList.add('show');
        }, 100);

        setTimeout(() => {
            if (message.parentElement) {
                message.remove();
            }
        }, 3000);
    }

    checkForAutoShowOffers() {
        // Check if we should auto-show offers when page loads
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('showOffers') === 'true') {
            setTimeout(() => {
                this.loadActiveOffers();
            }, 1000);
        }
    }

    // Method to manually trigger offers display
    showOffers() {
        if (this.currentGymId) {
            this.loadActiveOffers();
        } else {
            console.log('No gym selected');
        }
    }

    // Get available coupons for membership purchase
    getAvailableCoupons() {
        return this.userCoupons.filter(coupon => 
            coupon.status === 'active' && 
            new Date(coupon.validUntil) > new Date() &&
            coupon.gymId === this.currentGymId
        );
    }

    // Apply coupon during purchase
    applyCoupon(couponCode, membershipPrice) {
        const coupon = this.userCoupons.find(c => c.code === couponCode && c.status === 'active');
        
        if (!coupon) {
            return { success: false, message: 'Invalid coupon code' };
        }

        if (new Date(coupon.validUntil) <= new Date()) {
            return { success: false, message: 'Coupon has expired' };
        }

        let discountAmount = 0;
        if (coupon.discountType === 'percentage') {
            discountAmount = (membershipPrice * coupon.discountValue) / 100;
        } else if (coupon.discountType === 'fixed') {
            discountAmount = coupon.discountValue;
        }

        const finalPrice = Math.max(0, membershipPrice - discountAmount);

        return {
            success: true,
            originalPrice: membershipPrice,
            discountAmount: discountAmount,
            finalPrice: finalPrice,
            couponCode: couponCode
        };
    }

    // Mark coupon as used
    useCoupon(couponCode) {
        const couponIndex = this.userCoupons.findIndex(c => c.code === couponCode);
        if (couponIndex !== -1) {
            this.userCoupons[couponIndex].status = 'used';
            this.userCoupons[couponIndex].usedAt = new Date().toISOString();
            localStorage.setItem('userCoupons', JSON.stringify(this.userCoupons));
        }
    }
}

// Initialize the offers manager
let gymOffersManager;

document.addEventListener('DOMContentLoaded', () => {
    gymOffersManager = new GymOffersManager();
});

// Test function for debugging
window.testGymOffers = function() {
    if (gymOffersManager) {
        console.log('🧪 Testing gym offers...');
        console.log('🏢 Current gym ID:', gymOffersManager.currentGymId);
        console.log('📋 Active offers:', gymOffersManager.activeOffers.length);
        
        // Force load offers
        gymOffersManager.loadActiveOffers();
        
        return {
            gymId: gymOffersManager.currentGymId,
            activeOffers: gymOffersManager.activeOffers.length
        };
    } else {
        console.error('❌ Gym offers manager not initialized');
        return null;
    }
};

// Export for external use
window.gymOffersManager = gymOffersManager;