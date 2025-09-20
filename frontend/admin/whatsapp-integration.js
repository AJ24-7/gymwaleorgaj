// ============= WHATSAPP ADMIN INTEGRATION =============
// WhatsApp Business API integration for admin dashboard

class WhatsAppAdminIntegration {
    constructor() {
        this.baseUrl = window.location.origin;
        this.isInitialized = false;
        this.currentUser = this.getCurrentUser();
        this.pollingInterval = null;
        
        console.log('🟢 WhatsApp Admin Integration initialized');
    }

    // Initialize the WhatsApp integration
    async initialize() {
        try {
            console.log('🚀 Initializing WhatsApp Admin Integration...');
            
            // Add WhatsApp tab to admin menu if not exists
            this.addWhatsAppTabToMenu();
            
            // Check service status
            await this.checkServiceStatus();
            
            // Set up auto-refresh for stats
            this.startPolling();
            
            this.isInitialized = true;
            console.log('✅ WhatsApp Admin Integration initialized successfully');
            
        } catch (error) {
            console.error('❌ Error initializing WhatsApp integration:', error);
            this.showErrorToast('Failed to initialize WhatsApp integration');
        }
    }

    // Get current user info
    getCurrentUser() {
        try {
            const token = localStorage.getItem('adminToken');
            if (token) {
                const payload = JSON.parse(atob(token.split('.')[1]));
                return { id: payload.id, email: payload.email };
            }
        } catch (error) {
            console.error('Error getting current user:', error);
        }
        return null;
    }

