// === LOADING SCREEN ===
document.addEventListener('DOMContentLoaded', function () {
  const loadingScreen = document.getElementById('loading-screen');
  
  // Show loading screen initially
  showLoadingScreen();

  // Hide loading screen after content is loaded
  setTimeout(() => {
    hideLoadingScreen();
  }, 1500); // Show loading for 1.5 seconds

  // Loading screen functions
  function showLoadingScreen() {
    if (loadingScreen) {
      loadingScreen.classList.remove('hidden');
      loadingScreen.style.display = 'flex';
    }
  }

  function hideLoadingScreen() {
    if (loadingScreen) {
      loadingScreen.classList.add('hidden');
      setTimeout(() => {
        loadingScreen.style.display = 'none';
      }, 500);
    }
  }
});

// === NEAR YOU BUTTON FUNCTIONALITY ===
document.addEventListener('DOMContentLoaded', function () {
  const nearYouBtn = document.getElementById('nearYouBtn');
  if (nearYouBtn) {
    nearYouBtn.addEventListener('click', function () {
      if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser.');
        return;
      }
      nearYouBtn.disabled = true;
      nearYouBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Locating...';
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          // Store user location globally for searchGyms
          window.userLocation = { lat, lng };
          // Update the global userLocation variable as well
          userLocation = { lat, lng };
          console.log('User location obtained:', userLocation);
          // Optionally, reverse geocode to get city/pincode (not required for backend search)
          // Trigger searchGyms with location
          searchGyms();
          nearYouBtn.innerHTML = '<i class="fas fa-location-crosshairs"></i> Near You';
          nearYouBtn.disabled = false;
        },
        (err) => {
          console.warn('Geolocation error:', err);
          alert('Unable to fetch your location. Please allow location access or search manually by city/pincode.');
          nearYouBtn.innerHTML = '<i class="fas fa-location-crosshairs"></i> Near You';
          nearYouBtn.disabled = false;
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }
});
// === NAVIGATION BAR: Toggle & Active Link Highlight ===
document.addEventListener('DOMContentLoaded', function () {
  const menuToggle = document.querySelector('.menu-toggle');
  const navLinks = document.querySelector('.nav-links');
  const currentPage = window.location.pathname.split('/').pop() || 'index.html'; // Default to index.html if path is empty

  // Mobile menu toggle
  if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', function () {
      navLinks.classList.toggle('nav-active');
    });
  }

  // Dropdown open/close for mobile
  document.querySelectorAll('.dropdown > a').forEach(function(dropLink) {
    dropLink.addEventListener('click', function(e) {
      // Only activate on mobile
      if (window.innerWidth <= 900) {
        e.preventDefault();
        const parentDropdown = this.parentElement;
        parentDropdown.classList.toggle('open');
        // Close other open dropdowns
        document.querySelectorAll('.dropdown').forEach(function(dd) {
          if (dd !== parentDropdown) dd.classList.remove('open');
        });
      }
    });
  });

  // Active link highlighting
  document.querySelectorAll('.nav-links a').forEach((link) => {
    const linkPage = link.getAttribute('href').split('/').pop();
    if (linkPage === currentPage) {
      link.classList.add('active');
    }
  });
})
function logout() {
  localStorage.removeItem('token'); // only remove token if that's what you're using
  window.location.href = 'index.html';
}

// === HERO SECTION GSAP Animation ===
document.addEventListener("DOMContentLoaded", function () {
  // Check if GSAP is loaded and elements exist before animating
  if (typeof gsap !== 'undefined') {
    if (document.querySelector("#hero-text")) {
      gsap.to("#hero-text", { opacity: 1, duration: 1 });
    }
    if (document.querySelector("#hero-subtext")) {
      gsap.to("#hero-subtext", { opacity: 1, duration: 1 });
    }
    if (document.querySelector(".btn")) {
      gsap.to(".btn", { scale: 1.2, duration: 1 });
    }
  }
});

// === DYNAMIC BASE URL FOR API (works on mobile and desktop) ===
const BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
  ? 'http://localhost:5000' 
  : `${window.location.protocol}//${window.location.hostname}:5000`;
//gym search logic //
// Default location (Delhi) - will be overridden when user allows geolocation
let userLocation = { lat: 28.357353, lng: 77.295289 };

