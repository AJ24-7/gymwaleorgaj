// Trial Bookings Management System
class TrialBookingsManager {
    constructor() {
        this.trialBookings = [];
        this.filteredBookings = [];
        this.currentFilters = {
            search: '',
            status: '',
            date: ''
        };
        this.init();
    }

    async init() {
        console.log('Initializing Trial Bookings Manager...');
        await this.loadTrialBookings();
        this.initializeEventListeners();
        this.updateStatistics();
        this.renderTrialBookings();
    }

    initializeEventListeners() {
        // Search input
        const searchInput = document.getElementById('trialSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.currentFilters.search = e.target.value.toLowerCase();
                this.applyFilters();
            });
        }

        // Status filter
        const statusFilter = document.getElementById('trialStatusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.currentFilters.status = e.target.value;
                this.applyFilters();
            });
        }

        // Date filter
        const dateFilter = document.getElementById('trialDateFilter');
        if (dateFilter) {
            dateFilter.addEventListener('change', (e) => {
                this.currentFilters.date = e.target.value;
                this.applyFilters();
            });
        }

        // Tab click handler
        this.setupTabClickHandler();
    }

    setupTabClickHandler() {
        // Find Trial Bookings menu items and add click handlers
        document.querySelectorAll('.menu-link').forEach(link => {
            const menuText = link.querySelector('.menu-text');
            if (menuText && menuText.textContent.trim() === 'Trial Bookings') {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.showTrialBookingsTab();
                });
            }
        });
    }

    showTrialBookingsTab() {
        // Hide all tabs
        document.querySelectorAll('[id$="Tab"]').forEach(tab => {
            tab.style.display = 'none';
        });

        // Show trial bookings tab
        const trialTab = document.getElementById('trialBookingsTab');
        if (trialTab) {
            trialTab.style.display = 'block';
        }

        // Update active menu item
        document.querySelectorAll('.menu-link').forEach(link => {
            link.classList.remove('active');
        });

        document.querySelectorAll('.menu-link').forEach(link => {
            const menuText = link.querySelector('.menu-text');
            if (menuText && menuText.textContent.trim() === 'Trial Bookings') {
                link.classList.add('active');
            }
        });

        // Refresh data when tab is shown
        this.loadTrialBookings();
    }

    async loadTrialBookings() {
        try {
            this.showLoading();
            
            const gymId = localStorage.getItem('gymId');
            if (!gymId) {
                throw new Error('Gym ID not found');
            }

            const response = await fetch(`/api/gyms/trial-bookings/${gymId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('gymAdminToken')}`
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to load trial bookings: ${response.statusText}`);
            }

            const data = await response.json();
            this.trialBookings = data.bookings || [];
            this.filteredBookings = [...this.trialBookings];
            
            this.hideLoading();
            this.updateStatistics();
            this.renderTrialBookings();

        } catch (error) {
            console.error('Error loading trial bookings:', error);
            this.hideLoading();
            this.showError('Failed to load trial bookings. Please try again.');
        }
    }

    applyFilters() {
        this.filteredBookings = this.trialBookings.filter(booking => {
            const matchesSearch = this.matchesSearchFilter(booking);
            const matchesStatus = this.matchesStatusFilter(booking);
            const matchesDate = this.matchesDateFilter(booking);
            
            return matchesSearch && matchesStatus && matchesDate;
        });

        this.updateStatistics();
        this.renderTrialBookings();
    }

    matchesSearchFilter(booking) {
        if (!this.currentFilters.search) return true;
        
        const searchTerm = this.currentFilters.search;
        return (
            booking.customerName?.toLowerCase().includes(searchTerm) ||
            booking.email?.toLowerCase().includes(searchTerm) ||
            booking.phone?.toLowerCase().includes(searchTerm) ||
            booking.fitnessGoal?.toLowerCase().includes(searchTerm)
        );
    }

    matchesStatusFilter(booking) {
        if (!this.currentFilters.status) return true;
        return booking.status === this.currentFilters.status;
    }

    matchesDateFilter(booking) {
        if (!this.currentFilters.date) return true;
        
        const bookingDate = new Date(booking.preferredDate);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        switch (this.currentFilters.date) {
            case 'today':
                return this.isSameDay(bookingDate, today);
            case 'tomorrow':
                return this.isSameDay(bookingDate, tomorrow);
            case 'this-week':
                return this.isInCurrentWeek(bookingDate);
            case 'next-week':
                return this.isInNextWeek(bookingDate);
            case 'this-month':
                return this.isInCurrentMonth(bookingDate);
            default:
                return true;
        }
    }

    isSameDay(date1, date2) {
        return date1.toDateString() === date2.toDateString();
    }

    isInCurrentWeek(date) {
        const today = new Date();
        const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
        const endOfWeek = new Date(today.setDate(today.getDate() - today.getDay() + 6));
        return date >= startOfWeek && date <= endOfWeek;
    }

    isInNextWeek(date) {
        const today = new Date();
        const startOfNextWeek = new Date(today.setDate(today.getDate() - today.getDay() + 7));
        const endOfNextWeek = new Date(today.setDate(today.getDate() - today.getDay() + 13));
        return date >= startOfNextWeek && date <= endOfNextWeek;
    }

    isInCurrentMonth(date) {
        const today = new Date();
        return date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
    }

    updateStatistics() {
        const total = this.trialBookings.length;
        const pending = this.trialBookings.filter(b => b.status === 'pending').length;
        const confirmed = this.trialBookings.filter(b => b.status === 'confirmed').length;
        
        // Calculate this week's bookings
        const thisWeek = this.trialBookings.filter(booking => {
            const bookingDate = new Date(booking.createdAt || booking.preferredDate);
            return this.isInCurrentWeek(bookingDate);
        }).length;

        // Update statistics in UI
        this.updateStatElement('totalTrialBookings', total);
        this.updateStatElement('pendingTrialBookings', pending);
        this.updateStatElement('confirmedTrialBookings', confirmed);
        this.updateStatElement('thisWeekTrialBookings', thisWeek);
        this.updateStatElement('trialBookingsCount', this.filteredBookings.length);
    }

    updateStatElement(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
        }
    }

    renderTrialBookings() {
        const tableContainer = document.getElementById('trialBookingsTableContainer');
        const table = document.getElementById('trialBookingsTable');
        const tbody = document.getElementById('trialBookingsTableBody');
        const emptyState = document.getElementById('trialBookingsEmpty');

        if (!tableContainer || !table || !tbody || !emptyState) {
            console.error('Trial bookings table elements not found');
            return;
        }

        if (this.filteredBookings.length === 0) {
            table.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }

        table.style.display = 'table';
        emptyState.style.display = 'none';

        tbody.innerHTML = '';

        this.filteredBookings.forEach(booking => {
            const row = this.createBookingRow(booking);
            tbody.appendChild(row);
        });
    }

    createBookingRow(booking) {
        const row = document.createElement('tr');
        row.style.borderBottom = '1px solid #eee';

        const statusBadge = this.getStatusBadge(booking.status);
        const preferredDate = new Date(booking.preferredDate).toLocaleDateString();
        const createdDate = new Date(booking.createdAt || Date.now()).toLocaleDateString();

        // Check if user profile data is available
        const hasProfilePicture = booking.userProfile && booking.userProfile.profilePicture;
        const profileImageSrc = hasProfilePicture ? 
            (booking.userProfile.profilePicture.startsWith('http') ? 
                booking.userProfile.profilePicture : 
                `http://localhost:5000${booking.userProfile.profilePicture}`) : 
            `http://localhost:5000/uploads/profile-pics/default.png`;

        const profileDisplay = hasProfilePicture ? 
            `<img src="${profileImageSrc}" alt="Profile" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;" 
                  onerror="this.src='http://localhost:5000/uploads/profile-pics/default.png'">` :
            `<div style="width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 1.1rem;">
                ${(booking.customerName || 'N').charAt(0).toUpperCase()}
            </div>`;

        row.innerHTML = `
            <td style="padding: 16px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    ${profileDisplay}
                    <div>
                        <div style="font-weight: 600; color: #1f2937;">${booking.customerName || 'N/A'}</div>
                        <div style="font-size: 0.9rem; color: #6b7280;">${booking.fitnessGoal || 'General Fitness'}</div>
                    </div>
                </div>
            </td>
            <td style="padding: 16px;">
                <div style="color: #1f2937;">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                        <i class="fas fa-envelope" style="color: #6b7280; font-size: 0.9rem;"></i>
                        <span style="font-size: 0.9rem;">${booking.email || 'N/A'}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-phone" style="color: #6b7280; font-size: 0.9rem;"></i>
                        <span style="font-size: 0.9rem;">${booking.phone || 'N/A'}</span>
                    </div>
                </div>
            </td>
            <td style="padding: 16px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-calendar" style="color: #1976d2;"></i>
                    <span style="font-weight: 500;">${preferredDate}</span>
                </div>
            </td>
            <td style="padding: 16px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-clock" style="color: #1976d2;"></i>
                    <span style="font-weight: 500;">${booking.preferredTime || 'Flexible'}</span>
                </div>
            </td>
            <td style="padding: 16px;">
                <span style="background: #e3f2fd; color: #1976d2; padding: 6px 12px; border-radius: 20px; font-size: 0.9rem; font-weight: 500;">
                    ${booking.fitnessGoal || 'General Fitness'}
                </span>
            </td>
            <td style="padding: 16px;">
                ${statusBadge}
            </td>
            <td style="padding: 16px;">
                <span style="color: #6b7280; font-size: 0.9rem;">${createdDate}</span>
            </td>
            <td style="padding: 16px; text-align: center;">
                <div style="display: flex; gap: 8px; justify-content: center;">
                    <button onclick="trialBookingsManager.viewBookingDetails('${booking._id || booking.id}')" 
                            style="background: #1976d2; color: white; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer; font-size: 0.9rem;" 
                            title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button onclick="trialBookingsManager.contactCustomer('${booking._id || booking.id}')" 
                            style="background: #059669; color: white; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer; font-size: 0.9rem;" 
                            title="Contact Customer">
                        <i class="fas fa-phone"></i>
                    </button>
                    ${booking.status !== 'confirmed' ? 
                        `<button onclick="trialBookingsManager.confirmBooking('${booking._id || booking.id}')" 
                                style="background: #059669; color: white; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer; font-size: 0.9rem;" 
                                title="Confirm Booking & Send Email">
                            <i class="fas fa-check"></i>
                        </button>` : 
                        `<span style="background: #d1fae5; color: #059669; padding: 8px 12px; border-radius: 6px; font-size: 0.9rem;">
                            <i class="fas fa-check-circle"></i> Confirmed
                        </span>`
                    }
                </div>
            </td>
        `;

        return row;
    }

    getStatusBadge(status) {
        const statusConfig = {
            'pending': { color: '#f59e0b', bg: '#fef3c7', text: 'Pending' },
            'confirmed': { color: '#059669', bg: '#d1fae5', text: 'Confirmed' },
            'contacted': { color: '#3b82f6', bg: '#dbeafe', text: 'Contacted' },
            'completed': { color: '#059669', bg: '#d1fae5', text: 'Completed' },
            'cancelled': { color: '#dc2626', bg: '#fee2e2', text: 'Cancelled' },
            'no-show': { color: '#6b7280', bg: '#f3f4f6', text: 'No Show' }
        };

        const config = statusConfig[status] || statusConfig['pending'];
        
        return `
            <span style="background: ${config.bg}; color: ${config.color}; padding: 6px 12px; border-radius: 20px; font-size: 0.9rem; font-weight: 500;">
                ${config.text}
            </span>
        `;
    }

    async viewBookingDetails(bookingId) {
        const booking = this.trialBookings.find(b => (b._id || b.id) === bookingId);
        if (!booking) {
            console.error('Booking not found:', bookingId);
            return;
        }

        // Create detailed view modal
        const modalHtml = `
            <div class="booking-details-modal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9999; display: flex; align-items: center; justify-content: center;">
                <div style="background: white; border-radius: 12px; width: 90%; max-width: 600px; max-height: 90vh; overflow-y: auto;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 24px; border-radius: 12px 12px 0 0;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <h2 style="margin: 0; font-size: 1.5rem;">Trial Booking Details</h2>
                            <button onclick="this.closest('.booking-details-modal').remove()" style="background: none; border: none; color: white; font-size: 1.5rem; cursor: pointer;">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div style="padding: 24px;">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px;">
                            <div>
                                <h3 style="margin: 0 0 16px 0; color: #1f2937; font-size: 1.2rem;">Customer Information</h3>
                                <div style="space-y: 12px;">
                                    <div style="margin-bottom: 12px;">
                                        <strong>Name:</strong> ${booking.customerName || 'N/A'}
                                    </div>
                                    <div style="margin-bottom: 12px;">
                                        <strong>Email:</strong> ${booking.email || 'N/A'}
                                    </div>
                                    <div style="margin-bottom: 12px;">
                                        <strong>Phone:</strong> ${booking.phone || 'N/A'}
                                    </div>
                                    <div style="margin-bottom: 12px;">
                                        <strong>Age:</strong> ${booking.age || 'N/A'}
                                    </div>
                                </div>
                            </div>
                            
                            <div>
                                <h3 style="margin: 0 0 16px 0; color: #1f2937; font-size: 1.2rem;">Booking Details</h3>
                                <div style="space-y: 12px;">
                                    <div style="margin-bottom: 12px;">
                                        <strong>Preferred Date:</strong> ${new Date(booking.preferredDate).toLocaleDateString()}
                                    </div>
                                    <div style="margin-bottom: 12px;">
                                        <strong>Preferred Time:</strong> ${booking.preferredTime || 'Flexible'}
                                    </div>
                                    <div style="margin-bottom: 12px;">
                                        <strong>Fitness Goal:</strong> ${booking.fitnessGoal || 'General Fitness'}
                                    </div>
                                    <div style="margin-bottom: 12px;">
                                        <strong>Status:</strong> ${this.getStatusBadge(booking.status)}
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        ${booking.message ? `
                            <div style="margin-bottom: 24px;">
                                <h3 style="margin: 0 0 16px 0; color: #1f2937; font-size: 1.2rem;">Message</h3>
                                <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; color: #374151;">
                                    ${booking.message}
                                </div>
                            </div>
                        ` : ''}
                        
                        <div style="display: flex; gap: 12px; justify-content: flex-end;">
                            <button onclick="trialBookingsManager.contactCustomer('${bookingId}')" 
                                    style="background: #059669; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-weight: 500;">
                                <i class="fas fa-phone"></i> Contact Customer
                            </button>
                            <button onclick="trialBookingsManager.updateBookingStatus('${bookingId}', 'confirmed')" 
                                    style="background: #1976d2; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-weight: 500;">
                                <i class="fas fa-check"></i> Confirm Booking
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    async contactCustomer(bookingId) {
        const booking = this.trialBookings.find(b => (b._id || b.id) === bookingId);
        if (!booking) {
            console.error('Booking not found:', bookingId);
            return;
        }

        // Create contact options modal
        const modalHtml = `
            <div class="contact-customer-modal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9999; display: flex; align-items: center; justify-content: center;">
                <div style="background: white; border-radius: 12px; width: 90%; max-width: 500px;">
                    <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); color: white; padding: 24px; border-radius: 12px 12px 0 0;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <h2 style="margin: 0; font-size: 1.5rem;">Contact Customer</h2>
                            <button onclick="this.closest('.contact-customer-modal').remove()" style="background: none; border: none; color: white; font-size: 1.5rem; cursor: pointer;">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div style="padding: 24px;">
                        <div style="margin-bottom: 24px;">
                            <h3 style="margin: 0 0 8px 0;">${booking.customerName || 'Customer'}</h3>
                            <p style="color: #6b7280; margin: 0;">Choose how you'd like to contact this customer:</p>
                        </div>
                        
                        <div style="display: flex; flex-direction: column; gap: 12px;">
                            ${booking.phone ? `
                                <button onclick="window.open('tel:${booking.phone}', '_self')" 
                                        style="background: #1976d2; color: white; border: none; padding: 16px; border-radius: 8px; cursor: pointer; font-weight: 500; text-align: left; display: flex; align-items: center; gap: 12px;">
                                    <i class="fas fa-phone"></i>
                                    <div>
                                        <div>Call ${booking.phone}</div>
                                        <div style="font-size: 0.9rem; opacity: 0.8;">Make a direct phone call</div>
                                    </div>
                                </button>
                            ` : ''}
                            
                            ${booking.email ? `
                                <button onclick="window.open('mailto:${booking.email}?subject=Trial Session Booking&body=Hi ${booking.customerName || 'there'},%0A%0AThank you for your interest in our gym. We would like to schedule your trial session.%0A%0ABest regards,%0AYour Gym Team', '_blank')" 
                                        style="background: #dc2626; color: white; border: none; padding: 16px; border-radius: 8px; cursor: pointer; font-weight: 500; text-align: left; display: flex; align-items: center; gap: 12px;">
                                    <i class="fas fa-envelope"></i>
                                    <div>
                                        <div>Email ${booking.email}</div>
                                        <div style="font-size: 0.9rem; opacity: 0.8;">Send an email</div>
                                    </div>
                                </button>
                            ` : ''}
                            
                            ${booking.phone ? `
                                <button onclick="window.open('https://wa.me/${booking.phone.replace(/[^0-9]/g, '')}?text=Hi ${booking.customerName || 'there'}, thank you for your interest in our gym. We would like to schedule your trial session.', '_blank')" 
                                        style="background: #059669; color: white; border: none; padding: 16px; border-radius: 8px; cursor: pointer; font-weight: 500; text-align: left; display: flex; align-items: center; gap: 12px;">
                                    <i class="fab fa-whatsapp"></i>
                                    <div>
                                        <div>WhatsApp ${booking.phone}</div>
                                        <div style="font-size: 0.9rem; opacity: 0.8;">Send a WhatsApp message</div>
                                    </div>
                                </button>
                            ` : ''}
                        </div>
                        
                        <div style="margin-top: 24px; text-align: center;">
                            <button onclick="trialBookingsManager.markAsContacted('${bookingId}')" 
                                    style="background: #f59e0b; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-weight: 500;">
                                <i class="fas fa-check"></i> Mark as Contacted
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    async markAsContacted(bookingId) {
        await this.updateBookingStatus(bookingId, 'contacted');
        
        // Close any open modals
        document.querySelectorAll('.contact-customer-modal').forEach(modal => modal.remove());
    }

    async confirmBooking(bookingId) {
        try {
            // Find the booking details
            const booking = this.trialBookings.find(b => (b._id || b.id) === bookingId);
            if (!booking) {
                throw new Error('Booking not found');
            }

            // Show enhanced confirmation modal
            this.showTrialConfirmationModal(booking);

        } catch (error) {
            console.error('Error showing confirmation modal:', error);
            this.showError(error.message || 'Failed to load booking details. Please try again.');
        }
    }

    async updateBookingStatus(bookingId, newStatus) {
        try {
            const response = await fetch(`/api/gyms/trial-bookings/${bookingId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('gymAdminToken')}`
                },
                body: JSON.stringify({ status: newStatus })
            });

            if (!response.ok) {
                throw new Error(`Failed to update booking status: ${response.statusText}`);
            }

            // Update local data
            const bookingIndex = this.trialBookings.findIndex(b => (b._id || b.id) === bookingId);
            if (bookingIndex !== -1) {
                this.trialBookings[bookingIndex].status = newStatus;
            }

            // Refresh display
            this.applyFilters();
            
            // Show success message
            this.showSuccessMessage(`Booking status updated to ${newStatus}`);

        } catch (error) {
            console.error('Error updating booking status:', error);
            this.showError('Failed to update booking status. Please try again.');
        }
    }

    showLoading() {
        const loading = document.getElementById('trialBookingsLoading');
        const table = document.getElementById('trialBookingsTable');
        const empty = document.getElementById('trialBookingsEmpty');
        
        if (loading) loading.style.display = 'block';
        if (table) table.style.display = 'none';
        if (empty) empty.style.display = 'none';
    }

    hideLoading() {
        const loading = document.getElementById('trialBookingsLoading');
        if (loading) loading.style.display = 'none';
    }

    showError(message) {
        // Create a simple error toast
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #dc2626;
            color: white;
            padding: 16px 24px;
            border-radius: 8px;
            z-index: 10000;
            max-width: 400px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        `;
        toast.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px;">
                <i class="fas fa-exclamation-circle"></i>
                <span>${message}</span>
            </div>
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 5000);
    }

    showSuccessMessage(message) {
        // Create a simple success toast
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #059669;
            color: white;
            padding: 16px 24px;
            border-radius: 8px;
            z-index: 10000;
            max-width: 400px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        `;
        toast.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px;">
                <i class="fas fa-check-circle"></i>
                <span>${message}</span>
            </div>
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
}

