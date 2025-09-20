
// === PERSONAL TRAINING PAGE JAVASCRIPT ===
console.log('🚀 Personal Training JS loaded successfully');

// Base URL for API calls
const BASE_URL = `${window.location.protocol}//${window.location.hostname}:5000`;
// Toggle to true in console for verbose gym logo path debugging
// window.DEBUG_GYM_LOGOS = true;

// Test if registerBtn is accessible immediately
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎯 Early DOM check for registerBtn...');
    const testBtn = document.getElementById('registerBtn');
    console.log('🔍 RegisterBtn early test:', testBtn ? 'FOUND' : 'NOT FOUND');
  // Fallback binding in case later initialization fails
  if (testBtn) {
    if (!testBtn.dataset.enhancedBound) {
      testBtn.addEventListener('click', (e) => {
        // If enhanced init already attached, this will simply open modal
        if (typeof window.openTrainerRegistration === 'function') {
          window.openTrainerRegistration(e);
        } else {
          const modal = document.getElementById('registrationModal');
          if (modal) {
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
          }
        }
      });
      testBtn.dataset.enhancedBound = 'true';
      console.log('🛟 Fallback click handler attached early');
    }
  }
});

window.onerror = function(message, source, lineno, colno, error) {
  console.error('[GLOBAL ERROR HANDLER] Error:', message, 'Source:', source, 'Line:', lineno, 'Col:', colno, 'Error Obj:', error);
  // Optionally, you could display a user-friendly message here or send the error to a logging service
  return true; // Prevents the browser's default error handling (e.g., stopping script execution)
};
  function logout() {
  localStorage.removeItem('token'); // only remove token if that's what you're using
  window.location.href = 'index.html';
}

