// ============================================
// GYMDETAILS CHAT SYSTEM
// Real-time messaging between users and gyms
// ============================================

class GymChatSystem {
    constructor() {
        this.BASE_URL = `${window.location.protocol}//${window.location.hostname}:5000`;
        this.currentGymId = null;
        this.currentChatId = null;
        this.messages = [];
        this.isOpen = false;
        this.pollingInterval = null;
        this.lastMessageCount = 0;
        this.unreadCount = 0;
        
        this.quickMessages = [
            "Hi! I'd like to know more about your gym",
            "What are your membership plans?",
            "Are you currently open?",
            "Do you have personal training available?",
            "Can I book a trial session?"
        ];
        
        this.init();
    }

    init() {
        console.log('🚀 Initializing Gym Chat System');
        this.bindEvents();
        this.getCurrentGymId();
    }

    getCurrentGymId() {
        // Get gym ID from URL parameters - check both 'id' and 'gymId'
        const urlParams = new URLSearchParams(window.location.search);
        this.currentGymId = urlParams.get('gymId') || urlParams.get('id');
        
        // Also check if currentGym global variable exists (set by gymdetails.js)
        if (!this.currentGymId && typeof currentGym !== 'undefined' && currentGym) {
            this.currentGymId = currentGym._id || currentGym.id;
        }
        
        console.log('🏢 Current Gym ID:', this.currentGymId);
        
        // If still no gym ID, wait for gym data to load
        if (!this.currentGymId) {
            console.log('⏳ Waiting for gym data to load...');
            document.addEventListener('gymDataLoaded', (e) => {
                this.currentGymId = e.detail.gymId || e.detail.gym?._id || e.detail.gym?.id;
                console.log('🏢 Gym ID loaded from event:', this.currentGymId);
            });
        }
    }

