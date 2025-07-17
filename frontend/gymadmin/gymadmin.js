// === Profile Dropdown Menu Toggle ===
document.addEventListener('DOMContentLoaded', function() {
  const userProfileToggle = document.getElementById('userProfileToggle');
  const profileDropdownMenu = document.getElementById('profileDropdownMenu');
  if (userProfileToggle && profileDropdownMenu) {
    userProfileToggle.addEventListener('click', function(e) {
      e.stopPropagation();
      profileDropdownMenu.classList.toggle('open');
    });
    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
      if (!profileDropdownMenu.contains(e.target) && !userProfileToggle.contains(e.target)) {
        profileDropdownMenu.classList.remove('open');
      }
    });
  }
});
// === Dynamic Activities Offered Section ===
document.addEventListener('DOMContentLoaded', function() {
  // --- State ---
  // Use the same hardcoded activities as registration form for full sync
  const allPossibleActivities = [
    { name: 'Yoga', icon: 'fa-person-praying', description: 'Improve flexibility, balance, and mindfulness.' },
    { name: 'Zumba', icon: 'fa-music', description: 'Fun dance-based cardio workout.' },
    { name: 'CrossFit', icon: 'fa-dumbbell', description: 'High-intensity functional training.' },
    { name: 'Weight Training', icon: 'fa-weight-hanging', description: 'Strength and muscle building.' },
    { name: 'Cardio', icon: 'fa-heartbeat', description: 'Endurance and heart health.' },
    { name: 'Pilates', icon: 'fa-child', description: 'Core strength and flexibility.' },
    { name: 'HIIT', icon: 'fa-bolt', description: 'High-Intensity Interval Training.' },
    { name: 'Aerobics', icon: 'fa-running', description: 'Rhythmic aerobic exercise.' },
    { name: 'Martial Arts', icon: 'fa-hand-fist', description: 'Self-defense and discipline.' },
    { name: 'Spin Class', icon: 'fa-bicycle', description: 'Indoor cycling workout.' },
    { name: 'Swimming', icon: 'fa-person-swimming', description: 'Full-body low-impact exercise.' },
    { name: 'Boxing', icon: 'fa-hand-rock', description: 'Cardio and strength with boxing.' },
    { name: 'Personal Training', icon: 'fa-user-tie', description: '1-on-1 customized fitness.' },
    { name: 'Bootcamp', icon: 'fa-shoe-prints', description: 'Group-based intense training.' },
    { name: 'Stretching', icon: 'fa-arrows-up-down', description: 'Mobility and injury prevention.' }
  ];
  let selectedActivities = [];
  let currentActivities = [];

  // --- DOM Elements ---
  const activitiesList = document.getElementById('activitiesList');
  const addActivitiesBtn = document.getElementById('addActivitiesBtn');
  const addActivitiesModal = document.getElementById('addActivitiesModal');
  const closeAddActivitiesModal = document.getElementById('closeAddActivitiesModal');
  const allActivitiesGrid = document.getElementById('allActivitiesGrid');
  const saveActivitiesBtn = document.getElementById('saveActivitiesBtn');
  const cancelAddActivitiesBtn = document.getElementById('cancelAddActivitiesBtn');
  const saveActivitiesConfirmDialog = document.getElementById('saveActivitiesConfirmDialog');
  const confirmSaveActivitiesBtn = document.getElementById('confirmSaveActivitiesBtn');
  const cancelSaveActivitiesConfirmBtn = document.getElementById('cancelSaveActivitiesConfirmBtn');
  const closeSaveActivitiesConfirmDialog = document.getElementById('closeSaveActivitiesConfirmDialog');

  // --- Fetch and Render Activities ---
  async function fetchAndRenderActivities() {
    // Fetch gym profile (with activities)
    const token = localStorage.getItem('gymAdminToken');
    if (!token) return;
    try {
      const res = await fetch('http://localhost:5000/api/gyms/profile/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      console.log('Activities fetch - Full profile data:', data);
      console.log('Activities raw data:', data.activities);
      console.log('Activities type:', typeof data.activities);
      
      // Handle activities data - ensure proper structure
      let activities = [];
      if (Array.isArray(data.activities)) {
        activities = data.activities.map(activity => {
          console.log('Processing activity:', activity, 'Type:', typeof activity);
          
          // Handle different activity formats
          if (typeof activity === 'string') {
            // If activity is just a string, try to parse as JSON first
            try {
              const parsedActivity = JSON.parse(activity);
              console.log('Successfully parsed JSON string activity:', parsedActivity);
              return {
                name: parsedActivity.name || '',
                icon: parsedActivity.icon || 'fa-dumbbell',
                description: parsedActivity.description || ''
              };
            } catch (parseErr) {
              console.error('Failed to parse as JSON, treating as plain string:', activity, parseErr);
              // If not JSON, find matching activity from predefined list
              const matchedActivity = allPossibleActivities.find(a => a.name === activity);
              const result = matchedActivity || { name: activity, icon: 'fa-dumbbell', description: '' };
              console.log('String activity matched to:', result);
              return result;
            }
          } else if (typeof activity === 'object' && activity !== null) {
            // Check if the object has a stringified JSON in the name field
            if (activity.name && typeof activity.name === 'string' && activity.name.startsWith('{')) {
              try {
                const parsedActivity = JSON.parse(activity.name);
                console.log('Successfully parsed JSON from name field:', parsedActivity);
                return {
                  name: parsedActivity.name || '',
                  icon: parsedActivity.icon || 'fa-dumbbell',
                  description: parsedActivity.description || ''
                };
              } catch (parseErr) {
               
                console.warn('Failed to parse JSON from name field, using original activity:', parseErr);
                // Optionally, you could set a default structure or leave as is
              }
            }
            
            // If activity is an object, ensure it has required fields
            const result = {
              name: activity.name || '',
              icon: activity.icon || 'fa-dumbbell',
              description: activity.description || ''
            };
            console.log('Object activity processed to:', result);
            return result;
          }
          console.log('Unrecognized activity format:', activity);
          return null;
        }).filter(Boolean);
      } else if (typeof data.activities === 'string') {
        // Handle case where activities might be stored as a JSON string
        try {
          const parsedActivities = JSON.parse(data.activities);
          console.log('Parsed activities from JSON string:', parsedActivities);
          if (Array.isArray(parsedActivities)) {
            activities = parsedActivities.map(activity => {
              if (typeof activity === 'string') {
                const matchedActivity = allPossibleActivities.find(a => a.name === activity);
                return matchedActivity || { name: activity, icon: 'fa-dumbbell', description: '' };
              }
              return activity;
            });
          }
        } catch (parseErr) {
          console.error('Failed to parse activities JSON string:', parseErr);
        }
      }
      
      console.log('Final processed activities:', activities);
      currentActivities = activities;
      selectedActivities = currentActivities.map(a => a.name);
      renderActivitiesList();
    } catch (err) {
      console.error('Error fetching activities:', err);
      if (activitiesList) activitiesList.innerHTML = '<div style="color:#b71c1c;">Failed to load activities.</div>';
    }
  }

  // --- Render Activities in Dashboard ---
  function renderActivitiesList() {
    if (!activitiesList) return;
    
    console.log('Rendering activities list. Current activities:', currentActivities);
    
    if (!currentActivities?.length) {
      activitiesList.innerHTML = '<div style="color:#888;font-size:1em;text-align:center;padding:20px;">No activities added yet.</div>';
      return;
    }
    
    // Filter out any invalid activities
    const validActivities = currentActivities.filter(a => typeof a?.name === 'string');
    
    if (!validActivities.length) {
      activitiesList.innerHTML = '<div style="color:#888;font-size:1em;text-align:center;padding:20px;">No valid activities found.</div>';
      return;
    }
    
    console.log('Rendering valid activities:', validActivities);
    
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    activitiesList.innerHTML = '<div class="activities-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:12px;">' +
      validActivities.map(a => `
        <div class="activity-badge" tabindex="0" style="background:${isDark ? 'var(--primary)' : '#f5f5f5'};border-radius:12px;width:110px;height:110px;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;transition:box-shadow 0.2s;aspect-ratio:1/1;overflow:hidden;${isDark ? 'color:#fff!important;' : ''}" title="${a.description || a.name}">
          <i class="fas ${a.icon || 'fa-dumbbell'} activity-icon" style="font-size:1.7em;${isDark ? 'color:#fff!important;' : 'color:var(--primary);'}margin-bottom:6px;transition:color 0.2s;"></i>
          <span style="font-size:1em;font-weight:600;${isDark ? 'color:#fff!important;' : ''}">${a.name}</span>
        </div>
      `).join('') + '</div>';
    // Add hover effect for activity icons using --primaryDark (only in light mode)
    if (!isDark) {
      Array.from(activitiesList.querySelectorAll('.activity-badge')).forEach(badge => {
        const icon = badge.querySelector('.activity-icon');
        if (icon) {
          badge.addEventListener('mouseenter', () => {
            icon.style.color = 'var(--primaryDark)';
          });
          badge.addEventListener('mouseleave', () => {
            icon.style.color = 'var(--primary)';
          });
        }
      });
    }
      
    // Show description on click
    Array.from(activitiesList.querySelectorAll('.activity-badge')).forEach((el, idx) => {
      el.onclick = () => {
        const activity = validActivities[idx];
        showDialog({
          title: activity.name,
          message: activity.description || 'No description available.',
          iconHtml: `<i class='fas ${activity.icon || 'fa-dumbbell'}' style='font-size:2em;color:#1976d2;'></i>`
        });
      };
    });
  }

  // --- Open Add Activities Modal ---
  if (addActivitiesBtn && addActivitiesModal) {
    addActivitiesBtn.onclick = () => {
      renderAllActivitiesGrid();
      addActivitiesModal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    };
  }
  if (closeAddActivitiesModal && addActivitiesModal) {
    closeAddActivitiesModal.onclick = () => {
      addActivitiesModal.style.display = 'none';
      document.body.style.overflow = '';
    };
  }
  if (cancelAddActivitiesBtn && addActivitiesModal) {
    cancelAddActivitiesBtn.onclick = () => {
      addActivitiesModal.style.display = 'none';
      document.body.style.overflow = '';
    };
  }

  // --- Render All Activities Grid in Modal ---
  function renderAllActivitiesGrid() {
    if (!allActivitiesGrid) return;
    allActivitiesGrid.innerHTML = allPossibleActivities.map(a => {
      const isSelected = selectedActivities.includes(a.name);
      return `
        <div class="activity-select-card" data-activity="${a.name}" style="background:${isSelected ? '#e3f2fd' : '#fff'};border:2px solid ${isSelected ? '#1976d2' : '#eee'};border-radius:12px;padding:18px 8px;display:flex;flex-direction:column;align-items:center;cursor:pointer;transition:box-shadow 0.2s;position:relative;min-height:120px;">
          <i class="fas ${a.icon}" style="font-size:2em;color:#1976d2;margin-bottom:8px;"></i>
          <span style="font-size:1.08em;font-weight:600;">${a.name}</span>
          <span class="activity-desc" style="font-size:0.95em;color:#666;margin-top:4px;text-align:center;">${a.description}</span>
          <span class="activity-select-icon" style="position:absolute;top:10px;right:12px;font-size:1.3em;color:${isSelected ? '#1976d2' : '#bbb'};">${isSelected ? '<i class="fas fa-check-circle"></i>' : '<i class="fas fa-plus-circle"></i>'}</span>
        </div>
      `;
    }).join('');
    // Add click handlers
    Array.from(allActivitiesGrid.querySelectorAll('.activity-select-card')).forEach(card => {
      card.onclick = () => {
        const name = card.getAttribute('data-activity');
        if (selectedActivities.includes(name)) {
          selectedActivities = selectedActivities.filter(n => n !== name);
        } else {
          selectedActivities.push(name);
        }
        renderAllActivitiesGrid();
      };
    });
  }

  // --- Save Activities Button (opens confirm dialog) ---
  if (saveActivitiesBtn && saveActivitiesConfirmDialog) {
    saveActivitiesBtn.onclick = () => {
      saveActivitiesConfirmDialog.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    };
  }
  if (closeSaveActivitiesConfirmDialog && saveActivitiesConfirmDialog) {
    closeSaveActivitiesConfirmDialog.onclick = () => {
      saveActivitiesConfirmDialog.style.display = 'none';
      document.body.style.overflow = '';
    };
  }
  if (cancelSaveActivitiesConfirmBtn && saveActivitiesConfirmDialog) {
    cancelSaveActivitiesConfirmBtn.onclick = () => {
      saveActivitiesConfirmDialog.style.display = 'none';
      document.body.style.overflow = '';
    };
  }

  // --- Confirm Save Activities (send to backend) ---
  if (confirmSaveActivitiesBtn) {
    confirmSaveActivitiesBtn.onclick = async () => {
      // Compose selected activity objects from the hardcoded list
      const activitiesToSave = allPossibleActivities.filter(a => selectedActivities.includes(a.name));
      // Save to backend
      const token = localStorage.getItem('gymAdminToken');
      if (!token) return showDialog({ title: 'Not Authenticated', message: 'Please log in again.' });
      try {
        const res = await fetch('http://localhost:5000/api/gyms/activities', {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ activities: activitiesToSave })
        });
        if (!res.ok) throw new Error('Failed to save activities');
        // Success
        saveActivitiesConfirmDialog.style.display = 'none';
        addActivitiesModal.style.display = 'none';
        document.body.style.overflow = '';
        showDialog({
          title: 'Activities Saved',
          message: 'Your activities have been updated.',
          iconHtml: '<i class="fas fa-check-circle" style="color:#43a047;font-size:2em;"></i>'
        });
        // Refresh dashboard activities
        fetchAndRenderActivities();
      } catch (err) {
        console.error('Error saving activities:', err);
        showDialog({
          title: 'Error',
          message: 'Could not save activities. Please try again.',
          iconHtml: '<i class="fas fa-exclamation-triangle" style="color:#b71c1c;font-size:2em;"></i>'
        });
      }
    };
  }

  // Initial render
  fetchAndRenderActivities();
});
// --- Dialog Utility (Global) ---
function showDialog({ title = '', message = '', confirmText = 'OK', cancelText = '', iconHtml = '', onConfirm = null, onCancel = null }) {
  // Remove any existing dialog
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
  
  // Prepare buttons HTML
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
  
  // Confirm button handler
  dialog.querySelector('#dialogConfirmBtn').onclick = function() {
    dialog.remove();
    document.body.style.overflow = '';
    if (typeof onConfirm === 'function') onConfirm();
  };
  
  // Cancel button handler (if exists)
  const cancelBtn = dialog.querySelector('#dialogCancelBtn');
  if (cancelBtn) {
    cancelBtn.onclick = function() {
      dialog.remove();
      document.body.style.overflow = '';
      if (typeof onCancel === 'function') onCancel();
    };
  }
  
  // Click outside to close (only if no cancel button, otherwise user must choose)
  if (!cancelText) {
    dialog.addEventListener('mousedown', function(e) {
      if (e.target === dialog) {
        dialog.remove();
        document.body.style.overflow = '';
      }
    });
  }
}

