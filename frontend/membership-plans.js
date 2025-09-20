// ===============================================
// MEMBERSHIP PLANS PAGE JAVASCRIPT
// ===============================================

console.log('Membership plans script loaded!');

// Global variables
let currentFilter = 'rating';
let currentCity = '';
let allGyms = [];
let filteredGyms = [];
let userLocation = null;

// Base URL for API calls
const BASE_URL = 'http://localhost:5000';

// DOM Elements
const loadingScreen = document.getElementById('loading-screen');
const gymProfilesContainer = document.getElementById('gymProfilesContainer');
const resultsTitle = document.getElementById('resultsTitle');
const resultsCount = document.getElementById('resultsCount');
const locationSelect = document.getElementById('locationSelect');
const nearMeBtn = document.getElementById('nearMeBtn');
const tabButtons = document.querySelectorAll('.tab-btn');

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded - Membership Plans');
    
    // Initialize UI components
    initializeNavigation();
    initializeEventListeners();
    initializeGeolocation();
    
    // Load initial data
    loadGymsData();
});

// Initialize navigation functionality
function initializeNavigation() {
    // Mobile menu toggle
    const menuToggle = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    
    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', function() {
            navLinks.classList.toggle('nav-active');
        });
    }
    
    // Dropdown functionality for mobile
    document.querySelectorAll('.dropdown > a').forEach(function(dropLink) {
        dropLink.addEventListener('click', function(e) {
            if (window.innerWidth <= 900) {
                e.preventDefault();
                const parentDropdown = this.parentElement;
                parentDropdown.classList.toggle('open');
                // Close other dropdowns
                document.querySelectorAll('.dropdown').forEach(function(dd) {
                    if (dd !== parentDropdown) dd.classList.remove('open');
                });
            }
        });
    });
    
    // Check authentication and update nav
    checkAuthentication();
}

// Initialize event listeners
function initializeEventListeners() {
    // Filter tab buttons
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const filter = this.dataset.filter;
            setActiveFilter(filter);
        });
    });
    
    // Location select dropdown
    if (locationSelect) {
        locationSelect.addEventListener('change', function() {
            currentCity = this.value;
            applyFilters();
        });
    }
    
    // Near me button
    if (nearMeBtn) {
        nearMeBtn.addEventListener('click', function() {
            if (userLocation) {
                findNearbyGyms();
            } else {
                requestGeolocation();
            }
        });
    }
}

// Check user authentication
function checkAuthentication() {
    const token = localStorage.getItem('token');
    const userProfileNav = document.getElementById('user-profile-nav');
    const loginSignupNav = document.getElementById('login-signup-nav');
    
    if (token) {
        if (userProfileNav) userProfileNav.style.display = 'block';
        if (loginSignupNav) loginSignupNav.style.display = 'none';
        
        // Load user profile info
        loadUserProfile();
    } else {
        if (userProfileNav) userProfileNav.style.display = 'none';
        if (loginSignupNav) loginSignupNav.style.display = 'block';
    }
}

