// Payment Tab JavaScript
class PaymentManager {
  constructor() {
    this.paymentChart = null;
    this.currentFilter = 'all';
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.loadPaymentData();
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
        this.handlePaymentAction(action, paymentId);
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
  }

  async loadPaymentData() {
    try {
      await Promise.all([
        this.loadPaymentStats(),
        this.loadRecentPayments(),
        this.loadRecurringPayments(),
        this.loadPaymentChart()
      ]);
    } catch (error) {
      console.error('Error loading payment data:', error);
      this.showError('Failed to load payment data');
    }
  }

  async loadPaymentStats() {
    try {
      const response = await fetch('/api/payments/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('gymAdminToken')}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch payment stats');

      const data = await response.json();
      this.updatePaymentStats(data.data);
    } catch (error) {
      console.error('Error loading payment stats:', error);
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

      const response = await fetch(`/api/payments/chart-data?month=${month}&year=${year}`, {
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
      const response = await fetch('/api/payments/recent?limit=10', {
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

    container.innerHTML = payments.map(payment => `
      <div class="recent-payment-item">
        <div class="recent-payment-icon ${payment.type}">
          <i class="fas fa-${payment.type === 'received' ? 'plus' : 'minus'}"></i>
        </div>
        <div class="recent-payment-info">
          <div class="recent-payment-title">${payment.description}</div>
          <div class="recent-payment-details">
            <span>${payment.category.replace('_', ' ').toUpperCase()}</span>
            <span>${payment.paymentMethod.toUpperCase()}</span>
            ${payment.memberName ? `<span>${payment.memberName}</span>` : ''}
          </div>
        </div>
        <div class="recent-payment-amount ${payment.type === 'received' ? 'positive' : 'negative'}">
          ${payment.type === 'received' ? '+' : '-'}₹${this.formatAmount(payment.amount)}
        </div>
        <div class="recent-payment-time">
          ${this.formatTime(payment.createdAt)}
        </div>
      </div>
    `).join('');
  }

  async loadRecurringPayments() {
    try {
      const response = await fetch(`/api/payments/recurring?status=${this.currentFilter}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('gymAdminToken')}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch recurring payments');

      const data = await response.json();
      this.renderRecurringPayments(data.data);
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
          <h3>No Recurring Payments</h3>
          <p>No recurring payment obligations found</p>
        </div>
      `;
      return;
    }

    container.innerHTML = payments.map(payment => {
      const isOverdue = payment.dueDate && new Date(payment.dueDate) < new Date() && payment.status === 'pending';
      const isPending = payment.status === 'pending';
      const isCompleted = payment.status === 'completed';

      return `
        <div class="recurring-payment-item ${isOverdue ? 'overdue' : isPending ? 'pending' : 'completed'}">
          <div class="payment-item-info">
            <div class="payment-item-title">${payment.description}</div>
            <div class="payment-item-details">
              <span>${payment.category.replace('_', ' ').toUpperCase()}</span>
              <span>Due: ${payment.dueDate ? this.formatDate(payment.dueDate) : 'N/A'}</span>
              <span class="status-${payment.status}">${payment.status.toUpperCase()}</span>
            </div>
          </div>
          <div class="payment-item-amount">₹${this.formatAmount(payment.amount)}</div>
          <div class="payment-item-actions">
            ${payment.status === 'pending' ? `
              <button class="payment-action-btn mark-paid" data-action="mark-paid" data-payment-id="${payment._id}">
                Mark Paid
              </button>
            ` : ''}
            <button class="payment-action-btn edit" data-action="edit" data-payment-id="${payment._id}">
              Edit
            </button>
            <button class="payment-action-btn delete" data-action="delete" data-payment-id="${payment._id}">
              Delete
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  showAddPaymentModal() {
    const modal = document.getElementById('addPaymentModal');
    if (modal) {
      modal.classList.add('active');
      this.populateYearSelect();
    }
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

  async handlePaymentFormSubmit() {
    const form = document.getElementById('addPaymentForm');
    const formData = new FormData(form);
    
    const paymentData = {
      type: formData.get('type'),
      category: formData.get('category'),
      amount: parseFloat(formData.get('amount')),
      description: formData.get('description'),
      memberName: formData.get('memberName'),
      paymentMethod: formData.get('paymentMethod'),
      isRecurring: formData.get('isRecurring') === 'on',
      dueDate: formData.get('dueDate'),
      notes: formData.get('notes')
    };

    if (paymentData.isRecurring) {
      paymentData.recurringDetails = {
        frequency: formData.get('frequency'),
        nextDueDate: formData.get('nextDueDate')
      };
    }

    try {
      const response = await fetch('/api/payments', {
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
    } catch (error) {
      console.error('Error adding payment:', error);
      this.showError('Failed to add payment');
    }
  }

  async handlePaymentAction(action, paymentId) {
    try {
      let response;
      
      switch (action) {
        case 'mark-paid':
          response = await fetch(`/api/payments/${paymentId}/mark-paid`, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('gymAdminToken')}`
            }
          });
          break;
        case 'delete':
          if (!confirm('Are you sure you want to delete this payment?')) return;
          response = await fetch(`/api/payments/${paymentId}`, {
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
      this.showSuccess(result.message);
      this.loadPaymentData();
    } catch (error) {
      console.error(`Error ${action} payment:`, error);
      this.showError(`Failed to ${action} payment`);
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
    }
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
    // TODO: Implement success toast
    console.log('Success:', message);
  }

  showError(message) {
    // TODO: Implement error toast
    console.error('Error:', message);
  }

  showInfo(message) {
    // TODO: Implement info toast
    console.log('Info:', message);
  }
}

// Initialize payment manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.paymentManager = new PaymentManager();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PaymentManager;
}