// === NAVIGATION BAR: Toggle & Active Link Highlight ===
document.addEventListener('DOMContentLoaded', function () {
  const loadingScreen = document.getElementById('loading-screen');
  const menuToggle = document.querySelector('.menu-toggle');
  const navLinks = document.querySelector('.nav-links');
  const links = document.querySelectorAll('.nav-link');
  const currentPage = window.location.pathname.split('/').pop() || 'index.html'; // Default to index.html if path is empty

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
  // Settings submenu open/close for mobile
  document.querySelectorAll('.settings-option > a').forEach(function(settingsLink) {
    settingsLink.addEventListener('click', function(e) {
      if (window.innerWidth <= 900) {
        e.preventDefault();
        const parentOption = this.parentElement;
        parentOption.classList.toggle('open');
        // Close other open settings
        document.querySelectorAll('.settings-option').forEach(function(opt) {
          if (opt !== parentOption) opt.classList.remove('open');
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

  // === MAIN TRAINER LOADING LOGIC ===
  const loadingIndicator = document.querySelector('.loading-indicator');
  const errorMessage = document.querySelector('.error-message');
  const trainersContainer = document.querySelector('.trainers-container');
  const retryButton = document.querySelector('.retry-loading');
  const filterForm = document.querySelector('.filter-form');
  const registerBtn = document.getElementById('registerBtn');
  const trainerModal = document.getElementById('trainerModal');
  const registrationModal = document.getElementById('registrationModal');
  const registrationForm = document.getElementById('registrationForm');
  const formResponseMessage = document.getElementById('formResponseMessage'); // Get the message element
  
  let allTrainersData = [];

  
  // Load trainers from backend
  async function loadTrainers() {
    if (loadingIndicator) loadingIndicator.style.display = 'block';
    if (errorMessage) errorMessage.style.display = 'none';
    if (trainersContainer) trainersContainer.style.display = 'none';

    try {
      const response = await fetch(`${BASE_URL}/api/trainers`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ 
          message: `HTTP error! Status: ${response.status}` 
        }));
        throw new Error(errorData.message);
      }
      
      allTrainersData = await response.json();
      
      if (!Array.isArray(allTrainersData)) {
        console.warn('Fetched trainers data is not an array:', allTrainersData);
        allTrainersData = [];
      }

      if (loadingIndicator) loadingIndicator.style.display = 'none';
      if (trainersContainer) trainersContainer.style.display = 'block';
      
      populateTrainers(allTrainersData);
      setupModalEvents();
    } catch (err) {
      console.error('Error loading trainers:', err);
      if (loadingIndicator) loadingIndicator.style.display = 'none';
      if (errorMessage) {
        errorMessage.textContent = `Failed to load trainers: ${err.message}. Please try again.`;
        errorMessage.style.display = 'block';
      }
    }
  }

  // Retry button event
  if (retryButton) {
    retryButton.addEventListener('click', loadTrainers);
  }

  // Check trainer availability
  function checkAvailability(availabilityObj, filterTime) {
    if (typeof availabilityObj !== 'object' || availabilityObj === null) return false;
    const morningHours = ['6', '7', '8', '9', '10'];
    const eveningHours = ['16', '17', '18', '19', '20'];
    const normalizedFilterTime = filterTime.toLowerCase();

    if (normalizedFilterTime === 'any time') return true;

    for (const day in availabilityObj) {
      if (Object.prototype.hasOwnProperty.call(availabilityObj, day)) {
        for (const slot of availabilityObj[day]) {
          const hour = slot.split(':')[0].trim();
          if (
            (normalizedFilterTime === 'morning' && morningHours.includes(hour)) ||
            (normalizedFilterTime === 'evening' && eveningHours.includes(hour))
          ) {
            return true;
          }
        }
      }
    }
    return false;
  }

  // Filter form submission
  if (filterForm) {
    filterForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      const location = document.getElementById('location').value;
      const specialty = document.getElementById('specialty').value;
      const availability = document.getElementById('availability').value.toLowerCase();

      try {
        const filtered = allTrainersData.filter((trainer) => {
          const locationMatch = location === 'All Cities' || 
            (trainer.location && trainer.location.toLowerCase() === location.toLowerCase());
          const specialtyMatch = specialty === 'All Specialties' || 
            (trainer.specialties && trainer.specialties.map(s => s.toLowerCase()).includes(specialty.toLowerCase()));
          const availabilityMatch = availability === 'any time' || 
            checkAvailability(trainer.availability, availability);
          return locationMatch && specialtyMatch && availabilityMatch;
        });
        populateTrainers(filtered);
      } catch (error) {
        console.error('Filter error:', error);
        if (errorMessage) {
          errorMessage.textContent = `Error applying filters: ${error.message}`;
          errorMessage.style.display = 'block';
        }
      }
    });
  }

  // Populate trainers in the UI
  function populateTrainers(trainersToDisplay) {
    if (!trainersContainer) return;
    trainersContainer.innerHTML = '';

    if (!trainersToDisplay || trainersToDisplay.length === 0) {
      trainersContainer.innerHTML = '<p class="text-center">No trainers found matching your criteria.</p>';
      return;
    }

    const trainersByGym = {};
    trainersToDisplay.forEach((trainer) => {
      const gymName = trainer.gym || 'Independent Trainers';
      if (!trainersByGym[gymName]) {
        trainersByGym[gymName] = [];
      }
      trainersByGym[gymName].push(trainer);
    });

    for (const gymName in trainersByGym) {
      if (Object.prototype.hasOwnProperty.call(trainersByGym, gymName)) {
        const gymSection = document.createElement('section');
        gymSection.className = 'gym-section';

        const heading = document.createElement('h2');
        heading.textContent = `${gymName} Trainers`;
        gymSection.appendChild(heading);

        const trainersGrid = document.createElement('div');
        trainersGrid.className = 'trainers-grid';

        trainersByGym[gymName].forEach((trainer) => {
          const trainerCard = document.createElement('div');
          trainerCard.className = 'trainer-card';
          const trainerId = trainer._id || trainer.id;
          trainerCard.setAttribute('data-trainer-id', trainerId);

          const imageUrl = trainer.image ? 
            (trainer.image.startsWith('http') ? trainer.image : `/uploads/${trainer.image}`) : 
            'images/default-trainer.png';

          // Enhanced rate display
          let rateDisplay = '';
          if (trainer.rateDisplay) {
            rateDisplay = trainer.rateDisplay;
          } else {
            const rates = [];
            if (trainer.hourlyRate) rates.push(`₹${trainer.hourlyRate}/hr`);
            if (trainer.monthlyRate) rates.push(`₹${trainer.monthlyRate}/mo`);
            rateDisplay = rates.length > 0 ? rates.join(' • ') : (trainer.rate ? `₹${trainer.rate}` : 'Rate on request');
          }

          trainerCard.innerHTML = `
            <div class="trainer-image">
              <img src="${imageUrl}" alt="Trainer ${trainer.name || 'N/A'}" 
                onerror="this.onerror=null;this.src='images/default-trainer.png';">
            </div>
            <div class="trainer-info">
              <h3>${trainer.name || 'Trainer Name'}</h3>
              <p class="trainer-specialty">${trainer.specialties ? trainer.specialties.join(', ') : 'N/A'}</p>
              <p class="trainer-rate">${rateDisplay}</p>
              <p class="trainer-bio">${trainer.shortBio || 'No bio available.'}</p>
              <div class="trainer-actions">
                <a href="#" class="btn btn-outline view-profile">View Profile</a>
                <a href="#" class="btn book-session" data-trainer-id="${trainerId}">Book Session</a>
              </div>
            </div>
          `;
          trainersGrid.appendChild(trainerCard);
        });
        gymSection.appendChild(trainersGrid);
        trainersContainer.appendChild(gymSection);
      }
    }
  }

  // Setup modal events
  function setupModalEvents() {
    const closeBtns = document.querySelectorAll('.close-modal');
    closeBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        if (trainerModal) trainerModal.style.display = 'none';
        if (registrationModal) registrationModal.style.display = 'none';
        document.body.style.overflow = 'auto';
      });
    });

    // Window click handler for modal dismissal
    window.addEventListener('click', (e) => {
      if (e.target === trainerModal && trainerModal) {
        trainerModal.style.display = 'none';
        document.body.style.overflow = 'auto';
      }
      if (e.target === registrationModal && registrationModal) {
        registrationModal.style.display = 'none';
        document.body.style.overflow = 'auto';
      }
    });

    // Event delegation for view profile buttons
    document.addEventListener('click', async (e) => {
      if (e.target.classList.contains('view-profile')) {
        e.preventDefault();
        const trainerCard = e.target.closest('.trainer-card');
        if (!trainerCard) return;
        const trainerId = trainerCard.getAttribute('data-trainer-id');
        
        try {
          const response = await fetch(`${BASE_URL}/api/gyms/trainers/${trainerId}`);
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ 
              message: `Failed to fetch trainer details. Status: ${response.status}` 
            }));
            throw new Error(errorData.message);
          }
          const trainer = await response.json();
          displayTrainerProfile(trainer);
        } catch (error) {
          console.error('Error fetching trainer details:', error);
          if (errorMessage) {
            errorMessage.textContent = `Error loading trainer profile: ${error.message}`;
            errorMessage.style.display = 'block';
          }
        }
      }
    });
    
    // Book session button functionality
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('book-session')) {
        e.preventDefault();
        const trainerId = e.target.dataset.trainerId;
        // TODO: Implement booking session functionality
        alert(`Book session with trainer ID: ${trainerId} - (Not Implemented)`);
      }
    });
  }

  // Display trainer profile in modal
  function displayTrainerProfile(trainer) {
    if (!trainerModal) return;

    const modal = trainerModal;
    const imageUrl = trainer.image ? 
      (trainer.image.startsWith('http') ? trainer.image : `/uploads/${trainer.image}`) : 
      'images/default-trainer.png';
    
    // Populate basic info
    const nameElement = modal.querySelector('.profile-header h2');
    if (nameElement) nameElement.textContent = trainer.name || 'Trainer Name';

    const profileImg = modal.querySelector('.profile-header img');
    if (profileImg) {
      profileImg.src = imageUrl;
      profileImg.alt = `Profile image of ${trainer.name || 'N/A'}`;
    }

    const profileSpecialty = modal.querySelector('.profile-header p');
    if (profileSpecialty) {
      profileSpecialty.textContent = trainer.specialties ? trainer.specialties.join(', ') : 'N/A';
    }
    
    const aboutSection = modal.querySelector('.about-section p');
    if (aboutSection) {
      aboutSection.textContent = trainer.bio || 'No bio available.';
    }

    // Populate specialties
    const specialtiesList = modal.querySelector('.specialties-list');
    if (specialtiesList) {
      specialtiesList.innerHTML = '';
      (trainer.specialties || ['No specialties listed']).forEach((specialty) => {
        const li = document.createElement('li');
        li.textContent = specialty;
        specialtiesList.appendChild(li);
      });
    }

    // Populate availability
    const availabilityList = modal.querySelector('.availability-list');
    if (availabilityList) {
      availabilityList.innerHTML = '';
      if (trainer.availability && typeof trainer.availability === 'object') {
        for (const day in trainer.availability) {
          if (Object.prototype.hasOwnProperty.call(trainer.availability, day)) {
            const li = document.createElement('li');
            li.textContent = `${day}: ${trainer.availability[day].join(', ')}`;
            availabilityList.appendChild(li);
          }
        }
      } else {
        availabilityList.innerHTML = '<li>No availability information</li>';
      }
    }

    // Populate testimonials
    const testimonialsSection = modal.querySelector('.testimonials-section');
    if (testimonialsSection) {
      testimonialsSection.innerHTML = '<h3>Client Testimonials</h3>';
      if (trainer.testimonials && trainer.testimonials.length > 0) {
        trainer.testimonials.forEach((testimonial) => {
          const div = document.createElement('div');
          div.className = 'testimonial';
          div.innerHTML = `
            <p>"${testimonial.text}"</p>
            <p><strong>- ${testimonial.client}</strong></p>
          `;
          testimonialsSection.appendChild(div);
        });
      } else {
        testimonialsSection.innerHTML += '<p>No testimonials available yet.</p>';
      }
    }

    trainerModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
  }


  // (Removed legacy inline registrationForm submit handler that intercepted events before enhanced handler.)

  // === SEARCHABLE GYM PARTNER PICKER ===
  const locationsSelect = document.getElementById('locations'); // multi-select for cities/areas
  const gymSearchInput = document.getElementById('gymSearchInput');
  const gymResultsPanel = document.getElementById('gymResultsPanel');
  const gymResultsList = document.getElementById('gymResultsList');
  const gymResultsStatus = document.getElementById('gymResultsStatus');
  const selectedGymIdInput = document.getElementById('selectedGymId');
  const clearGymSelectionBtn = document.getElementById('clearGymSelection');
  const gymSelectionSection = document.getElementById('gymSelectionSection');

  let cachedGymsByCities = []; // holds last fetched gyms for currently selected cities
  let lastCitiesKey = '';
  let gymSearchDebounceTimer = null;

  function getSelectedCities() {
    if (!locationsSelect) return [];
    // Only include real city names, ignore 'Online Training' or 'Client Location'
    const raw = Array.from(locationsSelect.selectedOptions).map(o => o.value);
    return raw.filter(v => ['Faridabad','Delhi','Gurugram','Noida'].includes(v));
  }

  async function fetchGymsForCities(cities) {
    if (!cities.length) {
      cachedGymsByCities = [];
      return [];
    }
    const key = cities.sort().join('|');
    if (key === lastCitiesKey && cachedGymsByCities.length) {
      return cachedGymsByCities;
    }
    try {
      setStatus(`Loading gyms for ${cities.join(', ')}...`, 'spinner');
      const res = await fetch(`${BASE_URL}/api/gyms/by-cities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cities })
      });
      if (!res.ok) throw new Error('Failed to load gyms');
      const gyms = await res.json();
      cachedGymsByCities = gyms;
      lastCitiesKey = key;
      return gyms;
    } catch (e) {
      console.error('Gym fetch error', e);
      setStatus('⚠️ Failed to load gyms. Try again.', 'error');
      return [];
    }
  }

  function setStatus(message, mode='info') {
    if (!gymResultsStatus) return;
    gymResultsStatus.innerHTML = '';
    let iconClass = 'fa-info-circle';
    if (mode === 'spinner') iconClass = 'fa-spinner fa-spin';
    if (mode === 'error') iconClass = 'fa-triangle-exclamation';
    if (mode === 'empty') iconClass = 'fa-circle-xmark';
    gymResultsStatus.innerHTML = `<i class="fas ${iconClass}"></i> <span>${message}</span>`;
    gymResultsStatus.style.display = 'flex';
  }

  function renderGymResults(gyms, filterTerm) {
    if (!gymResultsList) return;
    gymResultsList.innerHTML = '';
    const term = (filterTerm || '').toLowerCase();
    const filtered = gyms.filter(g => !term || (g.gymName || g.name || '').toLowerCase().includes(term));
    if (!filtered.length) {
      setStatus('No gyms match your search.', 'empty');
      return;
    }
    gymResultsStatus.style.display = 'none';
    filtered.forEach(gym => {
      const li = document.createElement('li');
      li.className = 'gym-result-item';
      const displayName = gym.gymName || gym.name || 'Unnamed Gym';
      const city = gym.location?.city || gym.city || '';
  const logo = buildGymLogoUrl(gym);
      li.innerHTML = `
        <div class="gym-item-main">
          <img src="${logo}" alt="${displayName} Logo" class="gym-item-logo" onerror="this.src='https://via.placeholder.com/40?text=GYM'" />
          <div class="gym-item-info">
            <span class="gym-item-name">${displayName}</span>
            <span class="gym-item-city">${city}</span>
          </div>
        </div>
        <div class="gym-item-actions">
          <button type="button" class="btn-mini view-gym" data-gymid="${gym._id}" title="View Gym"><i class="fas fa-external-link-alt"></i></button>
          <button type="button" class="btn-mini select-gym" data-gymid="${gym._id}" data-gymname="${displayName}"><i class="fas fa-check"></i></button>
        </div>`;
      gymResultsList.appendChild(li);
    });
  }

  // Unified gym logo resolution (mirrors index page + extra resiliency)
  function buildGymLogoUrl(gym) {
    const raw = gym?.logoUrl || gym?.logo || gym?.logoURL || gym?.logo_path || gym?.logoFile || '';
    const debug = !!window.DEBUG_GYM_LOGOS;
    const placeholder = 'https://via.placeholder.com/40?text=GYM';
    if (debug) console.log('[GymLogo] raw:', raw, 'gymId:', gym?._id);
    if (!raw) return `${BASE_URL}/uploads/gym-logos/default-logo.png`;

    // Absolute URL already
    if (/^https?:\/\//i.test(raw)) return raw;

    // Normalize slashes
    let path = raw.replace(/\\/g,'/');

    // Leading slash & already /uploads
    if (path.startsWith('/uploads')) return `${BASE_URL}${path}`;

    // Starts with uploads without leading slash
    if (path.startsWith('uploads/')) return `${BASE_URL}/${path}`;

    // Stored only as filename
    if (!path.includes('/')) {
      return `${BASE_URL}/uploads/gym-logos/${path}`;
    }

    // Handles gym-logos/file.png
    if (path.startsWith('gym-logos/')) {
      return `${BASE_URL}/uploads/${path}`;
    }

    // If path points somewhere inside uploads but missing prefix
    if (/^(gymImages|gymPhotos|images)\//i.test(path)) {
      return `${BASE_URL}/uploads/${path}`;
    }

    // Fallback: if it already has /gym-logos/ appended mistakenly
    if (path.includes('/uploads/')) {
      // Ensure BASE_URL prefix
      return path.startsWith('/uploads/') ? `${BASE_URL}${path}` : `${BASE_URL}/${path}`;
    }

    // Last attempt
    const finalUrl = `${BASE_URL}/uploads/gym-logos/${path}`;
    if (debug) console.log('[GymLogo] finalUrl fallback:', finalUrl);
    return finalUrl;
  }

  async function updateGymResults(trigger='input') {
    if (!gymSearchInput) return;
    const cities = getSelectedCities();
    if (!cities.length) {
      gymResultsList.innerHTML = '';
      setStatus('Select at least one city in Preferred Work Locations.', 'info');
      return;
    }
    const gyms = await fetchGymsForCities(cities);
    renderGymResults(gyms, gymSearchInput.value);
  }

  function openPanel() {
    if (gymResultsPanel) gymResultsPanel.style.display = 'block';
  }
  function closePanel() {
    if (gymResultsPanel) gymResultsPanel.style.display = 'none';
  }

  if (gymSearchInput) {
    gymSearchInput.addEventListener('focus', () => {
      openPanel();
      updateGymResults('focus');
    });
    gymSearchInput.addEventListener('input', () => {
      openPanel();
      clearTimeout(gymSearchDebounceTimer);
      gymSearchDebounceTimer = setTimeout(() => updateGymResults('input'), 300);
    });
  }

  if (locationsSelect) {
    locationsSelect.addEventListener('change', () => {
      // Clear existing selection if city set changes
      selectedGymIdInput.value = '';
      if (gymSearchInput) gymSearchInput.value = '';
      if (clearGymSelectionBtn) clearGymSelectionBtn.style.display = 'none';
      openPanel();
      updateGymResults('cities-change');
    });
  }

  // Click handling inside results
  if (gymResultsList) {
    gymResultsList.addEventListener('click', (e) => {
      const viewBtn = e.target.closest('.view-gym');
      const selectBtn = e.target.closest('.select-gym');
      if (viewBtn) {
        const gymId = viewBtn.getAttribute('data-gymid');
        // Persist intent to return
        localStorage.setItem('returnToTrainerRegistration','1');
        localStorage.setItem('trainerRegPartialCities', JSON.stringify(getSelectedCities()));
        if (gymSearchInput) localStorage.setItem('trainerRegGymSearchTerm', gymSearchInput.value);
        window.location.href = `gymdetails.html?gymId=${gymId}#fromTrainerReg`;
      } else if (selectBtn) {
        const gymId = selectBtn.getAttribute('data-gymid');
        const gymName = selectBtn.getAttribute('data-gymname');
        selectedGymIdInput.value = gymId;
        if (gymSearchInput) gymSearchInput.value = gymName;
        if (clearGymSelectionBtn) clearGymSelectionBtn.style.display = 'flex';
        closePanel();
      }
    });
  }

  if (clearGymSelectionBtn) {
    clearGymSelectionBtn.addEventListener('click', () => {
      selectedGymIdInput.value = '';
      if (gymSearchInput) gymSearchInput.value = '';
      clearGymSelectionBtn.style.display = 'none';
      openPanel();
      updateGymResults('clear');
    });
  }

  // Close panel when clicking outside
  document.addEventListener('click', (e) => {
    if (!gymSelectionSection) return;
    if (!gymSelectionSection.contains(e.target)) {
      closePanel();
    }
  });

  // Restore state if returning from gym details
  if (localStorage.getItem('returnToTrainerRegistration') === '1') {
    const term = localStorage.getItem('trainerRegGymSearchTerm') || '';
    const savedCities = JSON.parse(localStorage.getItem('trainerRegPartialCities') || '[]');
    localStorage.removeItem('returnToTrainerRegistration');
    if (locationsSelect && savedCities.length) {
      Array.from(locationsSelect.options).forEach(opt => { if (savedCities.includes(opt.value)) opt.selected = true; });
    }
    if (gymSearchInput) gymSearchInput.value = term;
    setTimeout(() => { openTrainerRegistration(); openPanel(); updateGymResults('restore'); }, 300);
  }

  // === USER AUTHENTICATION STATE MANAGEMENT ===
  const token = localStorage.getItem('token');
  const userNav = document.getElementById('user-profile-nav');
  const loginNav = document.getElementById('login-signup-nav');
