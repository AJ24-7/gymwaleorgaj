// ============================================
// FLOATING GYM CHAT WIDGET
// Premium animated chatbot for gym profiles
// ============================================

class FloatingGymChatWidget {
    constructor() {
        this.isOpen = false;
        this.isLoggedIn = false;
        this.currentGymId = null;
        this.currentGymName = 'Gym';
        this.currentGymLogo = null;
        this.userProfileImage = null;
        this.messages = [];
        this.currentChatId = null;
        this.lastMessageCount = 0;
        this.pollingInterval = null;
        this.BASE_URL = `${window.location.protocol}//${window.location.hostname}:5000`;
        
        this.init();
    }

    init() {
        console.log('🤖 Initializing Floating Gym Chat Widget');
        this.checkAuth();
        this.getGymData();
        this.createWidget();
        this.bindEvents();
        this.startIdleAnimation();
    }

    checkAuth() {
        const token = localStorage.getItem('token');
        this.isLoggedIn = !!token;
        console.log('🔐 Auth status:', this.isLoggedIn ? 'Logged in' : 'Guest');
        
        // Get user profile image if logged in
        if (this.isLoggedIn) {
            this.getUserProfileImage();
        }
    }

    async getUserProfileImage() {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${this.BASE_URL}/api/users/profile`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const userData = await response.json();
                if (userData.profileImage) {
                    // Format profile image URL
                    if (userData.profileImage.startsWith('http')) {
                        this.userProfileImage = userData.profileImage;
                    } else if (userData.profileImage.startsWith('/')) {
                        this.userProfileImage = `${this.BASE_URL}${userData.profileImage}`;
                    } else {
                        this.userProfileImage = `${this.BASE_URL}/uploads/profile-pics/${userData.profileImage}`;
                    }
                    console.log('👤 User profile image:', this.userProfileImage);
                }
            }
        } catch (error) {
            console.error('Error fetching user profile:', error);
            // Fallback to default
            this.userProfileImage = `${this.BASE_URL}/uploads/profile-pics/default.png`;
        }
    }

    getGymData() {
        // Get gym ID from URL
        const urlParams = new URLSearchParams(window.location.search);
        this.currentGymId = urlParams.get('gymId') || urlParams.get('id');
        
        // Get gym name from DOM
        const gymNameEl = document.getElementById('gym-name');
        if (gymNameEl) {
            this.currentGymName = gymNameEl.textContent || 'Gym';
        }
        
        // Get gym logo from DOM (properly formatted)
        const gymLogoEl = document.getElementById('gym-logo');
        if (gymLogoEl && gymLogoEl.src) {
            // Use the already processed logo URL from the page
            this.currentGymLogo = gymLogoEl.src;
        }
        
        // Fallback: try to get from localStorage
        if (!this.currentGymLogo) {
            const storedLogo = localStorage.getItem('gymLogo');
            if (storedLogo && storedLogo !== 'public/Gym-Wale.png') {
                this.currentGymLogo = storedLogo;
            }
        }
        
        // Listen for gym data loaded event
        document.addEventListener('gymDataLoaded', (e) => {
            if (e.detail) {
                this.currentGymId = e.detail.gymId || e.detail.gym?._id;
                this.currentGymName = e.detail.gym?.gymName || this.currentGymName;
                
                // Process gym logo URL
                if (e.detail.gym?.logoUrl) {
                    let logoUrl = e.detail.gym.logoUrl;
                    // Convert relative path to full URL if needed
                    if (logoUrl && !logoUrl.startsWith('http')) {
                        if (logoUrl.startsWith('/')) {
                            this.currentGymLogo = `${this.BASE_URL}${logoUrl}`;
                        } else {
                            this.currentGymLogo = `${this.BASE_URL}/${logoUrl}`;
                        }
                    } else {
                        this.currentGymLogo = logoUrl;
                    }
                }
                
                this.updateGymInfo();
            }
        });
        
        console.log('🏢 Gym Data:', {
            id: this.currentGymId,
            name: this.currentGymName,
            logo: this.currentGymLogo
        });
    }

    createWidget() {
        // Only show for logged-in users
        if (!this.isLoggedIn) {
            console.log('⚠️ Widget hidden - user not logged in');
            return;
        }

        const widget = document.createElement('div');
        widget.id = 'floating-chat-widget';
        widget.className = 'floating-chat-widget';
        widget.innerHTML = `
            <!-- Floating Chat Button -->
            <div class="floating-chat-button" id="floating-chat-btn">
                <div class="chat-icon-wrapper">
                    <svg class="chat-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2C6.48 2 2 6.48 2 12C2 13.89 2.55 15.64 3.49 17.13L2.14 21.86L6.87 20.51C8.36 21.45 10.11 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2Z" fill="currentColor"/>
                        <path d="M8 11H10V13H8V11Z" fill="#1a1a1a"/>
                        <path d="M11 11H13V13H11V11Z" fill="#1a1a1a"/>
                        <path d="M14 11H16V13H14V11Z" fill="#1a1a1a"/>
                        <circle cx="12" cy="12" r="1.5" fill="url(#pulse-gradient)" class="pulse-dot"/>
                        <defs>
                            <linearGradient id="pulse-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" style="stop-color:#ff6b35;stop-opacity:1" />
                                <stop offset="100%" style="stop-color:#f7931e;stop-opacity:1" />
                            </linearGradient>
                        </defs>
                    </svg>
                    <div class="pulse-ring"></div>
                    <div class="pulse-ring-2"></div>
                </div>
                <span class="chat-tooltip">Chat with Gym</span>
                <span class="unread-badge" id="chat-unread-badge" style="display: none;">0</span>
            </div>

            <!-- Chat Drawer -->
            <div class="chat-drawer" id="chat-drawer">
                <div class="chat-drawer-header">
                    <div class="gym-info-header">
                        ${this.currentGymLogo ? 
                            `<img src="${this.currentGymLogo}" alt="${this.currentGymName}" class="gym-avatar-mini" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                            <div class="gym-avatar-placeholder" style="display:none;"><i class="fas fa-dumbbell"></i></div>` : 
                            '<div class="gym-avatar-placeholder"><i class="fas fa-dumbbell"></i></div>'
                        }
                        <div class="gym-header-text">
                            <h4 class="gym-header-name">${this.currentGymName}</h4>
                            <p class="gym-header-status"><span class="status-dot"></span>Online</p>
                        </div>
                    </div>
                    <button class="close-drawer-btn" id="close-drawer-btn">
                        <i class="fas fa-times"></i>
                    </button>
                </div>

                <div class="chat-messages-area" id="chat-messages-area">
                    <div class="chat-welcome-message">
                        <div class="welcome-icon">
                            <i class="fas fa-dumbbell"></i>
                        </div>
                        <h3>Welcome to ${this.currentGymName}!</h3>
                        <p>How can we help you today?</p>
                    </div>

                    <!-- Quick Actions -->
                    <div class="quick-actions-grid">
                        <button class="quick-action-btn" data-message="What are your membership plans?">
                            <i class="fas fa-id-card"></i>
                            <span>Membership Plans</span>
                        </button>
                        <button class="quick-action-btn" data-message="What are your operating hours?">
                            <i class="fas fa-clock"></i>
                            <span>Timings</span>
                        </button>
                        <button class="quick-action-btn" data-message="Can I book a trial session?">
                            <i class="fas fa-calendar-check"></i>
                            <span>Book Trial</span>
                        </button>
                        <button class="quick-action-btn" data-message="Do you offer personal training?">
                            <i class="fas fa-user-tie"></i>
                            <span>Personal Training</span>
                        </button>
                    </div>

                    <!-- Messages Container -->
                    <div class="messages-container" id="messages-container">
                        <!-- Messages will be dynamically added here -->
                    </div>
                </div>

                <div class="chat-input-area">
                    <div class="typing-indicator" id="typing-indicator" style="display: none;">
                        <span></span><span></span><span></span>
                    </div>
                    <div class="input-wrapper">
                        <button class="attach-file-btn" title="Attach file">
                            <i class="fas fa-paperclip"></i>
                        </button>
                        <textarea 
                            class="chat-input-field" 
                            id="chat-input-field" 
                            placeholder="Type your message..."
                            rows="1"
                            maxlength="1000"
                        ></textarea>
                        <button class="send-message-btn" id="send-message-btn">
                            <i class="fas fa-paper-plane"></i>
                        </button>
                    </div>
                    <div class="powered-by">
                        <span>Powered by <strong>FIT-verse AI</strong></span>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(widget);
        console.log('✅ Widget created and injected');
    }