// --- Trainer Tab Logic ---
document.addEventListener('DOMContentLoaded', function() {
  // --- Trainer Profile Image Upload Logic ---
  const uploadTrainerImageBtn = document.getElementById('uploadTrainerImageBtn');
  const trainerProfileImageInput = document.getElementById('trainerProfileImage');
  const trainerImageTag = document.getElementById('trainerImageTag');

  if (uploadTrainerImageBtn && trainerProfileImageInput) {
    uploadTrainerImageBtn.addEventListener('click', function() {
      trainerProfileImageInput.click();
    });
  }
  if (trainerProfileImageInput && trainerImageTag) {
    trainerProfileImageInput.addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function(ev) {
          trainerImageTag.src = ev.target.result;
        };
        reader.readAsDataURL(file);
      } else {
        trainerImageTag.src = 'https://via.placeholder.com/96?text=Photo';
      }
    });
  }
  // Tab navigation
  const pendingBtn = document.getElementById('pendingTrainersBtn');
  const approvedBtn = document.getElementById('approvedTrainersBtn');
  const rejectedBtn = document.getElementById('rejectedTrainersBtn');
  const pendingGrid = document.getElementById('pendingTrainersGrid');
  const approvedGrid = document.getElementById('approvedTrainersGrid');
  const rejectedGrid = document.getElementById('rejectedTrainersGrid');

  // Helper: Show only the selected section and fetch correct trainers
  async function showSection(section) {
    if (!pendingGrid || !approvedGrid || !rejectedGrid) return;
    pendingGrid.style.display = section === 'pending' ? 'flex' : 'none';
    approvedGrid.style.display = section === 'approved' ? 'flex' : 'none';
    rejectedGrid.style.display = section === 'rejected' ? 'flex' : 'none';
    // Highlight the active tab button
    if (pendingBtn && approvedBtn && rejectedBtn) {
      if (section === 'pending') {
        pendingBtn.style.background = 'var(--warning)';
        pendingBtn.style.color = '#fff';
        approvedBtn.style.background = '#f0f0f0';
        approvedBtn.style.color = '#1976d2';
        rejectedBtn.style.background = '#f0f0f0';
        rejectedBtn.style.color = '#d32f2f';
      } else if (section === 'approved') {
        pendingBtn.style.background = '#f0f0f0';
        pendingBtn.style.color = '#1976d2';
        approvedBtn.style.background = 'var(--success)';
        approvedBtn.style.color = '#fff';
        rejectedBtn.style.background = '#f0f0f0';
        rejectedBtn.style.color = '#d32f2f';
      } else if (section === 'rejected') {
        pendingBtn.style.background = '#f0f0f0';
        pendingBtn.style.color = '#1976d2';
        approvedBtn.style.background = '#f0f0f0';
        approvedBtn.style.color = '#1976d2';
        rejectedBtn.style.background = 'var(--danger)';
        rejectedBtn.style.color = '#fff';
      }
    }
    // Fetch and render trainers for the selected section
    if (section === 'pending') {
      const trainers = await fetchTrainersByStatus('pending');
      renderPendingTrainers(trainers);
    } else if (section === 'approved') {
      const trainers = await fetchTrainersByStatus('approved');
      renderApprovedTrainers(trainers);
    } else if (section === 'rejected') {
      const trainers = await fetchTrainersByStatus('rejected');
      renderRejectedTrainers(trainers);
    }
  }

  // Fetch trainers by status
  async function fetchTrainersByStatus(status) {
    const token = localStorage.getItem('gymAdminToken');
    let gymId = null;
    if (window.currentGymProfile?._id) {
      gymId = window.currentGymProfile._id;
    } else if (window.currentGymProfile?.id) {
      gymId = window.currentGymProfile.id;
    } else if (typeof currentGymProfile === 'object' && currentGymProfile._id) {
      gymId = currentGymProfile._id;
    }
    if (!token || !gymId) return [];
    try {
      const res = await fetch(`http://localhost:5000/api/trainers?status=${status}&gym=${gymId}`,
        { headers: { 'Authorization': `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to fetch trainers');
      const trainers = await res.json();
      return Array.isArray(trainers) ? trainers.filter(t => t.gym === gymId || (t.gym && (t.gym._id === gymId || t.gym === gymId))) : [];
    } catch (err) {
      console.error('Error fetching trainers:', err);
      return [];
    }
  }

  // Render trainer cards in the pending grid
  function renderPendingTrainers(trainers) {
    if (!pendingGrid) return;
    if (!Array.isArray(trainers) || trainers.length === 0) {
      pendingGrid.innerHTML = '<div style="color:#888;text-align:center;width:100%;padding:32px 0;">No pending trainers found.</div>';
      return;
    }
    pendingGrid.innerHTML = trainers.map(createTrainerCard).join('');
  }
  // Render trainer cards in the approved grid
  function renderApprovedTrainers(trainers) {
    if (!approvedGrid) return;
    if (!Array.isArray(trainers) || trainers.length === 0) {
      approvedGrid.innerHTML = '<div style="color:#888;text-align:center;width:100%;padding:32px 0;">No approved trainers found.</div>';
      return;
    }
    approvedGrid.innerHTML = trainers.map(createTrainerCard).join('');
  }
  // Render trainer cards in the rejected grid
  function renderRejectedTrainers(trainers) {
    if (!rejectedGrid) return;
    if (!Array.isArray(trainers) || trainers.length === 0) {
      rejectedGrid.innerHTML = '<div style="color:#888;text-align:center;width:100%;padding:32px 0;">No rejected trainers found.</div>';
      return;
    }
    rejectedGrid.innerHTML = trainers.map(createTrainerCard).join('');
  }

  if (pendingBtn) pendingBtn.addEventListener('click', () => showSection('pending'));
  if (approvedBtn) approvedBtn.addEventListener('click', () => showSection('approved'));
  if (rejectedBtn) rejectedBtn.addEventListener('click', () => showSection('rejected'));
  showSection('pending');



  // Create a trainer card (basic info)
  function createTrainerCard(trainer) {
    // Support both 'photo' and 'image' (backend may send either)
    let imgSrc = 'https://via.placeholder.com/80?text=Photo';
    if (trainer.photo && typeof trainer.photo === 'string' && trainer.photo.startsWith('/')) {
      imgSrc = `http://localhost:5000${trainer.photo}`;
    } else if (trainer.image && typeof trainer.image === 'string' && trainer.image.startsWith('/')) {
      imgSrc = `http://localhost:5000${trainer.image}`;
    } else if (trainer.photo && typeof trainer.photo === 'string') {
      imgSrc = trainer.photo;
    } else if (trainer.image && typeof trainer.image === 'string') {
      imgSrc = trainer.image;
    }
    // Determine if approved
    const isApproved = (trainer.status && trainer.status.toLowerCase() === 'approved');
    return `
      <div class="trainer-card" style="background:#fff;border-radius:10px;box-shadow:0 2px 8px rgba(0,0,0,0.07);padding:18px;display:flex;flex-direction:column;align-items:center;gap:10px;min-width:220px;max-width:260px;margin:10px auto;position:relative;">
        <img src="${imgSrc}" alt="Profile" style="width:80px;height:80px;border-radius:50%;object-fit:cover;border:2px solid #1976d2;">
        <div style="font-weight:600;font-size:1.1em;">${trainer.firstName || ''} ${trainer.lastName || ''}</div>
        <div style="color:#1976d2;font-size:0.98em;">${trainer.specialty || ''}</div>
        <div style="font-size:0.97em;color:#555;">${trainer.email || ''}</div>
        <div style="font-size:0.97em;color:#555;">${trainer.phone || ''}</div>
        <div style="font-size:0.95em;color:#888;">Experience: ${trainer.experience || 0} yrs</div>
        <div style="font-size:0.95em;color:#888;">Rate: ₹${trainer.rate || 0}/hr</div>
        ${isApproved ? `<span class="approved-badge" style="position:absolute;top:10px;right:10px;background:#4CAF50;color:#fff;padding:5px 14px;border-radius:16px;font-size:0.98em;font-weight:700;display:flex;align-items:center;gap:6px;"><i class='fas fa-check-circle'></i> Approved</span>` : ''}
      </div>
    `;
  }

  // Fetch and display pending trainers when tab is shown
  window.showTrainerTab = async function() {
    showSection('pending');
    const trainers = await fetchPendingTrainers();
    renderPendingTrainers(trainers);
  };


 // End Trainer Tab Logic
  const availBtns = [
    { id: 'setAllMorning', value: '7am-11am' },
    { id: 'setAllAfternoon', value: '12pm-4pm' },
    { id: 'setAllEvening', value: '5pm-9pm' }
  ];
  availBtns.forEach(btn => {
    const el = document.getElementById(btn.id);
    if (el) {
      el.addEventListener('click', function() {
        document.querySelectorAll('.day-availability').forEach(input => {
          input.value = btn.value;
        });
      });
    }
  });
  const clearBtn = document.getElementById('clearAllAvailability');
  if (clearBtn) {
    clearBtn.addEventListener('click', function() {
      document.querySelectorAll('.day-availability').forEach(input => {
        input.value = '';
      });
    });
  }

  // Optional: On form submit, combine all day fields into a summary string (if needed)
  const trainerForm = document.getElementById('trainerRegistrationForm');
  if (trainerForm) {
    trainerForm.addEventListener('submit', async function(e) {
      e.preventDefault();

      const textarea = document.getElementById('trainerAvailability');
      const summary = getAvailabilitySummary();
      if (textarea && !textarea.value.trim() && summary) {
        textarea.value = summary;
      }

      const formData = new FormData(trainerForm);
      appendLocations(formData, trainerForm);
      if (textarea?.value.trim()) {
        formData.set('availability', textarea.value.trim());
      }
      appendGymId(formData);
      appendProfileImage(formData);

      const submitBtn = trainerForm.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      try {
        showTrainerRegistrationDialog();
        resetTrainerFormUI(trainerForm, textarea);
        await submitTrainerRegistration(formData);
      } catch (err) {
        showDialog({
          title: 'Server Error',
          message: err?.message ? err.message : 'Server error. Please try again.',
          confirmText: 'OK',
          iconHtml: '<i class="fas fa-exclamation-triangle" style="color:#d32f2f;font-size:2em;"></i>'
        });
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });

    function getAvailabilitySummary() {
      const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
      return days.map(day => {
        const val = document.querySelector('.day-availability[data-day="'+day+'"]')?.value.trim();
        return val ? `${day}: ${val}` : '';
      }).filter(Boolean).join('; ');
    }

    function appendLocations(formData, form) {
      const locations = Array.from(form.querySelectorAll('[name="locations"]:checked')).map(el => el.value);
      if (locations.length) {
        formData.delete('locations');
        locations.forEach(loc => formData.append('locations', loc));
      }
    }

    function appendGymId(formData) {
      let gymId = null;
      if (window.currentGymProfile?._id) {
        gymId = window.currentGymProfile._id;
      } else if (window.currentGymProfile?.id) {
        gymId = window.currentGymProfile.id;
      } else if (typeof currentGymProfile === 'object' && currentGymProfile._id) {
        gymId = currentGymProfile._id;
      }
      if (gymId) {
        formData.set('gym', gymId);
      }
    }

    function appendProfileImage(formData) {
      const profileImageInput = document.getElementById('trainerProfileImage');
      if (profileImageInput?.files?.[0]) {
        formData.set('profileImage', profileImageInput.files[0]);
      }
    }

    function showTrainerRegistrationDialog() {
      showDialog({
        title: 'Trainer Registration Submitted',
        message: 'Your trainer application has been submitted and is pending admin approval.',
        confirmText: 'OK',
        iconHtml: '<i class="fas fa-check-circle" style="color:#38b000;font-size:2em;"></i>',
        onConfirm: function() {
          const trainerModal = document.getElementById('trainerRegistrationModal');
          if (trainerModal) {
            trainerModal.style.display = 'none';
            document.body.style.overflow = '';
          }
        }
      });
    }

    function resetTrainerFormUI(form, textarea) {
      form.reset();
      if (textarea) textarea.value = '';
      const trainerImageTag = document.getElementById('trainerImageTag');
      if (trainerImageTag) trainerImageTag.src = 'https://via.placeholder.com/96?text=Photo';
    }

    async function submitTrainerRegistration(formData) {
      const res = await fetch('http://localhost:5000/api/trainers/register', {
        method: 'POST',
        body: formData
      });
      if (!res.ok) {
        const data = await res.json();
        showDialog({
          title: 'Registration Error',
          message: (data && data.message) ? data.message : 'Submission failed.',
          confirmText: 'OK',
          iconHtml: '<i class="fas fa-exclamation-triangle" style="color:#d32f2f;font-size:2em;"></i>'
        });
      }
    }
  }
});
// --- Trainer Registration Modal Logic ---
document.addEventListener('DOMContentLoaded', function() {
  // Add Trainer Quick Action Button (by class or id)
  let addTrainerBtn = document.getElementById('addTrainerBtn');
  if (!addTrainerBtn) {
    // Try to find by quick action (if you use a quick-action-list)
    addTrainerBtn = Array.from(document.querySelectorAll('.quick-action-btn')).find(btn => btn.textContent?.toLowerCase().includes('add trainer'));
  }
  const trainerModal = document.getElementById('trainerRegistrationModal');
  const closeTrainerModal = document.getElementById('closeTrainerRegistrationModal');
  // Open modal (Quick Actions: remove any inline style set on the button or card)
  if (addTrainerBtn && trainerModal) {
    // Remove inline style from the quick action button (if any)
    addTrainerBtn.removeAttribute('style');
    // Remove inline style from the parent card if it's a quick-action-card
    const quickActionCard = addTrainerBtn.closest('.quick-action-card');
    if (quickActionCard) quickActionCard.removeAttribute('style');
    addTrainerBtn.addEventListener('click', function() {
      trainerModal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
      // Remove any inline style from Quick Actions card and its button (if present)
      const quickActionCard = document.querySelector('.quick-action-card');
      if (quickActionCard) quickActionCard.removeAttribute('style');
      addTrainerBtn.removeAttribute('style');
    });
  }
  // Close modal
  if (closeTrainerModal && trainerModal) {
    closeTrainerModal.onclick = function() {
      trainerModal.style.display = 'none';
      document.body.style.overflow = '';
    };
  }
  // Close modal if clicking outside modal-content
  if (trainerModal) {
    trainerModal.addEventListener('mousedown', function(e) {
      if (e.target === trainerModal) {
        trainerModal.style.display = 'none';
        document.body.style.overflow = '';
      }
    });
  }
});
// --- Membership Plans Section (Dynamic, Editable, Backend Sync) ---
document.addEventListener('DOMContentLoaded', function() {
  // Membership plans state
  let plans = [
    { name: 'Basic', price: 800, discount: 0, discountMonths: 0, benefits: ['Gym Access', 'Group Classes'], note: 'Best for beginners', icon: 'fa-leaf', color: '#38b000' },
    { name: 'Standard', price: 1200, discount: 10, discountMonths: 6, benefits: ['All Basic Benefits', 'Diet Plan', 'Locker Facility'], note: 'Most Popular', icon: 'fa-star', color: '#3a86ff' },
    { name: 'Premium', price: 1800, discount: 15, discountMonths: 12, benefits: ['All Standard Benefits', 'Personal Trainer', 'Spa & Sauna'], note: 'For serious fitness', icon: 'fa-gem', color: '#8338ec' }
  ];
  // DOM refs
  const plansList = document.getElementById('plansList');
  const editPlansBtn = document.getElementById('editPlansBtn');
  const planEditorModal = document.getElementById('planEditorModal');
  const closePlanEditorModal = document.getElementById('closePlanEditorModal');
  const planEditorForm = document.getElementById('planEditorForm');
  const planEditorCards = document.getElementById('planEditorCards');
  const cancelPlanEditBtn = document.getElementById('cancelPlanEditBtn');

  // Fetch plans from backend
  async function fetchPlans() {
    try {
      const token = localStorage.getItem('gymAdminToken');
      const res = await fetch('http://localhost:5000/api/gyms/membership-plans', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length === 3) plans = data;
      }
    } catch (e) { 
      console.error('Error fetching plans:', e); // Log the error for debugging
    }
    renderPlans();
    updateDiscountedFees();
  }

  // Render plans in dashboard
  function renderPlans() {
    if (!plansList) return;
    plansList.innerHTML = plans.map((plan, idx) => `
      <div class="plan-card" data-plan="${plan.name}" style="background:#f6f8fc;border-radius:12px;padding:22px 16px;box-shadow:0 2px 10px ${plan.color}11;display:flex;flex-direction:column;align-items:center;">
        <i class="fas ${plan.icon}" style="font-size:2.2em;color:${plan.color};margin-bottom:8px;"></i>
        <div style="font-weight:700;font-size:1.15em;margin-bottom:6px;">${plan.name}</div>
        <div style="font-size:1.5em;font-weight:700;color:#1976d2;margin-bottom:6px;">₹${plan.price}/mo</div>
        <div style="color:${plan.color};font-weight:600;margin-bottom:8px;">${plan.discount > 0 ? `${plan.discount}% Off on ${plan.discountMonths}+ months` : 'No Discount'}</div>
        <ul style="list-style:none;padding:0;margin:0 0 10px 0;font-size:0.98em;color:#333;text-align:left;">
          ${plan.benefits.map(b => `<li><i class="fas fa-check-circle" style="color:${plan.color};margin-right:6px;"></i> ${b}</li>`).join('')}
        </ul>
        <div style="font-size:0.95em;color:#888;">${plan.note || ''}</div>
      </div>
    `).join('');
  }

  // Open Plan Editor Modal
  if (editPlansBtn && planEditorModal && planEditorCards) {
    editPlansBtn.onclick = async function() {
      await fetchPlans();
      planEditorModal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
      renderPlanEditorCards();
    };
  }
  function closePlanEditor() {
    planEditorModal.style.display = 'none';
    document.body.style.overflow = '';
  }
  if (closePlanEditorModal) closePlanEditorModal.onclick = closePlanEditor;
  if (cancelPlanEditBtn) cancelPlanEditBtn.onclick = closePlanEditor;
  if (planEditorModal) {
    planEditorModal.addEventListener('mousedown', function(e) {
      if (e.target === planEditorModal) closePlanEditor();
    });
  }

  // Render Plan Editor Cards
  function renderPlanEditorCards() {
    // FontAwesome icon options (add more as needed)
    const iconOptions = [
      'fa-leaf', 'fa-star', 'fa-gem', 'fa-dumbbell', 'fa-heart', 'fa-fire', 'fa-bolt', 'fa-crown', 'fa-medal', 'fa-trophy', 'fa-user-shield', 'fa-rocket', 'fa-mountain', 'fa-bicycle', 'fa-running', 'fa-swimmer', 'fa-apple-alt', 'fa-shield-alt', 'fa-thumbs-up', 'fa-check-circle'
    ];
    planEditorCards.innerHTML = '';
    plans.forEach((plan, idx) => {
      // Benefits as comma-separated string
      const benefitsStr = plan.benefits ? plan.benefits.join(', ') : '';
      // Card HTML
      const card = document.createElement('div');
      card.className = 'plan-editor-card';
      card.style = 'background:#f8f9fa;border-radius:12px;padding:18px;min-width:220px;max-width:260px;flex:1 1 220px;box-shadow:0 2px 8px rgba(0,0,0,0.04);margin-bottom:12px;';
      card.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
          <span class="plan-icon" style="font-size:2em;color:${plan.color};cursor:pointer;" data-plan-idx="${idx}" title="Change icon or color"><i class="fas ${plan.icon}"></i></span>
          <input type="text" class="plan-name-input" data-plan-idx="${idx}" value="${plan.name}" style="font-size:1.1em;font-weight:600;border:none;background:transparent;outline:none;width:100px;">
        </div>
        <div class="icon-color-picker-wrap" id="iconColorPickerWrap${idx}" style="display:none;">
          <div class="icon-picker" style="margin-bottom:10px;">
            <label style="font-weight:500;">Icon:</label>
            <div class="icon-picker-list" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;">
              ${iconOptions.map(icon => `
                <button type="button" class="icon-picker-btn${plan.icon === icon ? ' selected' : ''}" data-plan-idx="${idx}" data-icon="${icon}" aria-label="${icon.replace('fa-', '')}" style="font-size:1.3em;padding:6px;border-radius:6px;border:${plan.icon === icon ? '2px solid #1976d2' : '1px solid #ccc'};background:${plan.icon === icon ? '#e3f2fd' : '#fff'};color:#333;outline:none;cursor:pointer;transition:all 0.15s;">
                  <i class="fas ${icon}"></i>
                </button>
              `).join('')}
            </div>
          </div>
          <div class="color-picker" style="margin-bottom:10px;">
            <label style="font-weight:500;">Color:</label>
            <input type="color" class="plan-color-input" data-plan-idx="${idx}" value="${plan.color}" style="margin-left:10px;width:36px;height:36px;border:none;outline:none;cursor:pointer;vertical-align:middle;">
          </div>
        </div>
        <div style="margin-bottom:8px;">
          <label>Price (₹):</label>
          <input type="number" class="plan-price-input" data-plan-idx="${idx}" value="${plan.price}" min="0" style="width:80px;margin-left:8px;">
        </div>
        <div style="margin-bottom:8px;">
          <label>Discount (%):</label>
          <input type="number" class="plan-discount-input" data-plan-idx="${idx}" value="${plan.discount}" min="0" max="100" style="width:60px;margin-left:8px;">
          <label style="margin-left:10px;">For</label>
          <input type="number" class="plan-discount-months-input" data-plan-idx="${idx}" value="${plan.discountMonths}" min="0" max="24" style="width:50px;margin-left:6px;"> <span>months</span>
        </div>
        <div style="margin-bottom:8px;">
          <label>Benefits:</label>
          <input type="text" class="plan-benefits-input" data-plan-idx="${idx}" value="${benefitsStr}" placeholder="Comma separated" style="width:100%;margin-top:4px;">
        </div>
        <div style="margin-bottom:8px;">
          <label>Note:</label>
          <input type="text" class="plan-note-input" data-plan-idx="${idx}" value="${plan.note}" style="width:100%;margin-top:4px;">
        </div>
      `;
      planEditorCards.appendChild(card);
    });
    // Icon click to toggle picker
    planEditorCards.querySelectorAll('.plan-icon').forEach(iconEl => {
      iconEl.addEventListener('click', function() {
        const idx = +this.getAttribute('data-plan-idx');
        const picker = document.getElementById('iconColorPickerWrap' + idx);
        if (picker) picker.style.display = picker.style.display === 'none' ? 'block' : 'none';
      });
    });
    // Icon picker event
    planEditorCards.querySelectorAll('.icon-picker-btn').forEach(btn => {
      btn.addEventListener('click', iconPickerBtnClickHandler);
    });

    function iconPickerBtnClickHandler() {
      const idx = +this.getAttribute('data-plan-idx');
      const icon = this.getAttribute('data-icon');
      plans[idx].icon = icon;
      renderPlanEditorCards();
      // Keep picker open after icon change
      setTimeout(() => showPlanIconColorPicker(idx), 0);
    }
    // Color picker event
    planEditorCards.querySelectorAll('.plan-color-input').forEach(input => {
      input.addEventListener('input', function() {
        const idx = +this.getAttribute('data-plan-idx');
        plans[idx].color = this.value;
        renderPlanEditorCards();
        // Keep picker open after color change
        setTimeout(() => showPlanIconColorPicker(idx), 0);
      });
    });
    // Other field events (name, price, discount, etc.)
    planEditorCards.querySelectorAll('.plan-name-input').forEach(input => {
      input.addEventListener('input', function() {
        const idx = +this.getAttribute('data-plan-idx');
        plans[idx].name = this.value;
      });
    });
    planEditorCards.querySelectorAll('.plan-price-input').forEach(input => {
      input.addEventListener('input', function() {
        const idx = +this.getAttribute('data-plan-idx');
        plans[idx].price = +this.value;
      });
    });
    planEditorCards.querySelectorAll('.plan-discount-input').forEach(input => {
      input.addEventListener('input', function() {
        const idx = +this.getAttribute('data-plan-idx');
        plans[idx].discount = +this.value;
      });
    });
    planEditorCards.querySelectorAll('.plan-discount-months-input').forEach(input => {
      input.addEventListener('input', function() {
        const idx = +this.getAttribute('data-plan-idx');
        plans[idx].discountMonths = +this.value;
      });
    });
    planEditorCards.querySelectorAll('.plan-benefits-input').forEach(input => {
      input.addEventListener('input', function() {
        const idx = +this.getAttribute('data-plan-idx');
        plans[idx].benefits = this.value.split(',').map(b => b.trim()).filter(Boolean);
      });
    });
    planEditorCards.querySelectorAll('.plan-note-input').forEach(input => {
      input.addEventListener('input', function() {
        const idx = +this.getAttribute('data-plan-idx');
        plans[idx].note = this.value;
      });
    });
    // Icon picker event
    planEditorCards.querySelectorAll('.icon-picker-btn').forEach(btn => {
      btn.addEventListener('click', function() {
    // Icon picker event
    planEditorCards.querySelectorAll('.icon-picker-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const idx = +this.getAttribute('data-plan-idx');
        const icon = this.getAttribute('data-icon');
        plans[idx].icon = icon;
        renderPlanEditorCards();
        // Keep picker open after icon change
        setTimeout(() => showPlanIconColorPicker(idx), 0);
      });
    });
        const idx = +this.getAttribute('data-plan-idx');
        plans[idx].color = this.value;
        renderPlanEditorCards();
      });
    });
    // Other field events (name, price, discount, etc.)
    planEditorCards.querySelectorAll('.plan-name-input').forEach(input => {
      input.addEventListener('input', function() {
        const idx = +this.getAttribute('data-plan-idx');
        plans[idx].name = this.value;
      });
    });
    planEditorCards.querySelectorAll('.plan-price-input').forEach(input => {
      input.addEventListener('input', function() {
        const idx = +this.getAttribute('data-plan-idx');
        plans[idx].price = +this.value;
      });
    });
    planEditorCards.querySelectorAll('.plan-discount-input').forEach(input => {
      input.addEventListener('input', function() {
        const idx = +this.getAttribute('data-plan-idx');
        plans[idx].discount = +this.value;
      });
    });
    planEditorCards.querySelectorAll('.plan-discount-months-input').forEach(input => {
      input.addEventListener('input', function() {
        const idx = +this.getAttribute('data-plan-idx');
        plans[idx].discountMonths = +this.value;
      });
    });
    planEditorCards.querySelectorAll('.plan-benefits-input').forEach(input => {
      input.addEventListener('input', function() {
        const idx = +this.getAttribute('data-plan-idx');
        plans[idx].benefits = this.value.split(',').map(b => b.trim()).filter(Boolean);
      });
    });
    planEditorCards.querySelectorAll('.plan-note-input').forEach(input => {
      input.addEventListener('input', function() {
        const idx = +this.getAttribute('data-plan-idx');
        plans[idx].note = this.value;
      });
    });
}

// Helper function to keep the icon/color picker open after re-render
function showPlanIconColorPicker(idx) {
  const picker = document.getElementById('iconColorPickerWrap' + idx);
  if (picker) picker.style.display = 'block';
}
  // Save Plans to Backend
  if (planEditorForm) {
    planEditorForm.onsubmit = async function(e) {
      e.preventDefault();
      // Collect values (from plans state, which now includes icon/color)
      const newPlans = plans.map((plan, idx) => ({
        ...plan
      }));
      // Save to backend
      try {
        const token = localStorage.getItem('gymAdminToken');
        const res = await fetch('http://localhost:5000/api/gyms/membership-plans', {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(newPlans)
        });
        if (res.ok) {
          plans = newPlans;
          renderPlans();
          closePlanEditor();
          showDialog({
            title: 'Plans Updated',
            message: 'Membership plans updated successfully.',
            confirmText: 'OK',
            iconHtml: '<i class="fas fa-check-circle" style="color:#38b000;"></i>'
          });
        } else {
          showDialog({
            title: 'Error',
            message: 'Failed to update plans.',
            confirmText: 'OK',
            iconHtml: '<i class="fas fa-exclamation-triangle" style="color:#ef233c;"></i>'
          });
        }
      } catch (err) {
        console.error('Error updating plans:', err); // Log the error for debugging
        showDialog({
          title: 'Error',
          message: 'Server error. Please try again.',
          confirmText: 'OK',
          iconHtml: '<i class="fas fa-exclamation-triangle" style="color:#ef233c;"></i>'
        });
      }
    };
  }

  // Discounted Fees Example (dynamic)
  const planTypeSelect = document.getElementById('planTypeSelect');
  const monthsInput = document.getElementById('monthsInput');
  const calcBtn = document.getElementById('calcDiscountBtn');
  const resultSpan = document.getElementById('discountedFeesResult');
  function updateDiscountedFees() {
    if (!planTypeSelect || !monthsInput || !resultSpan) return;
    const planName = planTypeSelect.value;
    const months = parseInt(monthsInput.value, 10) || 1;
    const plan = plans.find(p => p.name === planName) || plans[0];
    const price = plan.price * months;
    const discount = (months >= plan.discountMonths) ? plan.discount : 0;
    const discounted = price * (1 - discount / 100);
    if (discount > 0) {
      resultSpan.innerHTML = `Total: <s>₹${price}</s> <span style='color:#38b000;'>₹${discounted.toFixed(0)}</span> <span style='color:#ffbe0b;'>(-${discount}% off)</span>`;
    } else {
      resultSpan.innerHTML = `Total: ₹${price}`;
    }
  }
  if (calcBtn) calcBtn.onclick = updateDiscountedFees;
  if (planTypeSelect) planTypeSelect.onchange = updateDiscountedFees;
  if (monthsInput) monthsInput.oninput = updateDiscountedFees;

  // Initial render
  fetchPlans();
});
// --- Remove Member Button Dropdown Logic ---
// (showDialog is now defined only once at the top of the file, remove this duplicate)
document.addEventListener('DOMContentLoaded', function () {
  const removeMemberBtnTab = document.getElementById('removeMemberBtnTab');
  let removeDropdown = null;

  if (removeMemberBtnTab) {
    removeMemberBtnTab.addEventListener('click', function (e) {
      e.preventDefault();
      // Remove any existing dropdown
      if (removeDropdown) removeDropdown.remove();

      // Create dropdown
      removeDropdown = document.createElement('div');
      removeDropdown.className = 'remove-member-dropdown';
      removeDropdown.innerHTML = `
        <button class="remove-dropdown-option" id="removeExpiredMembersBtn">
          <i class="fas fa-user-slash" style="color:#d32f2f;margin-right:8px;"></i>
          Remove Expired (7+ days)
        </button>
        <button class="remove-dropdown-option" id="customRemoveMembersBtn">
          <i class="fas fa-user-cog" style="color:#1976d2;margin-right:8px;"></i>
          Custom Remove
        </button>
      `;

      // Position dropdown below the button, adjust for mobile view
      const rect = removeMemberBtnTab.getBoundingClientRect();
      removeDropdown.style.position = 'absolute';
      removeDropdown.style.top = (rect.bottom + window.scrollY + 8) + 'px';
      // Default left position
      let left = rect.left + window.scrollX;
      // If on mobile (screen width <= 600px), ensure dropdown doesn't overflow right edge
      if (window.innerWidth <= 600) {
        const dropdownWidth = 220;
        if (left + dropdownWidth > window.innerWidth - 8) {
          left = window.innerWidth - dropdownWidth - 8; // 8px margin from right
          if (left < 8) left = 8; // 8px min left margin
        }
      }
      removeDropdown.style.left = left + 'px';
      removeDropdown.style.zIndex = 10000;
      removeDropdown.style.background = '#fff';
      removeDropdown.style.boxShadow = '0 4px 18px 0 rgba(0,0,0,0.10)';
      removeDropdown.style.borderRadius = '10px';
      removeDropdown.style.padding = '8px 0';
      removeDropdown.style.minWidth = '220px';

      document.body.appendChild(removeDropdown);

      // Remove dropdown on outside click
      function handleOutsideClick(ev) {
        if (!removeDropdown.contains(ev.target) && ev.target !== removeMemberBtnTab) {
          removeDropdown.remove();
          document.removeEventListener('mousedown', handleOutsideClick);
        }
      }
      setTimeout(() => {
        document.addEventListener('mousedown', handleOutsideClick);
      }, 0);


      // Remove expired members logic
      document.getElementById('removeExpiredMembersBtn').onclick = function () {
        removeDropdown.remove();
        showDialog({
          title: 'Remove Expired Members',
          message: 'Remove all members whose membership expired more than 7 days ago?',
          confirmText: 'Remove',
          cancelText: 'Cancel',
          showCancel: true,
          iconHtml: '<i class="fas fa-user-slash" style="color:#d32f2f;"></i>',
          onConfirm: async function () {
            const token = localStorage.getItem('gymAdminToken');
            try {
              const res = await fetch('http://localhost:5000/api/members', {
                headers: { 'Authorization': `Bearer ${token}` }
              });
              const members = await res.json();
              const now = new Date();
              const expired = (Array.isArray(members) ? members : []).filter(m => {
                if (!m.membershipValidUntil) return false;
                const valid = new Date(m.membershipValidUntil);
                return (now - valid) / (1000 * 60 * 60 * 24) > 7;
              });
              if (!expired.length) {
                showDialog({
                  title: 'No Expired Members',
                  message: 'No expired members found.',
                  confirmText: 'OK',
                  iconHtml: '<i class="fas fa-info-circle" style="color:#1976d2;"></i>'
                });
                return;
              }
              let removed = 0;
              for (const m of expired) {
                await fetch(`http://localhost:5000/api/members/${m._id}`, {
                  method: 'DELETE',
                  headers: { 'Authorization': `Bearer ${token}` }
                });
                removed++;
              }
              showDialog({
                title: 'Members Removed',
                message: `Removed ${removed} expired member(s).`,
                confirmText: 'OK',
                iconHtml: '<i class="fas fa-check-circle" style="color:#38b000;"></i>',
                onConfirm: function () {
                  if (typeof fetchAndDisplayMembers === 'function') fetchAndDisplayMembers();
                  // Do NOT update total payments after member removal; keep the value unchanged
                  // If you have a function that recalculates total payments, do NOT call it here
                }
              });
            } catch (err) {
              console.error('Error occurred while removing expired members:', err);
              showDialog({
                title: 'Error',
                message: 'Error removing expired members.',
                confirmText: 'OK',
                iconHtml: '<i class="fas fa-exclamation-triangle" style="color:#ef233c;"></i>'
              });
            }
          }
        });
      };

      // Custom remove logic (interactive layout)
      document.getElementById('customRemoveMembersBtn').onclick = function () {
        removeDropdown.remove();
        showCustomRemoveMembersModal();
      };
    });
  }

  // Interactive custom remove modal
  function showCustomRemoveMembersModal() {
    // Remove any existing modal
    let modal = document.getElementById('customRemoveMembersModal');
    if (modal) modal.remove();

    modal = document.createElement('div');
    modal.id = 'customRemoveMembersModal';
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
      <div class="modal-content" style="max-width:420px;">
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <h3 style="margin:0;"><i class="fas fa-user-cog" style="color:#1976d2;margin-right:8px;"></i>Custom Remove Members</h3>
          <button class="modal-close" id="closeCustomRemoveMembersModal" style="font-size:1.5rem;">&times;</button>
        </div>
        <div style="margin:18px 0;">
          <label for="customRemoveSearch" style="font-weight:500;">Search by name, email, or ID:</label>
          <input type="text" id="customRemoveSearch" style="width:100%;margin-top:6px;padding:8px;border-radius:6px;border:1px solid #ccc;">
        </div>
        <div id="customRemoveMembersList" style="max-height:260px;overflow-y:auto;border:1px solid #eee;border-radius:8px;padding:8px 0;background:#fafbfc;"></div>
        <div style="margin-top:18px;display:flex;justify-content:flex-end;gap:12px;">
          <button class="btn btn-secondary" id="cancelCustomRemoveBtn">Cancel</button>
          <button class="btn btn-danger" id="confirmCustomRemoveBtn" disabled>Remove Selected</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    // Close logic
    document.getElementById('closeCustomRemoveMembersModal').onclick =
      document.getElementById('cancelCustomRemoveBtn').onclick = function () {
        modal.remove();
      };
    modal.addEventListener('mousedown', function handler(e) {
      if (e.target === modal) {
        modal.remove();
        modal.removeEventListener('mousedown', handler);
      }
    });

    // Fetch and render members
    const token = localStorage.getItem('gymAdminToken');
    fetch('http://localhost:5000/api/members', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(members => {
        renderCustomRemoveMembersList(members, '');
        // Search logic
        document.getElementById('customRemoveSearch').oninput = function (e) {
          renderCustomRemoveMembersList(members, e.target.value);
        };
      });

    // Render members with checkboxes
    function renderCustomRemoveMembersList(members, filter) {
      const list = document.getElementById('customRemoveMembersList');
      if (!list) return;
      let filtered = Array.isArray(members) ? members : [];
      if (filter) {
        const f = filter.toLowerCase();
        filtered = filtered.filter(m =>
          (m.memberName?.toLowerCase().includes(f)) ||
          (m.email?.toLowerCase().includes(f)) ||
          (m.membershipId?.toLowerCase().includes(f))
        );
      }
      if (!filtered.length) {
        list.innerHTML = '<div style="color:#888;text-align:center;">No members found.</div>';
        document.getElementById('confirmCustomRemoveBtn').disabled = true;
        return;
      }
      list.innerHTML = filtered.map(m => `
        <label style="display:flex;align-items:center;padding:6px 12px;cursor:pointer;">
          <input type="checkbox" class="custom-remove-checkbox" value="${m.membershipId || ''}" style="margin-right:10px;">
          <img src="${m.profileImage ? `http://localhost:5000${m.profileImage}` : 'https://via.placeholder.com/32?text=Photo'}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;margin-right:10px;">
          <span style="font-weight:500;">${m.memberName || ''}</span>
          <span style="color:#888;font-size:0.95em;margin-left:8px;">${m.membershipId || ''}</span>
        </label>
      `).join('');
      // Enable/disable confirm button
      const checkboxes = list.querySelectorAll('.custom-remove-checkbox');
      const confirmBtn = document.getElementById('confirmCustomRemoveBtn');
      checkboxes.forEach(cb => {
        cb.onchange = function () {
          confirmBtn.disabled = !Array.from(checkboxes).some(c => c.checked);
        };
      });
      confirmBtn.disabled = !Array.from(checkboxes).some(c => c.checked);
      // Confirm remove logic
      confirmBtn.onclick = function () {
        const selected = Array.from(checkboxes).filter(c => c.checked).map(c => c.value);
        if (!selected.length) return;
        showDialog({
          title: 'Remove Members',
          message: `Remove ${selected.length} selected member(s)?`,
          confirmText: 'Remove',
          cancelText: 'Cancel',
          showCancel: true,
          iconHtml: '<i class="fas fa-user-cog" style="color:#1976d2;"></i>',
          onConfirm: async function () {
            try {
              const res = await fetch('http://localhost:5000/api/members/bulk', {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ membershipIds: selected })
              });
              const data = await res.json();
              if (!res.ok) {
                showDialog({
                  title: 'Error',
                  message: data && data.message ? data.message : 'Error removing members.',
                  confirmText: 'OK',
                  iconHtml: '<i class="fas fa-exclamation-triangle" style="color:#ef233c;"></i>'
                });
                return;
              }
              showDialog({
                title: 'Members Removed',
                message: `Removed ${data.deletedCount || 0} member(s).`,
                confirmText: 'OK',
                iconHtml: '<i class="fas fa-check-circle" style="color:#38b000;"></i>',
                onConfirm: function () {
                  modal.remove();
                  if (typeof fetchAndDisplayMembers === 'function') fetchAndDisplayMembers();
                  // Do NOT update total payments after member removal; keep the value unchanged
                  // If you have a function that recalculates total payments, do NOT call it here
                }
              });
            } catch (err) {
              showDialog({
                title: 'Error',
                message: 'Error removing members.',
                confirmText: 'OK',
                iconHtml: '<i class="fas fa-exclamation-triangle" style="color:#ef233c;"></i>'
              });
            }
          }
        });
      };
    }
  }
});
// --- Add Member Modal Logic (Single Consolidated Implementation) ---
document.addEventListener('DOMContentLoaded', function() {
  console.log('[AddMember] Initializing add member modal functionality');
  
  // DOM elements
  const addMemberBtn = document.getElementById('addMemberBtn');
  const addMemberBtnTab = document.getElementById('addMemberBtnTab');
  const addMemberModal = document.getElementById('addMemberModal');
  const closeAddMemberModal = document.getElementById('closeAddMemberModal');
  const addMemberForm = document.getElementById('addMemberForm');
  const addMemberSuccessMsg = document.getElementById('addMemberSuccessMsg');
  const memberProfileImageInput = document.getElementById('memberProfileImage');
  const memberImageTag = document.getElementById('memberImageTag');
  const uploadMemberImageBtn = document.getElementById('uploadMemberImageBtn');

  // Form elements for payment calculation
  const planSelected = document.getElementById('planSelected');
  const monthlyPlan = document.getElementById('monthlyPlan');
  const paymentAmount = document.getElementById('paymentAmount');

  console.log('[AddMember] DOM elements found:', {
    addMemberBtn: !!addMemberBtn,
    addMemberModal: !!addMemberModal,
    planSelected: !!planSelected,
    monthlyPlan: !!monthlyPlan,
    paymentAmount: !!paymentAmount,
    memberProfileImageInput: !!memberProfileImageInput,
    uploadMemberImageBtn: !!uploadMemberImageBtn
  });

  // Additional debugging - check actual element IDs in DOM
  console.log('[AddMember] Checking DOM element IDs:');
  console.log('planSelected element:', document.getElementById('planSelected'));
  console.log('monthlyPlan element:', document.getElementById('monthlyPlan'));
  console.log('paymentAmount element:', document.getElementById('paymentAmount'));
  console.log('uploadMemberImageBtn element:', document.getElementById('uploadMemberImageBtn'));
  console.log('memberProfileImage element:', document.getElementById('memberProfileImage'));

  // Debug: Log actual element IDs to see if we're targeting the right elements
  if (planSelected) console.log('[AddMember] Plan select element ID:', planSelected.id);
  if (monthlyPlan) console.log('[AddMember] Monthly plan element ID:', monthlyPlan.id);
  if (paymentAmount) console.log('[AddMember] Payment amount element ID:', paymentAmount.id);
  if (uploadMemberImageBtn) console.log('[AddMember] Upload button element ID:', uploadMemberImageBtn.id);
  if (memberProfileImageInput) console.log('[AddMember] File input element ID:', memberProfileImageInput.id);

  // Cache for membership plans
  let plansCache = [];

  // Fetch membership plans from backend
  async function fetchPlansForModal() {
    try {
      console.log('[AddMember] Fetching membership plans...');
      
      // Use the same waitForToken pattern as the admin profile fetch
      const token = await waitForToken('gymAdminToken', 10, 100);
      
      if (!token) {
        console.warn('[AddMember] No authentication token found after retry');
        
        // Try alternative token names if gymAdminToken is not available
        const alternativeTokens = ['token', 'authToken', 'gymAuthToken'];
        let alternativeToken = null;
        
        for (const tokenName of alternativeTokens) {
          alternativeToken = localStorage.getItem(tokenName);
          if (alternativeToken) {
            console.log(`[AddMember] Found alternative token: ${tokenName}`);
            break;
          }
        }
        
        if (!alternativeToken) {
          console.error('[AddMember] No valid authentication token found');
          plansCache = [];
          return;
        }
        
        // Use the alternative token
        const response = await fetch('http://localhost:5000/api/gyms/membership-plans', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${alternativeToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText} (using alternative token)`);
        }
        
        const data = await response.json();
        console.log('[AddMember] Plans API response (alternative token):', data);
        
        // Handle both response formats: direct array or {success: true, plans: [...]}
        if (Array.isArray(data)) {
          plansCache = data;
          console.log('[AddMember] Plans cached (direct array):', plansCache.length, 'plans');
        } else if (data.success && Array.isArray(data.plans)) {
          plansCache = data.plans;
          console.log('[AddMember] Plans cached (nested):', plansCache.length, 'plans');
        } else {
          console.warn('[AddMember] Invalid API response format:', data);
          plansCache = [];
        }
        return;
      }
      
      console.log('[AddMember] Using gymAdminToken for API request');
      const response = await fetch('http://localhost:5000/api/gyms/membership-plans', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('[AddMember] Plans API response:', data);
      
      // Handle both response formats: direct array or {success: true, plans: [...]}
      if (Array.isArray(data)) {
        plansCache = data;
        console.log('[AddMember] Plans cached (direct array):', plansCache.length, 'plans');
      } else if (data.success && Array.isArray(data.plans)) {
        plansCache = data.plans;
        console.log('[AddMember] Plans cached (nested):', plansCache.length, 'plans');
      } else {
        console.warn('[AddMember] Invalid API response format:', data);
        plansCache = [];
      }
    } catch (error) {
      console.error('[AddMember] Error fetching plans:', error);
      plansCache = [];
    }
  }

  // Update payment amount based on plan and duration
  function updatePaymentAmountAndDiscount() {
    console.log('[AddMember] Calculating payment amount...');
    
    // Get fresh DOM references
    const currentPlanSelected = document.getElementById('planSelected');
    const currentMonthlyPlan = document.getElementById('monthlyPlan');
    const currentPaymentAmount = document.getElementById('paymentAmount');
    
    if (!currentPlanSelected || !currentMonthlyPlan || !currentPaymentAmount) {
      console.warn('[AddMember] Required elements not found for payment calculation');
      return;
    }

    const selectedPlan = currentPlanSelected.value;
    const selectedDuration = currentMonthlyPlan.value;
    
    console.log('[AddMember] Selected:', { plan: selectedPlan, duration: selectedDuration });

    if (!selectedPlan || !selectedDuration) {
      console.log('[AddMember] Clearing payment amount - no selection');
      currentPaymentAmount.value = '';
      return;
    }

    // Extract months from duration
    const monthsMatch = selectedDuration.match(/(\d+)\s*Months?/i); // Updated regex to handle both "Month" and "Months"
    const months = monthsMatch ? parseInt(monthsMatch[1]) : 1;
    console.log('[AddMember] Extracted months:', months, 'from duration:', selectedDuration);

    // Find plan in cache
    const plan = plansCache.find(p => p.name === selectedPlan);
    
    if (!plan) {
      console.warn('[AddMember] Plan not found in cache:', selectedPlan);
      currentPaymentAmount.value = '';
      return;
    }

    console.log('[AddMember] Found plan:', plan);

    // Calculate amount
    const baseAmount = plan.price * months;
    let finalAmount = baseAmount;
    
    // Check if discount applies - handle both array and numeric discountMonths
    let discountApplies = false;
    if (plan.discount > 0 && plan.discountMonths) {
      if (Array.isArray(plan.discountMonths)) {
        discountApplies = plan.discountMonths.includes(months);
      } else if (typeof plan.discountMonths === 'number') {
        discountApplies = months >= plan.discountMonths;
      }
    }
    
    if (discountApplies) {
      finalAmount = Math.round(baseAmount * (1 - plan.discount / 100));
      console.log('[AddMember] Discount applied:', plan.discount + '%, Final:', finalAmount);
    } else {
      console.log('[AddMember] No discount applicable. Plan discount:', plan.discount, 'Plan discountMonths:', plan.discountMonths, 'Selected months:', months);
    }

    // Update UI
    currentPaymentAmount.value = finalAmount;
    console.log('[AddMember] Payment amount updated:', finalAmount);
  }

  // Open modal
  async function openAddMemberModal() {
    console.log('[AddMember] Opening modal...');
    await fetchPlansForModal();
    
    if (addMemberModal) {
      addMemberModal.style.display = 'flex';
    }
    
    // Reset form
    if (addMemberForm) addMemberForm.reset();
    if (paymentAmount) paymentAmount.value = '';
    if (memberImageTag) memberImageTag.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iOTYiIGhlaWdodD0iOTYiIHZpZXdCb3g9IjAgMCA5NiA5NiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9Ijk2IiBoZWlnaHQ9Ijk2IiBmaWxsPSIjRjVGNUY1Ii8+CjxwYXRoIGQ9Ik00OCA2NEM1Ni44MzY2IDY0IDY0IDU2LjgzNjYgNjQgNDhDNjQgMzkuMTYzNCA1Ni44MzY2IDMyIDQ4IDMyQzM5LjE2MzQgMzIgMzIgMzkuMTYzNCAzMiA0OEMzMiA1Ni44MzY2IDM5LjE2MzQgNjQgNDggNjRaIiBmaWxsPSIjQ0NDQ0NDIi8+CjxwYXRoIGQ9Ik0yNCA3Nkg3MlY4MEgyNFY3NloiIGZpbGw9IiNDQ0NDQ0MiLz4KPHRleHQgeD0iNDgiIHk9Ijg4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTAiIGZpbGw9IiM5OTk5OTkiPlBob3RvPC90ZXh0Pgo8L3N2Zz4K';
    if (addMemberSuccessMsg) addMemberSuccessMsg.style.display = 'none';
    
    // Populate plan dropdown
    if (planSelected && plansCache.length > 0) {
      console.log('[AddMember] Current planSelected element:', planSelected);
      console.log('[AddMember] Current planSelected innerHTML before:', planSelected.innerHTML);
      planSelected.innerHTML = '<option value="">Select Plan</option>' + 
        plansCache.map(plan => `<option value="${plan.name}">${plan.name} - ₹${plan.price}/month</option>`).join('');
      console.log('[AddMember] Plan dropdown populated with', plansCache.length, 'options');
      console.log('[AddMember] Current planSelected innerHTML after:', planSelected.innerHTML);
    } else {
      console.warn('[AddMember] Plan dropdown not populated:', {
        planSelected: !!planSelected,
        plansCache: plansCache.length,
        planSelectedElement: planSelected
      });
    }
    
    // Reattach event listeners after modal is opened and populated
    setTimeout(() => {
      attachPaymentListeners();
      attachImageUploadListeners();
      console.log('[AddMember] All listeners reattached after modal open');
    }, 100);
    
    console.log('[AddMember] Modal opened and reset');
  }

  // Close modal
  function closeAddMemberModalFunc() {
    if (addMemberModal) addMemberModal.style.display = 'none';
    console.log('[AddMember] Modal closed');
  }

  // Button event listeners
  if (addMemberBtn) {
    addMemberBtn.addEventListener('click', function(e) {
      e.preventDefault();
      console.log('[AddMember] Dashboard button clicked');
      openAddMemberModal();
    });
  }
  
  if (addMemberBtnTab) {
    addMemberBtnTab.addEventListener('click', function(e) {
      e.preventDefault();
      console.log('[AddMember] Tab button clicked');
      openAddMemberModal();
    });
  }

  // Payment calculation listeners - attach directly without DOM replacement
  function attachPaymentListeners() {
    console.log('[AddMember] Attaching payment calculation listeners...');
    
    // Get current DOM references
    const currentPlanSelected = document.getElementById('planSelected');
    const currentMonthlyPlan = document.getElementById('monthlyPlan');
    
    if (currentPlanSelected) {
      // Remove any existing listeners by removing and re-adding the event listener
      currentPlanSelected.removeEventListener('change', handlePlanChange);
      currentPlanSelected.addEventListener('change', handlePlanChange);
      console.log('[AddMember] Plan select listener attached');
    } else {
      console.warn('[AddMember] Plan select element not found!');
    }
    
    if (currentMonthlyPlan) {
      // Remove any existing listeners by removing and re-adding the event listener
      currentMonthlyPlan.removeEventListener('change', handleMonthChange);
      currentMonthlyPlan.addEventListener('change', handleMonthChange);
      console.log('[AddMember] Monthly plan listener attached');
    } else {
      console.warn('[AddMember] Monthly plan select element not found!');
    }
  }

  // Event handler functions
  function handlePlanChange(event) {
    console.log('[AddMember] Plan changed to:', event.target.value);
    updatePaymentAmountAndDiscount();
  }

  function handleMonthChange(event) {
    console.log('[AddMember] Duration changed to:', event.target.value);
    updatePaymentAmountAndDiscount();
  }

  // Initial attachment
  attachPaymentListeners();

  // Modal close listeners
  if (closeAddMemberModal) {
    closeAddMemberModal.addEventListener('click', closeAddMemberModalFunc);
  }
  
  if (addMemberModal) {
    addMemberModal.addEventListener('mousedown', function(e) {
      if (e.target === addMemberModal) closeAddMemberModalFunc();
    });
  }

  // Image upload functionality - use direct event listeners
  function attachImageUploadListeners() {
    console.log('[AddMember] Attaching image upload listeners...');
    
    const currentUploadBtn = document.getElementById('uploadMemberImageBtn');
    const currentFileInput = document.getElementById('memberProfileImage');
    
    if (currentUploadBtn && currentFileInput) {
      // Remove existing listeners
      currentUploadBtn.removeEventListener('click', handleUploadBtnClick);
      currentUploadBtn.addEventListener('click', handleUploadBtnClick);
      console.log('[AddMember] Upload button listener attached');
    } else {
      console.warn('[AddMember] Image upload button or input not found:', {
        uploadMemberImageBtn: !!currentUploadBtn,
        memberProfileImageInput: !!currentFileInput
      });
    }

    if (currentFileInput) {
      currentFileInput.removeEventListener('change', handleFileInputChange);
      currentFileInput.addEventListener('change', handleFileInputChange);
      console.log('[AddMember] File input listener attached');
    }
  }

  // Event handler functions for image upload
  function handleUploadBtnClick(e) {
    e.preventDefault();
    e.stopPropagation();
    console.log('[AddMember] Image upload button clicked');
    const fileInput = document.getElementById('memberProfileImage');
    if (fileInput) {
      fileInput.click();
      console.log('[AddMember] File dialog triggered');
    } else {
      console.error('[AddMember] File input not found when button clicked');
    }
  }

  function handleFileInputChange(e) {
    console.log('[AddMember] Image file selected');
    const file = e.target.files[0];
    const imageTag = document.getElementById('memberImageTag');
    
    if (file && imageTag) {
      console.log('[AddMember] Processing image file:', file.name);
      const reader = new FileReader();
      reader.onload = function(evt) {
        imageTag.src = evt.target.result;
        console.log('[AddMember] Image preview updated');
      };
      reader.readAsDataURL(file);
    } else if (imageTag) {
      imageTag.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iOTYiIGhlaWdodD0iOTYiIHZpZXdCb3g9IjAgMCA5NiA5NiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9Ijk2IiBoZWlnaHQ9Ijk2IiBmaWxsPSIjRjVGNUY1Ii8+CjxwYXRoIGQ9Ik00OCA2NEM1Ni44MzY2IDY0IDY0IDU2LjgzNjYgNjQgNDhDNjQgMzkuMTYzNCA1Ni44MzY2IDMyIDQ4IDMyQzM5LjE2MzQgMzIgMzIgMzkuMTYzNCAzMiA0OEMzMiA1Ni44MzY2IDM5LjE2MzQgNjQgNDggNjRaIiBmaWxsPSIjQ0NDQ0NDIi8+CjxwYXRoIGQ9Ik0yNCA3Nkg3MlY4MEgyNFY3NloiIGZpbGw9IiNDQ0NDQ0MiLz4KPHRleHQgeD0iNDgiIHk9Ijg4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTAiIGZpbGw9IiM5OTk5OTkiPlBob3RvPC90ZXh0Pgo8L3N2Zz4K';
      console.log('[AddMember] Image cleared');
    }
  }

  // Initial attachment
  attachImageUploadListeners();

  // Form submission
  if (addMemberForm) {
    // Mark form as having enhanced handler for notification integration detection
    addMemberForm._hasEnhancedHandler = true;
    
    addMemberForm.onsubmit = async function(e) {
      e.preventDefault();
      console.log('[AddMember] Form submitted');
      let token = await waitForToken('gymAdminToken', 10, 100);
      if (!token) {
        const alternativeTokens = ['token', 'authToken', 'gymAuthToken'];
        for (const tokenName of alternativeTokens) {
          token = localStorage.getItem(tokenName);
          if (token) {
            console.log(`[AddMember] Using alternative token: ${tokenName}`);
            break;
          }
        }
        if (!token) {
          alert('You must be logged in as a gym admin.');
          return;
        }
      }
      const formData = prepareMemberFormData(addMemberForm);
      const { gymName, plan, monthlyPlan, memberEmail, memberName, membershipId, validDate } = getMemberFormMeta(formData);
      // Debug: Log all the form data being sent
      console.log('[AddMember] Form submission data:', {
        gymName,
        plan,
        monthlyPlan,
        memberEmail,
        memberName,
        membershipId,
        validDate
      });
      // Debug: Log FormData contents
      console.log('[AddMember] FormData contents:');
      for (let [key, value] of formData.entries()) {
        console.log(`[AddMember] ${key}:`, value);
      }
      try {
        const res = await fetch('http://localhost:5000/api/members', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        });
        console.log('[AddMember] Backend response status:', res.status);
        const data = await res.json();
        console.log('[AddMember] Backend response data:', data);
        
        // Handle successful response
        if (res.ok && (data.success || data.message === 'Member added successfully')) {
          console.log('[AddMember] Member added successfully');
          sendMembershipEmail({ token, memberEmail, memberName, membershipId, plan, monthlyPlan, validDate, gymName });
          showAddMemberSuccess(membershipId, addMemberForm, memberImageTag, closeAddMemberModalFunc, memberName);
        } 
        // Handle duplicate member error with "Add Anyway" option
        else if (data && data.code === 'DUPLICATE_MEMBER') {
          console.log('[AddMember] Duplicate member detected, showing confirmation dialog');
          showDialog({
            title: '⚠️ Duplicate Member Detected',
            message: `A member with this email or phone number already exists in the system.\n\n🔍 <b>Details:</b>\n• Email: ${memberEmail}\n• Phone: ${formData.get('memberPhone') || 'Not provided'}\n\n👨‍👩‍👧‍👦 If this is a family member or the person already has a different membership, you can still add them.`,
            confirmText: 'Add Anyway',
            cancelText: 'Cancel',
            iconHtml: '<i class="fas fa-user-friends" style="color:#ff9800;font-size:2.5em;"></i>',
            onConfirm: async function() {
              console.log('[AddMember] User chose to add duplicate member anyway');
              // Try again with forceAdd flag
              formData.set('forceAdd', 'true');
              try {
                const forceRes = await fetch('http://localhost:5000/api/members', {
                  method: 'POST',
                  headers: { 'Authorization': `Bearer ${token}` },
                  body: formData
                });
                const forceData = await forceRes.json();
                console.log('[AddMember] Force add response:', forceData);
                
                if (forceRes.ok && (forceData.success || forceData.message === 'Member added successfully')) {
                  console.log('[AddMember] Force add successful');
                  sendMembershipEmail({ token, memberEmail, memberName, membershipId, plan, monthlyPlan, validDate, gymName });
                  showAddMemberSuccess(membershipId, addMemberForm, memberImageTag, closeAddMemberModalFunc, memberName);
                } else {
                  console.error('[AddMember] Force add failed:', forceData);
                  showDialog({
                    title: 'Error Adding Member',
                    message: forceData.message || forceData.error || 'Failed to add member even with force option.',
                    confirmText: 'OK',
                    iconHtml: '<i class="fas fa-exclamation-triangle" style="color:#e53935;font-size:2.2em;"></i>'
                  });
                }
              } catch (err) {
                console.error('[AddMember] Force add exception:', err);
                showDialog({
                  title: 'Connection Error',
                  message: 'Unable to connect to server. Please check your connection and try again.',
                  confirmText: 'OK',
                  iconHtml: '<i class="fas fa-wifi" style="color:#e53935;font-size:2.2em;"></i>'
                });
              }
            }
          });
        } 
        // Handle other backend errors
        else if (!res.ok || (data && (data.message || data.error))) {
          console.error('[AddMember] Backend error:', { status: res.status, data });
          const errorMessage = data.message || data.error || `Server responded with status ${res.status}`;
          showDialog({
            title: 'Error Adding Member',
            message: errorMessage,
            confirmText: 'OK',
            iconHtml: '<i class="fas fa-exclamation-triangle" style="color:#e53935;font-size:2.2em;"></i>'
          });
        } 
        // Fallback for unexpected responses
        else {
          console.error('[AddMember] Unexpected response format:', data);
          showDialog({
            title: 'Unexpected Error',
            message: 'An unexpected error occurred while adding the member. Please try again.',
            confirmText: 'OK',
            iconHtml: '<i class="fas fa-question-circle" style="color:#e53935;font-size:2.2em;"></i>'
          });
        }
      } catch (err) {
        console.error('[AddMember] Network or parsing error:', err);
        // Handle network errors or JSON parsing errors
        showDialog({
          title: 'Connection Error',
          message: 'Unable to connect to the server. Please check your internet connection and try again.',
          confirmText: 'OK',
          iconHtml: '<i class="fas fa-wifi" style="color:#e53935;font-size:2.2em;"></i>'
        });
      }
    };

    function prepareMemberFormData(form) {
      const formData = new FormData(form);
      const addressInput = document.getElementById('memberAddress');
      if (addressInput?.value) {
        formData.set('address', addressInput.value);
      }
      return formData;
    }

    function getMemberFormMeta(formData) {
      // Debug gym profile
      
      const gymName = (window.currentGymProfile && (window.currentGymProfile.gymName || window.currentGymProfile.name)) ? (window.currentGymProfile.gymName || window.currentGymProfile.name) : 'GYM';
      const plan = formData.get('planSelected') || 'PLAN';
      const monthlyPlan = formData.get('monthlyPlan') || '';
      const memberEmail = formData.get('memberEmail') || '';
      const memberName = formData.get('memberName') || '';
      
      
      const now = new Date();
      const ym = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}`;
      const random = Math.random().toString(36).substring(2, 8).toUpperCase();
      const gymShort = gymName.replace(/[^A-Za-z0-9]/g, '').substring(0,6).toUpperCase();
      const planShort = plan.replace(/[^A-Za-z0-9]/g, '').substring(0,6).toUpperCase();
      const membershipId = `${gymShort}-${ym}-${planShort}-${random}`;
      
      
      formData.append('membershipId', membershipId);
      let validDate = '';
      let months = 1;
      if (/3\s*Months?/i.test(monthlyPlan)) months = 3;
      else if (/6\s*Months?/i.test(monthlyPlan)) months = 6;
      else if (/12\s*Months?/i.test(monthlyPlan)) months = 12;
      const validUntil = new Date(now);
      validUntil.setMonth(validUntil.getMonth() + months);
      validDate = validUntil.toISOString().split('T')[0];
      formData.append('membershipValidUntil', validDate);
      
      
      return { gymName, plan, monthlyPlan, memberEmail, memberName, membershipId, validDate };
    }

    function sendMembershipEmail({ token, memberEmail, memberName, membershipId, plan, monthlyPlan, validDate, gymName }) {
      
      fetch('http://localhost:5000/api/members/send-membership-email', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: memberEmail,
          memberName,
          membershipId,
          plan,
          monthlyPlan,
          validUntil: validDate,
          gymName
        })
      })
      .then(response => {
        return response.json();
      })
      .then(data => {
        if (data.success) {
        } else {
          console.error('[AddMember] Email sending failed:', data.message);
        }
      })
      .catch((err) => {
        console.error('[AddMember] Email sending error:', err);
      });
    }

    function showAddMemberSuccess(membershipId, form, imgTag, closeModalFunc, memberName) {
      showDialog({
        title: '✅ Member Added Successfully!',
        message: `Member <b>${memberName || 'Unknown'}</b> has been added successfully!<br><br>📋 <b>Membership ID:</b> ${membershipId}<br><br>📧 A welcome email with membership details has been sent to the member.`,
        confirmText: 'Got it!',
        iconHtml: '<i class="fas fa-user-check" style="color:#4caf50;font-size:2.5em;"></i>',
        onConfirm: closeModalFunc
      });
      
      // Clean up form and image
      if (form) form.reset();
      if (imgTag) imgTag.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iOTYiIGhlaWdodD0iOTYiIHZpZXdCb3g9IjAgMCA5NiA5NiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9Ijk2IiBoZWlnaHQ9Ijk2IiBmaWxsPSIjRjVGNUY1Ii8+CjxwYXRoIGQ9Ik00OCA2NEM1Ni44MzY2IDY0IDY0IDU2LjgzNjYgNjQgNDhDNjQgMzkuMTYzNCA1Ni44MzY2IDMyIDQ4IDMyQzM5LjE2MzQgMzIgMzIgMzkuMTYzNCAzMiA0OEMzMiA1Ni44MzY2IDM5LjE2MzQgNjQgNDggNjRaIiBmaWxsPSIjQ0NDQ0NDIi8+CjxwYXRoIGQ9Ik0yNCA3Nkg3MlY4MEgyNFY3NloiIGZpbGw9IiNDQ0NDQ0MiLz4KPHRleHQgeD0iNDgiIHk9Ijg4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTAiIGZpbGw9IiM5OTk5OTkiPlBob3RvPC90ZXh0Pgo8L3N2Zz4K';
    }

    // Remove legacy error message display (all errors now use dialog)
    function showAddMemberError() {}
  }
  
  console.log('[AddMember] Modal initialization complete');

  // Debug functions for testing dialog scenarios:
  // Use browser console: testDialogs.testSuccess(), testDialogs.testDuplicate(), etc.
  window.testDialogs = {
    testSuccess: () => showDialog({
      title: '✅ Member Added Successfully!',
      message: 'Member John Doe has been added!\nMembership ID: GYM-202501-BASIC-ABC123',
      confirmText: 'Got it!',
      iconHtml: '<i class="fas fa-user-check" style="color:#4caf50;font-size:2.5em;"></i>'
    }),
    testDuplicate: () => showDialog({
      title: '⚠️ Duplicate Member Detected',
      message: 'A member with this email already exists.\nAdd anyway?',
      confirmText: 'Add Anyway',
      cancelText: 'Cancel',
      iconHtml: '<i class="fas fa-user-friends" style="color:#ff9800;font-size:2.5em;"></i>'
    }),
    testError: () => showDialog({
      title: 'Error Adding Member',
      message: 'Failed to add member. Please try again.',
      confirmText: 'OK',
      iconHtml: '<i class="fas fa-exclamation-triangle" style="color:#e53935;font-size:2.2em;"></i>'
    })
  };

  // Add debugging function to check available tokens
  window.debugTokens = function() {
    console.log('[DEBUG] Available localStorage tokens:');
    const tokenKeys = ['gymAdminToken', 'token', 'authToken', 'gymAuthToken'];
    tokenKeys.forEach(key => {
      const value = localStorage.getItem(key);
      console.log(`[DEBUG] ${key}:`, value ? `${value.substring(0, 20)}...` : 'null');
    });
    
    console.log('[DEBUG] All localStorage keys:');
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const value = localStorage.getItem(key);
      console.log(`[DEBUG] ${key}:`, typeof value === 'string' && value.length > 50 ? `${value.substring(0, 20)}...` : value);
    }
  };

  // Add global test function for debugging
  window.testAddMemberPayment = function() {
    console.log('[TEST] Testing payment calculation...');
    
    // Get fresh DOM references (not cached ones)
    const planSelect = document.getElementById('planSelected');
    const monthSelect = document.getElementById('monthlyPlan');
    const paymentField = document.getElementById('paymentAmount');
    
    console.log('[TEST] Elements found:', {
      planSelected: !!planSelect,
      monthlyPlan: !!monthSelect,
      paymentAmount: !!paymentField
    });
    
    if (planSelect && monthSelect && paymentField) {
      console.log('[TEST] Current values before setting:', {
        plan: planSelect.value,
        month: monthSelect.value,
        payment: paymentField.value
      });
      
      console.log('[TEST] Available month options:');
      Array.from(monthSelect.options).forEach(option => {
        console.log(`[TEST]   - "${option.value}": ${option.text}`);
      });
      
      console.log('[TEST] Setting test values...');
      planSelect.value = 'Basic';
      monthSelect.value = '6 Months'; // Fixed: Use correct option value with 's'
      
      console.log('[TEST] Values after setting:', {
        plan: planSelect.value,
        month: monthSelect.value,
        payment: paymentField.value
      });
      
      console.log('[TEST] Triggering change events...');
      planSelect.dispatchEvent(new Event('change', { bubbles: true }));
      monthSelect.dispatchEvent(new Event('change', { bubbles: true }));
      
      console.log('[TEST] Final payment amount:', paymentField.value);
    }
    
    console.log('[TEST] plansCache:', plansCache);
    
    // Also call the update function directly
    console.log('[TEST] Calling updatePaymentAmountAndDiscount directly...');
    updatePaymentAmountAndDiscount();
  };

  // Add test function to debug plan fetching
  window.testPlanFetching = async function() {
    console.log('[TEST] Testing plan fetching process...');
    
    // Debug tokens
    window.debugTokens();
    
    // Test fetchPlansForModal
    console.log('[TEST] Calling fetchPlansForModal...');
    await fetchPlansForModal();
    
    console.log('[TEST] Plans cache after fetch:', plansCache);
    console.log('[TEST] Plans cache length:', plansCache.length);
    
    if (plansCache.length > 0) {
      console.log('[TEST] First plan details:', plansCache[0]);
    }
    
    // Test manual API call
    console.log('[TEST] Testing manual API call...');
    const token = localStorage.getItem('gymAdminToken');
    if (token) {
      try {
        const response = await fetch('http://localhost:5000/api/gyms/membership-plans', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('[TEST] API Response status:', response.status);
        const data = await response.json();
        console.log('[TEST] API Response data:', data);
        
      } catch (error) {
        console.error('[TEST] API call error:', error);
      }
    } else {
      console.log('[TEST] No gymAdminToken found');
    }
  };

  window.testImageUpload = function() {
    console.log('[TEST] Testing image upload...');
    const uploadBtn = document.getElementById('uploadMemberImageBtn');
    const fileInput = document.getElementById('memberProfileImage');
    
    console.log('[TEST] Elements found:', {
      uploadMemberImageBtn: !!uploadBtn,
      memberProfileImage: !!fileInput
    });
    
    console.log('[TEST] Button element details:', uploadBtn);
    console.log('[TEST] File input element details:', fileInput);
    
    if (uploadBtn) {
      console.log('[TEST] Triggering click on upload button');
      
      // Try clicking directly
      uploadBtn.click();
      
      // Also try triggering a click event
      console.log('[TEST] Also dispatching click event...');
      uploadBtn.dispatchEvent(new Event('click', { bubbles: true }));
      
    } else {
      console.log('[TEST] Upload button not found');
    }
  };

  // Add function to test authentication
  window.testAuthentication = async function() {
    console.log('[TEST] Testing authentication...');
    window.debugTokens();
    
    console.log('[TEST] Testing waitForToken...');
    const token = await waitForToken('gymAdminToken', 5, 100);
    console.log('[TEST] waitForToken result:', token ? `${token.substring(0, 20)}...` : 'null');
    
    console.log('[TEST] Testing API call...');
    await fetchPlansForModal();
    console.log('[TEST] Plans cache after fetch:', plansCache);
  };

  // Add test function to simulate opening the modal
  window.testOpenModal = async function() {
    
    await openAddMemberModal();
    
    const planSelect = document.getElementById('planSelected');
    if (planSelect) {
      Array.from(planSelect.options).forEach(option => {
      });
    }
  };

  // Add test function to check if event listeners are working
  window.testEventListeners = function() {
    console.log('[TEST] Testing if event listeners are working...');
    
    const planSelect = document.getElementById('planSelected');
    const monthSelect = document.getElementById('monthlyPlan');
    const paymentField = document.getElementById('paymentAmount');
    
    if (!planSelect || !monthSelect || !paymentField) {
      console.log('[TEST] Elements not found - make sure modal is open');
      return;
    }
    
    console.log('[TEST] Simulating user selections...');
    
    // Clear payment first
    paymentField.value = '';
    
    // Simulate user selecting Basic plan
    planSelect.value = 'Basic';
    planSelect.dispatchEvent(new Event('change', { bubbles: true }));
    
    // Wait a moment, then select duration
    setTimeout(() => {
      monthSelect.value = '6 Months';
      monthSelect.dispatchEvent(new Event('change', { bubbles: true }));
      
      // Check result after another moment
      setTimeout(() => {
        console.log('[TEST] Final payment amount after UI simulation:', paymentField.value);
        console.log('[TEST] Expected: 2850 (Basic ₹500 × 6 months - 5% discount)');
      }, 200);
    }, 200);
  };
});
            let currentGymProfile = {}; // Store fetched profile data

            async function fetchAndUpdateAdminProfile() {
        console.log('🚀 Starting admin profile fetch process');
        logLocalStorageItems();
        
        // Increase retries to 50 (5 seconds) to avoid race condition after login redirect
        const token = await waitForToken('gymAdminToken', 50, 100);
        const adminNameElement = document.getElementById('adminName');
        const adminAvatarElement = document.getElementById('adminAvatar');
        setDefaultAdminProfile(adminNameElement, adminAvatarElement);
    
        if (!token) {
            console.error('❌ No token found after waiting. Redirecting to login.');
            handleMissingToken();
            return;
        }
        
        console.log('✅ Token found, proceeding with profile fetch');
    
        try {
            const responseData = await fetchAdminProfile(token);
            if (!responseData.ok) {
                console.error('❌ Profile fetch failed with response:', responseData);
                handleProfileFetchError(responseData, adminNameElement, adminAvatarElement);
                return;
            }
            
            console.log('✅ Profile fetch successful, updating UI');
            currentGymProfile = responseData.data;
            updateAdminProfileUI(adminNameElement, adminAvatarElement, responseData.data);
        } catch (error) {
            console.error('❌ Exception during profile fetch:', error);
            handleProfileFetchException(error, adminNameElement, adminAvatarElement);
        }
    }
    
    function logLocalStorageItems() {
        console.log('🔍 Detailed localStorage inspection:');
        console.log('📊 Total localStorage keys:', localStorage.length);
        console.log('🌐 Current origin:', window.location.origin);
        console.log('🌐 Current pathname:', window.location.pathname);
        
        const allItems = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            const value = localStorage.getItem(key);
            allItems.push({
                key,
                value: value?.substring(0, 30) + '...',
                length: value?.length || 0,
                fullValue: value // Only for debugging - remove in production
            });
        }
        
        console.log('📦 All localStorage items:', allItems);
        
        // Specifically check for our target token
        const targetToken = localStorage.getItem('gymAdminToken');
        console.log('🎯 Target token (gymAdminToken):', {
            exists: !!targetToken,
            value: targetToken ? targetToken.substring(0, 30) + '...' : null,
            length: targetToken?.length || 0
        });
        
        // Check for any token-like keys
        const tokenKeys = Object.keys(localStorage).filter(key => 
            key.toLowerCase().includes('token') || key.toLowerCase().includes('auth')
        );
        console.log('🔐 Token-like keys found:', tokenKeys);
    }
    
    async function waitForToken(tokenKey, maxTries, delayMs) {
        console.log(`🔍 Waiting for token '${tokenKey}' (max ${maxTries} tries, ${delayMs}ms intervals)`);
        
        let token = null;
        let tries = 0;
        
        // Function to check multiple storage locations
        function checkAllStorageLocations() {
            // First check URL parameters
            const urlParams = new URLSearchParams(window.location.search);
            const urlToken = urlParams.get('token');
            if (urlToken) {
                console.log('🔗 Token found in URL parameters');
                // Store it in localStorage for future use
                localStorage.setItem(tokenKey, urlToken);
                // Clean the URL
                window.history.replaceState({}, document.title, window.location.pathname);
                return { location: 'URL parameters', token: urlToken };
            }
            
            // Check localStorage
            let found = localStorage.getItem(tokenKey);
            if (found) return { location: 'localStorage', token: found };
            
            // Check sessionStorage
            found = sessionStorage.getItem(tokenKey);
            if (found) return { location: 'sessionStorage', token: found };
            
            // Check alternative key names
            const altKeys = ['authToken', 'token', 'gymAuthToken', 'adminToken'];
            for (const altKey of altKeys) {
                found = localStorage.getItem(altKey);
                if (found) return { location: `localStorage[${altKey}]`, token: found };
                
                found = sessionStorage.getItem(altKey);
                if (found) return { location: `sessionStorage[${altKey}]`, token: found };
            }
            
            return null;
        }
        
        while (!token && tries < maxTries) {
            const result = checkAllStorageLocations();
            if (result) {
                token = result.token;
                console.log(`✅ Token found in ${result.location} after ${tries} attempts`);
                // If found in alternative location, also store it in the expected location
                if (result.location !== 'localStorage') {
                    localStorage.setItem(tokenKey, token);
                    console.log(`📝 Token copied to localStorage[${tokenKey}]`);
                }
                break;
            }
            
            await new Promise(res => setTimeout(res, delayMs));
            tries++;
            console.log(`🔄 Token check attempt ${tries}/${maxTries} - Token found: false`);
            
            // Log all storage contents for debugging every 10th attempt
            if (tries % 10 === 0) {
                console.log('Current localStorage state:', Object.keys(localStorage).map(key => ({
                    key, 
                    value: localStorage.getItem(key)?.substring(0, 20) + '...'
                })));
                console.log('Current sessionStorage state:', Object.keys(sessionStorage).map(key => ({
                    key, 
                    value: sessionStorage.getItem(key)?.substring(0, 20) + '...'
                })));
            }
        }
        
        if (token) {
            console.log(`✅ Token '${tokenKey}' found after ${tries} attempts`);
        } else {
            console.log(`❌ Token '${tokenKey}' not found after ${maxTries} attempts`);
        }
        
        return token;
    }
    
    function setDefaultAdminProfile(adminNameElement, adminAvatarElement) {
        if (adminNameElement) adminNameElement.textContent = 'Gym Admin';
        if (adminAvatarElement) adminAvatarElement.src = 'https://via.placeholder.com/40';
    }
    
    function handleMissingToken() {
        console.error("No authentication token found after retry. Redirecting to login.");
        window.location.replace('http://localhost:5000/public/admin-login.html');
    }
    
    async function fetchAdminProfile(token) {
        console.group('Admin Profile Fetch');
        console.log('Fetching admin profile');
        console.log('Token retrieval:', {
            gymAuthToken: !!localStorage.getItem('gymAuthToken'),
            token: !!localStorage.getItem('token'),
            authToken: !!localStorage.getItem('authToken')
        });
        console.log('Sending profile request to:', 'http://localhost:5000/api/gyms/profile/me');
        const response = await fetch('http://localhost:5000/api/gyms/profile/me', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        console.log('Profile fetch response status:', response.status);
        const data = await response.json();
        console.log('Profile fetch response data:', data);
        console.groupEnd();
        return { ok: response.ok, status: response.status, statusText: response.statusText, data, raw: response };
    }
    
    function handleProfileFetchError(responseData, adminNameElement, adminAvatarElement) {
        console.error(`Error fetching profile: ${responseData.status} ${responseData.statusText}`);
        console.error('Detailed server response:', responseData.data);
        if (responseData.status === 401 || responseData.status === 403) {
            console.error('Unauthorized access. Clearing tokens.');
            localStorage.removeItem('gymAdminToken');
            window.location.replace('http://localhost:5000/public/admin-login.html');
        } else {
            throw new Error(responseData.data.message || 'Failed to fetch profile');
        }
    }
    
    function updateAdminProfileUI(adminNameElement, adminAvatarElement, profile) {
        // Store the complete profile data globally
        currentGymProfile = profile;
        window.currentGymProfile = profile; // Also set on window for global access
        
        if (adminNameElement) {
            adminNameElement.textContent = profile.gymName || profile.name || 'Gym Admin';
            console.log('Updated admin name:', adminNameElement.textContent);
        }
        if (adminAvatarElement) {
            let logoUrl = profile.logoUrl || profile.logo || profile.logoURL || profile.logo_path || '';
            
            // Debug: Log the raw logoUrl value
            console.log('[DEBUG] Raw logoUrl from gym profile:', logoUrl);
            console.log('[DEBUG] Profile object keys:', Object.keys(profile));
            
            if (logoUrl && !logoUrl.startsWith('http')) {
                if (logoUrl.startsWith('/')) {
                    logoUrl = `http://localhost:5000${logoUrl}`;
                } else {
                    logoUrl = `http://localhost:5000/${logoUrl}`;
                }
            }
            
            if (!logoUrl) logoUrl = `http://localhost:5000/uploads/images/default-logo.png`;
            
            console.log('[DEBUG] Final processed logoUrl:', logoUrl);
            
            // Auto-fix logo path if it's using wrong directory
            if (logoUrl && logoUrl.includes('/uploads/gymImages/')) {
                const filename = logoUrl.split('/').pop();
                const altUrl = `http://localhost:5000/uploads/gymPhotos/${filename}`;
                console.log('[DEBUG] Auto-correcting logo path from gymImages to gymPhotos:', altUrl);
                logoUrl = altUrl;
            }
            
            console.log('[DEBUG] Final corrected logoUrl:', logoUrl);
            
            adminAvatarElement.src = logoUrl;
            adminAvatarElement.onerror = function() {
                console.log('[ERROR] Failed to load logo:', logoUrl);
                console.log('[ERROR] Using default logo fallback');
                this.onerror = null; // Prevent infinite loop
                this.src = 'http://localhost:5000/uploads/images/default-logo.png';
            };
            adminAvatarElement.onload = function() {
                console.log('[SUCCESS] Logo loaded successfully:', logoUrl);
            };
            console.log('Updated admin logo:', logoUrl);
        }
        
        // Debug log to check profile structure
        console.log('Complete profile data stored:', profile);
        console.log('Profile location:', profile.location);
        console.log('Profile activities:', profile.activities);
        
        // Update gym information section
        updateGymInformationSection(profile);
    }

    // Function to update gym information section with profile data
    function updateGymInformationSection(profile) {
        console.log('Updating gym information section with profile:', profile);
        
        // Basic Information
        const gymInfoName = document.getElementById('gymInfoName');
        const gymInfoOwner = document.getElementById('gymInfoOwner');
        const gymInfoEmail = document.getElementById('gymInfoEmail');
        const gymInfoPhone = document.getElementById('gymInfoPhone');
        const gymInfoSupportEmail = document.getElementById('gymInfoSupportEmail');
        const gymInfoSupportPhone = document.getElementById('gymInfoSupportPhone');
        
        if (gymInfoName) gymInfoName.textContent = profile.gymName || 'N/A';
        if (gymInfoOwner) gymInfoOwner.textContent = profile.contactPerson || 'N/A';
        if (gymInfoEmail) gymInfoEmail.textContent = profile.email || 'N/A';
        if (gymInfoPhone) gymInfoPhone.textContent = profile.phone || 'N/A';
        if (gymInfoSupportEmail) gymInfoSupportEmail.textContent = profile.supportEmail || 'N/A';
        if (gymInfoSupportPhone) gymInfoSupportPhone.textContent = profile.supportPhone || 'N/A';
        
        // Location Information
        const gymInfoAddress = document.getElementById('gymInfoAddress');
        const gymInfoCity = document.getElementById('gymInfoCity');
        const gymInfoState = document.getElementById('gymInfoState');
        const gymInfoPincode = document.getElementById('gymInfoPincode');
        const gymInfoLandmark = document.getElementById('gymInfoLandmark');
        
        if (gymInfoAddress) gymInfoAddress.textContent = profile.location?.address || 'N/A';
        if (gymInfoCity) gymInfoCity.textContent = profile.location?.city || 'N/A';
        if (gymInfoState) gymInfoState.textContent = profile.location?.state || 'N/A';
        if (gymInfoPincode) gymInfoPincode.textContent = profile.location?.pincode || 'N/A';
        if (gymInfoLandmark) gymInfoLandmark.textContent = profile.location?.landmark || 'N/A';
        
        // Operational Information
        const gymInfoOpeningTime = document.getElementById('gymInfoOpeningTime');
        const gymInfoClosingTime = document.getElementById('gymInfoClosingTime');
        const gymInfoCurrentMembers = document.getElementById('gymInfoCurrentMembers');
        const gymInfoStatus = document.getElementById('gymInfoStatus');
        
        if (gymInfoOpeningTime) gymInfoOpeningTime.textContent = profile.openingTime || 'N/A';
        if (gymInfoClosingTime) gymInfoClosingTime.textContent = profile.closingTime || 'N/A';
        if (gymInfoCurrentMembers) gymInfoCurrentMembers.textContent = profile.membersCount || '0';
        if (gymInfoStatus) {
            gymInfoStatus.textContent = profile.status || 'Unknown';
            gymInfoStatus.className = `gym-info-value gym-status ${profile.status || ''}`;
        }
        
        // Description
        const gymInfoDescription = document.getElementById('gymInfoDescription');
        if (gymInfoDescription) {
            gymInfoDescription.textContent = profile.description || 'No description available';
        }
        
        // Equipment
        const gymInfoEquipment = document.getElementById('gymInfoEquipment');
        if (gymInfoEquipment) {
            if (Array.isArray(profile.equipment) && profile.equipment.length > 0) {
                gymInfoEquipment.innerHTML = profile.equipment.map(eq => 
                    `<span class="gym-info-equipment-item">${eq}</span>`
                ).join('');
            } else {
                gymInfoEquipment.innerHTML = '<span style="color:#888;">No equipment listed</span>';
            }
        }
        
        console.log('Gym information section updated successfully');
    }
    
    function handleProfileFetchException(error, adminNameElement, adminAvatarElement) {
        console.error('Comprehensive error fetching or updating admin profile:', error);
        if (adminNameElement) adminNameElement.textContent = 'Admin';
        if (adminAvatarElement) adminAvatarElement.src = 'https://via.placeholder.com/40';
        localStorage.removeItem('gymAdminToken');
        alert('Unable to fetch profile. Please try logging in again.');
    }

