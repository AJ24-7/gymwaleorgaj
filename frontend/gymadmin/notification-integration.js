// === NOTIFICATION INTEGRATION ===
// This section integrates the notification system with existing functionality

// Override the existing addMemberForm submit handler to include notifications
document.addEventListener('DOMContentLoaded', function() {
  // Wait for notification system to initialize
  setTimeout(() => {
    
    // Don't override if our enhanced form handler is already working
    const originalAddMemberForm = document.getElementById('addMemberForm');
    if (originalAddMemberForm && originalAddMemberForm._hasEnhancedHandler) {
      return;
    }
    
    
    // Override member addition to trigger notifications
    if (originalAddMemberForm) {
      // Remove existing event listeners by cloning the element
      const newForm = originalAddMemberForm.cloneNode(true);
      originalAddMemberForm.parentNode.replaceChild(newForm, originalAddMemberForm);
      
      // Add new event listener with notification integration AND proper dialog error handling
      newForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        try {
          const formData = new FormData(this);
          const token = localStorage.getItem('gymAdminToken');
          
          console.log('[NotificationIntegration] Submitting form with notification integration');
          
          const response = await fetch('http://localhost:5000/api/members', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            },
            body: formData
          });
          
          const data = await response.json();
          
          if (response.ok && (data.success || data.message === 'Member added successfully')) {
            
            // Use dialog for success (if showDialog is available)
            if (typeof showDialog === 'function') {
              const memberName = formData.get('memberName') || formData.get('name') || 'Unknown';
              const membershipId = data.member?.membershipId || data.membershipId || 'Generated ID';
              
              showDialog({
                title: '✅ Member Added Successfully!',
                message: `Member <b>${memberName}</b> has been added successfully!<br><br>📋 <b>Membership ID:</b> ${membershipId}<br><br>📧 A welcome email with membership details has been sent to the member.`,
                confirmText: 'Got it!',
                iconHtml: '<i class="fas fa-user-check" style="color:#4caf50;font-size:2.5em;"></i>',
                onConfirm: function() {
                  // Reset form and close modal
                  newForm.reset();
                  const modal = document.getElementById('addMemberModal');
                  if (modal) modal.style.display = 'none';
                  
                  // Refresh members table if visible
                  if (typeof fetchAndDisplayMembers === 'function') {
                    fetchAndDisplayMembers();
                  }
                }
              });
            } else {
              // Fallback to old method if showDialog not available
              const successMsg = document.getElementById('addMemberSuccessMsg');
              if (successMsg) {
                successMsg.innerHTML = `
                  <div style="background: #d4edda; color: #155724; padding: 12px; border-radius: 6px; margin-top: 10px;">
                    <i class="fas fa-check-circle"></i> Member added successfully!
                  </div>
                `;
                successMsg.style.display = 'block';
              }
              
              // Reset form and close modal after delay
              setTimeout(() => {
                this.reset();
                const modal = document.getElementById('addMemberModal');
                if (modal) modal.style.display = 'none';
                if (successMsg) successMsg.style.display = 'none';
                
                // Refresh members table if visible
                if (typeof fetchAndDisplayMembers === 'function') {
                  fetchAndDisplayMembers();
                }
              }, 2000);
            }
            
            // Trigger notification if system is available
            if (window.notificationSystem) {
              window.notificationSystem.notifyNewMember({
                name: formData.get('memberName') || formData.get('name'),
                planSelected: formData.get('planSelected'),
                membershipId: data.member?.membershipId || data.membershipId || 'New Member'
              });
            }
            
          } else if (data && data.code === 'DUPLICATE_MEMBER') {
            // Handle duplicate member with dialog
            
            if (typeof showDialog === 'function') {
              const memberEmail = formData.get('memberEmail') || formData.get('email') || '';
              const memberPhone = formData.get('memberPhone') || formData.get('phone') || '';
              
              showDialog({
                title: '⚠️ Duplicate Member Detected',
                message: `A member with this email or phone number already exists in the system.\n\n🔍 <b>Details:</b>\n• Email: ${memberEmail}\n• Phone: ${memberPhone || 'Not provided'}\n\n👨‍👩‍👧‍👦 If this is a family member or the person already has a different membership, you can still add them.`,
                confirmText: 'Add Anyway',
                cancelText: 'Cancel',
                iconHtml: '<i class="fas fa-user-friends" style="color:#ff9800;font-size:2.5em;"></i>',
                onConfirm: async function() {
                  // Try again with forceAdd flag
                  formData.set('forceAdd', 'true');
                  try {
                    const forceRes = await fetch('http://localhost:5000/api/members', {
                      method: 'POST',
                      headers: {
                        'Authorization': `Bearer ${token}`
                      },
                      body: formData
                    });
                    const forceData = await forceRes.json();
                    
                    if (forceRes.ok && (forceData.success || forceData.message === 'Member added successfully')) {
                      // Show success dialog for forced add
                      const memberName = formData.get('memberName') || formData.get('name') || 'Unknown';
                      const membershipId = forceData.member?.membershipId || forceData.membershipId || 'Generated ID';
                      
                      showDialog({
                        title: '✅ Member Added Successfully!',
                        message: `Member <b>${memberName}</b> has been added successfully!<br><br>📋 <b>Membership ID:</b> ${membershipId}<br><br>📧 A welcome email with membership details has been sent to the member.`,
                        confirmText: 'Got it!',
                        iconHtml: '<i class="fas fa-user-check" style="color:#4caf50;font-size:2.5em;"></i>',
                        onConfirm: function() {
                          newForm.reset();
                          const modal = document.getElementById('addMemberModal');
                          if (modal) modal.style.display = 'none';
                          if (typeof fetchAndDisplayMembers === 'function') {
                            fetchAndDisplayMembers();
                          }
                        }
                      });
                    } else {
                      throw new Error(forceData.message || forceData.error || 'Failed to add member');
                    }
                  } catch (err) {
                    showDialog({
                      title: 'Connection Error',
                      message: 'Unable to connect to server. Please check your connection and try again.',
                      confirmText: 'OK',
                      iconHtml: '<i class="fas fa-wifi" style="color:#e53935;font-size:2.2em;"></i>'
                    });
                  }
                }
              });
            } else {
              // Fallback to bottom message
              throw new Error(data.message || 'A member with this email or phone number already exists.');
            }
            
          } else {
            throw new Error(data.message || data.error || 'Failed to add member');
          }
          
        } catch (error) {
          console.error('[NotificationIntegration] Error adding member:', error);
          
          // Use dialog for error (if available)
          if (typeof showDialog === 'function') {
            showDialog({
              title: 'Error Adding Member',
              message: error.message || 'Failed to add member. Please try again.',
              confirmText: 'OK',
              iconHtml: '<i class="fas fa-exclamation-triangle" style="color:#e53935;font-size:2.2em;"></i>'
            });
          } else {
            // Fallback to bottom error message
            const successMsg = document.getElementById('addMemberSuccessMsg');
            if (successMsg) {
              successMsg.innerHTML = `
                <div style="background: #f8d7da; color: #721c24; padding: 12px; border-radius: 6px; margin-top: 10px;">
                  <i class="fas fa-exclamation-triangle"></i> Error: ${error.message}
                </div>
              `;
              successMsg.style.display = 'block';
            }
          }
        }
      });
    }
    
    // Override trainer approval/rejection handlers
    overrideTrainerHandlers();
    
    // Override payment notification triggers
    overridePaymentHandlers();
    
  }, 2000); // Wait for notification system to initialize
});

