// ===============================================
// GYM DETAILS PAGE JAVASCRIPT
// ===============================================

console.log('Gym details script loaded!');

// Global variables
let currentGym = null;
let currentPhotoIndex = 0;
let gymPhotos = [];

// BASE_URL is defined globally in the HTML file

// DOM Elements
const loadingScreen = document.getElementById('loading-screen');
const gymContent = document.getElementById('gym-content');
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded');
    console.log('Current URL:', window.location.href);
    
    const gymId = getGymIdFromUrl();
    console.log('Gym ID from URL:', gymId);
    
    if (gymId) {
        console.log('About to load gym details for ID:', gymId);
        loadGymDetails(gymId);
    } else {
        console.error('No gym ID found in URL');
        showError('No gym ID provided');
        return;
    }
    
    console.log('Initializing event listeners...');
    initializeEventListeners();
    console.log('Initializing back to top...');
    initializeBackToTop();
    console.log('Initializing reviews...');
    initializeReviews();
    console.log('DOM initialization complete');
});

// Get gym ID from URL parameters
function getGymIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('gymId');
}

// Load gym details from backend
async function loadGymDetails(gymId) {
    try {
        console.log('Loading gym details for ID:', gymId);
        console.log('Fetching from URL:', `${BASE_URL}/api/gyms/${gymId}`);
        
        const response = await fetch(`${BASE_URL}/api/gyms/${gymId}`);
        
        console.log('Response status:', response.status);
        console.log('Response OK:', response.ok);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const gym = await response.json();
        console.log('Gym data received:', gym);
        currentGym = gym;
        
        populateGymDetails(gym);
        hideLoadingScreen();
        
        // Trigger gym data loaded event for offers system
        document.dispatchEvent(new CustomEvent('gymDataLoaded', {
            detail: { 
                gymId: gym.id || gymId,
                gym: gym 
            }
        }));
        
    } catch (error) {
        console.error('Error loading gym details:', error);
        showError('Failed to load gym details. Please try again later.');
    }
}

// Populate gym details in the DOM
function populateGymDetails(gym) {
    console.log('Starting to populate gym details:', gym);
    
    // Basic gym info
    document.getElementById('gym-name').textContent = gym.gymName || 'Unknown Gym';
    document.getElementById('gym-address').textContent = 
        `${gym.location?.address || ''}, ${gym.location?.city || ''}, ${gym.location?.state || ''}`;
    document.getElementById('gym-hours').textContent = 
        `${gym.openingTime || 'N/A'} - ${gym.closingTime || 'N/A'}`;
    document.getElementById('gym-members').textContent = gym.membersCount || 0;
    
    // Gym logo (using gymadmin.js method)
    const gymLogo = document.getElementById('gym-logo');
    let logoUrl = 'https://via.placeholder.com/120x120.png?text=No+Logo';
    console.log('Processing gym logo:', gym.logoUrl);
    if (gym.logoUrl) {
        let url = gym.logoUrl;
        console.log('Raw logo URL:', url);
        // Convert relative path to full URL if needed (same as gymadmin.js)
        if (url && !url.startsWith('http')) {
            if (url.startsWith('/')) {
                logoUrl = `http://localhost:5000${url}`;
            } else {
                logoUrl = `http://localhost:5000/${url}`;
            }
        } else {
            logoUrl = url;
        }
        console.log('Final logo URL:', logoUrl);
    }
    gymLogo.src = logoUrl;
    // Force eager loading and prevent lazy loading
    gymLogo.setAttribute('loading', 'eager');
    gymLogo.setAttribute('decoding', 'sync');
    
    // Add error handling for logo
    gymLogo.onerror = function() {
        console.log('Logo failed to load, using placeholder');
        this.src = 'https://via.placeholder.com/120x120.png?text=No+Logo';
    };
    
    // Status
    const statusElement = document.getElementById('gym-status');
    if (gym.status === 'approved') {
        statusElement.innerHTML = '<span class="status-badge approved">✓ Verified</span>';
    } else {
        statusElement.innerHTML = '<span class="status-badge pending">Pending</span>';
    }
    
    // Store gym name and logo in localStorage for offers module
    localStorage.setItem('gymName', gym.gymName || 'Gym');
    if (logoUrl && logoUrl !== 'https://via.placeholder.com/120x120.png?text=No+Logo') {
        localStorage.setItem('gymLogo', logoUrl);
    } else {
        localStorage.setItem('gymLogo', 'public/Gym-Wale.png');
    }
    
    // Gym description
    document.getElementById('gym-description-text').textContent = 
        gym.description || 'No description available.';
    
    // Populate tabs
    console.log('Populating tabs...');
    populatePhotos(gym.gymPhotos || []);
    populateEquipmentGallery(gym.equipment || []);
    populateMembershipPlans(gym.membershipPlans || []);
    populateActivities(gym.activities || []);
    populateEquipment(gym.equipment || []);
    populateLocation(gym);
    // populateContactInfo(gym); // Removed - contact modal replaced with chat
    populateRushHours(gym._id);
    
    // Load initial rating data for hero section
    console.log('About to load gym rating for hero section with gym ID:', gym._id);
    loadGymRatingForHero(gym._id);
    
    // Load and display featured reviews as floating badges
    console.log('About to load featured reviews for gym ID:', gym._id);
    loadFeaturedReviews(gym._id);
    
    // Update page title
    document.title = `${gym.gymName} - Gym Details - Gym-Wale`;
    console.log('Gym details population complete');
}

// Populate photos tab
function populatePhotos(photos) {
    const photosGrid = document.getElementById('photos-grid');
    gymPhotos = photos;
    
    if (photos.length === 0) {
        photosGrid.innerHTML = '<p class="no-content">No photos available.</p>';
        return;
    }
    
    photosGrid.innerHTML = photos.map((photo, index) => {
        // Support both string and object with url - handle registration photo structure (same as gymadmin.js)
        let url = typeof photo === 'string' ? photo : (photo.url || photo.path || photo.imageUrl || '');
        const title = typeof photo === 'object' ? (photo.title || '') : '';
        const description = typeof photo === 'object' ? (photo.description || '') : '';
        const category = typeof photo === 'object' ? (photo.category || '') : '';
        
        let imageUrl = 'https://via.placeholder.com/300x200.png?text=No+Image';
        if (url) {
            console.log('Processing photo:', url);
            // Convert relative path to full URL if needed (same as gymadmin.js)
            if (url && !url.startsWith('http')) {
                if (url.startsWith('/')) {
                    imageUrl = `http://localhost:5000${url}`;
                } else {
                    imageUrl = `http://localhost:5000/${url}`;
                }
            } else {
                imageUrl = url;
            }
        }
        console.log('Final photo URL:', imageUrl);
        return `
            <div class="photo-card" onclick="openPhotoModal(${index})">
                <img src="${imageUrl}" alt="${title || 'Gym Photo'}" loading="eager" decoding="sync" onerror="this.src='https://via.placeholder.com/300x200.png?text=No+Image'">
                <div class="photo-info">
                    <span class="photo-category">${category}</span>
                    <h3>${title || 'Untitled'}</h3>
                    <p>${description || 'No description'}</p>
            </div>
        `;
    }).join('');
}

// Global equipment variables
let allEquipment = [];
let currentEquipmentFilter = 'all';

// Populate equipment gallery
function populateEquipmentGallery(equipment) {
    console.log('Populating equipment gallery with:', equipment);
    allEquipment = equipment || [];
    
    const equipmentGrid = document.getElementById('equipment-gallery-grid');
    
    if (!equipmentGrid) {
        console.error('Equipment gallery grid not found');
        return;
    }
    
    console.log('Equipment grid found, initializing filters...');
    
    // Initialize filter event listeners
    initializeEquipmentFilters();
    
    // Display equipment
    displayFilteredEquipment('all');
    
    console.log('Equipment gallery populated successfully');
}

// Initialize equipment filter buttons
function initializeEquipmentFilters() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons
            filterButtons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked button
            this.classList.add('active');
            
            // Get category and filter equipment
            const category = this.getAttribute('data-category');
            currentEquipmentFilter = category;
            displayFilteredEquipment(category);
        });
    });
}

// Display filtered equipment
function displayFilteredEquipment(category) {
    const equipmentGrid = document.getElementById('equipment-gallery-grid');
    
    console.log('Displaying filtered equipment for category:', category);
    console.log('All equipment data:', allEquipment);
    
    if (allEquipment.length === 0) {
        console.log('No equipment found, showing no equipment message');
        equipmentGrid.innerHTML = `
            <div class="no-equipment-message">
                <i class="fas fa-dumbbell"></i>
                <h3>No Equipment Available</h3>
                <p>This gym hasn't added any equipment information yet.</p>
            </div>
        `;
        return;
    }
    
    // Filter equipment based on category
    let filteredEquipment = allEquipment;
    if (category !== 'all') {
        filteredEquipment = allEquipment.filter(equipment => 
            equipment.category && equipment.category.toLowerCase() === category.toLowerCase()
        );
        console.log('Filtered equipment for category', category, ':', filteredEquipment);
    }
    
    if (filteredEquipment.length === 0) {
        console.log('No equipment found for category:', category);
        equipmentGrid.innerHTML = `
            <div class="no-equipment-message">
                <i class="fas fa-search"></i>
                <h3>No Equipment Found</h3>
                <p>No equipment found in the "${category}" category.</p>
            </div>
        `;
        return;
    }
    
    console.log('Generating equipment cards for', filteredEquipment.length, 'items');
    
    // Generate equipment cards
    equipmentGrid.innerHTML = filteredEquipment.map((equipment, index) => {
        const mainPhoto = equipment.photos && equipment.photos.length > 0 ? equipment.photos[0] : '';
        let imageUrl = 'https://via.placeholder.com/300x200.png?text=No+Image';
        
        if (mainPhoto) {
            if (mainPhoto.startsWith('http')) {
                imageUrl = mainPhoto;
            } else {
                imageUrl = mainPhoto.startsWith('/') ? 
                    `http://localhost:5000${mainPhoto}` : 
                    `http://localhost:5000/${mainPhoto}`;
            }
        }
        
        const categoryIcon = getCategoryIcon(equipment.category);
        const statusClass = (equipment.status || 'available').toLowerCase().replace('-', '-');
        const statusText = equipment.status || 'available';
        
        return `
            <div class="equipment-card" onclick="openEquipmentModal('${equipment.id || equipment._id}')">
                <div class="equipment-image-container">
                    <img src="${imageUrl}" alt="${equipment.name}" 
                         onerror="this.src='https://via.placeholder.com/300x200.png?text=No+Image'">
                    <span class="equipment-quantity-badge">
                        <i class="fas fa-boxes"></i> ${equipment.quantity || 1}
                    </span>
                    <span class="equipment-status-badge ${statusClass}">
                        ${statusText}
                    </span>
                </div>
                <div class="equipment-info">
                    <div class="equipment-header">
                        <h3 class="equipment-name">${equipment.name || 'Unnamed Equipment'}</h3>
                        <div class="equipment-brand-model">
                            ${equipment.brand ? `${equipment.brand}` : ''}
                            ${equipment.brand && equipment.model ? ' • ' : ''}
                            ${equipment.model ? `${equipment.model}` : ''}
                        </div>
                        <div class="equipment-category-tag">
                            <i class="${categoryIcon}"></i>
                            ${equipment.category || 'other'}
                        </div>
                    </div>
                    <p class="equipment-description">
                        ${equipment.description || 'No description available for this equipment.'}
                    </p>
                </div>
            </div>
        `;
    }).join('');
    
    console.log('Equipment cards generated successfully');
}

// Get category icon
function getCategoryIcon(category) {
    const iconMap = {
        'cardio': 'fas fa-heartbeat',
        'strength': 'fas fa-dumbbell',
        'functional': 'fas fa-running',
        'other': 'fas fa-cogs'
    };
    return iconMap[category?.toLowerCase()] || 'fas fa-cogs';
}

// Open equipment detail modal
function openEquipmentModal(equipmentId) {
    const equipment = allEquipment.find(eq => (eq.id || eq._id) === equipmentId);
    
    if (!equipment) {
        console.error('Equipment not found:', equipmentId);
        return;
    }
    
    console.log('Opening equipment modal for:', equipment);
    
    // Populate modal content
    document.getElementById('equipment-modal-name').textContent = equipment.name || 'Unnamed Equipment';
    document.getElementById('equipment-modal-brand').textContent = equipment.brand || 'Unknown Brand';
    document.getElementById('equipment-modal-model').textContent = equipment.model || 'Unknown Model';
    document.getElementById('equipment-modal-quantity').textContent = equipment.quantity || 1;
    document.getElementById('equipment-modal-location').textContent = equipment.location || 'Not specified';
    document.getElementById('equipment-modal-description').textContent = 
        equipment.description || 'No description available for this equipment.';
    
    // Set category
    const categoryElement = document.getElementById('equipment-modal-category');
    const categoryIcon = getCategoryIcon(equipment.category);
    categoryElement.innerHTML = `<i class="${categoryIcon}"></i><span>${equipment.category || 'other'}</span>`;
    
    // Set status
    const statusElement = document.getElementById('equipment-modal-status');
    const statusClass = (equipment.status || 'available').toLowerCase().replace('-', '-');
    statusElement.textContent = equipment.status || 'available';
    statusElement.className = `stat-value status-badge ${statusClass}`;
    
    // Handle main image and thumbnails
    const mainImageElement = document.getElementById('equipment-modal-image');
    const thumbnailsContainer = document.getElementById('equipment-thumbnails');
    
    if (equipment.photos && equipment.photos.length > 0) {
        // Set main image
        let mainImageUrl = equipment.photos[0];
        if (!mainImageUrl.startsWith('http')) {
            mainImageUrl = mainImageUrl.startsWith('/') ? 
                `http://localhost:5000${mainImageUrl}` : 
                `http://localhost:5000/${mainImageUrl}`;
        }
        mainImageElement.src = mainImageUrl;
        
        // Generate thumbnails if multiple photos
        if (equipment.photos.length > 1) {
            thumbnailsContainer.innerHTML = equipment.photos.map((photo, index) => {
                let photoUrl = photo;
                if (!photoUrl.startsWith('http')) {
                    photoUrl = photoUrl.startsWith('/') ? 
                        `http://localhost:5000${photoUrl}` : 
                        `http://localhost:5000/${photoUrl}`;
                }
                
                return `
                    <div class="equipment-thumbnail ${index === 0 ? 'active' : ''}" 
                         onclick="changeEquipmentImage('${photoUrl}', this)">
                        <img src="${photoUrl}" alt="Equipment Photo ${index + 1}"
                             onerror="this.src='https://via.placeholder.com/60x60.png?text=No+Image'">
                    </div>
                `;
            }).join('');
        } else {
            thumbnailsContainer.innerHTML = '';
        }
    } else {
        mainImageElement.src = 'https://via.placeholder.com/400x300.png?text=No+Image';
        thumbnailsContainer.innerHTML = '';
    }
    
    // Handle specifications
    const specificationsElement = document.getElementById('equipment-modal-specifications');
    const specificationsSection = document.getElementById('equipment-specifications-section');
    
    if (equipment.specifications && equipment.specifications.trim()) {
        specificationsSection.style.display = 'block';
        try {
            // Try to parse as JSON first
            const specs = JSON.parse(equipment.specifications);
            if (typeof specs === 'object') {
                specificationsElement.innerHTML = `
                    <ul>
                        ${Object.entries(specs).map(([key, value]) => 
                            `<li><span class="spec-label">${key}:</span> <span class="spec-value">${value}</span></li>`
                        ).join('')}
                    </ul>
                `;
            } else {
                specificationsElement.innerHTML = `<p>${specs}</p>`;
            }
        } catch (e) {
            // If not JSON, treat as plain text
            specificationsElement.innerHTML = `<p>${equipment.specifications}</p>`;
        }
    } else {
        specificationsSection.style.display = 'none';
    }
    
    // Show modal
    document.getElementById('equipment-detail-modal').style.display = 'block';
}