document.addEventListener('DOMContentLoaded', function () {
    const deletePhotoConfirmModal = document.getElementById('deletePhotoConfirmModal');
    const closeDeletePhotoConfirmModal = document.getElementById('closeDeletePhotoConfirmModal');
    const confirmDeletePhotoBtn = document.getElementById('confirmDeletePhotoBtn');
    const cancelDeletePhotoBtn = document.getElementById('cancelDeletePhotoBtn');
    let pendingDeletePhotoId = null;
    fetchAndUpdateAdminProfile();
    fetchGymPhotos();


    // Fetch gym photos from backend and render them in the photo grid (dashboard view, modal preview only)
    async function fetchGymPhotos() {
        const token = localStorage.getItem('gymAdminToken');
        try {
            console.log('Fetching gym photos from dedicated photos endpoint...');
            const response = await fetch('http://localhost:5000/api/gyms/photos', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) {
                throw new Error(`Failed to fetch gym photos: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();
            console.log('Fetched gym photos data:', data);
            
            // Extract photos from the response (registration photos are in the photos array)
            const photos = data.photos || [];
            console.log('Rendering', photos.length, 'gym photos');
            renderPhotoGrid(photos);
        } catch (err) {
            console.error('Error fetching gym photos:', err);
            renderPhotoGrid([]);
        }
    }

    // Render the photo grid with modal preview only (no edit/remove)
    function renderPhotoGrid(photos) {
        const photoGrid = document.getElementById('photoGrid');
        if (!photoGrid) return;
        photoGrid.innerHTML = '';
        if (!photos || !photos.length) {
            photoGrid.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#888;padding:32px 0;">No photos uploaded yet.</div>';
            return;
        }
        // Store the last photo grid for edit/remove lookup
        window._lastPhotoGrid = photos;
        photos.forEach((photo, idx) => {
            // Support both string and object with url - handle registration photo structure
            let url = typeof photo === 'string' ? photo : (photo.url || photo.path || photo.imageUrl || '');
            const title = typeof photo === 'object' ? (photo.title || '') : '';
            const description = typeof photo === 'object' ? (photo.description || '') : '';
            const category = typeof photo === 'object' ? (photo.category || '') : '';
            const id = typeof photo === 'object' ? (photo._id || photo.id || '') : '';
            
            if (!url) return;
            
            // Convert relative path to full URL if needed (registration photos use relative paths)
            if (url && !url.startsWith('http')) {
                if (url.startsWith('/')) {
                    url = `http://localhost:5000${url}`;
                } else {
                    url = `http://localhost:5000/${url}`;
                }
            }
            
            console.log(`[DEBUG] Rendering photo ${idx + 1}:`, { title, description, category, url });
            
            const card = document.createElement('div');
            card.className = 'photo-grid-item';
            card.style.position = 'relative';
            card.style.background = '#fff';
            card.style.borderRadius = '10px';
            card.style.boxShadow = '0 2px 8px #0001';
            card.style.padding = '12px';
            card.style.display = 'flex';
            card.style.flexDirection = 'column';
            card.style.alignItems = 'center';
            card.innerHTML = `
                <img src="${url}" alt="Gym Photo" style="width:100%;height:140px;object-fit:cover;border-radius:8px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.08);margin-bottom:10px;" data-photo-idx="${idx}" />
                <h3 style="margin:4px 0 2px 0;font-size:1.1em;">${title || 'Untitled'}</h3>
                <p style="margin:0 0 6px 0;color:#666;font-size:0.95em;">${description || 'No description'}</p>
                <div style="font-size:0.95em;color:#1976d2;margin-bottom:6px;">${category ? `<i class='fas fa-tag'></i> ${category}` : ''}</div>
                <div style="display:flex;gap:8px;justify-content:center;">
                    <button class="edit-photo-btn" data-photo-id="${id}" style="padding:4px 10px;border:none;background:#1976d2;color:#fff;border-radius:4px;cursor:pointer;">Edit</button>
                    <button class="remove-photo-btn" data-photo-id="${id}" style="padding:4px 10px;border:none;background:#e53935;color:#fff;border-radius:4px;cursor:pointer;">Remove</button>
                </div>
            `;
            // Click to open modal preview
            card.querySelector('img').addEventListener('click', function() {
                showPhotoModal(url);
            });
            photoGrid.appendChild(card);
        });
    }

    // Modal preview for photo
    function showPhotoModal(url) {
        // Remove any existing modal
        let modal = document.getElementById('photoPreviewModal');
        if (modal) modal.remove();
        modal = document.createElement('div');
        modal.id = 'photoPreviewModal';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100vw';
        modal.style.height = '100vh';
        modal.style.background = 'rgba(0,0,0,0.7)';
        modal.style.display = 'flex';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        modal.style.zIndex = '10010';
        modal.innerHTML = `
            <div style="background:#fff;padding:18px 18px 10px 18px;border-radius:12px;max-width:90vw;max-height:90vh;box-shadow:0 4px 32px rgba(0,0,0,0.18);position:relative;display:flex;flex-direction:column;align-items:center;">
                <button id="closePhotoPreviewModal" style="position:absolute;top:8px;right:12px;font-size:2rem;background:none;border:none;color:#333;cursor:pointer;">&times;</button>
                <img src="${url}" alt="Gym Photo" style="max-width:80vw;max-height:70vh;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.12);margin-bottom:8px;" />
            </div>
        `;
        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';
        document.getElementById('closePhotoPreviewModal').onclick = function() {
            modal.remove();
            document.body.style.overflow = '';
        };
        // Also close on click outside modal-content
        modal.addEventListener('mousedown', function(e) {
            if (e.target === modal) {
                modal.remove();
                document.body.style.overflow = '';
            }
        });
    }

    function handlePhotoGridClick(e) {
        if (e.target.classList.contains('edit-photo-btn')) {
            handleEditPhotoBtn(e.target);
        } else if (e.target.classList.contains('remove-photo-btn')) {
            handleRemovePhotoBtn(e.target);
        }
    }

    function handleEditPhotoBtn(target) {
        const photoId = target.getAttribute('data-photo-id');
        const photo = (window._lastPhotoGrid || []).find(p => (p._id || p.id) === photoId);
        if (!photo) return alert('Photo not found.');
        document.getElementById('editPhotoId').value = photoId;
        document.getElementById('editPhotoTitle').value = photo.title || '';
        document.getElementById('editPhotoDescription').value = photo.description || '';
        document.getElementById('editPhotoFile').value = '';
        document.getElementById('editPhotoPreview').innerHTML = photo.imageUrl ? `<img src="${photo.imageUrl}" style="max-width:180px;max-height:120px;border-radius:6px;">` : '';
        document.getElementById('editPhotoModal').style.display = 'flex';
    }

    function handleRemovePhotoBtn(target) {
        const photoId = target.getAttribute('data-photo-id');
        if (!photoId) return alert('Photo ID missing.');
        pendingDeletePhotoId = photoId;
        deletePhotoConfirmModal.style.display = 'flex';
    }

    function wireModalCloseButtons() {
        document.getElementById('closeEditPhotoModal').onclick = document.getElementById('cancelEditPhotoBtn').onclick = function() {
            document.getElementById('editPhotoModal').style.display = 'none';
        };
        if (closeDeletePhotoConfirmModal) {
            closeDeletePhotoConfirmModal.onclick = () => {
                deletePhotoConfirmModal.style.display = 'none';
                pendingDeletePhotoId = null;
            };
        }
        if (cancelDeletePhotoBtn) {
            cancelDeletePhotoBtn.onclick = () => {
                deletePhotoConfirmModal.style.display = 'none';
                pendingDeletePhotoId = null;
            };
        }
        if (confirmDeletePhotoBtn) {
            confirmDeletePhotoBtn.onclick = async () => {
                if (!pendingDeletePhotoId) return;
                const token = localStorage.getItem('gymAdminToken');
                try {
                    const res = await fetch(`http://localhost:5000/api/gyms/photos/${pendingDeletePhotoId}`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    const data = await res.json();
                    if (res.ok && data.success) {
                        alert('Photo removed successfully!');
                        fetchGymPhotos();
                    } else {
                        alert(data.message || 'Failed to remove photo');
                    }
                } catch (err) {
                    alert('Network error while removing photo');
                }
                deletePhotoConfirmModal.style.display = 'none';
                pendingDeletePhotoId = null;
            };
        }
    }

    function wirePhotoFilePreview() {
        document.getElementById('editPhotoFile').addEventListener('change', function(e) {
            const file = e.target.files[0];
            const preview = document.getElementById('editPhotoPreview');
            if (file) {
                const reader = new FileReader();
                reader.onload = function(evt) {
                    if (evt.target && typeof evt.target.result === 'string') {
                        preview.innerHTML = `<img src="${evt.target.result}" style="max-width:180px;max-height:120px;border-radius:6px;">`;
                    } else {
                        preview.innerHTML = '';
                    }
                };
                reader.readAsDataURL(file);
            } else {
                preview.innerHTML = '';
            }
        });
    }

    function wireEditPhotoForm() {
        document.getElementById('editPhotoForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            const token = localStorage.getItem('gymAdminToken');
            const photoId = document.getElementById('editPhotoId').value;
            if (!photoId) {
                alert('Photo ID missing. Cannot update.');
                return;
            }
            const title = document.getElementById('editPhotoTitle').value;
            const description = document.getElementById('editPhotoDescription').value;
            const fileInput = document.getElementById('editPhotoFile');
            const formData = new FormData();
            formData.append('title', title);
            formData.append('description', description);
            if (fileInput.files[0]) {
                formData.append('photo', fileInput.files[0]);
            }
            try {
                const res = await fetch(`http://localhost:5000/api/gyms/photos/${photoId}`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    body: formData
                });
                const data = await res.json();
                if (res.status === 404) {
                    alert('Photo not found. It may have been deleted or does not exist.');
                    document.getElementById('editPhotoModal').style.display = 'none';
                    fetchGymPhotos();
                    return;
                }
                if (res.ok && data.success) {
                    const msgDiv = document.getElementById('editPhotoMsg');
                    msgDiv.textContent = 'Photo updated successfully!';
                    msgDiv.style.color = 'green';
                    setTimeout(() => {
                        msgDiv.textContent = '';
                        document.getElementById('editPhotoModal').style.display = 'none';
                    }, 1500);
                    fetchGymPhotos();
                } else {
                    const msgDiv = document.getElementById('editPhotoMsg');
                    msgDiv.textContent = data.message || 'Update failed';
                    msgDiv.style.color = 'red';
                }
            } catch (err) {
                const msgDiv = document.getElementById('editPhotoMsg');
                if (msgDiv) {
                    msgDiv.textContent = 'Network error. Please try again.';
                    msgDiv.style.color = 'red';
                }
                console.error('Error updating photo:', err);
            }
        });
    }

    // Wire up all handlers
    document.getElementById('photoGridSection').addEventListener('click', handlePhotoGridClick);
    wireModalCloseButtons();
    wirePhotoFilePreview();
    wireEditPhotoForm();
});

