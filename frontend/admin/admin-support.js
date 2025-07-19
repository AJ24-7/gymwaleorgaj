// Support System JavaScript
class SupportSystem {
    constructor() {
        this.BASE_URL = "http://localhost:5000";
        this.currentUserType = 'users';
        this.currentFilters = {
            priority: 'all',
            status: 'all',
            category: 'all',
            search: ''
        };
        this.tickets = [];
        this.selectedTicket = null;
        this.templates = {};
        
        this.init();
    }

    init() {
        console.log('🎫 Support System Initialized');
        this.bindEventListeners();
        this.loadSupportStats();
        this.loadSupportTickets();
        this.loadQuickReplyTemplates();
    }

    bindEventListeners() {
        // Support tab switching
        document.querySelectorAll('.support-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const userType = e.currentTarget.dataset.tab;
                this.switchUserType(userType);
            });
        });

        // Filter changes
        document.getElementById('priorityFilter')?.addEventListener('change', (e) => {
            this.currentFilters.priority = e.target.value;
            this.applyFilters();
        });

        document.getElementById('statusFilter')?.addEventListener('change', (e) => {
            this.currentFilters.status = e.target.value;
            this.applyFilters();
        });

        document.getElementById('categoryFilter')?.addEventListener('change', (e) => {
            this.currentFilters.category = e.target.value;
            this.applyFilters();
        });

        document.getElementById('searchTickets')?.addEventListener('input', (e) => {
            this.currentFilters.search = e.target.value;
            this.applyFilters();
        });

        // Modal close events
        document.getElementById('closeSupportTicketModal')?.addEventListener('click', () => {
            this.closeSupportTicketModal();
        });

        document.getElementById('closeQuickReplyModal')?.addEventListener('click', () => {
            this.closeQuickReplyModal();
        });

        // Modal overlay clicks
        document.querySelector('.support-ticket-modal-overlay')?.addEventListener('click', () => {
            this.closeSupportTicketModal();
        });

        document.querySelector('.quick-reply-modal-overlay')?.addEventListener('click', () => {
            this.closeQuickReplyModal();
        });

        // Send reply
        document.getElementById('sendReply')?.addEventListener('click', () => {
            this.sendReply();
        });

        // Send quick reply
        document.getElementById('sendQuickReply')?.addEventListener('click', () => {
            this.sendQuickReply();
        });

        // Save draft
        document.getElementById('saveReplyDraft')?.addEventListener('click', () => {
            this.saveReplyDraft();
        });

        // Template buttons
        document.querySelectorAll('.template-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const template = e.currentTarget.dataset.template;
                this.selectTemplate(template);
            });
        });

        // Status and priority updates
        document.getElementById('ticketStatusUpdate')?.addEventListener('change', (e) => {
            if (this.selectedTicket) {
                this.updateTicketStatus(this.selectedTicket.ticketId, e.target.value);
            }
        });

        document.getElementById('ticketPriorityUpdate')?.addEventListener('change', (e) => {
            if (this.selectedTicket) {
                this.updateTicketPriority(this.selectedTicket.ticketId, e.target.value);
            }
        });

        // Grievance Success Modal close events
        document.getElementById('closeGrievanceSuccessModal')?.addEventListener('click', () => {
            document.getElementById('grievanceSuccessModal').style.display = 'none';
        });
        document.querySelector('#grievanceSuccessModal .quick-reply-modal-overlay')?.addEventListener('click', () => {
            document.getElementById('grievanceSuccessModal').style.display = 'none';
        });
    }

    // Load support statistics
    async loadSupportStats() {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${this.BASE_URL}/api/support/stats`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.updateSupportStats(data.stats);
            }
        } catch (error) {
            console.error('Error loading support stats:', error);
        }
    }

    // Update support statistics in UI
    updateSupportStats(stats) {
        document.getElementById('openTicketsCount').textContent = stats.openTickets || 0;
        document.getElementById('resolvedTodayCount').textContent = stats.resolvedToday || 0;
        document.getElementById('avgResponseTime').textContent = stats.averageResponseTime ? `${stats.averageResponseTime}m` : '--';

        // Update tab counts
        document.getElementById('userTicketsCount').textContent = `(${stats.byUserType.user || 0})`;
        document.getElementById('gymAdminTicketsCount').textContent = `(${stats.byUserType.gym || 0})`;
        document.getElementById('trainerTicketsCount').textContent = `(${stats.byUserType.trainer || 0})`;
    }

    // Load support tickets
    async loadSupportTickets(userType = this.currentUserType) {
        try {
            console.log('🎫 loadSupportTickets called with userType:', userType);
            console.log('🎫 Current filters:', this.currentFilters);
            
            this.showLoading();
            const token = localStorage.getItem('token');
            const params = new URLSearchParams({
                userType: userType === 'gym-admins' ? 'gym' : userType === 'trainers' ? 'trainer' : 'user',
                ...this.currentFilters
            });

            console.log('🌐 API request params:', params.toString());

            const response = await fetch(`${this.BASE_URL}/api/support/tickets?${params}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                console.log('✅ API response:', data);
                this.tickets = data.tickets || [];
                console.log('🎫 Loaded tickets:', this.tickets.length);
                this.renderTickets();
            } else {
                console.error('❌ API response error:', response.status, response.statusText);
                this.showError('Failed to load support tickets');
            }
        } catch (error) {
            console.error('❌ Error loading support tickets:', error);
            this.showError('Error loading support tickets');
        } finally {
            this.hideLoading();
        }
    }

    // Switch user type tab
    switchUserType(userType) {
        // Update active tab
        document.querySelectorAll('.support-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-tab="${userType}"]`)?.classList.add('active');

        // Update active content
        document.querySelectorAll('.support-tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${userType}-support`)?.classList.add('active');

        this.currentUserType = userType;
        this.loadSupportTickets(userType);
    }

    // Apply filters
    applyFilters() {
        this.loadSupportTickets();
    }

    // Render tickets
    renderTickets() {
        const listId = this.currentUserType === 'gym-admins' ? 'gymAdminTicketsList' : 
                      this.currentUserType === 'trainers' ? 'trainerTicketsList' : 'userTicketsList';
        const container = document.getElementById(listId);
        
        console.log('🎫 renderTickets called:', {
            currentUserType: this.currentUserType,
            listId: listId,
            containerFound: !!container,
            ticketsCount: this.tickets.length
        });
        
        if (!container) {
            console.error('❌ Container not found:', listId);
            return;
        }

        if (this.tickets.length === 0) {
            console.log('📭 No tickets to display, showing empty state');
            container.innerHTML = this.getEmptyStateHTML();
            return;
        }

        console.log('🎫 Rendering tickets:', this.tickets.map(t => ({ id: t.ticketId, status: t.status, priority: t.priority })));
        const ticketsHTML = this.tickets.map(ticket => this.createTicketCardHTML(ticket)).join('');
        container.innerHTML = ticketsHTML;

        // Add click listeners to ticket cards
        container.querySelectorAll('.support-ticket-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.ticket-actions')) {
                    const ticketId = card.dataset.ticketId;
                    this.openSupportTicketModal(ticketId);
                }
            });
        });

        // Add click listeners to action buttons
        container.querySelectorAll('.quick-reply-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const ticketId = btn.closest('.support-ticket-card').dataset.ticketId;
                this.openQuickReplyModal(ticketId);
            });
        });

        container.querySelectorAll('.view-ticket-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const ticketId = btn.closest('.support-ticket-card').dataset.ticketId;
                this.openSupportTicketModal(ticketId);
            });
        });
    }

    // Create ticket card HTML
    createTicketCardHTML(ticket) {
        const timeAgo = this.getTimeAgo(ticket.createdAt);
        const priorityClass = `ticket-priority ${ticket.priority}`;
        const statusClass = `ticket-status ${ticket.status}`;
        const cardClass = `support-ticket-card ${ticket.priority === 'urgent' ? 'urgent-priority' : ''} ${ticket.priority === 'high' ? 'high-priority' : ''}`;

        return `
            <div class="${cardClass}" data-ticket-id="${ticket.ticketId}">
                <div class="ticket-card-header">
                    <div class="ticket-card-left">
                        <div class="ticket-id">#${ticket.ticketId}</div>
                        <div class="ticket-subject">${ticket.subject}</div>
                        <div class="ticket-from">
                            <i class="fas fa-user"></i>
                            ${ticket.userName} (${ticket.userEmail})
                        </div>
                    </div>
                    <div class="ticket-card-right">
                        <span class="ticket-category">${this.getCategoryLabel(ticket.category)}</span>
                        <span class="${priorityClass}">${ticket.priority}</span>
                        <span class="${statusClass}">${ticket.status}</span>
                    </div>
                </div>
                <div class="ticket-card-body">
                    <div class="ticket-description">${ticket.description.substring(0, 150)}${ticket.description.length > 150 ? '...' : ''}</div>
                </div>
                <div class="ticket-card-footer">
                    <div class="ticket-time">
                        <i class="fas fa-clock"></i>
                        ${timeAgo}
                    </div>
                    <div class="ticket-actions">
                        <button class="ticket-action-btn quick-reply-btn">
                            <i class="fas fa-reply"></i>
                            Quick Reply
                        </button>
                        <button class="ticket-action-btn view-ticket-btn">
                            <i class="fas fa-eye"></i>
                            View
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // Get category label
    getCategoryLabel(category) {
        const labels = {
            'technical': 'Technical',
            'billing': 'Billing',
            'membership': 'Membership',
            'equipment': 'Equipment',
            'general': 'General',
            'complaint': 'Complaint'
        };
        return labels[category] || category;
    }

    // Get time ago string
    getTimeAgo(timestamp) {
        const now = new Date();
        const time = new Date(timestamp);
        const diffInSeconds = Math.floor((now - time) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        return `${Math.floor(diffInSeconds / 86400)}d ago`;
    }

    // Open support ticket modal
    async openSupportTicketModal(ticketId) {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${this.BASE_URL}/api/support/tickets/${ticketId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.selectedTicket = data.ticket;
                this.showSupportTicketModal();
            }
        } catch (error) {
            console.error('Error loading ticket details:', error);
        }
    }

    // Show support ticket modal
    showSupportTicketModal() {
        if (!this.selectedTicket) return;

        const modal = document.getElementById('supportTicketModal');
        const ticket = this.selectedTicket;

        // Update modal content
        document.getElementById('ticketId').textContent = ticket.ticketId;
        document.getElementById('ticketFrom').textContent = `${ticket.userName} (${ticket.userEmail})`;
        document.getElementById('ticketCategory').textContent = this.getCategoryLabel(ticket.category);
        document.getElementById('ticketSubject').textContent = ticket.subject;
        document.getElementById('ticketCreated').textContent = new Date(ticket.createdAt).toLocaleDateString();

        // Update status and priority badges
        const statusBadge = document.getElementById('ticketStatus');
        const priorityBadge = document.getElementById('ticketPriority');
        
        statusBadge.className = `status-badge ticket-status ${ticket.status}`;
        statusBadge.textContent = ticket.status;
        
        priorityBadge.className = `priority-badge ticket-priority ${ticket.priority}`;
        priorityBadge.textContent = ticket.priority;

        // Update form values
        document.getElementById('ticketStatusUpdate').value = ticket.status;
        document.getElementById('ticketPriorityUpdate').value = ticket.priority;

        // Render conversation
        this.renderConversation(ticket.messages || []);

        // Show modal
        modal.style.display = 'flex';
    }

    // Render conversation
    renderConversation(messages) {
        const container = document.getElementById('conversationMessages');
        
        if (messages.length === 0) {
            container.innerHTML = '<p>No messages yet.</p>';
            return;
        }

        const messagesHTML = messages.map(message => `
            <div class="message ${message.sender}">
                <div class="message-header">
                    <span class="message-sender">${message.sender === 'user' ? 'User' : 'Admin'}</span>
                    <span class="message-time">${new Date(message.timestamp).toLocaleString()}</span>
                </div>
                <div class="message-content">${message.message}</div>
            </div>
        `).join('');

        container.innerHTML = messagesHTML;
    }

    // Close support ticket modal
    closeSupportTicketModal() {
        const modal = document.getElementById('supportTicketModal');
        modal.style.display = 'none';
        this.selectedTicket = null;
    }

    // Open quick reply modal
    openQuickReplyModal(ticketId) {
        const ticket = this.tickets.find(t => t.ticketId === ticketId);
        if (!ticket) return;

        this.selectedTicket = ticket;
        const modal = document.getElementById('quickReplyModal');
        modal.style.display = 'flex';
        
        // Clear previous template selection
        document.querySelectorAll('.template-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.getElementById('quickReplyMessage').value = '';
        
        // Reset channel selections (Email and Notification checked by default)
        document.getElementById('quickReplyViaEmail').checked = true;
        document.getElementById('quickReplyViaNotification').checked = true;
        
        // Enable WhatsApp for gym tickets (grievances) if phone number is available
        const whatsappOption = document.getElementById('quickReplyViaWhatsApp');
        const whatsappLabel = whatsappOption.closest('.channel-option');
        
        if (ticket.userType === 'Gym' && ticket.userPhone && ticket.userPhone !== 'N/A') {
            whatsappOption.checked = true;
            whatsappLabel.style.opacity = '1';
            whatsappLabel.style.cursor = 'pointer';
            whatsappOption.disabled = false;
            whatsappLabel.title = `Send via WhatsApp to ${ticket.userPhone}`;
        } else {
            whatsappOption.checked = false;
            whatsappLabel.style.opacity = '0.5';
            whatsappLabel.style.cursor = 'not-allowed';
            whatsappOption.disabled = true;
            whatsappLabel.title = ticket.userType === 'Gym' ? 'No phone number available for WhatsApp' : 'WhatsApp only available for gym tickets';
        }
    }

    // Close quick reply modal
    closeQuickReplyModal() {
        const modal = document.getElementById('quickReplyModal');
        modal.style.display = 'none';
        this.selectedTicket = null;
    }

    // Select template
    selectTemplate(templateType) {
        if (!this.templates[templateType]) return;

        // Update UI
        document.querySelectorAll('.template-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-template="${templateType}"]`).classList.add('active');

        // Update textarea
        const textarea = document.getElementById('quickReplyMessage');
        let message = this.templates[templateType].message;
        
        if (this.selectedTicket) {
            message = message.replace('{ticketId}', this.selectedTicket.ticketId);
        }
        
        textarea.value = message;
    }

    // Send reply
    async sendReply() {
        const message = document.getElementById('replyMessage').value.trim();
        if (!message || !this.selectedTicket) return;

        const status = document.getElementById('ticketStatusUpdate').value;
        const priority = document.getElementById('ticketPriorityUpdate').value;
        
        const channels = [];
        if (document.getElementById('replyViaEmail').checked) channels.push('email');
        if (document.getElementById('replyViaNotification').checked) channels.push('notification');
        if (document.getElementById('replyViaWhatsApp').checked) channels.push('whatsapp');

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${this.BASE_URL}/api/support/tickets/${this.selectedTicket.ticketId}/reply`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message,
                    status,
                    priority,
                    channels
                })
            });

            if (response.ok) {
                this.showNotification('Reply sent successfully!', 'success');
                this.closeSupportTicketModal();
                this.loadSupportTickets();
                this.loadSupportStats();
            } else {
                this.showNotification('Failed to send reply', 'error');
            }
        } catch (error) {
            console.error('Error sending reply:', error);
            this.showNotification('Error sending reply', 'error');
        }
    }

    // Send quick reply
    async sendQuickReply() {
        const message = document.getElementById('quickReplyMessage').value.trim();
        if (!message || !this.selectedTicket) return;

        // Get selected channels
        const channels = [];
        if (document.getElementById('quickReplyViaEmail').checked) channels.push('email');
        if (document.getElementById('quickReplyViaNotification').checked) channels.push('notification');
        if (document.getElementById('quickReplyViaWhatsApp').checked) channels.push('whatsapp');

        // Validate that at least one channel is selected
        if (channels.length === 0) {
            this.showNotification('Please select at least one communication channel', 'error');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${this.BASE_URL}/api/support/tickets/${this.selectedTicket.ticketId}/reply`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message,
                    channels
                })
            });

            if (response.ok) {
                // Prepare details for the modal
                const channelNames = channels.map(channel => {
                    switch(channel) {
                        case 'email': return 'Email';
                        case 'notification': return 'Notification';
                        case 'whatsapp': return 'WhatsApp';
                        default: return channel;
                    }
                }).join(', ');

                const ticket = this.selectedTicket;
                const detailsHtml = `
                    <div style="margin-bottom: 16px;">
                      <strong>Ticket ID:</strong> #${ticket.ticketId}<br>
                      <strong>User:</strong> ${ticket.userName} (${ticket.userEmail})<br>
                      <strong>Channels:</strong> ${channelNames}
                    </div>
                    <div style="background: #eafaf1; border-radius: 8px; padding: 12px; color: #218838; margin-bottom: 10px;">
                      <i class="fas fa-check-circle"></i> Quick reply sent successfully!
                    </div>
                    <div>
                      <strong>Message:</strong>
                      <div style="margin-top: 6px; background: #f8f9fa; border-radius: 6px; padding: 8px 10px; color: #333; font-size: 0.97em;">
                        ${message.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>")}
                      </div>
                    </div>
                `;

                // Close quick reply modal first for instant feedback
                this.closeQuickReplyModal();

                // Show the modal immediately
                document.getElementById('grievanceSuccessBody').innerHTML = detailsHtml;
                document.getElementById('grievanceSuccessModal').style.display = 'flex';

                // Then reload tickets/stats (can be async)
                this.loadSupportTickets();
                this.loadSupportStats();
            } else {
                this.showNotification('Failed to send quick reply', 'error');
            }
        } catch (error) {
            console.error('Error sending quick reply:', error);
            this.showNotification('Error sending quick reply', 'error');
        }
    }

    // Save reply draft
    saveReplyDraft() {
        const message = document.getElementById('replyMessage').value.trim();
        if (!message || !this.selectedTicket) return;

        // Save to localStorage for now
        localStorage.setItem(`draft_${this.selectedTicket.ticketId}`, message);
        this.showNotification('Draft saved!', 'success');
    }

    // Load quick reply templates
    async loadQuickReplyTemplates() {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${this.BASE_URL}/api/support/templates`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.templates = data.templates || {};
            }
        } catch (error) {
            console.error('Error loading templates:', error);
        }
    }

    // Update ticket status
    async updateTicketStatus(ticketId, status) {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${this.BASE_URL}/api/support/tickets/${ticketId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status })
            });

            if (response.ok) {
                this.showNotification('Status updated successfully!', 'success');
                this.loadSupportTickets();
                this.loadSupportStats();
            }
        } catch (error) {
            console.error('Error updating status:', error);
        }
    }

    // Update ticket priority
    async updateTicketPriority(ticketId, priority) {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${this.BASE_URL}/api/support/tickets/${ticketId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ priority })
            });

            if (response.ok) {
                this.showNotification('Priority updated successfully!', 'success');
                this.loadSupportTickets();
                this.loadSupportStats();
            }
        } catch (error) {
            console.error('Error updating priority:', error);
        }
    }

    // Navigation method for notification system
    navigateToSupportTab(filters = {}) {
        console.log('🎯 navigateToSupportTab called with filters:', filters);
        
        // Switch to support tab
        document.getElementById('support-tab')?.click();
        
        // Apply filters if provided
        if (filters.userType) {
            console.log('🔄 Switching to userType:', filters.userType);
            this.switchUserType(filters.userType);
        }
        
        if (filters.priority) {
            console.log('🔄 Setting priority filter:', filters.priority);
            const priorityFilter = document.getElementById('priorityFilter');
            if (priorityFilter) {
                priorityFilter.value = filters.priority;
                this.currentFilters.priority = filters.priority;
            }
        }
        
        if (filters.status) {
            console.log('🔄 Setting status filter:', filters.status);
            const statusFilter = document.getElementById('statusFilter');
            if (statusFilter) {
                statusFilter.value = filters.status;
                this.currentFilters.status = filters.status;
            }
        }
        
        if (filters.category) {
            console.log('🔄 Setting category filter:', filters.category);
            const categoryFilter = document.getElementById('categoryFilter');
            if (categoryFilter) {
                categoryFilter.value = filters.category;
                this.currentFilters.category = filters.category;
            }
        }
        
        if (filters.search) {
            console.log('🔄 Setting search filter:', filters.search);
            const searchTickets = document.getElementById('searchTickets');
            if (searchTickets) {
                searchTickets.value = filters.search;
                this.currentFilters.search = filters.search;
            }
        }
        
        console.log('🎯 Current filters after navigation:', this.currentFilters);
        
        // Apply filters
        this.applyFilters();
    }

    // Utility methods
    showLoading() {
        const containers = ['userTicketsList', 'gymAdminTicketsList', 'trainerTicketsList'];
        containers.forEach(id => {
            const container = document.getElementById(id);
            if (container) {
                container.innerHTML = `
                    <div class="support-loading">
                        <div class="support-loading-spinner"></div>
                        <p>Loading support tickets...</p>
                    </div>
                `;
            }
        });
    }

    hideLoading() {
        // Loading will be hidden when tickets are rendered
    }

    getEmptyStateHTML() {
        return `
            <div class="support-empty-state">
                <div class="support-empty-icon">
                    <i class="fas fa-inbox"></i>
                </div>
                <h3>No Support Tickets</h3>
                <p>There are no support tickets to display for the current filters.</p>
            </div>
        `;
    }

    showError(message) {
        console.error('Support system error:', message);
        const containers = ['userTicketsList', 'gymAdminTicketsList', 'trainerTicketsList'];
        containers.forEach(id => {
            const container = document.getElementById(id);
            if (container) {
                container.innerHTML = `
                    <div class="support-error">
                        <div class="support-error-icon">
                            <i class="fas fa-exclamation-triangle"></i>
                        </div>
                        <h3>Error</h3>
                        <p>${message}</p>
                    </div>
                `;
            }
        });
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `support-notification ${type}`;
        notification.innerHTML = `
            <div class="support-notification-content">
                <i class="fas ${type === 'success' ? 'fa-check' : type === 'error' ? 'fa-exclamation-triangle' : 'fa-info'}"></i>
                <span>${message}</span>
            </div>
        `;

        // Add to page
        document.body.appendChild(notification);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// Initialize support system when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.supportSystem = new SupportSystem();
});

// Export for external use
window.SupportSystem = SupportSystem;
