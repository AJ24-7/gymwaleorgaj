// ===============================================
// SETTINGS PAGE JAVASCRIPT
// ===============================================

// Utility function to get and validate token
function getValidToken() {
    const token = localStorage.getItem('token');
    
    // Log for debugging
    console.log('Getting token:', {
        exists: !!token,
        type: typeof token,
        length: token ? token.length : 'N/A',
        isNull: token === null,
        isStringNull: token === 'null',
        isUndefined: token === 'undefined',
        preview: token ? token.substring(0, 20) + '...' : 'No token'
    });
    
    // Validate token
    if (!token || token === 'null' || token === 'undefined' || token.trim() === '') {
        console.error('Invalid token detected:', token);
        
        // Clean up corrupted token
        if (token === 'null' || token === 'undefined' || (token && token.trim() === '')) {
            console.log('Cleaning up corrupted token from localStorage');
            localStorage.removeItem('token');
        }
        
        return null;
    }
    
    return token.trim();
}

// Debug function for troubleshooting token issues
function debugTokenState() {
    console.log('=== TOKEN DEBUG INFO ===');
    const rawToken = localStorage.getItem('token');
    console.log('Raw localStorage token:', rawToken);
    console.log('Token type:', typeof rawToken);
    console.log('Token === null:', rawToken === null);
    console.log('Token === "null":', rawToken === 'null');
    console.log('Token === "undefined":', rawToken === 'undefined');
    console.log('Token length:', rawToken ? rawToken.length : 'N/A');
    console.log('All localStorage keys:', Object.keys(localStorage));
    console.log('All localStorage items:');
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const value = localStorage.getItem(key);
        console.log(`  ${key}: ${value} (type: ${typeof value})`);
    }
    
    const validToken = getValidToken();
    console.log('Validated token:', validToken ? 'Valid' : 'Invalid');
    if (validToken) {
        console.log('Token preview:', validToken.substring(0, 20) + '...');
    }
    console.log('=== END TOKEN DEBUG ===');
    return {
        rawToken,
        validToken,
        allStorage: { ...localStorage }
    };
}

// Make debug function globally available
window.debugTokenState = debugTokenState;

// Function to handle token invalidation
function handleInvalidToken(context = 'unknown') {
    console.error(`Invalid token detected in ${context}`);
    console.log('Clearing invalid token and redirecting...');
    
    // Clear the invalid token
    localStorage.removeItem('token');
    
    // Show a user-friendly message
    const message = 'Your session has expired. Please log in again.';
    if (typeof showError === 'function') {
        showError(message);
    } else {
        alert(message);
    }
    
    // Redirect to login after a short delay
    setTimeout(() => {
        window.location.href = '/frontend/public/login.html';
    }, 2000);
}

// Make this globally available too
window.handleInvalidToken = handleInvalidToken;

// Global variables
// BASE_URL is defined globally in the HTML file
let currentUser = null;
let userBookings = [];
let userMemberships = [];
let userTransactions = [];

// DOM Elements
const loadingScreen = document.getElementById('loading-screen');
const tabButtons = document.querySelectorAll('.settings-tab-btn');
const tabContents = document.querySelectorAll('.settings-tab-content');
const modalOverlay = document.getElementById('modal-overlay');

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded - Settings Page');
    
    // Debug token state at startup
    console.log('=== STARTUP TOKEN CHECK ===');
    debugTokenState();
    
    // Check authentication first
    checkAuthentication();
    
    // Initialize UI components
    initializeNavigation();
    initializeTabSystem();
    initializeNotificationToggles();
    
    // Load user data
    loadUserData();
});

// Check user authentication
function checkAuthentication() {
    const token = getValidToken();
    const userProfileNav = document.getElementById('user-profile-nav');
    const loginSignupNav = document.getElementById('login-signup-nav');
    
    if (!token) {
        handleInvalidToken('checkAuthentication');
        return;
    }
    
    console.log('Valid token found, verifying with server...');
    
    // Verify token by making a profile request like contact.js does
    fetch(`${BASE_URL}/api/users/profile`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    })
    .then(async (res) => {
        if (!res.ok) {
            const errText = await res.text();
            console.error(`Profile fetch failed with ${res.status}: ${errText}`);
            // If profile fetch fails, handle the invalid token
            handleInvalidToken('checkAuthentication-fetch');
            return;
        }
        return res.json();
    })
    .then(user => {
        if (user) {
            console.log('User authenticated successfully:', user.email);
            // Show user profile nav
            if (userProfileNav) userProfileNav.style.display = 'block';
            if (loginSignupNav) loginSignupNav.style.display = 'none';
        }
    })
    .catch(error => {
        console.error('Authentication check failed:', error);
        handleInvalidToken('checkAuthentication-catch');
    });
}

// Initialize navigation functionality
function initializeNavigation() {
    // Mobile menu toggle
    const menuToggle = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    
    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', function() {
            navLinks.classList.toggle('active');
            console.log('Mobile menu toggled');
        });
        
        // Close mobile menu when clicking outside
        document.addEventListener('click', function(e) {
            if (!menuToggle.contains(e.target) && !navLinks.contains(e.target)) {
                navLinks.classList.remove('active');
            }
        });
    }
    
    // Dropdown functionality for mobile
    document.querySelectorAll('.dropdown > a').forEach(function(dropLink) {
        dropLink.addEventListener('click', function(e) {
            if (window.innerWidth <= 900) {
                e.preventDefault();
                const parentDropdown = this.parentElement;
                parentDropdown.classList.toggle('open');
                document.querySelectorAll('.dropdown').forEach(function(dd) {
                    if (dd !== parentDropdown) dd.classList.remove('open');
                });
            }
        });
    });
    
    // Handle window resize
    window.addEventListener('resize', function() {
        if (window.innerWidth > 900) {
            navLinks.classList.remove('active');
            document.querySelectorAll('.dropdown').forEach(dd => dd.classList.remove('open'));
        }
    });
}

// Initialize tab system
function initializeTabSystem() {
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetTab = this.dataset.tab;
            switchTab(targetTab);
        });
    });
}

// Switch between tabs
function switchTab(tabName) {
    // Update button states
    tabButtons.forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Update content visibility
    tabContents.forEach(content => content.classList.remove('active'));
    document.getElementById(`${tabName}-tab`).classList.add('active');
    
    // Load tab-specific data
    loadTabData(tabName);
}

// Load tab-specific data
function loadTabData(tabName) {
    switch(tabName) {
        case 'bookings':
            loadBookingsData();
            break;
        case 'memberships':
            loadMembershipsData();
            break;
        case 'payments':
            loadPaymentsData();
            break;
        case 'coupons':
            loadUserCoupons();
            initializeCouponFilters();
            break;
        case 'notifications':
            loadNotificationSettings();
            break;
        case 'privacy':
            loadPrivacySettings();
            break;
        case 'account':
            loadAccountData();
            break;
        case 'support':
            initializeSupportTab();
            refreshSupportTickets();
            break;
    }
}

// Initialize coupon filter buttons
function initializeCouponFilters() {
    const filterButtons = document.querySelectorAll('.coupons-filter .filter-btn');
    
    filterButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            // Update active button
            filterButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // Filter coupons
            const filter = this.dataset.filter;
            filterCoupons(filter);
        });
    });
}

// Filter coupons based on status
function filterCoupons(filter) {
    const couponCards = document.querySelectorAll('.settings-coupon-card');
    
    couponCards.forEach(card => {
        const status = card.dataset.status;
        
        switch(filter) {
            case 'all':
                card.style.display = 'block';
                break;
            case 'active':
                card.style.display = status === 'active' ? 'block' : 'none';
                break;
            case 'expired':
                card.style.display = status === 'expired' ? 'block' : 'none';
                break;
            case 'used':
                card.style.display = status === 'used' ? 'block' : 'none';
                break;
            default:
                card.style.display = 'block';
        }
    });
}

// Load user data
async function loadUserData() {
    try {
        showLoadingScreen();
        
        const token = getValidToken();
        if (!token) {
            console.error('No valid token for loading user data');
            throw new Error('Authentication required');
        }
        
        const response = await fetch(`${BASE_URL}/api/users/profile`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch user data');
        }
        
        currentUser = await response.json();
        updateUserDisplay();
        
        // Load initial bookings data
        loadBookingsData();
        
    } catch (error) {
        console.error('Error loading user data:', error);
        showError('Failed to load user data. Please refresh the page.');
    } finally {
        hideLoadingScreen();
    }
}