// Change equipment image in modal
function changeEquipmentImage(imageUrl, thumbnailElement) {
    document.getElementById('equipment-modal-image').src = imageUrl;
    
    // Update active thumbnail
    document.querySelectorAll('.equipment-thumbnail').forEach(thumb => {
        thumb.classList.remove('active');
    });
    thumbnailElement.classList.add('active');
}

// Close equipment modal
function closeEquipmentModal() {
    document.getElementById('equipment-detail-modal').style.display = 'none';
}

// Populate membership plans tab
function populateMembershipPlans(plans) {
    const membershipGrid = document.getElementById('membership-grid');
    
    if (!plans || plans.length === 0) {
        membershipGrid.innerHTML = '<p class="no-content">No membership plans available.</p>';
        return;
    }

    membershipGrid.innerHTML = plans.map((plan, idx) => {
        // Plan color and icon
        const planColor = plan.color || '#38b000';
        const planIcon = plan.icon || 'fa-leaf';
        
        // Generate discount badge
        const planDiscount = plan.discount || 0;
        const discountBadge = planDiscount > 0 ? 
            `<div class="discount-badge">${planDiscount}%</div>` : '';
        
        // Generate benefits list
        const planBenefits = Array.isArray(plan.benefits) ? plan.benefits : [];
        
        // Generate month buttons
        const monthOptions = [1, 3, 6, 12];
        const monthBtnGroup = monthOptions.map(months => 
            `<button type="button" class="month-btn" data-plan-idx="${idx}" data-months="${months}">${months} ${months === 1 ? 'Month' : 'Months'}</button>`
        ).join('');
        
        // Discount months information
        let discountMonths = [];
        let discountMin = null;
        
        if (Array.isArray(plan.discountMonths)) {
            discountMonths = plan.discountMonths.map(Number);
        } else if (typeof plan.discountMonths === 'object' && plan.discountMonths !== null && plan.discountMonths.min) {
            discountMin = Number(plan.discountMonths.min);
        } else if (typeof plan.discountMonths === 'number' && plan.discountMonths > 0) {
            discountMin = plan.discountMonths;
        }
        
        // Discount months text
        let discountMonthsText = '';
        if (planDiscount > 0 && discountMin) {
            discountMonthsText = `<div class="membership-discount-info">Discount applies for: <b>${discountMin}+ months</b></div>`;
        } else if (planDiscount > 0 && discountMonths.length > 0) {
            discountMonthsText = `<div class="membership-discount-info">Discount applies for: <b>${discountMonths.join(', ')} month${discountMonths.length > 1 ? 's' : ''}</b></div>`;
        }
        
        const paymentId = `paymentAmount_${idx}`;
        const discountId = `discountInfo_${idx}`;
        
        return `
            <div class="membership-card" data-plan="${plan._id || idx}" data-plan-name="${plan.name}">
                ${discountBadge}
                <div class="membership-header">
                    <div class="membership-title">
                        <div class="membership-icon" style="background: ${planColor};">
                            <i class="fas ${planIcon}"></i>
                        </div>
                        <h3>${plan.name}</h3>
                    </div>
                    <div class="membership-price">₹${plan.price}/mo</div>
                </div>
                
                <ul class="membership-benefits">
                    ${planBenefits.map(benefit => 
                        `<li><i class="fas fa-check"></i> ${benefit}</li>`
                    ).join('')}
                </ul>
                
                ${plan.note ? `<p class="membership-note">${plan.note}</p>` : ''}
                ${discountMonthsText}
                
                <div class="duration-selection">
                    <span class="duration-label">Select Duration:</span>
                    <div class="month-btn-group" data-plan-idx="${idx}">
                        ${monthBtnGroup}
                    </div>
                </div>
                
                <div id="${paymentId}" class="final-price" style="color: ${planColor};">₹0</div>
                <div id="${discountId}" class="discount-info">Discount applied!</div>
                
                <button class="btn-primary buy-membership-btn" 
                        onclick="buyMembershipWithDuration('${plan.name}', ${idx}, '${plan._id || ''}', ${plan.price}, ${plan.discount || 0})"
                        disabled>
                    <i class="fas fa-shopping-cart"></i> Select Duration First
                </button>
            </div>
        `;
    }).join('');

    // Add event listeners for month buttons
    document.querySelectorAll('.month-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(btn.getAttribute('data-plan-idx'));
            const plan = plans[idx];
            const months = parseInt(btn.getAttribute('data-months'));
            const paymentId = `paymentAmount_${idx}`;
            const discountId = `discountInfo_${idx}`;
            
            // Remove active from all buttons in this group
            document.querySelectorAll(`.month-btn[data-plan-idx="${idx}"]`).forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            let totalAmount = 0;
            let discount = 0;
            
            if (plan && months) {
                totalAmount = plan.price * months;
                
                // Calculate discount
                let discountMonths = [];
                let discountMin = null;
                
                if (Array.isArray(plan.discountMonths)) {
                    discountMonths = plan.discountMonths.map(Number);
                } else if (typeof plan.discountMonths === 'object' && plan.discountMonths !== null && plan.discountMonths.min) {
                    discountMin = Number(plan.discountMonths.min);
                } else if (typeof plan.discountMonths === 'number' && plan.discountMonths > 0) {
                    discountMin = plan.discountMonths;
                }
                
                if (plan.discount && plan.discount > 0) {
                    if (discountMin && months >= discountMin) {
                        discount = (totalAmount * plan.discount) / 100;
                    } else if (discountMonths.length > 0 && discountMonths.includes(months)) {
                        discount = (totalAmount * plan.discount) / 100;
                    }
                }
                
                totalAmount = totalAmount - discount;
            }
            
            // Update payment and discount display
            const originalAmount = plan.price * months;
            if (discount > 0) {
                document.getElementById(paymentId).innerHTML = `
                    <span style="text-decoration: line-through; color: #999; font-size: 1rem;">₹${originalAmount}</span>
                    ₹${Math.round(totalAmount)}
                `;
                document.getElementById(discountId).style.display = 'block';
                document.getElementById(discountId).textContent = `Discount applied: ₹${Math.round(discount)} saved!`;
            } else {
                document.getElementById(paymentId).textContent = `₹${Math.round(totalAmount)}`;
                document.getElementById(discountId).style.display = 'none';
            }
            
            // Enable buy button and update its onclick
            const membershipCard = document.querySelector(`[data-plan="${plan._id || idx}"]`);
            const buyBtn = membershipCard ? membershipCard.querySelector('.buy-membership-btn') : null;
            
            if (buyBtn) {
                buyBtn.disabled = false;
                buyBtn.innerHTML = `<i class="fas fa-shopping-cart"></i> Buy ${months} Month${months > 1 ? 's' : ''} - ₹${Math.round(totalAmount)}`;
                buyBtn.setAttribute('data-months', months);
                buyBtn.setAttribute('data-total', Math.round(totalAmount));
                buyBtn.setAttribute('data-original', originalAmount);
                buyBtn.setAttribute('data-discount', Math.round(discount));
            }
        });
    });
}

// Populate activities tab
function populateActivities(activities) {
    const activitiesGrid = document.getElementById('activities-grid');
    
    if (activities.length === 0) {
        activitiesGrid.innerHTML = '<p class="no-content">No activities listed.</p>';
        return;
    }
    
    // Define the known activities with their icons (same as gymadmin.js)
    const knownActivities = [
        { name: 'Yoga', icon: 'fa-person-praying' },
        { name: 'Zumba', icon: 'fa-music' },
        { name: 'CrossFit', icon: 'fa-dumbbell' },
        { name: 'Weight Training', icon: 'fa-weight-hanging' },
        { name: 'Cardio', icon: 'fa-heartbeat' },
        { name: 'Pilates', icon: 'fa-child' },
        { name: 'HIIT', icon: 'fa-bolt' },
        { name: 'Aerobics', icon: 'fa-running' },
        { name: 'Martial Arts', icon: 'fa-hand-fist' },
        { name: 'Spin Class', icon: 'fa-bicycle' },
        { name: 'Swimming', icon: 'fa-person-swimming' },
        { name: 'Boxing', icon: 'fa-hand-rock' },
        { name: 'Personal Training', icon: 'fa-user-tie' },
        { name: 'Bootcamp', icon: 'fa-shoe-prints' },
        { name: 'Stretching', icon: 'fa-arrows-up-down' }
    ];
    
    console.log('Activities data:', activities);
    
    activitiesGrid.innerHTML = activities.map(activity => {
        console.log('Processing activity:', activity);
        
        let activityName = '';
        let activityDescription = '';
        let icon = 'fa-dumbbell';
        
        // Handle different activity formats
        if (typeof activity === 'string') {
            activityName = activity;
            activityDescription = 'Great activity for fitness enthusiasts.';
            // Find matching icon by name
            const match = knownActivities.find(a => a.name.toLowerCase() === activity.toLowerCase());
            if (match) {
                icon = match.icon;
                console.log(`Found icon for ${activity}: ${icon}`);
            }
        } else if (typeof activity === 'object' && activity !== null) {
            // Handle object format
            activityName = activity.name || activity.activityName || '';
            activityDescription = activity.description || 'Great activity for fitness enthusiasts.';
            
            // Use existing icon if available
            if (activity.icon) {
                icon = activity.icon;
                console.log(`Using existing icon for ${activityName}: ${icon}`);
            } else {
                // Find matching icon by name
                const match = knownActivities.find(a => a.name.toLowerCase() === activityName.toLowerCase());
                if (match) {
                    icon = match.icon;
                    console.log(`Found icon for ${activityName}: ${icon}`);
                }
            }
        }
        
        console.log(`Final activity: ${activityName}, icon: ${icon}`);
        
        return `
            <div class="activity-card">
                <div class="activity-icon">
                    <i class="fas ${icon}"></i>
                </div>
                <h3>${activityName}</h3>
                <p>${activityDescription}</p>
            </div>
        `;
    }).join('');
    
    // Populate trial booking activity options
    const trialActivitySelect = document.getElementById('trial-activity');
    trialActivitySelect.innerHTML = '<option value="">Select activity (optional)</option>' +
        activities.map(activity => {
            const activityName = typeof activity === 'string' ? activity : (activity.name || activity.activityName || '');
            return `<option value="${activityName}">${activityName}</option>`;
        }).join('');
}