document.addEventListener("DOMContentLoaded", function () {
  // === USER AUTHENTICATION & PROFILE PICTURE ===
  const token = localStorage.getItem("token");
  const userNav = document.getElementById("user-profile-nav");
  const loginNav = document.getElementById("login-signup-nav");
  const logoutBtn = document.getElementById('logout-btn');

  // Default states
  if (userNav) userNav.style.display = "none";
  if (loginNav) loginNav.style.display = "none";

 

  if (!token) {
    // Not logged in: show login/signup
    if (loginNav) loginNav.style.display = "block";
    return;
  }

});

  // Try to fetch user profile if token exists
  fetch('http://localhost:5000/api/users/profile', {
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
      const profilePicUrl = user.profileImage
         ? (user.profileImage.startsWith('http') ? user.profileImage : `http://localhost:5000${user.profileImage}`)
        : `http://localhost:5000/uploads/profile-pics/default.png`;

      const userIconImage = document.getElementById("profile-icon-img");
      if (userIconImage) userIconImage.src = profilePicUrl;

      // Show profile dropdown, hide login
      if (userNav) userNav.style.display = "block";
      if (loginNav) loginNav.style.display = "none";
    })
    .catch(error => {
      console.error("Error fetching user:", error.message);
      // Failed to authenticate, show login
      if (loginNav) loginNav.style.display = "block";
    });

  // === TOUCH DEVICE SUPPORT ===
  const settingsOptions = document.querySelectorAll('.settings-option');
  
  settingsOptions.forEach((option) => {
    // For mouse users
    option.addEventListener('mouseenter', function () {
      const submenu = this.querySelector('.settings-submenu');
      if (submenu) submenu.style.display = 'block';
    });
    
    option.addEventListener('mouseleave', function () {
      const submenu = this.querySelector('.settings-submenu');
      if (submenu) submenu.style.display = 'none';
    });
    
    // For touch devices
    option.addEventListener('click', function (e) {
      if (window.innerWidth <= 768) {
        e.preventDefault();
        const submenu = this.querySelector('.settings-submenu');
        if (submenu) {
          submenu.style.display = submenu.style.display === 'block' ? 'none' : 'block';
        }
      }
    });
  });

  // Initial load of trainers
  loadTrainers();
  
  // Initialize enhanced registration form
  console.log('🎯 Initializing enhanced registration from main DOMContentLoaded');
  setTimeout(() => {
    initializeEnhancedRegistration();
    loadGymsForRegistration();
  }, 100); // Small delay to ensure all elements are ready
});