    // Get auth headers
    getAuthHeaders() {
        const token = localStorage.getItem('adminToken');
        if (!token) {
            this.showErrorToast('Authentication required');
            return null;
        }
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };
    }

    // Add WhatsApp tab to admin menu
    addWhatsAppTabToMenu() {
        try {
            const tabsContainer = document.querySelector('.tabs');
            if (!tabsContainer) {
                console.log('⚠️ Admin tabs container not found');
                return;
            }

            // Check if WhatsApp tab already exists
            if (document.getElementById('whatsapp-tab')) {
                console.log('🔄 WhatsApp tab already exists');
                return;
            }

            const whatsappTab = document.createElement('button');
            whatsappTab.id = 'whatsapp-tab';
            whatsappTab.className = 'tab-button';
            whatsappTab.innerHTML = '<i class="fab fa-whatsapp"></i> WhatsApp';
            whatsappTab.onclick = () => this.showWhatsAppPanel();

            // Insert after communication tab or at the end
            const communicationTab = document.querySelector('[onclick*="showCommunication"]');
            if (communicationTab) {
                communicationTab.parentNode.insertBefore(whatsappTab, communicationTab.nextSibling);
            } else {
                tabsContainer.appendChild(whatsappTab);
            }

            console.log('📱 WhatsApp tab added to admin menu');
        } catch (error) {
            console.error('❌ Error adding WhatsApp tab:', error);
        }
    }

    // Show WhatsApp admin panel
    async showWhatsAppPanel() {
        try {
            console.log('📱 Opening WhatsApp admin panel...');

            // Hide other content
            document.querySelectorAll('.admin-content').forEach(content => {
                content.style.display = 'none';
            });

            // Update active tab
            document.querySelectorAll('.tab-button').forEach(tab => {
                tab.classList.remove('active');
            });
            document.getElementById('whatsapp-tab')?.classList.add('active');

            // Show WhatsApp panel
            await this.renderWhatsAppPanel();
            
        } catch (error) {
            console.error('❌ Error showing WhatsApp panel:', error);
            this.showErrorToast('Failed to load WhatsApp panel');
        }
    }

    // Render WhatsApp admin panel
    async renderWhatsAppPanel() {
        try {
            // Create or update WhatsApp content section
            let whatsappSection = document.getElementById('whatsapp-content');
            if (!whatsappSection) {
                whatsappSection = document.createElement('div');
                whatsappSection.id = 'whatsapp-content';
                whatsappSection.className = 'admin-content';
                document.querySelector('.admin-container')?.appendChild(whatsappSection);
            }

            whatsappSection.innerHTML = `
                <div class="whatsapp-admin-panel">
                    <div class="whatsapp-header">
                        <h2><i class="fab fa-whatsapp"></i> WhatsApp Business Integration</h2>
                        <div class="whatsapp-status-indicator">
                            <div id="whatsapp-status" class="status-loading">
                                <i class="fas fa-spinner fa-spin"></i> Checking status...
                            </div>
                        </div>
                    </div>

                    <!-- Service Status Card -->
                    <div class="whatsapp-card">
                        <div class="card-header">
                            <h3><i class="fas fa-cog"></i> Service Configuration</h3>
                            <button class="btn btn-primary" onclick="whatsappAdmin.testConnection()">
                                <i class="fas fa-wifi"></i> Test Connection
                            </button>
                        </div>
                        <div class="card-content">
                            <div id="service-status-details" class="status-grid">
                                <div class="loading-placeholder">Loading service status...</div>
                            </div>
                        </div>
                    </div>

                    <!-- Quick Actions -->
                    <div class="whatsapp-card">
                        <div class="card-header">
                            <h3><i class="fas fa-bolt"></i> Quick Actions</h3>
                        </div>
                        <div class="card-content">
                            <div class="action-buttons">
                                <button class="btn btn-success" onclick="whatsappAdmin.showSendMessageModal()">
                                    <i class="fas fa-paper-plane"></i> Send Test Message
                                </button>
                                <button class="btn btn-info" onclick="whatsappAdmin.showBulkMessageModal()">
                                    <i class="fas fa-broadcast-tower"></i> Bulk Notification
                                </button>
                                <button class="btn btn-warning" onclick="whatsappAdmin.processQueue()">
                                    <i class="fas fa-tasks"></i> Process Queue
                                </button>
                                <button class="btn btn-secondary" onclick="whatsappAdmin.showStatsModal()">
                                    <i class="fas fa-chart-bar"></i> View Statistics
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Integration Settings -->
                    <div class="whatsapp-card">
                        <div class="card-header">
                            <h3><i class="fas fa-link"></i> System Integration</h3>
                        </div>
                        <div class="card-content">
                            <div class="integration-toggles">
                                <div class="toggle-item">
                                    <label class="toggle-switch">
                                        <input type="checkbox" id="support-integration" checked>
                                        <span class="toggle-slider"></span>
                                    </label>
                                    <div class="toggle-info">
                                        <strong>Support System Integration</strong>
                                        <p>Automatically send WhatsApp notifications for support responses</p>
                                    </div>
                                </div>
                                
                                <div class="toggle-item">
                                    <label class="toggle-switch">
                                        <input type="checkbox" id="membership-integration" checked>
                                        <span class="toggle-slider"></span>
                                    </label>
                                    <div class="toggle-info">
                                        <strong>Membership Integration</strong>
                                        <p>Send WhatsApp confirmations for new memberships</p>
                                    </div>
                                </div>

                                <div class="toggle-item">
                                    <label class="toggle-switch">
                                        <input type="checkbox" id="payment-integration" checked>
                                        <span class="toggle-slider"></span>
                                    </label>
                                    <div class="toggle-info">
                                        <strong>Payment Integration</strong>
                                        <p>Send payment reminders via WhatsApp</p>
                                    </div>
                                </div>

                                <div class="toggle-item">
                                    <label class="toggle-switch">
                                        <input type="checkbox" id="class-integration" checked>
                                        <span class="toggle-slider"></span>
                                    </label>
                                    <div class="toggle-info">
                                        <strong>Class Booking Integration</strong>
                                        <p>Send class reminders via WhatsApp</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Recent Activity -->
                    <div class="whatsapp-card">
                        <div class="card-header">
                            <h3><i class="fas fa-history"></i> Recent Activity</h3>
                            <button class="btn btn-sm btn-secondary" onclick="whatsappAdmin.refreshActivity()">
                                <i class="fas fa-sync"></i> Refresh
                            </button>
                        </div>
                        <div class="card-content">
                            <div id="recent-activity" class="activity-list">
                                <div class="loading-placeholder">Loading recent activity...</div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Show the section
            whatsappSection.style.display = 'block';

            // Load initial data
            await this.loadServiceStatus();
            await this.loadRecentActivity();

            console.log('✅ WhatsApp admin panel rendered successfully');

        } catch (error) {
            console.error('❌ Error rendering WhatsApp panel:', error);
            throw error;
        }
    }

    // Check service status
    async checkServiceStatus() {
        try {
            const headers = this.getAuthHeaders();
            if (!headers) return;

            const response = await fetch(`${this.baseUrl}/api/whatsapp/status`, {
                method: 'GET',
                headers: headers
            });

            if (response.ok) {
                const result = await response.json();
                this.updateStatusIndicator(result.data);
                return result.data;
            } else {
                throw new Error('Failed to check service status');
            }

        } catch (error) {
            console.error('❌ Error checking service status:', error);
            this.updateStatusIndicator({ provider: 'error', configured: false });
            return null;
        }
    }

    // Update status indicator
    updateStatusIndicator(status) {
        const statusElement = document.getElementById('whatsapp-status');
        if (!statusElement) return;

        let statusClass = 'status-error';
        let statusText = '❌ Service Error';
        let iconClass = 'fas fa-times-circle';

        if (status.provider === 'none') {
            statusClass = 'status-disabled';
            statusText = '🔴 Service Disabled';
            iconClass = 'fas fa-power-off';
        } else if (status.businessApiConfigured || status.twilioConfigured) {
            statusClass = 'status-active';
            statusText = '🟢 Service Active';
            iconClass = 'fas fa-check-circle';
        } else {
            statusClass = 'status-warning';
            statusText = '🟡 Configuration Needed';
            iconClass = 'fas fa-exclamation-triangle';
        }

        statusElement.className = `status-indicator ${statusClass}`;
        statusElement.innerHTML = `<i class="${iconClass}"></i> ${statusText}`;
    }

    // Load service status details
    async loadServiceStatus() {
        try {
            const status = await this.checkServiceStatus();
            if (!status) return;

            const statusElement = document.getElementById('service-status-details');
            if (!statusElement) return;

            statusElement.innerHTML = `
                <div class="status-item">
                    <strong>Provider:</strong> ${status.provider || 'Not configured'}
                </div>
                <div class="status-item">
                    <strong>Business API:</strong> 
                    <span class="${status.businessApiConfigured ? 'status-good' : 'status-bad'}">
                        ${status.businessApiConfigured ? 'Configured' : 'Not configured'}
                    </span>
                </div>
                <div class="status-item">
                    <strong>Twilio Fallback:</strong> 
                    <span class="${status.twilioConfigured ? 'status-good' : 'status-bad'}">
                        ${status.twilioConfigured ? 'Configured' : 'Not configured'}
                    </span>
                </div>
                <div class="status-item">
                    <strong>Message Queue:</strong> ${status.queueSize || 0} messages
                </div>
                <div class="status-item">
                    <strong>Processing:</strong> 
                    <span class="${status.isProcessingQueue ? 'status-warning' : 'status-good'}">
                        ${status.isProcessingQueue ? 'Active' : 'Idle'}
                    </span>
                </div>
            `;

        } catch (error) {
            console.error('❌ Error loading service status:', error);
        }
    }

    // Test connection
    async testConnection() {
        try {
            const headers = this.getAuthHeaders();
            if (!headers) return;

            this.showLoadingToast('Testing WhatsApp connection...');

            const response = await fetch(`${this.baseUrl}/api/whatsapp/test-connection`, {
                method: 'POST',
                headers: headers
            });

            const result = await response.json();

            if (result.success) {
                this.showSuccessToast('WhatsApp connection test successful!');
            } else {
                this.showErrorToast(`Connection test failed: ${result.message}`);
            }

        } catch (error) {
            console.error('❌ Error testing connection:', error);
            this.showErrorToast('Failed to test connection');
        }
    }

    // Load recent activity (placeholder)
    async loadRecentActivity() {
        try {
            const activityElement = document.getElementById('recent-activity');
            if (!activityElement) return;

            // Placeholder activity data
            activityElement.innerHTML = `
                <div class="activity-item">
                    <i class="fas fa-paper-plane text-success"></i>
                    <div class="activity-details">
                        <strong>Welcome message sent</strong>
                        <p>To new user registration</p>
                        <span class="activity-time">2 minutes ago</span>
                    </div>
                </div>
                <div class="activity-item">
                    <i class="fas fa-bell text-info"></i>
                    <div class="activity-details">
                        <strong>Payment reminder sent</strong>
                        <p>Monthly subscription reminder</p>
                        <span class="activity-time">15 minutes ago</span>
                    </div>
                </div>
                <div class="activity-item">
                    <i class="fas fa-headset text-primary"></i>
                    <div class="activity-details">
                        <strong>Support response sent</strong>
                        <p>Ticket #12345 response</p>
                        <span class="activity-time">1 hour ago</span>
                    </div>
                </div>
            `;

        } catch (error) {
            console.error('❌ Error loading recent activity:', error);
        }
    }

    // Show send message modal
    showSendMessageModal() {
        // Create and show test message modal
        const modal = document.createElement('div');
        modal.className = 'whatsapp-modal-overlay';
        modal.innerHTML = `
            <div class="whatsapp-modal">
                <div class="modal-header">
                    <h3><i class="fas fa-paper-plane"></i> Send Test Message</h3>
                    <button class="modal-close" onclick="this.closest('.whatsapp-modal-overlay').remove()">×</button>
                </div>
                <div class="modal-body">
                    <form onsubmit="whatsappAdmin.sendTestMessage(event)">
                        <div class="form-group">
                            <label>Phone Number (with country code)</label>
                            <input type="tel" id="test-phone" placeholder="+91XXXXXXXXXX" required>
                        </div>
                        <div class="form-group">
                            <label>Message</label>
                            <textarea id="test-message" rows="4" placeholder="Enter your test message..." required></textarea>
                        </div>
                        <div class="form-actions">
                            <button type="submit" class="btn btn-primary">
                                <i class="fas fa-paper-plane"></i> Send Message
                            </button>
                            <button type="button" class="btn btn-secondary" onclick="this.closest('.whatsapp-modal-overlay').remove()">
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    // Send test message
    async sendTestMessage(event) {
        event.preventDefault();
        
        try {
            const phone = document.getElementById('test-phone').value;
            const message = document.getElementById('test-message').value;
            
            if (!phone || !message) {
                this.showErrorToast('Phone number and message are required');
                return;
            }

            const headers = this.getAuthHeaders();
            if (!headers) return;

            this.showLoadingToast('Sending test message...');

            const response = await fetch(`${this.baseUrl}/api/whatsapp/test-message`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({ phoneNumber: phone, message: message })
            });

            const result = await response.json();

            if (result.success) {
                this.showSuccessToast('Test message sent successfully!');
                // Close modal
                document.querySelector('.whatsapp-modal-overlay')?.remove();
            } else {
                this.showErrorToast(`Failed to send message: ${result.message}`);
            }

        } catch (error) {
            console.error('❌ Error sending test message:', error);
            this.showErrorToast('Failed to send test message');
        }
    }

    // Start polling for updates
    startPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
        }

        this.pollingInterval = setInterval(async () => {
            if (document.getElementById('whatsapp-content')?.style.display === 'block') {
                await this.loadServiceStatus();
            }
        }, 30000); // Update every 30 seconds
    }

    // Stop polling
    stopPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
    }

    // Toast notification methods
    showSuccessToast(message) {
        this.showToast(message, 'success');
    }

    showErrorToast(message) {
        this.showToast(message, 'error');
    }

    showLoadingToast(message) {
        this.showToast(message, 'info');
    }

    showToast(message, type = 'info') {
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `whatsapp-toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <i class="fas ${type === 'success' ? 'fa-check' : type === 'error' ? 'fa-times' : 'fa-info'}"></i>
                <span>${message}</span>
            </div>
        `;

        // Add to DOM
        document.body.appendChild(toast);

        // Auto remove after 3 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 3000);
    }

    // Cleanup
    destroy() {
        this.stopPolling();
        console.log('🔴 WhatsApp Admin Integration destroyed');
    }
}