// Haversine formula for calculating distance between two points on Earth
function getDistance(loc1, loc2) {
  // Validate input coordinates
  if (!loc1 || !loc2 || 
      typeof loc1.lat !== 'number' || typeof loc1.lng !== 'number' ||
      typeof loc2.lat !== 'number' || typeof loc2.lng !== 'number') {
    return null; // Return null for invalid coordinates
  }

  const R = 6371; // Earth's radius in kilometers
  const dLat = (loc2.lat - loc1.lat) * Math.PI / 180;
  const dLng = (loc2.lng - loc1.lng) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(loc1.lat * Math.PI / 180) * Math.cos(loc2.lat * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Geocode an address to get lat/lng coordinates
async function geocodeAddress(address, city, state, pincode) {
  try {
    // Build full address string
    const fullAddress = [address, city, state, pincode].filter(Boolean).join(', ');
    
    // Use a geocoding service (you can replace this with your preferred service)
    // This example uses OpenStreetMap Nominatim (free but rate-limited)
    const encodedAddress = encodeURIComponent(fullAddress);
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1`);
    
    if (!response.ok) {
      throw new Error('Geocoding service error');
    }
    
    const data = await response.json();
    
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon)
      };
    }
    
    return null;
  } catch (error) {
    console.warn('Geocoding failed for address:', address, error);
    return null;
  }
}
function searchGyms() {
  // Show loading state
  const resultsDiv = document.getElementById("results");
  resultsDiv.innerHTML = "<p>Searching for gyms...</p>";
  // Hide gym counter until results arrive
  const gymCounter = document.getElementById("gymSearchCounter");
  if (gymCounter) gymCounter.style.display = "none";
  
  // Check if we have user location for distance calculation
  const hasUserLocation = userLocation && userLocation.lat && userLocation.lng;
  if (!hasUserLocation) {
    console.log('Using default location for distance calculation');
  } else {
    console.log('Using actual user location:', userLocation);
  }
  
  // Log location status for debugging
  logLocationStatus();
  
  // Get search parameters from the form
  const city = document.getElementById("city").value.trim();
  const pincode = document.getElementById("pincode").value.trim();
  const maxPrice = document.getElementById("priceRange").value;
  
  // Get selected activities
  const activities = Array.from(document.querySelectorAll(".activity-chip.active"))
    .map(div => div.dataset.activity);


  // Build query parameters
  const params = new URLSearchParams();
  if (city) params.append('city', city);
  if (pincode) params.append('pincode', pincode);
  if (maxPrice) params.append('maxPrice', maxPrice);
  activities.forEach(activity => params.append('activities', activity));

  // Make the API call with query parameters
  fetch(`${BASE_URL}/api/gyms/search?${params.toString()}`)
    .then(res => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
    })
    .then(async gyms => {
      console.log('Received gyms from backend:', gyms.length);
      
      // Calculate distances for sorting with improved logic
      const gymsWithDistance = await Promise.all(gyms.map(async gym => {
        let distance = null;
        let gymCoords = null;
        
        // Try to get coordinates from gym data
        if (gym.location?.lat && gym.location?.lng) {
          gymCoords = {
            lat: parseFloat(gym.location.lat),
            lng: parseFloat(gym.location.lng)
          };
        } else if (gym.location?.address || gym.location?.city) {
          // Attempt to geocode the address
          console.log('Geocoding address for gym:', gym.gymName);
          gymCoords = await geocodeAddress(
            gym.location.address,
            gym.location.city,
            gym.location.state,
            gym.location.pincode
          );
          
          // Add a small delay to respect rate limits
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Calculate distance if we have both user location and gym coordinates
        if (gymCoords && userLocation) {
          distance = getDistance(userLocation, gymCoords);
        }
        
        // Process activities for display - handle new object format
        let combinedActivities = [];
        if (gym.activities && Array.isArray(gym.activities)) {
          // Activities are now objects with name, icon, description
          combinedActivities = gym.activities.map(activity => {
            if (typeof activity === 'object' && activity.name) {
              return activity.name;
            } else if (typeof activity === 'string') {
              return activity;
            }
            return null;
          }).filter(name => name);
        }
        
        // Legacy support for old format
        if (gym.otherActivities) {
          if (Array.isArray(gym.otherActivities)) {
            combinedActivities.push(...gym.otherActivities);
          } else if (typeof gym.otherActivities === 'string') {
            combinedActivities.push(gym.otherActivities);
          }
        }
        
        const uniqueGymActivities = [...new Set(combinedActivities.map(a => String(a).toLowerCase()))]
          .filter(a => a && a.trim() !== '');
          
        return {
          ...gym,
          distance,
          gymCoords, // Store coordinates for future use
          processedActivities: uniqueGymActivities
        };
      }));
      
      // Sort by distance (nulls/undefined distances go to the end)
      const sortedGyms = gymsWithDistance.sort((a, b) => {
        if (a.distance === null && b.distance === null) return 0;
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        return a.distance - b.distance;
      });
      
      console.log('Gyms with calculated distances:', sortedGyms.map(g => ({ 
        name: g.gymName, 
        distance: g.distance 
      })));
      
      showResults(sortedGyms);
      // Show gym counter with number of unique gyms
      const gymCounter = document.getElementById("gymSearchCounter");
      if (gymCounter) {
        let counterText = `${sortedGyms.length} gym${sortedGyms.length !== 1 ? 's' : ''} found`;
        
        if (!hasRealUserLocation()) {
          counterText += ' (distances are approximate - click "Near You" for accurate distances)';
        }
        
        gymCounter.textContent = counterText;
        gymCounter.style.display = "inline-block";
      }
    })
    .catch(err => {
      console.error("Error searching gyms:", err);
      resultsDiv.innerHTML = "<p>Failed to load gyms. Please try again later.</p>";
      // Hide counter on error
      const gymCounter = document.getElementById("gymSearchCounter");
      if (gymCounter) gymCounter.style.display = "none";
    });
}

let visibleCount = 3;
let allGyms = [];

function showResults(gyms) {
  allGyms = gyms; // Store all gyms for later use
  visibleCount = 3; // Reset to 3 every search
  renderGymCards();
}

function renderGymCards() {
  const resultsDiv = document.getElementById("results");
  resultsDiv.innerHTML = "";

  const gymsToShow = allGyms.slice(0, visibleCount);

  if (gymsToShow.length === 0) {
    resultsDiv.innerHTML = "<p>No matching gyms found.</p>";
    return;
  }

    gymsToShow.forEach(gym => {
      const card = createGymCard(gym);
      resultsDiv.appendChild(card);
    });
  
  
   /*Helper function to create a gym card element.*/
   
  function getGymLogoUrl(gym) {
    // Default placeholder
    let fullLogoPath = 'https://via.placeholder.com/100x100.png?text=No+Logo';
    console.log('Processing gym logo in search:', gym.logoUrl);
    if (gym.logoUrl) {
      let url = gym.logoUrl;
      console.log('Raw logo URL:', url);
      // Convert relative path to full URL if needed (same as gymadmin.js)
      if (url && !url.startsWith('http')) {
        if (url.startsWith('/')) {
          fullLogoPath = `http://localhost:5000${url}`;
        } else {
          fullLogoPath = `http://localhost:5000/${url}`;
        }
      } else {
        fullLogoPath = url;
      }
      console.log('Final search logo URL:', fullLogoPath);
    }
    return fullLogoPath;
  }

  function getActivitiesHTML(activitiesToDisplay) {
    if (activitiesToDisplay.length > 0) {
      return `<div class="activity-icons">${activitiesToDisplay.map(activity => 
        `<span class="activity-icon"><i class="${getActivityIcon(activity)}"></i> ${activity}</span>`
      ).join('')}</div>`;
    }
    return "<p>No activities listed</p>";
  }

  function createGymCard(gym) {
    const card = document.createElement("div");
    card.className = "gym-card";

    // Create activity icons HTML using processed (de-duplicated) activities
    const activitiesToDisplay = gym.processedActivities || [];
    const activitiesHTML = getActivitiesHTML(activitiesToDisplay);

    const fullLogoPath = getGymLogoUrl(gym);

    // Get the minimum price from membership plans array
    let minPrice = "N/A";
    if (gym.membershipPlans && Array.isArray(gym.membershipPlans) && gym.membershipPlans.length > 0) {
      const prices = gym.membershipPlans
        .map(plan => plan.price)
        .filter(price => price && !isNaN(price));
      if (prices.length > 0) {
        minPrice = Math.min(...prices);
      }
    }

    // Add rating container (will be filled asynchronously)
    const ratingContainer = document.createElement('div');
    ratingContainer.className = 'gym-card-rating';
    ratingContainer.innerHTML = `<span class="rating-value">...</span> <span class="rating-stars"></span>`;
    ratingContainer.style.position = 'absolute';
    ratingContainer.style.top = '12px';
    ratingContainer.style.right = '12px';
    ratingContainer.style.background = 'rgba(255,255,255,0.95)';
    ratingContainer.style.borderRadius = '8px';
    ratingContainer.style.padding = '4px 10px';
    ratingContainer.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
    ratingContainer.style.display = 'flex';
    ratingContainer.style.alignItems = 'center';
    ratingContainer.style.gap = '6px';
    ratingContainer.style.zIndex = '2';

    // Fetch rating from backend
    fetch(`${BASE_URL}/api/reviews/gym/${gym._id}/average`)
      .then(res => res.json())
      .then(data => {
        let avg = 0, count = 0;
        if (data.success) {
          avg = data.averageRating || 0;
          count = data.totalReviews || 0;
        }
        ratingContainer.querySelector('.rating-value').textContent = avg.toFixed(1);
        ratingContainer.querySelector('.rating-stars').innerHTML = generateStars(Math.round(avg));
        ratingContainer.title = `${avg.toFixed(1)} / 5 from ${count} review${count !== 1 ? 's' : ''}`;
      })
      .catch(() => {
        ratingContainer.querySelector('.rating-value').textContent = '0.0';
        ratingContainer.querySelector('.rating-stars').innerHTML = generateStars(0);
        ratingContainer.title = 'No reviews yet';
      });

    // Card HTML
    card.innerHTML = `
      <img src="${fullLogoPath}" alt="${gym.gymName} Logo" class="gym-card-logo" loading="eager" decoding="sync" onerror="this.src='https://via.placeholder.com/100x100.png?text=No+Logo'">
      <div class="gym-card-details">
        <h3>${gym.gymName}</h3>
        <p>City: ${gym.location?.city || "N/A"} | Pincode: ${gym.location?.pincode || "N/A"}</p>
        <p>Distance: ${formatDistance(gym.distance)}</p>
        <p>Starting from: ₹${minPrice !== "N/A" ? minPrice : "N/A"}</p>
        ${activitiesHTML}
        <a href="gymdetails.html?gymId=${gym._id}">
          <button class="view-full-btn">View Full Profile</button>
        </a>
      </div>
    `;

    // Add rating container to card
    card.style.position = 'relative';
    card.appendChild(ratingContainer);

    return card;
  }

  // Add Show More button if needed
  if (visibleCount < allGyms.length) {
    const showMoreBtn = document.createElement("button");
    showMoreBtn.textContent = "Show More";
    showMoreBtn.className = "show-more-btn";
    showMoreBtn.onclick = () => {
      visibleCount += 3;
      renderGymCards();
    };
    resultsDiv.appendChild(showMoreBtn);
  }
}

