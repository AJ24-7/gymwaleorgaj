document.addEventListener("DOMContentLoaded", function () {
  const token = localStorage.getItem('token');

  // ✅ Redirect if not logged in
  if (!token) {
    console.warn('No token found in localStorage. Redirecting to login...');
    window.location.href = '/frontend/public/login.html';
    return;
  }
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

  // ✅ Fetch user profile
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
      // Basic info
      document.getElementById("username").textContent = user.username || user.name || 'User';
      document.getElementById("useremail").textContent = user.email || 'N/A';
      document.getElementById("userphone").textContent = user.phone || 'N/A';

      // Profile picture
      const profilePicUrl = user.profileImage
        ? (user.profileImage.startsWith('http') ? user.profileImage : `http://localhost:5000${user.profileImage}`)
        : `http://localhost:5000/uploads/profile-pics/default.png`;
      document.getElementById("profileImage").src = profilePicUrl;
      const userIconImage = document.getElementById("profile-icon-img");
      if (userIconImage) userIconImage.src = profilePicUrl;

      // === ACTIVITY PREFERENCES ===
      const prefContainer = document.querySelector('.preference-tags');
      if (prefContainer) {
        prefContainer.innerHTML = '';
        if (user.workoutPreferences && user.workoutPreferences.length > 0) {
          user.workoutPreferences.forEach(pref => {
            // Choose icon based on preference
            let iconClass = "fas fa-dumbbell";
            if (/cardio/i.test(pref)) iconClass = "fas fa-running";
            else if (/yoga/i.test(pref)) iconClass = "fas fa-spa";
            else if (/crossfit/i.test(pref)) iconClass = "fas fa-fire";
            else if (/hiit/i.test(pref)) iconClass = "fas fa-biking";
            else if (/pilates/i.test(pref)) iconClass = "fas fa-weight-hanging";
            prefContainer.innerHTML += `<span class="tag active"><i class="${iconClass}"></i> ${pref}</span>`;
          });
        } else {
          prefContainer.innerHTML = '<span class="tag">No preferences set</span>';
        }
      }

      // === FETCH MEMBERSHIP DETAILS ===
      fetchMembershipDetails(user.email.trim().toLowerCase());

      // === DIET PLAN ===
      if (user.dietPlan) {
        const mealTypes = ['breakfast', 'lunch', 'dinner', 'snacks'];
        mealTypes.forEach(meal => {
          // Find the meal card for this meal
          const mealCard = Array.from(document.querySelectorAll('.meal-card')).find(card =>
            card.querySelector('.meal-header h4') &&
            card.querySelector('.meal-header h4').textContent.trim().toLowerCase() === meal
          );
         
        });
      }

     
    })
    .catch(err => {
      console.error('❌ Error fetching profile:', err);
      alert('Failed to load profile. Please try logging in again.');
      window.location.href = '/frontend/public/login.html';
    });

  // === SHOW MOCK MEMBERSHIP DETAILS (Temporary Solution) ===
  function showMockMembershipDetails(user) {
    // Remove loading class
    document.querySelector('.membership-card').classList.remove('loading');
    
    // Generate a realistic membership
    const membershipId = `FIT-2025-PREM-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const joinDate = new Date('2024-07-15'); // Mock join date
    const validUntil = new Date('2025-01-15'); // Mock expiry (6 months)
    const today = new Date();
    const timeDiff = validUntil.getTime() - today.getTime();
    const daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    const mockMembership = {
      membershipId: membershipId,
      memberName: user.username || user.name,
      email: user.email,
      phone: user.phone || '9999999999',
      planName: 'Premium',
      monthlyPlan: '6 Months',
      validUntil: '2025-01-15',
      amountPaid: 8999,
      paidVia: 'UPI',
      joinDate: '2024-07-15',
      daysLeft: daysLeft,
      isActive: daysLeft > 0,
      gym: {
        name: 'FIT-verse Premium',
        city: 'Delhi',
        state: 'Delhi'
      }
    };
    
    populateMembershipDetails(mockMembership);
  }

  // === FETCH MEMBERSHIP DETAILS FUNCTION ===
  async function fetchMembershipDetails(email) {
    try {
      const response = await fetch(`http://localhost:5000/api/members/membership-by-email/${encodeURIComponent(email)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (parseErr) {
        console.error('Failed to parse membership API response:', text);
        showMembershipError();
        return;
      }

      if (!response.ok) {
        console.error('Membership API error:', data);
        showMembershipError();
        return;
      }

      if (data.success && data.membership) {
        populateMembershipDetails(data.membership);
      } else {
        console.warn('No membership found:', data);
        showNoMembershipFound();
      }
    } catch (error) {
      console.error('Network or server error fetching membership details:', error);
      showMembershipError();
    }
  }

  // === POPULATE MEMBERSHIP DETAILS ===
  function populateMembershipDetails(membership) {
    // Remove loading class
    document.querySelector('.membership-card').classList.remove('loading');
    
    // Update membership ID
    document.getElementById('membership-id').textContent = membership.membershipId || 'N/A';
    
    // Update gym name
    const gymLocation = membership.gym.city && membership.gym.state 
      ? `, ${membership.gym.city}, ${membership.gym.state}`
      : '';
    document.getElementById('gym-name').textContent = `${membership.gym.name}${gymLocation}`;
    
    // Update plan details (use planSelected)
    document.getElementById('plan-details').textContent = `${membership.planSelected} (${membership.monthlyPlan})`;
    
    // Update valid till (use membershipValidUntil)
    const validTillDate = new Date(membership.membershipValidUntil);
    document.getElementById('valid-till').textContent = validTillDate.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
    
    // Update amount paid (use paymentAmount)
    document.getElementById('amount-paid').textContent = `₹${membership.paymentAmount?.toLocaleString('en-IN') || 'N/A'}`;
    
    // Update payment method (use paymentMode)
    document.getElementById('payment-method').textContent = membership.paymentMode || 'N/A';
    
    // Update join date
    const joinDate = new Date(membership.joinDate);
    document.getElementById('join-date').textContent = joinDate.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
    
    // Update days left and progress
    updateDaysLeftDisplay(membership.daysLeft, membership.isActive);
    
    // Update membership status
    updateMembershipStatus(membership.daysLeft, membership.isActive);
  }

  // === UPDATE DAYS LEFT DISPLAY ===
  function updateDaysLeftDisplay(daysLeft, isActive) {
    const daysLeftElement = document.getElementById('days-left-display');
    const progressRing = document.querySelector('.progress-ring');
    const progressCircle = document.querySelector('.progress-ring-circle');
    
    if (!isActive || daysLeft <= 0) {
      daysLeftElement.textContent = 'Expired';
      daysLeftElement.className = 'days-left-critical';
      progressCircle.className = 'progress-ring-circle critical';
      progressRing.setAttribute('data-progress', '0');
    } else if (daysLeft <= 7) {
      daysLeftElement.textContent = `${daysLeft} left`;
      daysLeftElement.className = 'days-left-critical';
      progressCircle.className = 'progress-ring-circle critical';
      const progress = Math.max(10, (daysLeft / 30) * 100);
      progressRing.setAttribute('data-progress', progress);
    } else if (daysLeft <= 30) {
      daysLeftElement.textContent = `${daysLeft} left`;
      daysLeftElement.className = 'days-left-warning';
      progressCircle.className = 'progress-ring-circle warning';
      const progress = (daysLeft / 30) * 100;
      progressRing.setAttribute('data-progress', progress);
    } else {
      daysLeftElement.textContent = `${daysLeft} left`;
      daysLeftElement.className = 'days-left-good';
      progressCircle.className = 'progress-ring-circle good';
      const progress = Math.min(100, (daysLeft / 365) * 100 + 50);
      progressRing.setAttribute('data-progress', progress);
    }
    
    // Update progress ring
    updateProgressRing(progressRing);
  }

  // === UPDATE MEMBERSHIP STATUS BADGE ===
  function updateMembershipStatus(daysLeft, isActive) {
    const statusElement = document.getElementById('membership-status');
    const statusBadge = statusElement.querySelector('.status-badge');
    
    if (!isActive || daysLeft <= 0) {
      statusBadge.textContent = 'Expired';
      statusBadge.className = 'status-badge expired';
    } else if (daysLeft <= 7) {
      statusBadge.textContent = 'Expiring Soon';
      statusBadge.className = 'status-badge expiring';
    } else {
      statusBadge.textContent = 'Active';
      statusBadge.className = 'status-badge active';
    }
  }

  // === UPDATE PROGRESS RING ===
  function updateProgressRing(progressRing) {
    const progress = progressRing.getAttribute('data-progress');
    const circle = progressRing.querySelector('.progress-ring-circle');
    const radius = circle.r.baseVal.value;
    const circumference = radius * 2 * Math.PI;
    
    circle.style.strokeDasharray = `${circumference} ${circumference}`;
    circle.style.strokeDashoffset = circumference;
    
    const offset = circumference - (progress / 100) * circumference;
    circle.style.strokeDashoffset = offset;
  }

  // === SHOW NO MEMBERSHIP FOUND ===
  function showNoMembershipFound() {
    document.querySelector('.membership-card').classList.remove('loading');
    document.getElementById('membership-id').textContent = 'No Active Membership';
    document.getElementById('gym-name').textContent = 'Please purchase a membership';
    document.getElementById('plan-details').textContent = 'N/A';
    document.getElementById('valid-till').textContent = 'N/A';
    document.getElementById('amount-paid').textContent = 'N/A';
    document.getElementById('payment-method').textContent = 'N/A';
    document.getElementById('join-date').textContent = 'N/A';
    document.getElementById('days-left-display').textContent = 'No membership';
    
    const statusElement = document.getElementById('membership-status');
    const statusBadge = statusElement.querySelector('.status-badge');
    statusBadge.textContent = 'No Membership';
    statusBadge.className = 'status-badge expired';
  }

  // === SHOW MEMBERSHIP ERROR ===
  function showMembershipError() {
    document.querySelector('.membership-card').classList.remove('loading');
    document.getElementById('membership-id').textContent = 'Error loading';
    document.getElementById('gym-name').textContent = 'Unable to fetch membership details';
    document.getElementById('plan-details').textContent = 'Please try again';
    document.getElementById('valid-till').textContent = 'N/A';
    document.getElementById('amount-paid').textContent = 'N/A';
    document.getElementById('payment-method').textContent = 'N/A';
    document.getElementById('join-date').textContent = 'N/A';
    document.getElementById('days-left-display').textContent = 'Error';
    
    const statusElement = document.getElementById('membership-status');
    const statusBadge = statusElement.querySelector('.status-badge');
    statusBadge.textContent = 'Error';
    statusBadge.className = 'status-badge loading';
  }
  // Fetch user diet plan from dietController
  fetch('http://localhost:5000/api/diet/my-plan', {
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
      const response = await fetch('http://localhost:5000/api/users/workout-schedule', {
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
    const response = await fetch('http://localhost:5000/api/users/workout-schedule', {
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

 
});

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
  window.location.href = "/frontend/index.html";
}