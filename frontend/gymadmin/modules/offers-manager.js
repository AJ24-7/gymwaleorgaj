/**
 * Offers and Coupons Management Module
 * Handles all offer-related functionality in the gym admin dashboard
 */

class OffersManager {
  constructor() {
    this.currentTab = 'templates';
    this.offers = [];
    this.coupons = [];
    this.templates = [];
    this.initialized = false; // Add a flag to track initialization
    this.init();
  }

  async init() {
    console.log('🎯 Offers Manager: Setting up...');
    window.offersManager = this;
    // The main initialization will now be triggered by the tab becoming visible.
    this.watchForTabActivation();
  }

  safeInitialize() {
    // This function will be called once the tab is visible.
    if (this.initialized) return; // Prevent re-running setup
    console.log('🚀 Offers tab is visible. Performing one-time initialization...');
    
    try {
      this.initializeElements();
      this.initialized = true; // Mark as initialized
      console.log('✅ Offers Manager initialized successfully.');
    } catch (error) {
      console.error('❌ Error during offers manager one-time initialization:', error);
    }
  }

  initializeElements() {
    console.log('🔧 Initializing Offers Manager elements...');
    try {
      this.setupEventListeners();
      this.loadOfferTemplates();
      this.loadOfferStats();
      this.setupTabNavigation();
      this.setupModalClosers();
      this.debugButtonAvailability();
    } catch (error) {
      console.error('❌ Error initializing Offers Manager elements:', error);
    }
  }
  
  debugButtonAvailability() {
    console.log('🔍 Debugging button availability:');
    
    const buttons = [
      'createCustomOfferBtn',
      'generateCouponBtn', 
      'viewActiveCouponsBtn'
    ];
    
    buttons.forEach(buttonId => {
      const button = document.getElementById(buttonId);
      console.log(`  ${buttonId}:`, button ? '✅ Found' : '❌ Missing');
      if (button) {
        console.log(`    - Visible: ${button.offsetWidth > 0 && button.offsetHeight > 0}`);
        console.log(`    - Parent visible: ${button.closest('#offersTab')?.style.display !== 'none'}`);
      }
    });
  }
  
  watchForTabActivation() {
    // Simplified initialization - just check if tab becomes visible periodically
    const checkInterval = setInterval(() => {
      const offersTab = document.getElementById('offersTab');
      if (offersTab && offersTab.style.display === 'block' && !this.initialized) {
        console.log('💡 Offers tab detected as visible. Initializing...');
        this.safeInitialize();
        clearInterval(checkInterval); // Stop checking after initialization
      }
    }, 500); // Check every 500ms

    // Stop checking after 30 seconds to prevent infinite polling
    setTimeout(() => {
      clearInterval(checkInterval);
    }, 30000);
  }
  