// Load user profile information
async function loadUserProfile() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${BASE_URL}/api/users/profile`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (response.ok) {
            const user = await response.json();
            const profileImg = document.getElementById('profile-icon-img');
            // Use only profileImage, always prepend BASE_URL for fallback and relative paths
            let profilePicUrl;
            if (user.profileImage) {
                if (user.profileImage.startsWith('http')) {
                    profilePicUrl = user.profileImage;
                } else {
                    profilePicUrl = `${BASE_URL}${user.profileImage}`;
                }
            } else {
                profilePicUrl = `${BASE_URL}/uploads/profile-pics/default.png`;
            }
            if (profileImg) profileImg.src = profilePicUrl;
        }
    } catch (error) {
        console.error('Error loading user profile:', error);
    }
}

// Initialize geolocation
function initializeGeolocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                userLocation = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                };
                console.log('User location obtained:', userLocation);
                nearMeBtn.innerHTML = '<i class="fas fa-check"></i> Location Found';
                nearMeBtn.classList.add('location-found');
            },
            (error) => {
                console.log('Geolocation error:', error);
                nearMeBtn.innerHTML = '<i class="fas fa-map-marker-alt"></i> Enable Location';
            }
        );
    }
}

// Request geolocation permission
function requestGeolocation() {
    if (navigator.geolocation) {
        nearMeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Getting Location...';
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                userLocation = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                };
                nearMeBtn.innerHTML = '<i class="fas fa-check"></i> Location Found';
                nearMeBtn.classList.add('location-found');
                findNearbyGyms();
            },
            (error) => {
                nearMeBtn.innerHTML = '<i class="fas fa-map-marker-alt"></i> Location Access Denied';
                alert('Please enable location access to find nearby gyms.');
            }
        );
    } else {
        alert('Geolocation is not supported by this browser.');
    }
}

// Load gyms data from API
async function loadGymsData() {
    try {
        showLoadingScreen();
        
        console.log('Loading gyms data...');
        const response = await fetch(`${BASE_URL}/api/gyms/search?limit=50`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const gyms = await response.json();
        console.log('Gyms data loaded:', gyms.length, 'gyms');
        
        // Debug: Log first few gyms to see data structure
        if (gyms.length > 0) {
            console.log('Sample gym data structure:', {
                gymName: gyms[0].gymName,
                gymPhotos: gyms[0].gymPhotos,
                logoUrl: gyms[0].logoUrl,
                reviews: gyms[0].reviews,
                hasPhotos: gyms[0].gymPhotos?.length > 0,
                hasReviews: gyms[0].reviews?.length > 0
            });
        }
        
        allGyms = gyms.filter(gym => gym.status === 'approved');
        console.log('Approved gyms:', allGyms.length);
        
        // Apply initial filter (rating)
        applyFilters();
        
    } catch (error) {
        console.error('Error loading gyms data:', error);
        showError('Failed to load gyms data. Please try again later.');
    } finally {
        hideLoadingScreen();
    }
}

// Set active filter
function setActiveFilter(filter) {
    currentFilter = filter;
    
    // Update active tab
    tabButtons.forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-filter="${filter}"]`).classList.add('active');
    
    // Update results title
    const titles = {
        'rating': 'Top Rated Gyms',
        'budget': 'Budget Friendly Gyms',
        'activities': 'Most Activities Offered',
        'all': 'All Gyms'
    };
    
    resultsTitle.textContent = titles[filter];
    
    // Apply filters
    applyFilters();
}

// Apply filters and sorting
function applyFilters() {
    let gyms = [...allGyms];
    
    // Filter by city if selected
    if (currentCity) {
        gyms = gyms.filter(gym => 
            gym.location?.city?.toLowerCase().includes(currentCity.toLowerCase())
        );
    }
    
    // Apply sorting based on current filter
    switch (currentFilter) {
        case 'rating':
            gyms = gyms.sort((a, b) => {
                const ratingA = calculateAverageRating(a.reviews || []);
                const ratingB = calculateAverageRating(b.reviews || []);
                const reviewCountA = (a.reviews || []).length;
                const reviewCountB = (b.reviews || []).length;
                
                // Prioritize gyms with more reviews if ratings are equal
                if (ratingB === ratingA) {
                    return reviewCountB - reviewCountA;
                }
                return ratingB - ratingA;
            });
            // Filter to show only highly rated gyms with enough reviews
            gyms = gyms.filter(gym => {
                const rating = calculateAverageRating(gym.reviews || []);
                const reviewCount = (gym.reviews || []).length;
                return rating >= 3.5 || reviewCount >= 2; // Show gyms with good ratings or at least some reviews
            });
            break;
            
        case 'budget':
            gyms = gyms.sort((a, b) => {
                const priceA = getMinPrice(a.membershipPlans || []);
                const priceB = getMinPrice(b.membershipPlans || []);
                return priceA - priceB;
            });
            // Filter to show only budget-friendly gyms (under ₹1200)
            gyms = gyms.filter(gym => {
                const minPrice = getMinPrice(gym.membershipPlans || []);
                return minPrice !== Infinity && minPrice <= 1200;
            });
            break;
            
        case 'activities':
            gyms = gyms.sort((a, b) => {
                const activitiesA = a.activities?.length || 0;
                const activitiesB = b.activities?.length || 0;
                return activitiesB - activitiesA;
            });
            // Filter to show only gyms with multiple activities (4 or more)
            gyms = gyms.filter(gym => {
                const activityCount = gym.activities?.length || 0;
                return activityCount >= 4;
            });
            break;
            
        case 'all':
        default:
            // Default sorting by creation date or name
            gyms = gyms.sort((a, b) => a.gymName.localeCompare(b.gymName));
            break;
    }
    
    // Take top results for each filter (more for 'all' filter)
    const maxResults = currentFilter === 'all' ? 8 : 4;
    filteredGyms = gyms.slice(0, maxResults);
    
    // Update results count
    resultsCount.textContent = `${filteredGyms.length} gyms found`;
    
    // Render gym cards
    renderGymCards(filteredGyms);
}