// Test function to verify notification system integration
function testNotificationSystem() {
  if (window.notificationSystem && typeof showDialog === 'function') {
    
    // Test dialog integration
    showDialog({
      title: '🔔 Notification System Active',
      message: `Notification system is now enabled with all features:<br><br>
        ✅ <b>New Member Notifications</b><br>
        ✅ <b>Payment Notifications</b><br>
        ✅ <b>Trainer Approval Notifications</b><br>
        ✅ <b>Email Notifications</b><br>
        ✅ <b>Membership Expiry Alerts</b><br>
        ✅ <b>Admin Update Notifications</b><br><br>
        <i>All settings can be configured in the Settings tab.</i>`,
      confirmText: 'Awesome!',
      iconHtml: '<i class="fas fa-bell" style="color:#4caf50;font-size:2.5em;"></i>',
      onConfirm: function() {
      }
    });
    
    return true;
  } else {
    console.warn('⚠️ Notification system or dialog system not available');
    return false;
  }
}

// Auto-test when both systems are ready
setTimeout(() => {
  if (window.notificationSystem) {
   
  }
}, 3000);

// Function to override trainer approval/rejection handlers
function overrideTrainerHandlers() {
  // Find and override trainer action buttons
  document.addEventListener('click', function(e) {
    if (e.target.matches('.approve-trainer-btn') || e.target.closest('.approve-trainer-btn')) {
      e.preventDefault();
      e.stopPropagation();
      
      const button = e.target.matches('.approve-trainer-btn') ? e.target : e.target.closest('.approve-trainer-btn');
      const trainerId = button.dataset.trainerId;
      const trainerName = button.dataset.trainerName || 'Trainer';
      
      handleTrainerAction(trainerId, 'approved', trainerName);
    }
    
    if (e.target.matches('.reject-trainer-btn') || e.target.closest('.reject-trainer-btn')) {
      e.preventDefault();
      e.stopPropagation();
      
      const button = e.target.matches('.reject-trainer-btn') ? e.target : e.target.closest('.reject-trainer-btn');
      const trainerId = button.dataset.trainerId;
      const trainerName = button.dataset.trainerName || 'Trainer';
      
      handleTrainerAction(trainerId, 'rejected', trainerName);
    }
  });
}