    bindEvents() {
        // Chat button click
        document.addEventListener('click', (e) => {
            if (e.target.closest('#chat-btn')) {
                e.preventDefault();
                this.openChat();
            }
        });

        // Close chat modal
        document.addEventListener('click', (e) => {
            if (e.target.closest('.close-chat-btn') || 
                (e.target.id === 'chat-modal' && !e.target.closest('.chat-modal-content'))) {
                e.preventDefault();
                this.closeChat();
            }
        });

        // Send message on button click
        document.addEventListener('click', (e) => {
            if (e.target.closest('.send-btn')) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Send message on Enter key (but not Shift+Enter for multiline)
        document.addEventListener('keydown', (e) => {
            if (e.target.matches('.chat-input') && e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Quick message buttons
        document.addEventListener('click', (e) => {
            if (e.target.closest('.quick-message-btn')) {
                e.preventDefault();
                const message = e.target.closest('.quick-message-btn').textContent;
                this.sendQuickMessage(message);
            }
        });

        // Auto-resize textarea
        document.addEventListener('input', (e) => {
            if (e.target.matches('.chat-input')) {
                this.autoResizeTextarea(e.target);
            }
        });
    }

    async openChat() {
        console.log('💬 Opening chat...');
        
        // Make sure we have gym ID
        if (!this.currentGymId) {
            this.getCurrentGymId();
        }
        
        if (!this.currentGymId) {
            this.showError('Gym information not available. Please refresh the page.');
            return;
        }

        // Check if user is logged in
        const token = localStorage.getItem('token');
        if (!token) {
            this.showLoginPrompt();
            return;
        }

        this.isOpen = true;
        const modal = document.getElementById('chat-modal');
        if (modal) {
            modal.classList.add('active');
            
            // Populate gym info in chat header
            this.populateGymInfo();
            
            // Load chat history
            await this.loadChatHistory();
            
            // Start polling for new messages
            this.startPolling();
            
            // Focus on input
            setTimeout(() => {
                const input = document.querySelector('.chat-input');
                if (input) input.focus();
            }, 300);
        }
    }

    populateGymInfo() {
        // Get gym info from global currentGym variable or DOM
        const gymName = document.getElementById('gym-name')?.textContent || 'Gym';
        const gymLogo = document.getElementById('gym-logo')?.src || '/uploads/gym-logos/default.png';
        
        // Update chat modal header
        const chatGymName = document.getElementById('chat-gym-name');
        const chatGymLogo = document.getElementById('chat-gym-logo');
        
        if (chatGymName) chatGymName.textContent = gymName;
        if (chatGymLogo) chatGymLogo.src = gymLogo;
    }

    closeChat() {
        console.log('🔒 Closing chat...');
        this.isOpen = false;
        const modal = document.getElementById('chat-modal');
        if (modal) {
            modal.classList.remove('active');
        }
        
        // Stop polling
        this.stopPolling();
    }

    async loadChatHistory() {
        console.log('📜 Loading chat history...');
        
        const messagesContainer = document.getElementById('chat-messages');
        if (!messagesContainer) return;

        // Show loading state
        this.showLoadingState(messagesContainer);

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${this.BASE_URL}/api/chat/history/${this.currentGymId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load chat history');
            }

            const data = await response.json();
            console.log('📨 Chat history loaded:', data);

            this.currentChatId = data.chatId;
            this.messages = data.messages || [];
            this.lastMessageCount = this.messages.length;
            
            this.renderMessages();
            
            // Mark messages as read
            if (this.currentChatId) {
                this.markMessagesAsRead();
            }

        } catch (error) {
            console.error('Error loading chat history:', error);
            this.showEmptyState(messagesContainer);
        }
    }

    renderMessages() {
        const messagesContainer = document.getElementById('chat-messages');
        if (!messagesContainer) return;

        if (this.messages.length === 0) {
            this.showEmptyState(messagesContainer);
            return;
        }

        messagesContainer.innerHTML = '';

        this.messages.forEach((message, index) => {
            const messageEl = this.createMessageElement(message);
            messagesContainer.appendChild(messageEl);
        });

        // Scroll to bottom
        this.scrollToBottom();
    }

    createMessageElement(message) {
        const div = document.createElement('div');
        div.className = `chat-message ${message.sender}`;

        const isUser = message.sender === 'user';
        const avatarSrc = isUser 
            ? this.getUserAvatar() 
            : this.getGymAvatar();

        div.innerHTML = `
            <img src="${avatarSrc}" alt="Avatar" class="message-avatar" onerror="this.src='/uploads/profile-pics/default.png'">
            <div class="message-content">
                <div class="message-bubble">
                    <p class="message-text">${this.escapeHtml(message.message)}</p>
                </div>
                <span class="message-time">${this.formatTime(message.timestamp)}</span>
            </div>
        `;

        return div;
    }

    getUserAvatar() {
        // Try to get user's profile image
        const profileImg = document.getElementById('profile-icon-img');
        if (profileImg && profileImg.src) {
            return profileImg.src;
        }
        return '/uploads/profile-pics/default.png';
    }

    getGymAvatar() {
        // Try to get gym's logo
        const gymLogo = document.getElementById('gym-logo');
        if (gymLogo && gymLogo.src) {
            return gymLogo.src;
        }
        return '/uploads/gym-logos/default.png';
    }

    async sendMessage() {
        const input = document.querySelector('.chat-input');
        if (!input) return;

        const message = input.value.trim();
        if (!message) return;

        console.log('📤 Sending message:', message);

        // Disable send button
        const sendBtn = document.querySelector('.send-btn');
        if (sendBtn) sendBtn.disabled = true;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${this.BASE_URL}/api/chat/send`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    gymId: this.currentGymId,
                    message: message
                })
            });

            if (!response.ok) {
                throw new Error('Failed to send message');
            }

            const data = await response.json();
            console.log('✅ Message sent:', data);

            this.currentChatId = data.chatId;

            // Add message to UI immediately
            const newMessage = {
                sender: 'user',
                message: message,
                timestamp: new Date().toISOString()
            };
            
            this.messages.push(newMessage);
            this.renderMessages();

            // Clear input
            input.value = '';
            this.autoResizeTextarea(input);

            // Show success feedback
            this.showMessageSentFeedback();

        } catch (error) {
            console.error('Error sending message:', error);
            this.showError('Failed to send message. Please try again.');
        } finally {
            if (sendBtn) sendBtn.disabled = false;
        }
    }

    async sendQuickMessage(message) {
        const input = document.querySelector('.chat-input');
        if (!input) return;

        // Set the message in input
        input.value = message;

        // Send it
        await this.sendMessage();
    }

    startPolling() {
        // Poll for new messages every 5 seconds
        this.pollingInterval = setInterval(() => {
            this.checkForNewMessages();
        }, 5000);
        
        console.log('🔄 Started polling for new messages');
    }

    stopPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
            console.log('⏹️ Stopped polling');
        }
    }

    async checkForNewMessages() {
        if (!this.currentChatId) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${this.BASE_URL}/api/chat/history/${this.currentGymId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) return;

            const data = await response.json();
            
            if (data.messages && data.messages.length > this.lastMessageCount) {
                console.log('📨 New messages received');
                this.messages = data.messages;
                this.lastMessageCount = this.messages.length;
                this.renderMessages();
                
                // Play notification sound (optional)
                this.playNotificationSound();
                
                // Mark as read
                this.markMessagesAsRead();
            }

        } catch (error) {
            console.error('Error checking for new messages:', error);
        }
    }

    async markMessagesAsRead() {
        if (!this.currentChatId) return;

        try {
            const token = localStorage.getItem('token');
            await fetch(`${this.BASE_URL}/api/chat/read/${this.currentChatId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            // Reset unread count
            this.unreadCount = 0;
            this.updateUnreadBadge();

        } catch (error) {
            console.error('Error marking messages as read:', error);
        }
    }

    updateUnreadBadge() {
        const badge = document.querySelector('.chat-btn .badge');
        if (badge) {
            if (this.unreadCount > 0) {
                badge.textContent = this.unreadCount;
                badge.style.display = 'block';
            } else {
                badge.style.display = 'none';
            }
        }
    }

    scrollToBottom() {
        const container = document.getElementById('chat-messages');
        if (container) {
            setTimeout(() => {
                container.scrollTop = container.scrollHeight;
            }, 100);
        }
    }

    autoResizeTextarea(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 100) + 'px';
    }

    showLoadingState(container) {
        container.innerHTML = `
            <div class="chat-loading">
                <div class="chat-spinner"></div>
                <p class="chat-loading-text">Loading messages...</p>
            </div>
        `;
    }

    showEmptyState(container) {
        container.innerHTML = `
            <div class="empty-chat-state">
                <i class="fas fa-comments empty-chat-icon"></i>
                <h3>Start a Conversation</h3>
                <p>Send a message to connect with this gym</p>
            </div>
        `;
    }

    showLoginPrompt() {
        // Store current page URL for redirect after login
        const currentUrl = window.location.href;
        localStorage.setItem('redirectAfterLogin', currentUrl);
        
        const modal = `
            <div class="modal" style="display: flex;">
                <div class="modal-content" style="max-width: 450px; max-height: 90vh; overflow-y: auto;">
                    <div class="modal-header" style="padding: 20px; border-bottom: 1px solid #eee;">
                        <h3 style="margin: 0; display: flex; align-items: center; gap: 10px; font-size: 1.3rem;">
                            <i class="fas fa-sign-in-alt" style="color: var(--primary-color);"></i>
                            Login Required
                        </h3>
                    </div>
                    <div class="modal-body" style="padding: 25px;">
                        <p style="margin: 0 0 20px 0; color: #555; line-height: 1.6;">
                            Please login to start chatting with this gym.
                        </p>
                        <div style="margin: 0 0 25px 0; background: #f8f9fa; padding: 15px; border-radius: 8px;">
                            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                                <i class="fas fa-comments" style="color: var(--primary-color); font-size: 1.1rem; width: 20px;"></i>
                                <span style="color: #333; font-size: 0.95rem;">Chat with gym administrators</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                                <i class="fas fa-dumbbell" style="color: var(--primary-color); font-size: 1.1rem; width: 20px;"></i>
                                <span style="color: #333; font-size: 0.95rem;">Access exclusive gym features</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <i class="fas fa-gift" style="color: var(--primary-color); font-size: 1.1rem; width: 20px;"></i>
                                <span style="color: #333; font-size: 0.95rem;">Claim special offers</span>
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
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modal);
    }

    showError(message) {
        console.error('❌ Error:', message);
        
        // Show toast notification
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ff4757;
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            box-shadow: 0 4px 15px rgba(255, 71, 87, 0.4);
            z-index: 10001;
            animation: slideIn 0.3s ease;
        `;
        toast.innerHTML = `
            <i class="fas fa-exclamation-circle"></i>
            <span style="margin-left: 10px;">${message}</span>
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    showMessageSentFeedback() {
        // Visual feedback that message was sent
        const sendBtn = document.querySelector('.send-btn');
        if (sendBtn) {
            const originalHTML = sendBtn.innerHTML;
            sendBtn.innerHTML = '<i class="fas fa-check"></i>';
            setTimeout(() => {
                sendBtn.innerHTML = originalHTML;
            }, 1000);
        }
    }

    playNotificationSound() {
        // Optional: Play a subtle notification sound
        try {
            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBzbA6vLTfS0FKHzJ8N6TOwoVYLjp8KFYFApIn+Hyu2sgBjW/6/LTfy8FKHvJ8N+UQAoVYLjp8KJZFQpJnuHyu2wgBjW+6/LTgC8FKHrJ8N+VQQoVX7jp8KNaFQpKneDyu2wfBjW+6/LTgC8FKHrJ8N+VQgoVX7jp8KNaFQpKneDyu2wfBjW+6/LTgC8FKHrJ8N+VQgoVX7jp8KNaFQpKneDyu2wfBjW+6/LTgC8FKHrJ8N+VQgoVX7jp8KNaFQpKneDyu2wfBjW+6/LTgC8FKHrJ8N+VQgoVX7jp8KNaFQpKneDyu2wfBjW+6/LTgC8FKHrJ8N+VQgoVX7jp8KNaFQpKneDyu2wfBjW+6/LTgC8FKHrJ8N+VQgoVX7jp8KNaFQpKneDyu2wfBjW+6/LTgC8FKHrJ8N+VQgoVX7jp8KNaFQpKneDyu2wfBjW+6/LTgC8FKHrJ8N+VQgoVX7jp8KNaFQpKneDyu2wfBjW+6/LTgC8FKHrJ8N+VQg==');
            audio.volume = 0.3;
            audio.play().catch(e => console.log('Could not play sound:', e));
        } catch (e) {
            // Sound not critical, ignore errors
        }
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (seconds < 60) {
            return 'Just now';
        } else if (minutes < 60) {
            return `${minutes}m ago`;
        } else if (hours < 24) {
            return `${hours}h ago`;
        } else if (days === 1) {
            return 'Yesterday';
        } else if (days < 7) {
            return `${days}d ago`;
        } else {
            return date.toLocaleDateString();
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize chat system when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait for BASE_URL to be defined
    if (typeof BASE_URL !== 'undefined') {
        window.gymChatSystem = new GymChatSystem();
        console.log('✅ Gym Chat System initialized');
    } else {
        console.warn('⚠️ BASE_URL not defined, waiting...');
        setTimeout(() => {
            window.gymChatSystem = new GymChatSystem();
            console.log('✅ Gym Chat System initialized (delayed)');
        }, 1000);
    }
});