// Populate equipment section
function populateEquipment(equipment) {
    const equipmentList = document.getElementById('equipment-list');
    
    if (!equipment || equipment.length === 0) {
        equipmentList.innerHTML = '<p class="no-content">No equipment listed.</p>';
        return;
    }
    
    // Handle both array of strings (old format) and array of objects (new format)
    equipmentList.innerHTML = equipment.map(item => {
        let equipmentName = '';
        let equipmentInfo = '';
        
        if (typeof item === 'string') {
            // Old format: simple string
            equipmentName = item;
        } else if (typeof item === 'object' && item !== null) {
            // New format: equipment object
            equipmentName = item.name || 'Unknown Equipment';
            const brand = item.brand ? ` - ${item.brand}` : '';
            const quantity = item.quantity > 1 ? ` (${item.quantity}x)` : '';
            equipmentInfo = `${brand}${quantity}`;
        } else {
            equipmentName = 'Unknown Equipment';
        }
        
        const categoryIcon = getCategoryIcon(item.category);
        
        return `
            <div class="equipment-item">
                <i class="${categoryIcon}"></i>
                <div class="equipment-item-info">
                    <span class="equipment-name">${equipmentName}</span>
                    ${equipmentInfo ? `<span class="equipment-details">${equipmentInfo}</span>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// Populate location tab
function populateLocation(gym) {
    const fullAddress = `${gym.location?.address || ''}, ${gym.location?.city || ''}, ${gym.location?.state || ''} - ${gym.location?.pincode || ''}`;
    document.getElementById('full-address').textContent = fullAddress;
    
    // Contact info in location tab
    const contactPhone = document.getElementById('contact-phone');
    const contactEmail = document.getElementById('contact-email');
    const contactPerson = document.getElementById('contact-person');
    
    if (contactPhone) contactPhone.textContent = gym.phone || 'N/A';
    if (contactEmail) contactEmail.textContent = gym.email || 'N/A';
    if (contactPerson) contactPerson.textContent = gym.contactPerson || 'N/A';
    
    // Initialize map (placeholder for now)
    const mapContainer = document.getElementById('gym-map');
    mapContainer.innerHTML = `
        <div style="background: linear-gradient(45deg, #f0f0f0, #e0e0e0); height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; color: #666;">
            <i class="fas fa-map-marker-alt" style="font-size: 3rem; margin-bottom: 1rem; color: var(--primary-color);"></i>
            <h3>Interactive Map</h3>
            <p>${gym.gymName}</p>
            <p>${fullAddress}</p>
            <button class="btn-secondary btn-small" onclick="openInMaps('${fullAddress}')">
                <i class="fas fa-external-link-alt"></i> Open in Maps
            </button>
        </div>
    `;
}

// Populate contact information
function populateContactInfo(gym) {
    // Header contact info
    document.getElementById('contact-phone').textContent = gym.phone || 'N/A';
    document.getElementById('contact-email').textContent = gym.email || 'N/A';
    document.getElementById('contact-person').textContent = gym.contactPerson || 'N/A';
    
    // Modal contact info
    document.getElementById('modal-phone').textContent = gym.phone || 'N/A';
    document.getElementById('modal-email').textContent = gym.email || 'N/A';
    document.getElementById('modal-contact-person').textContent = gym.contactPerson || 'N/A';
    
    // Update contact links
    const callBtn = document.getElementById('call-btn');
    const emailBtn = document.getElementById('email-btn');
    
    if (gym.phone) {
        callBtn.href = `tel:${gym.phone}`;
    }
    
    if (gym.email) {
        emailBtn.href = `mailto:${gym.email}`;
    }
}

// Enhanced rush hour analysis with professional bar chart
async function populateRushHours(gymId) {
    try {
        console.log('Loading enhanced rush hour analysis for gym:', gymId);
        
        const response = await fetch(`${BASE_URL}/api/attendance/rush-analysis/${gymId}?days=7`);
        
        if (!response.ok) {
            console.error('Failed to fetch rush hour data:', response.status);
            populateRushHoursDefault();
            return;
        }
        
        const result = await response.json();
        console.log('Enhanced rush hour analysis result:', result);
        
        if (result.success && result.data && result.data.hasData) {
            populateRushHoursDisplay(result.data);
        } else {
            console.log('No rush hour data available, showing default');
            populateRushHoursDefault();
        }
        
    } catch (error) {
        console.error('Error loading rush hour data:', error);
        populateRushHoursDefault();
    }
}

    


// Populate rush hours display

// Calculate statistics for a time period
function calculatePeriodStats(hourlyStats, hours) {
    let totalAvg = 0;
    let lowCount = 0, mediumCount = 0, highCount = 0;
    
    hours.forEach(hour => {
        totalAvg += hourlyStats[hour].avgAttendance;
        switch (hourlyStats[hour].rushLevel) {
            case 'low': lowCount++; break;
            case 'medium': mediumCount++; break;
            case 'high': highCount++; break;
        }
    });
    
    const avgAttendance = totalAvg / hours.length;
    let overallRushLevel = 'low';
    
    if (highCount >= hours.length / 2) {
        overallRushLevel = 'high';
    } else if (mediumCount >= hours.length / 2) {
        overallRushLevel = 'medium';
    }
    
    return {
        avgAttendance,
        rushLevel: overallRushLevel,
        hours: hours.map(h => ({
            hour: h,
            attendance: hourlyStats[h].avgAttendance,
            rushLevel: hourlyStats[h].rushLevel
        }))
    };
}

// Find peak hour
function findPeakHour(hourlyStats) {
    let maxHour = 0;
    let maxAttendance = 0;
    
    Object.keys(hourlyStats).forEach(hour => {
        if (hourlyStats[hour].avgAttendance > maxAttendance) {
            maxAttendance = hourlyStats[hour].avgAttendance;
            maxHour = parseInt(hour);
        }
    });
    
    return { hour: maxHour, attendance: maxAttendance };
}

// Find least busy hour
function findLeastBusyHour(hourlyStats) {
    let minHour = 0;
    let minAttendance = Infinity;
    
    Object.keys(hourlyStats).forEach(hour => {
        const attendance = hourlyStats[hour].avgAttendance;
        if (attendance < minAttendance && attendance > 0) {
            minAttendance = attendance;
            minHour = parseInt(hour);
        }
    });
    
    return { hour: minHour, attendance: minAttendance };
}

// Professional rush hours display with interactive bar chart
function populateRushHoursDisplay(data) {
    console.log('Populating enhanced rush hours display with data:', data);
    
    // Hide loading and show content
    const loadingElement = document.getElementById('rush-hours-loading');
    const hoursChart = document.getElementById('hours-chart');
    const periodAnalysis = document.getElementById('period-analysis');
    const rushStatistics = document.getElementById('rush-statistics');
    const noDataElement = document.getElementById('rush-hours-no-data');
    
    if (loadingElement) loadingElement.style.display = 'none';
    if (noDataElement) noDataElement.style.display = 'none';
    if (hoursChart) hoursChart.style.display = 'block';
    if (periodAnalysis) periodAnalysis.style.display = 'block';
    if (rushStatistics) rushStatistics.style.display = 'block';
    
    // Generate professional bar chart
    if (hoursChart && data.hourlyData) {
        const maxVisits = data.statistics.maxHourlyVisits || 1;
        
        let chartHTML = `
            <div class="rush-hours-chart-container">
                <div class="chart-header">
                    <div class="chart-title">
                        <i class="fas fa-chart-bar"></i>
                        <h3>Average Hourly Attendance</h3>
                        <span class="chart-subtitle">Based on ${data.statistics.analyzedDays} days of data</span>
                    </div>
                    <div class="chart-legend">
                        <div class="legend-item">
                            <div class="legend-color low"></div>
                            <span>Low Activity</span>
                        </div>
                        <div class="legend-item">
                            <div class="legend-color medium"></div>
                            <span>Moderate Activity</span>
                        </div>
                        <div class="legend-item">
                            <div class="legend-color high"></div>
                            <span>Peak Activity</span>
                        </div>
                    </div>
                </div>
                
                <div class="bar-chart">
                    <div class="y-axis">
                        <div class="y-label">${maxVisits}</div>
                        <div class="y-label">${Math.round(maxVisits * 0.75)}</div>
                        <div class="y-label">${Math.round(maxVisits * 0.5)}</div>
                        <div class="y-label">${Math.round(maxVisits * 0.25)}</div>
                        <div class="y-label">0</div>
                    </div>
                    
                    <div class="chart-area">
                        <div class="grid-lines">
                            <div class="grid-line"></div>
                            <div class="grid-line"></div>
                            <div class="grid-line"></div>
                            <div class="grid-line"></div>
                        </div>
                        
                        <div class="bars-container">
        `;
        
        // Generate bars for each hour
        for (let hour = 6; hour <= 22; hour++) {
            const hourData = data.hourlyData[hour] || { totalVisits: 0, averageVisits: 0, rushLevel: 'low', formattedHour: formatHour(hour) };
            const barHeight = maxVisits > 0 ? (hourData.totalVisits / maxVisits) * 100 : 0;
            const isPeak = hour === data.statistics.peakHour;
            const isLeastBusy = hour === data.statistics.leastBusyHour;
            
            chartHTML += `
                <div class="bar-item ${isPeak ? 'peak' : ''} ${isLeastBusy ? 'least-busy' : ''}" 
                     data-hour="${hour}" 
                     data-visits="${hourData.totalVisits}"
                     data-average="${hourData.averageVisits}">
                    <div class="bar ${hourData.rushLevel}" 
                         style="height: ${Math.max(barHeight, 2)}%"
                         title="${hourData.formattedHour}: ${hourData.totalVisits} visits (${hourData.averageVisits} avg/day)">
                        ${isPeak ? '<i class="fas fa-crown peak-icon"></i>' : ''}
                        ${isLeastBusy && !isPeak ? '<i class="fas fa-leaf quiet-icon"></i>' : ''}
                        <span class="bar-value">${hourData.totalVisits}</span>
                    </div>
                    <div class="hour-label">${hour}:00</div>
                    <div class="hour-period">${hour < 12 ? 'AM' : 'PM'}</div>
                </div>
            `;
        }
        
        chartHTML += `
                        </div>
                    </div>
                    
                    <div class="x-axis-label">
                        <span>Time of Day</span>
                    </div>
                </div>
                
                <div class="chart-insights">
                    <div class="insight-item peak">
                        <i class="fas fa-crown"></i>
                        <div>
                            <strong>Peak Hour</strong>
                            <span>${data.statistics.peakHourFormatted} (${data.statistics.peakHourVisits} visits)</span>
                        </div>
                    </div>
                    <div class="insight-item quiet">
                        <i class="fas fa-leaf"></i>
                        <div>
                            <strong>Quietest Hour</strong>
                            <span>${data.statistics.leastBusyHourFormatted}</span>
                        </div>
                    </div>
                    <div class="insight-item average">
                        <i class="fas fa-chart-line"></i>
                        <div>
                            <strong>Daily Average</strong>
                            <span>${data.statistics.averageDailyVisits} visits/day</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        hoursChart.innerHTML = chartHTML;
        
        // Add interactive hover effects
        setTimeout(() => {
            const barItems = document.querySelectorAll('.bar-item');
            barItems.forEach(item => {
                item.addEventListener('mouseenter', function() {
                    const hour = this.dataset.hour;
                    const visits = this.dataset.visits;
                    const average = this.dataset.average;
                    
                    // Show enhanced tooltip
                    this.classList.add('hovered');
                });
                
                item.addEventListener('mouseleave', function() {
                    this.classList.remove('hovered');
                });
            });
        }, 100);
    }
    
    // Generate period analysis with enhanced styling
    if (periodAnalysis && data.periodStats) {
        let periodHTML = `
            <h3><i class="fas fa-clock"></i> Best Times to Visit</h3>
            <div class="time-periods-grid">
        `;
        
        Object.keys(data.periodStats).forEach(periodKey => {
            const period = data.periodStats[periodKey];
            const rushClass = period.rushLevel;
            const rushText = period.rushLevel === 'high' ? 'Very Busy' : 
                           period.rushLevel === 'medium' ? 'Moderately Busy' : 'Less Crowded';
            
            periodHTML += `
                <div class="period-card ${rushClass}">
                    <div class="period-header">
                        <i class="fas ${period.icon}"></i>
                        <div>
                            <h4>${period.name}</h4>
                            <span class="period-time">${period.period}</span>
                        </div>
                    </div>
                    <div class="period-stats">
                        <div class="stat">
                            <span class="stat-value">${period.totalVisits}</span>
                            <span class="stat-label">Total Visits</span>
                        </div>
                        <div class="stat">
                            <span class="stat-value">${period.averageVisits}</span>
                            <span class="stat-label">Avg/Day</span>
                        </div>
                    </div>
                    <div class="period-indicator ${rushClass}">
                        <i class="fas ${period.rushLevel === 'high' ? 'fa-fire' : period.rushLevel === 'medium' ? 'fa-users' : 'fa-leaf'}"></i>
                        <span>${rushText}</span>
                    </div>
                </div>
            `;
        });
        
        periodHTML += '</div>';
        
        const timeRecommendations = document.getElementById('time-recommendations');
        if (timeRecommendations) {
            timeRecommendations.innerHTML = periodHTML;
        }
    }
    
    // Generate enhanced statistics
    if (rushStatistics && data.statistics) {
        let statsHTML = `
            <h3><i class="fas fa-chart-bar"></i> Attendance Statistics</h3>
            <div class="stats-grid">
                <div class="stat-card">
                    <i class="fas fa-calendar-alt"></i>
                    <div class="stat-content">
                        <span class="stat-number">${data.statistics.analyzedDays}</span>
                        <span class="stat-text">Days Analyzed</span>
                    </div>
                </div>
                <div class="stat-card">
                    <i class="fas fa-users"></i>
                    <div class="stat-content">
                        <span class="stat-number">${data.statistics.totalRecords}</span>
                        <span class="stat-text">Total Check-ins</span>
                    </div>
                </div>
                <div class="stat-card">
                    <i class="fas fa-chart-line"></i>
                    <div class="stat-content">
                        <span class="stat-number">${data.statistics.averageDailyVisits}</span>
                        <span class="stat-text">Daily Average</span>
                    </div>
                </div>
                <div class="stat-card">
                    <i class="fas fa-crown"></i>
                    <div class="stat-content">
                        <span class="stat-number">${data.statistics.maxHourlyVisits}</span>
                        <span class="stat-text">Peak Hour Max</span>
                    </div>
                </div>
            </div>
            <div class="date-range">
                <i class="fas fa-info-circle"></i>
                <span>Analysis period: ${new Date(data.statistics.dateRange.start).toLocaleDateString()} - ${new Date(data.statistics.dateRange.end).toLocaleDateString()}</span>
            </div>
        `;
        
        rushStatistics.innerHTML = statsHTML;
    }
}

// Populate default rush hours when data is not available
function populateRushHoursDefault() {
    console.log('Populating default rush hours display');
    
    // Hide loading and other elements  
    const loadingElement = document.getElementById('rush-hours-loading');
    const hoursChart = document.getElementById('hours-chart');
    const periodAnalysis = document.getElementById('period-analysis');
    const rushStatistics = document.getElementById('rush-statistics');
    const noDataElement = document.getElementById('rush-hours-no-data');
    
    if (loadingElement) loadingElement.style.display = 'none';
    if (hoursChart) hoursChart.style.display = 'none';
    if (periodAnalysis) periodAnalysis.style.display = 'none';
    if (rushStatistics) rushStatistics.style.display = 'none';
    if (noDataElement) noDataElement.style.display = 'block';
}

// Format hour for display
function formatHour(hour) {
    if (hour === 0) return '12:00 AM';
    if (hour < 12) return `${hour}:00 AM`;
    if (hour === 12) return '12:00 PM';
    return `${hour - 12}:00 PM`;
}

// Initialize event listeners
function initializeEventListeners() {
    // Tab navigation - tabs now use onclick handlers, so no need for separate event listeners
    
    // Modal event listeners
    setupModalEventListeners();
    
    // Trial booking form
    const trialForm = document.getElementById('trial-booking-form');
    trialForm.addEventListener('submit', handleTrialBooking);
    
    // Trial booking cancel button
    const cancelTrialBtn = document.getElementById('cancel-trial-booking');
    if (cancelTrialBtn) {
        cancelTrialBtn.addEventListener('click', () => {
            closeModal('trial-booking-modal');
        });
    }
    
    // Quick action buttons - Remove multiple event listeners and consolidate
    document.getElementById('trial-booking-btn').addEventListener('click', async () => {
        await checkTrialLimitsAndOpenModal();
        // Auto-fill will be called from checkTrialLimitsAndOpenModal
    });
    
    // Contact button removed - replaced with chat button (handled in gymdetails-chat.js)
    
    // Set minimum date for trial booking to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('trial-date').setAttribute('min', today);
}

// Function to auto-fill user information
async function autoFillUserInfo() {
    const token = localStorage.getItem('token');
    if (!token) {
        console.log('No token found, skipping auto-fill');
        return; // User not logged in, can't auto-fill
    }
    
    try {
        console.log('Attempting to fetch user profile for auto-fill...');
        const response = await fetch(`${BASE_URL}/api/users/profile`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            console.error('Failed to fetch user profile for auto-fill:', response.status, response.statusText);
            const errorText = await response.text();
            console.error('Error response:', errorText);
            return;
        }
        
        const user = await response.json();
        console.log('User data fetched successfully for auto-fill:', user);
        
        // Create name field if it doesn't exist
        if (!user.name && (user.firstName || user.lastName)) {
            const firstName = (user.firstName || '').trim();
            const lastName = (user.lastName || '').trim();
            user.name = [firstName, lastName].filter(Boolean).join(' ') || user.username || '';
            console.log('Created name field from firstName/lastName:', user.name);
        }
        
        // Fill basic information
        if (user.name) {
            const nameInput = document.getElementById('trial-name');
            if (nameInput) {
                nameInput.value = user.name;
                nameInput.setAttribute('readonly', 'true');
                nameInput.style.backgroundColor = '#f8f9fa';
                nameInput.style.cursor = 'not-allowed';
                console.log('Name auto-filled and locked:', user.name);
            } else {
                console.warn('Name input field not found');
            }
        } else {
            console.log('No name field in user data and could not create from firstName/lastName');
        }
        
        if (user.email) {
            const emailInput = document.getElementById('trial-email');
            if (emailInput) {
                emailInput.value = user.email;
                emailInput.setAttribute('readonly', 'true');
                emailInput.style.backgroundColor = '#f8f9fa';
                emailInput.style.cursor = 'not-allowed';
                console.log('Email auto-filled and locked:', user.email);
            } else {
                console.warn('Email input field not found');
            }
        } else {
            console.log('No email field in user data');
        }
        
        if (user.phone) {
            const phoneInput = document.getElementById('trial-phone');
            if (phoneInput) {
                phoneInput.value = user.phone;
                phoneInput.setAttribute('readonly', 'true');
                phoneInput.style.backgroundColor = '#f8f9fa';
                phoneInput.style.cursor = 'not-allowed';
                console.log('Phone auto-filled and locked:', user.phone);
            } else {
                console.warn('Phone input field not found');
            }
        } else {
            console.log('No phone field in user data');
        }
        
        // Fill date of birth - try both field names
        const dobField = user.dateOfBirth || user.birthdate;
        if (dobField) {
            const dobInput = document.getElementById('trial-dob');
            if (dobInput) {
                try {
                    const dob = new Date(dobField);
                    if (!isNaN(dob.getTime())) {
                        const formattedDob = dob.toISOString().split('T')[0];
                        dobInput.value = formattedDob;
                        dobInput.setAttribute('readonly', 'true');
                        dobInput.style.backgroundColor = '#f8f9fa';
                        dobInput.style.cursor = 'not-allowed';
                        console.log('DOB auto-filled and locked:', formattedDob);
                    }
                } catch (error) {
                    console.warn('Could not parse DOB:', dobField, error);
                }
            }
        }
        
        // Fill fitness goal - try multiple field names
        const fitnessGoalSelect = document.getElementById('trial-fitness-goal');
        if (fitnessGoalSelect) {
            let userGoals = [];
            
            // Check different possible field names for fitness goals
            if (user.fitnessGoals && Array.isArray(user.fitnessGoals)) {
                userGoals = user.fitnessGoals;
            } else if (user.fitnessGoal) {
                userGoals = [user.fitnessGoal];
            } else if (user.goals && Array.isArray(user.goals)) {
                userGoals = user.goals;
            } else if (user.primaryGoal) {
                userGoals = [user.primaryGoal];
            }
            
            if (userGoals.length > 0) {
                const userPrimaryGoal = userGoals[0];
                console.log('Trying to match fitness goal:', userPrimaryGoal);
                
                // Enhanced matching logic
                const options = fitnessGoalSelect.options;
                let matched = false;
                
                for (let i = 0; i < options.length; i++) {
                    if (!options[i].value) continue; // Skip empty option
                    
                    const optionValue = options[i].value.toLowerCase();
                    const userGoalLower = userPrimaryGoal.toLowerCase();
                    
                    // Check for exact match or partial match
                    if (optionValue === userGoalLower || 
                        optionValue.includes(userGoalLower) || 
                        userGoalLower.includes(optionValue) ||
                        (userGoalLower.includes('weight') && optionValue.includes('weight')) ||
                        (userGoalLower.includes('muscle') && optionValue.includes('muscle')) ||
                        (userGoalLower.includes('cardio') && optionValue.includes('cardio')) ||
                        (userGoalLower.includes('strength') && optionValue.includes('strength')) ||
                        (userGoalLower.includes('fitness') && optionValue.includes('fitness')) ||
                        (userGoalLower.includes('flexibility') && optionValue.includes('flexibility')) ||
                        (userGoalLower.includes('sports') && optionValue.includes('sports')) ||
                        (userGoalLower.includes('rehab') && optionValue.includes('rehabilitation'))) {
                        fitnessGoalSelect.value = options[i].value;
                        console.log('Matched fitness goal:', options[i].value);
                        matched = true;
                        break;
                    }
                }
                
                if (!matched) {
                    console.log('No fitness goal match found for:', userPrimaryGoal);
                }
            }
        }
        
        // Fill activity preferences
        const activitySelect = document.getElementById('trial-activity');
        if (activitySelect) {
            let userActivities = [];
            
            // Check different possible field names for activities
            if (user.activityPreferences && Array.isArray(user.activityPreferences)) {
                userActivities = user.activityPreferences;
            } else if (user.activities && Array.isArray(user.activities)) {
                userActivities = user.activities;
            } else if (user.preferredActivities && Array.isArray(user.preferredActivities)) {
                userActivities = user.preferredActivities;
            } else if (user.workoutPreferences && Array.isArray(user.workoutPreferences)) {
                userActivities = user.workoutPreferences;
            } else if (user.activity) {
                userActivities = [user.activity];
            }
            
            if (userActivities.length > 0) {
                const userActivity = userActivities[0];
                console.log('Trying to match activity:', userActivity);
                
                // Enhanced matching logic for activities
                const options = activitySelect.options;
                let matched = false;
                
                for (let i = 0; i < options.length; i++) {
                    if (!options[i].value) continue; // Skip empty option
                    
                    const optionValue = options[i].value.toLowerCase();
                    const userActivityLower = userActivity.toLowerCase();
                    
                    if (optionValue === userActivityLower || 
                        optionValue.includes(userActivityLower) || 
                        userActivityLower.includes(optionValue) ||
                        (userActivityLower.includes('cardio') && optionValue.includes('cardio')) ||
                        (userActivityLower.includes('strength') && optionValue.includes('strength')) ||
                        (userActivityLower.includes('yoga') && optionValue.includes('yoga')) ||
                        (userActivityLower.includes('hiit') && optionValue.includes('hiit')) ||
                        (userActivityLower.includes('crossfit') && optionValue.includes('crossfit')) ||
                        (userActivityLower.includes('zumba') && optionValue.includes('zumba'))) {
                        activitySelect.value = options[i].value;
                        console.log('Matched activity:', options[i].value);
                        matched = true;
                        break;
                    }
                }
                
                if (!matched) {
                    console.log('No activity match found for:', userActivity);
                }
            }
        }
        
        // Fill fitness experience
        const experienceSelect = document.getElementById('trial-experience');
        if (experienceSelect) {
            let userExperience = user.fitnessExperience || user.experience || user.experienceLevel || user.fitnessLevel;
            
            if (userExperience) {
                console.log('Trying to match experience:', userExperience);
                
                const userExp = userExperience.toLowerCase();
                const options = experienceSelect.options;
                let matched = false;
                
                for (let i = 0; i < options.length; i++) {
                    if (!options[i].value) continue; // Skip empty option
                    
                    const optionValue = options[i].value.toLowerCase();
                    
                    if (optionValue.includes(userExp) || 
                        userExp.includes(optionValue.split('(')[0].trim().toLowerCase()) ||
                        (userExp.includes('beginner') && optionValue.includes('beginner')) ||
                        (userExp.includes('intermediate') && optionValue.includes('intermediate')) ||
                        (userExp.includes('advanced') && optionValue.includes('advanced')) ||
                        (userExp.includes('novice') && optionValue.includes('beginner')) ||
                        (userExp.includes('expert') && optionValue.includes('advanced'))) {
                        experienceSelect.value = options[i].value;
                        console.log('Matched experience:', options[i].value);
                        matched = true;
                        break;
                    }
                }
                
                if (!matched) {
                    console.log('No experience match found for:', userExperience);
                }
            }
        }
        
        console.log('User information auto-filled successfully');
        
        // Set minimum date to tomorrow for trial booking
        const trialDateInput = document.getElementById('trial-date');
        if (trialDateInput) {
            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const formattedDate = tomorrow.toISOString().split('T')[0];
            trialDateInput.min = formattedDate;
            trialDateInput.value = formattedDate; // Default to tomorrow
        }
        
    } catch (error) {
        console.error('Error auto-filling user information:', error);
        // Don't show error to user, just fail silently
    }
}

// Setup modal event listeners
function setupModalEventListeners() {
    // Close buttons
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            closeModal(modal.id);
        });
    });
    
    // Click outside to close
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal(modal.id);
            }
        });
    });
    
    // Photo navigation
    document.getElementById('prev-photo').addEventListener('click', () => {
        navigatePhoto(-1);
    });
    
    document.getElementById('next-photo').addEventListener('click', () => {
        navigatePhoto(1);
    });
    
    // Success/Error modal OK buttons
    document.getElementById('success-ok-btn').addEventListener('click', () => {
        closeModal('success-modal');
    });
    
    document.getElementById('error-ok-btn').addEventListener('click', () => {
        closeModal('error-modal');
    });
    
    // Equipment modal close button
    const equipmentModalClose = document.getElementById('close-equipment-modal');
    if (equipmentModalClose) {
        equipmentModalClose.addEventListener('click', () => {
            closeModal('equipment-detail-modal');
        });
    }
}

// Tab switching
function switchTab(tabName) {
    // Remove active class from all tabs and contents
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(btn => btn.classList.remove('active'));
    tabContents.forEach(content => content.classList.remove('active'));
    
    // Add active class to selected tab button (find by onclick attribute)
    const selectedButton = Array.from(tabButtons).find(btn => 
        btn.getAttribute('onclick') === `switchTab('${tabName}')`
    );
    if (selectedButton) {
        selectedButton.classList.add('active');
    }
    
    // Add active class to selected tab content
    const selectedContent = document.getElementById(`${tabName}-tab`);
    if (selectedContent) {
        selectedContent.classList.add('active');
    }
    
    // Load reviews if reviews tab is selected
    if (tabName === 'reviews') {
        loadGymReviews();
    }
}

// Photo modal functions
function openPhotoModal(index) {
    currentPhotoIndex = index;
    updatePhotoModal();
    openModal('photo-modal');
}

function updatePhotoModal() {
    const photo = gymPhotos[currentPhotoIndex];
    let imageUrl = 'https://via.placeholder.com/800x600.png?text=No+Image';
    
    // Support both string and object with url - handle registration photo structure (same as gymadmin.js)
    let url = typeof photo === 'string' ? photo : (photo.url || photo.path || photo.imageUrl || '');
    if (url) {
        // Convert relative path to full URL if needed (same as gymadmin.js)
        if (url && !url.startsWith('http')) {
            if (url.startsWith('/')) {
                imageUrl = `http://localhost:5000${url}`;
            } else {
                imageUrl = `http://localhost:5000/${url}`;
            }
        } else {
            imageUrl = url;
        }
    }
    
    const modalPhoto = document.getElementById('modal-photo');
    modalPhoto.src = imageUrl;
    modalPhoto.setAttribute('loading', 'eager');
    modalPhoto.setAttribute('decoding', 'sync');
    modalPhoto.onerror = function() {
        this.src = 'https://via.placeholder.com/800x600.png?text=No+Image';
    };
    
    const title = typeof photo === 'object' ? (photo.title || '') : '';
    const description = typeof photo === 'object' ? (photo.description || '') : '';
    
    document.getElementById('photo-title').textContent = title || 'Untitled';
    document.getElementById('photo-description').textContent = description || 'No description';
}

function navigatePhoto(direction) {
    currentPhotoIndex += direction;
    
    if (currentPhotoIndex >= gymPhotos.length) {
        currentPhotoIndex = 0;
    } else if (currentPhotoIndex < 0) {
        currentPhotoIndex = gymPhotos.length - 1;
    }
    
    updatePhotoModal();
}

// Modal functions
function openModal(modalId) {
    document.getElementById(modalId).style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
    document.body.style.overflow = 'auto';
    
    // Clear trial form data if closing trial booking modal
    if (modalId === 'trial-booking-modal') {
        const token = localStorage.getItem('token');
        if (!token) {
            clearTrialFormData();
        }
    }
}

// Check trial limits before opening booking modal
async function checkTrialLimitsAndOpenModal() {
    const token = localStorage.getItem('token');
    
    // If user is not logged in, show login prompt
    if (!token) {
        showStandardLoginPrompt('trial booking');
        return;
    }
    
    try {
        // Check user trial status
        const statusResponse = await fetch(`${BASE_URL}/api/trial-bookings/trial-status`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!statusResponse.ok) {
            throw new Error('Failed to fetch trial status');
        }
        
        const statusData = await statusResponse.json();
        const trialLimits = statusData.data;
        
        // Check if user has remaining trials
        if (trialLimits.remainingTrials <= 0) {
            showTrialLimitAlert('Monthly Trial Limit Reached', 
                `You have used all ${trialLimits.totalTrials} free trials for this month. Your trial limit will reset on ${new Date(trialLimits.nextResetDate).toLocaleDateString()}.`);
            return;
        }
        
        // Check availability for this specific gym and today's date
        const today = new Date().toISOString().split('T')[0];
        const gymId = getGymIdFromUrl();
        
        const availabilityResponse = await fetch(`${BASE_URL}/api/trial-bookings/check-availability?gymId=${gymId}&date=${today}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!availabilityResponse.ok) {
            throw new Error('Failed to check availability');
        }
        
        const availabilityData = await availabilityResponse.json();
        
        if (!availabilityData.data.canBook) {
            showTrialLimitAlert('Trial Booking Restricted', availabilityData.data.message);
            return;
        }
        
        // Show trial status info and open modal
        showTrialStatusInfo(trialLimits);
        openModal('trial-booking-modal');
        
        // Auto-fill user information after modal is opened
        setTimeout(autoFillUserInfo, 100);
        
    } catch (error) {
        console.error('Error checking trial limits:', error);
        // If there's an error checking limits, allow booking but show warning
        showError('Unable to verify trial limits. You may proceed with booking.');
        openModal('trial-booking-modal');
        
        // Auto-fill user information after modal is opened
        setTimeout(autoFillUserInfo, 100);
    }
}

// Prefill user data in trial booking form
function prefillUserData(userData) {
    const nameInput = document.getElementById('trial-name');
    const emailInput = document.getElementById('trial-email');
    const phoneInput = document.getElementById('trial-phone');
    const dobInput = document.getElementById('trial-dob');
    
    // Combine firstName and lastName to create full name
    // Handle cases where fields might be null, undefined, or empty strings
    const firstName = (userData.firstName || '').trim();
    const lastName = (userData.lastName || '').trim();
    const username = (userData.username || '').trim();
    
    // Build full name with fallback to username
    let fullName = '';
    if (firstName || lastName) {
        fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
    } else if (username) {
        fullName = username;
    }
    
    if (nameInput && fullName) {
        nameInput.value = fullName;
        nameInput.setAttribute('readonly', 'true');
        nameInput.style.backgroundColor = '#f8f9fa';
        nameInput.style.cursor = 'not-allowed';
    }
    
    if (emailInput && userData.email) {
        emailInput.value = userData.email;
        emailInput.setAttribute('readonly', 'true');
        emailInput.style.backgroundColor = '#f8f9fa';
        emailInput.style.cursor = 'not-allowed';
    }
    
    if (phoneInput && userData.phone) {
        phoneInput.value = userData.phone;
        phoneInput.setAttribute('readonly', 'true');
        phoneInput.style.backgroundColor = '#f8f9fa';
        phoneInput.style.cursor = 'not-allowed';
    }
    
    // Fill date of birth if available
    const dobField = userData.dateOfBirth || userData.birthdate;
    if (dobInput && dobField) {
        try {
            const dob = new Date(dobField);
            if (!isNaN(dob.getTime())) {
                const formattedDob = dob.toISOString().split('T')[0];
                dobInput.value = formattedDob;
                dobInput.setAttribute('readonly', 'true');
                dobInput.style.backgroundColor = '#f8f9fa';
                dobInput.style.cursor = 'not-allowed';
            }
        } catch (error) {
            console.warn('Could not parse DOB for prefill:', dobField, error);
        }
    }
    
    // Add user info notice
    const formElement = document.getElementById('trial-booking-form');
    const existingNotice = formElement.querySelector('.user-info-notice');
    if (existingNotice) {
        existingNotice.remove();
    }
    
    // Only show notice if we have a name to display
    if (fullName) {
        const userNotice = document.createElement('div');
        userNotice.className = 'user-info-notice';
        userNotice.innerHTML = `
            <div class="notice-content">
                <i class="fas fa-user-check"></i>
                <p>Booking as <strong>${fullName}</strong></p>
                <small>Your profile information has been automatically filled</small>
            </div>
        `;
        
        formElement.insertBefore(userNotice, formElement.firstChild);
    } else {
        // If no name is available, show a different notice
        const userNotice = document.createElement('div');
        userNotice.className = 'user-info-notice';
        userNotice.innerHTML = `
            <div class="notice-content">
                <i class="fas fa-user"></i>
                <p>Logged in user - please complete your name below</p>
                <small>Your email and phone have been automatically filled</small>
            </div>
        `;
        
        formElement.insertBefore(userNotice, formElement.firstChild);
    }
}

// Show trial limit alert dialog
function showTrialLimitAlert(title, message) {
    const alertHtml = `
        <div id="trial-limit-alert" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-exclamation-triangle"></i> ${title}</h3>
                    <span class="close" onclick="closeTrialLimitAlert()">&times;</span>
                </div>
                <div class="modal-body">
                    <p>${message}</p>
                    <div class="alert-buttons">
                        <button class="btn-primary" onclick="closeTrialLimitAlert()">
                            <i class="fas fa-check"></i> Understood
                        </button>
                        <button class="btn-secondary" onclick="closeTrialLimitAlert(); window.location.href='settings.html#trial-bookings'">
                            <i class="fas fa-cog"></i> View Settings
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', alertHtml);
    document.getElementById('trial-limit-alert').style.display = 'block';
}

// Close trial limit alert
function closeTrialLimitAlert() {
    const alert = document.getElementById('trial-limit-alert');
    if (alert) {
        alert.remove();
    }
}

// Show trial status info
function showTrialStatusInfo(trialLimits) {
    const infoHtml = `
        <div class="trial-status-info">
            <div class="status-item">
                <i class="fas fa-ticket-alt"></i>
                <span>Remaining Trials: <strong>${trialLimits.remainingTrials}/${trialLimits.totalTrials}</strong></span>
            </div>
            <div class="status-item">
                <i class="fas fa-calendar-alt"></i>
                <span>Resets: ${new Date(trialLimits.nextResetDate).toLocaleDateString()}</span>
            </div>
        </div>
    `;
    
    // Add after modal header instead of inside it to prevent layout issues
    const modalContent = document.querySelector('#trial-booking-modal .modal-content');
    const modalHeader = document.querySelector('#trial-booking-modal .modal-header');
    const modalBody = document.querySelector('#trial-booking-modal .modal-body');
    const existingInfo = modalContent.querySelector('.trial-status-info');
    
    if (existingInfo) {
        existingInfo.remove();
    }
    
    // Insert the trial status info between header and body
    modalHeader.insertAdjacentHTML('afterend', infoHtml);
}

// Clear user data when modal closes (for guest users)
function clearTrialFormData() {
    const nameInput = document.getElementById('trial-name');
    const emailInput = document.getElementById('trial-email');
    const phoneInput = document.getElementById('trial-phone');
    const dobInput = document.getElementById('trial-dob');
    
    if (nameInput) {
        nameInput.value = '';
        nameInput.removeAttribute('readonly');
        nameInput.style.backgroundColor = '';
        nameInput.style.cursor = '';
    }
    
    if (emailInput) {
        emailInput.value = '';
        emailInput.removeAttribute('readonly');
        emailInput.style.backgroundColor = '';
        emailInput.style.cursor = '';
    }
    
    if (phoneInput) {
        phoneInput.value = '';
        phoneInput.removeAttribute('readonly');
        phoneInput.style.backgroundColor = '';
        phoneInput.style.cursor = '';
    }
    
    if (dobInput) {
        dobInput.value = '';
        dobInput.removeAttribute('readonly');
        dobInput.style.backgroundColor = '';
        dobInput.style.cursor = '';
    }
    
    // Remove user info notice
    const formElement = document.getElementById('trial-booking-form');
    const existingNotice = formElement.querySelector('.user-info-notice');
    if (existingNotice) {
        existingNotice.remove();
    }
    
    // Clear trial status info
    const modalContent = document.querySelector('#trial-booking-modal .modal-content');
    const existingInfo = modalContent.querySelector('.trial-status-info');
    if (existingInfo) {
        existingInfo.remove();
    }
}

// Trial booking handler
async function handleTrialBooking(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const token = localStorage.getItem('token');
    
    const trialData = {
        gymId: getGymIdFromUrl(),
        name: formData.get('name'),
        phone: formData.get('phone'),
        email: formData.get('email'),
        dateOfBirth: formData.get('dob'),
        preferredDate: formData.get('date'),
        preferredTime: formData.get('time'),
        fitnessGoals: formData.get('fitnessGoal') || 'General Fitness',
        activityPreference: formData.get('activity') || '',
        experience: formData.get('experience') || '',
        message: formData.get('message') || '',
        termsAccepted: formData.get('terms') === 'on',
        whatsappConsent: formData.get('whatsappConsent') === 'on',
        sessionType: 'trial'
    };

    // Validate required fields
    if (!trialData.name || !trialData.phone || !trialData.email || 
        !trialData.dateOfBirth || !trialData.preferredDate || !trialData.preferredTime || 
        !trialData.fitnessGoals || !trialData.termsAccepted) {
        showError('Please fill in all required fields and accept the terms and conditions');
        return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trialData.email)) {
        showError('Please enter a valid email address');
        return;
    }

    // Validate phone format (basic validation)
    const phoneRegex = /^[+]?[\d\s\-\(\)]{10,}$/;
    if (!phoneRegex.test(trialData.phone)) {
        showError('Please enter a valid phone number');
        return;
    }

    // Validate future date
    const selectedDate = new Date(trialData.preferredDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
        showError('Please select a future date for your trial session');
        return;
    }

    // Validate age (must be at least 16 years old)
    const birthDate = new Date(trialData.dateOfBirth);
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate()) ? age - 1 : age;
    
    if (actualAge < 16) {
        showError('You must be at least 16 years old to book a trial session');
        return;
    }
    
    if (actualAge > 100) {
        showError('Please enter a valid date of birth');
        return;
    }

    try {
        // Show loading state
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Booking...';
        submitBtn.disabled = true;

        const headers = {
            'Content-Type': 'application/json'
        };
        
        // Add authorization header if user is logged in
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        console.log('Submitting trial booking with data:', trialData);
        console.log('Using BASE_URL:', BASE_URL);
        console.log('Full URL:', `${BASE_URL}/api/trial-bookings/book-trial`);

        const response = await fetch(`${BASE_URL}/api/trial-bookings/book-trial`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(trialData)
        });
        
        console.log('Response received:', {
            status: response.status,
            statusText: response.statusText,
            ok: response.ok,
            headers: Object.fromEntries(response.headers.entries())
        });
        
        const result = await response.json();
        console.log('Response data:', result);
        
        // Reset button state
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
        
        if (response.ok) {
            closeModal('trial-booking-modal');
            
            // Clear any existing trial status info
            const existingInfo = document.querySelector('#trial-booking-modal .trial-status-info');
            if (existingInfo) {
                existingInfo.remove();
            }
            
            // Show success message with additional info
            showDialog({
                title: 'Trial Booking Successful! 🎉',
                message: `Thank you ${trialData.name}! Your trial session has been booked successfully.\n\nThe gym admin will contact you soon to confirm your session on ${new Date(trialData.preferredDate).toLocaleDateString()} at ${trialData.preferredTime}.\n\nPlease keep your phone available for confirmation calls.`,
                confirmText: 'Got it!',
                iconHtml: '<i class="fas fa-check-circle" style="color: #059669; font-size: 3rem;"></i>'
            });
            
            e.target.reset();
            
            // If user is logged in, refresh trial limits for future bookings
            if (token) {
                console.log('Refreshing trial limits after successful booking');
                await refreshTrialLimitsAfterBooking();
            }
            
            // Send notification to gym admin (this will be handled by the backend)
            console.log('Trial booking notification sent to gym admin');
            
        } else {
            if (result.restrictions) {
                showTrialLimitAlert('Booking Restriction', result.message);
            } else {
                showError(result.message || 'Failed to submit trial booking');
            }
        }
    } catch (error) {
        console.error('Error submitting trial booking:', error);
        console.error('Error type:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        
        // Reset button state
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = '<i class="fas fa-paper-plane"></i> Book Trial Session';
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
        
        // Show more specific error message based on error type
        let errorMessage = 'Failed to submit trial booking. Please try again.';
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            errorMessage = 'Network error: Unable to connect to server. Please check your internet connection.';
        } else if (error.name === 'SyntaxError') {
            errorMessage = 'Server response error. Please try again or contact support.';
        }
        
        showError(errorMessage);
    }
}