// --- Gym Photo Upload Logic ---
            const uploadGymPhotoForm = document.getElementById('uploadGymPhotoForm');
            if (uploadGymPhotoForm) {
                uploadGymPhotoForm.addEventListener('submit', async function(e) {
                    e.preventDefault();
                    const formData = new FormData(uploadGymPhotoForm);
                    const token = localStorage.getItem('gymAdminToken');
                    try {
                        const res = await fetch('http://localhost:5000/api/gyms/photos', {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${token}` },
                            body: formData
                        });
                        const data = await res.json();
        if (res.ok && data.success) {
    handlePhotoUploadSuccess();
    fetchGymPhotos();
} else {
    const msgDiv = document.getElementById('uploadPhotoMsg');
    msgDiv.textContent = data.message || 'Upload failed';
    msgDiv.style.color = 'red';
}

function handlePhotoUploadSuccess() {
    const msgDiv = document.getElementById('uploadPhotoMsg');
    msgDiv.textContent = 'Photo uploaded successfully!';
    msgDiv.style.color = 'green';
    uploadGymPhotoForm.reset();
    setTimeout(clearUploadPhotoMsgAndCloseModal, 1200);
}

function clearUploadPhotoMsgAndCloseModal() {
    const msgDiv = document.getElementById('uploadPhotoMsg');
    if (msgDiv) msgDiv.textContent = '';
    const uploadPhotoModal = document.getElementById('uploadPhotoModal');
    if (uploadPhotoModal) uploadPhotoModal.style.display = 'none';
}
                    } catch (err) {
                        const msgDiv = document.getElementById('editPhotoMsg');
                        if (msgDiv) {
                            msgDiv.textContent = 'Network error';
                            msgDiv.style.color = 'red';
                        }
                        console.error('Error uploading photo:', err);
                    }
                });
            }

        
        // Profile Dropdown Toggle Functionality
        const userProfileToggle = document.getElementById('userProfileToggle');
        const profileDropdownMenu = document.getElementById('profileDropdownMenu');
        const editProfileLink = document.getElementById('editProfileLink');
        const logoutLink = document.getElementById('logoutLink');

        if (userProfileToggle && profileDropdownMenu) {
            userProfileToggle.addEventListener('click', function(event) {
                event.stopPropagation(); // Prevent click from closing menu immediately
                profileDropdownMenu.classList.toggle('show');
            });
        }

        window.addEventListener('click', function(event) {
            if (profileDropdownMenu?.classList.contains('show')) {
                if (!userProfileToggle.contains(event.target) && !profileDropdownMenu.contains(event.target)) {
                    profileDropdownMenu.classList.remove('show');
                }
            }
        });

        // Edit Profile Modal elements and logic
        const editProfileModal = document.getElementById('editProfileModal');
        const editProfileForm = document.getElementById('editProfileForm');
        const logoPreviewImage = document.getElementById('logoPreviewImage');

        function populateEditProfileModal() {
            if (!currentGymProfile) {
                console.warn('No currentGymProfile available for modal population');
                return;
            }

            console.log('Populating edit profile modal with:', currentGymProfile);
            
            document.getElementById('editGymName').value = currentGymProfile.gymName || '';
            document.getElementById('editGymEmail').value = currentGymProfile.email || '';
            document.getElementById('editGymPhone').value = currentGymProfile.phone || '';
            
            // Handle address fields - check both direct fields and location object
            const address = currentGymProfile.address || currentGymProfile.location?.address || '';
            const city = currentGymProfile.city || currentGymProfile.location?.city || '';
            const state = currentGymProfile.state || currentGymProfile.location?.state || '';
            const pincode = currentGymProfile.pincode || currentGymProfile.location?.pincode || '';
            
            document.getElementById('editGymAddress').value = address;
            document.getElementById('editGymCity').value = city;
            
            // Add state field if it exists
            const stateField = document.getElementById('editGymState');
            if (stateField) {
                stateField.value = state;
            }
            
            document.getElementById('editGymPincode').value = pincode;
            document.getElementById('editGymDescription').value = currentGymProfile.description || '';

            // Handle logo URL with improved logic
            let logoUrl = currentGymProfile.logoUrl || currentGymProfile.logo || currentGymProfile.logoURL || currentGymProfile.logo_path || '';
            
            console.log('[DEBUG] Edit modal - Raw logoUrl from gym profile:', logoUrl);
            
            if (logoUrl && !logoUrl.startsWith('http')) {
                if (logoUrl.startsWith('/')) {
                    logoUrl = `http://localhost:5000${logoUrl}`;
                } else {
                    logoUrl = `http://localhost:5000/${logoUrl}`;
                }
            }
            
            // Auto-fix logo path if it's using wrong directory
            if (logoUrl && logoUrl.includes('/uploads/gymImages/')) {
                const filename = logoUrl.split('/').pop();
                const altUrl = `http://localhost:5000/uploads/gymPhotos/${filename}`;
                console.log('[DEBUG] Auto-correcting logo path from gymImages to gymPhotos:', altUrl);
                logoUrl = altUrl;
            }
            
            if (logoUrl) {
                logoPreviewImage.src = `${logoUrl}?${new Date().getTime()}`;
                logoPreviewImage.style.display = 'block';
                console.log('Logo preview set to:', logoUrl);
                
                // Add error handling for logo preview
                logoPreviewImage.onerror = function() {
                    console.log('[ERROR] Failed to load logo preview:', logoUrl);
                    this.onerror = null; // Prevent infinite loop
                    this.src = 'http://localhost:5000/uploads/images/default-logo.png';
                };
            } else {
                logoPreviewImage.src = '#';
                logoPreviewImage.style.display = 'none';
                console.log('No logo URL found, hiding preview');
            }
            
            console.log('Modal populated with address:', { address, city, state, pincode });
        }

        if (editProfileLink) {
            editProfileLink.addEventListener('click', function(event) {
                event.preventDefault(); // Prevent default anchor behavior
                populateEditProfileModal(); // Populate data before showing
                editProfileModal.style.display = 'flex';
                if (profileDropdownMenu) profileDropdownMenu.classList.remove('show'); // Close dropdown
            });
        }

        if (logoutLink) {
            logoutLink.addEventListener('click', function(event) {
                event.preventDefault(); // Prevent default anchor behavior
                console.log('Logout clicked');
               localStorage.removeItem('gymAdminToken');
                window.location.href = 'http://localhost:5000/public/admin-login.html'; // Redirect to login page
            });
        }

      



        // Handle Modals general closing
        const modals = document.querySelectorAll('.modal');
        const closeButtons = document.querySelectorAll('.modal-close');

        closeButtons.forEach(button => {
            button.addEventListener('click', () => {
                const modalToClose = button.closest('.modal');
                if (modalToClose) modalToClose.classList.remove('show');
            });
        });

        window.addEventListener('click', (e) => {
            modals.forEach(modal => {
                if (e.target === modal) {
                    modal.classList.remove('show');
                }
            });
        });

        // Specific Modals (Notification, Upload Photo, Add Equipment)
        // Fix: Use unique IDs for open-modal button and send button
        const openNotificationModalBtn = document.getElementById('openNotificationModalBtn');
        const notificationModal = document.getElementById('notificationModal');
        if (openNotificationModalBtn && notificationModal) {
            openNotificationModalBtn.addEventListener('click', () => {
                notificationModal.classList.add('show');
                if (window.resetNotificationForm) {
                    window.resetNotificationForm();
                }
            });
        }

        const uploadPhotoBtn = document.getElementById('uploadPhotoBtn');
        const uploadPhotoModal = document.getElementById('uploadPhotoModal');
        if (uploadPhotoBtn && uploadPhotoModal) {
            uploadPhotoBtn.addEventListener('click', () => uploadPhotoModal.style.display = 'flex');
        }
        // Add interactive cancel for upload photo modal
        const cancelUploadPhotoBtn = document.getElementById('cancelUploadPhotoBtn');
        if (cancelUploadPhotoBtn && uploadPhotoModal) {
            cancelUploadPhotoBtn.onclick = function() {
                uploadPhotoModal.style.display = 'none';
            };
        }

        const addEquipmentBtn = document.getElementById('uploadEquipmentBtn');
        const addEquipmentModal = document.getElementById('addEquipmentModal');
        if (addEquipmentBtn && addEquipmentModal) {
            addEquipmentBtn.addEventListener('click', () => addEquipmentModal.style.display = 'flex');
        }

        // File input change for logo preview in Edit Profile Modal
        const editGymLogoInput = document.getElementById('editGymLogo');
        if (editGymLogoInput && logoPreviewImage) {
            editGymLogoInput.addEventListener('change', function(event) {
                const file = event.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        logoPreviewImage.src = e.target.result;
                        logoPreviewImage.style.display = 'block';
                    }
                    reader.readAsDataURL(file);
                } else {
                    logoPreviewImage.src = '#';
                    logoPreviewImage.style.display = 'none';
                }
            });
        }

        // Edit Profile Form Submission
        if (editProfileForm) {
            let pendingFormData = null;

            // Password confirmation modal elements
            const passwordConfirmDialog = document.getElementById('passwordConfirmDialog');
            const passwordConfirmForm = document.getElementById('passwordConfirmForm');
            const closePasswordConfirmDialog = document.getElementById('closePasswordConfirmDialog');

            // Helper to show modal
            function showPasswordConfirmDialog() {
                if (passwordConfirmDialog) passwordConfirmDialog.style.display = 'flex';
                if (document.getElementById('currentPassword')) document.getElementById('currentPassword').value = '';
            }
            // Helper to hide modal
            function hidePasswordConfirmDialog() {
                if (passwordConfirmDialog) passwordConfirmDialog.style.display = 'none';
            }
            // Handle closing modal
            if (closePasswordConfirmDialog) {
                closePasswordConfirmDialog.onclick = hidePasswordConfirmDialog;
            }

            editProfileForm.addEventListener('submit', function(event) {
                event.preventDefault();
                // Always construct FormData and append logo if present
                pendingFormData = new FormData(editProfileForm);
                const logoInput = document.getElementById('editGymLogo');
                if (logoInput && logoInput.files.length > 0) {
                    pendingFormData.set('gymLogo', logoInput.files[0]);
                }
                // Password validation if changing password
                const passwordFields = document.getElementById('passwordFields');
                const passwordConfirmInput = document.getElementById('editGymPasswordConfirm');
                if (passwordFields && passwordFields.style.display !== 'none' && passwordInput.value) {
                    const password = passwordInput.value;
                    const confirmPassword = passwordConfirmInput.value;
                    if (!password || !confirmPassword) {
                        showProfileUpdateMessage('Both password fields are required to change password.', 'error');
                        return;
                    }
                    if (password !== confirmPassword) {
                        showProfileUpdateMessage('Passwords do not match.', 'error');
                        return;
                    }
                    pendingFormData.append('newPassword', password);
                }
                // Always require current password for any update
                showPasswordConfirmDialog();
            });

            // Handle password confirmation form submit
            if (passwordConfirmForm) {
                passwordConfirmForm.addEventListener('submit', async function(event) {
                    event.preventDefault();
                    const currentPassword = document.getElementById('currentPassword').value;
                    if (!currentPassword) {
                        alert('Please enter your current password.');
                        return;
                    }
                    if (!pendingFormData) {
                        alert('No pending profile update.');
                        hidePasswordConfirmDialog();
                        return;
                    }
                    pendingFormData.append('currentPassword', currentPassword);
                    await submitProfileUpdate(pendingFormData);
                    // Only clear pendingFormData and hide the dialog on success or non-password errors (handled in submitProfileUpdate)

                });
            }

            // Profile update submission function
            async function submitProfileUpdate(formData) {
                try {
                    const response = await fetch('http://localhost:5000/api/gyms/profile/me', {
                        method: 'PUT',
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('gymAdminToken')}`
                        },
                        body: formData
                    });
                    const result = await response.json();
                    if (response.ok) {
                        showProfileUpdateMessage('Profile updated successfully!', 'success');
                        // Update logo preview in modal and avatar if new logo is present
                        if (result.gym && result.gym.logoUrl) {
                            let logoPath = result.gym.logoUrl;
                            // Always construct full URL for logo
                            if (!logoPath.startsWith('http')) {
                                logoPath = `http://localhost:5000/${logoPath.replace(/^\/+/, '')}`;
                            }
                            const cacheBustedLogo = `${logoPath}?${new Date().getTime()}`;
                            const logoPreviewImage = document.getElementById('logoPreviewImage');
                            if (logoPreviewImage) {
                                logoPreviewImage.src = cacheBustedLogo;
                                logoPreviewImage.style.display = 'block';
                            }
                            const adminAvatarElement = document.getElementById('adminAvatar');
                            if (adminAvatarElement) adminAvatarElement.src = `${logoPath}?${new Date().getTime()}`;
                            // Debug: Log the final logo URL used
                            console.log('Logo preview URL:', cacheBustedLogo);
                        }
                        if(editProfileModal) editProfileModal.style.display = 'none';
                        if(typeof hidePasswordConfirmDialog === 'function') hidePasswordConfirmDialog(); // Hide password dialog on success
                        pendingFormData = null;
                        fetchAndUpdateAdminProfile(); // Refresh the displayed profile info
                    } else {
                        // Show specific error for invalid current password
                        ; // Added empty statement to avoid 'if' as only statement in else block
                        if (result.message?.toLowerCase().includes('invalid current password')) {
                            showProfileUpdateMessage('Current password is incorrect.', 'error');
                            if (typeof hidePasswordConfirmDialog === 'function') hidePasswordConfirmDialog(); // Close only the password dialog
                            // Do NOT close the edit profile modal
                        } else {
                            showProfileUpdateMessage(`Error updating profile: ${result.message || 'Unknown error'}`, 'error');
                            if(editProfileModal) editProfileModal.style.display = 'none'; // Close modal for other errors
                        }
                    }
                } catch (error) {
                    console.error('Error submitting profile update:', error);
                    showProfileUpdateMessage('An error occurred while updating your profile. Please try again.', 'error');
                    if(editProfileModal) editProfileModal.style.display = 'none'; // Close modal on network/unknown error
                }
                // Only close modal on success or non-password errors
            }
        // --- Profile Update Message UI ---
        function showProfileUpdateMessage(message, type) {
            let msgDiv = document.getElementById('profileUpdateMessage');
            if (!msgDiv) {
                msgDiv = document.createElement('div');
                msgDiv.id = 'profileUpdateMessage';
                msgDiv.style.position = 'fixed';
                msgDiv.style.top = '80px';
                msgDiv.style.left = '50%';
                msgDiv.style.transform = 'translateX(-50%)';
                msgDiv.style.zIndex = 10000;
                msgDiv.style.padding = '12px 28px';
                msgDiv.style.borderRadius = '6px';
                msgDiv.style.fontWeight = 'bold';
                msgDiv.style.fontSize = '1.1rem';
                msgDiv.style.boxShadow = '0 2px 12px rgba(0,0,0,0.07)';
                document.body.appendChild(msgDiv);
            }
            msgDiv.textContent = message;
            msgDiv.style.backgroundColor = type === 'success' ? '#d4edda' : '#f8d7da';
            msgDiv.style.color = type === 'success' ? '#155724' : '#721c24';
            msgDiv.style.border = type === 'success' ? '1px solid #c3e6cb' : '1px solid #f5c6cb';
            msgDiv.style.display = 'block';
            clearTimeout(msgDiv._hideTimeout);
            msgDiv._hideTimeout = setTimeout(() => { msgDiv.style.display = 'none'; }, 3000);
        }
        // --- Change Password Logic ---
        const showChangePasswordFields = document.getElementById('showChangePasswordFields');
        const passwordFields = document.getElementById('passwordFields');
        const passwordInput = document.getElementById('editGymPassword');

        if (showChangePasswordFields && passwordFields) {
            showChangePasswordFields.addEventListener('click', function() {
                passwordFields.style.display = passwordFields.style.display === 'none' ? 'block' : 'none';
            });
        }
        // --- End Change Password Logic ---

        // File upload interaction
        const fileUploads = document.querySelectorAll('.file-upload');
        fileUploads.forEach(upload => {
            const input = upload.querySelector('input[type="file"]');
            
            upload.addEventListener('click', () => {
                input.click();
            });
            
            input.addEventListener('change', () => {
                if (input.files.length > 0) {
                    const fileName = input.files[0].name;
                    const textElement = upload.querySelector('.file-upload-text');
                    textElement.textContent = fileName;
                    upload.style.borderColor = 'var(--primary)';
                    upload.style.backgroundColor = 'rgba(58, 134, 255, 0.05)';
                }
            });
            
            // Drag and drop functionality
            upload.addEventListener('dragover', (e) => {
                e.preventDefault();
                upload.style.borderColor = 'var(--primary)';
                upload.style.backgroundColor = 'rgba(58, 134, 255, 0.1)';
            });
            
            upload.addEventListener('dragleave', () => {
                upload.style.borderColor = '#ced4da';
                upload.style.backgroundColor = 'transparent';
            });
            
            upload.addEventListener('drop', (e) => {
                e.preventDefault();
                input.files = e.dataTransfer.files;
                const fileName = input.files[0].name;
                const textElement = upload.querySelector('.file-upload-text');
                textElement.textContent = fileName;
                upload.style.borderColor = 'var(--primary)';
                upload.style.backgroundColor = 'rgba(58, 134, 255, 0.05)';
            });
        });
       
        // Rush hour toggle
        const rushHourToggle = document.querySelector('.rush-hour-toggle input');
        const rushHourIcon = document.querySelector('.rush-hour-icon');
        
        rushHourToggle.addEventListener('change', () => {
            if (rushHourToggle.checked) {
                rushHourIcon.classList.add('pulse');
                document.querySelector('.rush-hour-text h4').textContent = 'Rush Hour Active';
                document.querySelector('.rush-hour-text p').textContent = 'Extra staff deployed during peak hours (5PM-8PM)';
            } else {
                rushHourIcon.classList.remove('pulse');
                document.querySelector('.rush-hour-text h4').textContent = 'Rush Hour Inactive';
                document.querySelector('.rush-hour-text p').textContent = 'Normal operations during peak hours';
            }
        });

        // Quick action buttons
        const quickActionBtns = document.querySelectorAll('.quick-action');
        quickActionBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                // Add ripple effect
                const ripple = document.createElement('span');
                ripple.classList.add('ripple');
                btn.appendChild(ripple);
                
                // Remove ripple after animation
                setTimeout(() => {
                    ripple.remove();
                }, 600);
            });
        });

        // Table row actions
        const actionButtons = document.querySelectorAll('.action-btn');
        actionButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const row = btn.closest('tr');
                
                if (btn.classList.contains('approve')) {
                    const statusCell = row.querySelector('.status');
                    statusCell.textContent = 'Active';
                    statusCell.className = 'status active';
                    row.querySelectorAll('.action-btn').forEach(b => b.remove());
                    const viewBtn = document.createElement('button');
                    viewBtn.className = 'action-btn view';
                    viewBtn.textContent = 'View';
                    row.querySelector('td:last-child').appendChild(viewBtn);
                } else if (btn.classList.contains('reject')) {
                    row.remove();
                }
            });
        });
    }

