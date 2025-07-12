// === NOTIFICATION INTEGRATION ===
// This section integrates the notification system with existing functionality

// Override the existing addMemberForm submit handler to include notifications
document.addEventListener('DOMContentLoaded', function() {
  // Wait for notification system to initialize
  setTimeout(() => {
    // Override member addition to trigger notifications
    const originalAddMemberForm = document.getElementById('addMemberForm');
    if (originalAddMemberForm) {
      // Remove existing event listeners by cloning the element
      const newForm = originalAddMemberForm.cloneNode(true);
      originalAddMemberForm.parentNode.replaceChild(newForm, originalAddMemberForm);
      
      // Add new event listener with notification integration
      newForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        try {
          const formData = new FormData(this);
          const token = localStorage.getItem('gymAdminToken');
          
          const response = await fetch('http://localhost:5000/api/members', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            },
            body: formData
          });
          
          const data = await response.json();
          
          if (data.success) {
            // Show success message
            const successMsg = document.getElementById('addMemberSuccessMsg');
            if (successMsg) {
              successMsg.innerHTML = `
                <div style="background: #d4edda; color: #155724; padding: 12px; border-radius: 6px; margin-top: 10px;">
                  <i class="fas fa-check-circle"></i> Member added successfully!
                </div>
              `;
              successMsg.style.display = 'block';
            }
            
            // Trigger notification if system is available
            if (window.notificationSystem) {
              window.notificationSystem.notifyNewMember({
                name: formData.get('name'),
                planSelected: formData.get('planSelected'),
                membershipId: data.member?.membershipId || 'New Member'
              });
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
            
          } else {
            throw new Error(data.message || 'Failed to add member');
          }
          
        } catch (error) {
          console.error('Error adding member:', error);
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
      });
    }
    
    // Override trainer approval/rejection handlers
    overrideTrainerHandlers();
    
    // Override payment notification triggers
    overridePaymentHandlers();
    
  }, 2000); // Wait for notification system to initialize
});

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
      showDialog({
        title: `Trainer ${action === 'approved' ? 'Approved' : 'Rejected'}`,
        message: `${trainerName} has been ${action} successfully.`,
        confirmText: 'OK',
        iconHtml: `<i class="fas ${action === 'approved' ? 'fa-check-circle' : 'fa-times-circle'}" style="color: ${action === 'approved' ? '#4caf50' : '#f44336'}; font-size: 2rem;"></i>`
      });
      
      // Refresh trainer list
      if (typeof showTrainerTab === 'function') {
        showTrainerTab();
      }
    } else {
      throw new Error(data.message || `Failed to ${action === 'approved' ? 'approve' : 'reject'} trainer`);
    }
    
  } catch (error) {
    console.error(`Error ${action === 'approved' ? 'approving' : 'rejecting'} trainer:`, error);
    showDialog({
      title: 'Error',
      message: `Failed to ${action === 'approved' ? 'approve' : 'reject'} trainer: ${error.message}`,
      confirmText: 'OK',
      iconHtml: '<i class="fas fa-exclamation-triangle" style="color: #f44336; font-size: 2rem;"></i>'
    });
  }
}

// Function to override payment notification triggers
function overridePaymentHandlers() {
  // This can be expanded when payment tracking is implemented
  // For now, we'll simulate payment notifications when membership plans are selected
  
  const planSelects = document.querySelectorAll('#planSelected, #monthlyPlan');
  planSelects.forEach(select => {
    select.addEventListener('change', function() {
      // When payment amount is calculated, we can trigger a payment notification
      const paymentAmount = document.getElementById('paymentAmount');
      if (paymentAmount && paymentAmount.value && window.notificationSystem) {
        // This would be called when actual payment is processed
        // For demonstration, we're showing how it would work
        setTimeout(() => {
          if (Math.random() > 0.7) { // Simulate payment received 30% of the time for demo
            window.notificationSystem.notifyPaymentReceived({
              amount: paymentAmount.value,
              memberName: 'Demo Member',
              plan: this.value
            });
          }
        }, 3000);
      }
    });
  });
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
        'emailNotif'
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
            
            // Show feedback
            if (typeof showNotification === 'function') {
              showNotification(
                `${settingId.replace('Notif', ' notifications')} ${this.checked ? 'enabled' : 'disabled'}`,
                'info'
              );
            }
          });
        }
      });
    }
  }, 500);
  
  // Clear interval after 10 seconds to prevent infinite checking
  setTimeout(() => clearInterval(checkSettings), 10000);
}

// Start integration when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  setTimeout(integrateNotificationSettings, 1500);
});

// === END NOTIFICATION INTEGRATION ===