// Membership purchase handler with authentication and payment integration
async function buyMembership(planName, finalPrice, planId, originalPrice, discount) {
    console.log('Starting membership purchase process:', {
        planName,
        finalPrice,
        planId,
        originalPrice,
        discount,
        gymId: currentGym?._id
    });

    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
        // Redirect to login with return URL
        const returnUrl = encodeURIComponent(`${window.location.origin}/frontend/gymdetails.html?gymId=${currentGym._id}&plan=${planName}&price=${finalPrice}`);
        window.location.href = `/frontend/public/login.html?redirect=${returnUrl}&reason=membership`;
        return;
    }

    try {
        // Verify token is still valid and get user info
        const userResponse = await fetch(`${BASE_URL}/api/users/profile`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!userResponse.ok) {
            // Token invalid, redirect to login
            localStorage.removeItem('token');
            const returnUrl = encodeURIComponent(`${window.location.origin}/frontend/gymdetails.html?gymId=${currentGym._id}&plan=${planName}&price=${finalPrice}`);
            window.location.href = `/frontend/public/login.html?redirect=${returnUrl}&reason=membership`;
            return;
        }

        const user = await userResponse.json();
        console.log('User authenticated:', user);

        // Prepare registration data
        const registrationData = {
            // User details
            memberName: user.name || user.fullName,
            email: user.email,
            phone: user.phone || user.mobile,
            age: calculateAge(user.dateOfBirth) || 25,
            gender: user.gender || 'Other',
            
            // Gym details
            gymId: currentGym._id,
            gymName: currentGym.gymName,
            
            // Membership plan details
            planSelected: planName,
            monthlyPlan: '1 Month', // Default to 1 month, can be extended
            paymentAmount: finalPrice,
            paymentMode: 'Online',
            
            // Additional info
            activityPreference: 'General fitness',
            address: user.address || '',
            
            // Plan metadata
            planId: planId,
            originalPrice: originalPrice,
            discount: discount,
            
            // Registration type
            registrationType: 'online_membership'
        };

        console.log('Registration data prepared:', registrationData);

        // Store data for payment gateway
        sessionStorage.setItem('membershipRegistrationData', JSON.stringify(registrationData));
        sessionStorage.setItem('userToken', token);
        
        // Redirect to payment gateway
        const paymentUrl = `/frontend/payment-gateway.html?` + new URLSearchParams({
            type: 'membership',
            gymId: currentGym._id,
            gymName: currentGym.gymName,
            planName: planName,
            amount: finalPrice,
            originalPrice: originalPrice,
            discount: discount,
            email: user.email,
            phone: user.phone,
            name: user.name || user.fullName
        }).toString();
        
        console.log('Redirecting to payment gateway:', paymentUrl);
        window.location.href = paymentUrl;

    } catch (error) {
        console.error('Error during membership purchase:', error);
        showError('Failed to process membership purchase. Please try again.');
    }
}

