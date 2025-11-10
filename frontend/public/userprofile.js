document.addEventListener("DOMContentLoaded", function () {
  const token = localStorage.getItem('token');

  // ✅ Redirect if not logged in
  if (!token) {
    console.warn('No token found in localStorage. Redirecting to login...');
    window.location.href = 'login.html';
    return;
  }

  // ✅ CRITICAL: Prevent unhandled promise rejections from causing page reloads
  window.addEventListener('unhandledrejection', function(event) {
    console.warn('🛡️ Caught unhandled promise rejection:', event.reason);
    event.preventDefault(); // Prevent default browser behavior (reload)
  });

  // === NAVIGATION BAR: Toggle & Active Link Highlight ===
  const menuToggle = document.querySelector('.menu-toggle');
  const navLinks = document.querySelector('.nav-links');
  const links = document.querySelectorAll('.nav-link');
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

  // === ID PASS: Fetch & Populate Functions (defined before use) ===
  async function fetchIDPass(email) {
    if (!email) {
      console.warn('No email provided for ID pass fetch');
      return;
    }
    
    const base = window.API_CONFIG ? window.API_CONFIG.BASE_URL : 'http://localhost:5000';
    console.log(`Fetching ID pass for email: ${email} from ${base}`);
    
    try {
      const resp = await fetch(`${base}/api/id-pass/by-email/${encodeURIComponent(email)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (resp.status === 404) {
        // No pass yet - this is normal for users without membership
        console.log('No ID pass found for this user (404)');
        const idPassCard = document.getElementById('idPassCard');
        const noPassMessage = document.getElementById('no-pass-message');
        const noMembership = document.getElementById('no-membership-for-pass');
        if (idPassCard) idPassCard.style.display = 'none';
        if (noPassMessage) noPassMessage.style.display = 'block';
        if (noMembership) noMembership.style.display = 'none';
        return;
      }

      if (!resp.ok) {
        console.warn(`ID pass fetch failed with status: ${resp.status}`);
        throw new Error(`Status ${resp.status}`);
      }
      
      const data = await resp.json();
      console.log('ID pass data received:', data);
      window.currentPassData = data;
      populateIDPass(data);
    } catch (err) {
      // Network error or server not running - gracefully handle
      console.warn('⚠️ ID pass feature unavailable:', err.message);
      
      // Show no-pass message (safe fallback - doesn't break the page)
      const idPassCard = document.getElementById('idPassCard');
      const noPassMessage = document.getElementById('no-pass-message');
      if (idPassCard) idPassCard.style.display = 'none';
      if (noPassMessage) {
        noPassMessage.style.display = 'block';
        noPassMessage.innerHTML = '<i class="fas fa-info-circle"></i> ID Pass data unavailable';
      }
      // Do NOT throw - just return gracefully
    }
  }

  function populateIDPass(data) {
    if (!data || !data.member) return;
    const member = data.member;

    // Show ID pass card
    const idPassCard = document.getElementById('idPassCard');
    const noPassMessage = document.getElementById('no-pass-message');
    const noMembership = document.getElementById('no-membership-for-pass');
    if (idPassCard) {
      idPassCard.classList.remove('loading');
      idPassCard.style.display = 'block';
    }
    if (noPassMessage) noPassMessage.style.display = 'none';
    if (noMembership) noMembership.style.display = 'none';

    const setText = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value || ''; };

    setText('passIdDisplay', data.passId || (data.pass && data.pass.passId) || 'N/A');
    const passPhoto = document.getElementById('passMemberPhoto');
    if (passPhoto && member.profileImage) passPhoto.src = member.profileImage.startsWith('http') ? member.profileImage : `${window.API_CONFIG ? window.API_CONFIG.BASE_URL : 'http://localhost:5000'}${member.profileImage}`;

    const qrImage = document.getElementById('passQRImage');
    if (qrImage && data.qrDataUrl) { qrImage.src = data.qrDataUrl; qrImage.style.display = 'block'; }

    setText('passMemberName', getFullName(member) || member.username || member.email || 'Member');
    setText('passPlanBadge', (data.plan || data.pass?.plan) || 'Standard');
    setText('passDurationBadge', (data.duration || data.pass?.duration) || '-');
    setText('passEmail', member.email || '-');
    setText('passPhone', member.phone || '-');
    setText('passActivity', (member.activity || '-'));
    setText('passValidFrom', data.validFrom ? formatDate(data.validFrom) : (data.pass?.validFrom ? formatDate(data.pass.validFrom) : '-'));
    setText('passValidUntil', data.validUntil ? formatDate(data.validUntil) : (data.pass?.validUntil ? formatDate(data.pass.validUntil) : '-'));
    const statusIndicator = document.getElementById('passStatusIndicator');
    if (statusIndicator) statusIndicator.textContent = (data.status || (data.pass && data.pass.status) || 'ACTIVE').toUpperCase();
    setText('passGymName', (data.gymName || data.pass?.gymName) || 'Gym-Wale');
  }

  // === DIET PLAN POPULATION FUNCTION (defined before use) ===
  function populateDietPlan(dietPlan) {
    console.log("Populating diet plan:", dietPlan);
    const mealTypes = ['breakfast', 'lunch', 'dinner', 'snacks'];
    mealTypes.forEach(meal => {
      const mealCard = Array.from(document.querySelectorAll('.meal-card')).find(card =>
        card.querySelector('.meal-header h4') &&
        card.querySelector('.meal-header h4').textContent.trim().toLowerCase() === meal
      );
      if (mealCard && dietPlan.selectedMeals && dietPlan.selectedMeals[meal]) {
        const mealItems = mealCard.querySelector('.meal-items');
        const caloriesSpan = mealCard.querySelector('.calories');
        const items = dietPlan.selectedMeals[meal];

        if (mealItems) {
          mealItems.innerHTML = items
            .map(item => `<li>${item.name} <span class="cal">${item.calories} kcal</span></li>`)
            .join('');
        }

        // Calculate and display total calories for this meal
        if (caloriesSpan) {
          const totalCalories = items.reduce((sum, item) => sum + (item.calories || 0), 0);
          caloriesSpan.textContent = `${totalCalories} cal`;
        }
      }
    });
  }

  // ✅ Fetch user profile
  const profileUrl = (typeof buildApiUrl === 'function') ? buildApiUrl(window.API_CONFIG.ENDPOINTS.USER_PROFILE) : `${window.API_CONFIG ? window.API_CONFIG.BASE_URL : 'http://localhost:5000'}/api/users/profile`;
  fetch(profileUrl, {
    method: 'GET',
    headers: {
      'Content-Type': "application/json",
      'Authorization': `Bearer ${token}`
    }
  })
    .then(async (res) => {
      if (!res.ok) {
        const errText = await res.text();
        // Store status code for error handling
        const error = new Error(`Server responded with ${res.status}: ${errText}`);
        error.status = res.status;
        throw error;
      }
      return res.json();
    })
    .then(user => {
      // Enhanced profile population with loading management
      populateEnhancedProfile(user);

      // === FETCH ID PASS - TEMPORARILY DISABLED FOR TESTING ===
      // fetchIDPass(user.email.trim().toLowerCase());
      console.log('🔧 ID Pass fetch temporarily disabled for testing');

      // === DIET PLAN ===
      if (user.dietPlan) {
        populateDietPlan(user.dietPlan);
      }
    })
    .catch(err => {
      console.error('❌ Error fetching profile:', err);
      
      // Check if it's an authentication error (401/403) - only then redirect to login
      if (err.status === 401 || err.status === 403) {
        console.warn('🔒 Authentication failed. Redirecting to login...');
        showProfileError();
        setTimeout(() => {
          alert('Session expired. Please log in again.');
          localStorage.removeItem('token');
          window.location.href = 'login.html';
        }, 2000);
      } else if (err.message === 'Failed to fetch') {
        // Network error - server not reachable
        console.warn('⚠️ Backend server not reachable. Showing offline mode...');
        showOfflineMode();
      } else {
        // Other errors - show error but don't redirect
        console.error('❌ Unexpected error loading profile:', err);
        showProfileError();
        // Show user-friendly message
        const errorBanner = document.createElement('div');
        errorBanner.style.cssText = 'position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background: #ff6b6b; color: white; padding: 15px 30px; border-radius: 8px; z-index: 10000; box-shadow: 0 4px 12px rgba(0,0,0,0.15);';
        errorBanner.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Unable to load profile data. Please refresh the page.';
        document.body.appendChild(errorBanner);
        setTimeout(() => errorBanner.remove(), 5000);
      }
    });

  // === ENHANCED PROFILE POPULATION FUNCTION ===
  function populateEnhancedProfile(user) {
    // Hide profile image loader
    const profileImageLoader = document.getElementById('profileImageLoader');
    if (profileImageLoader) {
      profileImageLoader.style.display = 'none';
    }

    // Calculate profile completion
    const completionData = calculateProfileCompletion(user);
    updateProfileCompletion(completionData);

    // Basic profile info
    updateElementWithLoading('username', getFullName(user) || user.username || 'Unknown User');
    updateElementWithLoading('useremail', user.email || 'Not provided');
    updateElementWithLoading('userphone', formatPhoneNumber(user.phone) || 'Not provided');
    
    // Format and display birthdate
    const birthdate = user.birthdate ? formatDate(user.birthdate) : 'Not provided';
    updateElementWithLoading('userbirthdate', birthdate);
    
    // Calculate and display join date
    const joinDate = user.createdAt ? formatJoinDate(user.createdAt) : 'Unknown';
    updateElementWithLoading('joinDate', joinDate);
    updateElementWithLoading('memberSince', getShortJoinDate(user.createdAt));

    // Fitness profile
    const height = formatHeight(user.height);
    updateElementWithLoading('userheight', height || 'Not provided');
    updateElementWithLoading('userweight', user.weight ? `${user.weight} kg` : 'Not provided');
    updateElementWithLoading('userfitnessLevel', formatFitnessLevel(user.fitnessLevel) || 'Not set');
    updateElementWithLoading('userprimaryGoal', formatGoal(user.primaryGoal) || 'Not set');

    // Preferences
    updateElementWithLoading('usertheme', formatTheme(user.theme) || 'System Default');
    updateElementWithLoading('usermeasurementSystem', formatMeasurement(user.measurementSystem) || 'Not set');
    updateElementWithLoading('usernotifications', formatNotifications(user.notifications) || 'All');
    updateElementWithLoading('usertwoFactor', user.twoFactorEnabled ? 'Enabled' : 'Disabled');

    // Profile picture
    const apiBase = window.API_CONFIG ? window.API_CONFIG.BASE_URL : 'http://localhost:5000';
    const profilePicUrl = user.profileImage
      ? (user.profileImage.startsWith('http') ? user.profileImage : `${apiBase}${user.profileImage}`)
      : `${apiBase}/uploads/profile-pics/default.png`;
    document.getElementById("profileImage").src = profilePicUrl;
    
    const userIconImage = document.getElementById("profile-icon-img");
    if (userIconImage) {
      userIconImage.src = profilePicUrl;
    }

    // Update badges
    updateProfileBadges(user);

    // === ACTIVITY PREFERENCES ===
    populateActivityPreferences(user.workoutPreferences || []);

    // Update mock stats (in a real app, these would come from the backend)
    updateQuickStats();

    // Check and display incomplete fields
    checkAndDisplayIncompleteFields(user);
  }

  // === HELPER FUNCTIONS FOR ENHANCED PROFILE ===
  function updateElementWithLoading(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
      const loadingText = element.querySelector('.loading-text');
      if (loadingText) {
        // Replace loading text with actual value
        loadingText.textContent = value;
        loadingText.classList.remove('loading-text');
      } else {
        element.textContent = value;
      }
    }
  }

  function getFullName(user) {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user.username || user.name;
  }

  function formatPhoneNumber(phone) {
    if (!phone) return null;
    // Simple formatting for Indian numbers
    if (phone.length === 10) {
      return `+91 ${phone.slice(0, 5)} ${phone.slice(5)}`;
    }
    return phone;
  }

  function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  }

  function formatJoinDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  function getShortJoinDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 30) {
      return `${diffDays}d`;
    } else if (diffDays < 365) {
      return `${Math.floor(diffDays / 30)}m`;
    } else {
      return `${Math.floor(diffDays / 365)}y`;
    }
  }

  function formatHeight(height) {
    if (!height || (!height.feet && !height.inches)) return null;
    const feet = height.feet || 0;
    const inches = height.inches || 0;
    return `${feet}'${inches}"`;
  }

  function formatFitnessLevel(level) {
    if (!level) return null;
    return level.charAt(0).toUpperCase() + level.slice(1);
  }

  function formatGoal(goal) {
    if (!goal) return null;
    return goal.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }

  function formatTheme(theme) {
    if (!theme) return null;
    return theme.charAt(0).toUpperCase() + theme.slice(1);
  }

  function formatMeasurement(system) {
    if (!system) return null;
    return system === 'metric' ? 'Metric (kg, cm)' : 'Imperial (lbs, ft)';
  }

  function formatNotifications(notifications) {
    if (!notifications) return null;
    switch (notifications) {
      case 'all': return 'All Notifications';
      case 'important': return 'Important Only';
      case 'none': return 'None';
      default: return notifications;
    }
  }

  function updateProfileBadges(user) {
    const membershipBadge = document.getElementById('membershipBadge');
    const verifiedBadge = document.getElementById('verifiedBadge');
    
    // Update membership badge based on some criteria
    if (membershipBadge) {
      // This would be determined by actual membership status
      membershipBadge.textContent = 'Premium';
    }
    
    // Show verified badge if user has verified email (example)
    if (verifiedBadge && user.emailVerified) {
      verifiedBadge.style.display = 'inline-flex';
    }
  }

  function populateActivityPreferences(preferences) {
    const prefContainer = document.getElementById('activityPreferences');
    if (prefContainer) {
      prefContainer.classList.remove('loading');
      prefContainer.innerHTML = '';
      
      const allActivities = [
        { name: 'cardio', icon: 'fas fa-running', label: 'Cardio' },
        { name: 'strength', icon: 'fas fa-dumbbell', label: 'Strength' },
        { name: 'yoga', icon: 'fas fa-spa', label: 'Yoga' },
        { name: 'hiit', icon: 'fas fa-fire', label: 'HIIT' },
        { name: 'crossfit', icon: 'fas fa-bolt', label: 'CrossFit' },
        { name: 'pilates', icon: 'fas fa-leaf', label: 'Pilates' },
        { name: 'swimming', icon: 'fas fa-swimmer', label: 'Swimming' },
        { name: 'cycling', icon: 'fas fa-biking', label: 'Cycling' }
      ];
      
      allActivities.forEach(activity => {
        const tag = document.createElement('span');
        tag.className = `tag ${preferences.includes(activity.name) ? 'active' : ''}`;
        tag.innerHTML = `<i class="${activity.icon}"></i> ${activity.label}`;
        prefContainer.appendChild(tag);
      });
    }
  }

  function updateQuickStats() {
    // Mock data - in a real app, this would come from actual user data
    const totalWorkouts = Math.floor(Math.random() * 200) + 50;
    const currentStreak = Math.floor(Math.random() * 15) + 1;
    
    updateElementWithLoading('totalWorkouts', totalWorkouts.toString());
    updateElementWithLoading('currentStreak', currentStreak.toString());
  }

  // === PROFILE COMPLETION FUNCTIONS ===
  function calculateProfileCompletion(user) {
    const fields = {
      // Essential fields (higher weight)
      email: { value: user.email, weight: 2, required: true },
      phone: { value: user.phone, weight: 2, required: true },
      birthdate: { value: user.birthdate, weight: 1.5, required: false },
      profileImage: { value: user.profileImage && !user.profileImage.includes('default.png'), weight: 1, required: false },
      
      // Fitness fields (medium weight)
      height: { value: user.height && (user.height.feet || user.height.inches), weight: 1.5, required: false },
      weight: { value: user.weight, weight: 1.5, required: false },
      fitnessLevel: { value: user.fitnessLevel, weight: 1, required: false },
      primaryGoal: { value: user.primaryGoal, weight: 1, required: false },
      
      // Additional fields (lower weight)
      firstName: { value: user.firstName, weight: 0.5, required: false },
      lastName: { value: user.lastName, weight: 0.5, required: false },
      theme: { value: user.theme, weight: 0.3, required: false },
      notifications: { value: user.notifications, weight: 0.3, required: false }
    };

    let totalWeight = 0;
    let completedWeight = 0;
    const incomplete = [];

    Object.keys(fields).forEach(key => {
      const field = fields[key];
      totalWeight += field.weight;
      
      if (field.value) {
        completedWeight += field.weight;
      } else {
        incomplete.push({
          key,
          label: getFieldLabel(key),
          required: field.required,
          weight: field.weight
        });
      }
    });

    const percentage = Math.round((completedWeight / totalWeight) * 100);
    
    return {
      percentage,
      incomplete,
      isComplete: percentage >= 90,
      isPartiallyComplete: percentage >= 60,
      totalFields: Object.keys(fields).length,
      completedFields: Object.keys(fields).length - incomplete.length
    };
  }

  function getFieldLabel(key) {
    const labels = {
      email: 'Email',
      phone: 'Phone Number',
      birthdate: 'Date of Birth',
      profileImage: 'Profile Picture',
      height: 'Height',
      weight: 'Weight',
      fitnessLevel: 'Fitness Level',
      primaryGoal: 'Primary Goal',
      firstName: 'First Name',
      lastName: 'Last Name',
      theme: 'Theme Preference',
      notifications: 'Notification Settings'
    };
    return labels[key] || key;
  }

  function updateProfileCompletion(completionData) {
    const { percentage, incomplete, isComplete } = completionData;
    
    // Update completion circle
    const completionCircle = document.getElementById('profileCompletionCircle');
    const completionProgress = document.getElementById('completionProgress');
    const completionPercentage = document.getElementById('completionPercentage');
    
    if (completionCircle && completionProgress && completionPercentage) {
      // Calculate stroke-dasharray for circle progress
      const radius = 64;
      const circumference = 2 * Math.PI * radius;
      const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
      
      completionProgress.style.strokeDasharray = strokeDasharray;
      completionPercentage.textContent = `${percentage}%`;
      
      // Update circle color based on completion
      if (percentage >= 90) {
        completionCircle.className = 'profile-completion-circle complete';
        completionPercentage.className = 'profile-completion-percentage complete';
      } else if (percentage >= 60) {
        completionCircle.className = 'profile-completion-circle incomplete';
        completionPercentage.className = 'profile-completion-percentage incomplete';
      } else {
        completionCircle.className = 'profile-completion-circle very-incomplete';
        completionPercentage.className = 'profile-completion-percentage very-incomplete';
      }
    }

    // Show completion banner if profile is incomplete
    const completionBanner = document.getElementById('profileCompletionBanner');
    const completionText = document.getElementById('completionText');
    
    if (!isComplete && completionBanner && completionText) {
      completionBanner.style.display = 'block';
      completionText.textContent = `${percentage}%`;
    } else if (completionBanner) {
      completionBanner.style.display = 'none';
    }
  }

  function checkAndDisplayIncompleteFields(user) {
    // Check each field and show incomplete indicators
    const fieldChecks = [
      { id: 'emailIncomplete', value: user.email, verified: user.emailVerified },
      { id: 'phoneIncomplete', value: user.phone },
      { id: 'birthdateIncomplete', value: user.birthdate },
      { id: 'heightIncomplete', value: user.height && (user.height.feet || user.height.inches) },
      { id: 'weightIncomplete', value: user.weight },
      { id: 'fitnessLevelIncomplete', value: user.fitnessLevel },
      { id: 'primaryGoalIncomplete', value: user.primaryGoal }
    ];

    // Check contact info card
    let contactIncomplete = false;
    fieldChecks.slice(0, 3).forEach(check => {
      const element = document.getElementById(check.id);
      if (element) {
        if (!check.value || (check.id === 'emailIncomplete' && !check.verified)) {
          element.style.display = 'flex';
          contactIncomplete = true;
          
          // Mark the detail value as incomplete
          const valueElement = element.parentElement.querySelector('.detail-value');
          if (valueElement && !check.value) {
            valueElement.classList.add('incomplete');
          }
        } else {
          element.style.display = 'none';
        }
      }
    });

    // Check fitness profile card
    let fitnessIncomplete = false;
    fieldChecks.slice(3).forEach(check => {
      const element = document.getElementById(check.id);
      if (element) {
        if (!check.value) {
          element.style.display = 'flex';
          fitnessIncomplete = true;
          
          // Mark the detail value as incomplete
          const valueElement = element.parentElement.querySelector('.detail-value');
          if (valueElement) {
            valueElement.classList.add('incomplete');
          }
        } else {
          element.style.display = 'none';
        }
      }
    });

    // Update card styles
    const contactCard = document.getElementById('contactInfoCard');
    const fitnessCard = document.getElementById('fitnessProfileCard');
    
    if (contactCard) {
      if (contactIncomplete) {
        contactCard.classList.add('incomplete');
      } else {
        contactCard.classList.remove('incomplete');
      }
    }
    
    if (fitnessCard) {
      if (fitnessIncomplete) {
        fitnessCard.classList.add('incomplete');
      } else {
        fitnessCard.classList.remove('incomplete');
      }
    }
  }

  function showProfileError() {
    // Show error state for all loading elements
    const loadingTexts = document.querySelectorAll('.loading-text');
    loadingTexts.forEach(element => {
      element.textContent = 'Error loading';
      element.classList.remove('loading-text');
      element.style.color = '#e76f51';
    });
    
    const loadingSkeletons = document.querySelectorAll('.loading-skeleton');
    loadingSkeletons.forEach(skeleton => {
      skeleton.style.display = 'none';
    });
  }

  function showOfflineMode() {
    // Show offline banner
    const offlineBanner = document.createElement('div');
    offlineBanner.id = 'offline-banner';
    offlineBanner.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 12px 20px;
      text-align: center;
      z-index: 10000;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      font-size: 14px;
    `;
    offlineBanner.innerHTML = `
      <i class="fas fa-wifi-slash"></i> 
      <strong>Offline Mode</strong> - Backend server is not reachable. Some features may be unavailable.
      <button onclick="location.reload()" style="margin-left: 15px; background: rgba(255,255,255,0.2); border: 1px solid white; color: white; padding: 5px 15px; border-radius: 4px; cursor: pointer;">
        <i class="fas fa-sync-alt"></i> Retry
      </button>
    `;
    document.body.insertBefore(offlineBanner, document.body.firstChild);
    
    // Show offline state for loading elements
    const loadingTexts = document.querySelectorAll('.loading-text');
    loadingTexts.forEach(element => {
      element.textContent = 'Unavailable (Offline)';
      element.classList.remove('loading-text');
      element.style.color = '#999';
    });
    
    const loadingSkeletons = document.querySelectorAll('.loading-skeleton');
    loadingSkeletons.forEach(skeleton => {
      skeleton.style.display = 'none';
    });
    
    // Hide ID pass card since it requires backend
    const idPassCard = document.getElementById('idPassCard');
    const noPassMessage = document.getElementById('no-pass-message');
    if (idPassCard) idPassCard.style.display = 'none';
    if (noPassMessage) {
      noPassMessage.style.display = 'block';
      noPassMessage.innerHTML = '<i class="fas fa-wifi-slash"></i> ID Pass unavailable in offline mode';
    }
  }

  // === SHARE PROFILE FUNCTION ===
  window.shareProfile = function() {
    if (navigator.share) {
      navigator.share({
        title: 'My FIT-verse Profile',
        text: 'Check out my fitness journey on FIT-verse!',
        url: window.location.href
      });
    } else {
      // Fallback - copy to clipboard
      navigator.clipboard.writeText(window.location.href).then(() => {
        alert('Profile link copied to clipboard!');
      });
    }
  }

  // === DIET PLAN FETCHING ===
  // Fetch user diet plan from dietController
  fetch(`${window.API_CONFIG ? window.API_CONFIG.BASE_URL : 'http://localhost:5000'}/api/diet/my-plan`, {
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
  .then(plan => {
    console.log("Fetched diet plan:", plan); // Debug
    const mealTypes = ['breakfast', 'lunch', 'dinner', 'snacks'];
    mealTypes.forEach(meal => {
      const mealCard = Array.from(document.querySelectorAll('.meal-card')).find(card =>
        card.querySelector('.meal-header h4') &&
        card.querySelector('.meal-header h4').textContent.trim().toLowerCase() === meal
      );
      if (mealCard && plan.selectedMeals && plan.selectedMeals[meal]) {
        const mealItems = mealCard.querySelector('.meal-items');
        const caloriesSpan = mealCard.querySelector('.calories');
        const items = plan.selectedMeals[meal];

        if (mealItems) {
          mealItems.innerHTML = items
            .map(item => `<li>${item.name} <span class="cal">${item.calories} kcal</span></li>`)
            .join('');
        }

        // Calculate and display total calories for this meal
        if (caloriesSpan) {
          const totalCalories = items.reduce((sum, item) => sum + (item.calories || 0), 0);
          caloriesSpan.textContent = `${totalCalories} cal`;
        }
      }
    });
  })
  .catch(err => {
    console.warn('No diet plan found or error fetching diet plan:', err);
    // Optionally, show a message in the UI
  });

  // --- Workout Schedule Creator Logic ---

const daysOfWeek = [
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"
];

let workoutSchedule = {}; // { Monday: [ {type, duration, time, tag}, ... ], ... }
let currentDay = "Monday";

// Initialize schedule with empty arrays
daysOfWeek.forEach(day => workoutSchedule[day] = []);

// UI Elements
const dayPills = document.querySelectorAll('.day-pill');
const workoutForm = document.querySelector('.workout-form');
const addBtn = document.querySelector('.btn-add');
const scheduleBuilder = document.querySelector('.schedule-builder');
const scheduledWorkoutsDiv = document.querySelector('.scheduled-workouts');
const saveBtn = document.querySelector('.btn-save-schedule');
const suggestBtn = document.querySelector('.btn-suggest');
const clearBtn = document.querySelector('.btn-clear');

// Helper: Render workouts for the current day
function renderWorkoutsForDay(day) {
  const workoutList = document.getElementById('workout-list');
  const header = document.getElementById('workout-day-header');
  if (header) header.innerHTML = `<i class="fas fa-list"></i> ${day}'s Workouts`;
  if (!workoutList) return;
  workoutList.innerHTML = '';
  if (!workoutSchedule[day] || workoutSchedule[day].length === 0) {
    workoutList.innerHTML = '<li class="empty">No workouts scheduled.</li>';
    return;
  }
  workoutSchedule[day].forEach((w, idx) => {
    workoutList.innerHTML += `
      <li>
        <strong>${w.type}</strong> - ${w.duration}, ${w.time}
        ${w.tag ? `<span class="tag">${w.tag}</span>` : ''}
        <button class="btn-remove" data-idx="${idx}" data-day="${day}"><i class="fas fa-trash"></i></button>
      </li>
    `;
  });
  // remove listeners
  workoutList.querySelectorAll('.btn-remove').forEach(btn => {
    btn.addEventListener('click', function() {
      const idx = +this.getAttribute('data-idx');
      const day = this.getAttribute('data-day');
      workoutSchedule[day].splice(idx, 1);
      renderWorkoutsForDay(day);
    });
  });
}

// Switch day pills
dayPills.forEach(pill => {
  pill.addEventListener('click', function() {
    dayPills.forEach(p => p.classList.remove('active'));
    this.classList.add('active');
    currentDay = this.getAttribute('data-day');
    // Update scheduled-workouts header and list
    scheduledWorkoutsDiv.querySelector('h4').innerHTML = `<i class="fas fa-list"></i> ${currentDay}'s Workouts`;
    renderWorkoutsForDay(currentDay);
  });
});

// Add workout to current day
if (addBtn) {
  addBtn.addEventListener('click', function(e) {
    e.preventDefault();
    const type = document.getElementById('exercise-type').value;
    const duration = document.getElementById('exercise-duration').value;
    const time = document.getElementById('exercise-time').value;
    const tag = workoutForm.querySelector('input[type="text"]').value.trim();
    if (!type || type === "Select Exercise") {
      alert("Please select an exercise type.");
      return;
    }
    workoutSchedule[currentDay].push({ type, duration, time, tag });
    renderWorkoutsForDay(currentDay);
    // Optionally clear form
    workoutForm.reset();
  });
}

// Suggest workout (simple random suggestion)
if (suggestBtn) {
  suggestBtn.addEventListener('click', function() {
    const exercises = ["Back", "Biceps", "Chest", "Cardio", "Triceps", "Shoulders", "Legs", "Abs"];
    const type = exercises[Math.floor(Math.random() * exercises.length)];
    const duration = ["30 minutes", "45 minutes", "60 minutes", "90 minutes"][Math.floor(Math.random() * 4)];
    const time = ["Morning", "Evening"][Math.floor(Math.random() * 2)];
    workoutSchedule[currentDay].push({ type, duration, time, tag: "" });
    renderWorkoutsForDay(currentDay);
  });
}

// Clear all workouts for current day
if (clearBtn) {
  clearBtn.addEventListener('click', function() {
    if (confirm(`Clear all workouts for ${currentDay}?`)) {
      workoutSchedule[currentDay] = [];
      renderWorkoutsForDay(currentDay);
    }
  });
}

// Save schedule to backend
if (saveBtn) {
  saveBtn.addEventListener('click', async function() {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${window.API_CONFIG ? window.API_CONFIG.BASE_URL : 'http://localhost:5000'}/api/users/workout-schedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ schedule: workoutSchedule })
      });
      const result = await response.json();
      if (response.ok) {
        // Replace builder with display
        displaySavedSchedule(result.schedule || workoutSchedule);
      } else {
        alert(result.message || "Failed to save schedule.");
      }
    } catch (err) {
      alert("Error saving schedule.");
    }
  });
}