// CSS Styles for WhatsApp admin panel
const whatsappAdminStyles = `
    <style>
    /* WhatsApp Admin Panel Styles */
    .whatsapp-admin-panel {
        padding: 20px;
        max-width: 1200px;
        margin: 0 auto;
    }

    .whatsapp-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 30px;
        padding-bottom: 15px;
        border-bottom: 2px solid #e5e7eb;
    }

    .whatsapp-header h2 {
        color: #25D366;
        margin: 0;
        font-size: 28px;
        font-weight: 600;
    }

    .status-indicator {
        padding: 8px 16px;
        border-radius: 20px;
        font-weight: 500;
        font-size: 14px;
    }

    .status-active {
        background: #d1fae5;
        color: #065f46;
    }

    .status-warning {
        background: #fef3c7;
        color: #92400e;
    }

    .status-error {
        background: #fee2e2;
        color: #991b1b;
    }

    .status-disabled {
        background: #f3f4f6;
        color: #4b5563;
    }

    .status-loading {
        background: #dbeafe;
        color: #1e40af;
    }

    .whatsapp-card {
        background: #fff;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        margin-bottom: 20px;
        overflow: hidden;
    }

    .card-header {
        background: #f8fafc;
        padding: 16px 20px;
        border-bottom: 1px solid #e5e7eb;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .card-header h3 {
        margin: 0;
        color: #1f2937;
        font-size: 18px;
        font-weight: 600;
    }

    .card-content {
        padding: 20px;
    }

    .status-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 15px;
    }

    .status-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        background: #f9fafb;
        border-radius: 8px;
        border-left: 4px solid #d1d5db;
    }

    .status-good {
        color: #065f46;
        font-weight: 600;
    }

    .status-bad {
        color: #991b1b;
        font-weight: 600;
    }

    .action-buttons {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
    }

    .btn {
        padding: 10px 18px;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: all 0.2s ease;
        text-decoration: none;
    }

    .btn-primary {
        background: #3b82f6;
        color: white;
    }

    .btn-primary:hover {
        background: #2563eb;
        transform: translateY(-1px);
    }

    .btn-success {
        background: #10b981;
        color: white;
    }

    .btn-success:hover {
        background: #059669;
        transform: translateY(-1px);
    }

    .btn-info {
        background: #06b6d4;
        color: white;
    }

    .btn-info:hover {
        background: #0891b2;
        transform: translateY(-1px);
    }

    .btn-warning {
        background: #f59e0b;
        color: white;
    }

    .btn-warning:hover {
        background: #d97706;
        transform: translateY(-1px);
    }

    .btn-secondary {
        background: #6b7280;
        color: white;
    }

    .btn-secondary:hover {
        background: #4b5563;
        transform: translateY(-1px);
    }

    .integration-toggles {
        display: flex;
        flex-direction: column;
        gap: 16px;
    }

    .toggle-item {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 16px;
        background: #f9fafb;
        border-radius: 8px;
        border: 1px solid #e5e7eb;
    }

    .toggle-switch {
        position: relative;
        display: inline-block;
        width: 50px;
        height: 24px;
    }

    .toggle-switch input {
        opacity: 0;
        width: 0;
        height: 0;
    }

    .toggle-slider {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: #ccc;
        transition: .4s;
        border-radius: 24px;
    }

    .toggle-slider:before {
        position: absolute;
        content: "";
        height: 18px;
        width: 18px;
        left: 3px;
        bottom: 3px;
        background-color: white;
        transition: .4s;
        border-radius: 50%;
    }

    input:checked + .toggle-slider {
        background-color: #25D366;
    }

    input:checked + .toggle-slider:before {
        transform: translateX(26px);
    }

    .toggle-info strong {
        display: block;
        margin-bottom: 4px;
        color: #1f2937;
    }

    .toggle-info p {
        margin: 0;
        color: #6b7280;
        font-size: 14px;
    }

    .activity-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
        max-height: 400px;
        overflow-y: auto;
    }

    .activity-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        background: #f9fafb;
        border-radius: 8px;
        border-left: 4px solid #d1d5db;
    }

    .activity-details strong {
        display: block;
        color: #1f2937;
        margin-bottom: 2px;
    }

    .activity-details p {
        margin: 0;
        color: #6b7280;
        font-size: 14px;
    }

    .activity-time {
        font-size: 12px;
        color: #9ca3af;
        font-style: italic;
    }

    .loading-placeholder {
        text-align: center;
        padding: 20px;
        color: #6b7280;
        font-style: italic;
    }

    /* Modal Styles */
    .whatsapp-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    }

    .whatsapp-modal {
        background: white;
        border-radius: 12px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        max-width: 500px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
    }

    .modal-header {
        padding: 20px 24px;
        border-bottom: 1px solid #e5e7eb;
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #f8fafc;
    }

    .modal-header h3 {
        margin: 0;
        color: #1f2937;
        font-size: 18px;
    }

    .modal-close {
        background: none;
        border: none;
        font-size: 24px;
        color: #6b7280;
        cursor: pointer;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .modal-close:hover {
        background: #f3f4f6;
        color: #374151;
    }

    .modal-body {
        padding: 24px;
    }

    .form-group {
        margin-bottom: 16px;
    }

    .form-group label {
        display: block;
        font-weight: 600;
        color: #374151;
        margin-bottom: 6px;
    }

    .form-group input, 
    .form-group textarea {
        width: 100%;
        padding: 10px 12px;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        font-size: 14px;
        box-sizing: border-box;
    }

    .form-group input:focus, 
    .form-group textarea:focus {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    .form-actions {
        display: flex;
        gap: 12px;
        justify-content: flex-end;
        margin-top: 20px;
    }

    /* Toast Styles */
    .whatsapp-toast {
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        border-radius: 8px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        padding: 16px;
        min-width: 300px;
        z-index: 1100;
        animation: slideInRight 0.3s ease;
    }

    .toast-success {
        border-left: 4px solid #10b981;
    }

    .toast-error {
        border-left: 4px solid #ef4444;
    }

    .toast-info {
        border-left: 4px solid #3b82f6;
    }

    .toast-content {
        display: flex;
        align-items: center;
        gap: 10px;
    }

    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    /* Responsive Design */
    @media (max-width: 768px) {
        .whatsapp-admin-panel {
            padding: 10px;
        }

        .whatsapp-header {
            flex-direction: column;
            gap: 15px;
            align-items: flex-start;
        }

        .action-buttons {
            flex-direction: column;
        }

        .btn {
            justify-content: center;
        }

        .status-grid {
            grid-template-columns: 1fr;
        }
    }
    </style>
`;

// Initialize WhatsApp admin integration
document.addEventListener('DOMContentLoaded', () => {
    // Add CSS styles
    document.head.insertAdjacentHTML('beforeend', whatsappAdminStyles);
    
    // Initialize WhatsApp admin
    window.whatsappAdmin = new WhatsAppAdminIntegration();
    
    // Auto-initialize if admin is logged in
    setTimeout(() => {
        if (localStorage.getItem('adminToken')) {
            window.whatsappAdmin.initialize();
        }
    }, 1000);
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.whatsappAdmin) {
        window.whatsappAdmin.destroy();
    }
});