// Handle trainer approval/rejection with notifications
async function handleTrainerAction(trainerId, action, trainerName) {
  try {
    const token = localStorage.getItem('gymAdminToken');
    const response = await fetch(`http://localhost:5000/api/trainers/${trainerId}/${action === 'approved' ? 'approve' : 'reject'}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Trigger notification
      if (window.notificationSystem) {
        window.notificationSystem.notifyTrainerApproval({
          name: trainerName
        }, action);
      }
      
      // Show success dialog
      if (typeof showDialog === 'function') {
        showDialog({
          title: `Trainer ${action === 'approved' ? 'Approved' : 'Rejected'}`,
          message: `${trainerName} has been ${action} successfully.`,
          confirmText: 'OK',
          iconHtml: `<i class="fas ${action === 'approved' ? 'fa-check-circle' : 'fa-times-circle'}" style="color: ${action === 'approved' ? '#4caf50' : '#f44336'}; font-size: 2rem;"></i>`
        });
      }
      
      // Refresh trainer list
      if (typeof showTrainerTab === 'function') {
        showTrainerTab();
      }
    } else {
      throw new Error(data.message || `Failed to ${action === 'approved' ? 'approve' : 'reject'} trainer`);
    }
    
  } catch (error) {
    console.error(`Error ${action === 'approved' ? 'approving' : 'rejecting'} trainer:`, error);
    if (typeof showDialog === 'function') {
      showDialog({
        title: 'Error',
        message: `Failed to ${action === 'approved' ? 'approve' : 'reject'} trainer: ${error.message}`,
        confirmText: 'OK',
        iconHtml: '<i class="fas fa-exclamation-triangle" style="color: #f44336; font-size: 2rem;"></i>'
      });
    }
  }
}

// Function to override payment notification triggers
function overridePaymentHandlers() {
  // This can be expanded when payment tracking is implemented
  console.log('[NotificationIntegration] Payment handlers ready for integration');
}

// Function to integrate with settings tab
function integrateNotificationSettings() {
  // Wait for settings tab to be available
  const checkSettings = setInterval(() => {
    const settingsTab = document.getElementById('settingsTab');
    if (settingsTab && window.notificationSystem) {
      clearInterval(checkSettings);
      
      // Find notification setting toggles and bind them
      const notificationSettings = [
        'newMemberNotif',
        'paymentNotif',
        'trainerNotif',
        'emailNotif',
        'membershipExpiryNotif',
        'adminUpdateNotif'
      ];
      
      notificationSettings.forEach(settingId => {
        const toggle = document.getElementById(settingId);
        if (toggle) {
          // Set initial state from notification system
          toggle.checked = window.notificationSystem.settings[settingId] || false;
          
          // Listen for changes
          toggle.addEventListener('change', function() {
            window.notificationSystem.saveNotificationSettings({
              [settingId]: this.checked
            });
            
            // Show feedback using dialog system
            if (typeof showDialog === 'function') {
              const settingName = settingId.replace('Notif', ' Notifications');
              showDialog({
                title: '⚙️ Settings Updated',
                message: `${settingName} ${this.checked ? 'enabled' : 'disabled'} successfully!`,
                confirmText: 'Got it!',
                iconHtml: '<i class="fas fa-cog" style="color:#4caf50;font-size:2.2em;"></i>'
              });
            }
          });
        }
      });
      
      console.log('✅ Notification settings integrated with settings tab');
    }
  }, 500);
  
  // Clear interval after 10 seconds to prevent infinite checking
  setTimeout(() => clearInterval(checkSettings), 10000);
}

// Export functions for potential external use
window.notificationIntegration = {
  overrideTrainerHandlers,
  overridePaymentHandlers,
  integrateNotificationSettings,
  testNotificationSystem
};