// Helper function to get Font Awesome icon classes for activities
function getActivityIcon(activityName) {
  const name = String(activityName).toLowerCase(); // Ensure activityName is a string
  if (name.includes('yoga')) return 'fas fa-person-praying';
  if (name.includes('zumba')) return 'fas fa-music';
  if (name.includes('cardio')) return 'fas fa-heartbeat';
  if (name.includes('weight') || name.includes('strength') || name.includes('lifting')) return 'fas fa-weight-hanging';
  if (name.includes('crossfit')) return 'fas fa-dumbbell';
  if (name.includes('pilates')) return 'fas fa-child';
  if (name.includes('hiit')) return 'fas fa-bolt';
  if (name.includes('aerobics')) return 'fas fa-running';
  if (name.includes('martial arts')) return 'fas fa-hand-fist';
  if (name.includes('spin') || name.includes('cycle') || name.includes('spinning')) return 'fas fa-bicycle';
  if (name.includes('swimming') || name.includes('swim')) return 'fas fa-person-swimming';
  if (name.includes('boxing')) return 'fas fa-hand-rock';
  if (name.includes('personal training')) return 'fas fa-user-tie';
  if (name.includes('bootcamp') || name.includes('boot camp')) return 'fas fa-shoe-prints';
  if (name.includes('stretching') || name.includes('stretch')) return 'fas fa-arrows-up-down';
  if (name.includes('dance')) return 'fas fa-music';
  return 'fas fa-dumbbell'; // Default icon
}