// Membership purchase handler with duration selection
async function buyMembershipWithDuration(planName, planIdx, planId, originalPrice, discount) {
    console.log('🛒 buyMembershipWithDuration called with:', {
        planName, planIdx, planId, originalPrice, discount
    });
    
    const buyBtn = event.target;
    console.log('🔘 Button element:', buyBtn);
    console.log('🔘 Button attributes:', {
        'data-months': buyBtn.getAttribute('data-months'),
        'data-total': buyBtn.getAttribute('data-total'),
        'data-original': buyBtn.getAttribute('data-original'),
        'data-discount': buyBtn.getAttribute('data-discount')
    });
    
    const months = parseInt(buyBtn.getAttribute('data-months'));
    const totalAmount = parseInt(buyBtn.getAttribute('data-total'));
    const originalAmount = parseInt(buyBtn.getAttribute('data-original'));
    const discountAmount = parseInt(buyBtn.getAttribute('data-discount'));
    
    if (!months) {
        console.error('❌ No months selected');
        showError('Please select a duration first');
        return;
    }
    
    console.log('✅ Starting membership purchase process with duration:', {
        planName,
        planIdx,
        planId,
        originalPrice,
        discount,
        months,
        totalAmount,
        originalAmount,
        discountAmount,
        gymId: currentGym?._id,
        gymName: currentGym?.gymName
    });

    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
        // Redirect to login with return URL
        const returnUrl = encodeURIComponent(`${window.location.origin}/frontend/gymdetails.html?gymId=${currentGym._id}&plan=${planName}&months=${months}&price=${totalAmount}`);
        window.location.href = `/frontend/public/login.html?redirect=${returnUrl}&reason=membership`;
        return;
    }

    try {
        // Verify token is still valid and get user info
        const userResponse = await fetch(`${BASE_URL}/api/users/profile`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!userResponse.ok) {
            // Token invalid, redirect to login
            localStorage.removeItem('token');
            const returnUrl = encodeURIComponent(`${window.location.origin}/frontend/gymdetails.html?gymId=${currentGym._id}&plan=${planName}&months=${months}&price=${totalAmount}`);
            window.location.href = `/frontend/public/login.html?redirect=${returnUrl}&reason=membership`;
            return;
        }

        const user = await userResponse.json();
        console.log('User authenticated:', user);

        // Prepare registration data with duration information
        const registrationData = {
            // User details
            memberName: user.name || user.fullName,
            email: user.email,
            phone: user.phone || user.mobile,
            age: calculateAge(user.dateOfBirth) || 25,
            gender: user.gender || 'Other',
            
            // Gym details
            gymId: currentGym._id,
            gymName: currentGym.gymName,
            
            // Membership plan details with duration
            planSelected: planName,
            monthlyPlan: `${months} Month${months > 1 ? 's' : ''}`,
            paymentAmount: totalAmount,
            paymentMode: 'Online',
            
            // Duration and pricing details
            duration: months,
            monthlyPrice: originalPrice,
            totalOriginalAmount: originalAmount,
            discountAmount: discountAmount,
            finalAmount: totalAmount,
            
            // Additional info
            activityPreference: 'General fitness',
            address: user.address || '',
            
            // Plan metadata
            planId: planId,
            originalPrice: originalPrice,
            discount: discount,
            
            // Registration type
            registrationType: 'online_membership_duration'
        };

        console.log('Registration data prepared:', registrationData);

        // Store data for payment gateway
        sessionStorage.setItem('membershipRegistrationData', JSON.stringify(registrationData));
        sessionStorage.setItem('userToken', token);
        
        // Show coupon selection modal before payment
        if (window.couponManager) {
            const purchaseData = {
                planName: planName,
                months: months,
                originalAmount: originalAmount,
                discountAmount: discountAmount,
                totalAmount: totalAmount,
                gymId: currentGym._id,
                gymName: currentGym.gymName,
                user: user,
                registrationData: registrationData
            };
            
            window.couponManager.showCouponSelectionModal(purchaseData);
        } else {
            // Fallback: Redirect directly to payment gateway with duration info
            const paymentUrl = `/frontend/payment-gateway.html?` + new URLSearchParams({
                type: 'membership',
                gymId: currentGym._id,
                gymName: currentGym.gymName,
                planName: planName,
                duration: months,
                amount: totalAmount,
                originalPrice: originalPrice,
                monthlyPrice: originalPrice,
                originalAmount: originalAmount,
                discount: discount,
                discountAmount: discountAmount,
                email: user.email,
                phone: user.phone,
                name: user.name || user.fullName
            }).toString();
            
            console.log('Redirecting to payment gateway:', paymentUrl);
            window.location.href = paymentUrl;
        }

    } catch (error) {
        console.error('Error in membership purchase:', error);
        showError('Failed to process membership purchase. Please try again.');
    }
}