// Helper to get current day as "Monday", "Tuesday", etc.
function getTodayName() {
  const idx = new Date().getDay(); // 0 (Sun) - 6 (Sat)
  // Your daysOfWeek starts with Monday, so map 0 (Sun) to 6, 1 (Mon) to 0, etc.
  return daysOfWeek[idx === 0 ? 6 : idx - 1];
}

// Display only today's schedule after saving
function displaySavedSchedule(schedule) {
  if (!scheduleBuilder) return;
  // Hide/minimize the scheduler UI
  scheduleBuilder.style.display = "none";
  if (saveBtn) saveBtn.style.display = "none";
  // Show only today's schedule
  const today = getTodayName();
  let displayDiv = document.getElementById('today-workout-display');
  if (!displayDiv) {
    displayDiv = document.createElement('div');
    displayDiv.id = 'today-workout-display';
    scheduleBuilder.parentNode.insertBefore(displayDiv, scheduleBuilder.nextSibling);
  }
  displayDiv.innerHTML = `
    <div class="saved-schedule">
      <h4 style="margin-bottom:1rem;"><i class="fas fa-calendar-alt"></i> ${today}'s Workout Schedule</h4>
      <ul>
        ${
          (schedule[today] && schedule[today].length)
            ? schedule[today].map(w =>
                `<li><strong>${w.type}</strong> - ${w.duration}, ${w.time} ${w.tag ? `<span class="tag">${w.tag}</span>` : ''}</li>`
              ).join('')
            : '<li class="empty">No workouts scheduled for today.</li>'
        }
      </ul>
      <button class="btn" id="edit-schedule-btn">Edit Schedule</button>
    </div>
  `;
  // Edit button to bring back the scheduler
  document.getElementById('edit-schedule-btn').onclick = function() {
    displayDiv.remove();
    scheduleBuilder.style.display = "";
    if (saveBtn) saveBtn.style.display = "";
  };
  
}