  setupModalClosers() {
    // Setup common modal closing functionality
    document.addEventListener('click', (e) => {
      // Only close if the click is on the modal backdrop itself
      if (e.target.classList.contains('modal')) {
        e.target.classList.remove('show');
      }
    });
    
    // Setup escape key to close modals
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const openModal = document.querySelector('.modal.show');
        if (openModal) {
          openModal.classList.remove('show');
        }
      }
    });
  }

  setupEventListeners() {
    console.log('🔗 Setting up event listeners...');
    
    // Main action buttons
    const createOfferBtn = document.getElementById('createCustomOfferBtn');
    const viewCouponsBtn = document.getElementById('viewActiveCouponsBtn');
    const generateCouponBtn = document.getElementById('generateCouponBtn');

    if (createOfferBtn) {
      console.log('✅ Found createCustomOfferBtn, adding click listener');
      createOfferBtn.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('🖱️ Create offer button clicked');
        this.openOfferCreationModal();
      });
    } else {
      console.warn('⚠️ createCustomOfferBtn not found');
    }

    if (viewCouponsBtn) {
      console.log('✅ Found viewActiveCouponsBtn, adding click listener');
      viewCouponsBtn.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('🖱️ View coupons button clicked');
        this.switchToTab('coupons');
      });
    } else {
      console.warn('⚠️ viewActiveCouponsBtn not found');
    }

    if (generateCouponBtn) {
      console.log('✅ Found generateCouponBtn, adding click listener');
      generateCouponBtn.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('🖱️ Generate coupon button clicked');
        this.openCouponGenerationModal();
      });
    } else {
      console.warn('⚠️ generateCouponBtn not found');
    }

    // Modal event listeners
    this.setupModalListeners();

    // Form submissions
    this.setupFormSubmissions();

    // Search and filters
    this.setupSearchAndFilters();
    
    console.log('🔗 Event listeners setup complete');
  }

  setupModalListeners() {
    // Offer Creation Modal
    const closeOfferModal = document.getElementById('closeOfferModal');
    const cancelOfferBtn = document.getElementById('cancelOfferBtn');

    if (closeOfferModal) {
      closeOfferModal.addEventListener('click', () => this.closeModal('offerCreationModal'));
    }

    if (cancelOfferBtn) {
      cancelOfferBtn.addEventListener('click', () => this.closeModal('offerCreationModal'));
    }

    // Coupon Generation Modal
    const closeCouponModal = document.getElementById('closeCouponModal');
    const cancelCouponBtn = document.getElementById('cancelCouponBtn');

    if (closeCouponModal) {
      closeCouponModal.addEventListener('click', () => this.closeModal('couponGenerationModal'));
    }

    if (cancelCouponBtn) {
      cancelCouponBtn.addEventListener('click', () => this.closeModal('couponGenerationModal'));
    }

    // Template Preview Modal
    const closeTemplatePreviewModal = document.getElementById('closeTemplatePreviewModal');
    if (closeTemplatePreviewModal) {
      closeTemplatePreviewModal.addEventListener('click', () => this.closeModal('templatePreviewModal'));
    }

    // Coupon Detail Modal
    const closeCouponDetailModal = document.getElementById('closeCouponDetailModal');
    if (closeCouponDetailModal) {
      closeCouponDetailModal.addEventListener('click', () => this.closeModal('couponDetailModal'));
    }

    // Regenerate coupon code
    const regenerateCouponBtn = document.getElementById('regenerateCouponBtn');
    if (regenerateCouponBtn) {
      regenerateCouponBtn.addEventListener('click', () => this.generateCouponCode());
    }

    const generateRandomCouponBtn = document.getElementById('generateRandomCouponBtn');
    if (generateRandomCouponBtn) {
      generateRandomCouponBtn.addEventListener('click', () => this.generateRandomCouponCode());
    }

    // Auto-generate coupon on offer creation
    const generateCouponCode = document.getElementById('generateCouponCode');
    if (generateCouponCode) {
      generateCouponCode.addEventListener('change', (e) => {
        const couponSection = document.getElementById('couponCodeSection');
        if (couponSection) {
          couponSection.style.display = e.target.checked ? 'block' : 'none';
          if (e.target.checked) {
            this.generateCouponCode();
          }
        }
      });
    }
  }

  setupFormSubmissions() {
    // Offer Creation Form
    const offerForm = document.getElementById('offerCreationForm');
    if (offerForm) {
      offerForm.addEventListener('submit', (e) => this.handleOfferSubmission(e));
    }

    // Coupon Generation Form
    const couponForm = document.getElementById('couponGenerationForm');
    if (couponForm) {
      couponForm.addEventListener('submit', (e) => this.handleCouponSubmission(e));
    }
  }

  setupSearchAndFilters() {
    // Coupon search
    const couponSearchInput = document.getElementById('couponSearchInput');
    if (couponSearchInput) {
      couponSearchInput.addEventListener('input', (e) => this.filterCoupons(e.target.value));
    }

    // Coupon status filter
    const couponStatusFilter = document.getElementById('couponStatusFilter');
    if (couponStatusFilter) {
      couponStatusFilter.addEventListener('change', (e) => this.filterCouponsByStatus(e.target.value));
    }

    // Export coupons
    const exportCouponsBtn = document.getElementById('exportCouponsBtn');
    if (exportCouponsBtn) {
      exportCouponsBtn.addEventListener('click', () => this.exportCoupons());
    }
  }

  setupTabNavigation() {
    const offersTabElement = document.getElementById('offersTab');
    if (!offersTabElement) return;

    const tabButtons = offersTabElement.querySelectorAll('.payment-tab-btn');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent click from affecting other elements
        this.switchToTab(btn.dataset.tab);
      });
    });
  }

  switchToTab(tabName) {
    const offersTabElement = document.getElementById('offersTab');
    if (!offersTabElement) return;

    // Update active tab button within the offers tab
    offersTabElement.querySelectorAll('.payment-tab-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    const activeButton = offersTabElement.querySelector(`[data-tab="${tabName}"]`);
    if (activeButton) {
        activeButton.classList.add('active');
    }

    // Show corresponding tab content within the offers tab
    offersTabElement.querySelectorAll('.payment-tab-content').forEach(content => {
      content.style.display = 'none';
      content.classList.remove('active');
    });

    const targetTab = offersTabElement.querySelector(`#${tabName}Tab`);
    if (targetTab) {
      targetTab.style.display = 'block';
      targetTab.classList.add('active');
      this.currentTab = tabName;

      // Load data for the activated tab
      if (tabName === 'campaigns') {
        this.loadActiveCampaigns();
      } else if (tabName === 'coupons') {
        this.loadCoupons();
      } else if (tabName === 'templates') {
        this.loadOfferTemplates();
      } else if (tabName === 'analytics') {
        this.loadAnalytics();
      }
    }
  }

  loadOfferTemplates() {
    const templatesGrid = document.getElementById('templatesGrid');
    if (!templatesGrid) return;

    // Define offer templates
    this.templates = [
      {
        id: 'winter-arc',
        title: 'Winter Arc Challenge',
        description: 'Transform your fitness journey this winter with exclusive rates',
        icon: 'fas fa-snowflake',
        type: 'winter',
        discount: 25,
        discountType: 'percentage',
        duration: '3 months',
        features: [
          '25% off on all membership plans',
          'Free nutrition consultation',
          'Complimentary workout gear',
          'Access to winter fitness challenges'
        ]
      },
      {
        id: 'christmas-special',
        title: 'Christmas Fitness Gift',
        description: 'Give the gift of health this Christmas season',
        icon: 'fas fa-gift',
        type: 'christmas',
        discount: 30,
        discountType: 'percentage',
        duration: '6 months',
        features: [
          '30% off on premium memberships',
          'Free guest passes for family',
          'Holiday-themed group classes',
          'Complimentary fitness assessment'
        ]
      },
      {
        id: 'new-year-resolution',
        title: 'New Year, New You',
        description: 'Start your fitness journey with our New Year special offer',
        icon: 'fas fa-calendar-alt',
        type: 'newyear',
        discount: 40,
        discountType: 'percentage',
        duration: '12 months',
        features: [
          '40% off on annual memberships',
          'Free personal training sessions',
          'Nutrition and meal planning',
          'Progress tracking app access'
        ]
      },
      {
        id: 'new-joining',
        title: 'Welcome Bonus',
        description: 'Special offer for first-time gym members',
        icon: 'fas fa-handshake',
        type: 'joining',
        discount: 20,
        discountType: 'percentage',
        duration: '1 month',
        features: [
          '20% off first membership',
          'Free gym orientation',
          'Starter workout plan',
          '1-week trial period'
        ]
      },
      {
        id: 'summer-beach-body',
        title: 'Summer Beach Body',
        description: 'Get beach ready with our summer fitness program',
        icon: 'fas fa-sun',
        type: 'seasonal',
        discount: 35,
        discountType: 'percentage',
        duration: '4 months',
        features: [
          '35% off summer programs',
          'Outdoor training sessions',
          'Beach body meal plans',
          'Swimming pool access'
        ]
      },
      {
        id: 'student-discount',
        title: 'Student Special',
        description: 'Exclusive discounts for students and young professionals',
        icon: 'fas fa-graduation-cap',
        type: 'regular',
        discount: 15,
        discountType: 'percentage',
        duration: '6 months',
        features: [
          '15% student discount',
          'Flexible timing options',
          'Study-friendly environment',
          'Group study and workout areas'
        ]
      }
    ];

    templatesGrid.innerHTML = '';

    this.templates.forEach(template => {
      const templateCard = this.createTemplateCard(template);
      templatesGrid.appendChild(templateCard);
    });
  }

  createTemplateCard(template) {
    const card = document.createElement('div');
    card.className = `template-card ${template.type}`;
    
    card.innerHTML = `
      <div class="template-header">
        <div class="template-icon">
          <i class="${template.icon}"></i>
        </div>
        <h3 class="template-title">${template.title}</h3>
        <p class="template-description">${template.description}</p>
      </div>
      <div class="template-features">
        <ul>
          ${template.features.map(feature => `<li>${feature}</li>`).join('')}
        </ul>
      </div>
      <div class="template-actions">
        <button class="template-btn preview" onclick="offersManager.previewTemplate('${template.id}')">
          <i class="fas fa-eye"></i> Preview
        </button>
        <button class="template-btn use" onclick="offersManager.useTemplate('${template.id}')">
          <i class="fas fa-rocket"></i> Use Template
        </button>
      </div>
    `;

    return card;
  }

  previewTemplate(templateId) {
    const template = this.templates.find(t => t.id === templateId);
    if (!template) return;

    const modal = document.getElementById('templatePreviewModal');
    const content = document.getElementById('templatePreviewContent');
    
    if (modal && content) {
      content.innerHTML = this.generateTemplatePreview(template);
      modal.style.display = 'flex';

      // Setup preview modal buttons
      const customizeBtn = document.getElementById('customizeTemplateBtn');
      const launchBtn = document.getElementById('launchOfferBtn');

      if (customizeBtn) {
        customizeBtn.onclick = () => {
          this.closeModal('templatePreviewModal');
          this.customizeTemplate(template);
        };
      }

      if (launchBtn) {
        launchBtn.onclick = () => {
          this.closeModal('templatePreviewModal');
          this.launchOffer(template);
        };
      }
    }
  }

  generateTemplatePreview(template) {
    return `
      <div class="template-preview">
        <div class="preview-header" style="text-align: center; margin-bottom: 24px;">
          <div class="preview-icon" style="width: 80px; height: 80px; margin: 0 auto 16px; background: linear-gradient(135deg, #1976d2, #42a5f5); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 32px;">
            <i class="${template.icon}"></i>
          </div>
          <h2 style="margin-bottom: 8px;">${template.title}</h2>
          <p style="color: #6c757d; font-size: 16px;">${template.description}</p>
        </div>
        
        <div class="preview-details" style="background: #f8f9fa; padding: 20px; border-radius: 12px; margin-bottom: 20px;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div>
              <strong>Discount:</strong> ${template.discount}${template.discountType === 'percentage' ? '%' : '₹'} off
            </div>
            <div>
              <strong>Duration:</strong> ${template.duration}
            </div>
          </div>
        </div>
        
        <div class="preview-features">
          <h4 style="margin-bottom: 12px;">Included Features:</h4>
          <ul style="list-style: none; padding: 0;">
            ${template.features.map(feature => `
              <li style="padding: 8px 0; display: flex; align-items: center; gap: 8px;">
                <i class="fas fa-check-circle" style="color: #4caf50;"></i>
                ${feature}
              </li>
            `).join('')}
          </ul>
        </div>
      </div>
    `;
  }

  useTemplate(templateId) {
    const template = this.templates.find(t => t.id === templateId);
    if (!template) return;

    this.launchOffer(template);
  }

  customizeTemplate(template) {
    // Pre-fill the offer creation form with template data
    const modal = document.getElementById('offerCreationModal');
    if (modal) {
      document.getElementById('offerTitle').value = template.title;
      document.getElementById('offerType').value = template.discountType;
      document.getElementById('offerValue').value = template.discount;
      document.getElementById('offerDescription').value = template.description;
      
      // Set default dates
      const now = new Date();
      const startDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Tomorrow
      const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
      
      document.getElementById('offerStartDate').value = startDate.toISOString().slice(0, 16);
      document.getElementById('offerEndDate').value = endDate.toISOString().slice(0, 16);

      this.generateCouponCode();
      modal.style.display = 'flex';
    }
  }

  async launchOffer(template) {
    try {
      const gymId = this.getGymId();
      if (!gymId) {
        this.showError('Gym ID not found. Please refresh and try again.');
        return;
      }

      // Prepare offer data
      const offerData = {
        title: template.title,
        description: template.description,
        type: template.discountType,
        value: template.discount,
        category: 'membership',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        maxUses: null,
        minAmount: 0,
        gymId: gymId,
        templateId: template.id,
        features: template.features
      };

      const response = await fetch('/api/admin/offers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(offerData)
      });

      if (response.ok) {
        const result = await response.json();
        this.showSuccess('Offer launched successfully!');
        this.loadOfferStats();
        this.switchToTab('active');
      } else {
        const error = await response.json();
        this.showError(error.message || 'Failed to launch offer');
      }
    } catch (error) {
      console.error('Error launching offer:', error);
      this.showError('Failed to launch offer. Please try again.');
    }
  }

  async loadActiveCampaigns() {
    const campaignsList = document.getElementById('campaignsList');
    if (!campaignsList) return;

    try {
      const gymId = this.getGymId();
      const response = await fetch(`/api/admin/offers?gymId=${gymId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const offers = await response.json();
        this.offers = offers;
        this.renderCampaigns(offers);
      } else {
        campaignsList.innerHTML = this.getEmptyState('campaigns');
      }
    } catch (error) {
      console.error('Error loading campaigns:', error);
      campaignsList.innerHTML = this.getEmptyState('campaigns');
    }
  }

  renderCampaigns(campaigns) {
    const campaignsList = document.getElementById('campaignsList');
    if (!campaignsList) return;

    if (campaigns.length === 0) {
      campaignsList.innerHTML = this.getEmptyState('campaigns');
      return;
    }

    campaignsList.innerHTML = campaigns.map(campaign => this.createCampaignCard(campaign)).join('');
  }

  createCampaignCard(campaign) {
    const status = this.getCampaignStatus(campaign);
    const usage = campaign.usageCount || 0;
    const maxUses = campaign.maxUses || 'Unlimited';

    return `
      <div class="campaign-card">
        <div class="campaign-header">
          <div>
            <h3 class="campaign-title">${campaign.title}</h3>
            <p class="campaign-type">${campaign.type} • ${campaign.category}</p>
          </div>
          <span class="campaign-status ${status.toLowerCase()}">${status}</span>
        </div>
        
        <div class="campaign-metrics">
          <div class="campaign-metric">
            <div class="campaign-metric-value">${usage}</div>
            <div class="campaign-metric-label">Uses</div>
          </div>
          <div class="campaign-metric">
            <div class="campaign-metric-value">${campaign.value}${campaign.type === 'percentage' ? '%' : '₹'}</div>
            <div class="campaign-metric-label">Discount</div>
          </div>
          <div class="campaign-metric">
            <div class="campaign-metric-value">${this.formatDate(campaign.endDate)}</div>
            <div class="campaign-metric-label">Expires</div>
          </div>
          <div class="campaign-metric">
            <div class="campaign-metric-value">₹${campaign.revenue || 0}</div>
            <div class="campaign-metric-label">Revenue</div>
          </div>
        </div>

        <div class="campaign-actions">
          <button class="campaign-btn" onclick="offersManager.editCampaign('${campaign._id}')">
            <i class="fas fa-edit"></i> Edit
          </button>
          <button class="campaign-btn" onclick="offersManager.viewCampaignDetails('${campaign._id}')">
            <i class="fas fa-eye"></i> Details
          </button>
          ${status === 'Active' ? 
            `<button class="campaign-btn" onclick="offersManager.pauseCampaign('${campaign._id}')">
              <i class="fas fa-pause"></i> Pause
            </button>` :
            `<button class="campaign-btn" onclick="offersManager.resumeCampaign('${campaign._id}')">
              <i class="fas fa-play"></i> Resume
            </button>`
          }
          <button class="campaign-btn" onclick="offersManager.deleteCampaign('${campaign._id}')">
            <i class="fas fa-trash"></i> Delete
          </button>
        </div>
      </div>
    `;
  }

  getCampaignStatus(campaign) {
    const now = new Date();
    const endDate = new Date(campaign.endDate);
    
    if (campaign.status === 'paused') return 'Paused';
    if (endDate < now) return 'Expired';
    return 'Active';
  }

  async loadCoupons() {
    const couponsTableBody = document.getElementById('couponsTableBody');
    if (!couponsTableBody) return;

    try {
      const gymId = this.getGymId();
      const response = await fetch(`/api/admin/coupons?gymId=${gymId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const coupons = await response.json();
        this.coupons = coupons;
        this.renderCoupons(coupons);
      } else {
        couponsTableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px;">No coupons found</td></tr>';
      }
    } catch (error) {
      console.error('Error loading coupons:', error);
      couponsTableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px;">Error loading coupons</td></tr>';
    }
  }

  renderCoupons(coupons) {
    const couponsTableBody = document.getElementById('couponsTableBody');
    if (!couponsTableBody) return;

    if (coupons.length === 0) {
      couponsTableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px;">No coupons found</td></tr>';
      return;
    }

    couponsTableBody.innerHTML = coupons.map(coupon => this.createCouponRow(coupon)).join('');
  }

  createCouponRow(coupon) {
    const status = this.getCouponStatus(coupon);
    const usage = coupon.usageCount || 0;
    const limit = coupon.usageLimit || 'Unlimited';
    const usagePercentage = coupon.usageLimit ? (usage / coupon.usageLimit) * 100 : 0;

    return `
      <tr>
        <td>
          <span class="coupon-code">${coupon.code}</span>
        </td>
        <td>
          <span class="coupon-type ${coupon.discountType}">${coupon.discountType}</span>
        </td>
        <td>
          <span class="coupon-discount">${coupon.discountValue}${coupon.discountType === 'percentage' ? '%' : '₹'}</span>
        </td>
        <td>
          <div class="coupon-usage">
            <span>${usage}/${limit}</span>
            ${coupon.usageLimit ? `
              <div class="usage-bar">
                <div class="usage-fill" style="width: ${usagePercentage}%"></div>
              </div>
            ` : ''}
          </div>
        </td>
        <td>${this.formatDate(coupon.expiryDate)}</td>
        <td>
          <span class="coupon-status ${status.toLowerCase()}">${status}</span>
        </td>
        <td>
          <div class="coupon-actions">
            <button class="coupon-action-btn edit" onclick="offersManager.editCoupon('${coupon._id}')" title="Edit">
              <i class="fas fa-edit"></i>
            </button>
            <button class="coupon-action-btn copy" onclick="offersManager.copyCouponCode('${coupon.code}')" title="Copy Code">
              <i class="fas fa-copy"></i>
            </button>
            <button class="coupon-action-btn delete" onclick="offersManager.deleteCoupon('${coupon._id}')" title="Delete">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }

  getCouponStatus(coupon) {
    const now = new Date();
    const expiryDate = new Date(coupon.expiryDate);
    
    if (coupon.status === 'disabled') return 'Disabled';
    if (expiryDate < now) return 'Expired';
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) return 'Expired';
    return 'Active';
  }

  async loadOfferStats() {
    try {
      const gymId = this.getGymId();
      const response = await fetch(`/api/admin/offers/stats?gymId=${gymId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const stats = await response.json();
        this.updateStatsDisplay(stats);
      }
    } catch (error) {
      console.error('Error loading offer stats:', error);
    }
  }

  updateStatsDisplay(stats) {
    const elements = {
      activeOffersCount: stats.activeOffers || 0,
      activeCouponsCount: stats.activeCoupons || 0,
      couponClaimsCount: stats.totalClaims || 0,
      revenueFromOffersCount: `₹${stats.revenue || 0}`
    };

    Object.entries(elements).forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element) element.textContent = value;
    });
  }

  // Modal Management
  openOfferCreationModal() {
    console.log('🎯 Opening offer creation modal...');
    const modal = document.getElementById('offerCreationModal');
    if (modal) {
      this.resetForm('offerCreationForm');
      this.generateCouponCode();
      modal.style.display = 'flex';
      modal.style.alignItems = 'center';
      modal.style.justifyContent = 'center';
      console.log('✅ Offer creation modal opened');
    } else {
      console.error('❌ Offer creation modal not found');
    }
  }

  openCouponGenerationModal() {
    console.log('🎯 Opening coupon generation modal...');
    const modal = document.getElementById('couponGenerationModal');
    if (modal) {
      this.resetForm('couponGenerationForm');
      this.generateRandomCouponCode();
      modal.style.display = 'flex';
      modal.style.alignItems = 'center';
      modal.style.justifyContent = 'center';
      console.log('✅ Coupon generation modal opened');
    } else {
      console.error('❌ Coupon generation modal not found');
    }
  }

  closeModal(modalId) {
    console.log(`🔒 Closing modal: ${modalId}`);
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.style.display = 'none';
      console.log(`✅ Modal ${modalId} closed`);
    } else {
      console.error(`❌ Modal ${modalId} not found`);
    }
  }

  // Form Handlers
  async handleOfferSubmission(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const offerData = Object.fromEntries(formData.entries());
    
    // Add gym ID
    offerData.gymId = this.getGymId();
    
    // Generate coupon if requested
    if (document.getElementById('generateCouponCode').checked) {
      offerData.couponCode = document.getElementById('couponCode').value;
    }

    try {
      const response = await fetch('/api/admin/offers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(offerData)
      });

      if (response.ok) {
        this.showSuccess('Offer created successfully!');
        this.closeModal('offerCreationModal');
        this.loadOfferStats();
        this.loadActiveCampaigns();
      } else {
        const error = await response.json();
        this.showError(error.message || 'Failed to create offer');
      }
    } catch (error) {
      console.error('Error creating offer:', error);
      this.showError('Failed to create offer. Please try again.');
    }
  }

  async handleCouponSubmission(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const couponData = Object.fromEntries(formData.entries());
    
    couponData.gymId = this.getGymId();
    couponData.code = document.getElementById('couponCodeInput').value;

    try {
      const response = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(couponData)
      });

      if (response.ok) {
        this.showSuccess('Coupon generated successfully!');
        this.closeModal('couponGenerationModal');
        this.loadOfferStats();
        this.loadCoupons();
      } else {
        const error = await response.json();
        this.showError(error.message || 'Failed to generate coupon');
      }
    } catch (error) {
      console.error('Error generating coupon:', error);
      this.showError('Failed to generate coupon. Please try again.');
    }
  }

  // Utility Functions
  generateCouponCode() {
    const gymName = this.getGymName() || 'GYM';
    const prefix = gymName.substring(0, 3).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    const code = `${prefix}${random}`;
    
    const couponCodeInput = document.getElementById('couponCode');
    if (couponCodeInput) {
      couponCodeInput.value = code;
    }
  }

  generateRandomCouponCode() {
    const adjectives = ['SUPER', 'MEGA', 'ULTRA', 'POWER', 'STRONG', 'FIT', 'ACTIVE'];
    const nouns = ['DEAL', 'SAVE', 'OFFER', 'BOOST', 'GAIN', 'FLEX', 'PUMP'];
    const numbers = Math.floor(Math.random() * 99) + 1;
    
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const code = `${adjective}${noun}${numbers}`;
    
    const couponCodeInput = document.getElementById('couponCodeInput');
    if (couponCodeInput) {
      couponCodeInput.value = code;
    }
  }

  getGymId() {
    return window.GymIdManager ? window.GymIdManager.getCurrentGymId() : 
           (localStorage.getItem('gymId') || localStorage.getItem('adminGymId'));
  }

  getGymName() {
    return localStorage.getItem('gymName') || 'Gym';
  }

  resetForm(formId) {
    const form = document.getElementById(formId);
    if (form) {
      form.reset();
    }
  }

  formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  getEmptyState(type) {
    const states = {
      campaigns: `
        <div class="empty-state">
          <i class="fas fa-bullhorn"></i>
          <h3>No Active Campaigns</h3>
          <p>Create your first campaign using the templates above</p>
          <button class="btn-primary" onclick="document.querySelector('[data-tab=\"templates\"]').click()">
            <i class="fas fa-plus"></i> Create Campaign
          </button>
        </div>
      `,
      coupons: `
        <div class="empty-state">
          <i class="fas fa-ticket-alt"></i>
          <h3>No Coupons Found</h3>
          <p>Generate your first coupon to start offering discounts</p>
          <button class="btn-primary" onclick="offersManager.openCouponGenerationModal()">
            <i class="fas fa-plus"></i> Generate Coupon
          </button>
        </div>
      `
    };
    return states[type] || '';
  }

  showSuccess(message) {
    this.showNotification(message, 'success');
  }

  showError(message) {
    if (window.ErrorManager) {
      window.ErrorManager.showError(message);
    } else {
      this.showNotification(message, 'error');
    }
  }

  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 16px 24px;
      background: ${type === 'success' ? '#d4edda' : type === 'error' ? '#f8d7da' : '#e2e3e5'};
      color: ${type === 'success' ? '#155724' : type === 'error' ? '#721c24' : '#383d41'};
      border: 1px solid ${type === 'success' ? '#c3e6cb' : type === 'error' ? '#f5c6cb' : '#d6d8db'};
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 100000;
      transform: translateX(100%);
      transition: transform 0.3s ease;
      max-width: 400px;
    `;
    
    notification.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-triangle' : 'info-circle'}"></i>
        <span>${message}</span>
        <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; margin-left: auto; cursor: pointer; font-size: 18px;">&times;</button>
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

  // Additional methods for coupon and campaign management
  async copyCouponCode(code) {
    try {
      await navigator.clipboard.writeText(code);
      this.showSuccess(`Coupon code "${code}" copied to clipboard!`);
    } catch (error) {
      console.error('Failed to copy:', error);
      this.showError('Failed to copy coupon code');
    }
  }

  filterCoupons(searchTerm) {
    const filteredCoupons = this.coupons.filter(coupon => 
      coupon.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      coupon.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
    this.renderCoupons(filteredCoupons);
  }

  filterCouponsByStatus(status) {
    let filteredCoupons = this.coupons;
    
    if (status !== 'all') {
      filteredCoupons = this.coupons.filter(coupon => 
        this.getCouponStatus(coupon).toLowerCase() === status
      );
    }
    
    this.renderCoupons(filteredCoupons);
  }

  async exportCoupons() {
    try {
      const gymId = this.getGymId();
      const response = await fetch(`/api/admin/coupons/export?gymId=${gymId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `coupons-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.showSuccess('Coupons exported successfully!');
      } else {
        this.showError('Failed to export coupons');
      }
    } catch (error) {
      console.error('Error exporting coupons:', error);
      this.showError('Failed to export coupons');
    }
  }

  async loadAnalytics() {
    // Implementation for analytics charts and data
    console.log('Loading analytics...');
  }
}

// Initialize offers manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('🔄 Initializing Offers Manager...');
  window.offersManager = new OffersManager();
  console.log('✅ Offers Manager initialized and made globally available');
});

// Also make it available immediately for any early calls
if (!window.offersManager) {
  window.offersManager = null;
}