// Sidebar toggle logic for desktop and mobile
const toggleBtn = document.getElementById('toggleBtn');
const sidebar = document.getElementById('sidebar');
const mainContent = document.getElementById('mainContent');
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const topNav = document.getElementById('topNav'); // Navbar element

// Desktop toggle (collapse/expand)
if (toggleBtn && sidebar && mainContent) {
    toggleBtn.addEventListener('click', () => {
        if (window.innerWidth > 900) {
            const isCollapsed = sidebar.classList.toggle('sidebar-collapsed');
            // Always update margins for both tabs and navbar on toggle
            updateMainContentMargins();
            // Rotate the icon
            const icon = toggleBtn.querySelector('i');
            if (isCollapsed) {
                icon.classList.remove('fa-chevron-left');
                icon.classList.add('fa-chevron-right');
            } else {
                icon.classList.remove('fa-chevron-right');
                icon.classList.add('fa-chevron-left');
            }
        }
    });
}



// Hide sidebar when clicking outside on mobile
document.addEventListener('click', (event) => {
    if (
        window.innerWidth <= 900 &&
        sidebar.classList.contains('sidebar-open') &&
        !sidebar.contains(event.target) &&
        !mobileMenuBtn?.contains(event.target)
    ) {
        sidebar.classList.remove('sidebar-open');
    }
});

