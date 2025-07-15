// === Enhanced Notification Modal System ===
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔔 Initializing Enhanced Notification Modal System');
    
    // Quick message templates
    // Member quick message templates
    const memberMessageTemplates = {
        'membership-expiry': {
            title: 'Membership Expiry Reminder',
            message: 'Dear {name},\n\nYour membership is expiring soon. Please renew to continue enjoying our services.\n\nExpiry Date: {expiryDate}\n\nBest regards,\nFit-Verse Team'
        },
        'payment-reminder': {
            title: 'Payment Reminder',
            message: 'Dear {name},\n\nThis is a friendly reminder about your pending payment.\n\nAmount: ₹{amount}\nDue Date: {dueDate}\n\nPlease complete your payment to avoid service interruption.\n\nBest regards,\nFit-Verse Team'
        },
        'new-class': {
            title: 'New Class Alert',
            message: 'Exciting News! 🎉\n\nWe\'re introducing a new class: {className}\n\nSchedule: {schedule}\nInstructor: {instructor}\n\nLimited spots available. Book now!\n\nBest regards,\nFit-Verse Team'
        },
        'holiday-notice': {
            title: 'Holiday Notice',
            message: 'Dear Members,\n\nPlease note that our gym will be closed on {holidayDate} due to {reason}.\n\nWe will resume normal operations on {resumeDate}.\n\nThank you for your understanding.\n\nBest regards,\nFit-Verse Team'
        },
        'maintenance': {
            title: 'Maintenance Notice',
            message: 'Dear Members,\n\nWe will be conducting maintenance work on {maintenanceDate} from {startTime} to {endTime}.\n\nAffected areas: {areas}\n\nWe apologize for any inconvenience.\n\nBest regards,\nFit-Verse Team'
        },
        'achievement': {
            title: 'Congratulations!',
            message: 'Dear {name},\n\nCongratulations on your amazing achievement! 🏆\n\n{achievementDescription}\n\nKeep up the great work!\n\nBest regards,\nFit-Verse Team'
        }
    };

    // Admin quick message templates
    const adminMessageTemplates = {
        'system-error': {
            title: 'System Error Alert',
            message: 'A system error has occurred in the gym management platform.\n\nError Details: {errorDetails}\n\nPlease investigate and resolve as soon as possible.'
        },
        'payment-failure': {
            title: 'Payment Failure Issue',
            message: 'A payment failure has been reported.\n\nMember: {memberName}\nAmount: ₹{amount}\nDate: {date}\n\nPlease check the payment gateway or contact the member.'
        },
        'grievance': {
            title: 'New Grievance Submitted',
            message: 'A new grievance has been submitted by a member or staff.\n\nSubject: {subject}\nDetails: {details}\n\nPlease review and take necessary action.'
        },
        'facility-issue': {
            title: 'Facility Issue Reported',
            message: 'A facility issue has been reported.\n\nArea: {area}\nIssue: {issueDescription}\n\nPlease assign maintenance staff to resolve this.'
        },
        'security-alert': {
            title: 'Security Alert',
            message: 'A security alert has been triggered.\n\nLocation: {location}\nTime: {time}\n\nPlease check the security system and ensure safety.'
        }
    };

    // Current templates in use
    let messageTemplates = {...memberMessageTemplates};

    // DOM elements
    const notificationModal = document.getElementById('notificationModal');
    const notificationTitle = document.getElementById('notificationTitle');
    const notificationMessage = document.getElementById('notificationMessage');
    const notificationSendTo = document.getElementById('notificationSendTo');
    const messagePreview = document.getElementById('messagePreview');
    const customSelectionArea = document.getElementById('customSelectionArea');
    const customRecipientList = document.getElementById('customRecipientList');
    const recipientSearch = document.getElementById('recipientSearch');
    const scheduleContainer = document.getElementById('scheduleContainer');
    const sendStatus = document.getElementById('sendStatus');

    // Helper function to update channel visibility
    function updateChannelVisibility(selectedValue) {
        const systemOption = document.getElementById('systemNotification')?.closest('.channel-option');
        const emailOption = document.getElementById('emailNotification')?.closest('.channel-option');
        const whatsappOption = document.getElementById('whatsappNotification')?.closest('.channel-option');
        const mainAdminOption = document.getElementById('mainAdminNotification')?.closest('.channel-option');

        if (selectedValue === 'admin') {
            // Show only main admin channel, lock it checked, hide others
            if (mainAdminOption) {
                mainAdminOption.style.display = '';
                const mainAdminCheckbox = document.getElementById('mainAdminNotification');
                if (mainAdminCheckbox) {
                    mainAdminCheckbox.checked = true;
                    mainAdminCheckbox.disabled = true;
                }
            }
            if (systemOption) systemOption.style.display = 'none';
            if (emailOption) emailOption.style.display = 'none';
            if (whatsappOption) whatsappOption.style.display = 'none';
        } else {
            // Hide main admin channel, show others
            if (mainAdminOption) {
                mainAdminOption.style.display = 'none';
                const mainAdminCheckbox = document.getElementById('mainAdminNotification');
                if (mainAdminCheckbox) {
                    mainAdminCheckbox.checked = false;
                    mainAdminCheckbox.disabled = false;
                }
            }
            if (systemOption) systemOption.style.display = '';
            if (emailOption) emailOption.style.display = '';
            if (whatsappOption) whatsappOption.style.display = '';
        }
    }

    // Initialize modal functionality
    function initializeNotificationModal() {
        // Quick message template handlers
        // Attach quick message handlers (function for reuse)
        function attachQuickMsgHandlers() {
            document.querySelectorAll('.quick-msg-btn').forEach(btn => {
                btn.addEventListener('click', async function() {
                    document.querySelectorAll('.quick-msg-btn').forEach(b => b.classList.remove('selected'));
                    this.classList.add('selected');
                    const template = messageTemplates[this.dataset.template];
                    if (template) {
                        notificationTitle.value = template.title;
                        let gymName = (window.currentGymProfile && window.currentGymProfile.gymName) ? window.currentGymProfile.gymName : 'Your Gym';
                        // Replace all occurrences of 'Fit-Verse Team' with the gym name
                        notificationMessage.value = template.message.replace(/Fit-Verse Team/g, gymName + ' Team');
                        updatePreview();
                        updateCharacterCount();
                    }
                });
            });
        }
        attachQuickMsgHandlers();

        // Set initial channel visibility (hide main admin channel by default)
        updateChannelVisibility(notificationSendTo?.value || 'all-members');

        // Send to filter handler
        if (notificationSendTo) {
            notificationSendTo.addEventListener('change', function() {
                // Show/hide custom selection
                if (this.value === 'custom') {
                    customSelectionArea.style.display = 'block';
                    loadCustomRecipients();
                } else {
                    customSelectionArea.style.display = 'none';
                }

                // Change quick message section for admin
                const quickMsgGrid = document.querySelector('.quick-message-grid');

                if (this.value === 'admin') {
                    // Use admin templates
                    messageTemplates = {...adminMessageTemplates};
                    if (quickMsgGrid) {
                        quickMsgGrid.innerHTML = `
                            <button type="button" class="quick-msg-btn" data-template="system-error">
                                <i class="fas fa-exclamation-triangle"></i> System Error
                            </button>
                            <button type="button" class="quick-msg-btn" data-template="payment-failure">
                                <i class="fas fa-credit-card"></i> Payment Failure
                            </button>
                            <button type="button" class="quick-msg-btn" data-template="grievance">
                                <i class="fas fa-comment-dots"></i> Grievance
                            </button>
                            <button type="button" class="quick-msg-btn" data-template="facility-issue">
                                <i class="fas fa-tools"></i> Facility Issue
                            </button>
                            <button type="button" class="quick-msg-btn" data-template="security-alert">
                                <i class="fas fa-shield-alt"></i> Security Alert
                            </button>
                        `;
                        attachQuickMsgHandlers();
                    }
                } else {
                    // Use member templates
                    messageTemplates = {...memberMessageTemplates};
                    if (quickMsgGrid) {
                        quickMsgGrid.innerHTML = `
                            <button type="button" class="quick-msg-btn" data-template="membership-expiry">
                                <i class="fas fa-calendar-times"></i> Membership Expiry
                            </button>
                            <button type="button" class="quick-msg-btn" data-template="payment-reminder">
                                <i class="fas fa-credit-card"></i> Payment Reminder
                            </button>
                            <button type="button" class="quick-msg-btn" data-template="new-class">
                                <i class="fas fa-plus-circle"></i> New Class
                            </button>
                            <button type="button" class="quick-msg-btn" data-template="holiday-notice">
                                <i class="fas fa-calendar-alt"></i> Holiday Notice
                            </button>
                            <button type="button" class="quick-msg-btn" data-template="maintenance">
                                <i class="fas fa-tools"></i> Maintenance
                            </button>
                            <button type="button" class="quick-msg-btn" data-template="achievement">
                                <i class="fas fa-trophy"></i> Achievement
                            </button>
                        `;
                        attachQuickMsgHandlers();
                    }
                }

                // Update channel visibility based on selection
                updateChannelVisibility(this.value);
            });
        }

        // Real-time preview updates
        if (notificationTitle) {
            notificationTitle.addEventListener('input', updatePreview);
            notificationTitle.addEventListener('input', updateCharacterCount);
        }
        if (notificationMessage) {
            notificationMessage.addEventListener('input', updatePreview);
            notificationMessage.addEventListener('input', updateCharacterCount);
        }

        // Delivery time handler
        document.querySelectorAll('input[name="deliveryTime"]').forEach(radio => {
            radio.addEventListener('change', function() {
                if (this.value === 'schedule') {
                    scheduleContainer.style.display = 'block';
                } else {
                    scheduleContainer.style.display = 'none';
                }
            });
        });

        // Recipient search
        if (recipientSearch) {
            recipientSearch.addEventListener('input', filterRecipients);
        }

        // Ensure only one click handler is attached to the modal's send button
        const sendBtn = document.getElementById('sendNotificationBtn');
        if (sendBtn) {
            console.log('Attaching click handler to send button');
            sendBtn.onclick = null;
            sendBtn.addEventListener('click', handleSendNotification);
        } else {
            console.error('Send button not found!');
        }

        console.log('✅ Enhanced Notification Modal initialized');
    }

    // Update message preview
    function updatePreview() {
        const title = notificationTitle?.value || 'Preview Title';
        const message = notificationMessage?.value || 'Preview message will appear here...';
        
        if (messagePreview) {
            const previewTitle = messagePreview.querySelector('.preview-title');
            const previewMessage = messagePreview.querySelector('.preview-message');
            
            if (previewTitle) previewTitle.textContent = title;
            if (previewMessage) previewMessage.textContent = message;
        }
    }

    // Update character count
    function updateCharacterCount() {
        const titleCount = notificationTitle?.value?.length || 0;
        const messageCount = notificationMessage?.value?.length || 0;
        
        const titleCountElement = notificationTitle?.parentElement?.querySelector('.char-count');
        const messageCountElement = notificationMessage?.parentElement?.querySelector('.char-count');
        
        if (titleCountElement) {
            titleCountElement.textContent = `${titleCount}/100`;
            titleCountElement.style.color = titleCount > 90 ? '#dc3545' : '#6c757d';
        }
        
        if (messageCountElement) {
            messageCountElement.textContent = `${messageCount}/500`;
            messageCountElement.style.color = messageCount > 450 ? '#dc3545' : '#6c757d';
        }
    }

    // Load custom recipients
    async function loadCustomRecipients() {
        try {
            const token = localStorage.getItem('gymAdminToken');
            if (!token) {
                console.error('No authentication token found');
                return;
            }

            // Fetch all members and trainers
            const [membersResponse, trainersResponse] = await Promise.all([
                fetch('http://localhost:5000/api/members', {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch('http://localhost:5000/api/trainers', {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ]);

            const members = membersResponse.ok ? await membersResponse.json() : [];
            const trainers = trainersResponse.ok ? await trainersResponse.json() : [];

            renderCustomRecipients([...members, ...trainers]);
        } catch (error) {
            console.error('Error loading recipients:', error);
        }
    }

    // Render custom recipients
    function renderCustomRecipients(recipients) {
        if (!customRecipientList) return;
        // Store recipients globally for quick lookup
        window._lastCustomRecipients = recipients;
        customRecipientList.innerHTML = recipients.map(recipient => `
            <div class="recipient-item" data-id="${recipient._id}">
                <input type="checkbox" id="recipient-${recipient._id}" value="${recipient._id}">
                <div class="recipient-avatar">
                    ${recipient.memberName ? recipient.memberName.charAt(0).toUpperCase() : 
                      recipient.name ? recipient.name.charAt(0).toUpperCase() : '?'}
                </div>
                <div class="recipient-info">
                    <div class="recipient-name">${recipient.memberName || recipient.name || 'Unknown'}</div>
                    <div class="recipient-email">${recipient.memberEmail || recipient.email || 'No email'}</div>
                </div>
            </div>
        `).join('');

        // Add click handlers for recipient items
        customRecipientList.querySelectorAll('.recipient-item').forEach(item => {
            item.addEventListener('click', function() {
                const checkbox = this.querySelector('input[type="checkbox"]');
                checkbox.checked = !checkbox.checked;
            });
        });
    }

    // Filter recipients
    function filterRecipients() {
        const searchTerm = recipientSearch?.value?.toLowerCase() || '';
        const recipientItems = customRecipientList?.querySelectorAll('.recipient-item') || [];

        recipientItems.forEach(item => {
            const name = item.querySelector('.recipient-name')?.textContent?.toLowerCase() || '';
            const email = item.querySelector('.recipient-email')?.textContent?.toLowerCase() || '';
            
            if (name.includes(searchTerm) || email.includes(searchTerm)) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    }

    // Handle send notification
    async function handleSendNotification(e) {
        e.preventDefault();
        console.log('Send notification clicked');
        
        const title = notificationTitle?.value?.trim();
        let message = notificationMessage?.value?.trim();
        // Personalize with gym name if available
        let gymName = (window.currentGymProfile && window.currentGymProfile.gymName) ? window.currentGymProfile.gymName : 'Your Gym';
        if (message && message.includes('Fit-Verse Team')) {
            message = message.replace(/Fit-Verse Team/g, gymName + ' Team');
        }
        const sendTo = notificationSendTo?.value;
        
        console.log('Form values:', { title, message, sendTo });
        
        if (!title || !message) {
            // Use window.showDialog if available, otherwise alert
            if (window.showDialog) {
                window.showDialog({
                    title: 'Missing Information',
                    message: 'Please fill in both title and message fields.',
                    confirmText: 'OK',
                    iconHtml: '<i class="fas fa-exclamation-triangle" style="color:#ff9800;font-size:2rem;"></i>'
                });
            } else {
                alert('Please fill in both title and message fields.');
            }
            return;
        }


        // Get selected channels (add main admin channel)
        const channels = {
            system: document.getElementById('systemNotification')?.checked || false,
            email: document.getElementById('emailNotification')?.checked || false,
            whatsapp: document.getElementById('whatsappNotification')?.checked || false,
            mainAdmin: document.getElementById('mainAdminNotification')?.checked || false
        };

        console.log('Selected channels:', channels);

        if (!channels.system && !channels.email && !channels.whatsapp && !channels.mainAdmin) {
            if (window.showDialog) {
                window.showDialog({
                    title: 'No Channels Selected',
                    message: 'Please select at least one notification channel.',
                    confirmText: 'OK',
                    iconHtml: '<i class="fas fa-exclamation-triangle" style="color:#ff9800;font-size:2rem;"></i>'
                });
            } else {
                alert('Please select at least one notification channel.');
            }
            return;
        }

        // Show sending status
        if (sendStatus) {
            sendStatus.style.display = 'block';
            updateSendStatus('all', 'pending');
        }

        try {
            // Get recipients based on filter
            const recipients = await getRecipients(sendTo);
            console.log('Recipients found:', recipients.length);
            
            if (recipients.length === 0) {
                if (window.showDialog) {
                    window.showDialog({
                        title: 'No Recipients',
                        message: 'No recipients found for the selected filter.',
                        confirmText: 'OK',
                        iconHtml: '<i class="fas fa-exclamation-triangle" style="color:#ff9800;font-size:2rem;"></i>'
                    });
                } else {
                    alert('No recipients found for the selected filter.');
                }
                return;
            }

            // Send through selected channels
            const results = await sendThroughChannels(title, message, recipients, channels);
            console.log('Send results:', results);

            // Update status based on results
            updateSendStatus('system', results.system ? 'success' : 'failed');
            updateSendStatus('email', results.email ? 'success' : 'failed');
            updateSendStatus('whatsapp', results.whatsapp ? 'success' : 'failed');
            if ('mainAdmin' in results) {
                updateSendStatus('mainAdmin', results.mainAdmin ? 'success' : 'failed');
            }

            // Show success message
            const usedChannels = Object.entries(channels).filter(([_, enabled]) => enabled).map(([channel, _]) => channel).join(', ');
            const successMessage = `Successfully sent notification to ${recipients.length} recipient(s).\n\nChannels used: ${usedChannels}`;

            if (window.showDialog) {
                window.showDialog({
                    title: 'Notification Sent!',
                    message: successMessage,
                    confirmText: 'Great!',
                    iconHtml: '<i class="fas fa-check-circle" style="color:#4caf50;font-size:2rem;"></i>',
                    onConfirm: () => {
                        // Reset form
                        resetNotificationForm();
                        notificationModal.classList.remove('show');
                    }
                });
            } else {
                alert(successMessage);
                resetNotificationForm();
                notificationModal.classList.remove('show');
            }

        } catch (error) {
            console.error('Error sending notification:', error);
            updateSendStatus('all', 'failed');
            
            if (window.showDialog) {
                window.showDialog({
                    title: 'Send Failed',
                    message: 'Failed to send notification. Please try again.',
                    confirmText: 'OK',
                    iconHtml: '<i class="fas fa-exclamation-triangle" style="color:#e53935;font-size:2rem;"></i>'
                });
            } else {
                alert('Failed to send notification. Please try again.');
            }
        }
    }

    // Get recipients based on filter
    async function getRecipients(filter) {
        const token = localStorage.getItem('gymAdminToken');
        if (!token) throw new Error('No authentication token found');

        try {
            switch (filter) {
                case 'all-members':
                    return await fetchAllMembers();
                case 'active-members':
                    return await fetchActiveMembers();
                case 'expiring-members':
                    return await fetchExpiringMembers();
                case 'expired-members':
                    return await fetchExpiredMembers();
                case 'premium-members':
                    return await fetchMembersByPlan('Premium');
                case 'standard-members':
                    return await fetchMembersByPlan('Standard');
                case 'basic-members':
                    return await fetchMembersByPlan('Basic');
                case 'trainers':
                    return await fetchTrainers();
                case 'admin':
                    return await fetchAdmin();
                case 'new-members':
                    return await fetchNewMembers();
                case 'custom':
                    return getCustomSelectedRecipients();
                default:
                    return [];
            }
        } catch (error) {
            console.error('Error fetching recipients:', error);
            return [];
        }
    }

    // Fetch functions for different recipient types
    async function fetchAllMembers() {
        const token = localStorage.getItem('gymAdminToken');
        const response = await fetch('http://localhost:5000/api/members', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return response.ok ? await response.json() : [];
    }

    async function fetchActiveMembers() {
        const members = await fetchAllMembers();
        const now = new Date();
        return members.filter(member => {
            const membershipEndDate = new Date(member.membershipEndDate);
            return membershipEndDate > now;
        });
    }

    async function fetchExpiringMembers() {
        const members = await fetchAllMembers();
        const now = new Date();
        const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        
        return members.filter(member => {
            const membershipEndDate = new Date(member.membershipEndDate);
            return membershipEndDate > now && membershipEndDate <= sevenDaysFromNow;
        });
    }

    async function fetchExpiredMembers() {
        const members = await fetchAllMembers();
        const now = new Date();
        return members.filter(member => {
            const membershipEndDate = new Date(member.membershipEndDate);
            return membershipEndDate <= now;
        });
    }

    async function fetchMembersByPlan(planType) {
        const members = await fetchAllMembers();
        return members.filter(member => member.planSelected === planType);
    }

    async function fetchTrainers() {
        const token = localStorage.getItem('gymAdminToken');
        const response = await fetch('http://localhost:5000/api/trainers', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return response.ok ? await response.json() : [];
    }

    async function fetchAdmin() {
        // Return current admin info
        return [window.currentGymProfile].filter(Boolean);
    }

    async function fetchNewMembers() {
        const members = await fetchAllMembers();
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        
        return members.filter(member => {
            const joinDate = new Date(member.membershipStartDate || member.createdAt);
            return joinDate >= thirtyDaysAgo;
        });
    }

    function getCustomSelectedRecipients() {
        const selectedCheckboxes = customRecipientList?.querySelectorAll('input[type="checkbox"]:checked') || [];
        return Array.from(selectedCheckboxes).map(checkbox => ({
            _id: checkbox.value,
            // Add other recipient details as needed
        }));
    }

    // Send through different channels
    async function sendThroughChannels(title, message, recipients, channels) {
        const results = { system: false, email: false, whatsapp: false, mainAdmin: false };
        const token = localStorage.getItem('gymAdminToken');

        // System notification
        if (channels.system) {
            try {
                const response = await fetch('http://localhost:5000/api/notifications/send', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        title,
                        message,
                        recipients: recipients.map(r => r._id),
                        type: 'system'
                    })
                });
                results.system = response.ok;
            } catch (error) {
                console.error('System notification error:', error);
            }
        }

        // Email notification
        if (channels.email) {
            try {
                const response = await fetch('http://localhost:5000/api/notifications/send-email', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        title,
                        message,
                        recipients: recipients.map(r => r.memberEmail || r.email).filter(Boolean)
                    })
                });
                results.email = response.ok;
            } catch (error) {
                console.error('Email notification error:', error);
            }
        }

        // WhatsApp notification
        if (channels.whatsapp) {
            try {
                const response = await fetch('http://localhost:5000/api/notifications/send-whatsapp', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        title,
                        message,
                        recipients: recipients.map(r => r.memberPhone || r.phone).filter(Boolean)
                    })
                });
                results.whatsapp = response.ok;
            } catch (error) {
                console.error('WhatsApp notification error:', error);
            }
        }

        // Main Admin notification channel
        if (channels.mainAdmin) {
            try {
                // Use a dedicated endpoint/type for main admin notification system
                const response = await fetch('http://localhost:5000/api/admin/notifications/send', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        title,
                        message,
                        type: 'admin-system',
                        // Optionally, you can add more fields if needed
                    })
                });
                results.mainAdmin = response.ok;
            } catch (error) {
                console.error('Main Admin notification error:', error);
            }
        }

        return results;
    }

    // Update send status
    function updateSendStatus(channel, status) {
        const statusElements = {
            system: document.getElementById('systemStatus'),
            email: document.getElementById('emailStatus'),
            whatsapp: document.getElementById('whatsappStatus')
        };

        if (channel === 'all') {
            Object.values(statusElements).forEach(element => {
                if (element) {
                    element.textContent = status === 'pending' ? 'Sending...' : 'Failed';
                    element.className = `status-text ${status}`;
                }
            });
        } else if (statusElements[channel]) {
            const element = statusElements[channel];
            element.textContent = status === 'success' ? 'Sent' : status === 'failed' ? 'Failed' : 'Pending';
            element.className = `status-text ${status}`;
        }
    }

    // Reset notification form
    function resetNotificationForm() {
        console.log('Resetting notification form');
        if (notificationTitle) notificationTitle.value = '';
        if (notificationMessage) notificationMessage.value = '';
        if (notificationSendTo) notificationSendTo.value = 'all-members';
        
        // Reset channels
        const systemNotificationEl = document.getElementById('systemNotification');
        const emailNotificationEl = document.getElementById('emailNotification');
        const whatsappNotificationEl = document.getElementById('whatsappNotification');
        
        if (systemNotificationEl) systemNotificationEl.checked = true;
        if (emailNotificationEl) emailNotificationEl.checked = false;
        if (whatsappNotificationEl) whatsappNotificationEl.checked = false;
        
        // Reset delivery time
        const deliveryNowEl = document.querySelector('input[name="deliveryTime"][value="now"]');
        if (deliveryNowEl) deliveryNowEl.checked = true;
        if (scheduleContainer) scheduleContainer.style.display = 'none';
        
        // Reset other elements
        if (customSelectionArea) customSelectionArea.style.display = 'none';
        if (sendStatus) sendStatus.style.display = 'none';
        
        // Reset quick message buttons
        document.querySelectorAll('.quick-msg-btn').forEach(btn => btn.classList.remove('selected'));
        
        updatePreview();
        updateCharacterCount();
    }

    // Expose function globally
    window.resetNotificationForm = resetNotificationForm;

    // Initialize when DOM is ready
    initializeNotificationModal();
    
    // Add debug functions
    window.testNotificationSystem = {
        sendTestNotification: () => {
            notificationTitle.value = 'Test Notification';
            notificationMessage.value = 'This is a test notification from the enhanced system.';
            updatePreview();
        },
        loadTestTemplate: () => {
            document.querySelector('[data-template="membership-expiry"]').click();
        }
    };
});