// Helper function to calculate age from date of birth
function calculateAge(dateOfBirth) {
    if (!dateOfBirth) return null;
    
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    
    return age;
}


// === Modal Dialog Utility (from gymadmin.js, global) ===
function showDialog({ title = '', message = '', confirmText = 'OK', cancelText = '', iconHtml = '', onConfirm = null, onCancel = null }) {
  let dialog = document.getElementById('customDialogBox');
  if (dialog) dialog.remove();
  dialog = document.createElement('div');
  dialog.id = 'customDialogBox';
  dialog.style.position = 'fixed';
  dialog.style.top = '0';
  dialog.style.left = '0';
  dialog.style.width = '100vw';
  dialog.style.height = '100vh';
  dialog.style.background = 'rgba(0,0,0,0.35)';
  dialog.style.display = 'flex';
  dialog.style.alignItems = 'center';
  dialog.style.justifyContent = 'center';
  dialog.style.zIndex = '99999';
  dialog.style.backdropFilter = 'blur(2px)';
  const buttonsHtml = cancelText ? 
    `<div style="display:flex;gap:12px;justify-content:center;">
      <button id="dialogCancelBtn" style="background:#6c757d;color:#fff;padding:10px 28px;border:none;border-radius:8px;font-size:1em;cursor:pointer;font-weight:600;transition:background 0.2s ease;">${cancelText}</button>
      <button id="dialogConfirmBtn" style="background:#1976d2;color:#fff;padding:10px 28px;border:none;border-radius:8px;font-size:1em;cursor:pointer;font-weight:600;transition:background 0.2s ease;">${confirmText}</button>
    </div>` :
    `<button id="dialogConfirmBtn" style="background:#1976d2;color:#fff;padding:10px 28px;border:none;border-radius:8px;font-size:1em;cursor:pointer;font-weight:600;transition:background 0.2s ease;">${confirmText}</button>`;
  dialog.innerHTML = `
    <div style="background:#fff;max-width:450px;width:90vw;padding:30px 24px 20px 24px;border-radius:16px;box-shadow:0 8px 40px rgba(0,0,0,0.2);text-align:center;position:relative;animation:dialogSlideIn 0.3s ease-out;">
      <div style="margin-bottom:16px;">${iconHtml || ''}</div>
      <div style="font-size:1.25em;font-weight:700;margin-bottom:12px;color:#333;">${title}</div>
      <div style="font-size:1em;color:#555;margin-bottom:24px;line-height:1.5;white-space:pre-line;">${message}</div>
      ${buttonsHtml}
    </div>
    <style>
      @keyframes dialogSlideIn {
        from { transform: translateY(-20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      #dialogConfirmBtn:hover {
        background: #1565c0 !important;
      }
      #dialogCancelBtn:hover {
        background: #5a6268 !important;
      }
    </style>
  `;
  document.body.appendChild(dialog);
  document.body.style.overflow = 'hidden';
  dialog.querySelector('#dialogConfirmBtn').onclick = function() {
    dialog.remove();
    document.body.style.overflow = '';
    if (onConfirm) onConfirm();
  };
  const cancelBtn = dialog.querySelector('#dialogCancelBtn');
  if (cancelBtn) {
    cancelBtn.onclick = function() {
      dialog.remove();
      document.body.style.overflow = '';
      if (onCancel) onCancel();
    };
  }
  if (!cancelText) {
    dialog.onclick = function(e) {
      if (e.target === dialog) {
        dialog.remove();
        document.body.style.overflow = '';
        if (onConfirm) onConfirm();
      }
    };
  }
}

function hideLoadingScreen() {
    console.log('Hiding loading screen and showing gym content');
    loadingScreen.style.opacity = '0';
    setTimeout(() => {
        loadingScreen.style.display = 'none';
        gymContent.style.display = 'block';
        
        // Ensure hero rating is visible
        const heroRating = document.getElementById('hero-rating');
        if (heroRating) {
            heroRating.style.display = 'flex';
            heroRating.style.visibility = 'visible';
            console.log('Hero rating element made visible');
        } else {
            console.error('Hero rating element not found during hideLoadingScreen');
        }
        
        gsap.from('.gym-hero', { opacity: 0, y: 50, duration: 0.8 });
        gsap.from('.gym-nav-tabs', { opacity: 0, y: 30, duration: 0.6, delay: 0.2 });
        gsap.from('.tab-content.active', { opacity: 0, y: 30, duration: 0.6, delay: 0.4 });
        console.log('Loading screen hidden and animations started');
    }, 500);
}

function showSuccess(message) {
    showDialog({
      title: 'Success!',
      message,
      iconHtml: '<i class="fas fa-check-circle" style="color:#22c55e;font-size:2.5em;"></i>',
      confirmText: 'OK'
    });
}

function showError(message) {
    hideLoadingScreen();
    showDialog({
      title: 'Error',
      message,
      iconHtml: '<i class="fas fa-exclamation-triangle" style="color:#e76f51;font-size:2.5em;"></i>',
      confirmText: 'OK'
    });
}

function openInMaps(address) {
    const encodedAddress = encodeURIComponent(address);
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
    window.open(mapsUrl, '_blank');
}

// Back to top functionality
function initializeBackToTop() {
    const backToTopBtn = document.getElementById('back-to-top');
    
    window.addEventListener('scroll', () => {
        if (window.pageYOffset > 300) {
            backToTopBtn.classList.add('show');
        } else {
            backToTopBtn.classList.remove('show');
        }
    });
    
    backToTopBtn.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}

// Keyboard navigation for modals
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        // Close any open modal
        const openModal = document.querySelector('.modal[style*="display: block"]');
        if (openModal) {
            closeModal(openModal.id);
        }
    }
    
    // Photo navigation with arrow keys
    if (document.getElementById('photo-modal').style.display === 'block') {
        if (e.key === 'ArrowLeft') {
            navigatePhoto(-1);
        } else if (e.key === 'ArrowRight') {
            navigatePhoto(1);
        }
    }
});

// ===============================================
// STANDARDIZED LOGIN PROMPT
// ===============================================

/**
 * Shows a standardized login prompt modal
 * @param {string} feature - The feature name requiring login (e.g., 'trial booking', 'chat', 'offers')
 */
function showStandardLoginPrompt(feature = 'this feature') {
    // Store current page URL for redirect after login
    const currentUrl = window.location.href;
    localStorage.setItem('redirectAfterLogin', currentUrl);
    
    const loginModal = document.createElement('div');
    loginModal.className = 'modal';
    loginModal.style.display = 'flex';
    loginModal.innerHTML = `
        <div class="modal-content" style="max-width: 450px; max-height: 90vh; overflow-y: auto;">
            <div class="modal-header" style="padding: 20px; border-bottom: 1px solid #eee;">
                <h3 style="margin: 0; display: flex; align-items: center; gap: 10px; font-size: 1.3rem;">
                    <i class="fas fa-sign-in-alt" style="color: var(--primary-color);"></i>
                    Login Required
                </h3>
            </div>
            <div class="modal-body" style="padding: 25px;">
                <p style="margin: 0 0 20px 0; color: #555; line-height: 1.6;">
                    Please login to your account to use ${feature}.
                </p>
                <div style="margin: 0 0 25px 0; background: #f8f9fa; padding: 15px; border-radius: 8px;">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                        <i class="fas fa-dumbbell" style="color: var(--primary-color); font-size: 1.1rem; width: 20px;"></i>
                        <span style="color: #333; font-size: 0.95rem;">Access exclusive gym features</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                        <i class="fas fa-gift" style="color: var(--primary-color); font-size: 1.1rem; width: 20px;"></i>
                        <span style="color: #333; font-size: 0.95rem;">Claim special offers</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <i class="fas fa-comments" style="color: var(--primary-color); font-size: 1.1rem; width: 20px;"></i>
                        <span style="color: #333; font-size: 0.95rem;">Chat with gym administrators</span>
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
    `;
    document.body.appendChild(loginModal);
}

// ===============================================
// REVIEWS FUNCTIONALITY
// ===============================================

// Reviews functionality
let currentGymId = null;
let userToken = null;

// === USER PROFILE IMAGE FETCH FOR NAVBAR ===
document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("token");
    const userNav = document.getElementById("user-profile-nav");
    const loginNav = document.getElementById("login-signup-nav");

    // Default states
    if (userNav) userNav.style.display = "none";
    if (loginNav) loginNav.style.display = "none";

    if (!token) {
        if (loginNav) loginNav.style.display = "block";
        return;
    }

    // Try to fetch user profile if token exists
    fetch(`${BASE_URL}/api/users/profile`, {
        method: 'GET',
        headers: {
            'Content-Type': "application/json",
            'Authorization': `Bearer ${token}`
        }
    })
    .then(async (res) => {
        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Server responded with ${res.status}: ${errText}`);
        }
        return res.json();
    })
    .then(user => {
        updateProfileIconImage(user);
        if (userNav) userNav.style.display = "block";
        if (loginNav) loginNav.style.display = "none";
    })
    .catch(error => {
        console.error("Error fetching user:", error.message);
        if (loginNav) loginNav.style.display = "block";
    });
});
// Check if user is logged in and get user info
async function checkUserLogin() {
    userToken = localStorage.getItem('authToken') || localStorage.getItem('token');
    const username = localStorage.getItem('username');
    
    console.log('Checking user login...');
    console.log('Token found:', !!userToken);
    console.log('Username found:', username);
    
    if (!userToken) {
        console.log('No token found, user not logged in');
        return { isLoggedIn: false };
    }
    
    try {
        console.log('Making API call to verify token...');
        // Fetch user profile to get current user info
        const response = await fetch(`${BASE_URL}/api/users/profile`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userToken}`
            }
        });
        
        console.log('API response status:', response.status);
        console.log('API response ok:', response.ok);
        
        if (response.ok) {
            const user = await response.json();
            console.log('User data received:', user);
            updateProfileIconImage(user); // <-- update profile icon
            
            // Create full name from firstName and lastName with robust handling
            const firstName = (user.firstName || '').trim();
            const lastName = (user.lastName || '').trim();
            const username = (user.username || '').trim();
            
            let displayName = 'User'; // Default fallback
            if (firstName || lastName) {
                displayName = [firstName, lastName].filter(Boolean).join(' ').trim();
            } else if (username) {
                displayName = username;
            }
            
            console.log('Final display name:', displayName);
            
            return {
                isLoggedIn: true,
                user: user,
                name: displayName
            };
        } else {
            console.log('Token verification failed, removing invalid tokens');
            // Token might be invalid
            localStorage.removeItem('authToken');
            localStorage.removeItem('token');
            localStorage.removeItem('username');
            return { isLoggedIn: false };
        }
    } catch (error) {
        console.error('Error checking user login:', error);
        return { isLoggedIn: false };
    }
}

// Star rating functionality
function initializeStarRating() {
    const stars = document.querySelectorAll('#star-rating i');
    const ratingValue = document.getElementById('rating-value');
    
    if (!stars.length || !ratingValue) return;
    
    stars.forEach((star, index) => {
        star.addEventListener('click', () => {
            const rating = index + 1;
            ratingValue.value = rating;
            
            // Update star display
            stars.forEach((s, i) => {
                if (i < rating) {
                    s.classList.add('active');
                } else {
                    s.classList.remove('active');
                }
            });
        });
        
        star.addEventListener('mouseover', () => {
            const rating = index + 1;
            stars.forEach((s, i) => {
                if (i < rating) {
                    s.style.color = '#ffd700';
                } else {
                    s.style.color = '#ddd';
                }
            });
        });
    });
    
    // Reset on mouse leave
    const starRating = document.getElementById('star-rating');
    if (starRating) {
        starRating.addEventListener('mouseleave', () => {
            const currentRating = parseInt(ratingValue.value) || 0;
            stars.forEach((s, i) => {
                if (i < currentRating) {
                    s.style.color = '#ffd700';
                    s.classList.add('active');
                } else {
                    s.style.color = '#ddd';
                    s.classList.remove('active');
                }
            });
        });
    }
}

// Load gym reviews
async function loadGymReviews() {
    if (!currentGymId) {
        console.error('No currentGymId available for loading reviews');
        return;
    }
    
    console.log('Loading reviews for gym:', currentGymId);
    
    const reviewsList = document.getElementById('reviews-list');
    const loadingElement = document.getElementById('reviews-loading');
    const noReviewsElement = document.getElementById('no-reviews');
    
    if (!reviewsList) {
        console.error('reviews-list element not found');
        return;
    }
    
    // Show loading
    if (loadingElement) loadingElement.style.display = 'block';
    if (noReviewsElement) noReviewsElement.style.display = 'none';
    
    try {
        const response = await fetch(`${BASE_URL}/api/reviews/gym/${currentGymId}`);
        console.log('Reviews API response status:', response.status);
        
        const data = await response.json();
        console.log('Reviews API response data:', data);
        
        if (data.success) {
            displayReviews(data.reviews);
            updateRatingOverview(data.reviews);
        } else {
            console.error('Reviews API returned success:false:', data.message);
            showNoReviews();
        }
    } catch (error) {
        console.error('Error loading reviews:', error);
        showNoReviews();
    } finally {
        if (loadingElement) loadingElement.style.display = 'none';
    }
}

