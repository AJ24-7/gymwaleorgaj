// Support System JavaScript
class SupportSystem {
    constructor() {
        this.BASE_URL = "http://localhost:5000";
        this.currentTab = 'users';
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

    // Helper method to get admin token and check authentication
    getAdminToken() {
        const token = localStorage.getItem('adminToken');
        if (!token) {
            console.error('❌ No admin token found');
            this.showError('Authentication required. Please login again.');
            return null;
        }
        return token;
    }

    // Helper method to get authenticated headers
    getAuthHeaders() {
        const token = this.getAdminToken();
        if (!token) return null;
        
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
    }

    init() {
        console.log('🎫 Support System Initialized');
        this.bindEventListeners();
        this.loadSupportStats();
        this.loadSupportTickets();
        this.loadQuickReplyTemplates();
        
        // Force refresh when support tab is activated
        this.forceRefreshWhenActive();
    }
    
    // Force refresh when support content becomes active
    // Force refresh button functionality
    forceRefresh() {
        // Clear any cached data
        this.currentPage = 1;
        this.currentFilters = {};
        
        // Reload stats and current active tab
        this.loadSupportStats();
        
        // Reload the current tab
        switch(this.currentTab) {
            case 'users':
                this.loadUsersData(this.getAuthHeaders());
                break;
            case 'gym-admins':
                this.loadGymAdminsData(this.getAuthHeaders());
                break;
            case 'trainers':
                this.loadTrainersData(this.getAuthHeaders());
                break;
            default:
                this.showUsersTab();
        }
    }

    forceRefreshWhenActive() {
        const supportTab = document.getElementById('support-tab');
        if (supportTab) {
            supportTab.addEventListener('click', () => {
                console.log('🔄 Support tab clicked - Force refreshing data');
                setTimeout(() => {
                    this.loadSupportStats();
                    this.loadSupportTickets();
                }, 100);
            });
        }
        
        // Also listen for when support content becomes visible
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const supportContent = document.getElementById('support-content');
                    if (supportContent && supportContent.classList.contains('active')) {
                        console.log('🔄 Support content activated - Force refreshing data');
                        setTimeout(() => {
                            this.loadSupportStats();
                            this.loadSupportTickets();
                        }, 200);
                    }
                }
            });
        });
        
        const supportContent = document.getElementById('support-content');
        if (supportContent) {
            observer.observe(supportContent, { attributes: true });
        }
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
            const headers = this.getAuthHeaders();
            if (!headers) return; // Authentication failed
            
            const response = await fetch(`${this.BASE_URL}/api/admin/communication/support/stats`, {
                headers: headers
            });

            if (response.ok) {
                const data = await response.json();
                this.updateSupportStats(data.stats);
            } else {
                console.error('❌ Failed to load support stats:', response.status, response.statusText);
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

        // Update tab counts - safely handle undefined byUserType
        const byUserType = stats.byUserType || {};
        document.getElementById('userTicketsCount').textContent = `(${byUserType.user || 0})`;
        document.getElementById('gymAdminTicketsCount').textContent = `(${byUserType.gym || 0})`;
        document.getElementById('trainerTicketsCount').textContent = `(${byUserType.trainer || 0})`;
    }

    // Load support tickets
    async loadSupportTickets(userType = this.currentTab) {
        try {
            this.showLoading();
            const headers = this.getAuthHeaders();
            if (!headers) return; // Authentication failed

            // If userType is 'users', load both support tickets and contact messages
            if (userType === 'users') {
                await this.loadUsersData(headers);
                return;
            }
            
            const params = new URLSearchParams({
                userType: userType === 'gym-admins' ? 'gym' : userType === 'trainers' ? 'trainer' : 'user',
                ...this.currentFilters
            });

            // Use the new communication routes endpoint
            const response = await fetch(`${this.BASE_URL}/api/admin/communication/support/tickets?${params}`, {
                headers: headers
            });

            if (response.ok) {
                const data = await response.json();
                this.tickets = data.tickets || [];
                this.renderTickets();
            } else {
                this.showError('Failed to load support tickets');
            }
        } catch (error) {
            console.error('Error loading support tickets:', error);
            this.showError('Error loading support tickets');
        } finally {
            this.hideLoading();
        }
    }

    // Load both support tickets and contact messages for users tab
    async loadUsersData(headers) {
        try {
            // Load support tickets for users
            const ticketParams = new URLSearchParams({
                userType: 'user',
                ...this.currentFilters
            });

            // Load contact messages
            const [ticketsResponse, messagesResponse] = await Promise.all([
                fetch(`${this.BASE_URL}/api/admin/communication/support/tickets?${ticketParams}`, {
                    headers: headers
                }),
                fetch(`${this.BASE_URL}/api/admin/communication/contact/messages`, {
                    headers: headers
                })
            ]);

            let allItems = [];

            // Process support tickets
            if (ticketsResponse.ok) {
                const ticketsData = await ticketsResponse.json();
                if (ticketsData.success && ticketsData.tickets) {
                    // Mark items as support tickets
                    const tickets = ticketsData.tickets.map(ticket => ({
                        ...ticket,
                        itemType: 'support_ticket',
                        displayType: 'Support Ticket'
                    }));
                    allItems.push(...tickets);
                }
            }

            // Process contact messages
            if (messagesResponse.ok) {
                const messagesData = await messagesResponse.json();
                if (messagesData.success && messagesData.messages) {
                    // Convert contact messages to ticket-like format
                    const contactMessages = messagesData.messages.map(message => ({
                        ...message,
                        itemType: 'contact_message',
                        displayType: 'Contact Form',
                        ticketId: message.ticketId || `CONTACT-${message._id}`,
                        userName: message.userName || message.senderName || message.name || 'Unknown User',
                        userEmail: message.userEmail || message.senderEmail || message.email || 'Unknown Email',
                        subject: message.subject || 'Contact Form Message',
                        description: message.description || message.message || message.content || '',
                        category: message.category || 'general',
                        priority: message.priority || 'medium',
                        createdAt: message.createdAt || message.timestamp || new Date(),
                        status: message.status || 'open'
                    }));
                    allItems.push(...contactMessages);
                }
            }

            // Sort by creation date (newest first)
            allItems.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            this.tickets = allItems;
            this.renderTickets();

        } catch (error) {
            console.error('Error loading users data:', error);
            this.showError('Error loading user communications');
        }
    }

    // Load gym admins support data
    async loadGymAdminsData(headers) {
        try {
            const ticketParams = new URLSearchParams({
                userType: 'gym-admin',
                ...this.currentFilters
            });

            const response = await fetch(`${this.BASE_URL}/api/admin/communication/support/tickets?${ticketParams}`, {
                headers: headers
            });

            if (response.ok) {
                const ticketsData = await response.json();
                if (ticketsData.success && ticketsData.tickets) {
                    const tickets = ticketsData.tickets.map(ticket => ({
                        ...ticket,
                        itemType: 'support_ticket',
                        displayType: 'Support Ticket'
                    }));
                    this.tickets = tickets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                } else {
                    this.tickets = [];
                }
            } else {
                this.tickets = [];
            }
            
            this.renderTickets();

        } catch (error) {
            console.error('Error loading gym admins data:', error);
            this.showError('Error loading gym admin communications');
        }
    }

    // Load trainers support data
    async loadTrainersData(headers) {
        try {
            const ticketParams = new URLSearchParams({
                userType: 'trainer',
                ...this.currentFilters
            });

            const response = await fetch(`${this.BASE_URL}/api/admin/communication/support/tickets?${ticketParams}`, {
                headers: headers
            });

            if (response.ok) {
                const ticketsData = await response.json();
                if (ticketsData.success && ticketsData.tickets) {
                    const tickets = ticketsData.tickets.map(ticket => ({
                        ...ticket,
                        itemType: 'support_ticket',
                        displayType: 'Support Ticket'
                    }));
                    this.tickets = tickets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                } else {
                    this.tickets = [];
                }
            } else {
                this.tickets = [];
            }
            
            this.renderTickets();

        } catch (error) {
            console.error('Error loading trainers data:', error);
            this.showError('Error loading trainer communications');
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

        this.currentTab = userType;
        
        // Load data for the selected tab
        switch(userType) {
            case 'users':
                this.loadUsersData(this.getAuthHeaders());
                break;
            case 'gym-admins':
                this.loadGymAdminsData(this.getAuthHeaders());
                break;
            case 'trainers':
                this.loadTrainersData(this.getAuthHeaders());
                break;
        }
    }

    // Apply filters
    applyFilters() {
        this.loadSupportTickets();
    }

    // Render tickets
    renderTickets() {
        const listId = this.currentTab === 'gym-admins' ? 'gymAdminTicketsList' : 
                      this.currentTab === 'trainers' ? 'trainerTicketsList' : 'userTicketsList';
        const container = document.getElementById(listId);
        
        if (!container) {
            console.error('Container not found:', listId);
            return;
        }

        if (this.tickets.length === 0) {
            container.innerHTML = this.getEmptyStateHTML();
            return;
        }

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
        
        // Add visual indicator for contact messages vs support tickets
        const typeIndicator = ticket.itemType === 'contact_message' ? 
            '<span class="item-type contact-message"><i class="fas fa-envelope"></i> Contact Form</span>' : 
            '<span class="item-type support-ticket"><i class="fas fa-ticket-alt"></i> Support Ticket</span>';

        return `
            <div class="${cardClass}" data-ticket-id="${ticket.ticketId}" data-item-type="${ticket.itemType}">
                <div class="ticket-card-header">
                    <div class="ticket-card-left">
                        <div class="ticket-id">#${ticket.ticketId}</div>
                        <div class="ticket-subject">${ticket.subject}</div>
                        <div class="ticket-from">
                            <i class="fas fa-user"></i>
                            ${ticket.userName} (${ticket.userEmail})
                        </div>
                        ${typeIndicator}
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
                        <button class="ticket-action-btn quick-reply-btn" onclick="window.supportSystem.showQuickReplyModal('${ticket.ticketId}', '${ticket.itemType}')">
                            <i class="fas fa-reply"></i>
                            Quick Reply
                        </button>
                        <button class="ticket-action-btn view-ticket-btn" onclick="window.supportSystem.openSupportTicketModal('${ticket.ticketId}', '${ticket.itemType}')">
                            <i class="fas fa-eye"></i>
                            View
                        </button>
                        ${ticket.itemType === 'contact_message' ? 
                            `<button class="ticket-action-btn convert-ticket-btn" onclick="window.supportSystem.convertContactToTicket('${ticket._id}')">
                                <i class="fas fa-exchange-alt"></i>
                                Convert to Ticket
                            </button>` : ''}
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
    async openSupportTicketModal(ticketId, itemType = 'support_ticket') {
        try {
            const headers = this.getAuthHeaders(); 
            if (!headers) return;
            
            let response;
            
            // Handle different item types
            if (itemType === 'contact_message') {
                // Find the contact message in our tickets array
                const contactMessage = this.tickets.find(t => t.ticketId === ticketId && t.itemType === 'contact_message');
                if (contactMessage) {
                    this.selectedTicket = contactMessage;
                    this.showSupportTicketModal();
                    return;
                }
            } else {
                // Load support ticket details
                response = await fetch(`${this.BASE_URL}/api/admin/communication/support/tickets/${ticketId}`, {
                    headers: headers
                });

                if (response.ok) {
                    const data = await response.json();
                    this.selectedTicket = data.ticket;
                    this.showSupportTicketModal();
                }
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

    // Show quick reply modal (alias for openQuickReplyModal for compatibility)
    showQuickReplyModal(ticketId, itemType = 'support_ticket') {
        this.openQuickReplyModal(ticketId, itemType);
    }

    // Open quick reply modal
    openQuickReplyModal(ticketId, itemType = 'support_ticket') {
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
        
        if ((ticket.userType === 'Gym' || ticket.itemType === 'contact_message') && ticket.userPhone && ticket.userPhone !== 'N/A') {
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
            const headers = this.getAuthHeaders(); if (!headers) return;
            const response = await fetch(`${this.BASE_URL}/api/admin/communication/support/tickets/${this.selectedTicket.ticketId}/reply`, {
                method: 'POST',
                headers: headers,
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
            const headers = this.getAuthHeaders(); if (!headers) return;
            const response = await fetch(`${this.BASE_URL}/api/admin/communication/support/tickets/${this.selectedTicket.ticketId}/reply`, {
                method: 'POST',
                headers: headers,
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

    // Convert contact message to support ticket
    async convertContactToTicket(messageId) {
        try {
            const headers = this.getAuthHeaders();
            if (!headers) return;

            const response = await fetch(`${this.BASE_URL}/api/admin/communication/contact/messages/${messageId}/convert-ticket`, {
                method: 'POST',
                headers: headers
            });

            if (response.ok) {
                const data = await response.json();
                this.showNotification(`Successfully converted to support ticket #${data.ticketId}`, 'success');
                this.loadSupportTickets(); // Refresh the list
            } else {
                this.showNotification('Failed to convert to support ticket', 'error');
            }
        } catch (error) {
            console.error('Error converting to ticket:', error);
            this.showNotification('Error converting to support ticket', 'error');
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
            const headers = this.getAuthHeaders(); if (!headers) return;
            const response = await fetch(`${this.BASE_URL}/api/admin/communication/support/templates`, {
                headers: headers
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
            const headers = this.getAuthHeaders(); if (!headers) return;
            const response = await fetch(`${this.BASE_URL}/api/admin/communication/support/tickets/${ticketId}`, {
                method: 'PUT',
                headers: headers,
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
            const headers = this.getAuthHeaders(); if (!headers) return;
            const response = await fetch(`${this.BASE_URL}/api/admin/communication/support/tickets/${ticketId}`, {
                method: 'PUT',
                headers: headers,
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

// Integration function for main admin support tab
function loadSupportData() {
    console.log('🎫 loadSupportData called - integrating with support system');
    
    if (window.supportSystem) {
        // Load data using existing support system
        window.supportSystem.loadSupportStats();
        window.supportSystem.loadSupportTickets();
        console.log('✅ Support data loaded using existing SupportSystem');
    } else {
        console.log('⏳ SupportSystem not ready, retrying...');
        setTimeout(loadSupportData, 100);
    }
}

// Enhanced Communication Integration for Main Admin
class MainAdminCommunicationBridge {
    constructor() {
        this.gymAdminChannels = new Map();
        this.activeCommunications = new Map();
        this.BASE_URL = "http://localhost:5000";
        this.isIntegrated = false;
        this.integrationRetries = 0;
        this.maxRetries = 10; // Maximum retry attempts
        this.init();
    }

    // Helper method to get admin token
    getAdminToken() {
        const token = localStorage.getItem('adminToken');
        if (!token) {
            console.error('❌ No admin token found');
            return null;
        }
        return token;
    }

    // Helper method to get authenticated headers
    getAuthHeaders() {
        const token = this.getAdminToken();
        if (!token) return null;
        
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
    }

    init() {
        console.log('🌉 Initializing Main Admin Communication Bridge');
        this.setupGymAdminChannels();
        
        // Use event-driven approach for better integration
        if (window.enhancedComm && window.enhancedComm.isInitialized) {
            console.log('🎯 Enhanced communication system already ready, integrating immediately');
            this.integrateWithEnhancedComm();
        } else {
            console.log('⏰ Enhanced communication system not ready yet, setting up event listener');
            // Wait for enhanced communication system to be ready
            window.addEventListener('enhancedCommReady', () => {
                console.log('🎉 Received enhancedCommReady event, integrating now');
                this.integrateWithEnhancedComm();
            });
            
            // Fallback timeout in case event doesn't fire
            setTimeout(() => {
                if (!this.isIntegrated) {
                    console.log('⏱️ Fallback timeout reached, attempting integration');
                    this.integrateWithEnhancedComm();
                }
            }, 1000);
        }
    }

    // Setup communication channels with gym admins
    setupGymAdminChannels() {
        console.log('📡 Setting up gym admin communication channels');
        
        // Listen for gym admin messages - disabled to prevent 404 errors
        // this.pollGymAdminMessages();
        
        // Setup real-time notification forwarding
        this.setupNotificationForwarding();
    }

    // Poll for messages from gym admins
    async pollGymAdminMessages() {
        try {
            const headers = this.getAuthHeaders(); 
            if (!headers) return;
            
            // Use the correct endpoint for gym messages
            const response = await fetch(`${this.BASE_URL}/api/admin/communication/gym-messages`, {
                headers: headers
            });

            if (response.ok) {
                const data = await response.json();
                this.processGymAdminMessages(data.messages || []);
            } else {
                console.warn('Failed to fetch gym messages:', response.status);
            }
        } catch (error) {
            console.error('Error polling gym admin messages:', error);
        }

        // Poll every 30 seconds - commented out to prevent continuous errors
        // setTimeout(() => this.pollGymAdminMessages(), 30000);
    }

    // Process messages from gym admins
    processGymAdminMessages(messages) {
        messages.forEach(message => {
            if (!this.activeCommunications.has(message.communicationId)) {
                this.handleNewGymAdminCommunication(message);
            }
        });
    }

    // Handle new communication from gym admin
    handleNewGymAdminCommunication(message) {
        console.log('📨 New gym admin communication:', message);
        
        this.activeCommunications.set(message.communicationId, message);

        // Create notification in main admin
        if (window.adminNotificationSystem) {
            window.adminNotificationSystem.createNotification(
                `Communication from ${message.gymName}`,
                message.message,
                'gym-admin-communication',
                'fa-building',
                '#f59e0b',
                {
                    communicationId: message.communicationId,
                    gymId: message.gymId,
                    gymName: message.gymName,
                    type: message.type,
                    priority: message.priority
                }
            );
        }

        // Also add to enhanced communication system
        if (window.enhancedComm) {
            window.enhancedComm.handleGymAdminMessage(message);
        }
    }

    // Setup notification forwarding to gym admins
    setupNotificationForwarding() {
        console.log('🔄 Setting up notification forwarding to gym admins');
        
        // When enhanced communication system sends notifications to gym admins
        if (window.enhancedComm) {
            const originalSendNotification = window.enhancedComm.sendNotificationToGymAdmin;
            
            window.enhancedComm.sendNotificationToGymAdmin = async (gymId, notification) => {
                console.log('📤 Forwarding notification to gym admin:', gymId, notification);
                
                try {
                    const headers = this.getAuthHeaders(); if (!headers) return;
                    const response = await fetch(`${this.BASE_URL}/api/communication/notify-gym-admin`, {
                        method: 'POST',
                        headers: headers,
                        body: JSON.stringify({
                            gymId,
                            notification: {
                                title: notification.title,
                                message: notification.message,
                                type: notification.type,
                                priority: notification.priority || 'medium',
                                metadata: notification.metadata
                            }
                        })
                    });

                    if (response.ok) {
                        console.log('✅ Notification sent to gym admin successfully');
                        return true;
                    } else {
                        console.error('❌ Failed to send notification to gym admin');
                        return false;
                    }
                } catch (error) {
                    console.error('Error sending notification to gym admin:', error);
                    return false;
                }

                // Call original function if it exists
                if (originalSendNotification) {
                    return originalSendNotification.call(window.enhancedComm, gymId, notification);
                }
            };
        }
    }

    // Integrate with enhanced communication system
    integrateWithEnhancedComm() {
        console.log('🔗 Integrating with Enhanced Communication System');
        
        if (window.enhancedComm && window.enhancedComm.isInitialized === true) {
            // Add gym admin message handler
            window.enhancedComm.handleGymAdminMessage = (message) => {
                console.log('🏋️ Handling gym admin message in enhanced system:', message);
                
                // Add to support tickets if it's a support request
                if (message.type === 'support-ticket' || message.type === 'grievance') {
                    if (window.supportSystem) {
                        // Refresh support tickets to include new gym admin communication
                        window.supportSystem.loadSupportTickets();
                    }
                }
            };

            // Add gym admin communication modal
            window.enhancedComm.openGymAdminCommunication = (gymId, gymName) => {
                console.log('💬 Opening gym admin communication:', gymId, gymName);
                this.openGymAdminCommunicationModal(gymId, gymName);
            };

            this.isIntegrated = true;
            console.log('✅ Enhanced communication integration completed');
        } else {
            this.integrationRetries++;
            if (this.integrationRetries < this.maxRetries) {
                console.log(`⏳ Enhanced communication system not ready, retrying in 200ms... (${this.integrationRetries}/${this.maxRetries})`);
                setTimeout(() => this.integrateWithEnhancedComm(), 200);
            } else {
                console.warn('❌ Maximum integration retries reached. Enhanced communication system integration failed.');
                console.log('📊 Available window.enhancedComm:', window.enhancedComm);
                if (window.enhancedComm) {
                    console.log('📊 enhancedComm.isInitialized:', window.enhancedComm.isInitialized);
                }
            }
        }
    }

    // Open communication modal with specific gym admin
    openGymAdminCommunicationModal(gymId, gymName) {
        // Create or show communication modal
        const modal = this.createGymAdminCommunicationModal(gymId, gymName);
        modal.style.display = 'block';
        
        // Load communication history
        this.loadGymAdminCommunicationHistory(gymId);
    }

    // Create gym admin communication modal
    createGymAdminCommunicationModal(gymId, gymName) {
        let modal = document.getElementById('gymAdminCommunicationModal');
        
        if (!modal) {
            const modalHTML = `
                <div id="gymAdminCommunicationModal" class="enhanced-modal" style="display: none;">
                    <div class="enhanced-modal-content">
                        <div class="enhanced-modal-header">
                            <h3 id="gymCommTitle">Communication with ${gymName}</h3>
                            <button class="enhanced-close-btn" onclick="document.getElementById('gymAdminCommunicationModal').style.display='none'">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        <div class="enhanced-modal-body">
                            <div class="communication-history" id="gymCommHistory">
                                <!-- Communication history will be loaded here -->
                            </div>
                            <div class="communication-compose">
                                <textarea id="gymCommMessage" placeholder="Type your message to ${gymName}..." rows="3"></textarea>
                                <div class="communication-actions">
                                    <select id="gymCommPriority">
                                        <option value="low">Low Priority</option>
                                        <option value="medium" selected>Medium Priority</option>
                                        <option value="high">High Priority</option>
                                        <option value="urgent">Urgent</option>
                                    </select>
                                    <button class="enhanced-btn enhanced-btn-primary" onclick="window.mainAdminBridge.sendMessageToGym('${gymId}')">
                                        <i class="fas fa-paper-plane"></i> Send
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            modal = document.getElementById('gymAdminCommunicationModal');
        }
        
        // Update modal title
        document.getElementById('gymCommTitle').textContent = `Communication with ${gymName}`;
        
        return modal;
    }

    // Send message to gym admin
    async sendMessageToGym(gymId) {
        const messageText = document.getElementById('gymCommMessage').value.trim();
        const priority = document.getElementById('gymCommPriority').value;
        
        if (!messageText) {
            alert('Please enter a message');
            return;
        }

        try {
            const headers = this.getAuthHeaders(); if (!headers) return;
            const response = await fetch(`${this.BASE_URL}/api/communication/send-to-gym`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    gymId,
                    message: messageText,
                    priority,
                    type: 'admin-message'
                })
            });

            if (response.ok) {
                console.log('✅ Message sent to gym admin');
                document.getElementById('gymCommMessage').value = '';
                this.loadGymAdminCommunicationHistory(gymId);
                
                // Show success notification
                if (window.adminNotificationSystem) {
                    window.adminNotificationSystem.createNotification(
                        'Message Sent',
                        'Your message has been sent to the gym admin',
                        'success',
                        'fa-check',
                        '#10b981'
                    );
                }
            } else {
                console.error('❌ Failed to send message');
                alert('Failed to send message. Please try again.');
            }
        } catch (error) {
            console.error('Error sending message:', error);
            alert('Error sending message. Please try again.');
        }
    }

    // Load communication history with gym admin
    async loadGymAdminCommunicationHistory(gymId) {
        try {
            const headers = this.getAuthHeaders(); if (!headers) return;
            const response = await fetch(`${this.BASE_URL}/api/communication/history/${gymId}`, {
                headers: headers
            });

            if (response.ok) {
                const data = await response.json();
                this.renderCommunicationHistory(data.communications || []);
            }
        } catch (error) {
            console.error('Error loading communication history:', error);
        }
    }

    // Render communication history
    renderCommunicationHistory(communications) {
        const historyContainer = document.getElementById('gymCommHistory');
        if (!historyContainer) return;

        if (communications.length === 0) {
            historyContainer.innerHTML = `
                <div class="no-communications">
                    <i class="fas fa-comments"></i>
                    <p>No previous communications</p>
                </div>
            `;
            return;
        }

        const historyHTML = communications.map(comm => `
            <div class="communication-item ${comm.from === 'admin' ? 'from-admin' : 'from-gym'}">
                <div class="comm-header">
                    <strong>${comm.from === 'admin' ? 'Main Admin' : 'Gym Admin'}</strong>
                    <span class="comm-time">${new Date(comm.timestamp).toLocaleString()}</span>
                </div>
                <div class="comm-message">${comm.message}</div>
                ${comm.priority !== 'medium' ? `<div class="comm-priority priority-${comm.priority}">${comm.priority.toUpperCase()}</div>` : ''}
            </div>
        `).join('');

        historyContainer.innerHTML = historyHTML;
        historyContainer.scrollTop = historyContainer.scrollHeight;
    }
}

// Initialize main admin communication bridge
document.addEventListener('DOMContentLoaded', () => {
    window.mainAdminBridge = new MainAdminCommunicationBridge();
});

// Export for external use
window.MainAdminCommunicationBridge = MainAdminCommunicationBridge;