// ===============================================
// ENHANCED TRAINER REGISTRATION FUNCTIONALITY
// ===============================================

// Global test function for debugging
window.testOpenModal = function() {
    console.log('🧪 Manual test - opening registration modal');
    const modal = document.getElementById('registrationModal');
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
        console.log('✅ Modal opened manually');
    } else {
        console.error('❌ Modal not found');
    }
};

// Public helper to open trainer registration (used by fallback & enhanced init)
window.openTrainerRegistration = function(event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  // Auth check first
  const token = localStorage.getItem('token');
  if (!token) {
    showLoginRequiredModal();
    return;
  }
  const modal = document.getElementById('registrationModal');
  if (modal) {
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    console.log('📂 Registration modal opened');
    // Prefill user data
    prefillTrainerFromUser();
  } else {
    console.error('Modal not found when calling openTrainerRegistration');
  }
};

window.testButtonClick = function() {
    console.log('🧪 Manual test - triggering button click');
    const btn = document.getElementById('registerBtn');
    if (btn) {
        btn.click();
        console.log('✅ Button clicked manually');
    } else {
        console.error('❌ Button not found');
    }
};

function initializeEnhancedRegistration() {
    console.log('🔧 Initializing enhanced registration...');
    
    const registerBtn = document.getElementById('registerBtn');
    const registrationModal = document.getElementById('registrationModal');
    const closeModal = document.querySelector('#registrationModal .close-modal');
    const registrationForm = document.getElementById('registrationForm');
    const profileImageInput = document.getElementById('profileImageInput');
    const profileImagePreview = document.querySelector('.profile-image-preview');
    
    console.log('🎯 Elements found:', {
        registerBtn: !!registerBtn,
        registrationModal: !!registrationModal,
        closeModal: !!closeModal,
        registrationForm: !!registrationForm
    });
    
    // Trainer type radio buttons
    const trainerTypeRadios = document.querySelectorAll('input[name="trainerType"]');
    const independentTrainerInfo = document.getElementById('independentTrainerInfo');
    const gymSelectionSection = document.getElementById('gymSelectionSection');
    const insuranceCheckbox = document.getElementById('insuranceCheckbox');
    const gymSelect = document.getElementById('gym');
    // Enhancement: clear or enforce gym selection depending on trainer type
    trainerTypeRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        const isGymTrainer = document.getElementById('gymTrainer')?.checked;
        const gymSection = document.getElementById('gymSelectionSection');
        if (gymSection) {
          gymSection.style.display = isGymTrainer ? 'block' : 'none';
        }
        if (!isGymTrainer) {
          const gymSearchInput = document.getElementById('gymSearchInput');
          const selectedGymId = document.getElementById('selectedGymId');
          if (gymSearchInput) gymSearchInput.value = '';
          if (selectedGymId) selectedGymId.value = '';
          const clearBtn = document.getElementById('clearGymSelection');
          if (clearBtn) clearBtn.style.display = 'none';
        }
      });
    });

    // Open modal
    if (registerBtn) {
        console.log('✅ Setting up registerBtn click handler');
        
        // Add hover effect check
        registerBtn.addEventListener('mouseenter', function() {
            console.log('🎯 Mouse entered registerBtn');
        });
        
        registerBtn.addEventListener('mouseleave', function() {
            console.log('🎯 Mouse left registerBtn');
        });
        
        // Add click handler with more debugging
    // Remove any existing inline onclick to avoid duplicate firing
    registerBtn.onclick = null;

    registerBtn.addEventListener('click', window.openTrainerRegistration);
        
    // Mark as bound to prevent early fallback duplication
    registerBtn.dataset.enhancedBound = 'true';
        
        // Test if button is clickable
        console.log('🔍 Button properties:', {
            id: registerBtn.id,
            className: registerBtn.className,
            disabled: registerBtn.disabled,
            style: registerBtn.style.cssText,
            offsetParent: !!registerBtn.offsetParent
        });
    } else {
        console.error('❌ registerBtn not found');
    }

    // Close modal
    if (closeModal) {
        closeModal.addEventListener('click', closeRegistrationModal);
    }

    // Close modal on backdrop click
    window.addEventListener('click', function(event) {
        if (event.target === registrationModal) {
            closeRegistrationModal();
        }
    });

    // Handle trainer type selection
    trainerTypeRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            const selectedType = this.value;
            
            if (selectedType === 'independent') {
                independentTrainerInfo.style.display = 'block';
                gymSelectionSection.style.display = 'none';
                insuranceCheckbox.style.display = 'block';
                gymSelect.removeAttribute('required');
                document.getElementById('agreeInsurance').setAttribute('required', 'required');
            } else {
                independentTrainerInfo.style.display = 'none';
                gymSelectionSection.style.display = 'block';
                insuranceCheckbox.style.display = 'none';
                gymSelect.setAttribute('required', 'required');
                document.getElementById('agreeInsurance').removeAttribute('required');
            }
        });
    });

    // Handle rate type selection (Enhanced rate structure)
    const rateTypeCheckboxes = document.querySelectorAll('input[name="rateTypes"]');
    const hourlyRateInput = document.getElementById('hourlyRateInput');
    const monthlyRateInput = document.getElementById('monthlyRateInput');
    const hourlyRateValue = document.getElementById('hourlyRateValue');
    const monthlyRateValue = document.getElementById('monthlyRateValue');

    function updateRateInputs() {
        const selectedTypes = Array.from(rateTypeCheckboxes).filter(cb => cb.checked).map(cb => cb.value);
        
        // Show/hide rate inputs based on selection
        if (selectedTypes.includes('hourly')) {
            hourlyRateInput.style.display = 'block';
            hourlyRateValue.setAttribute('required', 'required');
        } else {
            hourlyRateInput.style.display = 'none';
            hourlyRateValue.removeAttribute('required');
            hourlyRateValue.value = '';
        }
        
        if (selectedTypes.includes('monthly')) {
            monthlyRateInput.style.display = 'block';
            monthlyRateValue.setAttribute('required', 'required');
        } else {
            monthlyRateInput.style.display = 'none';
            monthlyRateValue.removeAttribute('required');
            monthlyRateValue.value = '';
        }
        
        // At least one rate type should be selected
        const anySelected = selectedTypes.length > 0;
        rateTypeCheckboxes.forEach(cb => {
            if (!anySelected) {
                cb.setCustomValidity('Please select at least one rate type');
            } else {
                cb.setCustomValidity('');
            }
        });
    }

    // Add event listeners to rate type checkboxes
    rateTypeCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', updateRateInputs);
    });

    // Initialize with default state (hourly checked by default)
    const hourlyCheckbox = document.getElementById('hourlyRate');
    if (hourlyCheckbox) {
        hourlyCheckbox.checked = true;
        updateRateInputs();
    }

    // Handle profile image upload
    if (profileImageInput) {
        profileImageInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const profileImageTag = document.getElementById('profileImageTag');
                    profileImageTag.src = e.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Handle profile image preview click
    if (profileImagePreview) {
        profileImagePreview.addEventListener('click', function() {
            profileImageInput.click();
        });
    }

    // Form submission
  if (registrationForm) {
    // Defensive: prevent duplicate attachment if init runs twice
    if (!registrationForm.dataset.enhancedSubmitBound) {
      registrationForm.addEventListener('submit', handleRegistrationSubmit);
      registrationForm.dataset.enhancedSubmitBound = 'true';
    } else {
      console.warn('⚠️ Submission handler already bound - skipping duplicate bind');
    }
  }

    // Initialize availability functions
    initializeAvailabilityFunctions();
}