// Display reviews
function displayReviews(reviews) {
    const reviewsList = document.getElementById('reviews-list');
    const noReviewsElement = document.getElementById('no-reviews');
    
    console.log('Displaying reviews:', reviews);
    
    if (!reviewsList) {
        console.error('reviews-list element not found');
        return;
    }
    
    if (!reviews || reviews.length === 0) {
        console.log('No reviews to display, showing no-reviews message');
        showNoReviews();
        return;
    }
    
    if (noReviewsElement) noReviewsElement.style.display = 'none';
    
    const reviewsHTML = reviews.map(review => {
        console.log('🔍 Processing review in gymdetails:', {
            reviewId: review._id || review.id,
            user: review.user,
            userId: review.userId,
            reviewerName: review.reviewerName,
            userImagePath: getUserImageUrl(review),
            userName: getUserNameFromReview(review)
        });
        
        const reviewDate = new Date(review.createdAt).toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric'
        });
        const stars = generateStars(review.rating);
        let adminReplyHTML = '';
        const hasReply = review.adminReply && review.adminReply.reply && review.adminReply.reply !== 'undefined' && review.adminReply.reply !== null && review.adminReply.reply.trim() !== '';
        if (hasReply) {
            const replyDate = new Date(review.adminReply.repliedAt).toLocaleDateString('en-US', {
                year: 'numeric', month: 'long', day: 'numeric'
            });
            
            // Get gym logo and name from current gym data
            let gymLogo = '/frontend/gymadmin/admin.png'; // Default fallback
            let gymName = 'Gym Admin'; // Default fallback
            
            if (currentGym) {
                // Handle different possible logo URL formats
                if (currentGym.logoUrl) {
                    if (currentGym.logoUrl.startsWith('http')) {
                        gymLogo = currentGym.logoUrl;
                    } else {
                        gymLogo = currentGym.logoUrl.startsWith('/') ? 
                            `${BASE_URL}${currentGym.logoUrl}` : 
                            `${BASE_URL}/${currentGym.logoUrl}`;
                    }
                }
                
                // Get gym name
                gymName = currentGym.gymName || currentGym.name || 'Gym Admin';
            }
            
            adminReplyHTML = `
                <div class="admin-reply" style="border-left: 3px solid #1976d2; padding-left: 16px; background: white; padding: 12px 16px; border-radius: 4px; margin-top: 12px;">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                        <img src="${gymLogo}" alt="Gym Admin Logo" style="width:32px;height:32px;border-radius:50%;object-fit:cover;border:2px solid #1976d2;" 
                             onerror="this.src='/frontend/gymadmin/admin.png';" />
                        <strong style="color: #1976d2; font-size: 13px;">${gymName}</strong>
                        <span style="font-size: 12px; color: #999;">${replyDate}</span>
                    </div>
                    <div class="admin-reply-text" style="margin: 0; color: #444; font-size: 13px; line-height: 1.4;">${review.adminReply.reply}</div>
                </div>
            `;
        }
        return `
            <div class="review-item ${review.isFeatured ? 'featured-review' : ''}">
                <div class="review-header">
                    <div class="reviewer-info">
                        <img src="${getUserImageUrl(review)}" alt="User" class="reviewer-avatar" 
                             onerror="this.src='${BASE_URL}/uploads/profile-pics/default.png';" />
                        <div class="reviewer-details">
                            <div class="reviewer-name">${getUserNameFromReview(review)}</div>
                            <div class="review-date">${reviewDate}</div>
                            ${review.isFeatured ? '<span class="featured-review-label"><i class="fas fa-star"></i> Featured Review</span>' : ''}
                        </div>
                    </div>
                    <div class="review-rating">
                        <div class="review-stars">${stars}</div>
                    </div>
                </div>
                <div class="review-comment">${review.comment || 'No comment provided'}</div>
                ${adminReplyHTML}
            </div>
        `;
    }).join('');
    
    // Remove loading element if exists
    const loadingElement = document.getElementById('reviews-loading');
    if (loadingElement) loadingElement.style.display = 'none';
    
    reviewsList.innerHTML = reviewsHTML;
    console.log('Reviews displayed successfully');
}

// Show no reviews message
function showNoReviews() {
    console.log('Showing no reviews message');
    const reviewsList = document.getElementById('reviews-list');
    const noReviewsElement = document.getElementById('no-reviews');
    
    if (reviewsList) {
        reviewsList.innerHTML = '';
    }
    
    if (noReviewsElement) {
        noReviewsElement.style.display = 'block';
        console.log('No reviews element shown');
    } else {
        console.error('No reviews element not found');
    }
}

// Generate star HTML
function generateStars(rating) {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= rating) {
            stars += '<i class="fas fa-star"></i>';
        } else {
            stars += '<i class="far fa-star"></i>';
        }
    }
    return stars;
}

// Update rating overview
function updateRatingOverview(reviews) {
    if (!reviews || reviews.length === 0) {
        const mainRatingValue = document.getElementById('main-rating-value');
        const mainRatingDescription = document.getElementById('main-rating-description');
        
        if (mainRatingValue) mainRatingValue.textContent = '0.0';
        if (mainRatingDescription) mainRatingDescription.textContent = 'No reviews yet';
        updateHeroRating(0, 0);
        return;
    }
    
    const totalReviews = reviews.length;
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / totalReviews;
    
    // Update main rating display
    const mainRatingValue = document.getElementById('main-rating-value');
    const mainRatingDescription = document.getElementById('main-rating-description');
    const mainStars = document.getElementById('main-rating-stars');
    
    if (mainRatingValue) mainRatingValue.textContent = averageRating.toFixed(1);
    if (mainRatingDescription) mainRatingDescription.textContent = `Based on ${totalReviews} review${totalReviews !== 1 ? 's' : ''}`;
    if (mainStars) mainStars.innerHTML = generateStars(Math.round(averageRating));
    
    // Update rating breakdown
    const ratingCounts = [0, 0, 0, 0, 0]; // Index 0 = 1 star, Index 4 = 5 stars
    reviews.forEach(review => {
        ratingCounts[review.rating - 1]++;
    });
    
    ratingCounts.reverse().forEach((count, index) => {
        const starRating = 5 - index;
        const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
        
        const ratingBar = document.querySelector(`[data-rating="${starRating}"]`);
        if (ratingBar) {
            const barFill = ratingBar.querySelector('.bar-fill');
            const barCount = ratingBar.querySelector('.bar-count');
            
            if (barFill) barFill.style.width = percentage + '%';
            if (barCount) barCount.textContent = count;
        }
    });
    
    // Update hero section rating
    updateHeroRating(averageRating, totalReviews);
}

// Update hero section rating
function updateHeroRating(averageRating, totalReviews) {
    console.log('Updating hero rating:', averageRating, totalReviews);
    
    const heroRating = document.getElementById('hero-rating');
    const heroRatingValue = document.getElementById('hero-rating-value');
    const heroRatingCount = document.getElementById('hero-rating-count');
    const heroRatingStars = document.getElementById('hero-rating-stars');
    
    console.log('Hero rating elements found:', {
        heroRating: !!heroRating,
        heroRatingValue: !!heroRatingValue,
        heroRatingCount: !!heroRatingCount,
        heroRatingStars: !!heroRatingStars
    });
    
    if (heroRating) {
        // Always show the rating display
        heroRating.style.display = 'flex';
        heroRating.style.visibility = 'visible';
        
        if (totalReviews > 0) {
            if (heroRatingValue) heroRatingValue.textContent = averageRating.toFixed(1);
            if (heroRatingCount) heroRatingCount.textContent = `(${totalReviews} review${totalReviews !== 1 ? 's' : ''})`;
            if (heroRatingStars) heroRatingStars.innerHTML = generateStars(Math.round(averageRating));
        } else {
            if (heroRatingValue) heroRatingValue.textContent = '0.0';
            if (heroRatingCount) heroRatingCount.textContent = '(No reviews yet)';
            if (heroRatingStars) heroRatingStars.innerHTML = generateStars(0);
        }
        
        console.log('Hero rating updated successfully');
    } else {
        console.error('Hero rating element not found');
    }
}

// Modal functionality
function initializeReviewModal() {
    const modal = document.getElementById('write-review-modal');
    const writeReviewBtn = document.getElementById('write-review-btn');
    const closeModal = document.getElementById('close-review-modal');
    const reviewForm = document.getElementById('review-form');
    const loginNotice = document.getElementById('login-notice');
    const userInfo = document.getElementById('user-info');
    
    console.log('Initializing review modal...');
    console.log('Modal elements found:', {
        modal: !!modal,
        writeReviewBtn: !!writeReviewBtn,
        closeModal: !!closeModal,
        reviewForm: !!reviewForm,
        loginNotice: !!loginNotice,
        userInfo: !!userInfo
    });
    
    if (!modal || !writeReviewBtn) {
        console.error('Required modal elements not found!');
        return;
    }
    
    // Open modal
    writeReviewBtn.addEventListener('click', async () => {
        console.log('Write review button clicked, checking user login...');
        const userStatus = await checkUserLogin();
        
        console.log('User login status:', userStatus);
        
        if (userStatus.isLoggedIn) {
            console.log('User is logged in, showing modal with user info');
            
            // Hide login notice and show user info
            if (loginNotice) {
                loginNotice.style.display = 'none';
                console.log('Login notice hidden');
            }
            if (userInfo) {
                userInfo.style.display = 'flex';
                console.log('User info shown');
                const userNameSpan = document.getElementById('review-user-name');
                if (userNameSpan) {
                    userNameSpan.textContent = userStatus.name;
                    console.log('User name set to:', userStatus.name);
                }
            }
            
            // Show the modal
            modal.style.display = 'block';
            console.log('Modal opened for logged-in user');
        } else {
            console.log('User is not logged in, showing login dialog');
            // Show login dialog
            showDialog({
                title: 'Login Required',
                message: 'You need to login to submit a review.\n\nWould you like to go to the login page now?',
                iconHtml: '<i class="fas fa-user-lock" style="color:#2196F3;font-size:2.5em;"></i>',
                confirmText: 'Go to Login',
                cancelText: 'Cancel',
                onConfirm: () => {
                    window.location.href = '/frontend/public/login.html';
                }
            });
        }
    });
    
    // Close modal
    if (closeModal) {
        closeModal.addEventListener('click', () => {
            modal.style.display = 'none';
            resetReviewForm();
        });
    }
    
    // Close modal when clicking outside
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
            resetReviewForm();
        }
    });
    
    // Handle form submission
    if (reviewForm) {
        reviewForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            await submitReview();
        });
    }
}

// Reset review form
function resetReviewForm() {
    const reviewForm = document.getElementById('review-form');
    const ratingValue = document.getElementById('rating-value');
    const stars = document.querySelectorAll('#star-rating i');
    
    if (reviewForm) reviewForm.reset();
    if (ratingValue) ratingValue.value = '';
    
    stars.forEach(star => {
        star.classList.remove('active');
        star.style.color = '#ddd';
    });
}