// Find nearby gyms using user location
function findNearbyGyms() {
    if (!userLocation) return;
    
    const nearbyGyms = allGyms
        .map(gym => ({
            ...gym,
            distance: calculateDistance(
                userLocation.latitude,
                userLocation.longitude,
                gym.location?.latitude || 0,
                gym.location?.longitude || 0
            )
        }))
        .filter(gym => gym.distance <= 10) // Within 10km
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 4);
    
    filteredGyms = nearbyGyms;
    resultsTitle.textContent = 'Gyms Near You';
    resultsCount.textContent = `${filteredGyms.length} gyms within 10km`;
    
    // Update active tab
    tabButtons.forEach(btn => btn.classList.remove('active'));
    
    renderGymCards(filteredGyms);
}

// Calculate distance between two points
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Calculate average rating
function calculateAverageRating(reviews) {
    if (!reviews || reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, review) => acc + (review.rating || 0), 0);
    return sum / reviews.length;
}

// Get minimum price from membership plans
function getMinPrice(plans) {
    if (!plans || plans.length === 0) return Infinity;
    return Math.min(...plans.map(plan => parseFloat(plan.price) || Infinity));
}

// Render gym cards
function renderGymCards(gyms) {
    if (!gymProfilesContainer) return;
    
    // Clear any existing auto-slide intervals
    document.querySelectorAll('.gym-card').forEach(card => {
        if (card.autoSlideInterval) {
            clearInterval(card.autoSlideInterval);
        }
    });
    
    if (gyms.length === 0) {
        gymProfilesContainer.innerHTML = `
            <div class="no-results">
                <i class="fas fa-search" style="font-size: 3rem; color: #ccc; margin-bottom: 1rem;"></i>
                <h3>No gyms found</h3>
                <p>Try adjusting your filters or search criteria</p>
            </div>
        `;
        return;
    }
    
    gymProfilesContainer.innerHTML = gyms.map(gym => createGymCard(gym)).join('');
    
    // Add event listeners to gym cards
    addGymCardEventListeners();
}

