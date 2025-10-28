/**
 * Gym Profile Offer Integration Example
 * 
 * This file demonstrates how to integrate the enhanced offers system
 * into gym profile pages for user-facing applications.
 */

// Example: How to show offers when a user visits a gym profile page
document.addEventListener('DOMContentLoaded', function() {
  console.log('🏋️ Gym Profile Integration Example Loaded');
  
  // Example gym profile page setup
  setupGymProfileOffers();
});

function setupGymProfileOffers() {
  // Simulate gym profile page data
  const gymData = {
    id: 'gym_12345',
    name: 'Fit-Verse Gym',
    location: 'Downtown',
    hasActiveOffers: true
  };
  
  // Check if user is logged in and if they're new or existing
  const userId = localStorage.getItem('userId');
  const isNewUser = !userId || isFirstTimeVisitor(gymData.id);
  
  console.log(`👤 User Status: ${isNewUser ? 'New' : 'Existing'} user`);
  
  // Show offers popup after a short delay (to let page load)
  setTimeout(() => {
    if (typeof OffersManager !== 'undefined') {
      OffersManager.showGymProfileOffers(gymData.id, isNewUser);
    } else {
      console.warn('⚠️ OffersManager not loaded. Make sure offers-manager.js is included.');
    }
  }, 2000);
  
  // Add offer trigger button to gym profile
  addOfferTriggerButton(gymData.id, isNewUser);
}

function isFirstTimeVisitor(gymId) {
  const visitHistory = JSON.parse(localStorage.getItem('gymVisitHistory') || '{}');
  return !visitHistory[gymId];
}

function addOfferTriggerButton(gymId, isNewUser) {
  // Create a button to manually trigger offers (for testing/demo purposes)
  const triggerButton = document.createElement('button');
  triggerButton.id = 'viewOffersBtn';
  triggerButton.className = 'view-offers-btn';
  triggerButton.innerHTML = `
    <i class="fas fa-gift"></i> 
    ${isNewUser ? 'Welcome Offers' : 'Special Offers'}
  `;
  
  triggerButton.onclick = () => {
    if (typeof OffersManager !== 'undefined') {
      OffersManager.showGymProfileOffers(gymId, isNewUser);
    }
  };
  
  // Try to add to existing gym profile container, or create one
  let container = document.querySelector('.gym-profile-actions') || 
                  document.querySelector('.gym-actions') ||
                  document.querySelector('#gymProfile');
  
  if (!container) {
    // Create a demo container
    container = document.createElement('div');
    container.className = 'gym-profile-demo';
    container.innerHTML = `
      <div class="demo-gym-info">
        <h2>🏋️ Fit-Verse Gym Demo</h2>
        <p>This demonstrates the enhanced offers system integration</p>
      </div>
    `;
    document.body.appendChild(container);
  }
  
  container.appendChild(triggerButton);
  
  // Add CSS for the button
  addOfferButtonStyles();
}

function addOfferButtonStyles() {
  if (document.getElementById('offerButtonStyles')) return;
  
  const styles = document.createElement('style');
  styles.id = 'offerButtonStyles';
  styles.textContent = `
    .view-offers-btn {
      background: linear-gradient(135deg, #1976d2, #42a5f5);
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 12px;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 4px 15px rgba(25, 118, 210, 0.3);
      margin: 16px 0;
    }
    
    .view-offers-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(25, 118, 210, 0.4);
    }
    
    .view-offers-btn i {
      font-size: 1.1rem;
    }
    
    .gym-profile-demo {
      max-width: 500px;
      margin: 40px auto;
      padding: 30px;
      background: white;
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.1);
      text-align: center;
    }
    
    .demo-gym-info h2 {
      margin: 0 0 12px 0;
      color: #2c3e50;
    }
    
    .demo-gym-info p {
      margin: 0 0 20px 0;
      color: #6c757d;
      line-height: 1.5;
    }
    
    /* Demo notification */
    .demo-notification {
      position: fixed;
      top: 20px;
      right: 20px;
      background: #1976d2;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 16px rgba(25, 118, 210, 0.3);
      z-index: 10000;
      animation: slideInRight 0.3s ease;
    }
    
    @keyframes slideInRight {
      from { transform: translateX(100%); }
      to { transform: translateX(0); }
    }
  `;
  
  document.head.appendChild(styles);
}

// Example: Track gym visits for new/existing user determination
function trackGymVisit(gymId) {
  const visitHistory = JSON.parse(localStorage.getItem('gymVisitHistory') || '{}');
  visitHistory[gymId] = {
    firstVisit: visitHistory[gymId]?.firstVisit || new Date().toISOString(),
    lastVisit: new Date().toISOString(),
    visitCount: (visitHistory[gymId]?.visitCount || 0) + 1
  };
  localStorage.setItem('gymVisitHistory', JSON.stringify(visitHistory));
}

// Example: Initialize user session
function initializeUserSession() {
  if (!localStorage.getItem('userId')) {
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('userId', userId);
    console.log('👤 New user session created:', userId);
  }
}

// Example: Show user's claimed offers (for user dashboard integration)
function showUserOffers() {
  const userId = localStorage.getItem('userId');
  if (!userId) {
    console.log('👤 No user session found');
    return;
  }
  
  if (typeof OffersManager !== 'undefined') {
    const userOffers = OffersManager.getUserClaimedOffers(userId);
    console.log('🎁 User claimed offers:', userOffers);
    
    // Create a simple display
    const container = document.createElement('div');
    container.innerHTML = `
      <h3>Your Claimed Offers (${userOffers.length})</h3>
      ${userOffers.length === 0 ? 
        '<p>No offers claimed yet. Visit gym profiles to discover offers!</p>' :
        userOffers.map(offer => `
          <div class="user-offer-item">
            <strong>Offer ID:</strong> ${offer.offerId}<br>
            <strong>Claimed:</strong> ${new Date(offer.claimedAt).toLocaleDateString()}<br>
            <strong>Status:</strong> ${offer.status}
          </div>
        `).join('')
      }
    `;
    
    document.body.appendChild(container);
  }
}

// Initialize user session on load
initializeUserSession();

// Export for manual testing
window.GymProfileIntegration = {
  setupGymProfileOffers,
  showUserOffers,
  trackGymVisit,
  isFirstTimeVisitor
};

console.log('✅ Gym Profile Integration Example Ready');
console.log('📝 Usage Examples:');
console.log('  - GymProfileIntegration.showUserOffers() - Show user claimed offers');
console.log('  - GymProfileIntegration.trackGymVisit("gym123") - Track gym visit');
console.log('  - OffersManager.showGymProfileOffers("gym123", true) - Show offers for new user');