// Dashboard Trial Bookings Manager
class DashboardTrialBookingsManager {
    constructor() {
        this.trialBookings = [];
        this.filteredBookings = [];
        this.maxDisplayItems = 5; // Show only recent 5 bookings on dashboard
        this.currentFilter = '';
        this.init();
    }

    async init() {
        console.log('Initializing Dashboard Trial Bookings Manager...');
        await this.loadTrialBookings();
        this.initializeEventListeners();
        this.renderDashboardTrialBookings();
    }

    initializeEventListeners() {
        // Status filter for dashboard
        const dashboardStatusFilter = document.getElementById('dashboardTrialStatusFilter');
        if (dashboardStatusFilter) {
            dashboardStatusFilter.addEventListener('change', (e) => {
                this.currentFilter = e.target.value;
                this.applyDashboardFilters();
            });
        }
    }

    async loadTrialBookings() {
        try {
            this.showDashboardLoading();
            
            const gymId = localStorage.getItem('gymId');
            if (!gymId) {
                throw new Error('Gym ID not found');
            }

            const token = localStorage.getItem('gymAdminToken');
            if (!token) {
                throw new Error('Authentication token not found');
            }

            const response = await fetch(`/api/gyms/trial-bookings/${gymId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('API Response:', data);
            
            // Handle the API response format from gymRoutes.js
            if (data.success && data.bookings) {
                this.trialBookings = Array.isArray(data.bookings) ? data.bookings : [];
            } else if (data.bookings) {
                this.trialBookings = Array.isArray(data.bookings) ? data.bookings : [];
            } else if (Array.isArray(data)) {
                this.trialBookings = data;
            } else {
                this.trialBookings = [];
            }
            
            console.log('Processed trial bookings:', this.trialBookings);
            this.applyDashboardFilters();
            
        } catch (error) {
            console.error('Error loading trial bookings:', error);
            this.trialBookings = []; // Initialize as empty array on error
            this.showDashboardError('Failed to load trial bookings');
        }
    }

    applyDashboardFilters() {
        // Ensure trialBookings is initialized as an array
        if (!Array.isArray(this.trialBookings)) {
            this.trialBookings = [];
        }
        
        this.filteredBookings = this.trialBookings.filter(booking => {
            const statusMatch = !this.currentFilter || booking.status === this.currentFilter;
            return statusMatch;
        });

        // Sort by created date (most recent first) and limit to maxDisplayItems
        this.filteredBookings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        this.filteredBookings = this.filteredBookings.slice(0, this.maxDisplayItems);
        
        this.renderDashboardTrialBookings();
    }

    renderDashboardTrialBookings() {
        const tableBody = document.getElementById('dashboardTrialBookingsTableBody');

        if (!tableBody) return;

        // Remove loading row
        const loadingRow = tableBody.querySelector('.loading-row');
        if (loadingRow) {
            loadingRow.remove();
        }

        if (this.filteredBookings.length === 0) {
            tableBody.innerHTML = `
                <tr class="empty-row">
                    <td colspan="6" style="text-align:center; padding: 40px;">
                        <div class="empty-state">
                            <i class="fas fa-calendar-times" style="font-size: 2rem; margin-bottom: 12px; color: #9ca3af;"></i>
                            <h4>No Trial Bookings</h4>
                            <p style="color: #64748b;">No recent trial bookings to display.</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = this.filteredBookings.map(booking => this.createDashboardBookingRow(booking)).join('');
    }

    createDashboardBookingRow(booking) {
        const statusColors = {
            pending: '#fbbf24',
            confirmed: '#10b981',
            contacted: '#3b82f6',
            completed: '#22c55e',
            cancelled: '#ef4444',
            'no-show': '#6b7280'
        };

        const statusColor = statusColors[booking.status] || '#6b7280';
        const customerName = booking.customerName || booking.name || 'Unknown Customer';
        
        // Fix profile picture URL - check if userProfile data is available
        let profilePicUrl;
        if (booking.userProfile && booking.userProfile.profilePicture) {
            profilePicUrl = booking.userProfile.profilePicture.startsWith('http') ? 
                booking.userProfile.profilePicture : 
                `http://localhost:5000${booking.userProfile.profilePicture}`;
        } else {
            // Fallback to generated avatar
            profilePicUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(customerName)}&background=667eea&color=fff&size=40`;
        }

        // Handle different field names that might come from the API
        const email = booking.customerEmail || booking.email || 'N/A';
        const phone = booking.customerPhone || booking.phone || 'N/A';
        const timeSlot = booking.preferredTimeSlot || booking.preferredTime || booking.timeSlot || 'Not specified';
        const activity = booking.preferredActivity || booking.fitnessGoal || booking.activity || 'General fitness';
        const date = booking.preferredDate || booking.trialDate || null;

        // Format time slot with date if available
        const formattedTimeSlot = date ? 
            `${new Date(date).toLocaleDateString()} - ${timeSlot}` : 
            timeSlot;

        return `
            <tr class="booking-row">
                <td>
                    <div class="profile-cell">
                        <img src="${profilePicUrl}" alt="${customerName}" class="profile-pic"
                             onerror="this.src='http://localhost:5000/uploads/profile-pics/default.png'"
                             style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">
                    </div>
                </td>
                <td>
                    <div class="name-cell">
                        <strong style="color: var(--text-primary);">${customerName}</strong>
                        <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 2px;">
                            ${email !== 'N/A' ? email : phone}
                        </div>
                    </div>
                </td>
                <td>
                    <div class="time-cell">
                        <i class="fas fa-clock" style="color: var(--primary); margin-right: 6px;"></i>
                        <span style="font-size: 0.9rem;">${formattedTimeSlot}</span>
                    </div>
                </td>
                <td>
                    <div class="activity-cell">
                        <i class="fas fa-dumbbell" style="color: var(--primary); margin-right: 6px;"></i>
                        <span style="font-size: 0.9rem;">${activity}</span>
                    </div>
                </td>
                <td>
                    <span class="status-badge" style="
                        background: ${statusColor}; 
                        color: white; 
                        padding: 4px 8px; 
                        border-radius: 4px; 
                        font-size: 0.8rem; 
                        font-weight: 600;
                        text-transform: capitalize;
                    ">
                        ${booking.status}
                    </span>
                </td>
                <td>
                    <div class="action-buttons" style="display: flex; gap: 4px;">
                        ${booking.status === 'pending' ? `
                            <button class="action-btn confirm-btn" 
                                    onclick="dashboardTrialBookings.updateBookingStatus('${booking._id || booking.id}', 'confirmed')"
                                    style="background: #10b981; color: white; border: none; padding: 6px 12px; border-radius: 4px; font-size: 0.8rem; cursor: pointer;"
                                    title="Confirm Booking">
                                <i class="fas fa-check"></i>
                            </button>
                        ` : ''}
                        <button class="action-btn contact-btn"
                                onclick="dashboardTrialBookings.contactCustomer('${email}', '${phone}', '${customerName}')"
                                style="background: #3b82f6; color: white; border: none; padding: 6px 12px; border-radius: 4px; font-size: 0.8rem; cursor: pointer;"
                                title="Contact Customer">
                            <i class="fas fa-phone"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    async updateBookingStatus(bookingId, newStatus) {
        try {
            const token = localStorage.getItem('gymAdminToken');
            const response = await fetch(`/api/gyms/trial-bookings/${bookingId}/status`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: newStatus })
            });

            if (!response.ok) {
                throw new Error('Failed to update booking status');
            }

            await this.loadTrialBookings();
            this.showDashboardSuccess(`Booking status updated to ${newStatus}`);
            
        } catch (error) {
            console.error('Error updating booking status:', error);
            this.showDashboardError('Failed to update booking status');
        }
    }