// Create individual gym card HTML
function createGymCard(gym) {
    const rating = calculateAverageRating(gym.reviews || []);
    const minPrice = getMinPrice(gym.membershipPlans || []);
    // Fix: Use gymPhotos instead of gymImages and extract imageUrl from photo objects
    const photos = gym.gymPhotos || [];
    const images = photos.map(photo => photo.imageUrl).filter(url => url); // Extract and filter valid URLs
    const activities = gym.activities || [];
    const distance = gym.distance ? `${gym.distance.toFixed(1)} km away` : '';
    
    console.log('Gym:', gym.gymName);
    console.log('- gymPhotos:', photos);
    console.log('- extracted images:', images);
    console.log('- has images:', images.length > 0);
    console.log('- rating:', rating, 'from', gym.reviews?.length || 0, 'reviews');
    console.log('- minPrice:', minPrice);
    
    // Format logo URL
    let logoUrl = 'https://via.placeholder.com/80x80/2a9d8f/ffffff?text=%F0%9F%8F%8B%EF%B8%8F';
    if (gym.logoUrl) {
        if (gym.logoUrl.startsWith('http')) {
            logoUrl = gym.logoUrl;
        } else {
            // Handle both cases: logoUrl starting with / or not
            const cleanLogoUrl = gym.logoUrl.startsWith('/') ? gym.logoUrl : `/${gym.logoUrl}`;
            logoUrl = `${BASE_URL}${cleanLogoUrl}`;
        }
    }
    
    console.log('- logo URL:', logoUrl);
    
    // Format gym images with default dumbbell image
    let imageSlides = '';
    
    if (images.length > 0) {
        imageSlides = images.map((imageUrl, index) => {
            // Handle different image URL formats - imageUrl is already extracted from photo.imageUrl
            let finalUrl = '';
            if (imageUrl.startsWith('http')) {
                finalUrl = imageUrl;
            } else {
                // Handle both cases: imageUrl starting with / or not
                const cleanImageUrl = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
                finalUrl = `${BASE_URL}${cleanImageUrl}`;
            }
            
            console.log(`- image ${index}:`, finalUrl);
            
            return `<img src="${finalUrl}" alt="${gym.gymName}" 
                         onerror="this.src='https://via.placeholder.com/400x220/2a9d8f/ffffff?text=%F0%9F%8F%8B%EF%B8%8F'" 
                         loading="lazy">`;
        }).join('');
    } else {
        // Default image for gyms with no photos
        imageSlides = '<img src="https://via.placeholder.com/400x220/2a9d8f/ffffff?text=%F0%9F%8F%8B%EF%B8%8F" alt="No Images Available" loading="lazy">';
        console.log('- using default image (no photos found)');
    }
    
    const sliderDots = images.length > 1 
        ? images.map((_, index) => `<span class="slider-dot ${index === 0 ? 'active' : ''}" data-slide="${index}"></span>`).join('')
        : '';
    
    const cardId = `gym-card-${gym._id}`;
    
    // Determine badges based on actual data
    let badges = '';
    if (rating >= 4.0 && gym.reviews && gym.reviews.length >= 3) {
        badges += `<div class="rating-badge"><i class="fas fa-star"></i> ${rating.toFixed(1)}</div>`;
    }
    if (minPrice !== Infinity && minPrice < 1000) {
        badges += '<div class="budget-badge">Budget Friendly</div>';
    }
    
    return `
        <div class="gym-card" id="${cardId}" data-gym-id="${gym._id}" data-images-count="${images.length}" onclick="viewGymDetails('${gym._id}')">
            ${badges}
            
            <div class="gym-image-slider">
                <div class="gym-images" style="transform: translateX(0%)">
                    ${imageSlides}
                </div>
                ${images.length > 1 ? `<div class="slider-nav">${sliderDots}</div>` : ''}
            </div>
            
            <div class="gym-info">
                <div class="gym-header">
                    <div class="gym-logo-section">
                        <img src="${logoUrl}" alt="${gym.gymName} Logo" class="gym-logo" 
                             onerror="this.src='https://via.placeholder.com/80x80/2a9d8f/ffffff?text=%F0%9F%8F%8B%EF%B8%8F'" loading="lazy">
                    </div>
                    <div class="gym-title-section">
                        <h3 class="gym-name">${gym.gymName || 'Unknown Gym'}</h3>
                        <div class="gym-location">
                            <i class="fas fa-map-marker-alt"></i>
                            ${gym.location?.address || 'Location not specified'}, ${gym.location?.city || ''}
                        </div>
                        ${distance ? `<div class="gym-distance"><i class="fas fa-route"></i> ${distance}</div>` : ''}
                    </div>
                    <div class="gym-rating">
                        <i class="fas fa-star"></i>
                        ${rating > 0 ? rating.toFixed(1) : 'New'}
                        ${gym.reviews && gym.reviews.length > 0 ? `<span class="review-count">(${gym.reviews.length})</span>` : ''}
                    </div>
                </div>
                
                <div class="gym-features">
                    ${activities.slice(0, 3).map(activity => 
                        `<span class="feature-tag">${activity.name || activity}</span>`
                    ).join('')}
                    ${activities.length > 3 ? `<span class="feature-tag">+${activities.length - 3} more</span>` : ''}
                </div>
                
                ${gym.membershipPlans && gym.membershipPlans.length > 0 ? `
                    <div class="popular-plan">
                        <div class="plan-name">${gym.membershipPlans[0].name || gym.membershipPlans[0].planName || 'Basic Plan'}</div>
                        <div class="plan-price">₹${gym.membershipPlans[0].price || 'N/A'} 
                            <span class="plan-duration">/${gym.membershipPlans[0].duration || 'month'}</span>
                        </div>
                    </div>
                ` : ''}
                
                <button class="view-profile-btn" onclick="event.stopPropagation(); viewGymDetails('${gym._id}')">
                    View Details & Book
                </button>
            </div>
        </div>
    `;
}

