// Subscription Management for Admin Dashboard
class SubscriptionManager {
  constructor() {
    this.BASE_URL = "http://localhost:5000";
    this.currentPage = 1;
    this.itemsPerPage = 10;
    this.currentFilters = {};
    this.subscriptions = [];
    this.analytics = {};
    
    this.initializeEventListeners();
    this.loadSubscriptionAnalytics();
    this.loadSubscriptions();
  }

  initializeEventListeners() {
    // Tab switching
    document.getElementById('subscription-tab')?.addEventListener('click', () => {
      this.showSubscriptionTab();
    });

    // Filter and search controls
    document.getElementById('apply-subscription-filters')?.addEventListener('click', () => {
      this.applyFilters();
    });

    document.getElementById('clear-subscription-filters')?.addEventListener('click', () => {
      this.clearFilters();
    });

    document.getElementById('subscription-search')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.applyFilters();
      }
    });

    // Refresh and export buttons
    document.getElementById('refresh-subscriptions')?.addEventListener('click', () => {
      this.refreshData();
    });

    document.getElementById('export-subscriptions')?.addEventListener('click', () => {
      this.exportSubscriptions();
    });

    // Modal close buttons
    document.getElementById('closeSubscriptionModal')?.addEventListener('click', () => {
      this.closeSubscriptionModal();
    });

    document.getElementById('closeSubscriptionActionModal')?.addEventListener('click', () => {
      this.closeActionModal();
    });

    // Pagination
    document.getElementById('subscription-prev-page')?.addEventListener('click', () => {
      if (this.currentPage > 1) {
        this.currentPage--;
        this.loadSubscriptions();
      }
    });

    document.getElementById('subscription-next-page')?.addEventListener('click', () => {
      this.currentPage++;
      this.loadSubscriptions();
    });
  }

  showSubscriptionTab() {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(tab => {
      tab.classList.remove('active');
    });

    // Remove active class from all sidebar links
    document.querySelectorAll('.sidebar-menu a').forEach(link => {
      link.classList.remove('active');
    });

    // Show subscription content
    document.getElementById('subscription-content').classList.add('active');
    document.getElementById('subscription-tab').classList.add('active');

    // Load fresh data
    this.refreshData();
  }

  async loadSubscriptionAnalytics() {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${this.BASE_URL}/api/subscriptions/admin/analytics`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        this.analytics = await response.json();
        this.updateAnalyticsCards();
      } else {
        console.error('Failed to load subscription analytics');
      }
    } catch (error) {
      console.error('Error loading subscription analytics:', error);
    }
  }

  updateAnalyticsCards() {
    const data = this.analytics.data || {};
    
    document.getElementById('active-subscriptions-count').textContent = data.active || '--';
    document.getElementById('trial-subscriptions-count').textContent = data.trial || '--';
    document.getElementById('trial-ending-soon').textContent = `${data.trialEndingSoon || 0} ending soon`;
    document.getElementById('expired-subscriptions-count').textContent = (data.expired + data.cancelled) || '--';
    
    const monthlyRevenue = data.thisMonthRevenue || 0;
    document.getElementById('monthly-revenue').textContent = monthlyRevenue > 0 ? `₹${monthlyRevenue.toLocaleString()}` : '--';
  }

  async loadSubscriptions() {
    try {
      const token = localStorage.getItem('adminToken');
      const params = new URLSearchParams({
        page: this.currentPage,
        limit: this.itemsPerPage,
        ...this.currentFilters
      });

      const response = await fetch(`${this.BASE_URL}/api/subscriptions/admin/all?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        this.subscriptions = result.data || [];
        this.updateSubscriptionTable();
        this.updatePagination(result.pagination);
      } else {
        throw new Error('Failed to load subscriptions');
      }
    } catch (error) {
      console.error('Error loading subscriptions:', error);
      this.showError('Failed to load subscriptions. Please try again.');
    }
  }

  updateSubscriptionTable() {
    const tbody = document.getElementById('subscriptions-table-body');
    if (!tbody) return;

    if (this.subscriptions.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; padding: 40px; color: #666;">
            <i class="fas fa-inbox" style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;"></i>
            <p style="margin: 0; font-size: 16px;">No subscriptions found</p>
            <p style="margin: 8px 0 0 0; font-size: 14px;">Try adjusting your filters or search criteria</p>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = this.subscriptions.map(subscription => this.renderSubscriptionRow(subscription)).join('');
  }

  renderSubscriptionRow(subscription) {
    const gym = subscription.gymId || {};
    const statusClass = this.getStatusClass(subscription.status);
    const statusText = this.getStatusText(subscription.status);
    
    // Calculate period display
    let periodText = '';
    if (subscription.status === 'trial') {
      const trialEnd = new Date(subscription.trialPeriod.endDate);
      const daysRemaining = Math.ceil((trialEnd - new Date()) / (1000 * 60 * 60 * 24));
      periodText = `Trial: ${daysRemaining > 0 ? `${daysRemaining} days left` : 'Expired'}`;
    } else if (subscription.activePeriod.endDate) {
      const activeEnd = new Date(subscription.activePeriod.endDate);
      const daysRemaining = Math.ceil((activeEnd - new Date()) / (1000 * 60 * 60 * 24));
      periodText = `Active: ${daysRemaining > 0 ? `${daysRemaining} days left` : 'Expired'}`;
    }

    const lastPayment = subscription.billingHistory.length > 0 
      ? subscription.billingHistory[subscription.billingHistory.length - 1]
      : null;

    return `
      <tr>
        <td>
          <div style="display: flex; align-items: center; gap: 8px;">
            <strong>${gym.name || 'N/A'}</strong>
            <br>
            <small style="color: #666;">${gym.email || ''}</small>
          </div>
        </td>
        <td>
          <span class="plan-badge plan-${subscription.plan}">${subscription.planDisplayName}</span>
          <br>
          <small>₹${subscription.pricing.amount}/${subscription.pricing.billingCycle}</small>
        </td>
        <td>
          <span class="status status-${statusClass}">${statusText}</span>
        </td>
        <td>₹${subscription.pricing.amount.toLocaleString()}</td>
        <td>
          <small>${periodText}</small>
        </td>
        <td>
          <span class="payment-method">${subscription.paymentDetails.paymentMethod || 'N/A'}</span>
        </td>
        <td>
          ${lastPayment ? 
            `<small>${new Date(lastPayment.date).toLocaleDateString()}<br>₹${lastPayment.amount}</small>` : 
            '<small style="color: #999;">No payments</small>'
          }
        </td>
        <td>
          <div class="action-buttons">
            <button class="btn btn-sm btn-primary" onclick="subscriptionManager.viewSubscription('${subscription._id}')">
              <i class="fas fa-eye"></i>
            </button>
            <button class="btn btn-sm btn-warning" onclick="subscriptionManager.editSubscription('${subscription._id}')">
              <i class="fas fa-edit"></i>
            </button>
            <div class="dropdown">
              <button class="btn btn-sm btn-secondary dropdown-toggle" onclick="subscriptionManager.toggleActionDropdown(event)">
                <i class="fas fa-ellipsis-v"></i>
              </button>
              <div class="dropdown-menu">
                <a href="#" onclick="subscriptionManager.changePlan('${subscription._id}')">Change Plan</a>
                <a href="#" onclick="subscriptionManager.processPayment('${subscription._id}')">Process Payment</a>
                <a href="#" onclick="subscriptionManager.sendNotification('${subscription._id}')">Send Notification</a>
                <div class="dropdown-divider"></div>
                ${subscription.status === 'cancelled' ? 
                  `<a href="#" onclick="subscriptionManager.reactivateSubscription('${subscription._id}')" style="color: #4CAF50;">Reactivate</a>` :
                  `<a href="#" onclick="subscriptionManager.cancelSubscription('${subscription._id}')" style="color: #f44336;">Cancel</a>`
                }
              </div>
            </div>
          </div>
        </td>
      </tr>
    `;
  }

  getStatusClass(status) {
    const statusMap = {
      'trial': 'info',
      'active': 'approved',
      'expired': 'warning',
      'cancelled': 'rejected',
      'pending_payment': 'warning'
    };
    return statusMap[status] || 'default';
  }

  getStatusText(status) {
    const statusMap = {
      'trial': 'Trial',
      'active': 'Active',
      'expired': 'Expired',
      'cancelled': 'Cancelled',
      'pending_payment': 'Payment Due'
    };
    return statusMap[status] || status;
  }

  updatePagination(pagination) {
    const paginationContainer = document.getElementById('subscription-pagination');
    const paginationInfo = document.getElementById('subscription-pagination-info');
    const prevButton = document.getElementById('subscription-prev-page');
    const nextButton = document.getElementById('subscription-next-page');
    const pageNumbers = document.getElementById('subscription-page-numbers');

    if (!pagination) return;

    // Show pagination container
    paginationContainer.style.display = 'flex';

    // Update info
    const start = (pagination.page - 1) * pagination.limit + 1;
    const end = Math.min(pagination.page * pagination.limit, pagination.total);
    paginationInfo.textContent = `Showing ${start}-${end} of ${pagination.total} subscriptions`;

    // Update buttons
    prevButton.disabled = pagination.page <= 1;
    nextButton.disabled = pagination.page >= pagination.pages;

    // Update page numbers
    const pageNumbersHtml = [];
    for (let i = Math.max(1, pagination.page - 2); i <= Math.min(pagination.pages, pagination.page + 2); i++) {
      pageNumbersHtml.push(`
        <button class="btn btn-sm ${i === pagination.page ? 'btn-primary' : 'btn-secondary'}" 
                onclick="subscriptionManager.goToPage(${i})">${i}</button>
      `);
    }
    pageNumbers.innerHTML = pageNumbersHtml.join('');
  }

  goToPage(page) {
    this.currentPage = page;
    this.loadSubscriptions();
  }

  applyFilters() {
    const status = document.getElementById('subscription-status-filter').value;
    const plan = document.getElementById('subscription-plan-filter').value;
    const search = document.getElementById('subscription-search').value;

    this.currentFilters = {};
    if (status) this.currentFilters.status = status;
    if (plan) this.currentFilters.plan = plan;
    if (search) this.currentFilters.search = search;

    this.currentPage = 1;
    this.loadSubscriptions();
  }

  clearFilters() {
    document.getElementById('subscription-status-filter').value = '';
    document.getElementById('subscription-plan-filter').value = '';
    document.getElementById('subscription-search').value = '';
    this.currentFilters = {};
    this.currentPage = 1;
    this.loadSubscriptions();
  }

  refreshData() {
    this.loadSubscriptionAnalytics();
    this.loadSubscriptions();
  }

  async viewSubscription(subscriptionId) {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${this.BASE_URL}/api/subscriptions/admin/${subscriptionId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        this.showSubscriptionModal(result.data);
      } else {
        throw new Error('Failed to load subscription details');
      }
    } catch (error) {
      console.error('Error loading subscription details:', error);
      this.showError('Failed to load subscription details');
    }
  }

  showSubscriptionModal(subscription) {
    const modal = document.getElementById('subscriptionDetailModal');
    const content = document.getElementById('subscriptionModalContent');
    
    content.innerHTML = this.renderSubscriptionDetails(subscription);
    modal.style.display = 'flex';
  }

  renderSubscriptionDetails(subscription) {
    const gym = subscription.gymId || {};
    
    return `
      <div class="subscription-details">
        <div class="detail-section">
          <h4>Gym Information</h4>
          <div class="detail-grid">
            <div class="detail-item">
              <label>Gym Name:</label>
              <span>${gym.name || 'N/A'}</span>
            </div>
            <div class="detail-item">
              <label>Email:</label>
              <span>${gym.email || 'N/A'}</span>
            </div>
            <div class="detail-item">
              <label>Phone:</label>
              <span>${gym.phone || 'N/A'}</span>
            </div>
            <div class="detail-item">
              <label>Location:</label>
              <span>${gym.city ? `${gym.city}, ${gym.state}` : 'N/A'}</span>
            </div>
          </div>
        </div>

        <div class="detail-section">
          <h4>Subscription Details</h4>
          <div class="detail-grid">
            <div class="detail-item">
              <label>Plan:</label>
              <span class="plan-badge plan-${subscription.plan}">${subscription.planDisplayName}</span>
            </div>
            <div class="detail-item">
              <label>Status:</label>
              <span class="status status-${this.getStatusClass(subscription.status)}">${this.getStatusText(subscription.status)}</span>
            </div>
            <div class="detail-item">
              <label>Amount:</label>
              <span>₹${subscription.pricing.amount}/${subscription.pricing.billingCycle}</span>
            </div>
            <div class="detail-item">
              <label>Auto Renewal:</label>
              <span>${subscription.autoRenewal ? 'Enabled' : 'Disabled'}</span>
            </div>
          </div>
        </div>

        <div class="detail-section">
          <h4>Period Information</h4>
          <div class="detail-grid">
            <div class="detail-item">
              <label>Trial Period:</label>
              <span>${new Date(subscription.trialPeriod.startDate).toLocaleDateString()} - ${new Date(subscription.trialPeriod.endDate).toLocaleDateString()}</span>
            </div>
            ${subscription.activePeriod.startDate ? `
              <div class="detail-item">
                <label>Active Period:</label>
                <span>${new Date(subscription.activePeriod.startDate).toLocaleDateString()} - ${new Date(subscription.activePeriod.endDate).toLocaleDateString()}</span>
              </div>
            ` : ''}
          </div>
        </div>

        <div class="detail-section">
          <h4>Usage Statistics</h4>
          <div class="detail-grid">
            <div class="detail-item">
              <label>Dashboard Logins:</label>
              <span>${subscription.usage.dashboardLogins || 0}</span>
            </div>
            <div class="detail-item">
              <label>Members Managed:</label>
              <span>${subscription.usage.membersManaged || 0}</span>
            </div>
            <div class="detail-item">
              <label>Payments Processed:</label>
              <span>${subscription.usage.paymentsProcessed || 0}</span>
            </div>
            <div class="detail-item">
              <label>Biometric Scans:</label>
              <span>${subscription.usage.biometricScans || 0}</span>
            </div>
          </div>
        </div>

        <div class="detail-section">
          <h4>Recent Billing History</h4>
          <div class="billing-history">
            ${subscription.billingHistory.length > 0 ? 
              subscription.billingHistory.slice(-5).map(payment => `
                <div class="billing-item">
                  <span class="billing-date">${new Date(payment.date).toLocaleDateString()}</span>
                  <span class="billing-amount">₹${payment.amount}</span>
                  <span class="billing-status status-${payment.status === 'success' ? 'approved' : 'rejected'}">${payment.status}</span>
                  <span class="billing-method">${payment.paymentMethod}</span>
                </div>
              `).join('') :
              '<p style="color: #666; text-align: center; padding: 20px;">No billing history available</p>'
            }
          </div>
        </div>
      </div>
    `;
  }

  closeSubscriptionModal() {
    document.getElementById('subscriptionDetailModal').style.display = 'none';
  }

  closeActionModal() {
    document.getElementById('subscriptionActionModal').style.display = 'none';
  }

  toggleActionDropdown(event) {
    event.stopPropagation();
    const dropdown = event.target.closest('.dropdown');
    const menu = dropdown.querySelector('.dropdown-menu');
    
    // Close all other dropdowns
    document.querySelectorAll('.dropdown-menu').forEach(m => {
      if (m !== menu) m.style.display = 'none';
    });
    
    menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
  }

  async exportSubscriptions() {
    try {
      const token = localStorage.getItem('adminToken');
      const params = new URLSearchParams(this.currentFilters);
      
      const response = await fetch(`${this.BASE_URL}/api/subscriptions/admin/export?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `subscriptions-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        throw new Error('Export failed');
      }
    } catch (error) {
      console.error('Error exporting subscriptions:', error);
      this.showError('Failed to export subscriptions');
    }
  }

  showError(message) {
    // You can implement a toast notification or alert here
    alert(message);
  }

  showSuccess(message) {
    // You can implement a toast notification here
    alert(message);
  }
}

// Initialize subscription manager when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  if (document.getElementById('subscription-content')) {
    window.subscriptionManager = new SubscriptionManager();
  }
});

// Close dropdowns when clicking outside
document.addEventListener('click', function(event) {
  if (!event.target.closest('.dropdown')) {
    document.querySelectorAll('.dropdown-menu').forEach(menu => {
      menu.style.display = 'none';
    });
  }
});