    bindEvents() {
        if (!this.isLoggedIn) return;

        const chatBtn = document.getElementById('floating-chat-btn');
        const closeBtn = document.getElementById('close-drawer-btn');
        const sendBtn = document.getElementById('send-message-btn');
        const inputField = document.getElementById('chat-input-field');
        const quickActionBtns = document.querySelectorAll('.quick-action-btn');

        if (chatBtn) {
            chatBtn.addEventListener('click', () => this.toggleDrawer());
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeDrawer());
        }

        if (sendBtn) {
            sendBtn.addEventListener('click', () => this.sendMessage());
        }

        if (inputField) {
            // Auto-resize textarea
            inputField.addEventListener('input', (e) => {
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
            });

            // Send on Enter (not Shift+Enter)
            inputField.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
        }

        // Quick action buttons
        quickActionBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const message = btn.dataset.message;
                if (message) {
                    this.sendQuickMessage(message);
                }
            });
        });

        console.log('✅ Events bound');
    }

    toggleDrawer() {
        this.isOpen = !this.isOpen;
        const drawer = document.getElementById('chat-drawer');
        const btn = document.getElementById('floating-chat-btn');

        if (this.isOpen) {
            drawer.classList.add('open');
            btn.classList.add('drawer-open');
            this.loadChatHistory();
            this.startPolling();
            
            // Focus input
            setTimeout(() => {
                const input = document.getElementById('chat-input-field');
                if (input) input.focus();
            }, 300);
        } else {
            drawer.classList.remove('open');
            btn.classList.remove('drawer-open');
        }
    }

    closeDrawer() {
        this.isOpen = false;
        const drawer = document.getElementById('chat-drawer');
        const btn = document.getElementById('floating-chat-btn');
        
        if (drawer) drawer.classList.remove('open');
        if (btn) btn.classList.remove('drawer-open');
        
        // Stop polling when drawer is closed
        this.stopPolling();
    }

    async loadChatHistory() {
        console.log('📜 Loading chat history...');
        
        const messagesContainer = document.getElementById('messages-container');
        if (!messagesContainer) return;

        // Show loading state
        this.showTypingIndicator();

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
            
            this.hideTypingIndicator();
            
            // Render all messages
            this.messages.forEach(msg => {
                this.addMessageToUI(msg.sender, msg.message, msg.timestamp, false);
            });
            
            // Mark messages as read
            if (this.currentChatId) {
                this.markMessagesAsRead();
            }

        } catch (error) {
            console.error('Error loading chat history:', error);
            this.hideTypingIndicator();
            // Show welcome message if no history
        }
    }

    sendMessage() {
        const inputField = document.getElementById('chat-input-field');
        if (!inputField) return;

        const message = inputField.value.trim();
        if (!message) return;

        console.log('📤 Sending message:', message);

        // Add user message to UI
        this.addMessageToUI('user', message);

        // Clear input
        inputField.value = '';
        inputField.style.height = 'auto';

        // Call stub function
        this.sendGymChatMessage(message);

        // Simulate response (remove when real backend is connected)
        this.simulateGymResponse();
    }

    sendQuickMessage(message) {
        console.log('⚡ Quick message:', message);
        this.addMessageToUI('user', message);
        this.sendGymChatMessage(message);
    }

    addMessageToUI(sender, message, timestamp = null, shouldScroll = true) {
        const messagesContainer = document.getElementById('messages-container');
        if (!messagesContainer) return;

        const messageEl = document.createElement('div');
        messageEl.className = `chat-message ${sender}-message`;
        
        const timeStr = timestamp ? this.formatTime(timestamp) : new Date().toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });

        if (sender === 'user') {
            messageEl.innerHTML = `
                <div class="message-content">
                    <div class="message-bubble">${this.escapeHtml(message)}</div>
                    <span class="message-time">${timeStr}</span>
                </div>
                <div class="message-avatar user-avatar">
                    ${this.userProfileImage ? 
                        `<img src="${this.userProfileImage}" alt="User" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" onerror="this.style.display='none'; this.parentElement.innerHTML='<i class=\\'fas fa-user\\'></i>';">` : 
                        '<i class="fas fa-user"></i>'
                    }
                </div>
            `;
        } else {
            messageEl.innerHTML = `
                <div class="message-avatar gym-avatar">
                    ${this.currentGymLogo ? 
                        `<img src="${this.currentGymLogo}" alt="${this.currentGymName}" onerror="this.style.display='none'; this.parentElement.innerHTML='<i class=\\'fas fa-dumbbell\\'></i>';">` : 
                        '<i class="fas fa-dumbbell"></i>'
                    }
                </div>
                <div class="message-content">
                    <div class="message-bubble">${this.escapeHtml(message)}</div>
                    <span class="message-time">${timeStr}</span>
                </div>
            `;
        }

        messagesContainer.appendChild(messageEl);
        if (shouldScroll) {
            this.scrollToBottom();
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

    // ============================================
    // BACKEND INTEGRATION - SEND MESSAGE
    // ============================================
    async sendGymChatMessage(message) {
        console.log('� Sending message to backend:', {
            gymId: this.currentGymId,
            message: message
        });

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
            console.log('✅ Message sent successfully:', data);
            
            this.currentChatId = data.chatId;
            
            // Show success feedback
            this.showMessageSentFeedback();
            
            // Start polling if not already started
            if (!this.pollingInterval) {
                this.startPolling();
            }
            
            return data;

        } catch (error) {
            console.error('❌ Error sending message:', error);
            this.showError('Failed to send message. Please try again.');
            throw error;
        }
    }

    showMessageSentFeedback() {
        const sendBtn = document.getElementById('send-message-btn');
        if (sendBtn) {
            const originalHTML = sendBtn.innerHTML;
            sendBtn.innerHTML = '<i class="fas fa-check"></i>';
            setTimeout(() => {
                sendBtn.innerHTML = originalHTML;
            }, 1000);
        }
    }

    // Start polling for new messages
    startPolling() {
        if (this.pollingInterval) return;
        
        this.pollingInterval = setInterval(() => {
            if (this.isOpen && this.currentChatId) {
                this.checkForNewMessages();
            }
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
        if (!this.currentGymId) return;

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
                
                // Add only new messages
                const newMessages = data.messages.slice(this.lastMessageCount);
                newMessages.forEach(msg => {
                    this.addMessageToUI(msg.sender, msg.message, msg.timestamp);
                });
                
                this.messages = data.messages;
                this.lastMessageCount = this.messages.length;
                
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
            
            console.log('✅ Messages marked as read');

        } catch (error) {
            console.error('Error marking messages as read:', error);
        }
    }

    showTypingIndicator() {
        const indicator = document.getElementById('typing-indicator');
        if (indicator) {
            indicator.style.display = 'flex';
        }
    }

    hideTypingIndicator() {
        const indicator = document.getElementById('typing-indicator');
        if (indicator) {
            indicator.style.display = 'none';
        }
    }

    scrollToBottom() {
        const messagesArea = document.getElementById('chat-messages-area');
        if (messagesArea) {
            setTimeout(() => {
                messagesArea.scrollTop = messagesArea.scrollHeight;
            }, 100);
        }
    }

    updateGymInfo() {
        const nameEl = document.querySelector('.gym-header-name');
        const avatarEl = document.querySelector('.gym-avatar-mini');
        const placeholderEl = document.querySelector('.gym-info-header .gym-avatar-placeholder');
        
        if (nameEl) nameEl.textContent = this.currentGymName;
        
        if (this.currentGymLogo) {
            if (avatarEl) {
                avatarEl.src = this.currentGymLogo;
                avatarEl.style.display = 'block';
                if (placeholderEl) placeholderEl.style.display = 'none';
            } else if (placeholderEl) {
                // Create image element if only placeholder exists
                const img = document.createElement('img');
                img.src = this.currentGymLogo;
                img.alt = this.currentGymName;
                img.className = 'gym-avatar-mini';
                img.onerror = function() {
                    this.style.display = 'none';
                    if (placeholderEl) placeholderEl.style.display = 'flex';
                };
                placeholderEl.parentNode.insertBefore(img, placeholderEl);
                placeholderEl.style.display = 'none';
            }
        }
    }

    startIdleAnimation() {
        if (!this.isLoggedIn) return;
        
        const btn = document.getElementById('floating-chat-btn');
        if (!btn) return;

        // Bounce animation every 5 seconds
        setInterval(() => {
            if (!this.isOpen) {
                btn.classList.add('bounce-animation');
                setTimeout(() => {
                    btn.classList.remove('bounce-animation');
                }, 1000);
            }
        }, 5000);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showError(message) {
        // Simple toast notification
        const toast = document.createElement('div');
        toast.className = 'chat-error-toast';
        toast.innerHTML = `
            <i class="fas fa-exclamation-circle"></i>
            <span>${message}</span>
        `;
        document.body.appendChild(toast);
        
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// Initialize widget when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Check if we're on a gym details page
    const isGymDetailsPage = document.querySelector('.gym-details-main') || 
                            window.location.pathname.includes('gymdetails');
    
    if (isGymDetailsPage) {
        window.floatingGymChat = new FloatingGymChatWidget();
        console.log('✅ Floating Gym Chat Widget initialized');
    }
});