// Add event listeners to gym cards
function addGymCardEventListeners() {
    // Image slider functionality
    document.querySelectorAll('.slider-dot').forEach(dot => {
        dot.addEventListener('click', function(e) {
            e.stopPropagation();
            const slideIndex = parseInt(this.dataset.slide);
            const slider = this.closest('.gym-image-slider').querySelector('.gym-images');
            const dots = this.closest('.slider-nav').querySelectorAll('.slider-dot');
            const card = this.closest('.gym-card');
            
            // Update slider position
            slider.style.transform = `translateX(-${slideIndex * 100}%)`;
            
            // Update active dot
            dots.forEach(d => d.classList.remove('active'));
            this.classList.add('active');
            
            // Reset auto-slide for this card
            clearInterval(card.autoSlideInterval);
            startAutoSlide(card);
        });
    });
    
    // Initialize auto-sliding for cards with multiple images
    document.querySelectorAll('.gym-card').forEach(card => {
        const imagesCount = parseInt(card.dataset.imagesCount);
        if (imagesCount > 1) {
            startAutoSlide(card);
            
            // Pause auto-slide on hover
            card.addEventListener('mouseenter', () => {
                clearInterval(card.autoSlideInterval);
            });
            
            // Resume auto-slide when not hovering
            card.addEventListener('mouseleave', () => {
                startAutoSlide(card);
            });
        }
    });
}

// Start auto-sliding for a gym card
function startAutoSlide(card) {
    const imagesCount = parseInt(card.dataset.imagesCount);
    if (imagesCount <= 1) return;
    
    let currentIndex = 0;
    const slider = card.querySelector('.gym-images');
    const dots = card.querySelectorAll('.slider-dot');
    
    card.autoSlideInterval = setInterval(() => {
        currentIndex = (currentIndex + 1) % imagesCount;
        
        // Update slider position
        slider.style.transform = `translateX(-${currentIndex * 100}%)`;
        
        // Update active dot
        dots.forEach(dot => dot.classList.remove('active'));
        if (dots[currentIndex]) {
            dots[currentIndex].classList.add('active');
        }
    }, 4000); // Auto-slide every 4 seconds
}

// View gym details
function viewGymDetails(gymId) {
    window.location.href = `gymdetails.html?gymId=${gymId}`;
}

// Show loading screen
function showLoadingScreen() {
    if (loadingScreen) {
        loadingScreen.classList.remove('hidden');
        loadingScreen.style.display = 'flex';
    }
}

// Hide loading screen
function hideLoadingScreen() {
    if (loadingScreen) {
        setTimeout(() => {
            loadingScreen.classList.add('hidden');
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 500);
        }, 800); // Show loading for at least 800ms for better UX
    }
}

// Show error message
function showError(message) {
    if (gymProfilesContainer) {
        gymProfilesContainer.innerHTML = `
            <div class="error-message" style="text-align: center; padding: 3rem; grid-column: 1 / -1;">
                <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: var(--danger-color); margin-bottom: 1rem;"></i>
                <h3 style="color: var(--danger-color); margin-bottom: 1rem;">Error Loading Gyms</h3>
                <p style="color: #666; margin-bottom: 2rem;">${message}</p>
                <button onclick="location.reload()" class="view-profile-btn" style="max-width: 200px; margin: 0 auto;">
                    <i class="fas fa-redo"></i> Try Again
                </button>
            </div>
        `;
    }
}

// Logout function
function logout() {
    localStorage.removeItem('token');
    window.location.href = 'index.html';
}