// =============================
// LOGIN / PREFILL UTILITIES
// =============================

async function fetchUserProfile() {
  const token = localStorage.getItem('token');
  if (!token) return null;
  try {
    const res = await fetch(`${BASE_URL}/api/users/profile`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) {
      console.warn('Failed to fetch user profile for trainer prefill', res.status);
      return null;
    }
    return await res.json();
  } catch (e) {
    console.error('Error fetching user profile:', e);
    return null;
  }
}

async function prefillTrainerFromUser() {
  const user = await fetchUserProfile();
  if (!user) return;
  const firstNameEl = document.getElementById('firstName');
  const lastNameEl = document.getElementById('lastName');
  const emailEl = document.getElementById('email');
  const phoneEl = document.getElementById('phone');
  // Derive names if absent
  const fName = user.firstName || (user.name ? user.name.split(' ')[0] : '');
  const lName = user.lastName || (user.name ? user.name.split(' ').slice(1).join(' ') : '');
  if (firstNameEl && !firstNameEl.value) firstNameEl.value = fName;
  if (lastNameEl && !lastNameEl.value) lastNameEl.value = lName;
  if (emailEl && !emailEl.value) emailEl.value = user.email || '';
  if (phoneEl && !phoneEl.value) phoneEl.value = user.phone || '';
  [firstNameEl, lastNameEl, emailEl, phoneEl].forEach(el => {
    if (el) { el.readOnly = true; el.style.backgroundColor = '#f3f4f6'; el.style.cursor='not-allowed'; }
  });
  // Profile image preview
  if (user.profileImage) {
    const imgTag = document.getElementById('profileImageTag');
    if (imgTag) {
      // If path is relative (starts with /uploads) keep as is, else prefix
      if (user.profileImage.startsWith('/')) {
        imgTag.src = user.profileImage;
      } else if (user.profileImage.startsWith('http')) {
        imgTag.src = user.profileImage;
      } else {
        imgTag.src = `${BASE_URL}${user.profileImage}`;
      }
    }
  }
}

function showLoginRequiredModal() {
  const body = `
    <p style="margin-bottom:12px;">You need to be logged in to register as a trainer.</p>
    <div style="background:#fff4e5;padding:12px;border-radius:8px;border-left:4px solid #f59e0b;margin:12px 0;">
      <p style="margin:0;font-size:0.9rem;">Login now and you'll be redirected back here automatically.</p>
    </div>`;
  const footer = `
    <button class="action-btn secondary" onclick="closeTrainerModal()">Close</button>
    <button class="action-btn primary" onclick="proceedToLoginRedirect()"><i class='fas fa-sign-in-alt'></i> Login</button>`;
  showTrainerModal('🔐 Login Required', body, footer, false);
}

window.proceedToLoginRedirect = function() {
  // Save redirect anchor so we reopen modal post-login
  localStorage.setItem('postLoginRedirect', '/frontend/personaltraining.html#openTrainerRegistration');
  window.location.href = '/frontend/public/login.html';
};