    contactCustomer(email, phone, name) {
        const message = `Hello ${name}, thank you for your interest in our gym. We'd like to discuss your trial session. Please call us back or reply to this message.`;
        
        // Create contact options modal
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0; 
            background: rgba(0,0,0,0.5); display: flex; align-items: center; 
            justify-content: center; z-index: 10000;
        `;
        
        modal.innerHTML = `
            <div style="background: white; padding: 24px; border-radius: 12px; max-width: 400px; width: 90%;">
                <h3 style="margin: 0 0 16px 0; color: #1f2937;">Contact ${name}</h3>
                <div style="margin-bottom: 16px;">
                    <p style="margin: 0 0 12px 0; color: #6b7280;">Choose how to contact this customer:</p>
                    <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                        <a href="tel:${phone}" style="
                            display: flex; align-items: center; gap: 8px; 
                            padding: 10px 16px; background: #10b981; color: white; 
                            text-decoration: none; border-radius: 6px; font-size: 0.9rem;
                        ">
                            <i class="fas fa-phone"></i> Call ${phone}
                        </a>
                        <a href="mailto:${email}?subject=Trial Session Inquiry&body=${encodeURIComponent(message)}" style="
                            display: flex; align-items: center; gap: 8px; 
                            padding: 10px 16px; background: #3b82f6; color: white; 
                            text-decoration: none; border-radius: 6px; font-size: 0.9rem;
                        ">
                            <i class="fas fa-envelope"></i> Email
                        </a>
                    </div>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" style="
                    width: 100%; padding: 10px; background: #6b7280; color: white; 
                    border: none; border-radius: 6px; cursor: pointer;
                ">Close</button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    showDashboardLoading() {
        const tableBody = document.getElementById('dashboardTrialBookingsTableBody');
        
        if (tableBody) {
            tableBody.innerHTML = `
                <tr class="loading-row">
                    <td colspan="6" style="text-align:center; padding: 40px;">
                        <div class="loading-spinner">
                            <i class="fas fa-spinner fa-spin" style="font-size: 1.5rem; color: var(--primary);"></i>
                            <p style="margin-top: 12px; color: #64748b;">Loading trial bookings...</p>
                        </div>
                    </td>
                </tr>
            `;
        }
    }