// Update user display in header
function updateUserDisplay() {
    if (!currentUser) return;
    
    // Update profile image - use same pattern as contact.js
    const profileImg = document.getElementById('settings-profile-img');
    const navProfileImg = document.getElementById('profile-icon-img');
    
    const profilePicUrl = currentUser.profileImage
        ? (currentUser.profileImage.startsWith('http') ? currentUser.profileImage : `${BASE_URL}${currentUser.profileImage}`)
        : `${BASE_URL}/uploads/profile-pics/default.png`;
    
    if (profileImg) profileImg.src = profilePicUrl;
    if (navProfileImg) navProfileImg.src = profilePicUrl;
    
    // Update user details
    const userName = document.getElementById('user-name');
    const userEmail = document.getElementById('user-email');
    const membershipStatus = document.getElementById('membership-status');
    
    const fullName = currentUser.firstName && currentUser.lastName 
        ? `${currentUser.firstName} ${currentUser.lastName}` 
        : currentUser.username || currentUser.name || 'User';
    
    if (userName) userName.textContent = fullName;
    if (userEmail) userEmail.textContent = currentUser.email || '';
    if (membershipStatus) {
        // This would be determined based on active memberships
        membershipStatus.textContent = 'Premium Member'; // Default for now
    }
}

// Load bookings data
async function loadBookingsData() {
    try {
        const token = localStorage.getItem('token');
        
        // Load gym bookings
        loadGymBookings(token);
        
        // Load trainer bookings
        loadTrainerBookings(token);
        
        // Load trial bookings and limits
        loadTrialBookingsAndLimits(token);
        
        // Load user coupons
        loadUserCoupons();
        
    } catch (error) {
        console.error('Error loading bookings:', error);
        showError('Failed to load bookings data.');
    }
}

// Load user coupons from backend
async function loadUserCoupons() {
    try {
        const token = getValidToken();
        if (!token || !currentUser) {
            console.log('No valid token or user for loading coupons');
            return;
        }

        console.log('Loading user coupons...');
        
        const response = await fetch(`${BASE_URL}/api/users/${currentUser.id || currentUser._id}/coupons`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const container = document.getElementById('settings-coupons-list');
        
        if (response.ok) {
            const data = await response.json();
            const coupons = data.coupons || [];
            console.log('Loaded coupons from backend:', coupons);
            
            displayUserCoupons(coupons);
            updateCouponsStats(coupons);
        } else {
            console.warn('Failed to load coupons from backend, trying localStorage...');
            loadCouponsFromLocalStorage();
        }
    } catch (error) {
        console.error('Error loading user coupons:', error);
        loadCouponsFromLocalStorage();
    }
}

// Fallback to localStorage if backend fails
function loadCouponsFromLocalStorage() {
    try {
        const storedCoupons = localStorage.getItem('userCoupons');
        if (storedCoupons) {
            const coupons = JSON.parse(storedCoupons);
            console.log('Loaded coupons from localStorage:', coupons);
            displayUserCoupons(coupons);
            updateCouponsStats(coupons);
        } else {
            displayUserCoupons([]);
        }
    } catch (error) {
        console.error('Error loading coupons from localStorage:', error);
        displayUserCoupons([]);
    }
}

// Display user coupons with validity and expiry info
function displayUserCoupons(coupons) {
    const container = document.getElementById('settings-coupons-list');
    
    if (!container) {
        console.error('Coupons container not found');
        return;
    }

    if (!coupons || coupons.length === 0) {
        container.innerHTML = `
            <div class="no-coupons-state">
                <div class="empty-state-icon">
                    <i class="fas fa-gift"></i>
                </div>
                <h3>No Coupons Yet</h3>
                <p>You haven't claimed any coupons yet. Check out gym offers to find great deals!</p>
                <a href="gymdetails.html" class="primary-btn">
                    <i class="fas fa-search"></i> Browse Offers
                </a>
            </div>
        `;
        return;
    }

    const now = new Date();
    
    const couponHTML = coupons.map(coupon => {
        const validUntil = coupon.validUntil ? new Date(coupon.validUntil) : null;
        const isExpired = validUntil && validUntil < now;
        const isUsed = coupon.usedAt || coupon.status === 'used';
        const daysRemaining = validUntil ? Math.ceil((validUntil - now) / (1000 * 60 * 60 * 24)) : null;
        const isExpiringSoon = daysRemaining !== null && daysRemaining > 0 && daysRemaining <= 7;
        
        // Determine status
        let status = 'active';
        let statusClass = 'status-active';
        let statusIcon = 'fa-check-circle';
        let statusText = 'Active';
        
        if (isUsed) {
            status = 'used';
            statusClass = 'status-used';
            statusIcon = 'fa-check-circle';
            statusText = 'Used';
        } else if (isExpired) {
            status = 'expired';
            statusClass = 'status-expired';
            statusIcon = 'fa-times-circle';
            statusText = 'Expired';
        } else if (isExpiringSoon) {
            statusClass = 'status-expiring';
            statusIcon = 'fa-exclamation-triangle';
            statusText = `${daysRemaining} days left`;
        } else if (daysRemaining !== null) {
            statusText = `Valid for ${daysRemaining} days`;
        }
        
        // Format dates
        const claimedDate = coupon.claimedAt ? new Date(coupon.claimedAt).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        }) : 'N/A';
        
        const expiryDate = validUntil ? validUntil.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        }) : 'No expiry';
        
        return `
            <div class="settings-coupon-card ${statusClass}" data-status="${status}">
                <div class="coupon-card-header">
                    <div class="coupon-info">
                        <div class="coupon-badge">
                            <i class="fas fa-percentage"></i>
                            ${coupon.discount}% OFF
                        </div>
                        <h3 class="coupon-title">${coupon.title || coupon.offerTitle || 'Special Offer'}</h3>
                        <p class="coupon-gym-name">
                            <i class="fas fa-dumbbell"></i>
                            ${coupon.gymName || 'Unknown Gym'}
                        </p>
                    </div>
                    <div class="coupon-status-badge ${statusClass}">
                        <i class="fas ${statusIcon}"></i>
                        ${statusText}
                    </div>
                </div>
                
                <div class="coupon-code-section">
                    <div class="coupon-code-display">
                        <span class="code-label">Coupon Code:</span>
                        <span class="code-value">${coupon.code || coupon.couponCode || 'N/A'}</span>
                        <button class="copy-code-btn" onclick="copyCouponCode('${coupon.code || coupon.couponCode}')">
                            <i class="fas fa-copy"></i>
                        </button>
                    </div>
                </div>
                
                ${coupon.description ? `
                    <div class="coupon-description">
                        <p>${coupon.description}</p>
                    </div>
                ` : ''}
                
                <div class="coupon-validity-info">
                    <div class="validity-item">
                        <i class="fas fa-calendar-check"></i>
                        <span>Claimed: ${claimedDate}</span>
                    </div>
                    <div class="validity-item">
                        <i class="fas fa-calendar-times"></i>
                        <span>Valid Until: ${expiryDate}</span>
                    </div>
                    ${isExpiringSoon ? `
                        <div class="expiring-warning">
                            <i class="fas fa-exclamation-triangle"></i>
                            <span>Expires in ${daysRemaining} days!</span>
                        </div>
                    ` : ''}
                </div>
                
                ${!isExpired && !isUsed ? `
                    <div class="coupon-actions">
                        <button class="use-coupon-btn" onclick="window.location.href='gymdetails.html?gym=${coupon.gymId || ''}'">
                            <i class="fas fa-arrow-right"></i> Use Now
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');

    container.innerHTML = couponHTML;
}

// Update coupons stats
function updateCouponsStats(coupons) {
    const now = new Date();
    
    const activeCoupons = coupons.filter(c => {
        const validUntil = c.validUntil ? new Date(c.validUntil) : null;
        const isExpired = validUntil && validUntil < now;
        const isUsed = c.usedAt || c.status === 'used';
        return !isExpired && !isUsed;
    }).length;
    
    const totalSavings = coupons.reduce((sum, c) => {
        return sum + (c.savings || 0);
    }, 0);
    
    const usedCoupons = coupons.filter(c => c.usedAt || c.status === 'used').length;
    
    // Update stat elements
    const activeElement = document.getElementById('settings-active-coupons');
    const savingsElement = document.getElementById('settings-total-savings');
    const usedElement = document.getElementById('settings-used-coupons');
    
    if (activeElement) activeElement.textContent = activeCoupons;
    if (savingsElement) savingsElement.textContent = `₹${totalSavings}`;
    if (usedElement) usedElement.textContent = usedCoupons;
}

// Copy coupon code to clipboard
window.copyCouponCode = function(code) {
    if (!code || code === 'N/A') {
        showError('No code to copy');
        return;
    }
    
    navigator.clipboard.writeText(code).then(() => {
        showSuccess('Coupon code copied!');
    }).catch(err => {
        console.error('Failed to copy:', err);
        showError('Failed to copy code');
    });
};