// On load: if hash indicates reopen registration & token exists
document.addEventListener('DOMContentLoaded', () => {
  if (location.hash === '#openTrainerRegistration' && localStorage.getItem('token')) {
    setTimeout(() => { window.openTrainerRegistration(); }, 400);
  }
});

function closeRegistrationModal() {
    const registrationModal = document.getElementById('registrationModal');
    registrationModal.style.display = 'none';
    document.body.style.overflow = 'auto';
    
    // Reset form
    const form = document.getElementById('registrationForm');
    if (form) {
        form.reset();
        // Reset image preview
        const profileImageTag = document.getElementById('profileImageTag');
        profileImageTag.src = 'https://via.placeholder.com/120?text=Photo';
        
        // Hide success message
        const successMessage = document.getElementById('registration-success-message');
        successMessage.style.display = 'none';
        
        // Reset trainer type selection
        document.getElementById('gymTrainer').checked = true;
        document.getElementById('independentTrainerInfo').style.display = 'none';
        document.getElementById('gymSelectionSection').style.display = 'block';
        document.getElementById('insuranceCheckbox').style.display = 'none';
    }
}

async function loadGymsForRegistration() {
    try {
        const response = await fetch(`${BASE_URL}/api/gyms`);
        const gyms = await response.json();
        
        const gymSelect = document.getElementById('gym');
        if (gymSelect && gyms) {
            // Clear existing options except the first one
            gymSelect.innerHTML = '<option value="">-- Select Gym --</option>';
            
            gyms.forEach(gym => {
                const option = document.createElement('option');
                option.value = gym._id;
                option.textContent = `${gym.gymName} - ${gym.location?.city || 'Unknown City'}`;
                gymSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading gyms:', error);
    }
}

async function handleRegistrationSubmit(e) {
  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();
  
  // Prevent any page navigation during submission
  window.addEventListener('beforeunload', preventUnload);
  
  // Block Live Server WebSocket reconnections during form submission
  window.WebSocket = function() {
    console.log('🚫 WebSocket connection blocked during form submission');
    return { close: () => {}, send: () => {} };
  };
  
  // Fix: Remove required if agreeInsurance is hidden
  const agreeInsurance = document.getElementById('agreeInsurance');
  if (agreeInsurance) {
    const style = window.getComputedStyle(agreeInsurance.parentElement);
    if (style.display === 'none') {
      agreeInsurance.removeAttribute('required');
    }
  }

  // Store original WebSocket to restore later
  const originalWebSocket = window.WebSocket;
  
  const submitBtn = document.getElementById('submitRegistrationBtn');
  const btnText = submitBtn.querySelector('span');
  const btnLoader = submitBtn.querySelector('.btn-loader');
  const responseMessage = document.getElementById('formResponseMessage');
    
  // Show loading state
  submitBtn.disabled = true;
  btnText.style.display = 'none';
  btnLoader.style.display = 'block';
  responseMessage.style.display = 'none';
    
    try {
        const startTs = Date.now();
        console.log('🎯 Starting form submission process...');
        let watchdogFired = false;
        // Watchdog logs every 5s until completion
        const watchdog = setInterval(() => {
          const elapsed = ((Date.now() - startTs)/1000).toFixed(1);
          console.log(`⏱️ Submission still in progress... ${elapsed}s elapsed`);
          if (!watchdogFired && elapsed > 15) {
            watchdogFired = true;
            console.warn('⚠️ Taking longer than expected. Possibly large files or server delay.');
          }
        }, 5000);
        
        // Validate required fields first
        const specialtyFieldEl = document.getElementById('trainerSpecialty') || document.querySelector('#registrationModal select[name="specialty"]');
        const specialtyValueDebug = specialtyFieldEl ? specialtyFieldEl.value : '(not found)';
        console.log('🔍 Registration specialty field debug (pre-validation):', {
          elementFound: !!specialtyFieldEl,
          value: specialtyValueDebug
        });
        const requiredFields = {
          'firstName': document.getElementById('firstName').value,
          'lastName': document.getElementById('lastName').value,
          'email': document.getElementById('email').value,
          'phone': document.getElementById('phone').value,
          'specialty': specialtyValueDebug,
          'experience': document.getElementById('experience').value,
          'bio': document.getElementById('bio').value
        };
        
        // Check for missing required fields
        const missingFields = [];
        for (const [fieldName, value] of Object.entries(requiredFields)) {
            if (!value || value.trim() === '') {
                missingFields.push(fieldName);
            }
        }
        
        if (missingFields.length > 0) {
            throw new Error(`Please fill in all required fields: ${missingFields.join(', ')}`);
        }
        
    // Check bio length (reduced minimum from 100 to 30 characters per latest requirement)
        const isGymTrainer = document.getElementById('gymTrainer')?.checked;
        const selectedGymIdEl = document.getElementById('selectedGymId');
        if (isGymTrainer) {
          if (!selectedGymIdEl || !selectedGymIdEl.value) {
            throw new Error('Please select a partner gym from the list.');
          }
        } else {
          // Ensure hidden field cleared for independent trainers
          if (selectedGymIdEl) selectedGymIdEl.value = '';
        }
    const bioValue = requiredFields.bio;
    if (bioValue.length < 30) {
      throw new Error(`Bio must be at least 30 characters long. Current length: ${bioValue.length}`);
    }
        
        console.log('✅ Basic validation passed');
        
        // Check trainer type selection
        const trainerTypeElement = document.querySelector('input[name="trainerType"]:checked');
        if (!trainerTypeElement) {
            throw new Error('Please select a trainer type (Gym-based or Independent)');
        }
        
        console.log('✅ Trainer type selected:', trainerTypeElement.value);
        
        // Check required checkboxes
        const agreeTermsChecked = document.getElementById('agreeTerms').checked;
        const agreeBackgroundChecked = document.getElementById('agreeBackground').checked;
        
        if (!agreeTermsChecked) {
            throw new Error('Please agree to the Terms of Service and Privacy Policy');
        }
        
        if (!agreeBackgroundChecked) {
            throw new Error('Please consent to background verification and reference checks');
        }
        
        console.log('✅ All validations passed, creating FormData...');
        
        const formData = new FormData();
        
        // Get form values
        const firstName = document.getElementById('firstName').value;
        const lastName = document.getElementById('lastName').value;
        const email = document.getElementById('email').value;
        const phone = document.getElementById('phone').value;
  const specialtyEl = document.getElementById('trainerSpecialty') || document.querySelector('#registrationModal select[name="specialty"]');
  const specialty = specialtyEl ? specialtyEl.value : '';
  console.log('🔎 Specialty final selection:', { value: specialty, elementFound: !!specialtyEl });
        const experience = document.getElementById('experience').value;
        const bio = document.getElementById('bio').value;
        const trainerType = document.querySelector('input[name="trainerType"]:checked').value;
        
        // Handle enhanced rate structure
        const selectedRateTypes = Array.from(document.querySelectorAll('input[name="rateTypes"]:checked')).map(cb => cb.value);
        if (selectedRateTypes.length === 0) {
            throw new Error('Please select at least one rate type (hourly or monthly)');
        }
        
        let hourlyRateValue = null;
        let monthlyRateValue = null;
        
        if (selectedRateTypes.includes('hourly')) {
            hourlyRateValue = document.getElementById('hourlyRateValue').value;
            if (!hourlyRateValue || hourlyRateValue < 100) {
                throw new Error('Please enter a valid hourly rate (minimum ₹100)');
            }
        }
        
        if (selectedRateTypes.includes('monthly')) {
            monthlyRateValue = document.getElementById('monthlyRateValue').value;
            if (!monthlyRateValue || monthlyRateValue < 2000) {
                throw new Error('Please enter a valid monthly rate (minimum ₹2000)');
            }
        }
        
        // Append basic fields
        formData.append('firstName', firstName);
        formData.append('lastName', lastName);
        formData.append('email', email);
        formData.append('phone', phone);
        formData.append('specialty', specialty);
        formData.append('experience', experience);
        formData.append('bio', bio);
        formData.append('trainerType', trainerType);
        
        // Append enhanced rate structure
        selectedRateTypes.forEach(rateType => {
            formData.append('rateTypes', rateType);
        });
        
        if (hourlyRateValue) {
            formData.append('hourlyRateValue', hourlyRateValue);
        }
        
        if (monthlyRateValue) {
            formData.append('monthlyRateValue', monthlyRateValue);
        }
        
        // Handle locations
        const locationsSelect = document.getElementById('locations');
        const selectedLocations = Array.from(locationsSelect.selectedOptions).map(option => option.value);
        selectedLocations.forEach(location => {
            formData.append('locations', location);
        });
        
        // Handle availability
        const availability = collectAvailabilityData();
        formData.append('availability', JSON.stringify(availability));
        
        // Handle trainer type specific fields
        if (trainerType === 'gym') {
            const gym = document.getElementById('gym').value;
            if (!gym) {
                throw new Error('Please select a gym');
            }
            formData.append('gym', gym);
        } else if (trainerType === 'independent') {
            const hasInsurance = document.getElementById('agreeInsurance').checked;
            if (!hasInsurance) {
                throw new Error('Insurance confirmation is required for independent trainers');
            }
            formData.append('hasInsurance', hasInsurance);
        }
        
        // Handle file uploads
        const profileImage = document.getElementById('profileImageInput').files[0];
        if (profileImage) {
          // Backend expects field name 'photo' or 'profileImage'
          formData.append('photo', profileImage);
        }
        
        const certificationsInput = document.getElementById('certifications');
        const certifications = certificationsInput ? certificationsInput.files : [];
        let totalSize = profileImage ? profileImage.size : 0;
        for (let i = 0; i < certifications.length; i++) {
            formData.append('certifications', certifications[i]);
            totalSize += certifications[i].size;
        }
        const sizeMB = (totalSize / (1024*1024)).toFixed(2);
        console.log(`🧾 Total upload size: ${sizeMB} MB (${totalSize} bytes)`);
        if (totalSize > 15 * 1024 * 1024) {
          console.warn('⚠️ Large upload (>15MB) may take longer or be rejected by server limits');
        }
        
        // Submit form
        console.log('🚀 Submitting form to:', `${BASE_URL}/api/trainers/register`);
        console.log('📦 FormData contents:');
        for (let [key, value] of formData.entries()) {
            console.log(`  ${key}:`, value);
        }
        
        // Add timeout via AbortController (shorter 15s client timeout)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s
        let response;
        try {
          response = await fetch(`${BASE_URL}/api/trainers/register`, {
              method: 'POST',
              body: formData,
              signal: controller.signal
          });
        } catch(fetchErr) {
          if (fetchErr.name === 'AbortError') {
            throw new Error('Request timed out. Please check your connection and try again.');
          }
          throw fetchErr;
        } finally {
          clearTimeout(timeoutId);
        }
        
        console.log('📡 Response status:', response.status);
        console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));
        
        let result;
        try {
          result = await response.json();
        } catch(parseErr) {
          console.warn('Non-JSON response received');
          result = { message: 'Unexpected server response' };
        }
        console.log('📡 Response data:', result);
        
        if (response.ok) {
            // Success - show modal and close registration form
            console.log('✅ Registration successful!');
            
            // Immediately remove beforeunload to prevent dialog
            window.removeEventListener('beforeunload', preventUnload);
            
            // Restore WebSocket functionality
            window.WebSocket = originalWebSocket;
            
            closeRegistrationModal();
            showRegistrationSuccess();
            
            // Reset form after successful submission
            setTimeout(() => {
                document.getElementById('registrationForm').reset();
            }, 500);
        } else {
            console.error('❌ Registration failed:', result);
            throw new Error(result.message || 'Registration failed');
        }
        
  } catch (error) {
        console.error('🚨 Registration error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name,
            error: error
        });
        
        // Check if it's a network error
        if (error instanceof TypeError && error.message.includes('fetch')) {
            console.error('🌐 Network error detected - attempting diagnostics...');
            // Quick diagnostic pings
            (async () => {
              try {
                const simple = await fetch(`${BASE_URL}/api/simple-test`).then(r=>({ok:r.ok,status:r.status})).catch(e=>({error:e.message}));
                console.log('🧪 simple-test ping result:', simple);
              } catch(e){ console.warn('simple-test ping failed', e); }
              // Try alternate host swap 127.0.0.1 <-> localhost
              const currentHost = window.location.hostname;
              const altHost = currentHost === '127.0.0.1' ? 'localhost' : '127.0.0.1';
              const altBase = `${window.location.protocol}//${altHost}:5000`;
              console.log('🔁 Trying alternate host for retry:', altBase);
              try {
                const controller2 = new AbortController();
                const timeout2 = setTimeout(()=>controller2.abort(),8000);
                const retryResp = await fetch(`${altBase}/api/trainers/register`, { method:'POST', body: formData, signal: controller2.signal });
                clearTimeout(timeout2);
                if (retryResp.ok) {
                   console.log('✅ Retry via alternate host succeeded');
                   const retryData = await retryResp.json().catch(()=>({}));
                   
                   // Immediately remove beforeunload to prevent dialog
                   window.removeEventListener('beforeunload', preventUnload);
                   
                   // Restore WebSocket functionality
                   window.WebSocket = originalWebSocket;
                   
                   closeRegistrationModal();
                   showRegistrationSuccess();
                   
                   // Reset form after successful submission
                   setTimeout(() => {
                       document.getElementById('registrationForm').reset();
                   }, 500);
                   return;
                } else {
                   console.warn('Retry response status:', retryResp.status);
                }
              } catch(retryErr) { console.warn('Alternate host retry failed:', retryErr.message); }
            })();
            
            // Restore WebSocket and clear the beforeunload prevention on error
            window.WebSocket = originalWebSocket;
            window.removeEventListener('beforeunload', preventUnload);
            
            showRegistrationError('Network error: Could not reach server. Verify server is running on port 5000 and CORS/origin allowed.');
        } else {
            // Restore WebSocket and clear the beforeunload prevention on error
            window.WebSocket = originalWebSocket;
            window.removeEventListener('beforeunload', preventUnload);
            
            showRegistrationError(error.message || 'An unexpected error occurred. Please try again.');
        }
  } finally {
        // Ensure cleanup happens regardless of success or failure
        window.removeEventListener('beforeunload', preventUnload);
        if (typeof originalWebSocket !== 'undefined') {
            window.WebSocket = originalWebSocket;
        }
        
        // Reset loading state
        submitBtn.disabled = false;
        btnText.style.display = 'inline';
        btnLoader.style.display = 'none';
    // Clear watchdog
    if (typeof watchdog !== 'undefined') clearInterval(watchdog);
    }
}