// --- Fetch and render workout schedule from server ---
async function fetchAndRenderWorkoutSchedule() {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${window.API_CONFIG ? window.API_CONFIG.BASE_URL : 'http://localhost:5000'}/api/users/workout-schedule`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!response.ok) return;
    const result = await response.json();
    if (result.schedule) {
      workoutSchedule = result.schedule;
      // Show only today's schedule and hide the builder
      displaySavedSchedule(result.schedule);
    }
  } catch (err) {
    // Optionally handle error
  }
}

// Call this after DOMContentLoaded and after you define all the DOM elements and helper functions
fetchAndRenderWorkoutSchedule();

  // ✅ Add interactive elements
  const profileImage = document.getElementById("profileImage");
  if (profileImage) {
    profileImage.addEventListener("mouseenter", function() {
      this.style.boxShadow = "0 0 15px rgba(52, 152, 219, 0.5)";
    });
    profileImage.addEventListener("mouseleave", function() {
      this.style.boxShadow = "none";
    });
  }

}); // End of DOMContentLoaded

// ✅ Helper functions
function getActivityIcon(activityType) {
  const icons = {
    cardio: "🏃",
    strength: "💪",
    yoga: "🧘",
    crossfit: "🔥",
    zumba: "💃",
    swimming: "🏊",
    cycling: "🚴",
    default: "🏋️"
  };
  
  return icons[activityType.toLowerCase()] || icons.default;
}

function formatActivityDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  
  if (date.toDateString() === now.toDateString()) {
    return "Today, " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  
  if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday, " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  
  return date.toLocaleDateString() + ", " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ✅ Logout Function
function logout() {
  localStorage.removeItem("token");
  window.location.href = "../index.html";
}

// === INCOMPLETE PROFILE FUNCTIONS ===
function showIncompleteFields() {
  alert('Please complete the missing fields highlighted in orange to improve your profile experience.');
}

function verifyEmail() {
  alert('Email verification feature will be implemented. Please check your email for verification link.');
}

// === GLOBAL FUNCTIONS ===
window.showIncompleteFields = showIncompleteFields;
window.verifyEmail = verifyEmail;

// ===== ATTENDANCE MODAL FUNCTIONALITY =====
class AttendanceManager {
  constructor() {
    this.currentDate = new Date();
    this.attendanceData = {};
    this.memberInfo = null;
    this.currentStreak = 0;
    this.bestStreak = 0;
    this.monthlyStats = {
      present: 0,
      absent: 0,
      workouts: 0,
      hours: 0
    };
  }

  async fetchAttendanceData() {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${window.API_CONFIG ? window.API_CONFIG.BASE_URL : 'http://localhost:5000'}/api/attendance/member/history`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('📊 Received attendance data:', data);
        
        this.memberInfo = data.memberInfo;
        this.attendanceData = this.processAttendanceData(data.attendance || []);
        this.currentStreak = data.stats?.currentStreak || 0;
        this.bestStreak = data.stats?.bestStreak || 0;
        
        // Update monthly stats based on membership period
        this.calculateMonthlyStats();
        this.updateCalendar();
        this.updateStats();
        this.updateMembershipInfo();
      } else {
        console.warn('Failed to fetch attendance data, using mock data');
        this.generateMockDataWithMembership();
      }
    } catch (error) {
      console.error('Error fetching attendance data:', error);
      this.generateMockDataWithMembership();
    }
  }

  updateMembershipInfo() {
    if (!this.memberInfo) return;
    
    // Update modal header with membership period info
    const modalHeader = document.querySelector('.attendance-modal-content .modal-header h2');
    if (modalHeader) {
      const startDate = new Date(this.memberInfo.membershipStartDate || this.memberInfo.joinDate);
      const endDate = new Date(this.memberInfo.membershipEndDate || this.memberInfo.membershipValidUntil);
      
      modalHeader.innerHTML = `
        <div>
          <div><i class="fas fa-calendar-check"></i> My Attendance History</div>
          <div class="membership-period">
            Membership: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}
            <span class="membership-status ${this.memberInfo.isActive ? 'active' : 'expired'}">
              ● ${this.memberInfo.isActive ? 'Active' : 'Expired'}
            </span>
          </div>
        </div>
      `;
    }
    
    // Show and populate membership info display
    const membershipDisplay = document.getElementById('membershipInfoDisplay');
    if (membershipDisplay) {
      membershipDisplay.style.display = 'block';
      
      // Update membership details
      const elements = {
        membershipPlan: document.getElementById('membershipPlan'),
        membershipDuration: document.getElementById('membershipDuration'),
        membershipJoinDate: document.getElementById('membershipJoinDate'),
        membershipValidUntil: document.getElementById('membershipValidUntil'),
        membershipStatus: document.getElementById('membershipStatus'),
        membershipGym: document.getElementById('membershipGym')
      };
      
      if (elements.membershipPlan) {
        elements.membershipPlan.textContent = this.memberInfo.planSelected || 'N/A';
      }
      
      if (elements.membershipDuration) {
        elements.membershipDuration.textContent = this.memberInfo.monthlyPlan || 'N/A';
      }
      
      if (elements.membershipJoinDate) {
        const joinDate = new Date(this.memberInfo.joinDate);
        elements.membershipJoinDate.textContent = joinDate.toLocaleDateString();
      }
      
      if (elements.membershipValidUntil) {
        const validUntil = new Date(this.memberInfo.membershipValidUntil);
        elements.membershipValidUntil.textContent = validUntil.toLocaleDateString();
      }
      
      if (elements.membershipStatus) {
        const statusText = this.memberInfo.isActive ? 'Active' : 'Expired';
        const statusClass = this.memberInfo.isActive ? 'active' : 'expired';
        const iconClass = this.memberInfo.isActive ? 'fa-check-circle' : 'fa-times-circle';
        const badgeClass = this.memberInfo.isActive ? '' : 'expired';
        elements.membershipStatus.innerHTML = `
          <span class="membership-status-badge ${badgeClass}" title="Membership status">
            <i id="membershipStatusIcon" class="fas ${iconClass}"></i>
            <span id="membershipStatusText">${statusText}</span>
          </span>
        `;
      }
      
      if (elements.membershipGym) {
        const gym = this.memberInfo.gym;
        if (gym) {
          const gymText = gym.city && gym.state ? 
            `${gym.name}, ${gym.city}, ${gym.state}` : 
            gym.name || 'N/A';
          elements.membershipGym.textContent = gymText;
        } else {
          elements.membershipGym.textContent = 'N/A';
        }
      }
    }
  }

  processAttendanceData(rawData) {
    const processed = {};
    rawData.forEach(record => {
      const date = new Date(record.date).toDateString();
      processed[date] = {
        status: record.status,
        checkIn: record.checkIn,
        checkOut: record.checkOut,
        duration: record.duration || 0
      };
    });
    return processed;
  }

  generateMockDataWithMembership() {
    // Generate mock membership info if not available
    if (!this.memberInfo) {
      const today = new Date();
      const joinDate = new Date(today.getFullYear(), today.getMonth() - 2, 15); // 2 months ago
      const validUntil = new Date(today.getFullYear(), today.getMonth() + 4, 15); // 4 months from now
      
      this.memberInfo = {
        name: 'Demo Member',
        joinDate: joinDate.toISOString(),
        membershipValidUntil: validUntil.toISOString(),
        membershipStartDate: joinDate.toISOString(),
        membershipEndDate: validUntil.toISOString(),
        planSelected: 'Premium',
        monthlyPlan: '6 Months',
        isActive: true,
        hasStarted: true,
        gym: { name: 'FIT-verse Premium', city: 'Delhi', state: 'Delhi' }
      };
    }
    
    const membershipStart = new Date(this.memberInfo.membershipStartDate || this.memberInfo.joinDate);
    const membershipEnd = new Date(this.memberInfo.membershipEndDate || this.memberInfo.membershipValidUntil);
    const today = new Date();
    
    // Generate attendance data only within membership period
    let currentDate = new Date(membershipStart);
    let consecutiveDays = 0;
    let shouldBePresent = true;
    
    while (currentDate <= Math.min(today, membershipEnd)) {
      const dateStr = currentDate.toDateString();
      const dayOfWeek = currentDate.getDay();
      
      // Skip Sundays (rest days) - no attendance records
      if (dayOfWeek !== 0) {
        let isPresent;
        
        if (consecutiveDays < 5 && shouldBePresent) {
          isPresent = Math.random() > 0.1; // 90% chance during streak building
          if (isPresent) consecutiveDays++;
        } else if (consecutiveDays >= 5) {
          isPresent = Math.random() > 0.2; // 80% chance during streak maintenance
          if (!isPresent) {
            consecutiveDays = 0;
            shouldBePresent = false;
          } else {
            consecutiveDays++;
          }
        } else {
          isPresent = Math.random() > 0.4; // 60% chance during recovery
          if (isPresent) {
            consecutiveDays = 1;
            shouldBePresent = true;
          }
        }
        
        // Higher attendance for recent days
        const daysDifference = Math.floor((today - currentDate) / (1000 * 60 * 60 * 24));
        if (daysDifference <= 7) {
          isPresent = Math.random() > 0.15; // 85% chance for last week
        }
        
        this.attendanceData[dateStr] = {
          status: isPresent ? 'present' : 'absent',
          checkIn: isPresent ? this.generateRandomTime('07:00', '09:00') : null,
          checkOut: isPresent ? this.generateRandomTime('18:00', '21:00') : null,
          duration: isPresent ? Math.floor(Math.random() * 60) + 45 : 0
        };
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    this.calculateStreaks();
    this.updateCalendar();
    this.updateStats();
    this.updateMembershipInfo();
  }

  generateRandomTime(startTime, endTime) {
    const start = startTime.split(':').map(Number);
    const end = endTime.split(':').map(Number);
    
    const startMinutes = start[0] * 60 + start[1];
    const endMinutes = end[0] * 60 + end[1];
    
    const randomMinutes = startMinutes + Math.random() * (endMinutes - startMinutes);
    const hours = Math.floor(randomMinutes / 60);
    const minutes = Math.floor(randomMinutes % 60);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  calculateStreaks() {
    const today = new Date();
    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 0;
    
    // Calculate current streak (going backwards from today, excluding Sundays)
    let checkDate = new Date(today);
    
    // Only count weekdays (Monday-Saturday) for streaks
    while (checkDate) {
      const dateStr = checkDate.toDateString();
      const dayOfWeek = checkDate.getDay();
      
      // Skip Sundays (day 0) - they don't count for or against streaks
      if (dayOfWeek === 0) {
        checkDate.setDate(checkDate.getDate() - 1);
        continue;
      }
      
      // Check if member was present on this weekday
      if (this.attendanceData[dateStr] && this.attendanceData[dateStr].status === 'present') {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (this.attendanceData[dateStr] && this.attendanceData[dateStr].status === 'absent') {
        // Member was marked absent on a weekday - streak breaks
        break;
      } else {
        // No attendance record - check if it's a past weekday
        if (checkDate < today) {
          // Past weekday with no record counts as absent - streak breaks
          break;
        }
        checkDate.setDate(checkDate.getDate() - 1);
      }
      
      // Prevent infinite loop - don't go back more than 90 days
      if (checkDate < new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000)) break;
    }
    
    // Calculate best streak from all historical data
    const sortedDates = Object.keys(this.attendanceData).sort((a, b) => new Date(a) - new Date(b));
    
    for (let dateStr of sortedDates) {
      const date = new Date(dateStr);
      const dayOfWeek = date.getDay();
      
      // Skip Sundays for streak calculation
      if (dayOfWeek !== 0) {
        if (this.attendanceData[dateStr].status === 'present') {
          tempStreak++;
          bestStreak = Math.max(bestStreak, tempStreak);
        } else {
          tempStreak = 0;
        }
      }
      // Sundays don't break the streak, they're just ignored
    }
    
    this.currentStreak = currentStreak;
    this.bestStreak = Math.max(bestStreak, currentStreak);
  }

  updateCalendar() {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    const currentMonthYear = document.getElementById('currentMonthYear');
    if (currentMonthYear) {
      currentMonthYear.textContent = `${monthNames[this.currentDate.getMonth()]} ${this.currentDate.getFullYear()}`;
    }
    
    this.renderCalendar();
  }

  renderCalendar() {
    const calendarBody = document.getElementById('calendarBody');
    if (!calendarBody) return;
    
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const today = new Date();
    
    // Get first day of month and number of days
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    // Get first Monday of the calendar view
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - ((firstDay.getDay() + 6) % 7));
    
    let calendarHTML = '';
    let currentCalendarDate = new Date(startDate);
    
    // Generate 6 weeks of calendar
    for (let week = 0; week < 6; week++) {
      for (let day = 0; day < 7; day++) {
        const dateStr = currentCalendarDate.toDateString();
        const dayNum = currentCalendarDate.getDate();
        const isCurrentMonth = currentCalendarDate.getMonth() === month;
        const isToday = currentCalendarDate.toDateString() === today.toDateString();
        const isFuture = currentCalendarDate > today;
        const isSunday = currentCalendarDate.getDay() === 0;
        
        let classes = ['calendar-day'];
        let content = dayNum;
        
        if (!isCurrentMonth) {
          classes.push('other-month');
        } else if (isFuture) {
          classes.push('future');
        } else if (isSunday) {
          classes.push('sunday');
        } else if (this.attendanceData[dateStr]) {
          classes.push(this.attendanceData[dateStr].status);
          
          // Add streak indicator for consecutive days
          if (this.attendanceData[dateStr].status === 'present' && this.isPartOfStreak(currentCalendarDate)) {
            classes.push('streak-day');
          }
        }
        
        if (isToday) {
          classes.push('today');
        }
        
        calendarHTML += `<div class="${classes.join(' ')}" data-date="${dateStr}">${content}</div>`;
        currentCalendarDate.setDate(currentCalendarDate.getDate() + 1);
      }
    }
    
    calendarBody.innerHTML = calendarHTML;
  }

  isPartOfStreak(date) {
    // Check if this date is part of a streak of at least 3 days
    const dateStr = date.toDateString();
    let streakCount = 0;
    let checkDate = new Date(date);
    
    // Check backwards
    for (let i = 0; i < 7; i++) {
      const checkDateStr = checkDate.toDateString();
      if (checkDate.getDay() !== 0 && this.attendanceData[checkDateStr] && this.attendanceData[checkDateStr].status === 'present') {
        streakCount++;
      } else if (checkDate.getDay() !== 0) {
        break;
      }
      checkDate.setDate(checkDate.getDate() - 1);
    }
    
    return streakCount >= 3;
  }

  updateStats() {
    // Update streak cards
    document.getElementById('currentStreakDays').textContent = this.currentStreak;
    document.getElementById('bestStreakDays').textContent = this.bestStreak;
    
    // Update streak message
    const streakMessage = document.getElementById('streakMessage');
    if (this.currentStreak === 0) {
      streakMessage.textContent = 'Start your streak today!';
    } else if (this.currentStreak < 3) {
      streakMessage.textContent = 'Building momentum!';
    } else if (this.currentStreak < 7) {
      streakMessage.textContent = 'Great consistency!';
    } else {
      streakMessage.textContent = 'Amazing dedication! 🔥';
    }
    
    // Calculate monthly stats
    this.calculateMonthlyStats();
    
    // Update monthly stats display
    document.getElementById('monthlyPresent').textContent = this.monthlyStats.present;
    document.getElementById('monthlyAbsent').textContent = this.monthlyStats.absent;
    document.getElementById('monthlyWorkouts').textContent = this.monthlyStats.workouts;
    document.getElementById('monthlyHours').textContent = this.monthlyStats.hours;
    
    // Calculate and update attendance rate
    const totalDays = this.monthlyStats.present + this.monthlyStats.absent;
    const attendanceRate = totalDays > 0 ? Math.round((this.monthlyStats.present / totalDays) * 100) : 0;
    document.getElementById('attendanceRate').textContent = `${attendanceRate}%`;
  }

  calculateMonthlyStats() {
    const currentMonth = this.currentDate.getMonth();
    const currentYear = this.currentDate.getFullYear();
    let present = 0, absent = 0, totalHours = 0, workingDaysInMonth = 0;
    
    // Get membership period boundaries
    let membershipStart = null;
    let membershipEnd = null;
    
    if (this.memberInfo) {
      membershipStart = new Date(this.memberInfo.membershipStartDate || this.memberInfo.joinDate);
      membershipEnd = new Date(this.memberInfo.membershipEndDate || this.memberInfo.membershipValidUntil);
    }
    
    // Count working days and attendance within membership period
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const today = new Date();
    
    let checkDate = new Date(firstDay);
    while (checkDate <= lastDay) {
      const dayOfWeek = checkDate.getDay();
      const isWithinMembership = !membershipStart || !membershipEnd || 
        (checkDate >= membershipStart && checkDate <= membershipEnd);
      
      // Only count working days (Mon-Sat) within membership period and up to today
      if (dayOfWeek !== 0 && isWithinMembership && checkDate <= today) {
        workingDaysInMonth++;
        
        const dateStr = checkDate.toDateString();
        const record = this.attendanceData[dateStr];
        
        if (record) {
          if (record.status === 'present') {
            present++;
            totalHours += record.duration || 60; // Default 1 hour if no duration
          } else if (record.status === 'absent') {
            absent++;
          }
        }
      }
      
      checkDate.setDate(checkDate.getDate() + 1);
    }
    
    this.monthlyStats = {
      present,
      absent,
      workouts: present,
      hours: Math.round(totalHours / 60),
      workingDays: workingDaysInMonth,
      attendanceRate: workingDaysInMonth > 0 ? Math.round((present / workingDaysInMonth) * 100) : 0
    };
    
    // Update display elements if they exist
    const elements = {
      monthlyPresent: document.getElementById('monthlyPresent'),
      monthlyAbsent: document.getElementById('monthlyAbsent'),
      monthlyWorkouts: document.getElementById('monthlyWorkouts'),
      monthlyHours: document.getElementById('monthlyHours'),
      monthlyAttendanceRate: document.getElementById('monthlyAttendanceRate')
    };
    
    if (elements.monthlyPresent) elements.monthlyPresent.textContent = this.monthlyStats.present;
    if (elements.monthlyAbsent) elements.monthlyAbsent.textContent = this.monthlyStats.absent;
    if (elements.monthlyWorkouts) elements.monthlyWorkouts.textContent = this.monthlyStats.workouts;
    if (elements.monthlyHours) elements.monthlyHours.textContent = this.monthlyStats.hours;
    if (elements.monthlyAttendanceRate) elements.monthlyAttendanceRate.textContent = `${this.monthlyStats.attendanceRate}%`;
  }

  previousMonth() {
    this.currentDate.setMonth(this.currentDate.getMonth() - 1);
    this.updateCalendar();
    this.updateStats();
  }

  nextMonth() {
    this.currentDate.setMonth(this.currentDate.getMonth() + 1);
    this.updateCalendar();
    this.updateStats();
  }
}

// Global attendance manager instance
let attendanceManager;

// Modal functions
function openAttendanceModal() {
  const modal = document.getElementById('attendanceModal');
  if (modal) {
    modal.style.display = 'flex';
    
    // Initialize attendance manager if not already done
    if (!attendanceManager) {
      attendanceManager = new AttendanceManager();
      attendanceManager.fetchAttendanceData();
    }
  }
}

function closeAttendanceModal() {
  const modal = document.getElementById('attendanceModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

function previousMonth() {
  if (attendanceManager) {
    attendanceManager.previousMonth();
  }
}

function nextMonth() {
  if (attendanceManager) {
    attendanceManager.nextMonth();
  }
}

// Close modal when clicking outside
document.addEventListener('click', function(event) {
  const modal = document.getElementById('attendanceModal');
  if (event.target === modal) {
    closeAttendanceModal();
  }
});

// Close modal with Escape key
document.addEventListener('keydown', function(event) {
  if (event.key === 'Escape') {
    closeAttendanceModal();
  }
});

// Initialize coupons functionality when available
window.addEventListener('load', function() {
  // Check if coupons sections exist and initialize
  if (window.userCouponsManager && document.getElementById('active-coupons-grid')) {
    console.log('Initializing coupons in user profile...');
    setTimeout(() => {
      window.userCouponsManager.renderCouponsInProfile();
    }, 1000); // Small delay to ensure DOM is ready
  }
});