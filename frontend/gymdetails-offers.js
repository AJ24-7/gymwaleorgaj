/**
 * Gym Details Offers Module
 * Handles offer display, claiming, and coupon functionality on gym details page
 */

class GymOffersManager {
    constructor() {
        this.currentGymId = null;
        this.activeOffers = [];
        // Only load user data if user is logged in
        this.userCoupons = [];
        this.userOffers = [];
        this.isUserLoggedIn = false;
        this.baseUrl = 'http://localhost:5000/api'; // Backend API base URL
        this.init();
    }

    init() {
        this.checkUserLogin();
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

    checkUserLogin() {
        // Check if user is logged in
        const token = localStorage.getItem('token') || localStorage.getItem('userToken');
        this.isUserLoggedIn = !!token;
        
        // Only load user data if logged in
        if (this.isUserLoggedIn) {
            this.userCoupons = JSON.parse(localStorage.getItem('userCoupons') || '[]');
            this.userOffers = JSON.parse(localStorage.getItem('userOffers') || '[]');
            console.log('✅ User is logged in, loaded coupons and offers:', {
                coupons: this.userCoupons.length,
                offers: this.userOffers.length
            });
        } else {
            this.userCoupons = [];
            this.userOffers = [];
            console.log('⚠️ User is not logged in, all offers will show as claimable');
        }
    }

    setupEventListeners() {
        // Listen for gym data loaded event
        document.addEventListener('gymDataLoaded', (event) => {
            this.currentGymId = event.detail.gymId;
            this.loadActiveOffers();
        });

        // Setup offers button in hero section to trigger popup
        const offersBtn = document.getElementById('offers-btn');
        if (offersBtn) {
            offersBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (this.activeOffers.length > 0) {
                    this.createOffersPopup();
                } else {
                    this.showError('No active offers available at the moment.');
                }
            });
        }