function collectAvailabilityData() {
    const availability = {};
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    days.forEach(day => {
        const input = document.querySelector(`input[name="availability[${day}]"]`);
        if (input && input.value.trim()) {
            availability[day] = input.value.trim();
        }
    });
    
    return availability;
}

function initializeAvailabilityFunctions() {
    // Quick availability buttons
    window.setQuickAvailability = function(type) {
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
        const weekends = ['saturday', 'sunday'];
        
        let timeSlot = '';
        let targetDays = [];
        
        switch(type) {
            case 'morning':
                timeSlot = '6AM-10AM';
                targetDays = weekdays;
                break;
            case 'evening':
                timeSlot = '6PM-9PM';
                targetDays = weekdays;
                break;
            case 'fulltime':
                timeSlot = '6AM-10AM, 6PM-9PM';
                targetDays = days;
                break;
        }
        
        targetDays.forEach(day => {
            const input = document.querySelector(`input[name="availability[${day}]"]`);
            if (input) {
                input.value = timeSlot;
            }
        });
    };
    
    window.clearAvailability = function() {
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        days.forEach(day => {
            const input = document.querySelector(`input[name="availability[${day}]"]`);
            if (input) {
                input.value = '';
            }
        });
    };
}

function showSuccessMessage() {
    const successMessage = document.getElementById('registration-success-message');
    const form = document.getElementById('registrationForm');
    
    form.style.display = 'none';
    successMessage.style.display = 'block';
    
    // Scroll to success message
    successMessage.scrollIntoView({ behavior: 'smooth' });
}