    hideDashboardLoading() {
        const tableBody = document.getElementById('dashboardTrialBookingsTableBody');
        if (tableBody) {
            const loadingRow = tableBody.querySelector('.loading-row');
            if (loadingRow) {
                loadingRow.remove();
            }
        }
    }

    showDashboardError(message) {
        const tableBody = document.getElementById('dashboardTrialBookingsTableBody');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr class="error-row">
                    <td colspan="6" style="text-align:center; padding: 40px;">
                        <div class="error-state">
                            <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 12px; color: #ef4444;"></i>
                            <h4 style="color: #ef4444;">Error</h4>
                            <p style="color: #64748b;">${message}</p>
                        </div>
                    </td>
                </tr>
            `;
        }
    }

    showDashboardSuccess(message) {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed; top: 20px; right: 20px; background: #10b981; 
            color: white; padding: 12px 20px; border-radius: 8px; 
            box-shadow: 0 4px 6px rgba(0,0,0,0.1); z-index: 10000;
            font-size: 0.9rem; max-width: 300px;
        `;
        
        toast.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <i class="fas fa-check-circle"></i>
                <span>${message}</span>
            </div>
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    // Enhanced Trial Confirmation Modal
    showTrialConfirmationModal(booking) {
        const modalId = 'trialConfirmationModal';
        
        // Remove existing modal if present
        const existingModal = document.getElementById(modalId);
        if (existingModal) {
            existingModal.remove();
        }

        const modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'modal';
        modal.style.display = 'flex';
        modal.style.zIndex = '100000';

        modal.innerHTML = `
            <div class="modal-content" style="max-width: 700px; max-height: 90vh; overflow-y: auto;">
                <div class="modal-header-style" style="background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%); color: white; padding: 24px; margin: -20px -20px 20px -20px; border-radius: 12px 12px 0 0;">
                    <h3 class="modal-title-style" style="margin: 0; display: flex; align-items: center; gap: 12px; color: white;">
                        <div style="background: rgba(255,255,255,0.2); padding: 12px; border-radius: 10px;">
                            <i class="fas fa-calendar-check" style="font-size: 1.5rem;"></i>
                        </div>
                        <div>
                            <div style="font-size: 1.4rem; font-weight: 700; margin-bottom: 4px;">Confirm Trial Booking</div>
                            <div style="font-size: 0.9rem; opacity: 0.9;">Send professional confirmation to customer</div>
                        </div>
                    </h3>
                    <button class="modal-close" onclick="this.closest('.modal').remove()" style="background: none; border: none; color: white; font-size: 24px; cursor: pointer; padding: 8px; border-radius: 50%; transition: background 0.2s;">&times;</button>
                </div>

                <div class="modal-body">
                    <!-- Customer Details Section -->
                    <div class="confirmation-section" style="background: #f8fafc; padding: 20px; border-radius: 12px; margin-bottom: 24px; border-left: 4px solid #1976d2;">
                        <h4 style="margin: 0 0 16px 0; color: #1976d2; display: flex; align-items: center; gap: 8px;">
                            <i class="fas fa-user"></i> Customer Details
                        </h4>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
                            <div><strong>Name:</strong> ${booking.name || 'N/A'}</div>
                            <div><strong>Email:</strong> ${booking.email || 'N/A'}</div>
                            <div><strong>Phone:</strong> ${booking.phone || 'N/A'}</div>
                            <div><strong>Preferred Date:</strong> ${booking.preferredDate ? new Date(booking.preferredDate).toLocaleDateString() : 'N/A'}</div>
                            <div><strong>Preferred Time:</strong> ${booking.preferredTime || 'N/A'}</div>
                            <div><strong>Fitness Goals:</strong> ${booking.fitnessGoals || 'N/A'}</div>
                        </div>
                    </div>

                    <!-- Notification Options -->
                    <div class="confirmation-section" style="margin-bottom: 24px;">
                        <h4 style="margin: 0 0 16px 0; color: #1976d2; display: flex; align-items: center; gap: 8px;">
                            <i class="fas fa-bell"></i> Confirmation Method
                        </h4>
                        <div class="notification-options" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                            <label class="notification-option" style="display: flex; align-items: center; gap: 12px; padding: 16px; border: 2px solid #e5e7eb; border-radius: 12px; cursor: pointer; transition: all 0.3s ease; background: white;">
                                <input type="checkbox" id="sendEmail" checked style="width: 20px; height: 20px; accent-color: #1976d2;">
                                <div style="flex: 1;">
                                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                                        <i class="fas fa-envelope" style="color: #1976d2; font-size: 1.2rem;"></i>
                                        <strong style="color: #1f2937;">Email Confirmation</strong>
                                    </div>
                                    <div style="font-size: 0.85rem; color: #6b7280;">Professional branded email with trial details</div>
                                </div>
                            </label>
                            
                            <label class="notification-option" style="display: flex; align-items: center; gap: 12px; padding: 16px; border: 2px solid #e5e7eb; border-radius: 12px; cursor: pointer; transition: all 0.3s ease; background: white;">
                                <input type="checkbox" id="sendWhatsApp" ${booking.whatsappConsent ? 'checked' : ''} style="width: 20px; height: 20px; accent-color: #25d366;">
                                <div style="flex: 1;">
                                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                                        <i class="fab fa-whatsapp" style="color: #25d366; font-size: 1.2rem;"></i>
                                        <strong style="color: #1f2937;">WhatsApp Message</strong>
                                    </div>
                                    <div style="font-size: 0.85rem; color: #6b7280;">Quick confirmation via WhatsApp</div>
                                </div>
                            </label>
                        </div>
                    </div>

                    <!-- Email Preview Section -->
                    <div class="confirmation-section" style="margin-bottom: 24px;">
                        <h4 style="margin: 0 0 16px 0; color: #1976d2; display: flex; align-items: center; gap: 8px;">
                            <i class="fas fa-eye"></i> Email Preview
                        </h4>
                        <div class="email-preview" style="border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; background: white;">
                            <div class="email-header" style="background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%); color: white; padding: 20px; text-align: center;">
                                <div style="font-size: 2rem; font-weight: 800; letter-spacing: 1px; margin-bottom: 8px;">
                                    <i class="fas fa-dumbbell" style="margin-right: 12px;"></i>Gym-Wale
                                </div>
                                <div style="font-size: 1rem; opacity: 0.9;">Your Fitness Journey Starts Here</div>
                            </div>
                            <div class="email-body" style="padding: 24px;">
                                <h3 style="color: #1976d2; margin: 0 0 16px 0; font-size: 1.3rem;">
                                    🎉 Trial Booking Confirmed!
                                </h3>
                                <p style="margin-bottom: 16px; color: #374151; line-height: 1.6;">
                                    Dear <strong>${booking.name}</strong>,
                                </p>
                                <p style="margin-bottom: 20px; color: #374151; line-height: 1.6;">
                                    Great news! Your trial session has been confirmed. We're excited to welcome you to our gym and help you achieve your fitness goals.
                                </p>
                                
                                <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #1976d2; margin-bottom: 20px;">
                                    <h4 style="margin: 0 0 12px 0; color: #1976d2;">📅 Your Trial Session Details:</h4>
                                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.95rem;">
                                        <div><strong>Date:</strong> ${booking.preferredDate ? new Date(booking.preferredDate).toLocaleDateString() : 'TBD'}</div>
                                        <div><strong>Time:</strong> ${booking.preferredTime || 'TBD'}</div>
                                        <div><strong>Duration:</strong> 60 minutes</div>
                                        <div><strong>Type:</strong> Trial Session</div>
                                    </div>
                                </div>

                                <div style="background: #ecfdf5; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
                                    <h4 style="margin: 0 0 8px 0; color: #059669;">✅ What to Bring:</h4>
                                    <ul style="margin: 0; padding-left: 20px; color: #374151;">
                                        <li>Comfortable workout clothes</li>
                                        <li>Water bottle</li>
                                        <li>Towel</li>
                                        <li>Valid ID proof</li>
                                    </ul>
                                </div>

                                <p style="margin-bottom: 16px; color: #374151; line-height: 1.6;">
                                    If you have any questions or need to reschedule, please don't hesitate to contact us.
                                </p>
                                
                                <div style="text-align: center; margin: 24px 0;">
                                    <div style="background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%); color: white; padding: 16px 32px; border-radius: 8px; display: inline-block; font-weight: 600;">
                                        Ready to Transform Your Fitness Journey?
                                    </div>
                                </div>
                            </div>
                            <div class="email-footer" style="background: #f9fafb; padding: 16px; text-align: center; color: #6b7280; font-size: 0.85rem; border-top: 1px solid #e5e7eb;">
                                <p style="margin: 0 0 8px 0;">Best regards,<br><strong>Gym-Wale Team</strong></p>
                                <p style="margin: 0; font-size: 0.8rem;">© 2024 Gym-Wale. All rights reserved.</p>
                            </div>
                        </div>
                    </div>

                    <!-- Additional Message -->
                    <div class="confirmation-section" style="margin-bottom: 24px;">
                        <h4 style="margin: 0 0 12px 0; color: #1976d2; display: flex; align-items: center; gap: 8px;">
                            <i class="fas fa-comment"></i> Additional Message (Optional)
                        </h4>
                        <textarea 
                            id="additionalMessage" 
                            placeholder="Add any additional instructions or welcome message..."
                            style="width: 100%; min-height: 80px; padding: 12px; border: 1px solid #d1d5db; border-radius: 8px; resize: vertical; font-family: inherit; font-size: 0.9rem;"
                        ></textarea>
                    </div>

                    <!-- Action Buttons -->
                    <div style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 24px;">
                        <button 
                            onclick="this.closest('.modal').remove()" 
                            style="padding: 12px 24px; border: 1px solid #d1d5db; background: white; color: #374151; border-radius: 8px; cursor: pointer; font-weight: 600; transition: all 0.2s ease;"
                        >
                            Cancel
                        </button>
                        <button 
                            onclick="trialBookingsManager.processTrialConfirmation('${booking._id || booking.id}')" 
                            style="padding: 12px 32px; background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; transition: all 0.2s ease; display: flex; align-items: center; gap: 8px;"
                        >
                            <i class="fas fa-paper-plane"></i>
                            Confirm & Send
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Add CSS for better styling
        const style = document.createElement('style');
        style.textContent = `
            .notification-option:hover {
                border-color: #1976d2 !important;
                background: #f8fafc !important;
            }
            .notification-option input:checked + div {
                color: #1976d2;
            }
            .email-preview {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(modal);
    }

    // Process the trial confirmation
    async processTrialConfirmation(bookingId) {
        try {
            const modal = document.getElementById('trialConfirmationModal');
            const sendEmail = document.getElementById('sendEmail').checked;
            const sendWhatsApp = document.getElementById('sendWhatsApp').checked;
            const additionalMessage = document.getElementById('additionalMessage').value;

            if (!sendEmail && !sendWhatsApp) {
                this.showError('Please select at least one notification method.');
                return;
            }

            // Show loading state
            const confirmBtn = modal.querySelector('button[onclick*="processTrialConfirmation"]');
            const originalText = confirmBtn.innerHTML;
            confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
            confirmBtn.disabled = true;

            const response = await fetch(`/api/gyms/trial-bookings/${bookingId}/confirm`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('gymAdminToken')}`
                },
                body: JSON.stringify({
                    sendEmail,
                    sendWhatsApp,
                    additionalMessage
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Failed to confirm booking: ${response.statusText}`);
            }

            const result = await response.json();

            // Update local data
            const bookingIndex = this.trialBookings.findIndex(b => (b._id || b.id) === bookingId);
            if (bookingIndex !== -1) {
                this.trialBookings[bookingIndex].status = 'confirmed';
            }

            // Close modal
            modal.remove();

            // Refresh display
            this.applyFilters();
            
            // Show success message with details
            let successMessage = 'Trial booking confirmed successfully!';
            if (sendEmail && sendWhatsApp) {
                successMessage += ' Email and WhatsApp confirmations sent.';
            } else if (sendEmail) {
                successMessage += ' Email confirmation sent.';
            } else if (sendWhatsApp) {
                successMessage += ' WhatsApp confirmation sent.';
            }

            this.showSuccessMessage(successMessage);

        } catch (error) {
            console.error('Error confirming booking:', error);
            
            // Reset button state
            const modal = document.getElementById('trialConfirmationModal');
            if (modal) {
                const confirmBtn = modal.querySelector('button[onclick*="processTrialConfirmation"]');
                if (confirmBtn) {
                    confirmBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Confirm & Send';
                    confirmBtn.disabled = false;
                }
            }
            
            this.showError(error.message || 'Failed to confirm booking. Please try again.');
        }
    }
}

// Initialize the trial bookings manager when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.trialBookingsManager = new TrialBookingsManager();
    window.dashboardTrialBookings = new DashboardTrialBookingsManager();
});
