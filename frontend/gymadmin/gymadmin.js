// === Dynamic Activities Offered Section ===
document.addEventListener('DOMContentLoaded', function() {
  // --- State ---
  let allPossibleActivities = [
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
      currentActivities = Array.isArray(data.activities) ? data.activities : [];
      selectedActivities = currentActivities.map(a => a.name);
      renderActivitiesList();
    } catch (err) {
      if (activitiesList) activitiesList.innerHTML = '<div style="color:#b71c1c;">Failed to load activities.</div>';
    }
  }

  // --- Render Activities in Dashboard ---
  function renderActivitiesList() {
    if (!activitiesList) return;
    if (!currentActivities.length) {
      activitiesList.innerHTML = '<div style="color:#888;font-size:1em;">No activities added yet.</div>';
      return;
    }
    activitiesList.innerHTML = '<div class="activities-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:12px;">' +
      currentActivities.map(a => `
        <div class="activity-badge" tabindex="0" style="background:#f5f5f5;border-radius:10px;padding:14px 8px;display:flex;flex-direction:column;align-items:center;cursor:pointer;transition:box-shadow 0.2s;" title="${a.description}">
          <i class="fas ${a.icon}" style="font-size:1.7em;color:#1976d2;margin-bottom:6px;"></i>
          <span style="font-size:1em;font-weight:600;">${a.name}</span>
        </div>
      `).join('') + '</div>';
    // Show description on click
    Array.from(activitiesList.querySelectorAll('.activity-badge')).forEach((el, idx) => {
      el.onclick = () => {
        showDialog({
          title: currentActivities[idx].name,
          message: currentActivities[idx].description,
          iconHtml: `<i class='fas ${currentActivities[idx].icon}' style='font-size:2em;color:#1976d2;'></i>`
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
      // Compose selected activity objects
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
function showDialog({ title = '', message = '', confirmText = 'OK', iconHtml = '', onConfirm = null }) {
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
  dialog.style.background = 'rgba(0,0,0,0.25)';
  dialog.style.display = 'flex';
  dialog.style.alignItems = 'center';
  dialog.style.justifyContent = 'center';
  dialog.style.zIndex = '99999';
  dialog.innerHTML = `
    <div style="background:#fff;max-width:350px;width:90vw;padding:28px 22px 18px 22px;border-radius:12px;box-shadow:0 4px 32px rgba(0,0,0,0.18);text-align:center;position:relative;">
      <div style="margin-bottom:12px;">${iconHtml || ''}</div>
      <div style="font-size:1.18em;font-weight:700;margin-bottom:8px;">${title}</div>
      <div style="font-size:1em;color:#444;margin-bottom:18px;white-space:pre-line;">${message}</div>
      <button id="dialogConfirmBtn" style="background:#1976d2;color:#fff;padding:8px 24px;border:none;border-radius:6px;font-size:1em;cursor:pointer;">${confirmText}</button>
    </div>
  `;
  document.body.appendChild(dialog);
  document.body.style.overflow = 'hidden';
  dialog.querySelector('#dialogConfirmBtn').onclick = function() {
    dialog.remove();
    document.body.style.overflow = '';
    if (typeof onConfirm === 'function') onConfirm();
  };
  dialog.addEventListener('mousedown', function(e) {
    if (e.target === dialog) {
      dialog.remove();
      document.body.style.overflow = '';
    }
  });
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
      if (addTrainerBtn) addTrainerBtn.removeAttribute('style');
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
      btn.addEventListener('click', function() {
        const idx = +this.getAttribute('data-plan-idx');
        const icon = this.getAttribute('data-icon');
        plans[idx].icon = icon;
        renderPlanEditorCards();
        // Keep picker open after icon change
        setTimeout(() => showIconColorPicker(idx), 0);
      });
    });
    // Color picker event
    planEditorCards.querySelectorAll('.plan-color-input').forEach(input => {
      input.addEventListener('input', function() {
        const idx = +this.getAttribute('data-plan-idx');
        plans[idx].color = this.value;
        renderPlanEditorCards();
        // Keep picker open after color change
        setTimeout(() => {
          const picker = document.getElementById('iconColorPickerWrap' + idx);
          if (picker) picker.style.display = 'block';
        }, 0);
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
        const idx = +this.getAttribute('data-plan-idx');
        const icon = this.getAttribute('data-icon');
        plans[idx].icon = icon;
        renderPlanEditorCards();
      });
    });
    // Color picker event
    planEditorCards.querySelectorAll('.plan-color-input').forEach(input => {
      input.addEventListener('input', function() {
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
  // END of renderPlanEditorCards
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
          (m.email && m.email.toLowerCase().includes(f)) ||
          (m.membershipId && m.membershipId.toLowerCase().includes(f))
        );
      }
      if (!filtered.length) {
        list.innerHTML = '<div style="color:#888;text-align:center;">No members found.</div>';
        document.getElementById('confirmCustomRemoveBtn').disabled = true;
        return;
      }
      list.innerHTML = filtered.map(m => `
        <label style="display:flex;align-items:center;padding:6px 12px;cursor:pointer;">
          <input type="checkbox" class="custom-remove-checkbox" value="${m._id}" style="margin-right:10px;">
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
                body: JSON.stringify({ memberIds: selected })
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
// --- Unified Add Member Modal Logic (Dashboard Quick Action & Member Tab) ---
document.addEventListener('DOMContentLoaded', function() {
  const addMemberBtn = document.getElementById('addMemberBtn'); // Dashboard quick action
  const addMemberBtnTab = document.getElementById('addMemberBtnTab'); // Member tab button
  const addMemberModal = document.getElementById('addMemberModal');
  const closeAddMemberModal = document.getElementById('closeAddMemberModal');
  const addMemberForm = document.getElementById('addMemberForm');
  const addMemberSuccessMsg = document.getElementById('addMemberSuccessMsg');
  const memberProfileImageInput = document.getElementById('memberProfileImage');
  const memberImageTag = document.getElementById('memberImageTag');

  // --- Membership Plan Logic ---
  let plansCache = [];
  const planSelected = document.getElementById('planSelected');
  const monthlyPlan = document.getElementById('monthlyPlan');
  const paymentAmount = document.getElementById('paymentAmount');
  // Discount info UI
  let discountInfoDiv = document.getElementById('discountInfoDiv');
  if (!discountInfoDiv && paymentAmount && paymentAmount.parentNode) {
    discountInfoDiv = document.createElement('div');
    discountInfoDiv.id = 'discountInfoDiv';
    discountInfoDiv.style = 'margin-top:4px;font-size:0.98em;color:#1976d2;';
    paymentAmount.parentNode.appendChild(discountInfoDiv);
  }

  async function fetchPlansForModal() {
    const token = localStorage.getItem('gymAdminToken');
    try {
      const res = await fetch('/api/gyms/membership-plans', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch plans');
      plansCache = await res.json();
    } catch (err) {
      plansCache = [];
      console.error('Error fetching plans:', err);
    }
  }

  function updatePlanOptions() {
    if (planSelected && plansCache.length) {
      planSelected.innerHTML = '<option value="">Select</option>' + plansCache.map(p => `<option value="${p.name}">${p.name}</option>`).join('');
    }
  }

  function updatePaymentAmountAndDiscount() {
    if (!planSelected || !monthlyPlan || !paymentAmount) return;
    const selectedPlanName = planSelected.value;
    const selectedMonthsText = monthlyPlan.options[monthlyPlan.selectedIndex]?.text || '';
    let selectedMonths = 1;
    if (/6/i.test(selectedMonthsText)) selectedMonths = 6;
    else if (/12/i.test(selectedMonthsText)) selectedMonths = 12;
    else if (/3/i.test(selectedMonthsText)) selectedMonths = 3;
    // Find plan in cache
    const plan = plansCache.find(p => p.name === selectedPlanName);
    if (!plan) {
      paymentAmount.value = '';
      if (discountInfoDiv) discountInfoDiv.textContent = '';
      return;
    }
    let baseAmount = plan.price * selectedMonths;
    let discount = 0;
    let discountText = '';
    if (plan.discount && plan.discountMonths && selectedMonths >= plan.discountMonths) {
      discount = plan.discount;
      const discountedAmount = Math.round(baseAmount * (1 - discount / 100));
      paymentAmount.value = discountedAmount;
      discountText = `Discount: ${discount}% off for ${plan.discountMonths}+ months. Original: ₹${baseAmount}, Now: ₹${discountedAmount}`;
    } else {
      paymentAmount.value = baseAmount;
      discountText = '';
    }
    if (discountInfoDiv) discountInfoDiv.textContent = discountText;
  }

  // Helper to open modal (now fetches plans and updates UI)
  async function openAddMemberModal() {
    if (addMemberModal) {
      addMemberModal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
      if (addMemberSuccessMsg) addMemberSuccessMsg.style.display = 'none';
      if (addMemberForm) addMemberForm.reset();
      if (memberImageTag) memberImageTag.src = 'https://via.placeholder.com/96?text=Photo';
      await fetchPlansForModal();
      updatePlanOptions();
      updatePaymentAmountAndDiscount();
    }
  }
  // Helper to close modal
  function closeAddMemberModalFunc() {
    if (addMemberModal) addMemberModal.style.display = 'none';
    document.body.style.overflow = '';
    if (addMemberSuccessMsg) addMemberSuccessMsg.style.display = 'none';
    if (addMemberForm) addMemberForm.reset();
    if (memberImageTag) memberImageTag.src = 'https://via.placeholder.com/96?text=Photo';
  }

  // Open modal from dashboard quick action
  if (addMemberBtn && addMemberModal) {
    addMemberBtn.addEventListener('click', function(e) {
      e.preventDefault();
      openAddMemberModal();
    });
  }
  // Open modal from member tab button
  if (addMemberBtnTab && addMemberModal) {
    addMemberBtnTab.addEventListener('click', function(e) {
      e.preventDefault();
      openAddMemberModal();
    });
  }
  // Update payment amount and discount when plan or months changes
  if (planSelected) planSelected.addEventListener('change', updatePaymentAmountAndDiscount);
  if (monthlyPlan) monthlyPlan.addEventListener('change', updatePaymentAmountAndDiscount);
  // Also update on modal open
  if (addMemberModal) {
    addMemberModal.addEventListener('show', updatePaymentAmountAndDiscount);
  }
  // Close modal on close button
  if (closeAddMemberModal && addMemberModal) {
    closeAddMemberModal.addEventListener('click', closeAddMemberModalFunc);
  }
  // Close modal if clicking outside modal-content
  if (addMemberModal) {
    addMemberModal.addEventListener('mousedown', function(e) {
      if (e.target === addMemberModal) closeAddMemberModalFunc();
    });
  }

  // Image upload logic
  const uploadMemberImageBtn = document.getElementById('uploadMemberImageBtn');
  if (uploadMemberImageBtn && memberProfileImageInput) {
    uploadMemberImageBtn.addEventListener('click', function() {
      memberProfileImageInput.click();
    });
  }
  if (memberProfileImageInput && memberImageTag) {
    memberProfileImageInput.addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function(evt) {
          memberImageTag.src = evt.target.result;
        };
        reader.readAsDataURL(file);
      } else {
        memberImageTag.src = 'https://via.placeholder.com/96?text=Photo';
      }
    });
  }

  // Handle form submit (with image, membership ID, and email notification)
  if (addMemberForm) {
    addMemberForm.onsubmit = async function(e) {
      e.preventDefault();
      const token = localStorage.getItem('gymAdminToken');
      if (!token) {
        alert('You must be logged in as a gym admin.');
        return;
      }
      const formData = prepareMemberFormData(addMemberForm);
      const { gymName, plan, monthlyPlan, memberEmail, memberName, membershipId, validDate } = getMemberFormMeta(formData);
      try {
        const res = await fetch('http://localhost:5000/api/members', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        });
        const data = await res.json();
        if (res.ok) {
          sendMembershipEmail({ token, memberEmail, memberName, membershipId, plan, monthlyPlan, validDate, gymName });
          showAddMemberSuccess(addMemberSuccessMsg, membershipId, addMemberForm, memberImageTag, closeAddMemberModalFunc);
        } else {
          showAddMemberError(addMemberSuccessMsg, data.message || 'Failed to add member.');
        }
      } catch (err) {
        showAddMemberError(addMemberSuccessMsg, 'Server error. Please try again.');
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
      const gymName = (window.currentGymProfile && (window.currentGymProfile.gymName || window.currentGymProfile.name)) ? (window.currentGymProfile.gymName || window.currentGymProfile.name) : 'GYM';
      const plan = formData.get('planSelected') || 'PLAN';
      const monthlyPlan = formData.get('monthlyPlan') || '';
      const memberEmail = formData.get('memberEmail') || '';
      const memberName = formData.get('memberName') || '';
      const now = new Date();
      const ym = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}`;
      // Use a more unique random string for membership ID (alphanumeric, 6 chars)
      const random = Math.random().toString(36).substring(2, 8).toUpperCase();
      const gymShort = gymName.replace(/[^A-Za-z0-9]/g, '').substring(0,6).toUpperCase();
      const planShort = plan.replace(/[^A-Za-z0-9]/g, '').substring(0,6).toUpperCase();
      const membershipId = `${gymShort}-${ym}-${planShort}-${random}`;
      formData.append('membershipId', membershipId);
      let validDate = '';
      let months = 1;
      if (/3\s*Month/i.test(monthlyPlan)) months = 3;
      else if (/6\s*Month/i.test(monthlyPlan)) months = 6;
      else if (/12\s*Month/i.test(monthlyPlan)) months = 12;
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
      }).catch((err) => {
        console.error('Failed to send membership email:', err);
      });
    }

    function showAddMemberSuccess(msgElem, membershipId, form, imgTag, closeModalFunc) {
      if (msgElem) {
        msgElem.textContent = `Member added! Membership ID: ${membershipId}`;
        msgElem.style.display = 'block';
      }
      form.reset();
      if (imgTag) imgTag.src = 'https://via.placeholder.com/96?text=Photo';
      setTimeout(() => {
        closeModalFunc();
      }, 1500);
    }

    function showAddMemberError(msgElem, message) {
      if (msgElem) {
        msgElem.textContent = message;
        msgElem.style.display = 'block';
      }
    }
  }
});
let currentGymProfile = {}; // Store fetched profile data

            async function fetchAndUpdateAdminProfile() {
        logLocalStorageItems();
        const token = await waitForToken('gymAdminToken', 10, 100);
        const adminNameElement = document.getElementById('adminName');
        const adminAvatarElement = document.getElementById('adminAvatar');
        setDefaultAdminProfile(adminNameElement, adminAvatarElement);
    
        if (!token) {
            handleMissingToken();
            return;
        }
    
        try {
            const responseData = await fetchAdminProfile(token);
            if (!responseData.ok) {
                handleProfileFetchError(responseData, adminNameElement, adminAvatarElement);
                return;
            }
            currentGymProfile = responseData.data;
            updateAdminProfileUI(adminNameElement, adminAvatarElement, responseData.data);
        } catch (error) {
            handleProfileFetchException(error, adminNameElement, adminAvatarElement);
        }
    }
    
    function logLocalStorageItems() {
        console.log('All localStorage items:', Object.keys(localStorage).map(key => {
            return { key, value: localStorage.getItem(key) };
        }));
    }
    
    async function waitForToken(tokenKey, maxTries, delayMs) {
        let token = localStorage.getItem(tokenKey);
        let tries = 0;
        while (!token && tries < maxTries) {
            await new Promise(res => setTimeout(res, delayMs));
            token = localStorage.getItem(tokenKey);
            tries++;
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
        console.log('Sending profile request to:', 'http://localhost:5000/api/gym/profile/me');
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
        if (adminNameElement) {
            adminNameElement.textContent = profile.gymName || profile.name || 'Gym Admin';
            console.log('Updated admin name:', adminNameElement.textContent);
        }
        if (adminAvatarElement) {
            if (profile.logoUrl) {
                let logoPath = profile.logoUrl;
                if (!logoPath.startsWith('http')) {
                    logoPath = `http://localhost:5000${logoPath.startsWith('/') ? logoPath : '/' + logoPath}`;
                }
                adminAvatarElement.src = logoPath;
                console.log('Updated admin logo:', logoPath);
            } else {
                adminAvatarElement.src = 'https://via.placeholder.com/40';
                console.log('Using default avatar');
            }
        }
    }
    
    function handleProfileFetchException(error, adminNameElement, adminAvatarElement) {
        console.error('Comprehensive error fetching or updating admin profile:', error);
        if (adminNameElement) adminNameElement.textContent = 'Admin';
        if (adminAvatarElement) adminAvatarElement.src = 'https://via.placeholder.com/40';
        localStorage.removeItem('gymAdminToken');
        alert('Unable to fetch profile. Please try logging in again.');
        window.location.replace('http://localhost:5000/public/admin-login.html');
    }

document.addEventListener('DOMContentLoaded', function () {
    const deletePhotoConfirmModal = document.getElementById('deletePhotoConfirmModal');
    const closeDeletePhotoConfirmModal = document.getElementById('closeDeletePhotoConfirmModal');
    const confirmDeletePhotoBtn = document.getElementById('confirmDeletePhotoBtn');
    const cancelDeletePhotoBtn = document.getElementById('cancelDeletePhotoBtn');
    let pendingDeletePhotoId = null;
    fetchAndUpdateAdminProfile();
    fetchGymPhotos();

    function fetchGymPhotos() {
        const token = localStorage.getItem('gymAdminToken');
        fetch('http://localhost:5000/api/gyms/photos', {
            credentials: 'include',
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        })
            .then(res => res.json())
            .then(data => {
                if (data.success && Array.isArray(data.photos)) {
                    renderPhotoGridWithRemove(data.photos);
                } else {
                    renderPhotoGridWithRemove([]);
                }
            })
            .catch(() => renderPhotoGridWithRemove([]));
    }

    function renderPhotoGridWithRemove(photos) {
        window._lastPhotoGrid = photos;
        const grid = document.getElementById('photoGrid');
        if (!grid) return;
        grid.innerHTML = '';
        if (!photos.length) {
            grid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; color: #888;">No photos uploaded yet.</div>';
            return;
        }
        photos.forEach(photo => {
            const card = document.createElement('div');
            card.className = 'photo-card';
            card.style = 'background: #fff; border-radius: 8px; box-shadow: 0 2px 8px #0001; padding: 12px; display: flex; flex-direction: column; align-items: center;';
            card.innerHTML = `
                <img src="${photo.imageUrl}" alt="${photo.title || ''}" style="width: 100%; height: 140px; object-fit: cover; border-radius: 6px; margin-bottom: 10px;">
                <h3 style="margin: 4px 0 2px 0; font-size: 1.1em;">${photo.title || ''}</h3>
                <p style="margin: 0 0 6px 0; color: #666; font-size: 0.95em;">${photo.description || ''}</p>
                <div style="font-size: 0.85em; color: #aaa; margin-bottom: 6px;">${photo.uploadedAt ? new Date(photo.uploadedAt).toLocaleString() : ''}</div>
                <div style="display: flex; gap: 8px; justify-content: center;">
                    <button class="edit-photo-btn" data-photo-id="${photo._id || ''}" style="padding: 4px 10px; border: none; background: #1976d2; color: #fff; border-radius: 4px; cursor: pointer;">Edit</button>
                    <button class="remove-photo-btn" data-photo-id="${photo._id || ''}" style="padding: 4px 10px; border: none; background: #e53935; color: #fff; border-radius: 4px; cursor: pointer;">Remove</button>
                </div>
            `;
            grid.appendChild(card);
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
// --- Unified Add Member Modal Logic (Dashboard & Member Tab) ---
const addMemberBtn = document.getElementById('addMemberBtn'); // Dashboard quick action
const addMemberBtnTab = document.getElementById('addMemberBtnTab'); // Member tab button
const addMemberModal = document.getElementById('addMemberModal');
const closeAddMemberModal = document.getElementById('closeAddMemberModal');
const addMemberForm = document.getElementById('addMemberForm');
const addMemberSuccessMsg = document.getElementById('addMemberSuccessMsg');
const memberProfileImageInput = document.getElementById('memberProfileImage');
const memberImageTag = document.getElementById('memberImageTag');
const uploadMemberImageBtn = document.getElementById('uploadMemberImageBtn');

// Ensure modal is hidden on load
if (addMemberModal) addMemberModal.style.display = 'none';

// Open modal from either dashboard quick action or member tab
function openAddMemberModal() {
  addMemberModal.style.display = 'flex';
  if (addMemberSuccessMsg) addMemberSuccessMsg.style.display = 'none';
  if (addMemberForm) addMemberForm.reset();
  if (memberImageTag) memberImageTag.src = 'https://via.placeholder.com/96?text=Photo';
}
if (addMemberBtn && addMemberModal) {
  addMemberBtn.addEventListener('click', openAddMemberModal);
}
if (addMemberBtnTab && addMemberModal) {
  addMemberBtnTab.addEventListener('click', function(e) {
    e.preventDefault();
    openAddMemberModal();
    document.body.style.overflow = 'hidden';
  });
}

// Close modal helper
function closeAddMemberModalFunc() {
  if (addMemberModal) addMemberModal.style.display = 'none';
  if (addMemberSuccessMsg) addMemberSuccessMsg.style.display = 'none';
  if (addMemberForm) addMemberForm.reset();
  if (memberImageTag) memberImageTag.src = 'https://via.placeholder.com/96?text=Photo';
  document.body.style.overflow = '';
}

// Close on close button
if (closeAddMemberModal && addMemberModal) {
  closeAddMemberModal.onclick = closeAddMemberModalFunc;
}

// Close on outside click (only for Add Member modal)
if (addMemberModal) {
  addMemberModal.addEventListener('mousedown', function(e) {
    if (e.target === addMemberModal) closeAddMemberModalFunc();
  });
}

// Image upload logic
if (uploadMemberImageBtn && memberProfileImageInput) {
  uploadMemberImageBtn.addEventListener('click', function() {
    memberProfileImageInput.click();
  });
}
if (memberProfileImageInput && memberImageTag) {
  memberProfileImageInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function(evt) {
        memberImageTag.src = evt.target.result;
      };
      reader.readAsDataURL(file);
    } else {
      memberImageTag.src = 'https://via.placeholder.com/96?text=Photo';
    }
  });
}

// Handle form submit (with image, membership ID, and email notification)
if (addMemberForm) {
  addMemberForm.onsubmit = async function(e) {
    e.preventDefault();
    const token = localStorage.getItem('gymAdminToken');
    if (!token) {
      alert('You must be logged in as a gym admin.');
      return;
    }
    const formData = new FormData(addMemberForm); // includes file

    // Extract meta and generate membership ID/valid date
    const { gymName, plan, monthlyPlan, memberEmail, memberName, membershipId, validDate } = getMemberFormMeta(formData, currentGymProfile);
    formData.append('membershipId', membershipId);
    formData.append('membershipValidUntil', validDate);

    try {
      // 1. Add member to backend
      const res = await fetch('http://localhost:5000/api/members', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        // 2. Send membership email (do not block UI if email fails)
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
        }).catch((err) => {
          console.error('Failed to send membership email:', err);
        });
        if (addMemberSuccessMsg) {
          addMemberSuccessMsg.textContent = `Member added! Membership ID: ${membershipId}`;
          addMemberSuccessMsg.style.display = 'block';
        }
        addMemberForm.reset();
        if (memberImageTag) memberImageTag.src = 'https://via.placeholder.com/96?text=Photo';
        setTimeout(() => {
          closeAddMemberModalFunc();
        }, 1500);
      } else {
        if (addMemberSuccessMsg) {
          addMemberSuccessMsg.textContent = data.message || 'Failed to add member.';
          addMemberSuccessMsg.style.display = 'block';
        }
      }
    } catch (err) {
      console.error('Error while adding member:', err);
      if (addMemberSuccessMsg) {
        addMemberSuccessMsg.textContent = 'Server error. Please try again.';
        addMemberSuccessMsg.style.display = 'block';
      }
    }
  };

  // Helper to extract meta and generate membershipId/validDate
  function getMemberFormMeta(formData, currentGymProfile) {
    const gymName = (currentGymProfile && (currentGymProfile.gymName || currentGymProfile.name)) ? (currentGymProfile.gymName || currentGymProfile.name) : 'GYM';
    const plan = formData.get('planSelected') || 'PLAN';
    const monthlyPlan = formData.get('monthlyPlan') || '';
    const memberEmail = formData.get('memberEmail') || '';
    const memberName = formData.get('memberName') || '';
    const now = new Date();
    const ym = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}`;
    const random = Math.floor(1000 + Math.random() * 9000);
    const gymShort = gymName.replace(/[^A-Za-z0-9]/g, '').substring(0,6).toUpperCase();
    const planShort = plan.replace(/[^A-Za-z0-9]/g, '').substring(0,6).toUpperCase();
    const membershipId = `${gymShort}-${ym}-${planShort}-${random}`;
    let validDate = '';
    let months = 1;
    if (/3\s*Month/i.test(monthlyPlan)) months = 3;
    else if (/6\s*Month/i.test(monthlyPlan)) months = 6;
    else if (/12\s*Month/i.test(monthlyPlan)) months = 12;
    const validUntil = new Date(now);
    validUntil.setMonth(validUntil.getMonth() + months);
    validDate = validUntil.toISOString().split('T')[0];
    return { gymName, plan, monthlyPlan, memberEmail, memberName, membershipId, validDate };
  }
}
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
            if (!currentGymProfile) return;

            document.getElementById('editGymName').value = currentGymProfile.gymName || '';
            document.getElementById('editGymEmail').value = currentGymProfile.email || '';
            document.getElementById('editGymPhone').value = currentGymProfile.phone || '';
            document.getElementById('editGymAddress').value = currentGymProfile.address || '';
            document.getElementById('editGymCity').value = currentGymProfile.location?.city || '';
            document.getElementById('editGymPincode').value = currentGymProfile.location?.pincode || '';
            document.getElementById('editGymDescription').value = currentGymProfile.description || '';

            if (currentGymProfile.logoUrl) {
                let logoPath = currentGymProfile.logoUrl;
                if (!logoPath.startsWith('http')) {
                    logoPath = `http://localhost:5000${logoPath.startsWith('/') ? logoPath : '/' + logoPath}`;
                }
                logoPreviewImage.src = `${logoPath}?${new Date().getTime()}`;
                logoPreviewImage.style.display = 'block';
            } else {
                logoPreviewImage.src = '#';
                logoPreviewImage.style.display = 'none';
            }
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
                if (modalToClose) modalToClose.style.display = 'none';
            });
        });

        window.addEventListener('click', (e) => {
            modals.forEach(modal => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
        });

        // Specific Modals (Notification, Upload Photo, Add Equipment)
        const sendNotificationBtn = document.getElementById('sendNotificationBtn');
        const notificationModal = document.getElementById('notificationModal');
        if (sendNotificationBtn && notificationModal) {
            sendNotificationBtn.addEventListener('click', () => notificationModal.style.display = 'flex');
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

// --- Member & Trainer Display Tab Logic ---
const sidebarMenuLinks = document.querySelectorAll('.sidebar .menu-link');
const membersMenuLink = Array.from(sidebarMenuLinks).find(link => link.querySelector('.fa-users'));
const trainersMenuLink = Array.from(sidebarMenuLinks).find(link => link.querySelector('.fa-user-tie'));
const dashboardMenuLink = Array.from(sidebarMenuLinks).find(link => link.querySelector('.fa-tachometer-alt'));
const memberDisplayTab = document.getElementById('memberDisplayTab');
const trainerTab = document.getElementById('trainerTab');
const dashboardContent = document.querySelector('.content');

function hideAllMainTabs() {
  if (dashboardContent) dashboardContent.style.display = 'none';
  if (memberDisplayTab) memberDisplayTab.style.display = 'none';
  if (trainerTab) trainerTab.style.display = 'none';
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
});

function updateMainContentMargins() {
  if (!mainContent) return;
  const isCollapsed = sidebar.classList.contains('sidebar-collapsed');
  const dashboardTab = mainContent.querySelector('.content');
  const memberTab = document.getElementById('memberDisplayTab');
  const trainerTab = document.getElementById('trainerTab');

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
}

// Dynamic sidebar menu highlight
sidebarMenuLinks.forEach(link => {
  link.addEventListener('click', function(e) {
    // Only handle tab switching links (not external/settings etc.)
    const menuText = link.querySelector('.menu-text')?.textContent.trim();
    if (menuText === 'Dashboard') {
      // Show dashboard, hide members
      dashboardContent.style.display = 'block';
      memberDisplayTab.style.display = 'none';
      updateMainContentMargins();
      // Remove active from all, add to dashboard
      sidebarMenuLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
    } else if (menuText === 'Members') {
      // Show members, hide dashboard
      dashboardContent.style.display = 'none';
      memberDisplayTab.style.display = 'block';
      updateMainContentMargins();
      // Remove active from all, add to members
      sidebarMenuLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      // Fetch members if needed
      if (typeof fetchAndDisplayMembers === 'function') fetchAndDisplayMembers();
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
        if (dashboardContent) dashboardContent.style.display = 'block';
        const memberTab = document.getElementById('memberDisplayTab');
        if (memberTab) memberTab.style.display = 'none';
        updateMainContentMargins();
      } else if (tabName === 'Members') {
        if (dashboardContent) dashboardContent.style.display = 'none';
        const memberTab = document.getElementById('memberDisplayTab');
        if (memberTab) memberTab.style.display = 'block';
        updateMainContentMargins();
        if (typeof fetchAndDisplayMembers === 'function') fetchAndDisplayMembers();
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