function showErrorMessage(message) {
    const responseMessage = document.getElementById('formResponseMessage');
    
    responseMessage.innerHTML = `
        <div style="background-color: #f8d7da; color: #721c24; padding: 15px; border-radius: 8px; border: 1px solid #f5c6cb;">
            <i class="fas fa-exclamation-triangle"></i>
            <strong>Error:</strong> ${message}
        </div>
    `;
    responseMessage.style.display = 'block';
    
    // Scroll to error message
    responseMessage.scrollIntoView({ behavior: 'smooth' });
}

// Character count for bio
document.addEventListener('DOMContentLoaded', function() {
    const bioTextarea = document.getElementById('bio');
    if (bioTextarea) {
        bioTextarea.addEventListener('input', function() {
            const charCount = this.value.length;
            const minChars = 30; // Adjusted to match new validation minimum
            
            // Find or create character counter
            let counter = this.parentNode.querySelector('.char-counter');
            if (!counter) {
                counter = document.createElement('small');
                counter.className = 'char-counter';
                counter.style.marginTop = '5px';
                counter.style.display = 'block';
                this.parentNode.appendChild(counter);
            }
            
            if (charCount < minChars) {
                counter.textContent = `${charCount}/${minChars} characters (${minChars - charCount} more needed)`;
                counter.style.color = '#dc3545';
            } else {
                counter.textContent = `${charCount} characters ✓`;
                counter.style.color = '#28a745';
            }
        });
    }
  // Detect unexpected page unload (debugging form submission reloads)
  window.addEventListener('beforeunload', (e) => {
    if (document.getElementById('submitRegistrationBtn')?.disabled) {
      console.warn('⚠️ Page unloading while submission in progress – possible manual refresh or navigation.');
    }
  });
});

// === Success/Error Dialog Modal Functions (Similar to settings.html pattern) ===
function showTrainerModal(title, body, footer = '', isSuccess = false) {
    const modalTitle = document.getElementById('trainer-modal-title');
    const modalBody = document.getElementById('trainer-modal-body');
    const modalFooter = document.getElementById('trainer-modal-footer');
    const modalOverlay = document.getElementById('trainer-modal-overlay');
    
    // Add icon based on success/error
    const icon = isSuccess ? 
        '<div class="success-icon"><i class="fas fa-check-circle"></i></div>' : 
        '<div class="error-icon"><i class="fas fa-exclamation-triangle"></i></div>';
    
    modalTitle.textContent = title;
    modalBody.innerHTML = icon + body;
    
    if (footer) {
        modalFooter.innerHTML = footer;
    } else {
        modalFooter.innerHTML = '<button class="action-btn secondary" onclick="closeTrainerModal()">Close</button>';
    }
    
    modalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeTrainerModal() {
    const modalOverlay = document.getElementById('trainer-modal-overlay');
    modalOverlay.classList.remove('active');
    document.body.style.overflow = 'auto';
}

// Click outside modal to close
document.addEventListener('DOMContentLoaded', function() {
    const modalOverlay = document.getElementById('trainer-modal-overlay');
    if (modalOverlay) {
        modalOverlay.addEventListener('click', function(e) {
            if (e.target === modalOverlay) {
                closeTrainerModal();
            }
        });
    }
});

// === Show success message after registration ===
function showRegistrationSuccess() {
    const successBody = `
        <p style="margin-bottom: 16px;"><strong>Your trainer registration has been submitted successfully!</strong></p>
        <div style="background: #f0f9ff; padding: 16px; border-radius: 8px; border-left: 4px solid #2a9d8f; margin: 16px 0;">
            <h4 style="margin: 0 0 12px 0; color: #1e40af;">What happens next?</h4>
            <ul style="margin: 0; padding-left: 20px; color: #374151;">
                <li>Our team will review your application and certifications</li>
                <li>You'll receive an email notification once your application is reviewed</li>
                <li>Review process typically takes 2-3 business days</li>
                <li>Approved trainers will be listed on our platform</li>
            </ul>
        </div>
        <p style="color: #6b7280; font-size: 0.9rem; margin-top: 16px;">
            <i class="fas fa-info-circle"></i> 
            You can close this dialog and continue browsing. We'll keep you updated via email.
        </p>
    `;
    
    const footer = `
        <button class="action-btn primary" onclick="closeTrainerModal(); window.location.reload();">
            <i class="fas fa-home"></i> Continue Browsing
        </button>
    `;
    
    showTrainerModal('🎉 Registration Submitted!', successBody, footer, true);
}

// === Show error message ===
function showRegistrationError(errorMessage) {
    const errorBody = `
        <p style="margin-bottom: 16px;"><strong>Registration Failed</strong></p>
        <div style="background: #fef2f2; padding: 16px; border-radius: 8px; border-left: 4px solid #ef4444; margin: 16px 0;">
            <p style="margin: 0; color: #dc2626;">${errorMessage}</p>
        </div>
        <p style="color: #6b7280; font-size: 0.9rem; margin-top: 16px;">
            <i class="fas fa-info-circle"></i> 
            Please check your information and try again. If the problem persists, contact our support team.
        </p>
    `;
    
    const footer = `
        <button class="action-btn secondary" onclick="closeTrainerModal()">Try Again</button>
        <button class="action-btn primary" onclick="closeTrainerModal(); window.location.href='contact.html';">
            <i class="fas fa-headset"></i> Contact Support
        </button>
    `;
    
    showTrainerModal('❌ Registration Error', errorBody, footer, false);
}

// Function to prevent page unloading during form submission
function preventUnload(e) {
    // Only prevent if form submission is actually in progress
    const submitBtn = document.getElementById('submitRegistrationBtn');
    if (submitBtn && submitBtn.disabled) {
        e.preventDefault();
        e.returnValue = 'Form submission in progress. Are you sure you want to leave?';
        return 'Form submission in progress. Are you sure you want to leave?';
    }
    // Allow normal navigation if form is not being submitted
}