// Submit review
async function submitReview() {
    const userStatus = await checkUserLogin();
    
    if (!userStatus.isLoggedIn) {
        showDialog({
            title: 'Login Required',
            message: 'Please login to submit a review.\n\nWould you like to go to the login page now?',
            iconHtml: '<i class="fas fa-user-lock" style="color:#2196F3;font-size:2.5em;"></i>',
            confirmText: 'Go to Login',
            cancelText: 'Cancel',
            onConfirm: () => {
                window.location.href = '/frontend/public/login.html';
            }
        });
        return;
    }
    
    const formData = new FormData(document.getElementById('review-form'));
    const reviewData = {
        gymId: currentGymId,
        reviewerName: userStatus.name,
        rating: parseInt(formData.get('rating')),
        comment: formData.get('comment')
    };
    
    console.log('Submitting review data:', reviewData);
    
    if (!reviewData.rating) {
        showDialog({
            title: 'Rating Required',
            message: 'Please select a rating before submitting your review.',
            iconHtml: '<i class="fas fa-star" style="color:#ffd700;font-size:2.5em;"></i>',
            confirmText: 'OK'
        });
        return;
    }
    
    const submitBtn = document.getElementById('submit-review-btn');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';
    }
    
    try {
        const response = await fetch(`${BASE_URL}/api/reviews`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userToken}`
            },
            body: JSON.stringify(reviewData)
        });
        
        console.log('Review submission response status:', response.status);
        const data = await response.json();
        console.log('Review submission response data:', data);
        
        if (response.ok && data.success) {
            showDialog({
                title: 'Review Submitted!',
                message: 'Thank you for your review! It has been submitted successfully and will help other users make informed decisions.',
                iconHtml: '<i class="fas fa-check-circle" style="color:#22c55e;font-size:2.5em;"></i>',
                confirmText: 'OK',
                onConfirm: () => {
                    const modal = document.getElementById('write-review-modal');
                    if (modal) modal.style.display = 'none';
                    resetReviewForm();
                    loadGymReviews(); // Refresh reviews
                    loadGymRatingForHero(currentGymId); // Refresh hero rating
                }
            });
        } else {
            // Handle specific error cases
            let errorMessage = data.message || 'Unknown error occurred';
            
            if (response.status === 400 && errorMessage.includes('already reviewed')) {
                errorMessage = 'You have already submitted a review for this gym.\n\nWould you like to view your existing review in the reviews section?';
                showDialog({
                    title: 'Review Already Submitted',
                    message: errorMessage,
                    iconHtml: '<i class="fas fa-info-circle" style="color:#2196F3;font-size:2.5em;"></i>',
                    confirmText: 'View Reviews',
                    cancelText: 'Close',
                    onConfirm: () => {
                        const modal = document.getElementById('write-review-modal');
                        if (modal) modal.style.display = 'none';
                        resetReviewForm();
                        switchTab('reviews'); // Switch to reviews tab
                    }
                });
            } else {
                showDialog({
                    title: 'Submission Failed',
                    message: `Error submitting review: ${errorMessage}\n\nPlease try again or contact support if the problem persists.`,
                    iconHtml: '<i class="fas fa-exclamation-triangle" style="color:#e76f51;font-size:2.5em;"></i>',
                    confirmText: 'OK'
                });
            }
        }
    } catch (error) {
        console.error('Error submitting review:', error);
        showDialog({
            title: 'Network Error',
            message: 'Unable to submit review due to a network error.\n\nPlease check your internet connection and try again.',
            iconHtml: '<i class="fas fa-wifi" style="color:#e76f51;font-size:2.5em;"></i>',
            confirmText: 'OK'
        });
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit Review';
        }
    }
}

// Initialize reviews functionality
function initializeReviews() {
    // Set the current gym ID
    currentGymId = getGymIdFromUrl();
    
    // Initialize components
    initializeStarRating();
    initializeReviewModal();
}

// Load gym rating for hero section
async function loadGymRatingForHero(gymId) {
    console.log('Loading gym rating for hero section, gymId:', gymId);
    try {
        const response = await fetch(`${BASE_URL}/api/reviews/gym/${gymId}/average`);
        console.log('Rating API response status:', response.status);
        
        const data = await response.json();
        console.log('Rating API response data:', data);
        
        if (data.success) {
            console.log('Updating hero rating with:', data.averageRating, data.totalReviews);
            updateHeroRating(data.averageRating || 0, data.totalReviews || 0);
        } else {
            console.log('Rating API returned success:false, using defaults');
            updateHeroRating(0, 0);
        }
    } catch (error) {
        console.error('Error loading gym rating:', error);
        updateHeroRating(0, 0);
    }
}

// Load and display featured reviews as floating badges
// Helper function to get user image URL
function getUserImageUrl(review) {
    try {
        // Primary: Check user field (populated from backend) - same pattern as support-reviews.js
        if (review.user && review.user.profileImage) {
            // Handle different URL formats like in script.js
            if (review.user.profileImage.startsWith('http')) {
                return review.user.profileImage;
            } else {
                // Ensure proper BASE_URL prefix
                return `${BASE_URL}${review.user.profileImage}`;
            }
        }
        
        // Fallback: Check userId field if user is not populated (legacy support)
        if (review.userId && review.userId.profileImage) {
            if (review.userId.profileImage.startsWith('http')) {
                return review.userId.profileImage;
            } else if (review.userId.profileImage.startsWith('/uploads')) {
                return `${BASE_URL}${review.userId.profileImage}`;
            } else {
                return `${BASE_URL}/uploads/profile-pics/${review.userId.profileImage}`;
            }
        }
        
        return `${BASE_URL}/uploads/profile-pics/default.png`;
    } catch (error) {
        console.error('Error getting user image URL:', error);
        return `${BASE_URL}/uploads/profile-pics/default.png`;
    }
}

// Helper function to get user name from review
function getUserNameFromReview(review) {
    try {
        // Primary: Check user field (populated from backend) - same pattern as support-reviews.js
        if (review.user) {
            // Combine first and last name if available
            if (review.user.firstName || review.user.lastName) {
                const firstName = review.user.firstName || '';
                const lastName = review.user.lastName || '';
                const fullName = `${firstName} ${lastName}`.trim();
                if (fullName) return fullName;
            }
            // Fallback to name field if available
            if (review.user.name) {
                return review.user.name;
            }
        }
        
        // Fallback: Check userId field if user is not populated (legacy support)
        if (review.userId && (review.userId.firstName || review.userId.lastName)) {
            const firstName = review.userId.firstName || '';
            const lastName = review.userId.lastName || '';
            const fullName = `${firstName} ${lastName}`.trim();
            if (fullName) return fullName;
        }
        
        return review.reviewerName || 'Anonymous User';
    } catch (error) {
        console.error('Error getting user name:', error);
        return 'Anonymous User';
    }
}

// Helper function to get gym image URL from review
function getGymImageUrl(review) {
    try {
        // First try to get gym info from the review's gym reference
        if (review.gymId && review.gymId.logoUrl) {
            if (review.gymId.logoUrl.startsWith('http')) {
                return review.gymId.logoUrl;
            } else if (review.gymId.logoUrl.startsWith('/uploads')) {
                return BASE_URL + review.gymId.logoUrl;
            } else {
                return `${BASE_URL}/uploads/gym-logos/${review.gymId.logoUrl}`;
            }
        }
        
        // Fallback to current gym data
        if (currentGym && currentGym.logoUrl) {
            if (currentGym.logoUrl.startsWith('http')) {
                return currentGym.logoUrl;
            } else if (currentGym.logoUrl.startsWith('/')) {
                return `${BASE_URL}${currentGym.logoUrl}`;
            } else {
                return `${BASE_URL}/${currentGym.logoUrl}`;
            }
        }
        
        return `${BASE_URL}/uploads/gym-logos/default.png`;
    } catch (error) {
        console.error('Error getting gym image URL:', error);
        return `${BASE_URL}/uploads/gym-logos/default.png`;
    }
}

// Helper function to get gym name from review
function getGymNameFromReview(review) {
    try {
        if (review.gymId && (review.gymId.gymName || review.gymId.name)) {
            return review.gymId.gymName || review.gymId.name;
        }
        
        // Fallback to current gym data
        if (currentGym) {
            return currentGym.gymName || currentGym.name || 'Gym Admin';
        }
        
        return 'Gym Admin';
    } catch (error) {
        console.error('Error getting gym name:', error);
        return 'Gym Admin';
    }
}

async function loadFeaturedReviews(gymId) {
    console.log('Loading featured reviews for gym:', gymId);
    try {
        const response = await fetch(`${BASE_URL}/api/reviews/gym/${gymId}/featured`);
        console.log('Featured reviews API response status:', response.status);
        
        const data = await response.json();
        console.log('Featured reviews API response data:', data);
        
        if (data.success && data.reviews.length > 0) {
            displayFeaturedReviewsBadges(data.reviews);
        } else {
            console.log('No featured reviews found');
        }
    } catch (error) {
        console.error('Error loading featured reviews:', error);
    }
}

// Display featured reviews as floating badges
function displayFeaturedReviewsBadges(featuredReviews) {
    // Remove existing badges if any
    const existingBadges = document.querySelectorAll('.featured-review-badge');
    existingBadges.forEach(badge => badge.remove());
    
    // Create container for badges if it doesn't exist
    let badgesContainer = document.getElementById('featured-reviews-badges');
    if (!badgesContainer) {
        badgesContainer = document.createElement('div');
        badgesContainer.id = 'featured-reviews-badges';
        badgesContainer.className = 'featured-reviews-badges';
        document.body.appendChild(badgesContainer);
        
        // Add CSS styles for the sliding animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideInFromRight {
                from { 
                    transform: translateX(100px); 
                    opacity: 0; 
                }
                to { 
                    transform: translateX(0); 
                    opacity: 1; 
                }
            }
            
            .featured-review-badge:hover {
                transform: translateX(-5px) !important;
                box-shadow: 0 3px 12px rgba(255, 215, 0, 0.3) !important;
            }
            
            /* Ensure badges don't interfere with navbar dropdowns */
            .featured-review-badge {
                position: relative;
                z-index: 100 !important;
            }
            
            /* Make badges responsive */
            @media (max-width: 768px) {
                #featured-reviews-badges {
                    right: 10px !important;
                    top: 100px !important;
                    max-width: 200px !important;
                }
                
                .featured-review-badge {
                    font-size: 10px !important;
                    padding: 6px 8px !important;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Add CSS styles for badges container
    badgesContainer.style.cssText = `
        position: fixed;
        top: 120px;
        right: 20px;
        z-index: 100;
        display: flex;
        flex-direction: column;
        gap: 8px;
        max-width: 250px;
        pointer-events: none;
    `;
    
    // Create badges for each featured review
    featuredReviews.slice(0, 3).forEach((review, index) => {
        const badge = createFeaturedReviewBadge(review, index);
        badgesContainer.appendChild(badge);
    });
}

// Create individual featured review badge
function createFeaturedReviewBadge(review, index) {
    const badge = document.createElement('div');
    badge.className = 'featured-review-badge';
    
    // Get user name (handle both data structures)
    const userName = review.user ? 
        (review.user.firstName && review.user.lastName ? 
            `${review.user.firstName} ${review.user.lastName}` : 
            review.user.name) || 'Anonymous' :
        review.reviewerName || 'Anonymous';
    
    // Generate stars
    const stars = Array.from({length: 5}, (_, i) => 
        `<i class="fas fa-star" style="color: ${i < review.rating ? '#FFD700' : '#ddd'}; font-size: 12px;"></i>`
    ).join('');
    
    // Truncate comment if too long
    const comment = review.comment.length > 60 ? 
        review.comment.substring(0, 57) + '...' : 
        review.comment;
    
    badge.innerHTML = `
        <div class="featured-badge-content">
            <div class="featured-badge-header">
                <div class="featured-badge-icon">
                    <i class="fas fa-star"></i>
                </div>
                <div class="featured-badge-info">
                    <div class="featured-badge-title">Featured Review</div>
                    <div class="featured-badge-rating">${stars}</div>
                </div>
            </div>
            <div class="featured-badge-review">
                <div class="featured-badge-user">${userName}</div>
                <div class="featured-badge-comment">"${comment}"</div>
            </div>
        </div>
    `;
    
    // Add CSS styles for individual badge
    badge.style.cssText = `
        background: linear-gradient(135deg, #fff 0%, #f8f9fa 100%);
        border: 2px solid #FFD700;
        border-radius: 8px;
        padding: 8px 10px;
        box-shadow: 0 2px 8px rgba(255, 215, 0, 0.2);
        animation: slideInFromRight 0.6s ease-out ${index * 0.2}s both;
        pointer-events: auto;
        cursor: pointer;
        transition: transform 0.3s ease, box-shadow 0.3s ease;
        font-family: 'Arial', sans-serif;
        font-size: 11px;
        max-width: 240px;
        z-index: 100;
    `;
    
    // Add hover effect
    badge.addEventListener('mouseenter', () => {
        badge.style.transform = 'translateX(-3px)';
        badge.style.boxShadow = '0 3px 12px rgba(255, 215, 0, 0.3)';
    });
    
    badge.addEventListener('mouseleave', () => {
        badge.style.transform = 'translateX(0)';
        badge.style.boxShadow = '0 2px 8px rgba(255, 215, 0, 0.2)';
    });
    
    // Click to scroll to reviews section
    badge.addEventListener('click', () => {
        switchTab('reviews');
        const reviewsTab = document.getElementById('reviews-tab');
        if (reviewsTab) {
            reviewsTab.scrollIntoView({ behavior: 'smooth' });
        }
    });
    
    return badge;
}

// Utility to get full profile image URL (same logic as script.js)
function getProfileImageUrl(profileImage) {
    if (!profileImage) return `${BASE_URL}/uploads/profile-pics/default.png`;
    if (profileImage.startsWith('http')) return profileImage;
    return `${BASE_URL}${profileImage}`;
}

// Example usage in gymdetails.js (replace wherever you set profile-icon-img)
function updateProfileIconImage(user) {
    const userIconImage = document.getElementById('profile-icon-img');
    if (userIconImage) {
        let profilePicUrl = getProfileImageUrl(user.profileImage);
        userIconImage.src = profilePicUrl;
    }
}

// Function to refresh trial limits after booking
async function refreshTrialLimitsAfterBooking() {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    try {
        console.log('Refreshing trial limits data...');
        
        // Clear any cached trial status info from the modal
        const existingInfo = document.querySelector('#trial-booking-modal .trial-status-info');
        if (existingInfo) {
            existingInfo.remove();
        }
        
        console.log('Trial limits refresh completed');
    } catch (error) {
        console.error('Error refreshing trial limits:', error);
    }
}

// ===============================================
// REPORT ISSUE / GRIEVANCE SYSTEM
// ===============================================

// Open Report Issue Modal
function openReportIssueModal() {
    const token = localStorage.getItem('token');
    
    if (!token) {
        showStandardLoginPrompt('report an issue');
        return;
    }
    
    const modal = document.getElementById('report-issue-modal');
    if (!modal) {
        console.error('Report issue modal not found');
        return;
    }
    
    // Reset form
    const form = document.getElementById('report-issue-form');
    if (form) form.reset();
    
    // Auto-fill user data if available
    autoFillReportUserInfo();
    
    // Reset character counts
    document.getElementById('subject-count').textContent = '0';
    document.getElementById('description-count').textContent = '0';
    
    modal.style.display = 'flex';
    console.log('📋 Report issue modal opened');
}

// Close Report Modal
function closeReportModal() {
    const modal = document.getElementById('report-issue-modal');
    if (modal) modal.style.display = 'none';
}

// Auto-fill user information in report form
async function autoFillReportUserInfo() {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    try {
        const response = await fetch(`${BASE_URL}/api/users/profile`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const userData = await response.json();
            
            // Fill contact number
            const contactInput = document.getElementById('issue-contact');
            if (contactInput && userData.phone) {
                contactInput.value = userData.phone;
            }
            
            // Fill email
            const emailInput = document.getElementById('issue-email');
            if (emailInput && userData.email) {
                emailInput.value = userData.email;
            }
            
            console.log('✅ User info auto-filled in report form');
        }
    } catch (error) {
        console.log('ℹ️ Could not auto-fill user info:', error.message);
    }
}

// Handle Report Form Submission
document.addEventListener('DOMContentLoaded', function() {
    // Character counter for subject
    const subjectInput = document.getElementById('issue-subject');
    if (subjectInput) {
        subjectInput.addEventListener('input', function() {
            document.getElementById('subject-count').textContent = this.value.length;
        });
    }
    
    // Character counter for description
    const descriptionInput = document.getElementById('issue-description');
    if (descriptionInput) {
        descriptionInput.addEventListener('input', function() {
            document.getElementById('description-count').textContent = this.value.length;
        });
    }
    
    // Form submission
    const reportForm = document.getElementById('report-issue-form');
    if (reportForm) {
        reportForm.addEventListener('submit', handleReportSubmission);
    }
    
    // Close modal handlers
    const closeReportBtn = document.getElementById('close-report-modal');
    if (closeReportBtn) {
        closeReportBtn.addEventListener('click', closeReportModal);
    }
    
    // Success modal OK button
    const successOkBtn = document.getElementById('report-success-ok-btn');
    if (successOkBtn) {
        successOkBtn.addEventListener('click', function() {
            const successModal = document.getElementById('report-success-modal');
            if (successModal) successModal.style.display = 'none';
        });
    }
    
    // Click outside to close
    window.addEventListener('click', function(e) {
        const reportModal = document.getElementById('report-issue-modal');
        const successModal = document.getElementById('report-success-modal');
        
        if (e.target === reportModal) {
            closeReportModal();
        }
        if (e.target === successModal) {
            successModal.style.display = 'none';
        }
    });
});

// Handle Report Form Submission
async function handleReportSubmission(e) {
    e.preventDefault();
    
    const token = localStorage.getItem('token');
    if (!token) {
        showStandardLoginPrompt('submit a report');
        return;
    }
    
    if (!currentGym || !currentGym._id) {
        showError('Gym information not available. Please refresh the page.');
        return;
    }
    
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    
    // Get form data
    const grievanceData = {
        gymId: currentGym._id,
        category: form.category.value,
        priority: form.priority.value,
        subject: form.subject.value.trim(),
        description: form.description.value.trim(),
        contactNumber: form.contactNumber.value.trim(),
        email: form.email.value.trim(),
        status: 'open'
    };
    
    // Validate
    if (!grievanceData.category || !grievanceData.subject || !grievanceData.description) {
        showError('Please fill in all required fields');
        return;
    }
    
    // Disable submit button
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
    }
    
    try {
        console.log('📤 Submitting grievance:', grievanceData);
        
        const response = await fetch(`${BASE_URL}/api/communications/grievances`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(grievanceData)
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            console.log('✅ Grievance submitted successfully:', data);
            
            // Close report modal
            closeReportModal();
            
            // Show success modal with ticket ID
            showReportSuccessModal(data.grievance);
            
            // Reset form
            form.reset();
        } else {
            throw new Error(data.message || 'Failed to submit grievance');
        }
    } catch (error) {
        console.error('❌ Error submitting grievance:', error);
        showError(error.message || 'Failed to submit your report. Please try again.');
    } finally {
        // Re-enable submit button
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Report';
        }
    }
}

// Show Report Success Modal
function showReportSuccessModal(grievance) {
    const modal = document.getElementById('report-success-modal');
    const ticketIdDisplay = document.getElementById('ticket-id-value');
    
    if (!modal) return;
    
    // Generate readable ticket ID
    const ticketId = grievance.ticketId || grievance._id || 'N/A';
    
    if (ticketIdDisplay) {
        ticketIdDisplay.textContent = ticketId;
    }
    
    modal.style.display = 'flex';
    
    console.log('🎟️ Ticket created:', ticketId);
}