        // Setup claim buttons - support both old and new class names
        document.addEventListener('click', (e) => {
            // Handle claim buttons
            if (e.target.classList.contains('claim-offer-btn') || 
                e.target.classList.contains('offer-claim-btn') ||
                e.target.closest('.claim-offer-btn') || 
                e.target.closest('.offer-claim-btn')) {
                
                const button = e.target.closest('.claim-offer-btn') || e.target.closest('.offer-claim-btn') || e.target;
                const offerId = button.dataset.offerId || button.closest('[data-offer-id]')?.dataset.offerId;
                
                if (offerId) {
                    this.handleOfferClaim(offerId);
                }
            }
            
            // Handle coupon application
            if (e.target.classList.contains('apply-coupon-btn')) {
                this.handleCouponApplication(e.target.dataset.couponCode);
            }
        });
    }

    async loadActiveOffers() {
        if (!this.currentGymId) {
            console.warn('⚠️ No gym ID available yet');
            return;
        }

        try {
            console.log('🔍 Loading active offers for gym:', this.currentGymId);
            
            // Show loading state
            this.showOffersLoading();

            let offersFromLocalStorage = [];
            let offersFromBackend = [];

            // PRIMARY SOURCE: Check localStorage for launched offers (from admin dashboard)
            try {
                // DEBUG: Show all gymOffers keys in localStorage
                console.log('🔍 DEBUG: Checking all localStorage keys...');
                const allKeys = Object.keys(localStorage);
                const gymOffersKeys = allKeys.filter(k => k.startsWith('gymOffers_'));
                console.log('📦 Found gymOffers keys:', gymOffersKeys);
                if (gymOffersKeys.length > 0) {
                    gymOffersKeys.forEach(key => {
                        const offers = JSON.parse(localStorage.getItem(key) || '[]');
                        console.log(`   ${key}: ${offers.length} offers`);
                    });
                }
                
                // Also check other gym ID keys
                console.log('🆔 Gym ID values in localStorage:');
                console.log('   gymId:', localStorage.getItem('gymId'));
                console.log('   adminGymId:', localStorage.getItem('adminGymId'));
                console.log('   currentGymId (this manager):', this.currentGymId);
                
                const gymOffersKey = `gymOffers_${this.currentGymId}`;
                const storedOffers = localStorage.getItem(gymOffersKey);
                console.log(`📦 Checking localStorage key: ${gymOffersKey}`);
                
                if (storedOffers) {
                    const parsedOffers = JSON.parse(storedOffers);
                    console.log(`📋 Found ${parsedOffers.length} total offers in localStorage`);
                    
                    // CRITICAL: Filter to only show LAUNCHED offers for THIS gym
                    offersFromLocalStorage = parsedOffers.filter(offer => {
                        // Check if offer is launched (not a template or draft)
                        const isLaunched = offer.status === 'active' || offer.status === 'launched';
                        const isActive = offer.isActive !== false;
                        
                        // FIXED: Accept offers that either:
                        // 1. Have backendId (newly launched offers), OR
                        // 2. Have id/_id AND are not templates (legacy offers)
                        const hasIdentifier = offer.backendId || offer._id || offer.id;
                        const isNotTemplate = offer.isTemplate !== true; // Templates have isTemplate: true
                        
                        // Verify it belongs to this gym
                        const belongsToGym = offer.gymId === this.currentGymId || 
                                            offer.gym === this.currentGymId;
                        
                        // Check expiry
                        const validUntil = offer.validUntil || offer.endDate || offer.expiresAt;
                        const isNotExpired = validUntil && new Date(validUntil) > new Date();
                        
                        const isValid = isLaunched && isActive && hasIdentifier && isNotTemplate && belongsToGym && isNotExpired;
                        
                        if (!isValid) {
                            console.log(`❌ Filtered out: "${offer.title}" - launched:${isLaunched}, active:${isActive}, hasIdentifier:${hasIdentifier}, notTemplate:${isNotTemplate}, belongsToGym:${belongsToGym}, notExpired:${isNotExpired}`);
                        } else {
                            console.log(`✅ Accepted: "${offer.title}" (backendId: ${offer.backendId}, id: ${offer._id || offer.id})`);
                        }
                        
                        return isValid;
                    });
                    
                    console.log(`✅ ${offersFromLocalStorage.length} valid launched offers from localStorage`);
                    if (offersFromLocalStorage.length > 0) {
                        console.log('📋 Valid offers:', offersFromLocalStorage.map(o => `"${o.title}" (${o.discountType}: ${o.discountValue})`).join(', '));
                    }
                } else {
                    console.log(`📭 No offers found in localStorage for key: ${gymOffersKey}`);
                    
                    // Check if offers exist for OTHER gym IDs
                    if (gymOffersKeys.length > 0) {
                        console.log('⚠️ FOUND OFFERS FOR OTHER GYMS!');
                        console.log('   Current gym ID:', this.currentGymId);
                        console.log('   Gym IDs with offers:', gymOffersKeys.map(k => k.replace('gymOffers_', '')));
                        console.log('');
                        console.log('❌ GYM ID MISMATCH DETECTED!');
                        console.log('   The offers were launched for a different gym ID.');
                        console.log('   Make sure the gym ID in the URL matches the admin gym ID.');
                    } else {
                        console.log('💡 To add offers: Go to Gym Admin Dashboard → Offers → Launch a template');
                    }
                }
            } catch (localError) {
                console.error('❌ Error loading from localStorage:', localError);
            }

            // SECONDARY SOURCE: Try backend (optional, as admin uses localStorage)
            try {
                console.log('🌐 Attempting backend fetch...');
                const response = await fetch(`${this.baseUrl}/offers/gym/${this.currentGymId}/active`);
                
                if (response.ok) {
                    const backendData = await response.json();
                    offersFromBackend = Array.isArray(backendData) ? backendData : (backendData.offers || []);
                    console.log(`📡 ${offersFromBackend.length} offers from backend`);
                } else {
                    console.log(`⚠️ Backend returned ${response.status} - using localStorage only`);
                }
            } catch (backendError) {
                console.log('⚠️ Backend not available - using localStorage only:', backendError.message);
            }

            // Combine offers: localStorage is primary
            const combinedOffers = [...offersFromLocalStorage];
            
            // Add backend offers that aren't already in localStorage
            offersFromBackend.forEach(backendOffer => {
                const existsInLocal = offersFromLocalStorage.some(localOffer => 
                    localOffer._id === backendOffer._id || 
                    localOffer.id === backendOffer.id ||
                    localOffer.backendId === backendOffer._id
                );
                if (!existsInLocal) {
                    console.log('➕ Adding backend offer:', backendOffer.title);
                    combinedOffers.push(backendOffer);
                }
            });

            // Final validation
            this.activeOffers = combinedOffers.filter(offer => {
                const validUntil = offer.validUntil || offer.endDate || offer.expiresAt;
                const isNotExpired = validUntil && new Date(validUntil) > new Date();
                const belongsToGym = offer.gymId === this.currentGymId || offer.gym === this.currentGymId;
                
                return offer.title && isNotExpired && belongsToGym;
            });
            
            console.log(`🎯 FINAL: ${this.activeOffers.length} valid active offers loaded`);
            
            if (this.activeOffers.length === 0) {
                console.log('💡 NO OFFERS FOUND. To add offers:');
                console.log('   1. Go to Gym Admin Dashboard');
                console.log('   2. Click Offers & Coupons');
                console.log('   3. Go to Templates tab');
                console.log('   4. Click "Launch Offer" on any template');
            }

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
        
        // Only check if already claimed if user is logged in
        const isAlreadyClaimed = this.isUserLoggedIn && this.userOffers.some(userOffer => 
            (userOffer._id === offerId || userOffer.id === offerId)
        );
        
        // Handle multiple field names for compatibility
        const maxUses = offer.maxUses || offer.claimLimit || 100;
        const usageCount = offer.usageCount || offer.claimedCount || 0;
        const canClaim = usageCount < maxUses && !isAlreadyClaimed;

        const card = document.createElement('div');
        
        // Determine discount display and type
        let discountDisplay = 'Special Offer';
        let discountBadge = '';
        const offerType = offer.type || offer.discountType || 'default';
        const offerValue = offer.value || offer.discountValue || 0;
        
        if (offerType === 'percentage') {
            discountDisplay = `${offerValue}% OFF`;
            discountBadge = `${offerValue}%`;
        } else if (offerType === 'fixed') {
            discountDisplay = `₹${offerValue} OFF`;
            discountBadge = `₹${offerValue}`;
        } else if (offerType === 'free_trial') {
            discountDisplay = 'FREE TRIAL';
            discountBadge = 'FREE';
        }

        // Use template style if available
        const templateType = offer.templateId || offer.templateStyle || 'default';
        const templateIcon = offer.icon || 'fas fa-gift';
        const duration = offer.duration || 'Limited Time';
        
        // Get gym details for branding
        const gymName = localStorage.getItem('gymName') || offer.gymName || 'Gym';
        const gymLogo = localStorage.getItem('gymLogo') || 'public/Gym-Wale.png';
        
        // Build features list
        const features = offer.features || ['Special discount', 'Limited time offer', 'For all members'];
        const featuresHTML = features.slice(0, 3).map(f => `<li><i class="fas fa-check"></i>${f}</li>`).join('');

        card.className = `enhanced-offer-card ${templateType}`;
        card.dataset.offerId = offerId;

        card.innerHTML = `
            <div class="offer-background-animation">
                <div class="animated-particles"></div>
                <div class="gradient-overlay"></div>
            </div>
            
            <div class="offer-gym-branding">
                <img src="${gymLogo}" alt="${gymName}" class="gym-logo" onerror="this.src='public/Gym-Wale.png'">
                <span class="gym-name">${gymName}</span>
            </div>
            
            <div class="offer-header">
                <div class="offer-icon-container">
                    <div class="offer-icon"><i class="${templateIcon}"></i></div>
                    <div class="offer-badge">${discountBadge} OFF</div>
                </div>
                <h3 class="offer-title">${offer.title}</h3>
                <p class="offer-description">${offer.description}</p>
                <div class="offer-duration">
                    <i class="fas fa-clock"></i> ${duration}
                </div>
            </div>
            
            <div class="offer-features">
                <div class="features-title">What's Included:</div>
                <ul>${featuresHTML}</ul>
            </div>
            
            <div class="offer-meta">
                <div class="offer-discount-display">
                    <i class="fas fa-tag"></i>
                    <span class="discount-text">${discountDisplay}</span>
                </div>
                <div class="offer-validity-display">
                    <i class="fas fa-calendar-alt"></i>
                    <span class="validity-text">Until ${new Date(offer.endDate || offer.validUntil).toLocaleDateString()}</span>
                </div>
            </div>
            
            <div class="offer-actions">
                ${canClaim ? 
                    `<button class="offer-claim-btn glow claim-offer-btn" data-offer-id="${offerId}">
                        <i class="fas fa-gift"></i> Claim Offer
                    </button>` :
                    `<button class="offer-claimed-btn" disabled>
                        <i class="fas fa-check"></i> ${isAlreadyClaimed ? 'Already Claimed' : 'Limit Reached'}
                    </button>`
                }
            </div>
            
            <div class="offer-corner-decoration"></div>
        `;

        return card;
    }

    updateClaimedOffersList() {
        const claimedListEl = document.getElementById('claimed-offers-list');
        if (!claimedListEl) return;

        const now = new Date();
        
        // Get all coupons for this gym
        const allGymCoupons = this.userCoupons.filter(coupon => 
            coupon.gymId === this.currentGymId
        );
        
        // Separate active and expired coupons
        const activeCoupons = allGymCoupons.filter(coupon => 
            coupon.status === 'active' && 
            new Date(coupon.validUntil) > now &&
            !coupon.used
        );
        
        const usedCoupons = allGymCoupons.filter(coupon => coupon.used);
        const expiredCoupons = allGymCoupons.filter(coupon => 
            new Date(coupon.validUntil) <= now && !coupon.used
        );

        // Clear existing content
        claimedListEl.innerHTML = '';

        if (allGymCoupons.length === 0) {
            claimedListEl.innerHTML = `
                <div class="no-claimed-offers">
                    <i class="fas fa-ticket-alt"></i>
                    <h4>No Coupons Yet</h4>
                    <p>Claim an offer above to get your exclusive coupon code!</p>
                </div>
            `;
            return;
        }

        // Active Coupons Section
        if (activeCoupons.length > 0) {
            const activeSection = document.createElement('div');
            activeSection.className = 'coupons-section active-section';
            activeSection.innerHTML = `
                <h4 class="section-title">
                    <i class="fas fa-ticket-alt"></i>
                    Active Coupons (${activeCoupons.length})
                </h4>
                <div class="coupons-grid" id="active-coupons-grid"></div>
            `;
            claimedListEl.appendChild(activeSection);
            
            const activeGrid = activeSection.querySelector('#active-coupons-grid');
            activeCoupons.forEach(coupon => {
                activeGrid.appendChild(this.createCouponCard(coupon, 'active'));
            });
        }
        
        // Used Coupons Section
        if (usedCoupons.length > 0) {
            const usedSection = document.createElement('div');
            usedSection.className = 'coupons-section used-section';
            usedSection.innerHTML = `
                <h4 class="section-title">
                    <i class="fas fa-check-circle"></i>
                    Used Coupons (${usedCoupons.length})
                </h4>
                <div class="coupons-grid" id="used-coupons-grid"></div>
            `;
            claimedListEl.appendChild(usedSection);
            
            const usedGrid = usedSection.querySelector('#used-coupons-grid');
            usedCoupons.forEach(coupon => {
                usedGrid.appendChild(this.createCouponCard(coupon, 'used'));
            });
        }
        
        // Expired Coupons Section
        if (expiredCoupons.length > 0) {
            const expiredSection = document.createElement('div');
            expiredSection.className = 'coupons-section expired-section';
            expiredSection.innerHTML = `
                <h4 class="section-title">
                    <i class="fas fa-clock"></i>
                    Expired Coupons (${expiredCoupons.length})
                </h4>
                <div class="coupons-grid" id="expired-coupons-grid"></div>
            `;
            claimedListEl.appendChild(expiredSection);
            
            const expiredGrid = expiredSection.querySelector('#expired-coupons-grid');
            expiredCoupons.forEach(coupon => {
                expiredGrid.appendChild(this.createCouponCard(coupon, 'expired'));
            });
        }
    }
    
    createCouponCard(coupon, status) {
        const couponCard = document.createElement('div');
        couponCard.className = `coupon-card ${status}`;
        
        const now = new Date();
        const validUntil = new Date(coupon.validUntil);
        const daysLeft = Math.ceil((validUntil - now) / (1000 * 60 * 60 * 24));
        const isExpiringSoon = daysLeft <= 7 && daysLeft > 0;
        
        let discountText = '';
        if (coupon.discountType === 'percentage') {
            discountText = `${coupon.discountValue}% OFF`;
        } else if (coupon.discountType === 'fixed') {
            discountText = `₹${coupon.discountValue} OFF`;
        } else {
            discountText = 'Special Discount';
        }
        
        let statusBadgeHTML = '';
        if (status === 'active') {
            statusBadgeHTML = isExpiringSoon 
                ? `<span class="coupon-status expiring"><i class="fas fa-exclamation-triangle"></i> Expiring Soon</span>`
                : `<span class="coupon-status active"><i class="fas fa-check-circle"></i> Active</span>`;
        } else if (status === 'used') {
            statusBadgeHTML = `<span class="coupon-status used"><i class="fas fa-check-double"></i> Used</span>`;
        } else {
            statusBadgeHTML = `<span class="coupon-status expired"><i class="fas fa-times-circle"></i> Expired</span>`;
        }
        
        couponCard.innerHTML = `
            <div class="coupon-card-header">
                <h5 class="coupon-title">${coupon.offerTitle}</h5>
                ${statusBadgeHTML}
            </div>
            
            <div class="coupon-code-box">
                <label>Coupon Code</label>
                <div class="code-display">
                    <span class="code">${coupon.code}</span>
                    ${status === 'active' ? `
                        <button class="copy-btn" onclick="navigator.clipboard.writeText('${coupon.code}'); this.innerHTML='<i class=\\'fas fa-check\\'></i>'; setTimeout(() => this.innerHTML='<i class=\\'fas fa-copy\\'></i>', 2000);">
                            <i class="fas fa-copy"></i>
                        </button>
                    ` : ''}
                </div>
            </div>
            
            <div class="coupon-details-grid">
                <div class="detail-item">
                    <i class="fas fa-tag"></i>
                    <div>
                        <span class="detail-label">Discount</span>
                        <span class="detail-value">${discountText}</span>
                    </div>
                </div>
                <div class="detail-item">
                    <i class="fas fa-calendar-alt"></i>
                    <div>
                        <span class="detail-label">${status === 'expired' ? 'Expired On' : status === 'used' ? 'Used On' : 'Valid Until'}</span>
                        <span class="detail-value">${status === 'used' && coupon.usedAt ? new Date(coupon.usedAt).toLocaleDateString('en-IN') : validUntil.toLocaleDateString('en-IN')}</span>
                    </div>
                </div>
                <div class="detail-item">
                    <i class="fas fa-dumbbell"></i>
                    <div>
                        <span class="detail-label">Gym</span>
                        <span class="detail-value">${coupon.gymName || 'Gym'}</span>
                    </div>
                </div>
                ${status === 'active' && isExpiringSoon ? `
                <div class="detail-item warning">
                    <i class="fas fa-hourglass-half"></i>
                    <div>
                        <span class="detail-label">Days Left</span>
                        <span class="detail-value expiring">${daysLeft} day${daysLeft !== 1 ? 's' : ''}</span>
                    </div>
                </div>
                ` : ''}
            </div>
            
            ${status === 'active' ? `
                <div class="coupon-actions">
                    <button class="apply-coupon-btn" onclick="gymOffersManager.applyCouponToMembership('${coupon.code}')">
                        <i class="fas fa-check"></i> Use This Coupon
                    </button>
                </div>
            ` : ''}
        `;
        
        return couponCard;
    }
    
    applyCouponToMembership(couponCode) {
        // Store the selected coupon code for membership purchase
        localStorage.setItem('selectedCouponCode', couponCode);
        
        // Show confirmation message
        const message = document.createElement('div');
        message.className = 'coupon-selected-toast show';
        message.innerHTML = `
            <div class="toast-content">
                <i class="fas fa-check-circle"></i>
                <div>
                    <h5>Coupon Selected!</h5>
                    <p>Code <strong>${couponCode}</strong> will be applied at checkout</p>
                </div>
            </div>
        `;
        document.body.appendChild(message);
        
        setTimeout(() => {
            message.remove();
        }, 3000);
        
        // Scroll to membership plans section if available
        const membershipSection = document.getElementById('membership-plans');
        if (membershipSection) {
            membershipSection.scrollIntoView({ behavior: 'smooth' });
        }
    }

    showOffersPopup() {
        // Don't show popup if no offers are available
        if (!this.activeOffers || this.activeOffers.length === 0) {
            console.log('⚠️ No active offers available, skipping popup display');
            return;
        }

        console.log('🎁 Showing offers popup with', this.activeOffers.length, 'offers');
        
        // Create and show offers popup
        this.createOffersPopup();
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
            <div class="offers-popup-overlay"></div>
            <div class="offers-popup-content">
                <div class="offers-popup-header">
                    <div class="popup-header-icon">
                        <i class="fas fa-gift"></i>
                    </div>
                    <h3>Exclusive Offers Available!</h3>
                    <button class="close-popup-btn" aria-label="Close">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="offers-carousel-container">
                    <div class="offers-carousel">
                        ${this.renderOfferCards()}
                    </div>
                </div>
                <div class="offers-popup-footer">
                    <button class="view-all-offers-btn">
                        <i class="fas fa-th-large"></i>
                        <span>View All Offers</span>
                    </button>
                    <button class="btn-secondary">
                        <i class="fas fa-clock"></i>
                        <span>Maybe Later</span>
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(popup);

        // Setup event listeners
        const overlay = popup.querySelector('.offers-popup-overlay');
        const closeBtn = popup.querySelector('.close-popup-btn');
        const viewAllBtn = popup.querySelector('.view-all-offers-btn');
        const laterBtn = popup.querySelector('.btn-secondary');

        if (overlay) overlay.addEventListener('click', () => this.closeOffersPopup());
        if (closeBtn) closeBtn.addEventListener('click', () => this.closeOffersPopup());
        if (viewAllBtn) viewAllBtn.addEventListener('click', () => {
            this.closeOffersPopup();
            this.showAllOffersModal();
        });
        if (laterBtn) laterBtn.addEventListener('click', () => this.closeOffersPopup());

        // Animate in
        setTimeout(() => {
            popup.classList.add('show');
        }, 100);
    }

    closeOffersPopup() {
        const popup = document.getElementById('gym-offers-popup');
        if (popup) {
            popup.classList.remove('show');
            setTimeout(() => popup.remove(), 300);
        }
    }

    renderOfferCards() {
        if (!this.activeOffers || this.activeOffers.length === 0) {
            return `
                <div class="offers-carousel-empty">
                    <i class="fas fa-gift"></i>
                    <h4>No Active Offers</h4>
                    <p>Check back soon for exciting deals and discounts!</p>
                </div>
            `;
        }

        return this.activeOffers.slice(0, 6).map(offer => {
            const offerId = offer._id || offer.id;
            
            // Only check if already claimed if user is logged in
            const isAlreadyClaimed = this.isUserLoggedIn && this.userOffers.some(userOffer => 
                (userOffer._id === offerId || userOffer.id === offerId)
            );
            
            const maxUses = offer.maxUses || offer.claimLimit || 100;
            const usageCount = offer.usageCount || offer.claimedCount || 0;
            const canClaim = usageCount < maxUses && !isAlreadyClaimed;
            
            const offerType = offer.type || offer.discountType;
            const offerValue = offer.value || offer.discountValue || 20;
            const validDate = offer.validUntil || offer.endDate || offer.expiresAt;
            
            // Discount display for badge
            let discountBadge = '';
            let discountDisplay = 'Special Offer';
            if (offerType === 'percentage') {
                discountBadge = `${offerValue}%`;
                discountDisplay = `${offerValue}% OFF`;
            } else if (offerType === 'fixed') {
                discountBadge = `₹${offerValue}`;
                discountDisplay = `₹${offerValue} OFF`;
            } else if (offerType === 'free_trial') {
                discountBadge = 'FREE';
                discountDisplay = 'FREE TRIAL';
            }

            // Template styling
            const templateType = offer.templateId || offer.templateStyle || 'default';
            const templateIcon = offer.icon || 'fas fa-gift';
            const duration = offer.duration || 'Limited Time';
            
            // Get gym details for branding
            const gymName = localStorage.getItem('gymName') || offer.gymName || 'Gym';
            const gymLogo = localStorage.getItem('gymLogo') || 'public/Gym-Wale.png';
            
            // Build features list
            const features = offer.features || ['Special discount', 'Limited time offer', 'For all members'];
            const featuresHTML = features.slice(0, 3).map(f => `<li><i class="fas fa-check"></i>${f}</li>`).join('');

            return `
                <div class="offer-card enhanced-popup-offer ${templateType}" data-offer-id="${offerId}">
                    <div class="offer-background-animation">
                        <div class="animated-particles"></div>
                        <div class="gradient-overlay"></div>
                    </div>
                    
                    <div class="offer-gym-branding">
                        <img src="${gymLogo}" alt="${gymName}" class="gym-logo" onerror="this.src='public/Gym-Wale.png'">
                        <span class="gym-name">${gymName}</span>
                    </div>
                    
                    <div class="offer-header">
                        <div class="offer-icon-container">
                            <div class="offer-icon"><i class="${templateIcon}"></i></div>
                            <div class="offer-badge">${discountBadge} OFF</div>
                        </div>
                        <h3 class="offer-title">${offer.title}</h3>
                        <p class="offer-description">${offer.description}</p>
                        <div class="offer-duration">
                            <i class="fas fa-clock"></i> ${duration}
                        </div>
                    </div>
                    
                    <div class="offer-features">
                        <div class="features-title">What's Included:</div>
                        <ul>${featuresHTML}</ul>
                    </div>
                    
                    <div class="offer-metadata">
                        <div class="offer-discount">
                            <i class="fas fa-tag"></i>
                            <span>${discountDisplay}</span>
                        </div>
                        <div class="offer-validity">
                            <i class="fas fa-calendar-alt"></i>
                            <span>Until ${new Date(validDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        </div>
                    </div>
                    
                    <div class="offer-action">
                        ${canClaim ? 
                            `<button class="offer-claim-btn glow claim-offer-btn" data-offer-id="${offerId}">
                                <i class="fas fa-gift"></i> Claim Offer
                            </button>` :
                            `<button class="offer-claimed-btn" disabled>
                                <i class="fas fa-check-circle"></i> ${isAlreadyClaimed ? 'Already Claimed' : 'Limit Reached'}
                            </button>`
                        }
                    </div>
                    
                    <div class="offer-corner-decoration"></div>
                </div>
            `;
        }).join('');
    }

    async handleOfferClaim(offerId) {
        const offer = this.activeOffers.find(o => o._id === offerId || o.id === offerId);
        if (!offer) {
            console.error('Offer not found:', offerId);
            this.showError('Offer not found. Please refresh and try again.');
            return;
        }

        try {
            // Check if user is logged in
            const userToken = localStorage.getItem('token') || localStorage.getItem('userToken');
            
            console.log('🔐 Auth Check:', {
                hasToken: !!userToken,
                isUserLoggedIn: this.isUserLoggedIn
            });

            // Verify user is logged in
            if (!userToken || !this.isUserLoggedIn) {
                console.warn('❌ User not authenticated, showing login prompt');
                this.showLoginPrompt();
                return;
            }

            // Check if already claimed
            const isAlreadyClaimed = this.userOffers.some(userOffer => 
                (userOffer._id === offerId || userOffer.id === offerId)
            );

            if (isAlreadyClaimed) {
                this.showError('You have already claimed this offer!');
                return;
            }

            // Show loading state on all claim buttons for this offer
            const claimBtns = document.querySelectorAll(`[data-offer-id="${offerId}"]`);
            claimBtns.forEach(btn => {
                if (btn.classList.contains('claim-offer-btn') || btn.classList.contains('offer-claim-btn')) {
                    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Claiming...</span>';
                    btn.disabled = true;
                }
            });

            // Try to claim via backend with proper error handling
            let couponCode = null;
            let backendSuccess = false;
            const userId = localStorage.getItem('userId') || localStorage.getItem('user_id');
            
            // Only attempt backend claim if we have a token
            if (userToken && userId) {
                try {
                    console.log('🌐 Attempting backend claim for offer:', offerId);
                    
                    const response = await fetch(`${this.baseUrl}/offers/${offerId}/claim`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${userToken}`
                        },
                        body: JSON.stringify({
                            userId: userId,
                            gymId: this.currentGymId,
                            offerId: offerId
                        })
                    });

                    if (response.ok) {
                        const result = await response.json();
                        couponCode = result.couponCode || result.code;
                        backendSuccess = true;
                        console.log('✅ Backend claim successful:', result);
                    } else if (response.status === 401 || response.status === 403) {
                        console.warn('⚠️ Authentication failed - will process locally');
                        // Don't show login prompt, just process locally
                    } else {
                        const errorData = await response.json().catch(() => ({}));
                        console.warn('⚠️ Backend claim failed:', response.status, errorData.message);
                    }
                } catch (backendError) {
                    console.warn('⚠️ Backend error:', backendError.message);
                }
            } else {
                console.log('ℹ️ No token available, processing claim locally');
            }

            // Process claim (backend coupon code or generate new one)
            // This works even if backend fails
            this.processClaim(offer, couponCode, backendSuccess);

        } catch (error) {
            console.error('❌ Error claiming offer:', error);
            this.showError(error.message || 'Failed to claim offer. Please try again.');
            
            // Reset all claim buttons for this offer
            const claimBtns = document.querySelectorAll(`[data-offer-id="${offerId}"]`);
            claimBtns.forEach(btn => {
                if (btn.classList.contains('claim-offer-btn') || btn.classList.contains('offer-claim-btn')) {
                    btn.innerHTML = '<i class="fas fa-gift"></i> <span>Claim Offer</span>';
                    btn.disabled = false;
                    btn.classList.remove('loading');
                }
            });
        }
    }

    showLoginPrompt() {
        // Store current page URL for redirect after login
        const currentUrl = window.location.href;
        localStorage.setItem('redirectAfterLogin', currentUrl);
        
        const loginModal = document.createElement('div');
        loginModal.className = 'modal';
        loginModal.style.display = 'flex';
        loginModal.innerHTML = `
            <div class="modal-content" style="max-width: 450px; max-height: 90vh; overflow-y: auto;">
                <div class="modal-header" style="padding: 20px; border-bottom: 1px solid #eee;">
                    <h3 style="margin: 0; display: flex; align-items: center; gap: 10px; font-size: 1.3rem;">
                        <i class="fas fa-sign-in-alt" style="color: var(--primary-color);"></i>
                        Login Required
                    </h3>
                </div>
                <div class="modal-body" style="padding: 25px;">
                    <p style="margin: 0 0 20px 0; color: #555; line-height: 1.6;">
                        Please login to your account to claim exclusive offers and unlock amazing benefits!
                    </p>
                    <div class="login-benefits" style="margin: 0 0 25px 0; background: #f8f9fa; padding: 15px; border-radius: 8px;">
                        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                            <i class="fas fa-gift" style="color: var(--primary-color); font-size: 1.1rem; width: 20px;"></i>
                            <span style="color: #333; font-size: 0.95rem;">Claim exclusive offers</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                            <i class="fas fa-ticket-alt" style="color: var(--primary-color); font-size: 1.1rem; width: 20px;"></i>
                            <span style="color: #333; font-size: 0.95rem;">Get discount coupons</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <i class="fas fa-star" style="color: var(--primary-color); font-size: 1.1rem; width: 20px;"></i>
                            <span style="color: #333; font-size: 0.95rem;">Track your benefits</span>
                        </div>
                    </div>
                    <div style="display: flex; gap: 12px; justify-content: flex-end;">
                        <button class="btn-secondary" onclick="this.closest('.modal').remove()" style="padding: 10px 20px;">
                            <i class="fas fa-times"></i> Cancel
                        </button>
                        <button class="btn-primary" onclick="window.location.href='/frontend/public/login.html'" style="padding: 10px 20px;">
                            <i class="fas fa-sign-in-alt"></i> Login
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(loginModal);
    }

    showError(message) {
        const errorModal = document.createElement('div');
        errorModal.className = 'error-notification';
        errorModal.innerHTML = `
            <div class="error-content">
                <i class="fas fa-exclamation-circle"></i>
                <span>${message}</span>
            </div>
        `;
        document.body.appendChild(errorModal);
        setTimeout(() => errorModal.classList.add('show'), 10);
        setTimeout(() => {
            errorModal.classList.remove('show');
            setTimeout(() => errorModal.remove(), 300);
        }, 3000);
    }

    processClaim(offer, couponCode = null, fromBackend = false) {
        // Generate coupon code if not provided
        if (!couponCode) {
            couponCode = this.generateCouponCode(offer);
        }

        const offerId = offer._id || offer.id;
        const offerValue = offer.value || offer.discountValue || offer.discount;
        const offerType = offer.type || offer.discountType;
        
        // Calculate validity period (use offer's endDate or default to 30 days)
        const validUntil = offer.validUntil || offer.endDate || offer.expiresAt;
        const validUntilDate = validUntil ? new Date(validUntil) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        
        // Ensure the date is in the future
        if (validUntilDate < new Date()) {
            console.warn('Offer expired, extending validity by 7 days');
            validUntilDate.setDate(validUntilDate.getDate() + 7);
        }

        // Add to user offers
        const claimedOffer = {
            ...offer,
            _id: offerId,
            id: offerId,
            claimedAt: new Date().toISOString(),
            couponCode: couponCode,
            status: 'active',
            validUntil: validUntilDate.toISOString(),
            used: false,
            usedAt: null,
            source: fromBackend ? 'backend' : 'local'
        };

        this.userOffers.push(claimedOffer);
        localStorage.setItem('userOffers', JSON.stringify(this.userOffers));

        // Add to user coupons with all necessary fields and usage tracking
        const coupon = {
            _id: `coupon_${offerId}_${Date.now()}`,
            code: couponCode,
            discountType: offerType,
            discountValue: offerValue,
            validUntil: validUntilDate.toISOString(),
            gymId: offer.gymId || offer.gym || this.currentGymId,
            gymName: localStorage.getItem('gymName') || offer.gymName || 'Gym',
            offerId: offerId,
            offerTitle: offer.title,
            status: 'active',
            createdAt: new Date().toISOString(),
            claimedAt: new Date().toISOString(),
            used: false,
            usedAt: null,
            usageCount: 0,
            maxUsage: 1, // Single use coupon
            source: fromBackend ? 'backend' : 'local'
        };

        this.userCoupons.push(coupon);
        localStorage.setItem('userCoupons', JSON.stringify(this.userCoupons));
        
        console.log(`✅ Offer claimed successfully (${fromBackend ? 'via backend' : 'locally'}):`, {
            code: couponCode,
            validUntil: validUntilDate.toISOString(),
            discountType: offerType,
            discountValue: offerValue
        });

        // Update campaign claims count in both storage locations
        if (window.OffersManager && window.OffersManager.updateCampaignClaims) {
            window.OffersManager.updateCampaignClaims(offerId);
        }

        // Update claim counter in the offer object
        const offerIndex = this.activeOffers.findIndex(o => (o._id || o.id) === offerId);
        if (offerIndex !== -1) {
            const currentCount = this.activeOffers[offerIndex].usageCount || this.activeOffers[offerIndex].claimedCount || 0;
            this.activeOffers[offerIndex].usageCount = currentCount + 1;
            this.activeOffers[offerIndex].claimedCount = currentCount + 1;
            
            // Update localStorage to persist the counter
            const storageKey = `gymOffers_${this.currentGymId}`;
            const storedOffers = JSON.parse(localStorage.getItem(storageKey) || '[]');
            const storedOfferIndex = storedOffers.findIndex(o => (o._id || o.id) === offerId);
            if (storedOfferIndex !== -1) {
                storedOffers[storedOfferIndex].usageCount = currentCount + 1;
                storedOffers[storedOfferIndex].claimedCount = currentCount + 1;
                localStorage.setItem(storageKey, JSON.stringify(storedOffers));
            }
            
            console.log(`📊 Updated claim counter for offer ${offerId}: ${currentCount} → ${currentCount + 1}`);
        }

        // Update UI
        this.showClaimSuccessMessage(offer, couponCode, validUntilDate);
        this.updateOfferCard(offerId);
        
        // Reload offers to reflect updated counts
        setTimeout(() => {
            this.loadActiveOffers();
        }, 500);
    }

    generateCouponCode(offer) {
        const prefix = offer.discountType === 'percentage' ? 'PCT' : 'FREE';
        const random = Math.random().toString(36).substr(2, 6).toUpperCase();
        return `${prefix}${random}`;
    }

    showClaimSuccessMessage(offer, couponCode, validUntilDate) {
        const offerValue = offer.value || offer.discountValue || 0;
        const offerType = offer.type || offer.discountType;
        let discountText = '';
        
        if (offerType === 'percentage') {
            discountText = `${offerValue}% discount`;
        } else if (offerType === 'fixed') {
            discountText = `₹${offerValue} discount`;
        } else {
            discountText = 'Special discount';
        }
        
        const expiryDate = validUntilDate ? new Date(validUntilDate).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        }) : 'Check details';
        
        // Create modal with consistent structure matching other modals
        const modal = document.createElement('div');
        modal.className = 'claim-success-modal';
        modal.innerHTML = `
            <div class="claim-success-overlay"></div>
            <div class="claim-success-content">
                <button class="close-success-modal" aria-label="Close">
                    <i class="fas fa-times"></i>
                </button>
                
                <div class="success-header">
                    <div class="success-icon-circle">
                        <i class="fas fa-check-circle"></i>
                    </div>
                    <h3>🎉 Offer Claimed Successfully!</h3>
                    <p class="success-subtitle">Your coupon code is ready to use</p>
                </div>
                
                <div class="coupon-details-box">
                    <div class="coupon-code-section">
                        <label class="coupon-label">Your Coupon Code</label>
                        <div class="coupon-code-display">
                            <div class="code-value">${couponCode}</div>
                            <button class="copy-code-btn" onclick="navigator.clipboard.writeText('${couponCode}'); this.innerHTML='<i class=\\'fas fa-check\\'></i> Copied!'; setTimeout(() => this.innerHTML='<i class=\\'fas fa-copy\\'></i> Copy', 2000);">
                                <i class="fas fa-copy"></i> Copy
                            </button>
                        </div>
                    </div>
                    
                    <div class="coupon-info-grid">
                        <div class="info-card">
                            <div class="info-icon">
                                <i class="fas fa-tag"></i>
                            </div>
                            <div class="info-details">
                                <span class="info-label">Discount</span>
                                <span class="info-value">${discountText}</span>
                            </div>
                        </div>
                        <div class="info-card">
                            <div class="info-icon">
                                <i class="fas fa-calendar-check"></i>
                            </div>
                            <div class="info-details">
                                <span class="info-label">Valid Until</span>
                                <span class="info-value">${expiryDate}</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="usage-tip">
                    <i class="fas fa-info-circle"></i>
                    <p>Use this code during membership purchase to get your discount. Find it anytime in "My Coupons" section.</p>
                </div>
                
                <div class="modal-actions">
                    <button class="btn-secondary close-modal-btn">
                        <i class="fas fa-times"></i> Close
                    </button>
                    <button class="btn-primary view-coupons-btn">
                        <i class="fas fa-ticket-alt"></i> View My Coupons
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Setup event listeners
        const overlay = modal.querySelector('.claim-success-overlay');
        const closeBtn = modal.querySelector('.close-success-modal');
        const closeModalBtn = modal.querySelector('.close-modal-btn');
        const viewCouponsBtn = modal.querySelector('.view-coupons-btn');
        
        const closeModal = () => {
            modal.classList.remove('show');
            setTimeout(() => modal.remove(), 300);
        };
        
        if (overlay) overlay.addEventListener('click', closeModal);
        if (closeBtn) closeBtn.addEventListener('click', closeModal);
        if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
        
        if (viewCouponsBtn) {
            viewCouponsBtn.addEventListener('click', () => {
                closeModal();
                setTimeout(() => {
                    const couponsSection = document.getElementById('claimed-offers-list');
                    if (couponsSection) {
                        couponsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }, 100);
            });
        }

        // Animate in
        setTimeout(() => {
            modal.classList.add('show');
        }, 50);

        // Auto remove after 15 seconds
        setTimeout(() => {
            if (modal.parentElement) {
                closeModal();
            }
        }, 15000);
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

        // Create full offers modal with scrollable design
        const modal = document.createElement('div');
        modal.id = 'all-offers-modal';
        modal.className = 'gym-offers-popup show';
        modal.innerHTML = `
            <div class="offers-popup-overlay"></div>
            <div class="offers-popup-content all-offers-modal-content">
                <div class="offers-popup-header">
                    <div class="popup-header-icon">
                        <i class="fas fa-tags"></i>
                    </div>
                    <h3>All Available Offers</h3>
                    <button class="close-popup-btn" aria-label="Close">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="offers-carousel-container">
                    <div class="offers-carousel all-offers-grid">
                        ${this.renderAllOffers()}
                    </div>
                    
                    ${this.renderMyCouponsSection()}
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        
        // Setup event listeners
        const overlay = modal.querySelector('.offers-popup-overlay');
        const closeBtn = modal.querySelector('.close-popup-btn');
        
        if (overlay) overlay.addEventListener('click', () => modal.remove());
        if (closeBtn) closeBtn.addEventListener('click', () => modal.remove());
        
        // Animate in
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);
    }
    
    renderMyCouponsSection() {
        const activeCoupons = this.userCoupons.filter(coupon => 
            coupon.status === 'active' && 
            new Date(coupon.validUntil) > new Date() &&
            coupon.gymId === this.currentGymId
        );
        
        if (activeCoupons.length === 0) {
            return '';
        }
        
        return `
            <div class="my-coupons-section">
                <h3><i class="fas fa-ticket-alt"></i> My Claimed Coupons</h3>
                <div class="coupons-list">
                    ${this.renderMyCoupons()}
                </div>
            </div>
        `;
    }

    renderAllOffers() {
        if (!this.activeOffers || this.activeOffers.length === 0) {
            return `
                <div class="offers-carousel-empty">
                    <i class="fas fa-gift"></i>
                    <h4>No Offers Available</h4>
                    <p>Check back later for new offers!</p>
                </div>
            `;
        }
        
        // Use same card rendering as popup for consistency
        return this.activeOffers.map(offer => {
            const offerId = offer._id || offer.id;
            
            // Only check if already claimed if user is logged in
            const isAlreadyClaimed = this.isUserLoggedIn && this.userOffers.some(userOffer => 
                (userOffer._id === offerId || userOffer.id === offerId)
            );
            
            // Handle multiple field names
            const maxUses = offer.maxUses || offer.claimLimit || offer.totalClaimLimit || 100;
            const usageCount = offer.usageCount || offer.claimedCount || offer.claimsCount || offer.usedCount || 0;
            const canClaim = usageCount < maxUses && !isAlreadyClaimed;
            
            const discountValue = offer.value || offer.discountValue || offer.discount;
            const discountType = offer.type || offer.discountType;
            const validUntil = offer.validUntil || offer.endDate || offer.expiresAt;
            const templateStyle = offer.templateStyle || offer.templateId || 'default';
            
            return `
                <div class="offer-card ${templateStyle}" data-offer-id="${offerId}">
                    <div class="offer-card-header ${templateStyle}">
                        <div class="offer-icon">
                            <i class="fas fa-tag"></i>
                        </div>
                        <h4 class="offer-card-title">${offer.title}</h4>
                        <p class="offer-card-description">${offer.description || ''}</p>
                    </div>
                    <div class="offer-card-body">
                        <div class="offer-metadata">
                            <div class="offer-discount">
                                <i class="fas fa-percent"></i>
                                <span>Get <strong>${discountValue}${discountType === 'percentage' ? '%' : '₹'} OFF</strong></span>
                            </div>
                            <div class="offer-validity">
                                <i class="fas fa-clock"></i>
                                <span>Valid until ${new Date(validUntil).toLocaleDateString('en-IN')}</span>
                            </div>
                        </div>
                        <div class="offer-action">
                            ${canClaim ? 
                                `<button class="offer-claim-btn" data-offer-id="${offerId}">
                                    <i class="fas fa-gift"></i><span>Claim Now</span>
                                </button>` :
                                `<button class="offer-claimed-btn" disabled>
                                    <i class="fas fa-check"></i><span>${isAlreadyClaimed ? 'Already Claimed' : 'Limit Reached'}</span>
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