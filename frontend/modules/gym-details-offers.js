/**
 * Gym Details Offers Integration
 * Displays active offers and coupons on the gym details page
 */

// Base URL configuration
const BASE_URL = window.location.origin;

class GymDetailsOffers {
  constructor(gymId) {
    this.gymId = gymId;
    this.offers = [];
    this.coupons = [];
    this.init();
  }

  async init() {
    console.log('🎯 Initializing Gym Details Offers...');
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.loadOffers());
    } else {
      this.loadOffers();
    }
  }

  async loadOffers() {
    try {
      console.log('🔄 Loading active offers for gym:', this.gymId);
      
      // First try to load from backend
      const response = await fetch(`${BASE_URL}/api/admin/offers/gym/${this.gymId}/active`);
      if (response.ok) {
        this.offers = await response.json();
        console.log('✅ Loaded offers from backend:', this.offers.length);
      } else {
        console.log('ℹ️ No backend offers found, checking local campaigns...');
        // Fallback to local campaigns for immediate testing
        this.offers = this.getLocalActiveCampaigns();
      }
      
      if (this.offers && this.offers.length > 0) {
        this.displayOffers();
        // Show offer popup for new users
        this.showWelcomeOffer();
      }
    } catch (error) {
      console.error('Error loading offers:', error);
      // Fallback to local campaigns
      this.offers = this.getLocalActiveCampaigns();
      if (this.offers && this.offers.length > 0) {
        this.displayOffers();
        this.showWelcomeOffer();
      }
    }
  }

  getLocalActiveCampaigns() {
    const campaigns = JSON.parse(localStorage.getItem('activeCampaigns') || '[]');
    return campaigns.filter(campaign => 
      campaign.status === 'active' && 
      campaign.displaySettings?.showOnGymProfile !== false
    );
  }

  showWelcomeOffer() {
    // Check if user is new or returning
    const isNewUser = !localStorage.getItem('hasVisitedGym_' + this.gymId);
    
    if (isNewUser) {
      localStorage.setItem('hasVisitedGym_' + this.gymId, 'true');
      setTimeout(() => {
        this.showOfferPopup(this.offers[0]); // Show first/best offer
      }, 1500); // Show after 1.5 seconds
    }
  }

  displayOffers() {
    if (!this.offers || this.offers.length === 0) {
      return; // No offers to display
    }

    // Create offers section in the gym details page
    this.createOffersSection();
    this.renderOffers();
  }

  createOffersSection() {
    // Find the best place to insert offers (after hero section, before tabs)
    const heroSection = document.querySelector('.gym-hero');
    const tabsSection = document.querySelector('.gym-nav-tabs');
    
    if (!heroSection || !tabsSection) {
      console.warn('Could not find proper location to insert offers section');
      return;
    }

    // Create offers section HTML
    const offersSection = document.createElement('section');
    offersSection.className = 'gym-offers-section';
    offersSection.innerHTML = `
      <div class="offers-container">
        <div class="offers-header">
          <h2><i class="fas fa-fire"></i> Special Offers</h2>
          <p>Limited time deals just for you!</p>
        </div>
        <div class="offers-grid" id="offersGrid">
          <!-- Offers will be rendered here -->
        </div>
      </div>
    `;

    // Insert before tabs section
    heroSection.parentNode.insertBefore(offersSection, tabsSection);

    // Add CSS styles
    this.addOfferStyles();
  }

  renderOffers() {
    const offersGrid = document.getElementById('offersGrid');
    if (!offersGrid) return;

    offersGrid.innerHTML = '';

    // Filter and sort offers (show only 3-4 most relevant)
    const displayOffers = this.offers
      .filter(offer => offer.displayOnWebsite !== false)
      .sort((a, b) => {
        // Prioritize highlighted offers
        if (a.highlightOffer && !b.highlightOffer) return -1;
        if (!a.highlightOffer && b.highlightOffer) return 1;
        // Then by creation date (newest first)
        return new Date(b.createdAt) - new Date(a.createdAt);
      })
      .slice(0, 4); // Show max 4 offers

    displayOffers.forEach(offer => {
      const offerCard = this.createOfferCard(offer);
      offersGrid.appendChild(offerCard);
    });
  }

  createOfferCard(offer) {
    const card = document.createElement('div');
    card.className = `offer-card ${offer.templateId || 'default'}`;
    
    const discountText = offer.type === 'percentage' 
      ? `${offer.value}% OFF` 
      : `₹${offer.value} OFF`;

    const timeRemaining = this.getTimeRemaining(offer.endDate);
    const isUrgent = timeRemaining.days <= 7;

    card.innerHTML = `
      <div class="offer-header">
        ${offer.highlightOffer ? '<div class="offer-badge">HOT DEAL</div>' : ''}
        <div class="offer-discount">
          <span class="discount-value">${discountText}</span>
          <span class="discount-label">Discount</span>
        </div>
      </div>
      
      <div class="offer-content">
        <h3 class="offer-title">${offer.title}</h3>
        <p class="offer-description">${offer.description}</p>
        
        ${offer.features && offer.features.length > 0 ? `
          <div class="offer-features">
            <ul>
              ${offer.features.slice(0, 3).map(feature => `<li>${feature}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
        
        <div class="offer-validity">
          <i class="fas fa-clock"></i>
          <span class="validity-text ${isUrgent ? 'urgent' : ''}">
            ${timeRemaining.text}
          </span>
        </div>
      </div>
      
      <div class="offer-actions">
        ${offer.couponCode ? `
          <div class="coupon-code-section">
            <span class="coupon-label">Coupon Code:</span>
            <div class="coupon-code-container">
              <code class="coupon-code" id="coupon-${offer._id}">${offer.couponCode}</code>
              <button class="copy-coupon-btn" onclick="gymDetailsOffers.copyCouponCode('${offer.couponCode}', 'coupon-${offer._id}')">
                <i class="fas fa-copy"></i>
              </button>
            </div>
          </div>
        ` : ''}
        
        <button class="claim-offer-btn" onclick="gymDetailsOffers.claimOffer('${offer._id}')">
          <i class="fas fa-gift"></i> Claim Offer
        </button>
      </div>
    `;

    return card;
  }

  getTimeRemaining(endDate) {
    const now = new Date();
    const end = new Date(endDate);
    const timeDiff = end - now;

    if (timeDiff <= 0) {
      return { days: 0, text: 'Offer Expired', expired: true };
    }

    const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) {
      return { 
        days, 
        text: `${days} day${days > 1 ? 's' : ''} remaining`,
        expired: false 
      };
    } else if (hours > 0) {
      return { 
        days: 0, 
        text: `${hours} hour${hours > 1 ? 's' : ''} remaining`,
        expired: false 
      };
    } else {
      return { 
        days: 0, 
        text: 'Ending soon!',
        expired: false 
      };
    }
  }

  async copyCouponCode(code, elementId) {
    try {
      await navigator.clipboard.writeText(code);
      
      // Visual feedback
      const element = document.getElementById(elementId);
      const button = element.parentElement.querySelector('.copy-coupon-btn');
      
      if (button) {
        const originalHTML = button.innerHTML;
        button.innerHTML = '<i class="fas fa-check"></i>';
        button.style.background = '#4caf50';
        
        setTimeout(() => {
          button.innerHTML = originalHTML;
          button.style.background = '';
        }, 2000);
      }

      this.showNotification(`Coupon code "${code}" copied to clipboard!`, 'success');
    } catch (error) {
      console.error('Failed to copy coupon code:', error);
      this.showNotification('Failed to copy coupon code', 'error');
    }
  }

  async claimOffer(offerId) {
    const offer = this.offers.find(o => o._id === offerId || o.id === offerId);
    if (!offer) {
      this.showNotification('Offer not found', 'error');
      return;
    }

    try {
      // Generate or get user ID
      let userId = localStorage.getItem('userId');
      if (!userId) {
        userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('userId', userId);
      }

      // Show loading state
      const claimButton = document.querySelector('.claim-btn');
      if (claimButton) {
        claimButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Claiming...';
        claimButton.disabled = true;
      }

      // Call backend to claim offer and generate unique coupon
      const response = await fetch(`${BASE_URL}/api/admin/offers/${offerId}/claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: userId,
          gymId: this.gymId
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Store claimed offer locally for immediate UI update
        const claimedOffer = {
          id: result.claimId,
          offerId: offerId,
          userId: userId,
          gymId: this.gymId,
          couponCode: result.couponCode,
          claimedAt: new Date().toISOString(),
          status: 'active',
          coupon: result.coupon
        };

        // Save to user's claimed offers
        const userOffers = JSON.parse(localStorage.getItem('userClaimedOffers') || '[]');
        userOffers.push(claimedOffer);
        localStorage.setItem('userClaimedOffers', JSON.stringify(userOffers));

        // Close popup and show success
        this.closeOfferPopup();
        this.showOfferClaimedSuccess(result.couponCode);

        this.showNotification(`🎉 Offer claimed! Your coupon code: ${result.couponCode}`, 'success');
        
      } else {
        throw new Error(result.message || 'Failed to claim offer');
      }

    } catch (error) {
      console.error('Error claiming offer:', error);
      this.showNotification(error.message || 'Failed to claim offer. Please try again.', 'error');
    } finally {
      // Reset button state
      const claimButton = document.querySelector('.claim-btn');
      if (claimButton) {
        claimButton.innerHTML = '<i class="fas fa-gift"></i> Claim Offer';
        claimButton.disabled = false;
      }
    }
  }

  closeOfferPopup() {
    const popup = document.querySelector('.gym-offer-popup');
    if (popup) {
      popup.remove();
    }
  }

  showOfferClaimedSuccess(couponCode) {
    const successHTML = `
      <div id="offerClaimedSuccess" class="offer-claimed-success">
        <div class="success-overlay" onclick="document.getElementById('offerClaimedSuccess').remove()"></div>
        <div class="success-content">
          <div class="success-icon">
            <i class="fas fa-check-circle"></i>
          </div>
          <h3>🎉 Offer Claimed Successfully!</h3>
          <p>Your exclusive coupon has been generated.</p>
          
          <div class="coupon-code-display">
            <label>Your Coupon Code:</label>
            <div class="coupon-code-container">
              <span class="coupon-code" id="claimedCouponCode">${couponCode}</span>
              <button class="copy-coupon-btn" onclick="gymDetailsOffers.copyCouponCode('${couponCode}', 'claimedCouponCode')">
                <i class="fas fa-copy"></i> Copy
              </button>
            </div>
          </div>
          
          <p class="usage-info">
            <i class="fas fa-info-circle"></i> 
            Use this code when making a payment or show it at the gym counter.
          </p>
          
          <button class="success-btn" onclick="document.getElementById('offerClaimedSuccess').remove()">
            <i class="fas fa-thumbs-up"></i> Got it!
          </button>
        </div>
      </div>`;
    
    document.body.insertAdjacentHTML('beforeend', successHTML);
    
    // Auto-remove after 30 seconds
    setTimeout(() => {
      const successEl = document.getElementById('offerClaimedSuccess');
      if (successEl) successEl.remove();
    }, 30000);
  }

  showOfferClaimModal(offer, discountDetails = null) {
    // Create modal for offer claiming
    const modal = document.createElement('div');
    modal.className = 'offer-claim-modal';
    modal.innerHTML = `
      <div class="modal-backdrop"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h3><i class="fas fa-gift"></i> Claim Your Offer</h3>
          <button class="modal-close" onclick="this.closest('.offer-claim-modal').remove()">&times;</button>
        </div>
        <div class="modal-body">
          <div class="offer-summary">
            <h4>${offer.title}</h4>
            <p>${offer.description}</p>
            
            ${discountDetails ? `
              <div class="discount-preview">
                <div class="discount-item">
                  <span>Discount:</span>
                  <span class="discount-value">${offer.type === 'percentage' ? offer.value + '%' : '₹' + offer.value}</span>
                </div>
                ${offer.minAmount > 0 ? `
                  <div class="discount-item">
                    <span>Minimum Purchase:</span>
                    <span>₹${offer.minAmount}</span>
                  </div>
                ` : ''}
              </div>
            ` : ''}
          </div>
          
          <div class="claim-instructions">
            <h4>How to use this offer:</h4>
            <ol>
              <li>Visit the gym or contact them directly</li>
              <li>Show this offer or mention the coupon code: <strong>${offer.couponCode || 'N/A'}</strong></li>
              <li>Complete your membership purchase</li>
              <li>Enjoy your discount!</li>
            </ol>
          </div>
          
          <div class="gym-contact-info">
            <h4>Contact Information:</h4>
            <p><i class="fas fa-phone"></i> <span id="gymPhone">Loading...</span></p>
            <p><i class="fas fa-envelope"></i> <span id="gymEmail">Loading...</span></p>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-primary" onclick="this.closest('.offer-claim-modal').remove()">
            Got it!
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Load gym contact info
    this.loadGymContactInfo();
  }

  showOfferPopup(offer) {
    // Check if popup was already shown in this session
    if (sessionStorage.getItem('offerPopupShown_' + this.gymId)) {
      return;
    }

    // Mark as shown
    sessionStorage.setItem('offerPopupShown_' + this.gymId, 'true');

    const popup = document.createElement('div');
    popup.className = 'gym-offer-popup';
    popup.innerHTML = `
      <div class="offer-popup-overlay" onclick="this.parentElement.remove()"></div>
      <div class="offer-popup-content ${offer.offerType || 'default'}">
        <button class="offer-popup-close" onclick="this.closest('.gym-offer-popup').remove()">
          <i class="fas fa-times"></i>
        </button>
        
        <div class="offer-popup-header">
          <div class="offer-popup-badge">
            <span class="discount-value">${offer.type === 'percentage' ? offer.value + '%' : '₹' + offer.value}</span>
            <span class="discount-text">OFF</span>
          </div>
          <div class="offer-popup-icon">
            <i class="${offer.icon || 'fas fa-star'}"></i>
          </div>
        </div>
        
        <div class="offer-popup-body">
          <h2 class="offer-popup-title">${offer.title}</h2>
          <p class="offer-popup-description">${offer.description}</p>
          
          <div class="offer-popup-features">
            <h4>What's Included:</h4>
            <ul>
              ${(offer.features || []).slice(0, 4).map(feature => 
                `<li><i class="fas fa-check-circle"></i>${feature}</li>`
              ).join('')}
            </ul>
          </div>
          
          <div class="offer-popup-validity">
            <i class="fas fa-clock"></i>
            <span>Limited time offer - Claim now!</span>
          </div>
        </div>
        
        <div class="offer-popup-footer">
          <button class="offer-btn secondary" onclick="this.closest('.gym-offer-popup').remove()">
            Maybe Later
          </button>
          <button class="offer-btn primary claim-btn" onclick="gymDetailsOffers.claimOffer('${offer._id || offer.id}')">>
            <i class="fas fa-gift"></i> Claim Offer
          </button>
        </div>
        
        <div class="offer-popup-decorations">
          <div class="decoration-1"></div>
          <div class="decoration-2"></div>
          <div class="decoration-3"></div>
        </div>
      </div>
    `;

    document.body.appendChild(popup);
    
    // Animate in
    setTimeout(() => {
      popup.classList.add('show');
    }, 100);
    
    // Auto-close after 30 seconds if not interacted with
    setTimeout(() => {
      if (popup.parentElement) {
        popup.remove();
      }
    }, 30000);
  }

  async loadGymContactInfo() {
    try {
      const response = await fetch(`${BASE_URL}/api/gyms/${this.gymId}`);
      if (response.ok) {
        const gym = await response.json();
        
        const phoneElement = document.getElementById('gymPhone');
        const emailElement = document.getElementById('gymEmail');
        
        if (phoneElement) phoneElement.textContent = gym.phone || 'Not available';
        if (emailElement) emailElement.textContent = gym.email || 'Not available';
      }
    } catch (error) {
      console.error('Error loading gym contact info:', error);
    }
  }

  addOfferStyles() {
    if (document.getElementById('gym-offers-styles')) return; // Already added

    const styles = document.createElement('style');
    styles.id = 'gym-offers-styles';
    styles.textContent = `
      .gym-offers-section {
        background: linear-gradient(135deg, var(--secondary-color), var(--primary-color));
        border-radius: 20px;
        padding: 3rem 2rem;
        margin: 2rem 0;
        position: relative;
        overflow: hidden;
        color: white;
      }

      .gym-offers-section::before {
        content: '';
        position: absolute;
        top: 0;
        right: 0;
        width: 100%;
        height: 100%;
        background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="offers-pattern" patternUnits="userSpaceOnUse" width="10" height="10"><circle cx="5" cy="5" r="1" fill="rgba(255,255,255,0.1)"/></pattern></defs><rect width="100" height="100" fill="url(%23offers-pattern)"/></svg>');
        opacity: 0.3;
        animation: float 20s infinite ease-in-out;
      }

      @keyframes float {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-20px); }
      }

      .offers-container {
        position: relative;
        z-index: 2;
      }

      .offers-header {
        text-align: center;
        margin-bottom: 2.5rem;
        color: white;
      }

      .offers-header h2 {
        font-size: 2.5rem;
        font-weight: 700;
        margin-bottom: 0.5rem;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
      }

      .offers-header h2 i {
        color: var(--accent-color);
        text-shadow: 0 0 20px rgba(233, 196, 106, 0.5);
      }

      .offers-header p {
        font-size: 1.2rem;
        opacity: 0.9;
        margin: 0;
      }

      .offers-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 1.5rem;
      }

      .offer-card {
        background: white;
        border-radius: 20px;
        padding: 0;
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
        overflow: hidden;
        transition: all 0.3s ease;
        position: relative;
        border: 1px solid rgba(233, 196, 106, 0.2);
      }

      .offer-card:hover {
        transform: translateY(-8px);
        box-shadow: 0 15px 40px rgba(0, 0, 0, 0.2);
        border-color: var(--accent-color);
      }

      .offer-header {
        background: linear-gradient(135deg, var(--secondary-color), var(--primary-color));
        padding: 1.5rem;
        color: white;
        position: relative;
      }

      .offer-card.winter .offer-header {
        background: linear-gradient(135deg, #74b9ff, #0984e3);
      }

      .offer-card.christmas .offer-header {
        background: linear-gradient(135deg, #ff6b6b, #4ecdc4);
      }

      .offer-card.newyear .offer-header {
        background: linear-gradient(135deg, var(--accent-color), #ffd166);
      }

      .offer-card.joining .offer-header {
        background: linear-gradient(135deg, #55efc4, var(--primary-color));
      }

      .offer-badge {
        position: absolute;
        top: -8px;
        right: 20px;
        background: var(--accent-color);
        color: var(--secondary-color);
        padding: 6px 12px;
        border-radius: 12px;
        font-size: 0.8rem;
        font-weight: 700;
        animation: pulse 2s infinite;
        box-shadow: 0 4px 15px rgba(233, 196, 106, 0.4);
      }

      @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
      }

      .offer-discount {
        text-align: center;
      }

      .discount-value {
        display: block;
        font-size: 2.2rem;
        font-weight: 700;
        line-height: 1;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      }

      .discount-label {
        font-size: 0.9rem;
        opacity: 0.9;
        margin-top: 0.3rem;
      }

      .offer-content {
        padding: 1.5rem;
        color: var(--secondary-color);
      }

      .offer-title {
        font-size: 1.4rem;
        font-weight: 600;
        margin-bottom: 0.8rem;
        color: var(--secondary-color);
      }

      .offer-description {
        color: #666;
        line-height: 1.6;
        margin-bottom: 1rem;
        font-size: 0.95rem;
      }

      .offer-features ul {
        list-style: none;
        padding: 0;
        margin: 0 0 1rem 0;
      }

      .offer-features li {
        padding: 0.3rem 0;
        color: #555;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.9rem;
      }

      .offer-features li::before {
        content: "✓";
        color: var(--primary-color);
        font-weight: bold;
        font-size: 1rem;
      }

      .offer-validity {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 1.2rem;
        padding: 0.8rem;
        background: #f8f9fa;
        border-radius: 12px;
        border-left: 4px solid var(--primary-color);
      }

      .offer-validity i {
        color: var(--primary-color);
      }

      .validity-text {
        font-weight: 500;
        font-size: 0.9rem;
      }

      .validity-text.urgent {
        color: #e74c3c;
        font-weight: 600;
      }

      .offer-actions {
        padding: 0 1.5rem 1.5rem;
      }

      .coupon-code-section {
        margin-bottom: 1rem;
        padding: 1rem;
        background: #f8f9fa;
        border-radius: 12px;
        border: 1px solid #e9ecef;
      }

      .coupon-label {
        font-size: 0.85rem;
        color: var(--secondary-color);
        display: block;
        margin-bottom: 0.5rem;
        font-weight: 500;
      }

      .coupon-code-container {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .coupon-code {
        background: white;
        border: 2px dashed var(--primary-color);
        padding: 0.7rem 1rem;
        border-radius: 8px;
        font-family: 'Courier New', monospace;
        font-weight: 600;
        color: var(--primary-color);
        flex: 1;
        font-size: 0.9rem;
        letter-spacing: 1px;
      }

      .copy-coupon-btn {
        background: var(--primary-color);
        border: none;
        color: white;
        padding: 0.7rem 1rem;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.3s ease;
        font-size: 0.9rem;
      }

      .copy-coupon-btn:hover {
        background: var(--secondary-color);
        transform: translateY(-2px);
      }

      .claim-offer-btn {
        width: 100%;
        background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
        border: none;
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 12px;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        position: relative;
        overflow: hidden;
      }

      .claim-offer-btn::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
        transition: left 0.5s;
      }

      .claim-offer-btn:hover::before {
        left: 100%;
      }

      .claim-offer-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(42, 157, 143, 0.3);
      }

      /* Modal Styles */
      .offer-claim-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 100000;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .offer-claim-modal .modal-backdrop {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(38, 70, 83, 0.8);
        backdrop-filter: blur(4px);
      }

      .offer-claim-modal .modal-content {
        background: white;
        border-radius: 20px;
        max-width: 500px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
        position: relative;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        border: 2px solid var(--accent-color);
      }

      .offer-claim-modal .modal-header {
        padding: 1.5rem 1.5rem 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid #e9ecef;
        margin-bottom: 1rem;
      }

      .offer-claim-modal .modal-header h3 {
        color: var(--secondary-color);
        margin: 0;
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .offer-claim-modal .modal-header h3 i {
        color: var(--accent-color);
      }

      .offer-claim-modal .modal-close {
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #666;
        width: 30px;
        height: 30px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
      }

      .offer-claim-modal .modal-close:hover {
        background: #f8f9fa;
        color: var(--secondary-color);
      }

      .offer-claim-modal .modal-body {
        padding: 0 1.5rem 1.5rem;
      }

      .offer-claim-modal .modal-footer {
        padding: 0 1.5rem 1.5rem;
        text-align: center;
      }

      .offer-summary h4 {
        color: var(--secondary-color);
        margin-bottom: 0.5rem;
        font-size: 1.3rem;
      }

      .offer-summary p {
        color: #666;
        line-height: 1.6;
        margin-bottom: 1rem;
      }

      .discount-preview {
        background: linear-gradient(135deg, #f8f9fa, #e9ecef);
        padding: 1rem;
        border-radius: 12px;
        margin: 1rem 0;
        border-left: 4px solid var(--accent-color);
      }

      .discount-item {
        display: flex;
        justify-content: space-between;
        margin-bottom: 0.5rem;
        font-size: 0.95rem;
      }

      .discount-item:last-child {
        margin-bottom: 0;
        font-weight: 600;
        color: var(--secondary-color);
      }

      .discount-item .discount-value {
        color: var(--primary-color);
        font-weight: 600;
      }

      .claim-instructions h4 {
        color: var(--secondary-color);
        margin-bottom: 1rem;
        font-size: 1.1rem;
      }

      .claim-instructions ol {
        padding-left: 1.2rem;
        color: #555;
      }

      .claim-instructions li {
        margin-bottom: 0.5rem;
        line-height: 1.6;
        font-size: 0.95rem;
      }

      .claim-instructions strong {
        color: var(--primary-color);
        font-weight: 600;
      }

      .gym-contact-info h4 {
        color: var(--secondary-color);
        margin-bottom: 0.8rem;
        font-size: 1.1rem;
      }

      .gym-contact-info p {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 0.5rem;
        color: #555;
        font-size: 0.95rem;
      }

      .gym-contact-info i {
        color: var(--primary-color);
        width: 16px;
      }

      .btn-primary {
        background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
        border: none;
        color: white;
        padding: 0.8rem 2rem;
        border-radius: 12px;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        min-width: 120px;
      }

      .btn-primary:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(42, 157, 143, 0.3);
      }

      /* Responsive Design */
      @media (max-width: 768px) {
        .gym-offers-section {
          padding: 2rem 1rem;
          margin: 1.5rem 0;
          border-radius: 15px;
        }

        .offers-header h2 {
          font-size: 2rem;
        }

        .offers-grid {
          grid-template-columns: 1fr;
          gap: 1rem;
        }

        .discount-value {
          font-size: 1.8rem;
        }

        .offer-card {
          border-radius: 15px;
        }

        .offer-header {
          padding: 1.2rem;
        }

        .offer-content {
          padding: 1.2rem;
        }

        .offer-actions {
          padding: 0 1.2rem 1.2rem;
        }

        .offer-claim-modal .modal-content {
          width: 95%;
          border-radius: 15px;
        }
      }

      @media (max-width: 480px) {
        .offers-header h2 {
          font-size: 1.7rem;
          flex-direction: column;
          gap: 0.3rem;
        }

        .discount-value {
          font-size: 1.6rem;
        }

        .coupon-code-container {
          flex-direction: column;
          gap: 0.5rem;
        }

        .copy-coupon-btn {
          width: 100%;
        }
      }

      /* Offer Popup Styles */
      .gym-offer-popup {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 100000;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.3s ease;
      }

      .gym-offer-popup.show {
        opacity: 1;
      }

      .offer-popup-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(4px);
      }

      .offer-popup-content {
        position: relative;
        background: white;
        border-radius: 24px;
        max-width: 500px;
        width: 90%;
        max-height: 90vh;
        overflow-y: auto;
        transform: scale(0.8);
        transition: transform 0.3s ease;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      }

      .gym-offer-popup.show .offer-popup-content {
        transform: scale(1);
      }

      .offer-popup-close {
        position: absolute;
        top: 15px;
        right: 15px;
        background: rgba(0, 0, 0, 0.1);
        border: none;
        border-radius: 50%;
        width: 35px;
        height: 35px;
        cursor: pointer;
        font-size: 16px;
        z-index: 10;
        transition: background 0.3s ease;
      }

      .offer-popup-close:hover {
        background: rgba(0, 0, 0, 0.2);
      }

      .offer-popup-header {
        background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
        color: white;
        padding: 30px 25px;
        border-radius: 24px 24px 0 0;
        text-align: center;
        position: relative;
        overflow: hidden;
      }

      .offer-popup-badge {
        background: var(--accent-color);
        color: var(--secondary-color);
        border-radius: 50px;
        padding: 8px 20px;
        display: inline-block;
        margin-bottom: 15px;
        font-weight: bold;
        box-shadow: 0 4px 15px rgba(233, 196, 106, 0.4);
      }

      .discount-value {
        font-size: 24px;
        font-weight: 800;
      }

      .discount-text {
        font-size: 14px;
        margin-left: 5px;
      }

      .offer-popup-icon {
        font-size: 40px;
        margin: 10px 0;
        opacity: 0.9;
      }

      .offer-popup-body {
        padding: 25px;
      }

      .offer-popup-title {
        font-size: 24px;
        font-weight: 700;
        color: var(--secondary-color);
        margin: 0 0 10px 0;
        text-align: center;
      }

      .offer-popup-description {
        color: #666;
        text-align: center;
        margin-bottom: 20px;
        line-height: 1.5;
      }

      .offer-popup-features {
        background: #f8f9fa;
        border-radius: 12px;
        padding: 20px;
        margin-bottom: 20px;
      }

      .offer-popup-features h4 {
        margin: 0 0 12px 0;
        color: var(--secondary-color);
        font-size: 16px;
      }

      .offer-popup-features ul {
        list-style: none;
        padding: 0;
        margin: 0;
      }

      .offer-popup-features li {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 0;
        color: #333;
      }

      .offer-popup-features li i {
        color: var(--primary-color);
        font-size: 14px;
      }

      .offer-popup-validity {
        text-align: center;
        color: #e74c3c;
        font-weight: 600;
        background: #fff5f5;
        padding: 12px;
        border-radius: 8px;
        border-left: 4px solid #e74c3c;
      }

      .offer-popup-validity i {
        margin-right: 8px;
      }

      .offer-popup-footer {
        padding: 20px 25px 25px;
        display: flex;
        gap: 12px;
        justify-content: center;
      }

      .offer-btn {
        padding: 12px 24px;
        border: none;
        border-radius: 25px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        gap: 8px;
        text-decoration: none;
        font-size: 14px;
      }

      .offer-btn.secondary {
        background: #f1f3f4;
        color: #5f6368;
      }

      .offer-btn.secondary:hover {
        background: #e8eaed;
      }

      .offer-btn.primary {
        background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
        color: white;
        box-shadow: 0 4px 15px rgba(42, 157, 143, 0.3);
      }

      .offer-btn.primary:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(42, 157, 143, 0.4);
      }

      .offer-popup-decorations {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        overflow: hidden;
        border-radius: 24px 24px 0 0;
      }

      .decoration-1, .decoration-2, .decoration-3 {
        position: absolute;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 50%;
      }

      .decoration-1 {
        width: 80px;
        height: 80px;
        top: -40px;
        right: -20px;
        animation: float 6s ease-in-out infinite;
      }

      .decoration-2 {
        width: 60px;
        height: 60px;
        bottom: -30px;
        left: -15px;
        animation: float 8s ease-in-out infinite reverse;
      }

      .decoration-3 {
        width: 40px;
        height: 40px;
        top: 50%;
        left: -10px;
        animation: float 7s ease-in-out infinite;
      }

      @keyframes float {
        0%, 100% { transform: translateY(0px) rotate(0deg); }
        50% { transform: translateY(-20px) rotate(180deg); }
      }

      @media (max-width: 768px) {
        .offer-popup-content {
          margin: 20px;
          width: calc(100% - 40px);
          border-radius: 20px;
        }

        .offer-popup-header {
          padding: 25px 20px;
          border-radius: 20px 20px 0 0;
        }

        .offer-popup-title {
          font-size: 20px;
        }

        .offer-popup-body {
          padding: 20px;
        }

        .offer-popup-footer {
          flex-direction: column;
          padding: 15px 20px 20px;
        }

        .offer-btn {
          justify-content: center;
          width: 100%;
        }
      }
    `;

    document.head.appendChild(styles);
  }

  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `gym-offers-notification ${type}`;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 16px 24px;
      background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196f3'};
      color: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 100001;
      transform: translateX(100%);
      transition: transform 0.3s ease;
      max-width: 400px;
    `;
    
    notification.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-triangle' : 'info-circle'}"></i>
        <span>${message}</span>
        <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; color: white; margin-left: auto; cursor: pointer; font-size: 18px;">&times;</button>
      </div>
    `;

    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 100);

    // Auto remove after 5 seconds
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (notification.parentElement) {
          notification.parentElement.removeChild(notification);
        }
      }, 300);
    }, 5000);
  }
}

// Initialize when DOM is loaded
let gymDetailsOffers;

document.addEventListener('DOMContentLoaded', () => {
  // Extract gym ID from URL or page data
  const urlParams = new URLSearchParams(window.location.search);
  const gymId = urlParams.get('id') || urlParams.get('gymId');
  
  if (gymId) {
    gymDetailsOffers = new GymDetailsOffers(gymId);
    window.gymDetailsOffers = gymDetailsOffers; // Make globally available
  }
});

// Export for use in other modules
window.GymDetailsOffers = GymDetailsOffers;