// --- Display Tab Logic ---
const sidebarMenuLinks = document.querySelectorAll('.sidebar .menu-link');
const membersMenuLink = Array.from(sidebarMenuLinks).find(link => link.querySelector('.fa-users'));
const trainersMenuLink = Array.from(sidebarMenuLinks).find(link => link.querySelector('.fa-user-tie'));
const dashboardMenuLink = Array.from(sidebarMenuLinks).find(link => link.querySelector('.fa-tachometer-alt'));
const settingsMenuLink = Array.from(sidebarMenuLinks).find(link => link.querySelector('.fa-cog'));
const attendanceMenuLink = Array.from(sidebarMenuLinks).find(link => link.querySelector('.fa-calendar-check'));
const memberDisplayTab = document.getElementById('memberDisplayTab');
const trainerTab = document.getElementById('trainerTab');
const settingsTab = document.getElementById('settingsTab');
const attendanceTab = document.getElementById('attendanceTab');
const dashboardContent = document.querySelector('.content');

function hideAllMainTabs() {
  if (dashboardContent) dashboardContent.style.display = 'none';
  if (memberDisplayTab) memberDisplayTab.style.display = 'none';
  if (trainerTab) trainerTab.style.display = 'none';
  if (settingsTab) settingsTab.style.display = 'none';
  if (attendanceTab) attendanceTab.style.display = 'none';
}

if (attendanceMenuLink && attendanceTab) {
  attendanceMenuLink.addEventListener('click', function(e) {
    e.preventDefault();
    hideAllMainTabs();
    attendanceTab.style.display = 'block';
    updateMainContentMargins();
    // Initialize attendance manager if it exists
    if (typeof window.attendanceManager !== 'undefined') {
      window.attendanceManager.loadData();
      window.attendanceManager.loadAttendanceForDate();
    }
    sidebarMenuLinks.forEach(link => link.classList.remove('active'));
    attendanceMenuLink.classList.add('active');
  });
}

if (trainersMenuLink && trainerTab) {
  trainersMenuLink.addEventListener('click', function(e) {
    e.preventDefault();
    hideAllMainTabs();
    trainerTab.style.display = 'block';
    updateMainContentMargins();
    if (typeof window.showTrainerTab === 'function') window.showTrainerTab();
    sidebarMenuLinks.forEach(link => link.classList.remove('active'));
    trainersMenuLink.classList.add('active');
  });
}
if (membersMenuLink && memberDisplayTab) {
  membersMenuLink.addEventListener('click', function(e) {
    e.preventDefault();
    hideAllMainTabs();
    memberDisplayTab.style.display = 'block';
    updateMainContentMargins();
    if (typeof fetchAndDisplayMembers === 'function') fetchAndDisplayMembers();
    sidebarMenuLinks.forEach(link => link.classList.remove('active'));
    membersMenuLink.classList.add('active');
  });
}
if (dashboardMenuLink && dashboardContent) {
  dashboardMenuLink.addEventListener('click', function(e) {
    e.preventDefault();
    hideAllMainTabs();
    dashboardContent.style.display = 'block';
    updateMainContentMargins();
    sidebarMenuLinks.forEach(link => link.classList.remove('active'));
    dashboardMenuLink.classList.add('active');
  });
}

// Settings navigation is now handled in the dynamic sidebar menu highlight section below
// On page load, show only dashboard
document.addEventListener('DOMContentLoaded', function() {
  hideAllMainTabs();
  if (dashboardContent) dashboardContent.style.display = 'block';
  updateMainContentMargins();
});


// --- Dynamic Members Stats Card ---
async function updateMembersStatsCard() {
  const membersStatValue = document.querySelector('.stat-card.new-users .stat-value');
  const membersStatChange = document.querySelector('.stat-card.new-users .stat-change');
  if (!membersStatValue || !membersStatChange) return;
  try {
    const token = localStorage.getItem('gymAdminToken');
    const res = await fetch('http://localhost:5000/api/members', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to fetch members');
    const members = await res.json();
    // Filter active memberships (validUntil >= today)
    const today = new Date();
    const activeMembers = (Array.isArray(members) ? members : []).filter(m => {
      if (!m.membershipValidUntil) return false;
      const valid = new Date(m.membershipValidUntil);
      return valid >= today;
    });
    membersStatValue.textContent = activeMembers.length;

    // Growth rate calculation
    // Get joinDate for each member (assume ISO string or Date)
    const now = new Date();
    const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7);
    const monthAgo = new Date(now); monthAgo.setMonth(now.getMonth() - 1);
    let joinedThisWeek = 0, joinedLastWeek = 0, joinedThisMonth = 0, joinedLastMonth = 0;
    activeMembers.forEach(m => {
      if (!m.joinDate) return;
      const join = new Date(m.joinDate);
      if (join >= weekAgo && join <= now) joinedThisWeek++;
      if (join >= monthAgo && join <= now) joinedThisMonth++;
      // For previous week/month
      const lastWeekStart = new Date(weekAgo); lastWeekStart.setDate(weekAgo.getDate() - 7);
      if (join >= lastWeekStart && join < weekAgo) joinedLastWeek++;
      const lastMonthStart = new Date(monthAgo); lastMonthStart.setMonth(monthAgo.getMonth() - 1);
      if (join >= lastMonthStart && join < monthAgo) joinedLastMonth++;
    });
    // Calculate growth rates
    let weekGrowth = 0, monthGrowth = 0;
    if (joinedLastWeek > 0) weekGrowth = ((joinedThisWeek - joinedLastWeek) / joinedLastWeek) * 100;
    else if (joinedThisWeek > 0) weekGrowth = 100;
    if (joinedLastMonth > 0) monthGrowth = ((joinedThisMonth - joinedLastMonth) / joinedLastMonth) * 100;
    else if (joinedThisMonth > 0) monthGrowth = 100;
    // Show as positive/negative
    const weekGrowthText = weekGrowth >= 0 ? `<i class="fas fa-arrow-up"></i> ${Math.abs(weekGrowth).toFixed(1)}% from last week` : `<i class="fas fa-arrow-down"></i> ${Math.abs(weekGrowth).toFixed(1)}% from last week`;
    membersStatChange.innerHTML = weekGrowthText;
    if (weekGrowth >= 0) {
      membersStatChange.classList.add('positive');
      membersStatChange.classList.remove('negative');
    } else {
      membersStatChange.classList.add('negative');
      membersStatChange.classList.remove('positive');
    }
    // Optionally, you can show month growth in a tooltip or elsewhere
    membersStatChange.title = `Monthly growth: ${monthGrowth >= 0 ? '+' : '-'}${Math.abs(monthGrowth).toFixed(1)}% from last month`;
  } catch (err) {
    console.error('Error updating members stats card:', err);
    membersStatValue.textContent = '--';
    membersStatChange.innerHTML = '<i class="fas fa-minus"></i> N/A';
    membersStatChange.classList.remove('positive', 'negative');
    membersStatChange.title = '';
  }
}


// --- Dynamic Payments Stats Card ---
async function updatePaymentsStatsCard() {
  const paymentsStatValue = document.querySelector('.stat-card.payments .stat-value');
  const paymentsStatChange = document.querySelector('.stat-card.payments .stat-change');
  const paymentsStatTitle = document.querySelector('.stat-card.payments .stat-title');
  if (paymentsStatTitle) paymentsStatTitle.innerHTML = 'Total Payments';
  if (!paymentsStatValue || !paymentsStatChange) return;
  try {
    const token = localStorage.getItem('gymAdminToken');
    const res = await fetch('http://localhost:5000/api/members', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to fetch members');
    const members = await res.json();
    // Sum all payments
    let totalPayments = 0;
    let paymentsThisMonth = 0;
    let paymentsLastMonth = 0;
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
    const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;
    (Array.isArray(members) ? members : []).forEach(m => {
      if (typeof m.paymentAmount === 'number') {
        totalPayments += m.paymentAmount;
        // Check payment date (use joinDate as fallback)
        let payDate = null;
        if (m.paymentDate) {
          payDate = new Date(m.paymentDate);
        } else if (m.joinDate) {
          payDate = new Date(m.joinDate);
        }
        if (payDate) {
          if (payDate.getMonth() === thisMonth && payDate.getFullYear() === thisYear) {
            paymentsThisMonth += m.paymentAmount;
          } else if (payDate.getMonth() === lastMonth && payDate.getFullYear() === lastMonthYear) {
            paymentsLastMonth += m.paymentAmount;
          }
        }
      }
    });
    // Format as rupees
    paymentsStatValue.innerHTML = `<i class="fas fa-indian-rupee-sign"></i> ${totalPayments.toLocaleString('en-IN')}`;
    // Calculate monthly growth
    let monthGrowth = 0;
    if (paymentsLastMonth > 0) monthGrowth = ((paymentsThisMonth - paymentsLastMonth) / paymentsLastMonth) * 100;
    else if (paymentsThisMonth > 0) monthGrowth = 100;
    // Show as positive/negative
    const growthIcon = monthGrowth >= 0 ? 'fa-arrow-up' : 'fa-arrow-down';
    const growthClass = monthGrowth >= 0 ? 'positive' : 'negative';
    paymentsStatChange.innerHTML = `<i class="fas ${growthIcon}"></i> ${Math.abs(monthGrowth).toFixed(1)}% from last month`;
    paymentsStatChange.classList.remove('positive', 'negative');
    paymentsStatChange.classList.add(growthClass);
    paymentsStatChange.title = `This month: ₹${paymentsThisMonth.toLocaleString('en-IN')} | Last month: ₹${paymentsLastMonth.toLocaleString('en-IN')}`;
  } catch (err) {
    console.error('Error updating payments stats card:', err);
    paymentsStatValue.innerHTML = '<i class="fas fa-indian-rupee-sign"></i> --';
    paymentsStatChange.innerHTML = '<i class="fas fa-minus"></i> N/A';
    paymentsStatChange.classList.remove('positive', 'negative');
    paymentsStatChange.title = '';
  }
}

// --- Dynamic Trainers Stats Card ---
async function updateTrainersStatsCard() {
  const trainersStatValue = document.querySelector('.stat-card.trainers .stat-value');
  const trainersStatChange = document.querySelector('.stat-card.trainers .stat-change');
  if (!trainersStatValue || !trainersStatChange) return;
  try {
    const token = localStorage.getItem('gymAdminToken');
    let gymId = null;
    // Try to get gymId from currentGymProfile, fallback to window.currentGymProfile
    if (typeof currentGymProfile === 'object' && currentGymProfile._id) {
      gymId = currentGymProfile._id;
    } else if (window.currentGymProfile && window.currentGymProfile._id) {
      gymId = window.currentGymProfile._id;
    } else if (window.currentGymProfile && window.currentGymProfile.id) {
      gymId = window.currentGymProfile.id;
    }
    // If gymId is still not set, try to fetch profile and retry
    if (!token || !gymId) {
      // Try to fetch profile and retry once
      if (typeof fetchAndUpdateAdminProfile === 'function') {
        await fetchAndUpdateAdminProfile();
        if (typeof currentGymProfile === 'object' && currentGymProfile._id) {
          gymId = currentGymProfile._id;
        } else if (window.currentGymProfile && window.currentGymProfile._id) {
          gymId = window.currentGymProfile._id;
        } else if (window.currentGymProfile && window.currentGymProfile.id) {
          gymId = window.currentGymProfile.id;
        }
      }
    }
    if (!token || !gymId) {
      trainersStatValue.textContent = '--';
      trainersStatChange.innerHTML = '<i class="fas fa-minus"></i> N/A';
      return;
    }
    // Fetch approved trainers
    const approvedRes = await fetch(`http://localhost:5000/api/trainers?status=approved&gym=${gymId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const pendingRes = await fetch(`http://localhost:5000/api/trainers?status=pending&gym=${gymId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    let approved = [];
    let pending = [];
    if (approvedRes.ok) approved = await approvedRes.json();
    if (pendingRes.ok) pending = await pendingRes.json();
    // Filter by gym (in case backend returns more)
    approved = Array.isArray(approved) ? approved.filter(t => t.gym === gymId || (t.gym && (t.gym._id === gymId || t.gym === gymId))) : [];
    pending = Array.isArray(pending) ? pending.filter(t => t.gym === gymId || (t.gym && (t.gym._id === gymId || t.gym === gymId))) : [];
    trainersStatValue.textContent = approved.length;
    trainersStatChange.innerHTML = `<span style="color:#ffbe0b;"><i class="fas fa-hourglass-half"></i> ${pending.length} pending approval</span>`;
  } catch (err) {
    console.error('Error updating trainers stats card:', err);
    trainersStatValue.textContent = '--';
    trainersStatChange.innerHTML = '<i class="fas fa-minus"></i> N/A';
  }
}
// Call on load
document.addEventListener('DOMContentLoaded', function() {
  updateMembersStatsCard();
  updatePaymentsStatsCard();
  updateTrainersStatsCard();
  // Attendance stat card logic moved to a different file
});

function updateMainContentMargins() {
  if (!mainContent) return;
  const isCollapsed = sidebar.classList.contains('sidebar-collapsed');
  const dashboardTab = mainContent.querySelector('.content');
  const memberTab = document.getElementById('memberDisplayTab');
  // Use global trainerTab and settingsTab variables instead of redeclaring

  function setTabMargin(tab) {
    if (!tab || tab.style.display === 'none') return;
    if (window.innerWidth > 900) {
      tab.style.marginLeft = isCollapsed ? '80px' : '250px';
    } else {
      tab.style.marginLeft = '0';
    }
  }

  setTabMargin(dashboardTab);
  setTabMargin(memberTab);
  setTabMargin(trainerTab);
  setTabMargin(settingsTab);
  setTabMargin(attendanceTab);
}

// Dynamic sidebar menu highlight
sidebarMenuLinks.forEach(link => {
  link.addEventListener('click', function(e) {
    // Only handle tab switching links (not external/settings etc.)
    const menuText = link.querySelector('.menu-text')?.textContent.trim();
    if (menuText === 'Dashboard') {
      // Show dashboard, hide others
      hideAllMainTabs();
      dashboardContent.style.display = 'block';
      updateMainContentMargins();
      // Remove active from all, add to dashboard
      sidebarMenuLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
    } else if (menuText === 'Members') {
      // Show members, hide others
      hideAllMainTabs();
      memberDisplayTab.style.display = 'block';
      updateMainContentMargins();
      // Remove active from all, add to members
      sidebarMenuLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      // Fetch members if needed
      if (typeof fetchAndDisplayMembers === 'function') fetchAndDisplayMembers();
    } else if (menuText === 'Settings') {
      // Show settings, hide others
      hideAllMainTabs();
      settingsTab.style.display = 'block';
      updateMainContentMargins();
      // Remove active from all, add to settings
      sidebarMenuLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
    } else {
      // For other tabs, just highlight
      sidebarMenuLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
    }
    e.preventDefault();
  });
});


let allMembersCache = [];
// --- Enhanced Member Search & Filter Logic ---
async function fetchAndDisplayMembers() {
  const token = localStorage.getItem('gymAdminToken');
  if (!membersTableBody) return;
  membersTableBody.innerHTML = '<tr><td colspan="13" style="text-align:center;">Loading...</td></tr>';
  try {
    const res = await fetch('http://localhost:5000/api/members', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to fetch members');
    const members = await res.json();
    allMembersCache = Array.isArray(members) ? members : [];
    renderMembersTable(allMembersCache);
  } catch (err) {
    console.error('Error loading members:', err);
    membersTableBody.innerHTML = `<tr><td colspan="13" style="color:red;text-align:center;">Error loading members</td></tr>`;
  }
}

// --- Search & Filter Handlers ---
document.addEventListener('DOMContentLoaded', function() {
  const searchInput = document.getElementById('memberSearchInput');
  const expiryFilter = document.getElementById('membershipExpiryFilter');
  if (searchInput) {
    searchInput.addEventListener('input', handleMemberSearchAndFilter);
  }
  if (expiryFilter) {
    expiryFilter.addEventListener('change', handleMemberSearchAndFilter);
  }
});

function handleMemberSearchAndFilter() {
  const searchInput = document.getElementById('memberSearchInput');
  const expiryFilter = document.getElementById('membershipExpiryFilter');
  let filtered = allMembersCache.slice();
  // --- Search ---
  const q = (searchInput?.value || '').trim().toLowerCase();
  if (q) {
    filtered = filtered.filter(m => {
      return (
        (m.memberName && m.memberName.toLowerCase().includes(q)) ||
        (m.email && m.email.toLowerCase().includes(q)) ||
        (m.phone && m.phone.toLowerCase().includes(q)) ||
        (m.membershipId && m.membershipId.toLowerCase().includes(q))
      );
    });
  }
  // --- Expiry Filter ---
  const filterVal = expiryFilter?.value;
  if (filterVal === '3days' || filterVal === '1day') {
    const days = filterVal === '3days' ? 3 : 1;
    const now = new Date();
    filtered = filtered.filter(m => {
      if (!m.membershipValidUntil) return false;
      const validUntil = new Date(m.membershipValidUntil);
      const diff = (validUntil - now) / (1000 * 60 * 60 * 24);
      return diff >= 0 && diff <= days;
    });
  }
  renderMembersTable(filtered);
}

function renderMembersTable(members) {
  if (!membersTableBody) return;
  if (!Array.isArray(members) || !members.length) {
    membersTableBody.innerHTML = '<tr><td colspan="13" style="text-align:center; color:#888;">No members found.</td></tr>';
    return;
  }
  membersTableBody.innerHTML = '';
  members.forEach(member => {
    const imgSrc = member.profileImage ? `http://localhost:5000${member.profileImage}` : 'https://via.placeholder.com/48?text=Photo';
    const joinDate = member.joinDate ? new Date(member.joinDate).toLocaleDateString() : '';
    const membershipId = member.membershipId || '';
    const validUntil = member.membershipValidUntil ? new Date(member.membershipValidUntil).toLocaleDateString() : '';
    const amountPaid = member.paymentAmount !== undefined ? member.paymentAmount : '';
    // Try both address and memberAddress for compatibility
    const address = member.address || member.memberAddress || '';
    // Store the MongoDB _id as a data attribute
    const rowId = member._id ? `data-member-id="${member._id}"` : '';
    membersTableBody.innerHTML += `
      <tr ${rowId}>
        <td style="text-align:center;"><img src="${imgSrc}" alt="Profile" style="width:48px;height:48px;border-radius:50%;object-fit:cover;"></td>
        <td>${member.memberName || ''}</td>
         <td>${membershipId}</td>
        <td>${member.age || ''}</td>
        <td>${member.gender || ''}</td>
        <td>${member.phone || ''}</td>
        <td>${member.email || ''}</td>
        <td>${address}</td>
        <td>${member.planSelected || ''}</td>
        <td>${member.monthlyPlan || ''}</td>
        <td>${member.activityPreference || ''}</td>
         <td>${joinDate}</td>
        <td>${validUntil}</td>
        <td>${amountPaid}</td>
      </tr>
    `;
  });
}
// Ensure only one event listener is attached and openMembersDetailCard is always available
function openMembersDetailCard() {
  const membersDetailCard = document.getElementById('membersDetailCard');
  const membersDetailLoading = document.getElementById('membersDetailLoading');
  const membersDetailError = document.getElementById('membersDetailError');
  const membersDetailContent = document.getElementById('membersDetailContent');
  const newMembersList = document.getElementById('newMembersList');
  const existingMembersList = document.getElementById('existingMembersList');
  if (membersDetailCard) {
    membersDetailCard.style.display = 'flex';
    if (membersDetailLoading) membersDetailLoading.style.display = 'block';
    if (membersDetailError) membersDetailError.style.display = 'none';
    if (membersDetailContent) membersDetailContent.style.display = 'none';
    fetchAndRenderMembersDetail();
  }
  // Helper to split members into new and existing
  function splitMembersByJoinDate(members, days = 30) {
    const now = new Date();
    const newMembers = [];
    const existingMembers = [];
    members.forEach(member => {
      if (!member.joinDate) {
        existingMembers.push(member);
        return;
      }
      const join = new Date(member.joinDate);
      const diffDays = (now - join) / (1000 * 60 * 60 * 24);
      if (diffDays <= days) newMembers.push(member);
      else existingMembers.push(member);
    });
    return { newMembers, existingMembers };
  }

  // Helper to render member list HTML
  function renderMemberList(members, renderItem, emptyMsg) {
    return members.length
      ? members.map(renderItem).join('')
      : `<li style="color:#888;">${emptyMsg}</li>`;
  }

  // Helper to render a member list item
  function renderMemberListItem(member) {
    const img = member.profileImageUrl
      ? `<img src="${member.profileImageUrl}" alt="${member.name || member.memberName || ''}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;margin-right:10px;">`
      : `<span style="display:inline-block;width:36px;height:36px;border-radius:50%;background:#eee;margin-right:10px;"></span>`;
    const name = member.name || member.memberName || 'Member';
    const plan = member.planSelected || member.plan || '';
    const joinDate = member.joinDate ? new Date(member.joinDate).toLocaleDateString() : '';
    return `<li style="display:flex;align-items:center;margin-bottom:10px;">${img}<div><div style="font-weight:500;">${name}</div><div style="font-size:0.95em;color:#888;">${plan}${joinDate ? ' | Joined: ' + joinDate : ''}</div></div></li>`;
  }

  // Refactored: fetch and render members detail with reduced complexity and unique log
  async function fetchAndRenderMembersDetail() {
    if (membersDetailLoading) membersDetailLoading.style.display = 'block';
    if (membersDetailError) membersDetailError.style.display = 'none';
    if (membersDetailContent) membersDetailContent.style.display = 'none';
    if (newMembersList) newMembersList.innerHTML = '';
    if (existingMembersList) existingMembersList.innerHTML = '';
    const token = localStorage.getItem('gymAdminToken');
    try {
      const res = await fetch('http://localhost:5000/api/members', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok || !Array.isArray(data.members)) {
        throw new Error(data.message || 'Failed to fetch members');
      }
      // Use helper to split members
      const { newMembers, existingMembers } = splitMembersByJoinDate(data.members, 30);
      if (newMembersList)
        newMembersList.innerHTML = renderMemberList(
          newMembers,
          renderMemberListItem,
          'No new members in last 30 days.'
        );
      if (existingMembersList)
        existingMembersList.innerHTML = renderMemberList(
          existingMembers,
          renderMemberListItem,
          'No existing members.'
        );
      if (membersDetailLoading) membersDetailLoading.style.display = 'none';
      if (membersDetailContent) membersDetailContent.style.display = 'block';
      // Unique log for this instance
      console.log('[fetchAndRenderMembersDetail] (mobile sidebar version) rendered at', new Date().toISOString());
    } catch (err) {
      if (membersDetailLoading) membersDetailLoading.style.display = 'none';
      if (membersDetailError) {
        membersDetailError.textContent = err.message || 'Failed to load members.';
        membersDetailError.style.display = 'block';
      }
    }
  }
}
window.openMembersDetailCard = openMembersDetailCard;

// --- Member Detail Card: Show details for clicked member row ---
if (membersTableBody) {
  membersTableBody.addEventListener('click', function(e) {
    let tr = e.target;
    while (tr && tr.tagName !== 'TR') tr = tr.parentElement;
    if (tr) {
      // Get all cells in the row
      const cells = tr.querySelectorAll('td');
      // Extract member info from the row (order must match table columns)
      const member = {
        _id: tr.getAttribute('data-member-id') || '',
        profileImage: cells[0]?.querySelector('img')?.src || '',
        memberName: cells[1]?.textContent.trim() || '',
        membershipId: cells[2]?.textContent.trim() || '',
        age: cells[3]?.textContent.trim() || '',
        gender: cells[4]?.textContent.trim() || '',
        phone: cells[5]?.textContent.trim() || '',
        email: cells[6]?.textContent.trim() || '',
        address: cells[7]?.textContent.trim() || '',
        planSelected: cells[8]?.textContent.trim() || '',
        monthlyPlan: cells[9]?.textContent.trim() || '',
        activityPreference: cells[10]?.textContent.trim() || '',
        joinDate: cells[11]?.textContent.trim() || '',
        validUntil: cells[12]?.textContent.trim() || '',
        paymentAmount: cells[13]?.textContent.trim() || ''
      };
      showMemberDetailCard(member);
    }
  });
}

function showMemberDetailCard(member) {
  const modal = document.getElementById('membersDetailCard');
  if (!modal) return;
  // Build the detail HTML using only classes for styling
  const content = `
    <div class="modal-content member-detail-modal">
      <div class="member-detail-header" style="position:relative;">
        <button id="editMemberDetailBtn" title="Edit Member" style="position:absolute;left:18px;top:16px;background:none;border:none;cursor:pointer;font-size:1.25rem;color:#fff;z-index:3;transition:color 0.2s;"><i class='fas fa-edit'></i></button>
        <h2 class="member-detail-title" style="margin-left:32px;">
          <i class="fas fa-id-card-alt"></i> Member Details
        </h2>
        <button id="closeMembersDetailCard" class="modal-close" title="Close">&times;</button>
      </div>
      <div class="member-detail-body">
        <div class="member-detail-top">
          <img src="${member.profileImage}" alt="Profile" class="profile-pic" id="memberDetailProfilePic">
          <div>
            <div class="member-name">${member.memberName}</div>
            <div class="member-id">${member.membershipId}</div>
          </div>
        </div>
        <ul class="info-list" id="memberDetailInfoList">
          <li><i class="fas fa-crown"></i> <span class="member-detail-label">Plan:</span> <span class="plan-badge">${member.planSelected} (${member.monthlyPlan})</span></li>
          <li><i class="fas fa-dumbbell"></i> <span class="member-detail-label">Activity:</span> <span id="memberDetailActivity">${member.activityPreference || ''}</span></li>
          <li><i class="fas fa-phone"></i> <span class="member-detail-label">Phone:</span> <span id="memberDetailPhone">${member.phone || ''}</span></li>
          <li><i class="fas fa-envelope"></i> <span class="member-detail-label">Email:</span> <span id="memberDetailEmail">${member.email || ''}</span></li>
          <li><i class="fas fa-map-marker-alt"></i> <span class="member-detail-label">Address:</span> <span id="memberDetailAddress">${member.address || ''}</span></li>
          <li><i class="fas fa-venus-mars"></i> <span class="member-detail-label">Gender:</span> ${member.gender || ''} <span class="member-detail-label">Age:</span> ${member.age || ''}</li>
          <li><i class="fas fa-calendar-plus"></i> <span class="member-detail-label">Join Date:</span> ${member.joinDate || ''}</li>
          <li><i class="fas fa-calendar-check"></i> <span class="member-detail-label">Valid Until:</span> ${member.validUntil || ''}</li>
          <li><i class="fas fa-rupee-sign"></i> <span class="member-detail-label">Amount Paid:</span> ${member.paymentAmount || ''}</li>
        </ul>
      </div>
    </div>
  `;
  modal.innerHTML = content;
  modal.style.display = 'flex';
  // Add close logic
  const closeBtn = document.getElementById('closeMembersDetailCard');
  if (closeBtn) closeBtn.onclick = function() { modal.style.display = 'none'; };
  // Close on outside click
  modal.addEventListener('mousedown', function handler(e) {
    if (e.target === modal) {
      modal.style.display = 'none';
      modal.removeEventListener('mousedown', handler);
    }
  });

  // Edit logic
  const editBtn = document.getElementById('editMemberDetailBtn');
  if (editBtn) {
    editBtn.onclick = function() {
      enableMemberDetailEdit(member);
    };
  }
}

// Enable editing for allowed fields in the member detail card
function enableMemberDetailEdit(member) {
  const modal = document.getElementById('membersDetailCard');
  if (!modal) return;
  // Build the edit form
  const content = `
    <div class="modal-content member-detail-modal">
      <div class="member-detail-header" style="position:relative;">
        <button id="saveMemberDetailBtn" title="Save Changes" style="position:absolute;left:18px;top:16px;background:none;border:none;cursor:pointer;font-size:1.25rem;color:#fff;z-index:3;transition:color 0.2s;"><i class='fas fa-save'></i></button>
        <h2 class="member-detail-title" style="margin-left:32px;">
          <i class="fas fa-id-card-alt"></i> Edit Member
        </h2>
        <button id="closeMembersDetailCard" class="modal-close" title="Close">&times;</button>
      </div>
      <form id="memberDetailEditForm" class="member-detail-body" autocomplete="off" enctype="multipart/form-data">
        <div class="member-detail-top">
          <label for="editMemberProfilePic" style="cursor:pointer;">
            <img src="${member.profileImage}" alt="Profile" class="profile-pic" id="editMemberProfilePicPreview">
            <input type="file" id="editMemberProfilePic" name="profileImage" accept="image/*" style="display:none;">
            <div style="font-size:0.95em;color:#1976d2;text-align:center;margin-top:4px;">Change Photo</div>
          </label>
          <div>
            <div class="member-name">${member.memberName}</div>
            <div class="member-id">${member.membershipId}</div>
          </div>
        </div>
        <ul class="info-list">
          <li><i class="fas fa-crown"></i> <span class="member-detail-label">Plan:</span> <span class="plan-badge">${member.planSelected} (${member.monthlyPlan})</span></li>
          <li><i class="fas fa-dumbbell"></i> <span class="member-detail-label">Activity:</span> <input type="text" id="editMemberActivity" name="activityPreference" value="${member.activityPreference}" class="edit-input"></li>
          <li><i class="fas fa-phone"></i> <span class="member-detail-label">Phone:</span> <input type="tel" id="editMemberPhone" name="phone" value="${member.phone}" class="edit-input"></li>
          <li><i class="fas fa-envelope"></i> <span class="member-detail-label">Email:</span> <input type="email" id="editMemberEmail" name="email" value="${member.email}" class="edit-input"></li>
          <li><i class="fas fa-map-marker-alt"></i> <span class="member-detail-label">Address:</span> <input type="text" id="editMemberAddress" name="address" value="${member.address || ''}" class="edit-input"></li>
          <li><i class="fas fa-venus-mars"></i> <span class="member-detail-label">Gender:</span> ${member.gender} <span class="member-detail-label">Age:</span> ${member.age}</li>
          <li><i class="fas fa-calendar-plus"></i> <span class="member-detail-label">Join Date:</span> ${member.joinDate}</li>
          <li><i class="fas fa-calendar-check"></i> <span class="member-detail-label">Valid Until:</span> ${member.validUntil}</li>
          <li><i class="fas fa-rupee-sign"></i> <span class="member-detail-label">Amount Paid:</span> ${member.paymentAmount}</li>
        </ul>
      </form>
    </div>
  `;
  modal.innerHTML = content;
  modal.style.display = 'flex';
  // Add close logic
  const closeBtn = document.getElementById('closeMembersDetailCard');
  if (closeBtn) closeBtn.onclick = function() { modal.style.display = 'none'; };
  // Save logic
  const saveBtn = document.getElementById('saveMemberDetailBtn');
  if (saveBtn) {
    saveBtn.onclick = function() {
      submitMemberDetailEdit(member);
    };
  }
  // Profile image preview logic
  const fileInput = document.getElementById('editMemberProfilePic');
  const imgPreview = document.getElementById('editMemberProfilePicPreview');
  if (fileInput && imgPreview) {
    fileInput.addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function(ev) {
          imgPreview.src = ev.target.result;
        };
        reader.readAsDataURL(file);
      }
    });
  }
}

