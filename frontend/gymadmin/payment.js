// Payment Tab JavaScript
class PaymentManager {
  // Bind click event for received amount stat card
  bindReceivedAmountStatCard() {
    const statCard = document.getElementById('receivedAmountStatCard');
    if (!statCard) return;
    statCard.addEventListener('click', () => {
      this.showReceivedPaymentsModal();
    });
    // Close modal handler
    const closeBtn = document.getElementById('closeReceivedPaymentsModal');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        document.getElementById('receivedPaymentsModal').style.display = 'none';
      });
    }
  }

  // Show modal with received payment details by category
  async showReceivedPaymentsModal() {
    const modal = document.getElementById('receivedPaymentsModal');
    const container = document.getElementById('receivedPaymentsDetailsContainer');
    if (!modal || !container) return;
    container.innerHTML = '<div style="color:#888;text-align:center;padding:24px 0;">Loading received payments...</div>';

    // Fetch received payments (last 100 for breakdown)
    let receivedPayments = [];
    try {
      const response = await fetch('http://localhost:5000/api/payments/recent?limit=100', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('gymAdminToken')}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        let allRecent = Array.isArray(data) ? data : (Array.isArray(data.data) ? data.data : []);
        receivedPayments = allRecent.filter(p => p.type === 'received');
      }
    } catch (e) {
      receivedPayments = [];
    }

    if (!receivedPayments.length) {
      container.innerHTML = `<div style='color:#888;text-align:center;padding:24px 0;'>No received payments found.</div>`;
      modal.style.display = 'flex';
      return;
    }

    // Group by category and store payments for each
    const categoryMap = {};
    receivedPayments.forEach(p => {
      const cat = (p.category || 'Other').toLowerCase();
      if (!categoryMap[cat]) categoryMap[cat] = { total: 0, count: 0, label: this.getCategoryDisplayName(cat), payments: [] };
      categoryMap[cat].total += p.amount || 0;
      categoryMap[cat].count += 1;
      categoryMap[cat].payments.push(p);
    });

    // Sort categories by total amount desc
    const sortedCats = Object.entries(categoryMap).sort((a, b) => b[1].total - a[1].total);

    let html = '';
    sortedCats.forEach(([cat, info]) => {
      html += `<div style='margin-bottom:18px;'>
        <div style='font-size:1.08em;font-weight:600;color:#22c55e;margin-bottom:4px;'>${info.label}
          <span style='font-size:0.95em;color:#64748b;font-weight:400;margin-left:8px;'>(₹${this.formatAmount(info.total)}, ${info.count} payment${info.count > 1 ? 's' : ''})</span>
        </div>
        <ul style='margin:0 0 0 10px;padding:0;list-style:disc;'>`;
      info.payments.forEach(payment => {
        html += `<li style='margin-bottom:4px;font-size:0.97em;'>
          <b>${payment.description || 'No Description'}</b> - ₹${this.formatAmount(payment.amount)}
          <span style='color:#888;font-size:0.92em;'>(${payment.paymentMethod ? payment.paymentMethod.toUpperCase() : 'N/A'})</span>
          ${payment.memberName ? `<span style='color:#2563eb;font-size:0.92em;margin-left:6px;'>${payment.memberName}</span>` : ''}
          <span style='color:#b91c1c;font-size:0.92em;margin-left:6px;'>${payment.createdAt ? this.formatDate(payment.createdAt) : ''}</span>
        </li>`;
      });
      html += `</ul></div>`;
    });
    if (!html) {
      html = `<div style='color:#888;text-align:center;padding:24px 0;'>No received payments found.</div>`;
    }
    container.innerHTML = html;
    modal.style.display = 'flex';
  }
  // Unified loader for all pending payments (member + manual)
  async loadAllPendingPayments() {
    const container = document.getElementById('pendingPaymentsList');
    if (!container) return;
    container.innerHTML = '<div style="color:#888;text-align:center;padding:24px 0;">Loading pending payments...</div>';

    // Fetch both manual (regular) and member pending payments
    let manualPending = [];
    let memberPending = [];
    // Always fetch latest manual (add payment) pending payments from backend
    try {
      // First try to get all recent payments and filter for pending ones
      const response = await fetch('http://localhost:5000/api/payments/recent?limit=100', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('gymAdminToken')}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        let allRecent = Array.isArray(data) ? data : (Array.isArray(data.data) ? data.data : []);
        // Only include manual pending payments (not recurring monthly payments)
        // Filter for type 'pending' and exclude recurring payments
        manualPending = allRecent.filter(p => 
          p.type === 'pending' && 
          !p.isRecurring // Exclude recurring payments (they belong in recurring section)
        );
        // Store for modal and stat card use
        this.recentRegularPendingPayments = manualPending;
        console.log('Manual pending payments loaded:', manualPending.length, 'payments (excluding recurring)');
      } else {
        console.error('Failed to fetch manual pending payments:', response.status);
        manualPending = [];
        this.recentRegularPendingPayments = [];
      }
    } catch (e) { 
      console.error('Error fetching manual pending payments:', e);
      manualPending = []; 
    }

    try {
      // Fetch member pending payments (API call)
      const response = await fetch('http://localhost:5000/api/members', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('gymAdminToken')}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const members = await response.json();
        memberPending = Array.isArray(members) ? members.filter(member =>
          member.paymentStatus === 'pending' ||
          member.paymentStatus === 'overdue' ||
          (member.pendingPaymentAmount && member.pendingPaymentAmount > 0)
        ) : [];
      }
    } catch (e) { memberPending = []; }


    // Update stat card with the latest values from both sources
    // Calculate total amounts
    let totalManual = 0;
    let totalMember = 0;
    if (Array.isArray(manualPending)) {
      totalManual = manualPending.reduce((sum, p) => sum + (p.amount || 0), 0);
    }
    if (Array.isArray(memberPending)) {
      totalMember = memberPending.reduce((sum, m) => sum + (this.calculateMemberPendingAmount(m) || 0), 0);
    }
    this.regularPendingAmount = totalManual;
    this.memberPendingAmount = totalMember;
    // Store for modal use
    this.recentMemberPendingPayments = memberPending;
    this.updateCombinedPendingStatCard();

    // If both are empty, show empty state
    if ((!manualPending || manualPending.length === 0) && (!memberPending || memberPending.length === 0)) {
      container.innerHTML = `
        <div class="payment-empty-state">
          <i class="fas fa-user-clock"></i>
          <h3>No Pending Payments</h3>
          <p>All payments are up to date</p>
        </div>
      `;
      return;
    }

    // Render unified list, sorted by due date (earliest first)
    // Map both types to a common structure for sorting
    const unified = [
      ...manualPending.map(p => ({
        type: 'manual',
        dueDate: p.dueDate ? new Date(p.dueDate) : null,
        amount: p.amount,
        description: p.description,
        category: p.category,
        status: 'pending',
        paymentMethod: p.paymentMethod || '',
        id: p._id,
        notes: p.notes || '',
      })),
      ...memberPending.map(m => ({
        type: 'member',
        dueDate: m.membershipValidUntil ? new Date(m.membershipValidUntil) : null,
        amount: this.calculateMemberPendingAmount(m),
        description: `${m.memberName || 'No Name'} - Membership Renewal`,
        category: m.planSelected || 'Membership',
        status: m.paymentStatus || 'pending',
        memberName: m.memberName,
        memberId: m._id,
        plan: m.planSelected,
        monthlyPlan: m.monthlyPlan,
        daysRemaining: m.daysRemaining,
        membershipId: m.membershipId,
        profileImage: m.profileImage,
      }))
    ];

    // Sort by due date (earliest first, nulls last)
    unified.sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate - b.dueDate;
    });

    // Render each item with proper style
    container.innerHTML = unified.map(item => {
      if (item.type === 'manual') {
        // Manual (created) pending payment
        return `
          <div class="pending-payment-item manual" style="display:flex;align-items:center;gap:16px;padding:14px 12px;margin-bottom:12px;background:#fffbe7;border-radius:10px;box-shadow:0 1px 4px #fbbf2433;">
            <div style="flex:0 0 38px;width:38px;height:38px;background:#fbbf24;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:1.2em;">
              <i class="fas fa-clock"></i>
            </div>
            <div style="flex:1;min-width:0;">
              <div style="font-weight:600;font-size:1.05em;color:#b45309;">${item.description || 'No Description'}</div>
              <div style="font-size:0.93em;color:#a67c00;">${item.category || 'N/A'}</div>
              <div style="font-size:0.88em;color:#b91c1c;">Due: ${item.dueDate ? item.dueDate.toLocaleDateString() : 'N/A'}</div>
              ${item.notes ? `<div style='font-size:0.88em;color:#888;'>${item.notes}</div>` : ''}
            </div>
            <div style="flex:0 0 90px;text-align:right;">
              <span style="color:#f59e42;font-weight:700;font-size:1.08em;">₹${this.formatAmount(item.amount)}</span>
              <div style="font-size:0.82em;color:#fbbf24;font-weight:500;">Pending</div>
              <button class="payment-action-btn mark-paid" data-action="mark-manual-paid" data-payment-id="${item.id}" title="Mark as Paid"
                style="background:#22c55e;color:#fff;border:none;border-radius:6px;padding:4px 8px;font-size:0.85em;margin-top:4px;cursor:pointer;width:100%;"><i class="fas fa-check"></i> Mark Paid</button>
            </div>
          </div>
        `;
      } else {
        // Member pending payment
        const isOverdue = item.daysRemaining < 0;
        const badge = isOverdue
          ? `<span style='background:#ffd6d6;color:#b91c1c;padding:2px 10px;border-radius:12px;font-size:0.85em;margin-left:8px;display:inline-flex;align-items:center;'><i class="fas fa-exclamation-triangle" style="margin-right:4px;"></i> Overdue${item.daysRemaining !== undefined ? ` ${Math.abs(item.daysRemaining)} days` : ''}</span>`
          : `<span style='background:#ffe066;color:#a67c00;padding:2px 10px;border-radius:12px;font-size:0.85em;margin-left:8px;display:inline-flex;align-items:center;'><i class="fas fa-clock" style="margin-right:4px;"></i> Expires in ${item.daysRemaining} days</span>`;
        const profileImg = item.profileImage && item.profileImage !== ''
          ? item.profileImage.startsWith('http') ? item.profileImage : `${item.profileImage}`
          : 'https://ui-avatars.com/api/?name=' + encodeURIComponent(item.memberName || 'Member') + '&background=0D8ABC&color=fff&size=64';
        return `
          <div class="pending-payment-item member" style="display:flex;align-items:center;gap:16px;padding:14px 12px;margin-bottom:12px;background:#e0f2fe;border-radius:10px;box-shadow:0 1px 4px #3b82f633;">
            <div style="flex:0 0 38px;width:38px;height:38px;background:#3b82f6;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:1.2em;overflow:hidden;">
              <img src="${profileImg}" alt="Profile" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" onerror="this.onerror=null;this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(item.memberName || 'Member')}&background=0D8ABC&color=fff&size=64';">
            </div>
            <div style="flex:1;min-width:0;">
              <div style="font-weight:600;font-size:1.05em;color:#1e293b;">${item.description}</div>
              <div style="font-size:0.93em;color:#2563eb;">${item.category || 'Membership'}</div>
              <div style="font-size:0.88em;color:#b91c1c;">Due: ${item.dueDate ? item.dueDate.toLocaleDateString() : 'N/A'}</div>
              <div style="margin-top:2px;">${badge}</div>
              <div style="font-size:0.82em;color:#64748b;">ID: ${item.membershipId || 'N/A'} | Plan: ${item.plan || 'N/A'} (${item.monthlyPlan || 'N/A'})</div>
            </div>
            <div style="flex:0 0 90px;text-align:right;">
              <span style="color:#3b82f6;font-weight:700;font-size:1.08em;">₹${this.formatAmount(item.amount)}</span>
              <div style="font-size:0.82em;color:#3b82f6;font-weight:500;">Pending</div>
              <button class="payment-action-btn mark-paid" data-action="mark-member-paid" data-member-id="${item.memberId}" title="Mark as Paid"
                style="background:#22c55e;color:#fff;border:none;border-radius:6px;padding:4px 8px;font-size:0.85em;margin-top:4px;cursor:pointer;width:100%;"><i class="fas fa-check"></i> Mark Paid</button>
            </div>
          </div>
        `;
      }
    }).join('');
  }
  // Bind click event for pending payments stat card
  bindPendingPaymentsStatCard() {
    const statCard = document.getElementById('pendingPaymentsStatCard');
    if (!statCard) return;
    statCard.addEventListener('click', () => {
      this.showPendingPaymentsModal();
    });
    // Close modal handler
    const closeBtn = document.getElementById('closePendingPaymentsModal');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        document.getElementById('pendingPaymentsModal').style.display = 'none';
      });
    }
  }

  // Show modal with pending payment details
  showPendingPaymentsModal() {
    const modal = document.getElementById('pendingPaymentsModal');
    const container = document.getElementById('pendingPaymentsDetailsContainer');
    if (!modal || !container) return;
    let html = '';
    // Regular pending payments
    if (this.regularPendingAmount && this.regularPendingAmount > 0 && Array.isArray(this.recentRegularPendingPayments) && this.recentRegularPendingPayments.length > 0) {
      html += `<h4 style='margin-bottom:8px;color:#f59e42;'><i class='fas fa-credit-card'></i> Regular Pending Payments</h4>`;
      html += '<ul style="margin-bottom:18px;">';
      this.recentRegularPendingPayments.forEach(payment => {
        html += `<li style='margin-bottom:6px;'>
          <b>${payment.description || 'No Description'}</b> - ₹${this.formatAmount(payment.amount)}
          <span style='color:#888;font-size:0.92em;'>(${payment.category || 'N/A'})</span>
          <span style='color:#b91c1c;font-size:0.92em;'>Due: ${payment.dueDate ? this.formatDate(payment.dueDate) : 'N/A'}</span>
        </li>`;
      });
      html += '</ul>';
    }
    // Member pending payments
    if (this.memberPendingAmount && this.memberPendingAmount > 0 && Array.isArray(this.recentMemberPendingPayments) && this.recentMemberPendingPayments.length > 0) {
      html += `<h4 style='margin-bottom:8px;color:#3b82f6;'><i class='fas fa-users'></i> Member Pending Payments</h4>`;
      html += '<ul>';
      this.recentMemberPendingPayments.forEach(member => {
        html += `<li style='margin-bottom:6px;'>
          <b>${member.memberName || 'No Name'}</b> - ₹${this.formatAmount(this.calculateMemberPendingAmount(member))}
          <span style='color:#888;font-size:0.92em;'>(${member.planSelected || 'N/A'})</span>
          <span style='color:#b91c1c;font-size:0.92em;'>Due: ${member.membershipValidUntil ? this.formatDate(member.membershipValidUntil) : 'N/A'}</span>
        </li>`;
      });
      html += '</ul>';
    }
    if (!html) {
      html = `<div style='color:#888;text-align:center;padding:24px 0;'>No pending payments found.</div>`;
    }
    container.innerHTML = html;
    modal.style.display = 'flex';
  }
  constructor() {
    this.paymentChart = null;
    this.currentFilter = 'all';
    this.regularPendingAmount = 0; // Store regular pending payments
    this.memberPendingAmount = 0;  // Store member pending payments
    this.recentRegularPendingPayments = [];
    this.recentMemberPendingPayments = [];
    
    // Enhanced notification system properties
    this.seenNotifications = new Set();
    this.lastNotificationCheck = new Date();
    
    this.init();
    this.bindReceivedAmountStatCard();
    
    // Initialize enhanced payment reminders
    this.initializePaymentReminders();
    
    // Remove the setTimeout since loadPaymentData() already calls loadAllPendingPayments()
    // setTimeout(() => this.loadAllPendingPayments(), 1500);
  }

  init() {
    this.setupEventListeners();
    this.loadPaymentData();
    this.bindPendingPaymentsStatCard();
  }

  // Enhanced helper function to use unified notification system
  async waitForNotificationManager(maxWait = 5000) {
    return new Promise((resolve) => {
      const checkInterval = 100;
      let waited = 0;
      
      const check = () => {
        if (window.NotificationManager && window.NotificationManager.isReady()) {
          resolve(window.NotificationManager);
        } else if (waited < maxWait) {
          waited += checkInterval;
          setTimeout(check, checkInterval);
        } else {
          console.warn('Enhanced notification system not available after waiting');
          resolve(null);
        }
      };
      
      check();
    });
  }

  setupEventListeners() {
    // Add payment button
    document.addEventListener('click', (e) => {
      if (e.target.id === 'addPaymentBtn') {
        this.showAddPaymentModal();
      }
    });

    // Modal close buttons
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-close-btn') || 
          e.target.id === 'cancelPaymentBtn') {
        this.hideAddPaymentModal();
      }
    });

    // Payment category selection
    document.addEventListener('click', (e) => {
      if (e.target.closest('.payment-category-item')) {
        this.handleCategorySelection(e.target.closest('.payment-category-item'));
      }
    });

    // Payment form submission
    const paymentForm = document.getElementById('addPaymentForm');
    if (paymentForm) {
      paymentForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handlePaymentFormSubmit();
      });
    }

    // Recurring payment checkbox
    const recurringCheckbox = document.getElementById('isRecurring');
    if (recurringCheckbox) {
      recurringCheckbox.addEventListener('change', (e) => {
        this.toggleRecurringDetails(e.target.checked);
      });
    }

    // Payment type change handler
    document.addEventListener('change', (e) => {
      if (e.target.id === 'paymentType') {
        this.handlePaymentTypeChange(e.target.value);
      }
    });

    // Filter buttons
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('filter-btn')) {
        this.handleFilterChange(e.target.dataset.filter);
      }
    });

    // Payment action buttons
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('payment-action-btn')) {
        const action = e.target.dataset.action;
        const paymentId = e.target.dataset.paymentId;
        const memberId = e.target.dataset.memberId;
        
        // Handle member-specific actions
        if (action === 'mark-member-paid') {
          this.handleMemberPaymentAction('mark-paid', memberId);
        } else if (action === 'remind-member') {
          this.handleMemberPaymentAction('remind', memberId);
        } else if (action === 'grant-allowance') {
          this.handleMemberPaymentAction('grant-allowance', memberId);
        } else if (action === 'mark-manual-paid') {
          this.handleManualPaymentAction('mark-paid', paymentId);
        } else {
          // Handle regular payment actions
          this.handlePaymentAction(action, paymentId);
        }
      }
    });

    // Chart controls
    const monthSelect = document.getElementById('paymentChartMonth');
    const yearSelect = document.getElementById('paymentChartYear');
    
    if (monthSelect) {
      monthSelect.addEventListener('change', () => this.updateChart());
    }
    if (yearSelect) {
      yearSelect.addEventListener('change', () => this.updateChart());
    }

    // Initialize payment reminders check
    this.initializePaymentReminders();
  }

  async loadPaymentData() {
    try {
      await Promise.all([
        this.loadPaymentStats(),
        this.loadRecentPayments(),
        this.loadRecurringPayments(),
        this.loadPaymentChart()
      ]);
      // Load unified pending payments after stats are loaded (this handles both member and manual pending)
      await this.loadAllPendingPayments();
    } catch (error) {
      console.error('Error loading payment data:', error);
      this.showError('Failed to load payment data');
    }
  }

  async loadPaymentStats() {
    try {
      console.log('Loading payment stats...');
      const response = await fetch('http://localhost:5000/api/payments/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('gymAdminToken')}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch payment stats: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Payment stats loaded:', data.data);
      this.updatePaymentStats(data.data);
    } catch (error) {
      console.error('Error loading payment stats:', error);
      this.showError('Failed to load payment statistics');
    }
  }

  updatePaymentStats(stats) {
    // Update received amount
    const receivedCard = document.querySelector('.payment-stat-card.received');
    if (receivedCard) {
      receivedCard.querySelector('.payment-stat-value').textContent = `₹${this.formatAmount(stats.received)}`;
      const receivedChange = receivedCard.querySelector('.payment-stat-change');
      receivedChange.className = `payment-stat-change ${stats.receivedGrowth >= 0 ? 'positive' : 'negative'}`;
      receivedChange.innerHTML = `
        <i class="fas fa-arrow-${stats.receivedGrowth >= 0 ? 'up' : 'down'}"></i>
        ${Math.abs(stats.receivedGrowth).toFixed(1)}%
      `;
    }

    // Update paid amount
    const paidCard = document.querySelector('.payment-stat-card.paid');
    if (paidCard) {
      paidCard.querySelector('.payment-stat-value').textContent = `₹${this.formatAmount(stats.paid)}`;
      const paidChange = paidCard.querySelector('.payment-stat-change');
      paidChange.className = `payment-stat-change ${stats.paidGrowth >= 0 ? 'negative' : 'positive'}`;
      paidChange.innerHTML = `
        <i class="fas fa-arrow-${stats.paidGrowth >= 0 ? 'up' : 'down'}"></i>
        ${Math.abs(stats.paidGrowth).toFixed(1)}%
      `;
    }

    // Update due amount (new stat card)
    const dueCard = document.querySelector('.payment-stat-card.due');
    if (dueCard) {
      dueCard.querySelector('.payment-stat-value').textContent = `₹${this.formatAmount(stats.due || 0)}`;
      const dueChange = dueCard.querySelector('.payment-stat-change');
      if (dueChange && stats.dueGrowth !== undefined) {
        dueChange.className = `payment-stat-change ${stats.dueGrowth >= 0 ? 'negative' : 'positive'}`;
        dueChange.innerHTML = `
          <i class="fas fa-arrow-${stats.dueGrowth >= 0 ? 'up' : 'down'}"></i>
          ${Math.abs(stats.dueGrowth).toFixed(1)}%
        `;
      }
    }

    // Only update regularPendingAmount for use in unified stat card logic
    this.regularPendingAmount = stats.pending || 0;
    // Store recent regular pending payments for modal (if available)
    if (Array.isArray(stats.pendingPayments)) {
      this.recentRegularPendingPayments = stats.pendingPayments;
    }
    // Do NOT update the unified pending stat card here - it will be updated by loadAllPendingPayments()
    // this.updateCombinedPendingStatCard(); // Removed to prevent conflicts
    
    // Update pending growth badge (but not the value itself)
    const pendingCard = document.querySelector('.payment-stat-card.pending');
    if (pendingCard) {
      const pendingChange = pendingCard.querySelector('.payment-stat-change');
      if (pendingChange && stats.pendingGrowth !== undefined) {
        pendingChange.className = `payment-stat-change ${stats.pendingGrowth >= 0 ? 'negative' : 'positive'}`;
        pendingChange.innerHTML = `
          <i class="fas fa-arrow-${stats.pendingGrowth >= 0 ? 'up' : 'down'}"></i>
          ${Math.abs(stats.pendingGrowth).toFixed(1)}%
        `;
      }
    }

    // Update profit/loss
    const profitCard = document.querySelector('.payment-stat-card.profit');
    if (profitCard) {
      profitCard.querySelector('.payment-stat-value').textContent = `₹${this.formatAmount(stats.profit)}`;
      const profitChange = profitCard.querySelector('.payment-stat-change');
      profitChange.className = `payment-stat-change ${stats.profit >= 0 ? 'positive' : 'negative'}`;
      profitChange.innerHTML = `
        <i class="fas fa-arrow-${stats.profitGrowth >= 0 ? 'up' : 'down'}"></i>
        ${Math.abs(stats.profitGrowth).toFixed(1)}%
      `;
      
      // Update card color based on profit/loss
      if (stats.profit >= 0) {
        profitCard.style.borderLeftColor = '#22c55e';
      } else {
        profitCard.style.borderLeftColor = '#ef4444';
      }
    }
  }

  async loadPaymentChart() {
    try {
      const now = new Date();
      const month = document.getElementById('paymentChartMonth')?.value || now.getMonth();
      const year = document.getElementById('paymentChartYear')?.value || now.getFullYear();

      const response = await fetch(`http://localhost:5000/api/payments/chart-data?month=${month}&year=${year}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('gymAdminToken')}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch chart data');

      const data = await response.json();
      this.renderPaymentChart(data.data);
    } catch (error) {
      console.error('Error loading payment chart:', error);
    }
  }

  renderPaymentChart(chartData) {
    const ctx = document.getElementById('paymentChart');
    if (!ctx) return;

    if (this.paymentChart) {
      this.paymentChart.destroy();
    }

    this.paymentChart = new Chart(ctx, {
      type: 'line',
      data: chartData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Payment Trends'
          },
          legend: {
            display: true,
            position: 'top'
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return '₹' + value.toLocaleString();
              }
            }
          }
        },
        interaction: {
          intersect: false,
          mode: 'index'
        }
      }
    });
  }

  async loadRecentPayments() {
    try {
      const response = await fetch('http://localhost:5000/api/payments/recent?limit=10', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('gymAdminToken')}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch recent payments');

      const data = await response.json();
      this.renderRecentPayments(data.data);
    } catch (error) {
      console.error('Error loading recent payments:', error);
    }
  }

  renderRecentPayments(payments) {
    const container = document.getElementById('recentPaymentsList');
    if (!container) return;

    if (payments.length === 0) {
      container.innerHTML = `
        <div class="payment-empty-state">
          <i class="fas fa-receipt"></i>
          <h3>No Recent Payments</h3>
          <p>No payment transactions found</p>
        </div>
      `;
      return;
    }

    container.innerHTML = payments.map(payment => {
      // Determine icon, color, and amount sign based on payment type
      let icon = 'plus', iconColor = '', amountClass = '', amountPrefix = '', iconHtml = '';
      if (payment.type === 'received') {
        icon = 'plus';
        iconColor = '#22c55e';
        amountClass = 'positive';
        amountPrefix = '+';
        iconHtml = `<i class="fas fa-plus"></i>`;
      } else if (payment.type === 'paid' || payment.type === 'due') {
        icon = 'minus';
        iconColor = '#ef4444';
        amountClass = 'negative';
        amountPrefix = '-';
        iconHtml = `<i class="fas fa-minus"></i>`;
      } else if (payment.type === 'pending') {
        icon = 'clock';
        iconColor = '#fbbf24';
        amountClass = 'pending';
        amountPrefix = '';
        iconHtml = `<i class="fas fa-clock"></i>`;
      }
      return `
        <div class="recent-payment-item">
          <div class="recent-payment-icon ${payment.type}" style="${payment.type === 'pending' ? 'background:#fbbf24;color:#fff;' : ''}">
            ${iconHtml}
          </div>
          <div class="recent-payment-info">
            <div class="recent-payment-title">${payment.description}</div>
            <div class="recent-payment-details">
              <span>${payment.category.replace('_', ' ').toUpperCase()}</span>
              <span>${payment.paymentMethod.toUpperCase()}</span>
              ${payment.memberName ? `<span>${payment.memberName}</span>` : ''}
            </div>
          </div>
          <div class="recent-payment-amount ${amountClass}" style="${payment.type === 'pending' ? 'color:#fbbf24;font-weight:600;' : ''}">
            ${amountPrefix}₹${this.formatAmount(payment.amount)}
          </div>
          <div class="recent-payment-time">
            ${this.formatTime(payment.createdAt)}
          </div>
        </div>
      `;
    }).join('');
  }

  async loadRecurringPayments() {
    try {
      // For recurring payments section, we only want to show pending payments (not completed ones)
      // Use 'pending' status to avoid getting paid/completed payments that create duplicates
      const statusFilter = this.currentFilter === 'all' ? 'pending' : this.currentFilter;
      
      const response = await fetch(`http://localhost:5000/api/payments/recurring?status=${statusFilter}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('gymAdminToken')}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch recurring payments');

      const data = await response.json();
      // Include recurring payments but exclude manual pending payments created via "Add Payment" modal
      // Only show true recurring obligations (rent, salaries, etc.) not one-time pending payments
      // Also apply 7-day filter for recurring payments and exclude completed/paid payments
      const now = new Date();
      const sevenDaysFromNow = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));
      
      const filtered = Array.isArray(data.data) ? data.data.filter(p => {
        // Double-check: Exclude ANY completed payments - be very explicit about this
        // Check both status and type to catch all possible completed payment states
        if (p.status === 'completed') {
          console.log(`Excluding completed payment: ${p.description} (status: ${p.status}, type: ${p.type})`);
          return false;
        }
        
        // Exclude payments that have been converted to paid/received types
        if (p.type === 'paid' || p.type === 'received') {
          console.log(`Excluding paid/received payment: ${p.description} (type: ${p.type})`);
          return false;
        }
        
        // Only show pending and due payments that haven't been completed
        if (p.type !== 'due' && p.type !== 'pending') {
          console.log(`Excluding non-due/pending payment: ${p.description} (type: ${p.type})`);
          return false;
        }
        
        // Ensure status is still pending (not completed)
        if (p.status !== 'pending') {
          console.log(`Excluding non-pending status payment: ${p.description} (status: ${p.status})`);
          return false;
        }
        
        // If it's recurring, only show if due within 7 days
        if (p.isRecurring === true) {
          const dueDate = new Date(p.dueDate);
          const withinTimeframe = dueDate <= sevenDaysFromNow;
          if (!withinTimeframe) {
            console.log(`Excluding recurring payment outside timeframe: ${p.description}`);
          }
          return withinTimeframe;
        }
        
        // For non-recurring payments from "Add Payment" modal, show only 'due' type payments
        // Exclude 'pending' type payments as these are usually member-related
        if (p.type === 'pending') {
          console.log(`Excluding manual pending payment: ${p.description}`);
          return false;
        }
        
        return true;
      }) : [];
      
      console.log(`Filtered recurring payments: ${filtered.length} items from ${data.data?.length || 0} total`);
      this.renderRecurringPayments(filtered);
    } catch (error) {
      console.error('Error loading recurring payments:', error);
    }
  }

  renderRecurringPayments(payments) {
    const container = document.getElementById('recurringPaymentsList');
    if (!container) return;

    if (payments.length === 0) {
      container.innerHTML = `
        <div class="payment-empty-state">
          <i class="fas fa-calendar-alt"></i>
          <h3>No Recurring Payments Due</h3>
          <p>No recurring payment obligations due within 7 days</p>
        </div>
      `;
      return;
    }

    // Final safety check: remove any completed/paid payments that somehow made it through
    const safetFilteredPayments = payments.filter(payment => {
      const isValid = payment.status === 'pending' && (payment.type === 'due' || payment.type === 'pending');
      if (!isValid) {
        console.warn(`Filtering out invalid payment in render: ${payment.description} (status: ${payment.status}, type: ${payment.type})`);
      }
      return isValid;
    });

    if (safetFilteredPayments.length === 0) {
      container.innerHTML = `
        <div class="payment-empty-state">
          <i class="fas fa-calendar-alt"></i>
          <h3>No Recurring Payments Due</h3>
          <p>No recurring payment obligations due within 7 days</p>
        </div>
      `;
      return;
    }

    // Add reminder badges to payments
    const paymentsWithReminders = this.renderPaymentWithReminders(safetFilteredPayments);

    container.innerHTML = paymentsWithReminders.map(payment => {
      const isOverdue = payment.dueDate && new Date(payment.dueDate) < new Date() && payment.status === 'pending';
      const isPending = payment.status === 'pending';
      const isCompleted = payment.status === 'completed';
      
      // Calculate days until due
      const dueDate = new Date(payment.dueDate);
      const now = new Date();
      const diffTime = dueDate - now;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Badge logic: show timer for pending, show paid for completed, special handling for recurring
      let statusBadge = '';
      if (isPending && isOverdue) {
        statusBadge = `<span class="recurring-badge overdue" style="background:#ffd6d6;color:#b71c1c;padding:2px 10px;border-radius:12px;font-size:0.85em;margin-left:8px;display:inline-flex;align-items:center;"><i class="fas fa-exclamation-triangle" style="margin-right:4px;"></i> Overdue</span>`;
      } else if (isPending && diffDays <= 7) {
        if (diffDays <= 0) {
          statusBadge = `<span class="recurring-badge critical" style="background:#ff6b6b;color:#fff;padding:2px 10px;border-radius:12px;font-size:0.85em;margin-left:8px;display:inline-flex;align-items:center;"><i class="fas fa-bell" style="margin-right:4px;"></i> Due ${diffDays === 0 ? 'Today' : `${Math.abs(diffDays)} days ago`}</span>`;
        } else if (diffDays === 1) {
          statusBadge = `<span class="recurring-badge urgent" style="background:#ff9500;color:#fff;padding:2px 10px;border-radius:12px;font-size:0.85em;margin-left:8px;display:inline-flex;align-items:center;"><i class="fas fa-clock" style="margin-right:4px;"></i> Due Tomorrow</span>`;
        } else {
          statusBadge = `<span class="recurring-badge pending" style="background:#ffe066;color:#a67c00;padding:2px 10px;border-radius:12px;font-size:0.85em;margin-left:8px;display:inline-flex;align-items:center;"><i class="fas fa-clock" style="margin-right:4px;"></i> Due in ${diffDays} days</span>`;
        }
      } else if (isPending) {
        statusBadge = `<span class="recurring-badge pending" style="background:#ffe066;color:#a67c00;padding:2px 10px;border-radius:12px;font-size:0.85em;margin-left:8px;display:inline-flex;align-items:center;"><i class="fas fa-clock" style="margin-right:4px;"></i> Pending</span>`;
      }

      // Add recurring indicator
      const recurringIndicator = payment.isRecurring ? 
        `<span class="recurring-indicator" style="background:#e3f2fd;color:#1976d2;padding:1px 6px;border-radius:8px;font-size:0.75em;margin-left:6px;"><i class="fas fa-sync-alt" style="margin-right:2px;"></i> Recurring</span>` : '';

      return `
        <div class="recurring-payment-item ${isOverdue ? 'overdue' : isPending ? 'pending' : 'completed'}" data-payment-id="${payment._id}">
          <div class="payment-item-info">
            <div class="payment-item-title">
              ${payment.description}
              ${recurringIndicator}
              ${statusBadge}
            </div>
            <div class="payment-item-details">
              <span>${this.getCategoryDisplayName(payment.category)}</span>
              <span>Due: ${payment.dueDate ? this.formatDate(payment.dueDate) : 'N/A'}</span>
              <span class="status-${payment.status}">${payment.status.toUpperCase()}</span>
              ${payment.isRecurring ? `<span style="color:#1976d2;">• Monthly Recurring</span>` : ''}
            </div>
          </div>
          <div class="payment-item-amount">₹${this.formatAmount(payment.amount)}</div>
          <div class="payment-item-actions">
            ${payment.status === 'pending' ? `
              <button class="payment-action-btn mark-paid" data-action="mark-paid" data-payment-id="${payment._id}">
                <i class="fas fa-check"></i> Mark Paid
              </button>
            ` : ''}
            <button class="payment-action-btn edit" data-action="edit" data-payment-id="${payment._id}">
              <i class="fas fa-edit"></i> Edit
            </button>
            <button class="payment-action-btn delete" data-action="delete" data-payment-id="${payment._id}">
              <i class="fas fa-trash"></i> Delete
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  // Legacy method - now replaced by loadAllPendingPayments()
  // This method is kept for compatibility but redirects to the unified loader
  async loadMemberPendingPayments() {
    console.log('loadMemberPendingPayments called - redirecting to unified loader');
    // Just call the unified loader instead of doing separate member loading
    await this.loadAllPendingPayments();
  }

  renderMemberPendingPayments(members) {
    const container = document.getElementById('pendingPaymentsList');
    if (!container) {
      console.warn('Pending payments container not found');
      return;
    }

    console.log('Members with pending payments:', members);

    if (members.length === 0) {
      container.innerHTML = `
        <div class="payment-empty-state">
          <i class="fas fa-user-clock"></i>
          <h3>No Pending Member Payments</h3>
          <p>All member payments are up to date</p>
        </div>
      `;
      return;
    }

    // Sort members: overdue first, then by days remaining if available
    members.sort((a, b) => {
      const aDays = a.daysRemaining !== undefined ? a.daysRemaining : 9999;
      const bDays = b.daysRemaining !== undefined ? b.daysRemaining : 9999;
      if (aDays < 0 && bDays >= 0) return -1;
      if (aDays >= 0 && bDays < 0) return 1;
      if (aDays < 0 && bDays < 0) return aDays - bDays;
      return aDays - bDays;
    });

    // Store for modal
    this.recentMemberPendingPayments = members;

    // Optimized card layout for perfect space usage
    container.innerHTML = members.map(member => {
      const isOverdue = member.daysRemaining < 0;
      const pendingAmount = this.calculateMemberPendingAmount(member);
      const profileImg = member.profileImage && member.profileImage !== ''
        ? member.profileImage.startsWith('http') ? member.profileImage : `${member.profileImage}`
        : 'https://ui-avatars.com/api/?name=' + encodeURIComponent(member.memberName || 'Member') + '&background=0D8ABC&color=fff&size=64';

      let statusBadge = '';
      if (isOverdue) {
        statusBadge = `<span class="member-payment-badge overdue"><i class="fas fa-exclamation-triangle"></i> Overdue${member.daysRemaining !== undefined ? ` ${Math.abs(member.daysRemaining)} days` : ''}</span>`;
      } else if (member.daysRemaining === 0) {
        statusBadge = `<span class="member-payment-badge critical"><i class="fas fa-clock"></i> Expires TODAY</span>`;
      } else if (member.daysRemaining === 1) {
        statusBadge = `<span class="member-payment-badge urgent"><i class="fas fa-clock"></i> Expires TOMORROW</span>`;
      } else if (member.daysRemaining > 1) {
        statusBadge = `<span class="member-payment-badge pending"><i class="fas fa-clock"></i> Expires in ${member.daysRemaining} days</span>`;
      } else {
        statusBadge = `<span class="member-payment-badge pending"><i class="fas fa-clock"></i> Pending</span>`;
      }

      const dueDate = member.membershipValidUntil ? new Date(member.membershipValidUntil).toLocaleDateString() : 'N/A';

      return `
        <div class="member-payment-item compact-card ${isOverdue ? 'overdue' : member.daysRemaining <= 1 ? 'critical' : 'pending'}" data-member-id="${member._id}"
          style="display:flex;align-items:center;gap:0;padding:0 0 0 0;margin-bottom:12px;background:#fff;border-radius:12px;box-shadow:0 2px 8px #0001;transition:box-shadow .2s;cursor:pointer;min-height:68px;overflow:hidden;">
          <div class="member-payment-avatar"
            style="flex:0 0 44px;width:44px;height:44px;margin:0 14px 0 10px;border-radius:50%;overflow:hidden;box-shadow:0 1px 4px #0002;background:#f3f4f6;display:flex;align-items:center;justify-content:center;">
            <img src="${profileImg}" alt="Profile" style="width:100%;height:100%;object-fit:cover;" onerror="this.onerror=null;this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(member.memberName || 'Member')}&background=0D8ABC&color=fff&size=64';">
          </div>
          <div class="member-payment-info"
            style="flex:1;min-width:0;display:flex;flex-direction:column;gap:0;justify-content:center;">
            <div style="display:flex;align-items:center;gap:8px;">
              <span class="member-payment-name" style="font-weight:600;font-size:1.04em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:120px;">${member.memberName}</span>
              <span style="font-size:0.85em;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:80px;">${member.planSelected || 'N/A'}</span>
              <span style="font-size:0.85em;color:#bdbdbd;">|</span>
              <span style="font-size:0.85em;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:60px;">${member.monthlyPlan || 'N/A'}</span>
            </div>
            <div style="display:flex;align-items:center;gap:10px;margin-top:2px;">
              <span style="font-size:0.82em;color:#6b7280;"><i class="fas fa-calendar-alt"></i> ${dueDate}</span>
              <span style="font-size:0.82em;color:#6b7280;"><i class="fas fa-id-card"></i> ${member.membershipId || 'N/A'}</span>
            </div>
            <div style="margin-top:2px;">${statusBadge}</div>
          </div>
          <div class="member-payment-amount"
            style="flex:0 0 70px;text-align:right;display:flex;flex-direction:column;align-items:flex-end;justify-content:center;gap:2px;">
            <div class="amount-value" style="font-weight:700;font-size:1.08em;line-height:1.1;">₹${this.formatAmount(pendingAmount)}</div>
            <div class="amount-label" style="font-size:0.82em;color:#ef4444;font-weight:500;">Pending</div>
          </div>
          <div class="member-payment-actions"
            style="flex:0 0 82px;display:flex;flex-direction:column;gap:4px;align-items:flex-end;justify-content:center;padding-right:10px;">
            <button class="payment-action-btn mark-paid mark-paid-btn" data-action="mark-member-paid" data-member-id="${member._id}" data-source="payment-tab" title="Mark as Paid"
              style="background:#22c55e;color:#fff;border:none;border-radius:6px;padding:3px 8px;font-size:0.93em;display:flex;align-items:center;gap:4px;transition:background .2s;cursor:pointer;min-width:60px;"><i class="fas fa-check"></i> Paid</button>
            <button class="payment-action-btn remind" data-action="remind-member" data-member-id="${member._id}" title="Send Reminder"
              style="background:#fbbf24;color:#fff;border:none;border-radius:6px;padding:3px 8px;font-size:0.93em;display:flex;align-items:center;gap:4px;transition:background .2s;cursor:pointer;min-width:60px;"><i class="fas fa-bell"></i> Remind</button>
            <button class="payment-action-btn allowance seven-day-allowance-btn" data-action="grant-allowance" data-member-id="${member._id}" title="Grant 7-Day Allowance"
              style="background:#3b82f6;color:#fff;border:none;border-radius:6px;padding:3px 8px;font-size:0.93em;display:flex;align-items:center;gap:4px;transition:background .2s;cursor:pointer;min-width:60px;"><i class="fas fa-calendar-plus"></i> 7-Day</button>
          </div>
        </div>
      `;
    }).join('');

    // Do NOT update member pending stats here - this is handled by loadAllPendingPayments()
    // this.updateMemberPendingStats(members); // Commented out to prevent stat card conflicts
  }

  calculateMemberPendingAmount(member) {
    // First, try to get amount from specific payment amount fields
    if (member.paymentAmount && member.paymentAmount > 0) {
      return member.paymentAmount;
    }
    
    if (member.pendingPaymentAmount && member.pendingPaymentAmount > 0) {
      return member.pendingPaymentAmount;
    }
    
    // Try to get from renewal amount fields
    if (member.renewalAmount && member.renewalAmount > 0) {
      return member.renewalAmount;
    }
    
    // Fallback calculation based on plan and duration
    const plan = (member.planSelected || '').toLowerCase();
    const duration = (member.monthlyPlan || '').toLowerCase();
    
    // More detailed plan-based calculation
    let baseAmount = 1200; // Default amount
    
    if (plan.includes('premium') || plan.includes('vip')) {
      if (duration.includes('12') || duration.includes('year')) {
        baseAmount = 18000; // 12 months premium
      } else if (duration.includes('6')) {
        baseAmount = 9000; // 6 months premium
      } else if (duration.includes('3')) {
        baseAmount = 4500; // 3 months premium
      } else {
        baseAmount = 1500; // 1 month premium
      }
    } else if (plan.includes('basic') || plan.includes('standard')) {
      if (duration.includes('12') || duration.includes('year')) {
        baseAmount = 12000; // 12 months basic
      } else if (duration.includes('6')) {
        baseAmount = 6000; // 6 months basic
      } else if (duration.includes('3')) {
        baseAmount = 3000; // 3 months basic
      } else {
        baseAmount = 1000; // 1 month basic
      }
    } else if (plan.includes('student') || plan.includes('discount')) {
      if (duration.includes('12') || duration.includes('year')) {
        baseAmount = 9600; // 12 months student
      } else if (duration.includes('6')) {
        baseAmount = 4800; // 6 months student
      } else if (duration.includes('3')) {
        baseAmount = 2400; // 3 months student
      } else {
        baseAmount = 800; // 1 month student
      }
    } else {
      // Default amounts for unrecognized plans
      if (duration.includes('12') || duration.includes('year')) {
        baseAmount = 14400; // 12 months default
      } else if (duration.includes('6')) {
        baseAmount = 7200; // 6 months default
      } else if (duration.includes('3')) {
        baseAmount = 3600; // 3 months default
      } else {
        baseAmount = 1200; // 1 month default
      }
    }
    
    return baseAmount;
  }

  updateMemberPendingStats(members) {
    // Calculate total pending amount from members
    let totalPendingFromMembers = 0;
    
    members.forEach(member => {
      const pendingAmount = this.calculateMemberPendingAmount(member);
      totalPendingFromMembers += pendingAmount;
    });

    // Update the pending stat card to include member pending payments
    this.updatePendingStatWithMembers(totalPendingFromMembers, members.length);
  }

  updatePendingStatWithMembers(memberPendingAmount, memberCount) {
    // Store member pending payments but do NOT update stat card here
    // The stat card should only be updated by updateCombinedPendingStatCard() called from loadAllPendingPayments()
    this.memberPendingAmount = memberPendingAmount;
    console.log(`updatePendingStatWithMembers called with ${memberPendingAmount}, but NOT updating stat card to prevent conflicts`);
    // this.updateCombinedPendingStatCard(); // Disabled to prevent conflicts
    // Optionally, show the member count somewhere if needed (not required for just the amount)
  }

  updateCombinedPendingStatCard() {
    // Show the sum of regular and member pending payments
    const totalPending = (this.regularPendingAmount || 0) + (this.memberPendingAmount || 0);
    console.log(`Updating combined pending stat card: regular=${this.regularPendingAmount}, member=${this.memberPendingAmount}, total=${totalPending}`);
    const pendingCard = document.querySelector('.payment-stat-card.pending');
    if (pendingCard) {
      const valueDiv = pendingCard.querySelector('.payment-stat-value');
      if (valueDiv) {
        valueDiv.textContent = `₹${this.formatAmount(totalPending)}`;
      }
    }
  }

  // Handle manual payment actions (mark as paid, etc.)
  async handleManualPaymentAction(action, paymentId) {
    if (action === 'mark-paid') {
      try {
        // Show loading state
        const button = document.querySelector(`[data-payment-id="${paymentId}"]`);
        if (button) {
          button.disabled = true;
          button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        }

        // Mark payment as paid in backend
        const response = await fetch(`http://localhost:5000/api/payments/${paymentId}/mark-paid`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('gymAdminToken')}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error('Failed to mark payment as paid');
        }

        const result = await response.json();
        
        // Show success message
        this.showSuccess('Payment marked as paid successfully!');

        // Refresh payment data to update stats and lists
        await Promise.all([
          this.forceRefreshStats(),
          this.loadAllPendingPayments()
        ]);
        
      } catch (error) {
        console.error('Error marking manual payment as paid:', error);
        this.showError('Failed to mark payment as paid: ' + error.message);
        
        // Reset button state
        const button = document.querySelector(`[data-payment-id="${paymentId}"]`);
        if (button) {
          button.disabled = false;
          button.innerHTML = '<i class="fas fa-check"></i> Mark Paid';
        }
      }
    }
  }

  // Enhanced member payment action handler with membership renewal
  async handleMemberPaymentAction(action, memberId) {
    if (action === 'mark-paid') {
      try {
        // Show loading state
        const button = document.querySelector(`[data-member-id="${memberId}"]`);
        if (button) {
          button.disabled = true;
          button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        }

        // Get member details first
        const memberResponse = await fetch(`http://localhost:5000/api/members/${memberId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('gymAdminToken')}`
          }
        });

        if (!memberResponse.ok) {
          throw new Error('Failed to fetch member details');
        }

        const member = await memberResponse.json();
        
        // Calculate new membership dates
        const today = new Date();
        const currentValidUntil = member.membershipValidUntil ? new Date(member.membershipValidUntil) : today;
        
        // If membership is expired, start from today + 7 days allowance, otherwise extend from current date
        const startDate = currentValidUntil < today ? 
          new Date(today.getTime() + (7 * 24 * 60 * 60 * 1000)) : // 7 days from today
          new Date(currentValidUntil.getTime() + (7 * 24 * 60 * 60 * 1000)); // 7 days from current expiry

        // Calculate end date based on plan duration
        let endDate = new Date(startDate);
        const duration = (member.monthlyPlan || '').toLowerCase();
        
        if (duration.includes('12') || duration.includes('year')) {
          endDate.setFullYear(endDate.getFullYear() + 1);
        } else if (duration.includes('6')) {
          endDate.setMonth(endDate.getMonth() + 6);
        } else if (duration.includes('3')) {
          endDate.setMonth(endDate.getMonth() + 3);
        } else {
          endDate.setMonth(endDate.getMonth() + 1); // Default 1 month
        }

        // Update member payment status and renewal dates
        const updateResponse = await fetch(`http://localhost:5000/api/members/${memberId}/renew-membership`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('gymAdminToken')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            paymentStatus: 'paid',
            membershipValidUntil: endDate.toISOString(),
            membershipStartDate: startDate.toISOString(),
            pendingPaymentAmount: 0,
            paymentAmount: this.calculateMemberPendingAmount(member),
            lastPaymentDate: new Date().toISOString()
          })
        });

        if (!updateResponse.ok) {
          throw new Error('Failed to update member payment status');
        }

        // Send email notification to member
        try {
          await fetch('http://localhost:5000/api/members/send-renewal-email', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('gymAdminToken')}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              memberId: memberId,
              memberEmail: member.email,
              memberName: member.memberName,
              planSelected: member.planSelected,
              monthlyPlan: member.monthlyPlan,
              amount: this.calculateMemberPendingAmount(member),
              validUntil: endDate.toISOString(),
              startDate: startDate.toISOString()
            })
          });
        } catch (emailError) {
          console.warn('Email notification failed:', emailError);
          // Don't fail the whole operation if email fails
        }

        // Show success message
        this.showSuccess(
          `Membership renewed successfully! New expiry: ${endDate.toLocaleDateString()}`
        );

        // Refresh payment data to update stats and lists
        await Promise.all([
          this.forceRefreshStats(),
          this.loadAllPendingPayments()
        ]);
        
      } catch (error) {
        console.error('Error marking member payment as paid:', error);
        this.showError('Failed to process payment: ' + error.message);
        
        // Reset button state
        const button = document.querySelector(`[data-member-id="${memberId}"]`);
        if (button) {
          button.disabled = false;
          button.innerHTML = '<i class="fas fa-check"></i> Mark Paid';
        }
      }
    } else if (action === 'remind') {
      // Handle remind action (existing functionality)
      console.log('Remind member:', memberId);
    } else if (action === 'grant-allowance') {
      // Handle grant allowance action (existing functionality)
      console.log('Grant allowance to member:', memberId);
    }
  }

  addMemberPendingPaymentsToList(members) {
    if (!members || members.length === 0) return;

    const container = document.getElementById('recurringPaymentsList');
    if (!container) return;

    // Filter for members with expired or expiring memberships (pending payments)
    const membersWithPending = members.filter(member => {
      // Consider all expiring/expired members as having pending payments
      return member.daysRemaining <= 7; // Show members expiring within 7 days or already expired
    });

    if (membersWithPending.length === 0) return;

    // Helper function to calculate pending payment amount
    const calculatePendingAmount = (member) => {
      // Try to get amount from existing paymentAmount field
      if (member.paymentAmount && member.paymentAmount > 0) {
        return member.paymentAmount;
      }
      
      // Try to get from pendingPaymentAmount field
      if (member.pendingPaymentAmount && member.pendingPaymentAmount > 0) {
        return member.pendingPaymentAmount;
      }
      
      // Fallback: estimate based on plan
      const plan = member.planSelected || '';
      const duration = member.monthlyPlan || '';
      
      // Basic estimation (you can adjust these values)
      if (plan.toLowerCase().includes('premium')) {
        return duration.includes('3') ? 4500 : 1500; // 3 months or 1 month
      } else if (plan.toLowerCase().includes('basic')) {
        return duration.includes('3') ? 3000 : 1000;
      } else {
        return duration.includes('3') ? 3600 : 1200; // Default amounts
      }
    };

    // Create pending payment items for these members
    const memberPaymentItems = membersWithPending.map(member => {
      const isOverdue = member.daysRemaining < 0;
      const isPending = !isOverdue;
      const pendingAmount = calculatePendingAmount(member);
      
      let statusBadge = '';
      if (isOverdue) {
        statusBadge = `<span class="recurring-badge overdue" style="background:#ffd6d6;color:#b71c1c;padding:2px 10px;border-radius:12px;font-size:0.85em;margin-left:8px;display:inline-flex;align-items:center;"><i class="fas fa-exclamation-triangle" style="margin-right:4px;"></i> Overdue ${Math.abs(member.daysRemaining)} days</span>`;
      } else {
        statusBadge = `<span class="recurring-badge pending" style="background:#ffe066;color:#a67c00;padding:2px 10px;border-radius:12px;font-size:0.85em;margin-left:8px;display:inline-flex;align-items:center;"><i class="fas fa-clock" style="margin-right:4px;"></i> Expires in ${member.daysRemaining} days</span>`;
      }

      const dueDate = member.membershipValidUntil ? new Date(member.membershipValidUntil).toLocaleDateString() : 'N/A';
      
      return `
        <div class="recurring-payment-item member-pending ${isOverdue ? 'overdue' : 'pending'}" data-member-id="${member._id}">
          <div class="payment-item-info">
            <div class="payment-item-title">
              <i class="fas fa-user" style="margin-right:6px;color:#3b82f6;"></i>
              ${member.memberName} - Membership Renewal
              ${statusBadge}
            </div>
            <div class="payment-item-details">
              <span>Membership</span>
              <span>Due: ${dueDate}</span>
              <span>Plan: ${member.planSelected || 'N/A'} (${member.monthlyPlan || 'N/A'})</span>
              <span class="status-pending">PENDING FROM MEMBER</span>
            </div>
          </div>
          <div class="payment-item-amount">₹${this.formatAmount(pendingAmount)}</div>
          <div class="payment-item-actions">
            <button class="payment-action-btn mark-paid mark-paid-btn" data-action="mark-member-paid" data-member-id="${member._id}">
              <i class="fas fa-check"></i> Mark Paid
            </button>
            <button class="payment-action-btn edit" data-action="remind-member" data-member-id="${member._id}">
              <i class="fas fa-bell"></i> Remind
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Add member pending payments to the existing content
    if (memberPaymentItems) {
      const existingContent = container.innerHTML;
      
      // Check if we already have an empty state message
      if (existingContent.includes('payment-empty-state')) {
        container.innerHTML = memberPaymentItems;
      } else {
        // Add a separator and then the member payments
        const separator = `
          <div class="payment-section-separator" style="margin:20px 0;padding:10px;background:#f8f9fa;border-radius:8px;text-align:center;font-weight:600;color:#6b7280;">
            <i class="fas fa-users" style="margin-right:8px;"></i>
            Member Pending Payments
          </div>
        `;
        container.innerHTML = existingContent + separator + memberPaymentItems;
      }
    }
  }

  showAddPaymentModal() {
    const modal = document.getElementById('addPaymentModal');
    if (modal) {
      modal.classList.add('active');
      this.populateYearSelect();
      this.resetCategorySelection();
      // Hide member name field initially until category is selected
      this.toggleMemberNameField('');
      // Add or update payment type info message as a horizontal bar above all fields
      setTimeout(() => {
        const form = document.getElementById('addPaymentForm');
        if (!form) return;
        let infoMsg = document.getElementById('paymentTypeInfoMsg');
        if (!infoMsg) {
          infoMsg = document.createElement('div');
          infoMsg.id = 'paymentTypeInfoMsg';
          infoMsg.style.margin = '0 0 18px 0';
          infoMsg.style.background = '#e0f7fa';
          infoMsg.style.borderLeft = '5px solid #06b6d4';
          infoMsg.style.color = '#036672';
          infoMsg.style.padding = '10px 18px 10px 14px';
          infoMsg.style.borderRadius = '6px';
          infoMsg.style.fontSize = '1rem';
          infoMsg.style.display = 'flex';
          infoMsg.style.alignItems = 'center';
          infoMsg.style.gap = '14px';
          infoMsg.style.boxShadow = '0 2px 8px rgba(6,182,212,0.07)';
          infoMsg.innerHTML = `
            <i class="fas fa-info-circle" style="font-size:1.3em;"></i>
            <span id="paymentTypeInfoText" style="display:flex;flex-wrap:wrap;gap:18px;align-items:center;">
              <span><b>Received</b>: For payments received from members (e.g., membership, personal training, etc)</span>
              <span><b>Paid</b>: For payments made by the gym (e.g., rent, salaries, vendor payments, etc)</span>
              <span><b>Due</b>: For upcoming payments the gym needs to make (e.g., scheduled rent, bills, etc)</span>
              <span><b>Pending</b>: For payments expected from members but not yet received (e.g., expiring/expired memberships, pending fees, etc)</span>
            </span>
          `;
        }
        // Insert at the very top of the form, above all fields
        if (form.firstChild !== infoMsg) {
          form.insertBefore(infoMsg, form.firstChild);
        }
        // Enhance recurring payment checkbox
        this.enhanceRecurringCheckbox();
      }, 100); // Increased timeout to ensure DOM is ready
    }
  }

  handleCategorySelection(categoryItem) {
    // Remove previous selection
    document.querySelectorAll('.payment-category-item').forEach(item => {
      item.classList.remove('selected');
    });

    // Add selection to clicked item
    categoryItem.classList.add('selected');
    
    // Update hidden input
    const categoryValue = categoryItem.dataset.category;
    const hiddenInput = document.getElementById('paymentCategory');
    if (hiddenInput) {
      hiddenInput.value = categoryValue;
    }

    // Show/hide member name field based on category
    this.toggleMemberNameField(categoryValue);

    // Hide error message if any
    const errorDiv = document.getElementById('categoryError');
    if (errorDiv) {
      errorDiv.style.display = 'none';
    }
  }

  // Show member field only for membership and personal_training categories
  toggleMemberNameField(category) {
    const memberNameGroup = document.querySelector('#memberName')?.closest('.payment-form-group');
    const memberNameInput = document.getElementById('memberName');
    // Change label to 'Person Name' if present
    if (memberNameGroup) {
      const label = memberNameGroup.querySelector('label');
      if (label && label.textContent.trim().toLowerCase().includes('member name')) {
        label.textContent = label.textContent.replace(/member name/i, 'Person Name');
      }
    }
    const memberSelect = document.getElementById('memberSelect');
    const selectedMemberIdInput = document.getElementById('selectedMemberId');
    
    if (memberNameGroup && memberNameInput && memberSelect) {
      // Only show member field for membership and personal_training categories
      if (category === 'membership' || category === 'personal_training') {
        memberNameGroup.style.display = 'flex';
        const paymentType = document.getElementById('paymentType')?.value || 'received';
        
        if (paymentType === 'pending' || paymentType === 'due') {
          // For pending/due payments, show dropdown with expiring members
          memberNameInput.style.display = 'none';
          memberSelect.style.display = 'block';
          memberSelect.required = true;
          memberNameInput.required = false;
          this.loadExpiringMembersForDropdown();
        } else {
          // For received payments, show text input
          memberNameInput.style.display = 'block';
          memberSelect.style.display = 'none';
          memberNameInput.required = true;
          memberSelect.required = false;
        }
      } else {
        // Hide member field for all other categories
        memberNameGroup.style.display = 'none';
        memberNameInput.required = false;
        memberSelect.required = false;
        memberNameInput.value = '';
        memberSelect.value = '';
        if (selectedMemberIdInput) selectedMemberIdInput.value = '';
      }
    }
  }

  // Enhanced interactive recurring payment checkbox with tooltip and animations
  enhanceRecurringCheckbox() {
    setTimeout(() => {
      const recurringGroup = document.querySelector('#isRecurring')?.closest('.payment-form-group');
      const recurringCheckbox = document.getElementById('isRecurring');
      
      if (!recurringGroup || !recurringCheckbox) {
        console.warn('Recurring checkbox elements not found');
        return;
      }
      
      // Check if already enhanced to avoid duplicates
      if (recurringGroup.querySelector('.recurring-info-wrapper')) {
        console.log('Recurring checkbox already enhanced');
        return;
      }
      
      // Create wrapper for better organization
      const wrapper = document.createElement('div');
      wrapper.className = 'recurring-info-wrapper';
      wrapper.style.display = 'flex';
      wrapper.style.alignItems = 'center';
      wrapper.style.gap = '12px';
      wrapper.style.marginTop = '8px';
      
      // Create interactive info button
      const infoButton = document.createElement('button');
      infoButton.type = 'button';
      infoButton.className = 'recurring-info-btn';
      infoButton.style.cssText = `
        background: linear-gradient(135deg, #0ea5e9, #06b6d4);
        border: none;
        border-radius: 20px;
        color: white;
        cursor: pointer;
        font-size: 0.85em;
        padding: 6px 14px;
        display: flex;
        align-items: center;
        gap: 6px;
        transition: all 0.3s ease;
        box-shadow: 0 2px 8px rgba(6, 182, 212, 0.3);
        font-weight: 500;
        transform: scale(1);
      `;
      infoButton.innerHTML = '<i class="fas fa-sync-alt"></i> What is recurring payment?';
      
      // Create tooltip
      const tooltip = document.createElement('div');
      tooltip.className = 'recurring-tooltip';
      tooltip.style.cssText = `
        position: absolute;
        background: #1e293b;
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        font-size: 0.9em;
        max-width: 320px;
        box-shadow: 0 8px 25px rgba(0,0,0,0.2);
        z-index: 1000;
        opacity: 0;
        visibility: hidden;
        transition: all 0.3s ease;
        transform: translateY(-10px);
        pointer-events: none;
        line-height: 1.4;
      `;
      tooltip.innerHTML = `
        <div style="font-weight: 600; margin-bottom: 6px; color: #06b6d4;">
          <i class="fas fa-info-circle"></i> Recurring Payments
        </div>
        <div>
          Recurring payments are automatically repeated at regular intervals (monthly, quarterly, yearly).
          <br><br>
          <strong>Examples:</strong>
          <ul style="margin: 8px 0; padding-left: 16px;">
            <li>Monthly gym rent</li>
            <li>Staff salaries</li>
            <li>Equipment maintenance</li>
            <li>Utility bills</li>
          </ul>
        </div>
      `;
      
      // Create status indicator
      const statusIndicator = document.createElement('span');
      statusIndicator.className = 'recurring-status';
      statusIndicator.style.cssText = `
        font-size: 0.85em;
        padding: 4px 10px;
        border-radius: 12px;
        font-weight: 500;
        transition: all 0.3s ease;
        background: #f1f5f9;
        color: #64748b;
        border: 1px solid #e2e8f0;
      `;
      statusIndicator.textContent = 'One-time payment';
      
      // Add hover effects for info button
      infoButton.addEventListener('mouseenter', () => {
        infoButton.style.transform = 'scale(1.05)';
        infoButton.style.boxShadow = '0 4px 15px rgba(6, 182, 212, 0.4)';
        infoButton.style.background = 'linear-gradient(135deg, #0284c7, #0891b2)';
      });
      
      infoButton.addEventListener('mouseleave', () => {
        infoButton.style.transform = 'scale(1)';
        infoButton.style.boxShadow = '0 2px 8px rgba(6, 182, 212, 0.3)';
        infoButton.style.background = 'linear-gradient(135deg, #0ea5e9, #06b6d4)';
      });
      
      // Show/hide tooltip with better positioning
      infoButton.addEventListener('mouseenter', () => {
        try {
          const rect = infoButton.getBoundingClientRect();
          tooltip.style.left = `${rect.left}px`;
          tooltip.style.top = `${rect.top - tooltip.offsetHeight - 10}px`;
          tooltip.style.opacity = '1';
          tooltip.style.visibility = 'visible';
          tooltip.style.transform = 'translateY(0)';
        } catch (error) {
          console.warn('Error positioning tooltip:', error);
        }
      });
      
      infoButton.addEventListener('mouseleave', () => {
        tooltip.style.opacity = '0';
        tooltip.style.visibility = 'hidden';
        tooltip.style.transform = 'translateY(-10px)';
      });
      
      // Add click effect
      infoButton.addEventListener('click', () => {
        infoButton.style.transform = 'scale(0.95)';
        setTimeout(() => {
          infoButton.style.transform = 'scale(1.05)';
        }, 100);
      });
      
      // Listen to checkbox changes to update status
      recurringCheckbox.addEventListener('change', () => {
        if (recurringCheckbox.checked) {
          statusIndicator.style.background = 'linear-gradient(135deg, #dcfdf4, #a7f3d0)';
          statusIndicator.style.color = '#065f46';
          statusIndicator.style.border = '1px solid #10b981';
          statusIndicator.innerHTML = '<i class="fas fa-sync-alt"></i> Recurring payment';
        } else {
          statusIndicator.style.background = '#f1f5f9';
          statusIndicator.style.color = '#64748b';
          statusIndicator.style.border = '1px solid #e2e8f0';
          statusIndicator.innerHTML = 'One-time payment';
        }
      });
      
      // Assemble the enhanced UI
      wrapper.appendChild(infoButton);
      wrapper.appendChild(statusIndicator);
      recurringGroup.appendChild(wrapper);
      document.body.appendChild(tooltip);
      
      console.log('Recurring checkbox enhancement completed successfully');
    }, 200); // Increased timeout to ensure DOM is ready
  }

  hideAddPaymentModal() {
    const modal = document.getElementById('addPaymentModal');
    if (modal) {
      modal.classList.remove('active');
      this.resetPaymentForm();
    }
  }

  toggleRecurringDetails(show) {
    const recurringDetails = document.getElementById('recurringDetails');
    if (recurringDetails) {
      recurringDetails.classList.toggle('active', show);
    }
  }

  handlePaymentTypeChange(paymentType) {
    const dueDateGroup = document.querySelector('#paymentDueDate')?.closest('.payment-form-group');
    const dueDateInput = document.getElementById('paymentDueDate');
    const recurringGroup = document.querySelector('#isRecurring')?.closest('.payment-form-group');
    
    if (dueDateGroup && dueDateInput && recurringGroup) {
      if (paymentType === 'paid' || paymentType === 'due') {
        // Show due date and recurring options for payments we need to make or are due
        dueDateGroup.style.display = 'flex';
        recurringGroup.style.display = 'flex';
        dueDateInput.required = true;
      } else if (paymentType === 'pending') {
        // Show due date, but hide recurring for pending payments
        dueDateGroup.style.display = 'flex';
        recurringGroup.style.display = 'none';
        dueDateInput.required = true;
        // Also hide recurring details if shown
        const recurringCheckbox = document.getElementById('isRecurring');
        if (recurringCheckbox) {
          recurringCheckbox.checked = false;
          this.toggleRecurringDetails(false);
        }
      } else {
        // Hide due date and recurring options for received payments
        dueDateGroup.style.display = 'none';
        recurringGroup.style.display = 'none';
        dueDateInput.required = false;
        dueDateInput.value = '';
        // Also hide recurring details if shown
        const recurringCheckbox = document.getElementById('isRecurring');
        if (recurringCheckbox) {
          recurringCheckbox.checked = false;
          this.toggleRecurringDetails(false);
        }
      }
    }
    
    // Update member field display based on payment type and category
    const categoryInput = document.getElementById('paymentCategory');
    if (categoryInput && categoryInput.value) {
      this.toggleMemberNameField(categoryInput.value);
    }
  }

  async handlePaymentFormSubmit() {
    // Validate category selection first
    if (!this.validateCategorySelection()) {
      this.showError('Please select a payment category');
      return;
    }

    const form = document.getElementById('addPaymentForm');
    const formData = new FormData(form);
    
    const paymentData = {
      type: formData.get('type'),
      category: this.mapCategoryToBackend(formData.get('category')), // Map to backend accepted values
      amount: parseFloat(formData.get('amount')),
      description: formData.get('description'),
      memberName: formData.get('memberName'),
      memberId: formData.get('memberId') || document.getElementById('selectedMemberId')?.value || null,
      paymentMethod: formData.get('paymentMethod'),
      isRecurring: formData.get('isRecurring') === 'on',
      dueDate: formData.get('dueDate'),
      notes: formData.get('notes')
    };

    // Remove empty strings to prevent validation errors
    if (!paymentData.memberId || paymentData.memberId.trim() === '') {
      delete paymentData.memberId;
    }
    if (!paymentData.memberName || paymentData.memberName.trim() === '') {
      delete paymentData.memberName;
    }

    if (paymentData.isRecurring) {
      paymentData.recurringDetails = {
        frequency: formData.get('frequency'),
        nextDueDate: formData.get('nextDueDate') || formData.get('dueDate') // Use due date as next due date if not specified
      };
    }

    try {
      const response = await fetch('http://localhost:5000/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('gymAdminToken')}`
        },
        body: JSON.stringify(paymentData)
      });

      if (!response.ok) throw new Error('Failed to add payment');

      const result = await response.json();
      this.showSuccess('Payment added successfully');
      this.hideAddPaymentModal();
      this.loadPaymentData();
      
      // Handle notifications based on payment type and recurring status
      try {
        const notificationManager = await this.waitForNotificationManager(2000);
        if (notificationManager) {
          if (paymentData.type === 'received') {
            // Payment received notification (green) - using enhanced notification system
            await notificationManager.notifyPayment(
              paymentData.memberName || 'Manual Entry',
              paymentData.amount,
              'success'
            );
          } else if ((paymentData.type === 'paid' || paymentData.type === 'due') && paymentData.dueDate) {
            // Payment due notification (yellow/warning) - using enhanced notification system
            const dueDate = new Date(paymentData.dueDate).toLocaleDateString();
            const message = `Payment due: ${paymentData.description || this.getCategoryDisplayName(formData.get('category'))} - ₹${this.formatAmount(paymentData.amount)} due on ${dueDate}${paymentData.isRecurring ? ' (Recurring)' : ''}`;
            await notificationManager.notify('Payment Due', message, 'warning');
          } else if (paymentData.type === 'pending' && paymentData.dueDate) {
            // Payment pending notification (orange/info) - using enhanced notification system
            const dueDate = new Date(paymentData.dueDate).toLocaleDateString();
            const message = `Payment pending: ${paymentData.description || this.getCategoryDisplayName(formData.get('category'))} - ₹${this.formatAmount(paymentData.amount)} pending for ${dueDate}${paymentData.isRecurring ? ' (Recurring)' : ''}`;
            await notificationManager.notify('Payment Pending', message, 'info');
            
            // If this is a membership payment for a specific member, add member payment notification
            if (paymentData.category === 'membership' && paymentData.memberId) {
              const memberSelect = document.getElementById('memberSelect');
              const selectedOption = memberSelect?.selectedOptions[0];
              
              if (selectedOption) {
                const memberData = {
                  _id: paymentData.memberId,
                  memberName: selectedOption.dataset.memberName,
                  pendingPaymentAmount: paymentData.amount,
                  daysRemaining: parseInt(selectedOption.dataset.daysRemaining),
                  isExpired: selectedOption.dataset.isExpired === 'true',
                  membershipValidUntil: selectedOption.dataset.membershipValidUntil
                };
                
                // Send detailed notification using enhanced system
                if (memberData.isExpired) {
                  await notificationManager.notifyMember('expired', memberData.memberName, 
                    `Overdue by ${Math.abs(memberData.daysRemaining)} days`);
                } else {
                  await notificationManager.notifyMember('renewed', memberData.memberName, 
                    `Payment pending - expires in ${memberData.daysRemaining} days`);
                }
                
                // Also show immediate alert about member status
                const statusMessage = memberData.isExpired 
                  ? `⚠️ Member ${memberData.memberName}'s membership EXPIRED ${Math.abs(memberData.daysRemaining)} days ago` 
                  : `⏰ Member ${memberData.memberName}'s membership expires in ${memberData.daysRemaining} days`;
                
                await notificationManager.notify('Membership Status Alert', statusMessage, 'warning');
              }
            }
          }
        } else {
          console.warn('Enhanced notification system not available');
        }
      } catch (notificationError) {
        console.warn('Error showing notification:', notificationError);
        // Don't let notification errors break the payment flow
      }
      
      // Schedule reminder if due date is set
      try {
        if (paymentData.dueDate && (paymentData.type === 'paid' || paymentData.type === 'due' || paymentData.type === 'pending')) {
          this.schedulePaymentReminder(result.data);
        }
      } catch (reminderError) {
        console.warn('Error scheduling payment reminder:', reminderError);
      }
      
    } catch (error) {
      console.error('Error adding payment:', error);
      this.showError('Failed to add payment');
    }
  }

  async handlePaymentAction(action, paymentId) {
    let button;
    try {
      let response;
      // Find the button to show loading state
      if (action === 'mark-paid') {
        button = document.querySelector(`[data-payment-id="${paymentId}"][data-action="mark-paid"]`);
        if (button) {
          button.disabled = true;
          button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        }
      }
      switch (action) {
        case 'mark-paid':
          response = await fetch(`http://localhost:5000/api/payments/${paymentId}/mark-paid`, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('gymAdminToken')}`
            }
          });
          break;
        case 'delete':
          if (!confirm('Are you sure you want to delete this payment?')) return;
          response = await fetch(`http://localhost:5000/api/payments/${paymentId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('gymAdminToken')}`
            }
          });
          break;
        case 'edit':
          // TODO: Implement edit functionality
          this.showInfo('Edit functionality coming soon');
          return;
      }

      if (!response.ok) throw new Error(`Failed to ${action} payment`);

      const result = await response.json();
      
      // Immediately update UI for mark-paid action
      if (action === 'mark-paid') {
        // Remove the payment item from the UI immediately
        const paymentItem = document.querySelector(`[data-payment-id="${paymentId}"]`);
        if (paymentItem) {
          // Find the parent payment item container
          const paymentContainer = paymentItem.closest('.recurring-payment-item, .payment-item, .pending-payment-item');
          if (paymentContainer) {
            paymentContainer.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            paymentContainer.style.opacity = '0';
            paymentContainer.style.transform = 'translateX(-20px)';
            setTimeout(() => {
              if (paymentContainer.parentNode) {
                paymentContainer.parentNode.removeChild(paymentContainer);
              }
            }, 300);
          }
        }
      }
      
      // Show success message
      this.showSuccess(result.message || `Payment ${action} successfully!`);
      
      // Force refresh stats and data to reflect changes immediately
      await Promise.all([
        this.forceRefreshStats(),
        this.loadRecurringPayments(), // Refresh recurring payments list
        this.loadAllPendingPayments() // Refresh pending payments list
      ]);
    } catch (error) {
      console.error(`Error ${action} payment:`, error);
      // Show error message
      this.showError(`Failed to ${action} payment: ${error.message}`);
    } finally {
      // Always reset button state after operation
      if (button && action === 'mark-paid') {
        button.disabled = false;
        button.innerHTML = '<i class="fas fa-check"></i> Mark Paid';
      }
    }
  }

  async handleMemberPaymentAction(action, memberId) {
    try {
      console.log(`Handling member payment action: ${action} for member: ${memberId}`);
      
      switch (action) {
        case 'mark-paid':
          // Use the seven-day allowance system to show mark as paid modal
          if (window.sevenDayAllowanceManager && typeof window.sevenDayAllowanceManager.showMarkAsPaidModal === 'function') {
            console.log('Opening mark as paid modal via seven-day allowance system');
            window.sevenDayAllowanceManager.showMarkAsPaidModal(memberId, 'payment-tab');
          } else {
            console.error('Seven-day allowance system not available');
            this.showError('Payment system not available. Please try again.');
          }
          break;
          
        case 'remind-member':
          // Send reminder for payment
          console.log('Sending payment reminder for member:', memberId);
          try {
            const reminderResponse = await fetch('http://localhost:5000/api/notifications/send-payment-reminder', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('gymAdminToken')}`
              },
              body: JSON.stringify({ memberId })
            });
            
            if (!reminderResponse.ok) {
              throw new Error(`Failed to send reminder: ${reminderResponse.status}`);
            }
            
            this.showSuccess('Payment reminder sent successfully');
          } catch (reminderError) {
            console.error('Error sending reminder:', reminderError);
            this.showError('Failed to send payment reminder');
          }
          break;

        case 'grant-allowance':
          // Use the seven-day allowance system to grant allowance
          if (window.sevenDayAllowanceManager && typeof window.sevenDayAllowanceManager.openAllowanceModal === 'function') {
            console.log('Opening allowance modal via seven-day allowance system');
            window.sevenDayAllowanceManager.openAllowanceModal(memberId);
          } else {
            console.error('Seven-day allowance system not available');
            this.showError('Seven-day allowance system not available. Please try again.');
          }
          break;
          
        default:
          console.error('Unknown member payment action:', action);
          this.showError('Unknown action');
          return;
      }
    } catch (error) {
      console.error(`Error ${action} member payment:`, error);
      this.showError(`Failed to ${action.replace('-', ' ')} member payment`);
    }
  }

  handleFilterChange(filter) {
    this.currentFilter = filter;
    
    // Update active filter button
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector(`[data-filter="${filter}"]`).classList.add('active');
    
    // Reload recurring payments with new filter
    this.loadRecurringPayments();
  }

  async updateChart() {
    await this.loadPaymentChart();
  }

  async refreshPaymentData() {
    // Refresh all payment-related data and statistics
    try {
      console.log('Refreshing all payment data...');
      await Promise.all([
        this.loadPaymentStats(),
        this.loadRecentPayments(),
        this.loadRecurringPayments(),
        this.loadPaymentChart()
      ]);
      // Load unified pending payments after all other data is refreshed
      await this.loadAllPendingPayments();
      console.log('Payment data refreshed successfully');
    } catch (error) {
      console.error('Error refreshing payment data:', error);
      this.showError('Failed to refresh payment data');
    }
  }

  async forceRefreshStats() {
    // Force refresh of payment statistics with cache busting
    try {
      console.log('Force refreshing payment statistics...');
      const timestamp = Date.now();
      const response = await fetch(`http://localhost:5000/api/payments/stats?t=${timestamp}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('gymAdminToken')}`,
          'Cache-Control': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch payment stats: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Force refreshed payment stats:', data.data);
      this.updatePaymentStats(data.data);
      
      // Note: loadAllPendingPayments() should be called separately by the caller when needed
      // to avoid unnecessary duplicate calls
    } catch (error) {
      console.error('Error force refreshing payment stats:', error);
      this.showError('Failed to refresh payment statistics');
    }
  }

  clearMemberPendingPayments() {
    // Clear the unified pending payments section
    const container = document.getElementById('pendingPaymentsList');
    if (container) {
      container.innerHTML = '';
    }
    
    // Reset member pending amounts
    this.memberPendingAmount = 0;
    this.recentMemberPendingPayments = [];
    this.updateCombinedPendingStatCard();
    
    // Remove existing member pending payments from recurring payments list (legacy cleanup)
    const recurringContainer = document.getElementById('recurringPaymentsList');
    if (recurringContainer) {
      const memberPayments = recurringContainer.querySelectorAll('.member-pending');
      memberPayments.forEach(item => item.remove());
      
      const separators = recurringContainer.querySelectorAll('.payment-section-separator');
      separators.forEach(separator => separator.remove());
    }
  }

  removeMemberPendingPayment(memberId) {
    // Remove specific member pending payment after it's been paid
    const container = document.getElementById('pendingPaymentsList');
    if (container) {
      const memberPayment = container.querySelector(`[data-member-id="${memberId}"]`);
      if (memberPayment) {
        memberPayment.remove();
        console.log(`Removed member pending payment for member ID: ${memberId}`);
      }
    }
    
    // Also check recurring payments list for legacy items
    const recurringContainer = document.getElementById('recurringPaymentsList');
    if (recurringContainer) {
      const memberPayment = recurringContainer.querySelector(`[data-member-id="${memberId}"]`);
      if (memberPayment) {
        memberPayment.remove();
        
        // If no more member payments, remove the separator too
        const remainingMemberPayments = container.querySelectorAll('.member-pending');
        if (remainingMemberPayments.length === 0) {
          const separators = container.querySelectorAll('.payment-section-separator');
          separators.forEach(separator => separator.remove());
        }
      }
    }
    
    // Refresh the unified pending payments to update stats and display
    this.loadAllPendingPayments();
  }

  async updateMemberPendingPaymentStatus(memberId, action) {
    // This function is called from the seven-day allowance system
    // to update the member pending payments UI and stats
    console.log(`Updating member pending payment status: ${memberId} - ${action}`);
    
    if (action === 'payment_completed') {
      // Remove the member from pending payments
      this.removeMemberPendingPayment(memberId);
      
      // Update stats by refreshing pending stats and lists
      await Promise.all([
        this.forceRefreshStats(),
        this.loadAllPendingPayments()
      ]);
      
      console.log(`Payment completed for member: ${memberId}`);
    } else if (action === 'allowance_granted') {
      // For allowance granted, update the display to show allowance status
      const memberContainer = document.getElementById('pendingPaymentsList');
      if (memberContainer) {
        const memberItem = memberContainer.querySelector(`[data-member-id="${memberId}"]`);
        if (memberItem) {
          const statusBadge = memberItem.querySelector('.member-payment-badge');
          if (statusBadge) {
            statusBadge.className = 'member-payment-badge allowance';
            statusBadge.innerHTML = '<i class="fas fa-calendar-check"></i> 7-Day Allowance Granted';
          }
          
          // Update the actions to show that allowance has been granted
          const actionsContainer = memberItem.querySelector('.member-payment-actions');
          if (actionsContainer) {
            actionsContainer.innerHTML = `
              <button class="payment-action-btn mark-paid mark-paid-btn" data-action="mark-member-paid" data-member-id="${memberId}" data-source="payment-tab" title="Mark as Paid">
                <i class="fas fa-check"></i>
              </button>
              <span class="allowance-granted-text" style="color: #059669; font-size: 0.8rem; font-weight: 600;">
                <i class="fas fa-calendar-check"></i> Allowance Granted
              </span>
            `;
          }
        }
      }
      
      console.log(`Allowance granted for member: ${memberId}`);
    }
  }

  populateYearSelect() {
    const yearSelect = document.getElementById('paymentChartYear');
    if (!yearSelect) return;

    const currentYear = new Date().getFullYear();
    yearSelect.innerHTML = '';
    
    for (let year = currentYear - 2; year <= currentYear + 1; year++) {
      const option = document.createElement('option');
      option.value = year;
      option.textContent = year;
      if (year === currentYear) option.selected = true;
      yearSelect.appendChild(option);
    }
  }

  resetPaymentForm() {
    const form = document.getElementById('addPaymentForm');
    if (form) {
      form.reset();
      this.toggleRecurringDetails(false);
      this.resetCategorySelection();
      // Reset field visibility based on default values
      this.handlePaymentTypeChange('received'); // Default to received
      this.toggleMemberNameField(''); // Reset member name field to hidden
    }
  }

  // Reset category selection
  resetCategorySelection() {
    // Remove all category selections
    document.querySelectorAll('.payment-category-item').forEach(item => {
      item.classList.remove('selected');
    });
    
    // Clear hidden input
    const hiddenInput = document.getElementById('paymentCategory');
    if (hiddenInput) {
      hiddenInput.value = '';
    }
    
    // Hide error message if any
    const errorDiv = document.getElementById('categoryError');
    if (errorDiv) {
      errorDiv.style.display = 'none';
    }
  }

  // Validate category selection
  validateCategorySelection() {
    const hiddenInput = document.getElementById('paymentCategory');
    return hiddenInput && hiddenInput.value && hiddenInput.value.trim() !== '';
  }

  formatAmount(amount) {
    return new Intl.NumberFormat('en-IN').format(amount);
  }

  formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-IN');
  }

  formatTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now - date;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return this.formatDate(dateString);
  }

  showSuccess(message) {
    this.showToast(message, 'success');
  }

  showError(message) {
    this.showToast(message, 'error');
  }

  showInfo(message) {
    this.showToast(message, 'info');
  }

  showToast(message, type = 'info') {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `payment-toast payment-toast-${type}`;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 8px;
      color: white;
      font-weight: 500;
      z-index: 10000;
      max-width: 350px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      transition: all 0.3s ease;
      transform: translateX(100%);
    `;

    // Set background color based on type
    switch (type) {
      case 'success':
        toast.style.backgroundColor = '#4caf50';
        break;
      case 'error':
        toast.style.backgroundColor = '#f44336';
        break;
      case 'info':
      default:
        toast.style.backgroundColor = '#2196f3';
        break;
    }

    toast.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
      </div>
    `;

    // Add to document
    document.body.appendChild(toast);

    // Animate in
    setTimeout(() => {
      toast.style.transform = 'translateX(0)';
    }, 100);

    // Remove after 4 seconds
    setTimeout(() => {
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 300);
    }, 4000);
  }

  // Method to record membership payment automatically
  async recordMembershipPayment(memberData) {
    const paymentData = {
      type: 'received',
      category: 'membership',
      amount: parseFloat(memberData.paymentAmount),
      description: `Membership payment - ${memberData.planSelected} (${memberData.monthlyPlan})`,
      memberName: memberData.memberName,
      memberId: memberData._id,
      paymentMethod: memberData.paymentMode?.toLowerCase() || 'cash',
      isRecurring: false,
      notes: `Membership valid until ${memberData.membershipValidUntil}`
    };

    try {
      const response = await fetch('http://localhost:5000/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('gymAdminToken')}`
        },
        body: JSON.stringify(paymentData)
      });

      if (!response.ok) throw new Error('Failed to record membership payment');

      const result = await response.json();
      console.log('Membership payment recorded successfully:', result);
      
      // Refresh payment data if payment tab is active
      if (document.getElementById('paymentTab')?.style.display !== 'none') {
        this.loadPaymentData();
      }

      // Trigger notification for automatic membership payment recording using enhanced system
      if (window.NotificationManager && memberData.memberName) {
        await window.NotificationManager.notifyPayment(
          memberData.memberName,
          memberData.paymentAmount,
          'success'
        );
      }

      return result;
    } catch (error) {
      console.error('Error recording membership payment:', error);
      // Don't throw error to avoid blocking member creation
      return null;
    }
  }

  // Method to record membership renewal payment
  async recordRenewalPayment(memberData, renewalData) {
    const paymentData = {
      type: 'received',
      category: 'membership',
      amount: parseFloat(renewalData.paymentAmount),
      description: `Membership renewal - ${renewalData.planSelected} (${renewalData.monthlyPlan})`,
      memberName: memberData.memberName,
      memberId: memberData._id,
      paymentMethod: renewalData.paymentMode?.toLowerCase() || 'cash',
      isRecurring: false,
      notes: `Renewed until ${renewalData.membershipValidUntil}`
    };

    try {
      const response = await fetch('http://localhost:5000/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('gymAdminToken')}`
        },
        body: JSON.stringify(paymentData)
      });

      if (!response.ok) throw new Error('Failed to record renewal payment');

      const result = await response.json();
      console.log('Renewal payment recorded successfully:', result);
      
      // Refresh payment data if payment tab is active
      if (document.getElementById('paymentTab')?.style.display !== 'none') {
        this.loadPaymentData();
      }

      // Trigger notification for renewal payment recording
      if (window.notificationSystem && memberData.memberName) {
        window.notificationSystem.notifyPaymentReceived({
          amount: renewalData.paymentAmount,
          memberName: memberData.memberName,
          plan: `${renewalData.planSelected} (${renewalData.monthlyPlan}) - Renewal`
        });
      }

      return result;
    } catch (error) {
      console.error('Error recording renewal payment:', error);
      // Don't throw error to avoid blocking renewal
      return null;
    }
  }

  // Method to refresh payment data when called from other modules
  async refreshPaymentData() {
    if (document.getElementById('paymentTab')?.style.display !== 'none') {
      await this.loadPaymentData();
    }
  }

  // Enhanced Payment Reminder System
  initializePaymentReminders() {
    // Initialize seen notifications tracking
    this.seenNotifications = new Set();
    this.lastNotificationCheck = new Date();
    
    // Check for payment reminders on initialization
    this.checkPaymentReminders();
    
    // Set up recurring check every 2 hours for due payment notifications
    setInterval(() => {
      this.checkEnhancedPaymentReminders();
    }, 7200000); // 2 hours in milliseconds
    
    // Set up daily reset of seen notifications at midnight
    this.scheduleDailyReset();
  }

  scheduleDailyReset() {
    // Calculate time until next midnight
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const timeUntilMidnight = tomorrow.getTime() - now.getTime();
    
    // Reset seen notifications at midnight
    setTimeout(() => {
      this.resetSeenNotifications();
      // Schedule daily reset for subsequent days
      setInterval(() => {
        this.resetSeenNotifications();
      }, 86400000); // 24 hours
    }, timeUntilMidnight);
  }

  resetSeenNotifications() {
    this.seenNotifications.clear();
    console.log('Reset seen notifications for new day');
  }

  async checkEnhancedPaymentReminders() {
    try {
      console.log('Checking enhanced payment reminders...');
      
      // Get all monthly recurring payments that are due within 7 days
      const response = await fetch('http://localhost:5000/api/payments/recurring?status=pending', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('gymAdminToken')}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch recurring payments');
      
      const data = await response.json();
      const payments = data.data || [];
      const today = new Date();
      
      for (const payment of payments) {
        if (!payment.dueDate || !payment.recurringDetails || !payment.recurringDetails.frequency) continue;
        
        // Only process monthly recurring payments
        if (payment.recurringDetails.frequency.toLowerCase() !== 'monthly') continue;
        
        const dueDate = new Date(payment.dueDate);
        const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
        
        // Show notification if due in 7 days or less (including overdue)
        if (daysUntilDue <= 7) {
          const notificationId = `recurring_${payment._id}_${today.toDateString()}`;
          
          // Check if notification was already seen today
          if (!this.seenNotifications.has(notificationId)) {
            this.showUnifiedPaymentNotification(payment, daysUntilDue, notificationId);
          }
        }
      }
    } catch (error) {
      console.error('Error checking enhanced payment reminders:', error);
    }
  }

  showUnifiedPaymentNotification(payment, daysUntilDue, notificationId) {
    // Use the unified notification system instead of custom toasts
    if (!window.notificationSystem) {
      console.warn('Unified notification system not available');
      return;
    }

    // Create notification data for the unified system
    const paymentData = {
      _id: payment._id,
      description: payment.description || 'Monthly Recurring Payment',
      amount: payment.amount
    };

    // Use the existing notifyPaymentDue method from the unified notification system
    window.notificationSystem.notifyPaymentDue(paymentData, daysUntilDue);
    
    // Mark notification as seen for tracking
    this.markNotificationAsSeen(notificationId);
    
    console.log(`Payment due notification sent via unified system for: ${payment.description} (${daysUntilDue} days)`);
  }

  markNotificationAsSeen(notificationId) {
    this.seenNotifications.add(notificationId);
    console.log(`Marked notification as seen: ${notificationId}`);
  }

  async checkPaymentReminders() {
    try {
      const response = await fetch('http://localhost:5000/api/payments/reminders', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('gymAdminToken')}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch payment reminders');

      const data = await response.json();
      this.processPaymentReminders(data.data);
    } catch (error) {
      console.error('Error checking payment reminders:', error);
    }

    // Also check for enhanced payment reminders
    this.checkEnhancedPaymentReminders();
  }

  async checkMonthlyRecurringPaymentNotifications() {
    // This method is now replaced by checkEnhancedPaymentReminders()
    // Keeping for compatibility, but redirecting to enhanced version
    console.log('Legacy checkMonthlyRecurringPaymentNotifications called - redirecting to enhanced version');
    return this.checkEnhancedPaymentReminders();
  }

  processPaymentReminders(reminders) {
    reminders.forEach(reminder => {
      const daysUntilDue = this.calculateDaysUntilDue(reminder.dueDate);
      
      // Handle different payment types with different reminder schedules
      if (reminder.type === 'pending') {
        // For pending payments, remind more frequently
        if (daysUntilDue <= 14 && daysUntilDue >= 0) {
          // Pending payment due within 2 weeks
          this.showPaymentReminderNotification(reminder, 'pending-due-soon');
        } else if (daysUntilDue < 0) {
          // Pending payment is overdue
          this.showPaymentReminderNotification(reminder, 'overdue');
        }
      } else {
        // For due/paid payments, use standard reminder schedule
        if (daysUntilDue <= 7 && daysUntilDue >= 0) {
          // Payment due within a week
          this.showPaymentReminderNotification(reminder, 'due-soon');
        } else if (daysUntilDue < 0) {
          // Payment is overdue
          this.showPaymentReminderNotification(reminder, 'overdue');
        }
      }
    });
  }

  showPaymentReminderNotification(payment, type) {
    // Use the unified notification system instead of the old notification system
    if (!window.notificationSystem) {
      console.warn('Unified notification system not available');
      return;
    }

    const daysUntilDue = this.calculateDaysUntilDue(payment.dueDate);
    
    // Use the unified system's notifyPaymentDue method
    const paymentData = {
      _id: payment._id,
      description: payment.description || 'Payment',
      amount: payment.amount
    };

    window.notificationSystem.notifyPaymentDue(paymentData, daysUntilDue);
  }

  schedulePaymentReminder(payment) {
    // This would typically be handled by the backend
    // But we can add client-side tracking for immediate reminders
    const dueDate = new Date(payment.dueDate);
    const now = new Date();
    const daysUntilDue = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));

    if (daysUntilDue <= 7 && daysUntilDue > 0) {
      this.showPaymentReminderNotification(payment, 'upcoming');
    }
  }

  calculateDaysUntilDue(dueDateString) {
    const dueDate = new Date(dueDateString);
    const now = new Date();
    return Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
  }

  async loadExpiringMembersForDropdown() {
    try {
      console.log('Loading members with expiring/expired memberships for dropdown...');
      
      // Fetch members with memberships expiring within 3 days or already expired
      // If the backend doesn't support the days parameter, it will return all expiring members
      // and we'll filter them on the frontend
      const response = await fetch('http://localhost:5000/api/members/expiring?days=3', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('gymAdminToken')}`
        }
      });

      if (!response.ok) {
        console.error('Failed to fetch expiring members, status:', response.status);
        throw new Error('Failed to fetch expiring members');
      }

      const data = await response.json();
      const expiringMembers = data.data || data; // Handle different response formats
      console.log('Loaded expiring/expired members:', expiringMembers);
      this.populateExpiringMemberDropdown(expiringMembers);
    } catch (error) {
      console.error('Error loading expiring members:', error);
      this.showError('Failed to load expiring members');
    }
  }

  // Legacy function kept for backward compatibility
  async loadMembersForDropdown() {
    return this.loadExpiringMembersForDropdown();
  }

  populateExpiringMemberDropdown(members) {
    const memberSelect = document.getElementById('memberSelect');
    if (!memberSelect) {
      console.error('Member select element not found');
      return;
    }

    // Clear existing options
    memberSelect.innerHTML = '<option value="">Select Member with Expiring/Expired Membership</option>';

    if (!members || members.length === 0) {
      memberSelect.innerHTML += '<option value="" disabled>No members with expiring/expired memberships found</option>';
      console.log('No expiring/expired members to populate');
      return;
    }

    // Filter members to only include those expiring within 3 days or already expired
    const filteredMembers = members.filter(member => {
      const daysRemaining = member.daysRemaining || 0;
      return daysRemaining <= 3; // Include expired (negative), expiring today (0), and expiring within 3 days
    });

    if (filteredMembers.length === 0) {
      memberSelect.innerHTML += '<option value="" disabled>No members with urgent membership renewals found</option>';
      console.log('No urgent membership renewals found');
      return;
    }

    // Sort members: expired first (most urgent), then by days remaining
    filteredMembers.sort((a, b) => {
      const aDays = a.daysRemaining || 0;
      const bDays = b.daysRemaining || 0;
      
      // Expired members first (negative days)
      if (aDays < 0 && bDays >= 0) return -1;
      if (aDays >= 0 && bDays < 0) return 1;
      
      // Both expired: more days overdue first
      if (aDays < 0 && bDays < 0) return aDays - bDays;
      
      // Both expiring: fewer days remaining first
      return aDays - bDays;
    });

    filteredMembers.forEach(member => {
      const option = document.createElement('option');
      option.value = member._id;
      
      let statusText = '';
      let statusColor = '';
      
      if (member.daysRemaining < 0) {
        statusText = `⚠️ EXPIRED ${Math.abs(member.daysRemaining)} days ago`;
        statusColor = '#dc2626'; // Red for expired
        option.style.fontWeight = 'bold';
      } else if (member.daysRemaining === 0) {
        statusText = '🚨 EXPIRES TODAY';
        statusColor = '#ea580c'; // Orange-red for expiring today
        option.style.fontWeight = 'bold';
      } else if (member.daysRemaining === 1) {
        statusText = '⏰ EXPIRES TOMORROW';
        statusColor = '#d97706'; // Orange for expiring tomorrow
      } else {
        statusText = `⏰ Expires in ${member.daysRemaining} day${member.daysRemaining === 1 ? '' : 's'}`;
        statusColor = '#d97706'; // Orange for expiring soon
      }
      
      option.style.color = statusColor;
      option.textContent = `${member.memberName} (${member.membershipId || 'No ID'}) - ${statusText}`;
      
      // Store member data for later use
      option.dataset.memberName = member.memberName;
      option.dataset.email = member.email || '';
      option.dataset.phone = member.phone || '';
      option.dataset.daysRemaining = member.daysRemaining;
      option.dataset.isExpired = member.daysRemaining < 0;
      option.dataset.membershipValidUntil = member.membershipValidUntil;
      
      memberSelect.appendChild(option);
    });

    console.log(`Populated dropdown with ${filteredMembers.length} urgent membership renewals`);

    // Add event listener for member selection
    memberSelect.removeEventListener('change', this.handleMemberSelection.bind(this));
    memberSelect.addEventListener('change', this.handleMemberSelection.bind(this));
  }

  handleMemberSelection(event) {
    const selectedOption = event.target.selectedOptions[0];
    const selectedMemberIdInput = document.getElementById('selectedMemberId');
    const memberNameInput = document.getElementById('memberName');

    if (selectedOption && selectedOption.value) {
      // Set the member ID for the payment
      if (selectedMemberIdInput) {
        selectedMemberIdInput.value = selectedOption.value;
      }
      
      // Set the member name in the hidden text input for form submission
      if (memberNameInput) {
        memberNameInput.value = selectedOption.dataset.memberName;
      }
      
      // Show member status information
      const isExpired = selectedOption.dataset.isExpired === 'true';
      const daysRemaining = parseInt(selectedOption.dataset.daysRemaining);
      
      if (isExpired) {
        this.showInfo(`⚠️ Selected member's membership EXPIRED ${Math.abs(daysRemaining)} days ago`);
      } else if (daysRemaining === 0) {
        this.showInfo('🚨 Selected member\'s membership EXPIRES TODAY');
      } else {
        this.showInfo(`⏰ Selected member's membership expires in ${daysRemaining} days`);
      }
    } else {
      if (selectedMemberIdInput) selectedMemberIdInput.value = '';
      if (memberNameInput) memberNameInput.value = '';
    }
  }

  getCategoryDisplayName(category) {
    const categoryMap = {
      'rent': 'Rent',
      'utilities': 'Utilities',
      'staff_salary': 'Staff Salary',
      'equipment_purchase': 'Equipment Purchase',
      'equipment_maintenance': 'Equipment Maintenance',
      'supplies': 'Supplies',
      'marketing': 'Marketing',
      'insurance': 'Insurance',
      'taxes': 'Taxes',
      'vendor_payment': 'Vendor Payment',
      'license_fees': 'License Fees',
      'miscellaneous': 'Miscellaneous',
      'membership': 'Membership',
      'personal_training': 'Personal Training'
    };
    return categoryMap[category] || category.replace('_', ' ').toUpperCase();
  }

  // Map frontend category names to backend accepted values
  mapCategoryToBackend(category) {
    // Since we updated the backend schema to match frontend categories,
    // we no longer need to map them. Just return the category as-is.
    return category;
  }

  renderPaymentWithReminders(payments) {
    return payments.map(payment => {
      const daysUntilDue = payment.dueDate ? this.calculateDaysUntilDue(payment.dueDate) : null;
      let reminderBadge = '';

      if (daysUntilDue !== null) {
        // Determine badge style based on payment type
        const badgeStyle = payment.type === 'pending' ? 'pending' : 
                          daysUntilDue < 0 ? 'overdue' : 
                          daysUntilDue <= 3 ? 'due-soon' : 'upcoming';

        if (daysUntilDue < 0) {
          const dayText = payment.type === 'pending' ? 'pending overdue' : 'overdue';
          reminderBadge = `<span class="payment-reminder-badge ${badgeStyle}">
            <i class="fas fa-exclamation-triangle"></i> ${Math.abs(daysUntilDue)} days ${dayText}
          </span>`;
        } else if (daysUntilDue === 0) {
          const dayText = payment.type === 'pending' ? 'pending today' : 'due today';
          reminderBadge = `<span class="payment-reminder-badge ${badgeStyle}">
            <i class="fas fa-clock"></i> ${dayText}
          </span>`;
        } else if (daysUntilDue === 1) {
          const dayText = payment.type === 'pending' ? 'pending tomorrow' : 'due tomorrow';
          reminderBadge = `<span class="payment-reminder-badge ${badgeStyle}">
            <i class="fas fa-clock"></i> ${dayText}
          </span>`;
        } else if (daysUntilDue <= 7) {
          const dayText = payment.type === 'pending' ? 'pending' : 'due';
          reminderBadge = `<span class="payment-reminder-badge ${badgeStyle}">
            <i class="fas fa-calendar"></i> ${dayText} in ${daysUntilDue} days
          </span>`;
        } else if (payment.type === 'pending' && daysUntilDue <= 14) {
          // Show longer reminder period for pending payments
          reminderBadge = `<span class="payment-reminder-badge pending">
            <i class="fas fa-calendar-alt"></i> Pending in ${daysUntilDue} days
          </span>`;
        }
      }

      return {
        ...payment,
        reminderBadge
      };
    });
  }

}

// Initialize payment manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.paymentManager = new PaymentManager();

  // Add logic to close add payment modal when clicking outside modal content
  const modal = document.getElementById('addPaymentModal');
  const modalContent = modal ? modal.querySelector('.add-payment-modal-content') : null;
  if (modal && modalContent) {
    modal.addEventListener('mousedown', function(e) {
      if (e.target === modal) {
        modal.classList.remove('active');
        if (window.paymentManager && typeof window.paymentManager.resetPaymentForm === 'function') {
          window.paymentManager.resetPaymentForm();
        }
      }
    });
  }
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PaymentManager;
}