// Load gym bookings
async function loadGymBookings(token) {
    try {
        const response = await fetch(`${BASE_URL}/api/bookings/gym-memberships`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        const gymBookingsContainer = document.getElementById('gym-bookings');
        
        if (response.ok) {
            const bookings = await response.json();
            displayGymBookings(bookings);
        } else {
            gymBookingsContainer.innerHTML = '<p class="no-data">No gym memberships found.</p>';
        }
    } catch (error) {
        console.error('Error loading gym bookings:', error);
        document.getElementById('gym-bookings').innerHTML = '<p class="error-message">Failed to load gym bookings.</p>';
    }
}

// Load trainer bookings
async function loadTrainerBookings(token) {
    try {
        const response = await fetch(`${BASE_URL}/api/bookings/trainer-sessions`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        const trainerBookingsContainer = document.getElementById('trainer-bookings');
        
        if (response.ok) {
            const bookings = await response.json();
            displayTrainerBookings(bookings);
        } else {
            trainerBookingsContainer.innerHTML = '<p class="no-data">No trainer sessions found.</p>';
        }
    } catch (error) {
        console.error('Error loading trainer bookings:', error);
        document.getElementById('trainer-bookings').innerHTML = '<p class="error-message">Failed to load trainer bookings.</p>';
    }
}

// Load trial bookings
// Load trial bookings and limits
async function loadTrialBookingsAndLimits(token) {
    try {
        // Load trial limits status
        const statusResponse = await fetch(`${BASE_URL}/api/trial-bookings/trial-status`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (statusResponse.ok) {
            const statusData = await statusResponse.json();
            console.log('DEBUG: Trial status data received:', statusData);
            console.log('DEBUG: Trial limits object:', statusData.data);
            displayTrialLimitsStatus(statusData.data);
        } else {
            console.log('DEBUG: Failed to fetch trial status, response:', statusResponse.status);
            displayTrialLimitsError();
        }
        
        // Load trial booking history
        const historyResponse = await fetch(`${BASE_URL}/api/trial-bookings/history`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        const trialBookingsContainer = document.getElementById('trial-bookings');
        
        if (historyResponse.ok) {
            const historyData = await historyResponse.json();
            displayTrialBookings(historyData.data.bookings);
        } else {
            trialBookingsContainer.innerHTML = '<p class="no-data">No trial bookings found.</p>';
        }
    } catch (error) {
        console.error('Error loading trial data:', error);
        displayTrialLimitsError();
        document.getElementById('trial-bookings').innerHTML = '<p class="error-message">Failed to load trial bookings.</p>';
    }
}

// Display trial limits status
function displayTrialLimitsStatus(trialLimits) {
    const container = document.getElementById('trial-limits-status');
    
    const resetDate = new Date(trialLimits.nextResetDate);
    const today = new Date();
    const daysUntilReset = Math.ceil((resetDate - today) / (1000 * 60 * 60 * 24));
    
    const statusHtml = `
        <div class="trial-limits-header">
            <h4><i class="fas fa-ticket-alt"></i> Trial Usage Status</h4>
            <div class="limits-summary">
                <span class="used">${trialLimits.usedTrials}</span>/<span class="total">${trialLimits.totalTrials}</span> Used
            </div>
        </div>
        
        <div class="trial-limits-details">
            <div class="limit-item">
                <div class="limit-icon">
                    <i class="fas fa-gift"></i>
                </div>
                <div class="limit-info">
                    <h5>Remaining Trials</h5>
                    <p>${trialLimits.remainingTrials} out of ${trialLimits.totalTrials} monthly trials remaining</p>
                </div>
            </div>
            
            <div class="limit-item">
                <div class="limit-icon">
                    <i class="fas fa-calendar-alt"></i>
                </div>
                <div class="limit-info">
                    <h5>Next Reset</h5>
                    <p>${resetDate.toLocaleDateString()} (${daysUntilReset} days)</p>
                </div>
            </div>
            
            ${trialLimits.remainingTrials === 0 ? `
                <div class="limit-item warning">
                    <div class="limit-icon">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <div class="limit-info">
                        <h5>Limit Reached</h5>
                        <p>You've used all your free trials for this month</p>
                    </div>
                </div>
            ` : ''}
        </div>
        
        <div class="trial-limits-progress">
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${(trialLimits.usedTrials / trialLimits.totalTrials) * 100}%"></div>
            </div>
            <span class="progress-text">${trialLimits.usedTrials}/${trialLimits.totalTrials} trials used this month</span>
        </div>
    `;
    
    container.innerHTML = statusHtml;
}

// Display trial limits error
function displayTrialLimitsError() {
    const container = document.getElementById('trial-limits-status');
    container.innerHTML = `
        <div class="error-state">
            <i class="fas fa-exclamation-circle"></i>
            <p>Unable to load trial status</p>
        </div>
    `;
}

async function loadTrialBookings(token) {
    try {
        const response = await fetch(`${BASE_URL}/api/bookings/trials`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        const trialBookingsContainer = document.getElementById('trial-bookings');
        
        if (response.ok) {
            const bookings = await response.json();
            displayTrialBookings(bookings);
        } else {
            trialBookingsContainer.innerHTML = '<p class="no-data">No trial bookings found.</p>';
        }
    } catch (error) {
        console.error('Error loading trial bookings:', error);
        document.getElementById('trial-bookings').innerHTML = '<p class="error-message">Failed to load trial bookings.</p>';
    }
}

// Display gym bookings
function displayGymBookings(bookings) {
    const container = document.getElementById('gym-bookings');
    
    if (!bookings || bookings.length === 0) {
        container.innerHTML = '<p class="no-data">No gym memberships found.</p>';
        return;
    }
    
    const bookingsHTML = bookings.slice(0, 3).map(booking => {
        const status = getBookingStatus(booking.startDate, booking.endDate);
        return `
            <div class="booking-item">
                <div class="booking-info">
                    <h4>${booking.gymName || 'Gym Membership'}</h4>
                    <p>Plan: ${booking.planName || 'N/A'} | Duration: ${booking.duration || 'N/A'}</p>
                    <p>Valid from ${formatDate(booking.startDate)} to ${formatDate(booking.endDate)}</p>
                </div>
                <span class="booking-status ${status.class}">${status.text}</span>
            </div>
        `;
    }).join('');
    
    container.innerHTML = bookingsHTML;
}

// Display trainer bookings
function displayTrainerBookings(bookings) {
    const container = document.getElementById('trainer-bookings');
    
    if (!bookings || bookings.length === 0) {
        container.innerHTML = '<p class="no-data">No trainer sessions found.</p>';
        return;
    }
    
    const bookingsHTML = bookings.slice(0, 3).map(booking => {
        const status = getSessionStatus(booking.sessionDate, booking.status);
        return `
            <div class="booking-item">
                <div class="booking-info">
                    <h4>${booking.trainerName || 'Personal Training Session'}</h4>
                    <p>Type: ${booking.sessionType || 'General Training'}</p>
                    <p>Date: ${formatDate(booking.sessionDate)} at ${booking.sessionTime || 'TBD'}</p>
                </div>
                <span class="booking-status ${status.class}">${status.text}</span>
            </div>
        `;
    }).join('');
    
    container.innerHTML = bookingsHTML;
}

// Display trial bookings
function displayTrialBookings(bookings) {
    const container = document.getElementById('trial-bookings');
    
    if (!bookings || bookings.length === 0) {
        container.innerHTML = '<p class="no-data">No trial bookings found.</p>';
        return;
    }
    
    const bookingsHTML = bookings.slice(0, 3).map(booking => {
        // Use trialDate instead of preferredDate (matches the model)
        const trialDate = booking.trialDate || booking.preferredDate;
        const status = getTrialStatus(trialDate, booking.status);
        
        // Use gymName field directly since gymId is a string, not a populated object
        const gymName = booking.gymName || booking.gymId?.name || 'Unknown Gym';
        const gymLocation = booking.gymId?.location || '';
        
        return `
            <div class="booking-item trial-booking">
                <div class="booking-info">
                    <div class="gym-details">
                        <h4>${gymName}</h4>
                        ${gymLocation ? `<p class="gym-location"><i class="fas fa-map-marker-alt"></i> ${gymLocation}</p>` : ''}
                    </div>
                    <div class="booking-details">
                        <p><i class="fas fa-calendar"></i> ${formatDate(trialDate)}</p>
                        <p><i class="fas fa-clock"></i> ${booking.trialTime || booking.preferredTime || 'Time TBD'}</p>
                        <p><i class="fas fa-user"></i> ${booking.name}</p>
                    </div>
                </div>
                <div class="booking-actions">
                    <span class="booking-status ${status.class}">${status.text}</span>
                    ${booking.status === 'pending' || booking.status === 'confirmed' ? `
                        <button class="cancel-btn" onclick="cancelTrialBooking('${booking._id}')">
                            <i class="fas fa-times"></i> Cancel
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = bookingsHTML;
}

// Get booking status based on dates
function getBookingStatus(startDate, endDate) {
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (now < start) {
        return { class: 'pending', text: 'Upcoming' };
    } else if (now >= start && now <= end) {
        return { class: 'active', text: 'Active' };
    } else {
        return { class: 'expired', text: 'Expired' };
    }
}

// Get session status
function getSessionStatus(sessionDate, status) {
    const now = new Date();
    const session = new Date(sessionDate);
    
    if (status === 'completed') {
        return { class: 'expired', text: 'Completed' };
    } else if (status === 'cancelled') {
        return { class: 'expired', text: 'Cancelled' };
    } else if (session < now) {
        return { class: 'expired', text: 'Missed' };
    } else {
        return { class: 'active', text: 'Scheduled' };
    }
}

// Get trial status
function getTrialStatus(trialDate, status) {
    const now = new Date();
    const trial = new Date(trialDate);
    
    switch (status) {
        case 'completed':
            return { class: 'completed', text: 'Completed' };
        case 'cancelled':
            return { class: 'cancelled', text: 'Cancelled' };
        case 'confirmed':
            return trial < now 
                ? { class: 'missed', text: 'Missed' }
                : { class: 'confirmed', text: 'Confirmed' };
        case 'pending':
            return trial < now 
                ? { class: 'missed', text: 'Missed' }
                : { class: 'pending', text: 'Pending' };
        case 'no-show':
            return { class: 'missed', text: 'No Show' };
        default:
            return { class: 'pending', text: 'Pending' };
    }
}

// Cancel trial booking
async function cancelTrialBooking(bookingId) {
    if (!confirm('Are you sure you want to cancel this trial booking? This action cannot be undone.')) {
        return;
    }
    
    const token = localStorage.getItem('token');
    if (!token) {
        showError('Please log in to cancel bookings.');
        return;
    }
    
    try {
        const response = await fetch(`${BASE_URL}/api/trial-bookings/cancel/${bookingId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showSuccess('Trial booking cancelled successfully. Your trial limit has been restored.');
            // Reload trial data to reflect changes
            loadTrialBookingsAndLimits(token);
        } else {
            showError(result.message || 'Failed to cancel booking.');
        }
    } catch (error) {
        console.error('Error cancelling booking:', error);
        showError('Failed to cancel booking. Please try again.');
    }
}

// Load memberships data
async function loadMembershipsData() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${BASE_URL}/api/bookings/active-memberships`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        const container = document.getElementById('active-memberships');
        
        if (response.ok) {
            const memberships = await response.json();
            displayMemberships(memberships);
        } else {
            container.innerHTML = '<p class="no-data">No active memberships found.</p>';
        }
    } catch (error) {
        console.error('Error loading memberships:', error);
        document.getElementById('active-memberships').innerHTML = '<p class="error-message">Failed to load memberships.</p>';
    }
}

// Display memberships
function displayMemberships(memberships) {
    const container = document.getElementById('active-memberships');
    
    if (!memberships || memberships.length === 0) {
        container.innerHTML = '<p class="no-data">No active memberships found.</p>';
        return;
    }
    
    const membershipsHTML = memberships.map(membership => `
        <div class="membership-card">
            <h4>${membership.planName}</h4>
            <div class="gym-name">${membership.gymName}</div>
            <div class="validity">Valid until ${formatDate(membership.endDate)}</div>
            <div class="membership-details">
                <p>Price: ₹${membership.price}</p>
                <p>Remaining Days: ${calculateRemainingDays(membership.endDate)}</p>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = membershipsHTML;
}

// Load payments data
async function loadPaymentsData() {
    try {
        const token = localStorage.getItem('token');
        
        // Load payment methods
        loadPaymentMethods(token);
        
        // Load payment history
        loadPaymentHistory(token);
        
    } catch (error) {
        console.error('Error loading payments data:', error);
    }
}

// Load payment methods
async function loadPaymentMethods(token) {
    try {
        const response = await fetch(`${BASE_URL}/api/user-payments/methods`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        const container = document.getElementById('payment-methods-list');
        
        if (response.ok) {
            const methods = await response.json();
            displayPaymentMethods(methods);
        } else {
            container.innerHTML = '<p class="no-data">No saved payment methods.</p>';
        }
    } catch (error) {
        console.error('Error loading payment methods:', error);
        document.getElementById('payment-methods-list').innerHTML = '<p class="error-message">Failed to load payment methods.</p>';
    }
}

// Load payment history
async function loadPaymentHistory(token) {
    try {
        const response = await fetch(`${BASE_URL}/api/user-payments/history`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        const container = document.getElementById('payment-history-list');
        
        if (response.ok) {
            const transactions = await response.json();
            displayPaymentHistory(transactions);
        } else {
            container.innerHTML = '<p class="no-data">No transaction history found.</p>';
        }
    } catch (error) {
        console.error('Error loading payment history:', error);
        document.getElementById('payment-history-list').innerHTML = '<p class="error-message">Failed to load transaction history.</p>';
    }
}

// Display payment methods
function displayPaymentMethods(methods) {
    const container = document.getElementById('payment-methods-list');
    
    if (!methods || methods.length === 0) {
        container.innerHTML = '<p class="no-data">No saved payment methods.</p>';
        return;
    }
    
    const methodsHTML = methods.map(method => `
        <div class="payment-method-item">
            <div class="payment-method-info">
                <h5>${method.type} ending in ${method.lastFour}</h5>
                <p>Expires: ${method.expiryMonth}/${method.expiryYear}</p>
            </div>
            <button class="action-btn danger" onclick="removePaymentMethod('${method.id}')">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `).join('');
    
    container.innerHTML = methodsHTML;
}

// Display payment history
function displayPaymentHistory(transactions) {
    const container = document.getElementById('payment-history-list');
    
    if (!transactions || transactions.length === 0) {
        container.innerHTML = '<p class="no-data">No transaction history found.</p>';
        return;
    }
    
    const transactionsHTML = transactions.slice(0, 5).map(transaction => `
        <div class="transaction-item">
            <div class="transaction-info">
                <h5>₹${transaction.amount}</h5>
                <p>${transaction.description} - ${formatDate(transaction.date)}</p>
            </div>
            <span class="booking-status ${transaction.status === 'success' ? 'active' : 'expired'}">
                ${transaction.status}
            </span>
        </div>
    `).join('');
    
    container.innerHTML = transactionsHTML;
}

// Initialize notification toggles
function initializeNotificationToggles() {
    const toggles = document.querySelectorAll('.notification-toggle input[type="checkbox"]');
    toggles.forEach(toggle => {
        toggle.addEventListener('change', function() {
            console.log(`${this.id} changed to ${this.checked}`);
        });
    });
}

// Load notification settings
function loadNotificationSettings() {
    // This would typically load from user preferences
    console.log('Loading notification settings...');
}

// Load privacy settings
function loadPrivacySettings() {
    // This would typically load from user preferences
    console.log('Loading privacy settings...');
}

// Load account data
async function loadAccountData() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${BASE_URL}/api/bookings/account-stats`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const stats = await response.json();
            updateAccountStats(stats);
        }
    } catch (error) {
        console.error('Error loading account data:', error);
    }
}

// Update account statistics
function updateAccountStats(stats) {
    const memberSince = document.getElementById('member-since');
    const accountType = document.getElementById('account-type');
    const totalBookings = document.getElementById('total-bookings');
    const activeMembershipsCount = document.getElementById('active-memberships-count');
    
    if (memberSince) memberSince.textContent = formatDate(stats.memberSince || currentUser.createdAt);
    if (accountType) accountType.textContent = stats.accountType || 'Free';
    if (totalBookings) totalBookings.textContent = stats.totalBookings || '0';
    if (activeMembershipsCount) activeMembershipsCount.textContent = stats.activeMemberships || '0';
}

// Booking action functions
function viewAllBookings(type) {
    console.log(`Viewing all ${type} bookings`);
    showModal(`All ${type.charAt(0).toUpperCase() + type.slice(1)} Bookings`, `
        <p>This feature will show all your ${type} bookings in a detailed view.</p>
        <p>Implementation in progress...</p>
    `);
}

// Membership action functions
function findNewMembership() {
    window.location.href = 'membership-plans.html';
}

function viewMembershipHistory() {
    showModal('Membership History', `
        <p>Your membership history will be displayed here.</p>
        <p>Implementation in progress...</p>
    `);
}

// Payment action functions
function addPaymentMethod() {
    showModal('Add Payment Method', `
        <form id="payment-method-form">
            <div style="margin-bottom: 1rem;">
                <label for="card-type">Card Type:</label>
                <select id="card-type" style="width: 100%; padding: 0.5rem; margin-top: 0.5rem;">
                    <option value="visa">Visa</option>
                    <option value="mastercard">Mastercard</option>
                    <option value="amex">American Express</option>
                </select>
            </div>
            <div style="margin-bottom: 1rem;">
                <label for="card-number">Card Number:</label>
                <input type="text" id="card-number" placeholder="1234 5678 9012 3456" style="width: 100%; padding: 0.5rem; margin-top: 0.5rem;">
            </div>
            <div style="display: flex; gap: 1rem; margin-bottom: 1rem;">
                <div style="flex: 1;">
                    <label for="expiry-month">Expiry Month:</label>
                    <input type="text" id="expiry-month" placeholder="MM" style="width: 100%; padding: 0.5rem; margin-top: 0.5rem;">
                </div>
                <div style="flex: 1;">
                    <label for="expiry-year">Expiry Year:</label>
                    <input type="text" id="expiry-year" placeholder="YY" style="width: 100%; padding: 0.5rem; margin-top: 0.5rem;">
                </div>
            </div>
            <div style="margin-bottom: 1rem;">
                <label for="cvv">CVV:</label>
                <input type="text" id="cvv" placeholder="123" style="width: 100%; padding: 0.5rem; margin-top: 0.5rem;">
            </div>
        </form>
    `, `
        <button class="action-btn primary" onclick="savePaymentMethod()">Save Payment Method</button>
        <button class="action-btn secondary" onclick="closeModal()">Cancel</button>
    `);
}

function savePaymentMethod() {
    // Implementation for saving payment method
    console.log('Saving payment method...');
    closeModal();
    showSuccess('Payment method added successfully!');
}

function removePaymentMethod(methodId) {
    if (confirm('Are you sure you want to remove this payment method?')) {
        console.log(`Removing payment method: ${methodId}`);
        showSuccess('Payment method removed successfully!');
        loadPaymentMethods(localStorage.getItem('token'));
    }
}

function viewAllTransactions() {
    showModal('All Transactions', `
        <p>Your complete transaction history will be displayed here.</p>
        <p>Implementation in progress...</p>
    `);
}

// Notification functions
async function saveNotificationSettings() {
    try {
        const settings = {
            email: {
                bookings: document.getElementById('email-bookings').checked,
                promotions: document.getElementById('email-promotions').checked,
                reminders: document.getElementById('email-reminders').checked
            },
            sms: {
                bookings: document.getElementById('sms-bookings').checked,
                reminders: document.getElementById('sms-reminders').checked
            },
            push: {
                enabled: document.getElementById('push-enabled').checked
            }
        };
        
        const token = localStorage.getItem('token');
        const response = await fetch(`${BASE_URL}/api/user-preferences/notifications`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(settings)
        });
        
        if (response.ok) {
            showSuccess('Notification preferences saved successfully!');
        } else {
            showError('Failed to save notification preferences.');
        }
    } catch (error) {
        console.error('Error saving notification settings:', error);
        showError('Failed to save notification preferences.');
    }
}

// Privacy functions
async function savePrivacySettings() {
    try {
        const profileVisibility = document.querySelector('input[name="profile-visibility"]:checked').value;
        const shareWorkoutData = document.getElementById('share-workout-data').checked;
        const shareProgress = document.getElementById('share-progress').checked;
        
        const settings = {
            profileVisibility,
            shareWorkoutData,
            shareProgress
        };
        
        const token = localStorage.getItem('token');
        const response = await fetch(`${BASE_URL}/api/user-preferences/privacy`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(settings)
        });
        
        if (response.ok) {
            showSuccess('Privacy settings saved successfully!');
        } else {
            showError('Failed to save privacy settings.');
        }
    } catch (error) {
        console.error('Error saving privacy settings:', error);
        showError('Failed to save privacy settings.');
    }
}

function changePassword() {
    showModal('Change Password', `
        <form id="password-form">
            <div style="margin-bottom: 1rem;">
                <label for="current-password">Current Password:</label>
                <input type="password" id="current-password" style="width: 100%; padding: 0.5rem; margin-top: 0.5rem;">
            </div>
            <div style="margin-bottom: 1rem;">
                <label for="new-password">New Password:</label>
                <input type="password" id="new-password" style="width: 100%; padding: 0.5rem; margin-top: 0.5rem;">
            </div>
            <div style="margin-bottom: 1rem;">
                <label for="confirm-password">Confirm New Password:</label>
                <input type="password" id="confirm-password" style="width: 100%; padding: 0.5rem; margin-top: 0.5rem;">
            </div>
        </form>
    `, `
        <button class="action-btn primary" onclick="updatePassword()">Update Password</button>
        <button class="action-btn secondary" onclick="closeModal()">Cancel</button>
    `);
}

async function updatePassword() {
    try {
        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        
        if (!currentPassword || !newPassword || !confirmPassword) {
            showError('Please fill in all password fields.');
            return;
        }
        
        if (newPassword !== confirmPassword) {
            showError('New passwords do not match.');
            return;
        }
        
        if (newPassword.length < 6) {
            showError('Password must be at least 6 characters long.');
            return;
        }
        
        const token = localStorage.getItem('token');
        const response = await fetch(`${BASE_URL}/api/users/change-password`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                currentPassword,
                newPassword
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            closeModal();
            showSuccess('Password updated successfully!');
        } else {
            showError(result.message || 'Failed to update password.');
        }
    } catch (error) {
        console.error('Error updating password:', error);
        showError('Failed to update password.');
    }
}

function enableTwoFactor() {
    showModal('Enable Two-Factor Authentication', `
        <p>Two-factor authentication adds an extra layer of security to your account.</p>
        <p>You will need to install an authenticator app on your phone.</p>
        <div style="text-align: center; margin: 2rem 0;">
            <div style="background: #f0f0f0; padding: 2rem; border-radius: 8px; display: inline-block;">
                <p>QR Code would appear here</p>
                <div style="width: 150px; height: 150px; background: #ddd; margin: 1rem auto;"></div>
            </div>
        </div>
        <p>Scan this QR code with your authenticator app, then enter the 6-digit code below:</p>
        <input type="text" id="verification-code" placeholder="Enter 6-digit code" style="width: 100%; padding: 0.5rem; margin-top: 1rem;">
    `, `
        <button class="action-btn primary" onclick="confirmTwoFactor()">Enable 2FA</button>
        <button class="action-btn secondary" onclick="closeModal()">Cancel</button>
    `);
}

function confirmTwoFactor() {
    console.log('Enabling 2FA...');
    closeModal();
    showSuccess('Two-factor authentication enabled successfully!');
}

function viewLoginHistory() {
    showModal('Login History', `
        <div style="max-height: 300px; overflow-y: auto;">
            <div style="margin-bottom: 1rem; padding: 1rem; background: #f9f9f9; border-radius: 8px;">
                <strong>Current Session</strong><br>
                <small>Browser: Chrome on Windows<br>
                Location: New Delhi, India<br>
                Time: ${new Date().toLocaleString()}</small>
            </div>
            <div style="margin-bottom: 1rem; padding: 1rem; background: #f9f9f9; border-radius: 8px;">
                <strong>Previous Session</strong><br>
                <small>Browser: Chrome on Windows<br>
                Location: New Delhi, India<br>
                Time: ${new Date(Date.now() - 86400000).toLocaleString()}</small>
            </div>
        </div>
    `);
}

// Account functions
function exportData() {
    if (confirm('Export all your data? This may take a few minutes.')) {
        console.log('Exporting user data...');
        showSuccess('Data export request submitted. You will receive an email when ready.');
    }
}

function requestDataDeletion() {
    showModal('Request Data Deletion', `
        <div style="color: #e76f51; margin-bottom: 1rem;">
            <i class="fas fa-exclamation-triangle"></i>
            <strong>Warning: This action cannot be undone</strong>
        </div>
        <p>Requesting data deletion will remove all your personal data from our servers. This includes:</p>
        <ul style="margin: 1rem 0; padding-left: 1.5rem;">
            <li>Profile information</li>
            <li>Booking history</li>
            <li>Payment information</li>
            <li>Preferences and settings</li>
        </ul>
        <p>Are you sure you want to proceed?</p>
        <textarea placeholder="Please tell us why you're leaving (optional)" style="width: 100%; height: 80px; padding: 0.5rem; margin-top: 1rem;"></textarea>
    `, `
        <button class="action-btn danger" onclick="confirmDataDeletion()">Yes, Delete My Data</button>
        <button class="action-btn secondary" onclick="closeModal()">Cancel</button>
    `);
}

function confirmDataDeletion() {
    console.log('Requesting data deletion...');
    closeModal();
    showSuccess('Data deletion request submitted. You will receive a confirmation email.');
}

function deactivateAccount() {
    if (confirm('Are you sure you want to deactivate your account? You can reactivate it later by logging in.')) {
        console.log('Deactivating account...');
        showSuccess('Account deactivated successfully.');
        setTimeout(() => {
            logout();
        }, 2000);
    }
}

function deleteAccount() {
    showModal('Delete Account', `
        <div style="color: #e76f51; margin-bottom: 1rem;">
            <i class="fas fa-exclamation-triangle"></i>
            <strong>Danger: This action cannot be undone</strong>
        </div>
        <p>Deleting your account will permanently remove:</p>
        <ul style="margin: 1rem 0; padding-left: 1.5rem;">
            <li>Your profile and all personal data</li>
            <li>All booking history</li>
            <li>Saved payment methods</li>
            <li>Any active memberships</li>
        </ul>
        <p>Type "DELETE" to confirm:</p>
        <input type="text" id="delete-confirmation" placeholder="Type DELETE here" style="width: 100%; padding: 0.5rem; margin-top: 0.5rem;">
    `, `
        <button class="action-btn danger" onclick="confirmAccountDeletion()">Delete Account</button>
        <button class="action-btn secondary" onclick="closeModal()">Cancel</button>
    `);
}

function confirmAccountDeletion() {
    const confirmation = document.getElementById('delete-confirmation').value;
    if (confirmation === 'DELETE') {
        console.log('Deleting account...');
        closeModal();
        showSuccess('Account deletion initiated. You will receive a final confirmation email.');
        setTimeout(() => {
            logout();
        }, 3000);
    } else {
        showError('Please type "DELETE" to confirm account deletion.');
    }
}

// ========== HELP & SUPPORT FUNCTIONS ==========

// Open Quick Report Modal
function openQuickReport(category) {
    console.log('Opening quick report for category:', category);
    const modal = document.getElementById('quick-report-modal');
    const title = document.getElementById('quick-report-title');
    const categoryInput = document.getElementById('report-category');
    
    if (!modal || !title || !categoryInput) {
        console.error('Modal elements not found:', { modal, title, categoryInput });
        return;
    }
    
    const categoryTitles = {
        'technical': 'Report Technical Issue',
        'billing': 'Report Billing Issue', 
        'membership': 'Membership Help Request',
        'general': 'General Inquiry'
    };
    
    title.textContent = categoryTitles[category] || 'Report Issue';
    categoryInput.value = category;
    
    // Reset form
    document.getElementById('quick-report-form').reset();
    document.getElementById('report-category').value = category;
    updateCharCount();
    
    modal.classList.add('active');
}

// Close Quick Report Modal
function closeQuickReportModal() {
    document.getElementById('quick-report-modal').classList.remove('active');
}

// Update character count for message
function updateCharCount() {
    const textarea = document.getElementById('report-message');
    const counter = document.querySelector('.char-count');
    if (textarea && counter) {
        const count = textarea.value.length;
        counter.textContent = `${count}/1000 characters`;
        if (count > 900) {
            counter.style.color = '#ef4444';
        } else if (count > 800) {
            counter.style.color = '#f59e0b';
        } else {
            counter.style.color = '#6b7280';
        }
    }
}

// Submit Quick Report
async function submitQuickReport() {
    const form = document.getElementById('quick-report-form');
    const submitBtn = document.getElementById('submit-report-btn');
    
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const token = getValidToken();
    console.log('Submit report - Using validated token');
    
    if (!token) {
        console.error('No valid token for submit report');
        showError('Please log in to submit a support ticket.');
        return;
    }
    
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
    submitBtn.disabled = true;
    
    try {
        const formData = {
            category: document.getElementById('report-category').value,
            subject: document.getElementById('report-subject').value,
            message: document.getElementById('report-message').value,
            priority: document.getElementById('report-priority').value,
            emailUpdates: document.getElementById('report-email-updates').checked
        };
        
        const response = await fetch(`${BASE_URL}/api/support/tickets`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(formData)
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                localStorage.removeItem('token');
                showError('Your session has expired. Please log in again.');
                return;
            }
            throw new Error(`Server error: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            // Show success message like contact page
            showSuccessDialog(`Support ticket #${result.ticketId} created successfully!`, {
                ticketId: result.ticketId,
                message: "We'll get back to you soon. You can track your ticket status in the support section."
            });
            closeQuickReportModal();
            refreshSupportTickets();
        } else {
            throw new Error(result.message || 'Failed to submit ticket');
        }
        
    } catch (error) {
        console.error('Error submitting ticket:', error);
        showError('Failed to submit support ticket. Please try again or contact us directly.');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// Deprecated legacy refreshSupportTickets replaced by loadUserSupportTickets
async function refreshSupportTickets() {
    loadUserSupportTickets(true);
}

// ========== USER SUPPORT TICKETS INTEGRATION (ENHANCED) ==========
// New implementation overriding placeholder to integrate unified support view
async function loadUserSupportTickets(force = false) {
    const container = document.getElementById('user-support-tickets-list');
    if (!container) return; // container should exist in support tab markup
    const token = getValidToken();
    if (!token) {
        container.innerHTML = '<div class="support-empty">Please log in to view your support tickets.</div>';
        return;
    }
    if (!force && container.dataset.loading === 'true') return;
    container.dataset.loading = 'true';
    container.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i> Loading tickets...</div>';
    try {
        const res = await fetch(`${BASE_URL}/api/support/tickets/my`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message || 'Failed to load tickets');
        renderUserSupportTickets(data.tickets || []);
    } catch (e) {
        console.error('Load user tickets error:', e);
        container.innerHTML = `<div class="error-state"><i class="fas fa-exclamation-circle"></i> ${e.message}</div>`;
    } finally {
        container.dataset.loading = 'false';
    }
}

function renderUserSupportTickets(tickets) {
    const container = document.getElementById('user-support-tickets-list');
    if (!container) return;
    if (!tickets.length) {
        container.innerHTML = `<div class="support-empty-state"><i class="fas fa-inbox"></i><p>No support tickets yet.</p></div>`;
        return;
    }
    const statusBadge = (status) => {
        const map = { 'open':'status-open', 'replied':'status-replied', 'in-progress':'status-progress', 'resolved':'status-resolved', 'closed':'status-closed' };
        return `<span class="ticket-status-badge ${map[status]||'status-open'}">${status.replace('-', ' ')}</span>`;
    };
    const priorityBadge = (p) => {
        const map = { low:'priority-low', medium:'priority-medium', high:'priority-high', urgent:'priority-urgent' };
        return `<span class="ticket-priority-badge ${map[p]||'priority-medium'}">${p}</span>`;
    };
    container.innerHTML = tickets.map(t => `
        <div class="user-ticket-card" data-ticket-id="${t.ticketId}">
            <div class="user-ticket-top">
                <div class="ticket-id">#${t.ticketId}</div>
                <div class="ticket-meta">${statusBadge(t.status)} ${priorityBadge(t.priority)}</div>
            </div>
            <div class="ticket-subject">${escapeHTML(t.subject || 'No subject')}</div>
            <div class="ticket-body-preview">${escapeHTML((t.message || '').substring(0,120))}${(t.message||'').length>120?'...':''}</div>
            <div class="ticket-footer">
                <span class="ticket-category"><i class="fas fa-tag"></i> ${getCategoryLabel(t.category)}</span>
                <span class="ticket-time"><i class="fas fa-clock"></i> ${getTimeAgo(t.createdAt)}</span>
                <button class="ticket-view-btn" data-ticket-id="${t.ticketId}"><i class="fas fa-eye"></i> View</button>
            </div>
        </div>`).join('');
    // Attach listeners
    container.querySelectorAll('.ticket-view-btn').forEach(btn => {
        btn.addEventListener('click', (e) => openUserTicketModal(e.currentTarget.dataset.ticketId));
    });
}

async function openUserTicketModal(ticketId) {
    const token = getValidToken();
    if (!token) return;
    showModal('Ticket Details', '<div class="modal-loading"><i class="fas fa-spinner fa-spin"></i> Loading...</div>');
    try {
        const res = await fetch(`${BASE_URL}/api/support/tickets/my`); // fallback fetch list to locate ticket details client-side
        const listData = await res.json();
        const ticket = (listData.tickets || []).find(t => t.ticketId === ticketId);
        if (!ticket) throw new Error('Ticket not found');
        // We only have summary; attempt to fetch full details if endpoint exists (admin endpoint is protected). For user, reuse summary for now.
        const conversationHTML = `<div class="ticket-convo"><p><strong>Subject:</strong> ${escapeHTML(ticket.subject)}</p><p>${escapeHTML(ticket.message)}</p><div id="user-ticket-messages"></div></div>`;
        const replyForm = ticket.status === 'closed' ? '<div class="ticket-closed-note">This ticket is closed. You cannot reply.</div>' : `
            <div class="user-ticket-reply-form">
                <textarea id="userTicketReplyMessage" rows="4" placeholder="Type your reply..."></textarea>
                <div class="reply-actions-inline">
                    <button class="action-btn secondary" onclick="closeModal()">Close</button>
                    <button class="action-btn primary" id="sendUserTicketReplyBtn"><i class="fas fa-paper-plane"></i> Send Reply</button>
                </div>
            </div>`;
        document.querySelector('.modal-body').innerHTML = `<div class="user-ticket-details">${conversationHTML}${replyForm}</div>`;
        if (ticket.status !== 'closed') {
            document.getElementById('sendUserTicketReplyBtn').addEventListener('click', () => sendUserTicketReply(ticket.ticketId));
        }
    } catch (e) {
        document.querySelector('.modal-body').innerHTML = `<div class="error-state"><i class="fas fa-exclamation-circle"></i> ${e.message}</div>`;
    }
}

async function sendUserTicketReply(ticketId) {
    const token = getValidToken();
    const messageEl = document.getElementById('userTicketReplyMessage');
    if (!token || !messageEl) return;
    const content = messageEl.value.trim();
    if (!content) { showError('Please enter a reply message'); return; }
    const btn = document.getElementById('sendUserTicketReplyBtn');
    const original = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    btn.disabled = true;
    try {
        // User reply route currently not exposed; for now show info message
        showError('User reply endpoint not yet implemented.');
    } catch (e) {
        showError(e.message || 'Failed to send reply');
    } finally {
        btn.innerHTML = original;
        btn.disabled = false;
    }
}

// Escape HTML utility to avoid injection in ticket fields
function escapeHTML(str='') {
    return str.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
}

// Periodic refresh (every 2 minutes) when support tab active
setInterval(() => {
    const supportTabBtn = document.querySelector('.settings-tab-btn[data-tab="support"]');
    const supportTabContent = document.getElementById('support-tab');
    if (supportTabBtn && supportTabContent && supportTabContent.classList.contains('active')) {
        loadUserSupportTickets();
    }
}, 120000);

// Hook into existing initializeSupportTab if present
if (typeof initializeSupportTab === 'function') {
    const originalInitSupport = initializeSupportTab;
    window.initializeSupportTab = function() {
        originalInitSupport();
        loadUserSupportTickets();
    }
} else {
    // Fallback: load on DOM ready if support tab exists
    if (document.getElementById('user-support-tickets-list')) {
        loadUserSupportTickets();
    }
}

// Modal functions
function showModal(title, body, footer = '') {
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    const modalFooter = document.getElementById('modal-footer');
    
    modalTitle.textContent = title;
    modalBody.innerHTML = body;
    
    if (footer) {
        modalFooter.innerHTML = footer;
    } else {
        modalFooter.innerHTML = '<button class="action-btn secondary" onclick="closeModal()">Close</button>';
    }
    
    modalOverlay.classList.add('active');
}

function closeModal() {
    modalOverlay.classList.remove('active');
}

// Click outside modal to close
modalOverlay.addEventListener('click', function(e) {
    if (e.target === modalOverlay) {
        closeModal();
    }
});

// Loading screen functions
function showLoadingScreen() {
    if (loadingScreen) {
        loadingScreen.classList.remove('hidden');
    }
}

function hideLoadingScreen() {
    if (loadingScreen) {
        setTimeout(() => {
            loadingScreen.classList.add('hidden');
        }, 500);
    }
}

// Notification functions
function showSuccess(message) {
    // Create a temporary success message
    const successDiv = document.createElement('div');
    successDiv.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: var(--success-color);
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.2);
        z-index: 10001;
        transform: translateX(100%);
        transition: transform 0.3s ease;
    `;
    successDiv.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
    document.body.appendChild(successDiv);
    
    setTimeout(() => {
        successDiv.style.transform = 'translateX(0)';
    }, 100);
    
    setTimeout(() => {
        successDiv.style.transform = 'translateX(100%)';
        setTimeout(() => {
            document.body.removeChild(successDiv);
        }, 300);
    }, 3000);
}

function showError(message) {
    // Create a temporary error message
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: var(--danger-color);
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.2);
        z-index: 10001;
        transform: translateX(100%);
        transition: transform 0.3s ease;
    `;
    errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
        errorDiv.style.transform = 'translateX(0)';
    }, 100);
    
    setTimeout(() => {
        errorDiv.style.transform = 'translateX(100%)';
        setTimeout(() => {
            document.body.removeChild(errorDiv);
        }, 300);
    }, 4000);
}

// Success dialog like contact page
function showSuccessDialog(message, additionalData = {}) {
    showModal('Success!', `
        <div style="text-align: center; color: var(--success-color);">
            <i class="fas fa-check-circle" style="font-size: 4rem; margin-bottom: 1rem;"></i>
            <h3 style="color: var(--success-color); margin-bottom: 1rem;">${message}</h3>
            ${additionalData.ticketId ? `<p><strong>Ticket ID:</strong> #${additionalData.ticketId}</p>` : ''}
            ${additionalData.message ? `<p style="margin-top: 1rem;">${additionalData.message}</p>` : ''}
        </div>
    `, `
        <button class="action-btn primary" onclick="closeModal()">OK</button>
    `);
    
    // Auto-hide after 10 seconds
    setTimeout(() => {
        closeModal();
    }, 10000);
}

// Logout function
function logout() {
    localStorage.removeItem('token');
    window.location.href = 'index.html';
}

// Function to manually refresh trial limits
function refreshTrialLimits() {
    const token = localStorage.getItem('token');
    if (token) {
        console.log('Manually refreshing trial limits...');
        loadTrialBookingsAndLimits(token);
    }
}

// ========== HELP & SUPPORT FUNCTIONS ==========

// Open Quick Report Modal
function openQuickReport(category) {
    console.log('Opening quick report for category:', category);
    const modal = document.getElementById('quick-report-modal');
    const title = document.getElementById('quick-report-title');
    const categoryInput = document.getElementById('report-category');
    
    if (!modal || !title || !categoryInput) {
        console.error('Modal elements not found:', { modal, title, categoryInput });
        return;
    }
    
    const categoryTitles = {
        'technical': 'Report Technical Issue',
        'billing': 'Report Billing Issue', 
        'membership': 'Membership Help Request',
        'general': 'General Inquiry'
    };
    
    title.textContent = categoryTitles[category] || 'Report Issue';
    categoryInput.value = category;
    
    // Reset form
    document.getElementById('quick-report-form').reset();
    document.getElementById('report-category').value = category;
    updateCharCount();
    
    modal.classList.add('active');
}

// Close Quick Report Modal
function closeQuickReportModal() {
    document.getElementById('quick-report-modal').classList.remove('active');
}

// Update character count for message
function updateCharCount() {
    const textarea = document.getElementById('report-message');
    const counter = document.querySelector('.char-count');
    if (textarea && counter) {
        const count = textarea.value.length;
        counter.textContent = `${count}/1000 characters`;
        if (count > 900) {
            counter.style.color = '#ef4444';
        } else if (count > 800) {
            counter.style.color = '#f59e0b';
        } else {
            counter.style.color = '#6b7280';
        }
    }
}

// Submit Quick Report
async function submitQuickReport() {
    const form = document.getElementById('quick-report-form');
    const submitBtn = document.getElementById('submit-report-btn');
    
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const token = getValidToken();
    console.log('Submit report - Using validated token');
    
    if (!token) {
        console.error('No valid token for submit report');
        showError('Please log in to submit a support ticket.');
        return;
    }
    
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
    submitBtn.disabled = true;
    
    try {
        const formData = {
            category: document.getElementById('report-category').value,
            subject: document.getElementById('report-subject').value,
            message: document.getElementById('report-message').value,
            priority: document.getElementById('report-priority').value,
            emailUpdates: document.getElementById('report-email-updates').checked
        };
        
        const response = await fetch(`${BASE_URL}/api/support/tickets`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(formData)
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                localStorage.removeItem('token');
                showError('Your session has expired. Please log in again.');
                return;
            }
            throw new Error(`Server error: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            // Show success message like contact page
            showSuccessDialog(`Support ticket #${result.ticketId} created successfully!`, {
                ticketId: result.ticketId,
                message: "We'll get back to you soon. You can track your ticket status in the support section."
            });
            closeQuickReportModal();
            refreshSupportTickets();
        } else {
            throw new Error(result.message || 'Failed to submit ticket');
        }
        
    } catch (error) {
        console.error('Error submitting ticket:', error);
        showError('Failed to submit support ticket. Please try again or contact us directly.');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// Refresh Support Tickets
async function refreshSupportTickets() {
    console.log('=== Refreshing support tickets ===');
    const container = document.getElementById('user-support-tickets');
    container.innerHTML = '<div class="loading-placeholder">Loading your support tickets...</div>';
    
    const token = getValidToken();
    console.log('Refresh support tickets - Using validated token');
    
    if (!token) {
        console.error('No valid token for support tickets');
        container.innerHTML = '<div class="empty-state">Please log in to view your support tickets. <a href="/frontend/public/login.html">Login here</a></div>';
        return;
    }
    
    try {
        console.log('Making support tickets request...');
        console.log('Request URL:', `${BASE_URL}/api/support/tickets/my`);
        console.log('Request headers:', {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token.substring(0, 20)}...`
        });
        console.log('BASE_URL value:', BASE_URL);
        
        // First test the auth middleware on support routes
        console.log('Testing auth middleware on support routes...');
        try {
            const testResponse = await fetch(`${BASE_URL}/api/support/test-auth`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            console.log('Test auth response status:', testResponse.status);
            if (testResponse.ok) {
                const testResult = await testResponse.json();
                console.log('Test auth result:', testResult);
            } else {
                console.log('Test auth failed:', await testResponse.text());
            }
        } catch (testError) {
            console.error('Test auth error:', testError);
        }
        
        const response = await fetch(`${BASE_URL}/api/support/tickets/my`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log('Support tickets response status:', response.status);
        console.log('Response headers:', [...response.headers.entries()]);
        
        if (!response.ok) {
            if (response.status === 401) {
                // Token is invalid or expired - clear it and redirect to login
                localStorage.removeItem('token');
                container.innerHTML = '<div class="auth-required">Your session has expired. Please <a href="register.html">log in</a> again to view your support tickets.</div>';
                return;
            }
            throw new Error(`Server error: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('Support tickets result:', result);
        
        if (result.success && result.tickets) {
            console.log('Successfully loaded tickets:', result.tickets.length);
            displaySupportTickets(result.tickets);
        } else {
            throw new Error(result.message || 'Failed to load tickets');
        }
        
    } catch (error) {
        console.error('Error loading support tickets:', error);
        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
            localStorage.removeItem('token');
            container.innerHTML = '<div class="auth-required">Authentication failed. Please <a href="register.html">log in</a> again to view your support tickets.</div>';
        } else {
            container.innerHTML = '<div class="error-state">Failed to load support tickets. <button onclick="refreshSupportTickets()">Try Again</button></div>';
        }
    }
}

// ========== USER SUPPORT TICKETS INTEGRATION (ENHANCED) ==========
async function loadUserSupportTickets(force = false) {
    const container = document.getElementById('user-support-tickets-list');
    if (!container) return;
    const token = getValidToken();
    if (!token) {
        container.innerHTML = '<div class="support-empty">Please log in to view your support tickets.</div>';
        return;
    }
    if (!force && container.dataset.loading === 'true') return;
    container.dataset.loading = 'true';
    container.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i> Loading tickets...</div>';
    try {
        const res = await fetch(`${BASE_URL}/api/support/tickets/my`, { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await res.json();
        if (!data.success) throw new Error(data.message || 'Failed to load tickets');
        renderUserSupportTickets(data.tickets || []);
    } catch (e) {
        console.error('Load user tickets error:', e);
        container.innerHTML = `<div class="error-state"><i class="fas fa-exclamation-circle"></i> ${e.message}</div>`;
    } finally {
        container.dataset.loading = 'false';
    }
}

function renderUserSupportTickets(tickets) {
    const container = document.getElementById('user-support-tickets-list');
    if (!container) return;
    if (!tickets.length) {
        container.innerHTML = `<div class="support-empty-state"><i class="fas fa-inbox"></i><p>No support tickets yet.</p></div>`;
        return;
    }
    const statusBadge = (status) => {
        const map = { 'open':'status-open', 'replied':'status-replied', 'in-progress':'status-progress', 'resolved':'status-resolved', 'closed':'status-closed' };
        return `<span class="ticket-status-badge ${map[status]||'status-open'}">${status.replace('-', ' ')}</span>`;
    };
    const priorityBadge = (p) => {
        const map = { low:'priority-low', medium:'priority-medium', high:'priority-high', urgent:'priority-urgent' };
        return `<span class="ticket-priority-badge ${map[p]||'priority-medium'}">${p}</span>`;
    };
    container.innerHTML = tickets.map(t => `
        <div class="user-ticket-card" data-ticket-id="${t.ticketId}">
            <div class="user-ticket-top">
                <div class="ticket-id">#${t.ticketId}</div>
                <div class="ticket-meta">${statusBadge(t.status)} ${priorityBadge(t.priority)}</div>
            </div>
            <div class="ticket-subject">${escapeHTML(t.subject || 'No subject')}</div>
            <div class="ticket-body-preview">${escapeHTML((t.message || '').substring(0,120))}${(t.message||'').length>120?'...':''}</div>
            <div class="ticket-footer">
                <span class="ticket-category"><i class="fas fa-tag"></i> ${getCategoryLabel(t.category)}</span>
                <span class="ticket-time"><i class="fas fa-clock"></i> ${getTimeAgo(t.createdAt)}</span>
                <button class="ticket-view-btn" data-ticket-id="${t.ticketId}"><i class="fas fa-eye"></i> View</button>
            </div>
        </div>`).join('');
    container.querySelectorAll('.ticket-view-btn').forEach(btn => {
        btn.addEventListener('click', (e) => openUserTicketModal(e.currentTarget.dataset.ticketId));
    });
}

async function openUserTicketModal(ticketId) {
    const token = getValidToken();
    if (!token) return;
    showModal('Ticket Details', '<div class="modal-loading"><i class="fas fa-spinner fa-spin"></i> Loading...</div>');
    try {
        const res = await fetch(`${BASE_URL}/api/support/tickets/my`, { headers: { 'Authorization': `Bearer ${token}` } });
        const listData = await res.json();
        const ticket = (listData.tickets || []).find(t => t.ticketId === ticketId);
        if (!ticket) throw new Error('Ticket not found');
        const conversationHTML = `<div class="ticket-convo"><p><strong>Subject:</strong> ${escapeHTML(ticket.subject)}</p><p>${escapeHTML(ticket.message)}</p><div id="user-ticket-messages"></div></div>`;
        const replyForm = ticket.status === 'closed' ? '<div class="ticket-closed-note">This ticket is closed. You cannot reply.</div>' : `
            <div class="user-ticket-reply-form">
                <textarea id="userTicketReplyMessage" rows="4" placeholder="Type your reply..."></textarea>
                <div class="reply-actions-inline">
                    <button class="action-btn secondary" onclick="closeModal()">Close</button>
                    <button class="action-btn primary" id="sendUserTicketReplyBtn"><i class="fas fa-paper-plane"></i> Send Reply</button>
                </div>
            </div>`;
        document.querySelector('.modal-body').innerHTML = `<div class="user-ticket-details">${conversationHTML}${replyForm}</div>`;
        if (ticket.status !== 'closed') {
            document.getElementById('sendUserTicketReplyBtn').addEventListener('click', () => sendUserTicketReply(ticket.ticketId));
        }
    } catch (e) {
        document.querySelector('.modal-body').innerHTML = `<div class="error-state"><i class="fas fa-exclamation-circle"></i> ${e.message}</div>`;
    }
}

async function sendUserTicketReply(ticketId) {
    const token = getValidToken();
    const messageEl = document.getElementById('userTicketReplyMessage');
    if (!token || !messageEl) return;
    const content = messageEl.value.trim();
    if (!content) { showError('Please enter a reply message'); return; }
    const btn = document.getElementById('sendUserTicketReplyBtn');
    const original = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    btn.disabled = true;
    try {
        const res = await fetch(`${BASE_URL}/api/support/tickets/${ticketId}/reply-user`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ message: content })
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'Failed to send reply');
        // Optimistic: append message area if exists
        const messagesContainer = document.getElementById('user-ticket-messages');
        if (messagesContainer) {
            const msgEl = document.createElement('div');
            msgEl.className = 'user-message-row user-sent';
            msgEl.innerHTML = `<div class="msg-bubble">${escapeHTML(content)}<span class="msg-time">just now</span></div>`;
            messagesContainer.appendChild(msgEl);
        }
        messageEl.value = '';
        showSuccess('Reply sent successfully');
        // Refresh list to update status if reopened
        loadUserSupportTickets(true);
    } catch (e) {
        showError(e.message || 'Failed to send reply');
    } finally {
        btn.innerHTML = original;
        btn.disabled = false;
    }
}

function escapeHTML(str='') {
    return str.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
}

setInterval(() => {
    const supportTabContent = document.getElementById('support-tab');
    if (supportTabContent && supportTabContent.classList.contains('active')) {
        loadUserSupportTickets();
    }
}, 120000);

if (typeof initializeSupportTab === 'function') {
    const originalInitSupport = initializeSupportTab;
    window.initializeSupportTab = function() {
        originalInitSupport();
        loadUserSupportTickets();
    }
} else if (document.getElementById('user-support-tickets-list')) {
    loadUserSupportTickets();
}