// === SLIDER ===
let index = 0;

function moveSlide(step) {
  const slider = document.querySelector('.slider');
  if (!slider) return; // Guard clause to prevent null errors
  
  const totalImages = slider.children.length;
  if (totalImages === 0) return; // Guard clause for empty slider

  index += step;

  if (index >= totalImages) index = 0;
  if (index < 0) index = totalImages - 1;

  slider.style.transform = `translateX(${-index * 100}%)`;
}

// Only start slider if slider element exists
document.addEventListener('DOMContentLoaded', function() {
  const slider = document.querySelector('.slider');
  if (slider && slider.children.length > 0) {
    setInterval(() => moveSlide(1), 4000);
  }
});

// === SLIDER TEXT ANIMATION ON SCROLL ===
document.addEventListener("DOMContentLoaded", function () {
  const textElement = document.querySelector(".slider-text");
  
  // Only add scroll listener if element exists
  if (!textElement) return;

  function handleScroll() {
    const position = textElement.getBoundingClientRect().top;
    const windowHeight = window.innerHeight;

    if (position < windowHeight - 100) {
      textElement.style.animation = "slideInFromLeft 1s ease-in-out forwards";
    }
  }

  window.addEventListener("scroll", handleScroll);
  handleScroll();
});
// === MULTI-ACTIVITY FILTER ===
function setupActivityFilter() {
  document.querySelectorAll('.activity-chip').forEach(activityDiv => {
    activityDiv.addEventListener('click', function () {
      this.classList.toggle('active');
      console.log('Activity toggled:', this.dataset.activity, 'Active:', this.classList.contains('active'));
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setupActivityFilter();
});
// === MISC EVENTS ===
document.getElementById("priceRange").addEventListener("input", function () {
  document.getElementById("priceValue").textContent = `₹${this.value}`;
});


document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token");

  const userNav = document.getElementById("user-profile-nav");
  const loginNav = document.getElementById("login-signup-nav");

  // Default states
  if (userNav) userNav.style.display = "none";
  if (loginNav) loginNav.style.display = "none";

  if (!token) {
    // 🔐 Not logged in: show login/signup
    if (loginNav) loginNav.style.display = "block";
    return;
  }

  // ✅ Try to fetch user profile if token exists
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

      const userIconImage = document.getElementById("profile-icon-img");
      if (userIconImage) userIconImage.src = profilePicUrl;

      // 👤 Show profile dropdown, hide login
      if (userNav) userNav.style.display = "block";
      if (loginNav) loginNav.style.display = "none";
    })
    .catch(error => {
      console.error("Error fetching user:", error.message);
      // 🔐 Failed to authenticate, show login
      if (loginNav) loginNav.style.display = "block";
    });
});
// Helper for stars
function generateStars(rating) {
  let stars = '';
  for (let i = 1; i <= 5; i++) {
    if (i <= rating) {
      stars += '<i class="fas fa-star" style="color:#ffd700;font-size:1em;"></i>';
    } else {
      stars += '<i class="far fa-star" style="color:#ddd;font-size:1em;"></i>';
    }
  }
  return stars;
}

// Helper function to format distance display
function formatDistance(distance) {
  if (distance === null || distance === undefined) {
    return "Distance not available";
  }
  
  if (distance < 1) {
    return `${(distance * 1000).toFixed(0)} m`;
  } else if (distance < 10) {
    return `${distance.toFixed(2)} km`;
  } else {
    return `${distance.toFixed(1)} km`;
  }
}

// Function to get user's current location if not already obtained
function requestUserLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        userLocation = newLocation;
        window.userLocation = newLocation;
        console.log('User location obtained:', userLocation);
        resolve(newLocation);
      },
      (error) => {
        console.warn('Geolocation error:', error);
        reject(error);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

// Function to check if user has enabled real location
function hasRealUserLocation() {
  return userLocation.lat !== 28.357353 || userLocation.lng !== 77.295289;
}

// Function to display location status in console (for debugging)
function logLocationStatus() {
  console.log('=== Location Status ===');
  console.log('Current userLocation:', userLocation);
  console.log('Has real location:', hasRealUserLocation());
  console.log('Default Delhi location:', { lat: 28.357353, lng: 77.295289 });
  console.log('=====================');
}