// Handle submit for member detail edit (calls backend API)
async function submitMemberDetailEdit(originalMember) {
  const modal = document.getElementById('membersDetailCard');
  if (!modal) return;
  const form = document.getElementById('memberDetailEditForm');
  if (!form) return;
  // Use the MongoDB _id for updates
  const memberObjectId = originalMember._id;
  if (!memberObjectId) {
    alert('Member record ID not found. Cannot update.');
    return;
  }
  const formData = new FormData();
  formData.append('activityPreference', form.activityPreference.value);
  formData.append('phone', form.phone.value);
  formData.append('email', form.email.value);
  formData.append('address', form.address.value);
  // Profile image
  const fileInput = form.profileImage;
  if (fileInput?.files?.[0]) {
    formData.append('profileImage', fileInput.files[0]);
  }
  try {
    const token = localStorage.getItem('gymAdminToken');
    // Use the backend API: PUT /api/members/:_id
    const response = await fetch(`http://localhost:5000/api/members/${memberObjectId}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      }
    );
    const result = await response.json();
    if (response.ok) {
      // Show updated card with new data
      showMemberDetailCard(result.member);
      showMemberUpdateMessage('Member details updated successfully!', 'success');
      // Optionally refresh the members table
      if (typeof fetchAndDisplayMembers === 'function') fetchAndDisplayMembers();
    } else {
      showMemberUpdateMessage(result.message || 'Failed to update member.', 'error');
    }
  } catch (err) {
    console.error('Error updating member details:', err);
    showMemberUpdateMessage('Network error. Please try again.', 'error');
  }
}

// Show update message for member detail edits
function showMemberUpdateMessage(message, type) {
  let msgDiv = document.getElementById('memberUpdateMessage');
  if (!msgDiv) {
    msgDiv = document.createElement('div');
    msgDiv.id = 'memberUpdateMessage';
    msgDiv.style.position = 'fixed';
    msgDiv.style.top = '80px';
    msgDiv.style.left = '50%';
    msgDiv.style.transform = 'translateX(-50%)';
    msgDiv.style.zIndex = 10000;
    msgDiv.style.padding = '12px 28px';
    msgDiv.style.borderRadius = '6px';
    msgDiv.style.fontWeight = 'bold';
    msgDiv.style.fontSize = '1.1rem';
    msgDiv.style.boxShadow = '0 2px 12px rgba(0,0,0,0.07)';
    document.body.appendChild(msgDiv);
  }
  msgDiv.textContent = message;
  msgDiv.style.backgroundColor = type === 'success' ? '#d4edda' : '#f8d7da';
  msgDiv.style.color = type === 'success' ? '#155724' : '#721c24';
  msgDiv.style.border = type === 'success' ? '1px solid #c3e6cb' : '1px solid #f5c6cb';
  msgDiv.style.display = 'block';
  clearTimeout(msgDiv._hideTimeout);
  msgDiv._hideTimeout = setTimeout(() => { msgDiv.style.display = 'none'; }, 3000);
}
document.addEventListener('DOMContentLoaded', function() {
  // Mobile sidebar logic with backdrop and animation
  const hamburger = document.getElementById('hamburgerMenuBtn');
  const dropdown = document.getElementById('mobileSidebarDropdown');
  const closeBtn = document.getElementById('closeMobileSidebar');
  const backdrop = document.getElementById('mobileSidebarBackdrop');

  function openMobileSidebar() {
    dropdown.classList.add('open');
    backdrop.classList.add('active');
    hamburger.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
  function closeMobileSidebar() {
    dropdown.classList.remove('open');
    backdrop.classList.remove('active');
    hamburger.classList.remove('active');
    document.body.style.overflow = '';
  }

  if (hamburger && dropdown && backdrop) {
    hamburger.addEventListener('click', function(e) {
      e.stopPropagation();
      openMobileSidebar();
    });
    backdrop.addEventListener('click', function() {
      closeMobileSidebar();
    });
  }
  if (closeBtn && dropdown && backdrop) {
    closeBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      closeMobileSidebar();
    });
  }
  // Prevent click inside sidebar from closing it
  if (dropdown) {
    dropdown.addEventListener('click', function(e) {
      e.stopPropagation();
    });
  }
  // Hide sidebar if clicking outside (failsafe for edge cases)
  document.addEventListener('click', function(e) {
    if (
      dropdown.classList.contains('open') &&
      !dropdown.contains(e.target) &&
      e.target !== hamburger &&
      !backdrop.contains(e.target)
    ) {
      closeMobileSidebar();
    }
  });
  document.addEventListener('DOMContentLoaded', function() {
  const membersTableBody = document.getElementById('membersTableBody');
  const membersDetailCard = document.getElementById('membersDetailCard');
  const closeMembersDetailCard = document.getElementById('closeMembersDetailCard');
  const membersDetailLoading = document.getElementById('membersDetailLoading');
  const membersDetailError = document.getElementById('membersDetailError');
  const membersDetailContent = document.getElementById('membersDetailContent');
  const newMembersList = document.getElementById('newMembersList');
  const existingMembersList = document.getElementById('existingMembersList');

  function openMembersDetailCard() {
    if (membersDetailCard) {
      membersDetailCard.style.display = 'flex';
      if (membersDetailLoading) membersDetailLoading.style.display = 'block';
      if (membersDetailError) membersDetailError.style.display = 'none';
      if (membersDetailContent) membersDetailContent.style.display = 'none';
      fetchAndRenderMembersDetail();
    }
  }
  function closeMembersDetailCardFunc() {
    if (membersDetailCard) membersDetailCard.style.display = 'none';
  }
  if (membersTableBody) {
    membersTableBody.addEventListener('click', function(e) {
      let tr = e.target;
      while (tr && tr.tagName !== 'TR') tr = tr.parentElement;
      if (tr) {
        openMembersDetailCard();
      }
    });
  }
  if (closeMembersDetailCard) {
    closeMembersDetailCard.addEventListener('click', closeMembersDetailCardFunc);
  }
  if (membersDetailCard) {
    membersDetailCard.addEventListener('mousedown', function(e) {
      if (e.target === membersDetailCard) closeMembersDetailCardFunc();
    });
  }
  async function fetchAndRenderMembersDetail() {
    showMembersDetailLoading();
    clearMembersDetailLists();
    const token = localStorage.getItem('gymAdminToken');
    try {
      const members = await fetchMembers(token);
      const { newMembers, existingMembers } = splitMembersByJoinDate(members, 30);
      renderMembersDetailLists(newMembers, existingMembers);
      showMembersDetailContent();
    } catch (err) {
      showMembersDetailError(err);
    }
  }

  function showMembersDetailLoading() {
    if (membersDetailLoading) membersDetailLoading.style.display = 'block';
    if (membersDetailError) membersDetailError.style.display = 'none';
    if (membersDetailContent) membersDetailContent.style.display = 'none';
  }

  function clearMembersDetailLists() {
    if (newMembersList) newMembersList.innerHTML = '';
    if (existingMembersList) existingMembersList.innerHTML = '';
  }

  async function fetchMembers(token) {
    const res = await fetch('http://localhost:5000/api/members', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok || !Array.isArray(data.members)) {
      throw new Error(data.message || 'Failed to fetch members');
    }
    return data.members;
  }

  function splitMembersByJoinDate(members, days = 30) {
    const now = new Date();
    const newMembers = [];
    const existingMembers = [];
    members.forEach(member => {
      if (!member.joinDate) return existingMembers.push(member);
      const join = new Date(member.joinDate);
      const diffDays = (now - join) / (1000 * 60 * 60 * 24);
      if (diffDays <= days) newMembers.push(member);
      else existingMembers.push(member);
    });
    return { newMembers, existingMembers };
  }

  function renderMembersDetailLists(newMembers, existingMembers) {
    if (newMembersList) {
      newMembersList.innerHTML = newMembers.length
        ? newMembers.map(m => renderMemberListItem(m)).join('')
        : '<li style="color:#888;">No new members in last 30 days.</li>';
    }
    if (existingMembersList) {
      existingMembersList.innerHTML = existingMembers.length
        ? existingMembers.map(m => renderMemberListItem(m)).join('')
        : '<li style="color:#888;">No existing members.</li>';
    }
  }

  function showMembersDetailContent() {
    if (membersDetailLoading) membersDetailLoading.style.display = 'none';
    if (membersDetailContent) membersDetailContent.style.display = 'block';
  }

  function showMembersDetailError(err) {
    if (membersDetailLoading) membersDetailLoading.style.display = 'none';
    if (membersDetailError) {
      membersDetailError.textContent = err.message || 'Failed to load members.';
      membersDetailError.style.display = 'block';
    }
  }
  function renderMemberListItem(member) {
    // Mobile sidebar version: show plan as a badge and add member's email if available
    const img = member.profileImageUrl
      ? `<img src="${member.profileImageUrl}" alt="${member.name || member.memberName || ''}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;margin-right:10px;">`
      : `<span style="display:inline-block;width:36px;height:36px;border-radius:50%;background:#eee;margin-right:10px;"></span>`;
    const name = member.name || member.memberName || 'Member';
    const plan = member.planSelected || member.plan || '';
    const joinDate = member.joinDate ? new Date(member.joinDate).toLocaleDateString() : '';
    const email = member.email ? `<div style="font-size:0.90em;color:#1976d2;">${member.email}</div>` : '';
    return `<li style="display:flex;align-items:center;margin-bottom:10px;">${img}<div><div style="font-weight:500;">${name} <span style="background:#e3f2fd;color:#1976d2;border-radius:4px;padding:2px 6px;font-size:0.85em;margin-left:6px;">${plan}</span></div>${email}<div style="font-size:0.95em;color:#888;">${joinDate ? 'Joined: ' + joinDate : ''}</div></div></li>`;
  }
});
  // --- Mobile Sidebar Menu Link Logic ---
  // Map menu text to tab IDs (update as needed)
  const tabMap = {
    'Dashboard': 'dashboardTab',
    'Members': 'memberDisplayTab',
    'Attendance': 'attendanceTab',
    'Settings': 'settingsTab',
    // Add more mappings as you implement more tabs
  };
  // Get all mobile menu links
  const mobileMenuLinks = dropdown.querySelectorAll('.menu-link');
  mobileMenuLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      // Remove active from all
      mobileMenuLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      // Also update desktop sidebar highlight if present
      const desktopLinks = document.querySelectorAll('.sidebar .menu-link');
      desktopLinks.forEach(l => {
        if (l.textContent.trim() === link.textContent.trim()) {
          l.classList.add('active');
        } else {
          l.classList.remove('active');
        }
      });
      // Show/hide tabs
      const tabName = link.querySelector('.menu-text')?.textContent.trim();
      Object.entries(tabMap).forEach(([menu, tabId]) => {
        const tab = document.getElementById(tabId);
        if (tab) tab.style.display = (menu === tabName) ? 'block' : 'none';
      });
      // Hide dashboard content if not dashboard
      const dashboardContent = document.querySelector('.content');
      if (tabName === 'Dashboard') {
        hideAllMainTabs();
        if (dashboardContent) dashboardContent.style.display = 'block';
        updateMainContentMargins();
      } else if (tabName === 'Members') {
        hideAllMainTabs();
        const memberTab = document.getElementById('memberDisplayTab');
        if (memberTab) memberTab.style.display = 'block';
        updateMainContentMargins();
        if (typeof fetchAndDisplayMembers === 'function') fetchAndDisplayMembers();
      } else if (tabName === 'Attendance') {
        hideAllMainTabs();
        const attendanceTab = document.getElementById('attendanceTab');
        if (attendanceTab) attendanceTab.style.display = 'block';
        updateMainContentMargins();
        // Initialize attendance manager if it exists
        if (typeof window.attendanceManager !== 'undefined') {
          window.attendanceManager.loadData();
          window.attendanceManager.loadAttendanceForDate();
        }
      } else if (tabName === 'Settings') {
        hideAllMainTabs();
        const settingsTab = document.getElementById('settingsTab');
        if (settingsTab) settingsTab.style.display = 'block';
        updateMainContentMargins();
      } else {
        updateMainContentMargins();
      }
      // Close sidebar after click
      closeMobileSidebar();
    });
  });

  // On load and on resize, always update margins
  updateMainContentMargins();
  window.addEventListener('resize', updateMainContentMargins);
});
// === Dynamic New Members Section ===
document.addEventListener('DOMContentLoaded', function () {
  const newMembersTableBody = document.getElementById('newMembersTableBody');
  if (!newMembersTableBody) return;

  // Fetch new members from the last 7 days with auth
  const token = localStorage.getItem('gymAdminToken');
  fetch('/api/members/new', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
    .then(res => res.json())
    .then(members => {
      if (!Array.isArray(members) || members.length === 0) {
        newMembersTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No new members found.</td></tr>';
        return;
      }
      newMembersTableBody.innerHTML = '';
      members.forEach(member => {
        const tr = document.createElement('tr');
        // Profile image (robust fallback, avoid double /uploads/)
        let profileImg = 'https://via.placeholder.com/48x48.png?text=User';
        if (member.profileImage && member.profileImage !== '') {
          if (member.profileImage.startsWith('http')) {
            profileImg = member.profileImage;
          } else if (member.profileImage.startsWith('/uploads/')) {
            profileImg = member.profileImage;
          } else {
            profileImg = '/uploads/profile-pics/' + member.profileImage;
          }
        }
        // Format join date
        const joinDate = member.joinDate ? new Date(member.joinDate).toLocaleDateString() : 'N/A';
        // Name and plan (robust)
        const name = member.memberName || member.name || member.fullName || member.firstName || 'N/A';
        const plan = member.planSelected || member.plan || (member.membershipPlan?.name) || 'N/A';
        tr.innerHTML = `
          <td><img src="${profileImg}" alt="Profile" style="width:40px;height:40px;border-radius:50%;object-fit:cover;"></td>
          <td>${name}</td>
          <td>${joinDate}</td>
          <td>${plan}</td>
          <td><button class="action-btn edit" data-member-id="${member._id}"><i class="fas fa-edit"></i> Edit</button></td>
        `;
        newMembersTableBody.appendChild(tr);
      });
      // Add click event for edit buttons
      newMembersTableBody.querySelectorAll('.action-btn.edit').forEach(btn => {
        btn.addEventListener('click', function() {
          const memberId = this.getAttribute('data-member-id');
          // TODO: Open edit modal for memberId
          alert('Edit member: ' + memberId);
        });
      });
    })
    .catch(err => {
      newMembersTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:red;">Failed to load members.</td></tr>';
    });
});

// ===== SETTINGS TAB FUNCTIONALITY =====
document.addEventListener('DOMContentLoaded', function() {
  // Theme Management
  const themeOptions = document.querySelectorAll('.theme-option');
  const colorOptions = document.querySelectorAll('.color-option');

  // Load saved theme and color
  const savedTheme = localStorage.getItem('gymAdminTheme') || 'light';
  const savedColor = localStorage.getItem('gymAdminColor') || 'blue';

  // Apply saved theme and color
  applyTheme(savedTheme);
  applyColorScheme(savedColor);

  // Update UI to reflect saved theme
  themeOptions.forEach(option => {
    option.classList.toggle('active', option.dataset.theme === savedTheme);
    // Add click handler for theme selection
    option.addEventListener('click', function() {
      themeOptions.forEach(opt => opt.classList.remove('active'));
      this.classList.add('active');
      const theme = this.dataset.theme;
      applyTheme(theme);
      localStorage.setItem('gymAdminTheme', theme);
    });
  });

  // --- Enhanced Color Scheme Selector: always visible, interactive, horizontal ---
  const colorMap = {
    blue: '#1976d2',
    green: '#388e3c',
    purple: '#7b1fa2',
    orange: '#f57c00',
    red: '#d32f2f'
  };
  colorOptions.forEach(option => {
    const color = option.dataset.color;
    const circle = option.querySelector('.color-circle');
    if (circle) {
      circle.style.background = colorMap[color] || '#1976d2';
      circle.style.border = '2px solid #fff';
      circle.style.boxShadow = '0 1px 6px rgba(0,0,0,0.10)';
      circle.style.width = '28px';
      circle.style.height = '28px';
      circle.style.borderRadius = '50%';
      circle.style.display = 'inline-block';
      circle.style.transition = 'box-shadow 0.2s, border 0.2s';
      option.style.display = 'inline-block';
      option.style.marginRight = '18px';
      option.style.cursor = 'pointer';
      option.style.verticalAlign = 'middle';
    }
    // Set active state
    if (color === savedColor) {
      option.classList.add('active');
      if (circle) {
        circle.style.boxShadow = '0 0 0 3px var(--primary, #1976d2)';
        circle.style.border = '2px solid var(--primary, #1976d2)';
      }
    } else {
      option.classList.remove('active');
      if (circle) {
        circle.style.boxShadow = '0 1px 6px rgba(0,0,0,0.10)';
        circle.style.border = '2px solid #fff';
      }
    }
    // Hover effect
    option.addEventListener('mouseenter', function() {
      if (circle) {
        circle.style.boxShadow = '0 0 0 3px var(--primary-dark, #0056b3)';
        circle.style.border = '2px solid var(--primary-dark, #0056b3)';
      }
    });
    option.addEventListener('mouseleave', function() {
      if (option.classList.contains('active')) {
        if (circle) {
          circle.style.boxShadow = '0 0 0 3px var(--primary, #1976d2)';
          circle.style.border = '2px solid var(--primary, #1976d2)';
        }
      } else {
        if (circle) {
          circle.style.boxShadow = '0 1px 6px rgba(0,0,0,0.10)';
          circle.style.border = '2px solid #fff';
        }
      }
    });
    // Click handler
    option.addEventListener('click', function() {
      const color = this.dataset.color;
      // Update active state
      colorOptions.forEach(opt => {
        opt.classList.remove('active');
        const c = opt.querySelector('.color-circle');
        if (c) {
          c.style.boxShadow = '0 1px 6px rgba(0,0,0,0.10)';
          c.style.border = '2px solid #fff';
        }
      });
      this.classList.add('active');
      if (circle) {
        circle.style.boxShadow = '0 0 0 3px var(--primary, #1976d2)';
        circle.style.border = '2px solid var(--primary, #1976d2)';
      }
      // Apply color scheme
      applyColorScheme(color);
      // Save preference
      localStorage.setItem('gymAdminColor', color);
    });
  });
  
  // Settings action handlers
  document.getElementById('saveSettingsBtn')?.addEventListener('click', saveAllSettings);
  document.getElementById('resetSettingsBtn')?.addEventListener('click', resetSettings);
  document.getElementById('changePasswordBtn')?.addEventListener('click', openChangePasswordModal);
  document.getElementById('updateProfileBtn')?.addEventListener('click', openUpdateProfileModal);
  
  // Data export handlers
  document.getElementById('exportMembersBtn')?.addEventListener('click', () => exportData('members'));
  document.getElementById('exportPaymentsBtn')?.addEventListener('click', () => exportData('payments'));
  document.getElementById('exportAttendanceBtn')?.addEventListener('click', () => exportData('attendance'));
  
  // Operating hours handlers
  setupOperatingHoursHandlers();
  
  // Load and apply saved settings
  loadSavedSettings();
});

function applyTheme(theme) {
  const root = document.documentElement;
  
  if (theme === 'dark') {
    root.style.setProperty('--bg-primary', '#18191a');
    root.style.setProperty('--bg-secondary', '#23272f');
    root.style.setProperty('--card-bg', '#23272f');
    root.style.setProperty('--text-primary', '#ffffff');
    root.style.setProperty('--text-secondary', '#cccccc');
    root.style.setProperty('--border-color', '#33363d');
    root.style.setProperty('--border-light', '#23272f');
    root.style.setProperty('--bg-light', '#23272f');
    // Make all text white for visibility
    document.body.style.background = '#18191a';
    document.body.style.color = '#fff';
    // Set all headings, paragraphs, links, labels, etc. to white
    const allTextEls = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, label, li, th, td, .menu-text, .stat-title, .stat-value, .stat-change, .member-detail-label, .plan-badge, .edit-input, .sidebar, .sidebar .menu-link, .sidebar .menu-link .fa, .content, .modal-content, .modal, .tab-title, .tab-header, .tab-content, .quick-action, .info-list, .member-name, .member-id, .member-detail-title, .member-detail-modal, .profile-pic, .stat-card, .toggle-switch, .toggle-switch input, .toggle-switch label, .theme-option, .color-option, .settings-section, .settings-label, .settings-value, .settings-row, .settings-tab, .settings-content, .settings-header, .settings-title, .settings-description, .settings-group, .settings-btn, .settings-btn-primary, .settings-btn-secondary, .settings-btn-danger, .settings-btn-warning, .settings-btn-info, .settings-btn-success, .settings-btn-light, .settings-btn-dark, .settings-btn-outline, .settings-btn-link, .settings-btn-block, .settings-btn-lg, .settings-btn-sm, .settings-btn-xs, .settings-btn-icon, .settings-btn-circle, .settings-btn-square, .settings-btn-pill, .settings-btn-round, .settings-btn-flat, .settings-btn-ghost, .settings-btn-shadow, .settings-btn-gradient, .settings-btn-glow, .settings-btn-inverse, .settings-btn-transparent, .settings-btn-borderless, .settings-btn-text, .settings-btn-label, .settings-btn-value, .settings-btn-group, .settings-btn-toolbar, .settings-btn-dropdown, .settings-btn-toggle, .settings-btn-switch, .settings-btn-radio, .settings-btn-checkbox, .settings-btn-segment, .settings-btn-step, .settings-btn-progress, .settings-btn-spinner, .settings-btn-badge, .settings-btn-dot, .settings-btn-icon-left, .settings-btn-icon-right, .settings-btn-icon-top, .settings-btn-icon-bottom, .settings-btn-icon-only, .settings-btn-icon-text, .settings-btn-text-icon, .settings-btn-label-icon, .settings-btn-value-icon, .settings-btn-group-icon, .settings-btn-toolbar-icon, .settings-btn-dropdown-icon, .settings-btn-toggle-icon, .settings-btn-switch-icon, .settings-btn-radio-icon, .settings-btn-checkbox-icon, .settings-btn-segment-icon, .settings-btn-step-icon, .settings-btn-progress-icon, .settings-btn-spinner-icon, .settings-btn-badge-icon, .settings-btn-dot-icon');
    allTextEls.forEach(el => {
      el.style.color = '#fff';
    });
    // Set all links to white
    const allLinks = document.querySelectorAll('a');
    allLinks.forEach(a => {
      a.style.color = '#fff';
    });
    // Set all dashboard containers, cards, and sections to dark backgrounds
    const darkBgEls = document.querySelectorAll(`
      .stat-card,
      .content,
      .modal-content,
      .tab-content,
      .settings-section,
      .settings-tab,
      .settings-content,
      .settings-header,
      .settings-row,
      .settings-group,
      .dashboard-section,
      .dashboard-container,
      .dashboard-card,
      .card-bg,
      .section-bg,
      .admin-section,
      .admin-container,
      .admin-card,
      .quick-actions,
      .quick-action,
      .activities-offered,
      .activities-section,
      .activities-list,
      .gym-info,
      .gym-info-section,
      .membership-plan,
      .membership-plan-section,
      .membership-plans,
      .new-members,
      .new-members-section,
      .recent-activity,
      .recent-activity-section,
      .attendance-chart,
      .attendance-chart-section,
      .equipment-gallery,
      .equipment-gallery-section
    `);
    darkBgEls.forEach(el => {
      // Use a lighter dark/greyish shade for all cards/sections for contrast
      if (
        el.classList.contains('stat-card') ||
        el.classList.contains('dashboard-card') ||
        el.classList.contains('card-bg') ||
        el.classList.contains('modal-content') ||
        el.classList.contains('tab-content') ||
        el.classList.contains('settings-section') ||
        el.classList.contains('admin-card') ||
        el.classList.contains('quick-actions') ||
        el.classList.contains('activities-offered') ||
        el.classList.contains('activities-section') ||
        el.classList.contains('activities-list') ||
        el.classList.contains('quick-action-card') ||
        el.classList.contains('activities-offered-card') ||
        el.classList.contains('membership-plans-section') ||
        el.classList.contains('membership-plans') ||
        el.classList.contains('membership-plan-section') ||
        el.classList.contains('membership-plan') ||
        el.classList.contains('card') ||
        el.classList.contains('card-header') ||
        el.classList.contains('card-body') ||
        el.classList.contains('gym-info-card') ||
        el.classList.contains('gym-info-section') ||
        el.classList.contains('plans-list') ||
        el.classList.contains('main-content') ||
        el.classList.contains('dashboard-row') ||
        el.classList.contains('main-grid') ||
        el.classList.contains('left-column') ||
        el.classList.contains('right-column') ||
        el.id === 'membershipPlansSection' ||
        el.id === 'photoGridSection' ||
        el.id === 'newMembersCard'
      ) {
        el.style.background = '#23262b'; // slightly lighter black for all cards/sections
        el.style.backgroundColor = '#23262b';
        el.style.boxShadow = '0 2px 16px 0 rgba(0,0,0,0.18)';
        el.style.borderColor = '#3a3f4b';
        el.style.color = '#fff';
      } else {
        el.style.background = '#18191a';
        el.style.backgroundColor = '#18191a';
        el.style.boxShadow = 'none';
        el.style.borderColor = '#33363d';
        el.style.color = '#fff';
      }
    });
    // Force all card titles, headers, and section headings to white
    const cardTitles = document.querySelectorAll('.card-title, .card-header h2, .card-header h1, .gym-info-section-title, .page-title, .card-header, .card-header h3');
    cardTitles.forEach(h => { h.style.color = '#fff'; });
    // Card header backgrounds
    const cardHeaders = document.querySelectorAll('.card-header');
    cardHeaders.forEach(h => { h.style.background = 'transparent'; h.style.backgroundColor = 'transparent'; });
    // Card body backgrounds
    const cardBodies = document.querySelectorAll('.card-body, .plans-list, .activities-list, .gym-info-content, .table-responsive, .equipment-gallery, .activity-list, .chart-container');
    cardBodies.forEach(b => { b.style.background = 'transparent'; b.style.backgroundColor = 'transparent'; b.style.color = '#fff'; });
    // Table backgrounds
    const tables = document.querySelectorAll('table, thead, tbody, tr, th, td');
    tables.forEach(t => { t.style.background = 'transparent'; t.style.backgroundColor = 'transparent'; t.style.color = '#fff'; });
    // Modal backgrounds
    const modals = document.querySelectorAll('.modal, .modal-content');
    modals.forEach(m => { m.style.background = '#23262b'; m.style.backgroundColor = '#23262b'; m.style.color = '#fff'; });
    // Button styles: use default (light) styles in dark mode for contrast
    const allBtns = document.querySelectorAll('button, .btn, .upload-photo-btn');
    allBtns.forEach(btn => {
      btn.style.background = '';
      btn.style.color = '';
      btn.style.border = '';
      btn.style.boxShadow = '';
      btn.onmouseenter = null;
      btn.onmouseleave = null;
    });
    // Quick action buttons: use primary color with white icons/text in dark mode
    const qaBtns = document.querySelectorAll('.quick-action-btn');
    qaBtns.forEach(btn => {
      btn.style.background = 'var(--primary)';
      btn.style.color = '#fff';
      btn.style.border = 'none';
      btn.style.boxShadow = '0 2px 8px 0 rgba(0,0,0,0.10)';
      // Style icons inside button
      const icon = btn.querySelector('i');
      if (icon) icon.style.color = '#fff';
      btn.onmouseenter = function() {
        btn.style.background = 'var(--primary-dark)';
      };
      btn.onmouseleave = function() {
        btn.style.background = 'var(--primary)';
      };
    });

    // Activity badges: use primary color with white icon/text in dark mode
    const activityBadges = document.querySelectorAll('.activity-badge');
    activityBadges.forEach(badge => {
      badge.style.setProperty('background', 'var(--primary)', 'important');
      badge.style.setProperty('color', '#fff', 'important');
      badge.style.setProperty('border', 'none', 'important');
      badge.style.setProperty('box-shadow', '0 2px 8px 0 rgba(0,0,0,0.10)', 'important');
      // Style icon inside badge
      const icon = badge.querySelector('.activity-icon');
      if (icon) icon.style.setProperty('color', '#fff', 'important');
      badge.onmouseenter = function() {
        badge.style.setProperty('background', 'var(--primary-dark)', 'important');
        if (icon) icon.style.setProperty('color', '#fff', 'important');
      };
      badge.onmouseleave = function() {
        badge.style.setProperty('background', 'var(--primary)', 'important');
        if (icon) icon.style.setProperty('color', '#fff', 'important');
      };
    });
    // Inputs and selects
    const allInputs = document.querySelectorAll('input, select, textarea');
    allInputs.forEach(inp => {
      inp.style.background = '#23262b';
      inp.style.color = '#fff';
      inp.style.border = '1px solid #3a3f4b';
    });
    // Misc: Remove any white backgrounds from .card, .modal, .main-content, .dashboard, .dashboard-row, .main-grid, .left-column, .right-column
    const miscBgEls = document.querySelectorAll('.card, .modal, .main-content, .dashboard, .dashboard-row, .main-grid, .left-column, .right-column');
    miscBgEls.forEach(el => {
      el.style.background = '#23262b';
      el.style.backgroundColor = '#23262b';
      el.style.color = '#fff';
    });
    // Extra: force quick action and activities headings to white
    const qaHeadings = document.querySelectorAll('.quick-actions h2, .quick-action h2, .activities-offered h2, .activities-section h2, .activities-list h2');
    qaHeadings.forEach(h => { h.style.color = '#fff'; });
  } else if (theme === 'auto') {
    // Auto theme based on system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(prefersDark ? 'dark' : 'light');
    return;
  } else {
    // Light theme (default)
    root.style.setProperty('--bg-primary', '#ffffff');
    root.style.setProperty('--bg-secondary', '#f8f9fa');
    root.style.setProperty('--card-bg', '#ffffff');
    root.style.setProperty('--text-primary', '#333333');
    root.style.setProperty('--text-secondary', '#666666');
    root.style.setProperty('--border-color', '#e0e0e0');
    root.style.setProperty('--border-light', '#f0f0f0');
    root.style.setProperty('--bg-light', '#f8f9fa');
    // Reset text color for all elements
    document.body.style.background = '#fff';
    document.body.style.color = '#333';
    const allTextEls = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, label, li, th, td, .menu-text, .stat-title, .stat-value, .stat-change, .member-detail-label, .plan-badge, .edit-input, .sidebar, .sidebar .menu-link, .sidebar .menu-link .fa, .content, .modal-content, .modal, .tab-title, .tab-header, .tab-content, .quick-action, .info-list, .member-name, .member-id, .member-detail-title, .member-detail-modal, .profile-pic, .stat-card, .toggle-switch, .toggle-switch input, .toggle-switch label, .theme-option, .color-option, .settings-section, .settings-label, .settings-value, .settings-row, .settings-tab, .settings-content, .settings-header, .settings-title, .settings-description, .settings-group, .settings-btn, .settings-btn-primary, .settings-btn-secondary, .settings-btn-danger, .settings-btn-warning, .settings-btn-info, .settings-btn-success, .settings-btn-light, .settings-btn-dark, .settings-btn-outline, .settings-btn-link, .settings-btn-block, .settings-btn-lg, .settings-btn-sm, .settings-btn-xs, .settings-btn-icon, .settings-btn-circle, .settings-btn-square, .settings-btn-pill, .settings-btn-round, .settings-btn-flat, .settings-btn-ghost, .settings-btn-shadow, .settings-btn-gradient, .settings-btn-glow, .settings-btn-inverse, .settings-btn-transparent, .settings-btn-borderless, .settings-btn-text, .settings-btn-label, .settings-btn-value, .settings-btn-group, .settings-btn-toolbar, .settings-btn-dropdown, .settings-btn-toggle, .settings-btn-switch, .settings-btn-radio, .settings-btn-checkbox, .settings-btn-segment, .settings-btn-step, .settings-btn-progress, .settings-btn-spinner, .settings-btn-badge, .settings-btn-dot, .settings-btn-icon-left, .settings-btn-icon-right, .settings-btn-icon-top, .settings-btn-icon-bottom, .settings-btn-icon-only, .settings-btn-icon-text, .settings-btn-text-icon, .settings-btn-label-icon, .settings-btn-value-icon, .settings-btn-group-icon, .settings-btn-toolbar-icon, .settings-btn-dropdown-icon, .settings-btn-toggle-icon, .settings-btn-switch-icon, .settings-btn-radio-icon, .settings-btn-checkbox-icon, .settings-btn-segment-icon, .settings-btn-step-icon, .settings-btn-progress-icon, .settings-btn-spinner-icon, .settings-btn-badge-icon, .settings-btn-dot-icon');
    allTextEls.forEach(el => {
      el.style.color = '';
    });
    const allLinks = document.querySelectorAll('a');
    allLinks.forEach(a => {
      a.style.color = '';
    });
  }
  document.body.setAttribute('data-theme', theme);
}

function applyColorScheme(color) {
  const root = document.documentElement;
  const colorSchemes = {
    blue: { primary: '#007bff', primaryDark: '#0056b3', success: '#28a745', warning: '#ffc107', danger: '#dc3545' },
    green: { primary: '#28a745', primaryDark: '#1e7e34', success: '#20c997', warning: '#ffc107', danger: '#dc3545' },
    purple: { primary: '#6f42c1', primaryDark: '#5a32a3', success: '#28a745', warning: '#ffc107', danger: '#dc3545' },
    orange: { primary: '#fd7e14', primaryDark: '#e55a00', success: '#28a745', warning: '#ffc107', danger: '#dc3545' },
    red: { primary: '#dc3545', primaryDark: '#c82333', success: '#28a745', warning: '#ffc107', danger: '#e74c3c' }
  };
  
  const scheme = colorSchemes[color];
  if (scheme) {
    Object.entries(scheme).forEach(([key, value]) => {
      // Use --primary for primary, --primary-dark for primaryDark, etc.
      let cssVar = '--' + key.replace(/([A-Z])/g, '-$1').toLowerCase();
      // Special case: primaryDark should be --primary-dark
      if (key === 'primaryDark') cssVar = '--primary-dark';
      root.style.setProperty(cssVar, value);
    });
  }
}

function saveAllSettings() {
  const settings = {
    theme: document.querySelector('.theme-option.active')?.dataset.theme || 'light',
    color: document.querySelector('.color-option.active')?.dataset.color || 'blue',
    notifications: {
      newMembers: document.getElementById('newMemberNotif')?.checked || false,
      payments: document.getElementById('paymentNotif')?.checked || false,
      trainers: document.getElementById('trainerNotif')?.checked || false,
      email: document.getElementById('emailNotif')?.checked || false
    },
    services: {
      onlineBooking: document.getElementById('onlineBooking')?.checked || false,
      personalTraining: document.getElementById('personalTraining')?.checked || false,
      groupClasses: document.getElementById('groupClasses')?.checked || false,
      equipmentReservation: document.getElementById('equipmentReservation')?.checked || false,
      memberCheckin: document.getElementById('memberCheckin')?.checked || false
    },
    security: {
      twoFactorAuth: document.getElementById('twoFactorAuth')?.checked || false,
      loginAlerts: document.getElementById('loginAlerts')?.checked || false
    },
    operatingHours: getOperatingHours()
  };
  
  // Save to localStorage
  localStorage.setItem('gymAdminSettings', JSON.stringify(settings));
  
  // Show success message
  showNotification('Settings saved successfully!', 'success');
}

function resetSettings() {
  if (confirm('Are you sure you want to reset all settings to default?')) {
    // Clear saved settings
    localStorage.removeItem('gymAdminSettings');
    localStorage.removeItem('gymAdminTheme');
    localStorage.removeItem('gymAdminColor');
    
    // Reset UI to defaults
    applyTheme('light');
    applyColorScheme('blue');
    
    // Reset all toggles and inputs
    document.querySelectorAll('.toggle-switch input').forEach(input => {
      input.checked = input.id.includes('newMemberNotif') || 
                      input.id.includes('paymentNotif') || 
                      input.id.includes('trainerNotif') ||
                      input.id.includes('onlineBooking') ||
                      input.id.includes('personalTraining') ||
                      input.id.includes('groupClasses') ||
                      input.id.includes('memberCheckin') ||
                      input.id.includes('loginAlerts');
    });
    
    // Reset theme and color selections
    document.querySelectorAll('.theme-option').forEach(opt => {
      opt.classList.toggle('active', opt.dataset.theme === 'light');
    });
    
    document.querySelectorAll('.color-option').forEach(opt => {
      opt.classList.toggle('active', opt.dataset.color === 'blue');
    });
    
    showNotification('Settings reset to defaults!', 'info');
  }
}

function loadSavedSettings() {
  const saved = localStorage.getItem('gymAdminSettings');
  if (saved) {
    try {
      const settings = JSON.parse(saved);
      
      // Apply notification settings
      if (settings.notifications) {
        Object.entries(settings.notifications).forEach(([key, value]) => {
          const element = document.getElementById(key === 'newMembers' ? 'newMemberNotif' : 
                                              key === 'payments' ? 'paymentNotif' :
                                              key === 'trainers' ? 'trainerNotif' : 'emailNotif');
          if (element) element.checked = value;
        });
      }
      
      // Apply service settings
      if (settings.services) {
        Object.entries(settings.services).forEach(([key, value]) => {
          const element = document.getElementById(key);
          if (element) element.checked = value;
        });
      }
      
      // Apply security settings
      if (settings.security) {
        Object.entries(settings.security).forEach(([key, value]) => {
          const element = document.getElementById(key);
          if (element) element.checked = value;
        });
      }
      
      // Apply operating hours
      if (settings.operatingHours) {
        setOperatingHours(settings.operatingHours);
      }
      
    } catch (e) {
      console.error('Error loading settings:', e);
    }
  }
}

function getOperatingHours() {
  const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const hours = {};
  
  days.forEach(day => {
    const openTime = document.getElementById(`${day}Open`)?.value;
    const closeTime = document.getElementById(`${day}Close`)?.value;
    const isClosed = document.getElementById(`${day}Closed`)?.checked;
    
    hours[day] = {
      open: openTime,
      close: closeTime,
      closed: isClosed
    };
  });
  
  return hours;
}

function setOperatingHours(hours) {
  Object.entries(hours).forEach(([day, schedule]) => {
    const openInput = document.getElementById(`${day}Open`);
    const closeInput = document.getElementById(`${day}Close`);
    const closedInput = document.getElementById(`${day}Closed`);
    
    if (openInput) openInput.value = schedule.open || '06:00';
    if (closeInput) closeInput.value = schedule.close || '22:00';
    if (closedInput) closedInput.checked = schedule.closed || false;
  });
}

function setupOperatingHoursHandlers() {
  const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  
  days.forEach(day => {
    const closedCheckbox = document.getElementById(`${day}Closed`);
    const openInput = document.getElementById(`${day}Open`);
    const closeInput = document.getElementById(`${day}Close`);
    
    if (closedCheckbox) {
      closedCheckbox.addEventListener('change', function() {
        if (openInput) openInput.disabled = this.checked;
        if (closeInput) closeInput.disabled = this.checked;
      });
    }
  });
}

function exportData(type) {
  // Placeholder for data export functionality
  showNotification(`Exporting ${type} data...`, 'info');
  
  // In a real implementation, this would call an API endpoint
  setTimeout(() => {
    showNotification(`${type.charAt(0).toUpperCase() + type.slice(1)} data exported successfully!`, 'success');
  }, 2000);
}

function openChangePasswordModal() {
  // Placeholder for change password modal
  alert('Change password functionality would be implemented here');
}

function openUpdateProfileModal() {
  // Placeholder for update profile modal
  alert('Update profile functionality would be implemented here');
}

function showNotification(message, type = 'info') {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    border-radius: 8px;
    color: white;
    font-weight: 600;
    z-index: 10000;
    transform: translateX(400px);
    transition: transform 0.3s ease;
  `;
  
  // Set background color based on type
  const colors = {
    success: '#28a745',
    error: '#dc3545',
    warning: '#ffc107',
    info: '#007bff'
  };
  notification.style.backgroundColor = colors[type] || colors.info;
  
  notification.textContent = message;
  document.body.appendChild(notification);
  
  // Animate in
  setTimeout(() => {
    notification.style.transform = 'translateX(0)';
  }, 100);
  
  // Remove after 3 seconds
  setTimeout(() => {
    notification.style.transform = 'translateX(400px)';
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 300);
  }, 3000);
}