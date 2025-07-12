// MutationObserver to detect if the form is replaced or removed
document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('gymRegisterForm');
  if (!form) return;
  const parent = form.parentNode;
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      mutation.removedNodes.forEach(function(node) {
        if (node === form) {
          console.warn('gymRegisterForm was removed from DOM!');
        }
      });
      mutation.addedNodes.forEach(function(node) {
        if (node.id === 'gymRegisterForm') {
          console.warn('A new gymRegisterForm was added to DOM!');
        }
      });
    });
  });
  observer.observe(parent, { childList: true });
});
// Global error handler for debugging
window.addEventListener('error', function(event) {
  console.error('Global JS error:', event.message, 'at', event.filename + ':' + event.lineno);
});

document.addEventListener('DOMContentLoaded', function() {
  const testBtn = document.getElementById('testOutsideBtn');
  if (testBtn) {
    testBtn.addEventListener('click', function() {
      console.log('Test outside button clicked!');
      alert('Test outside button clicked!');
    });
  }
});
// ================ MAIN APPLICATION INITIALIZATION ================
document.addEventListener('DOMContentLoaded', function() {
  console.log("✅ DOM Ready - Initializing Gym Registration Form");

  // Initialize all modules
  initMembershipPlansModule();
  initGymLogoModule();
  initActivitiesModule();
  initGymPhotosModule();
  initEquipmentModule();
  initFormValidationModule();
  initFormSubmissionModule();

  // Initialize scroll animations
  initScrollAnimations();
});

// ================ MODULE: MEMBERSHIP PLANS ================
function initMembershipPlansModule() {
  const membershipPlansGrid = document.getElementById('membershipPlansGrid');
  if (!membershipPlansGrid) return;

  const planNames = [
    { name: 'Basic', icon: 'fa-leaf', color: '#38b000' },
    { name: 'Standard', icon: 'fa-star', color: '#1976d2' },
    { name: 'Premium', icon: 'fa-crown', color: '#f59e42' }
  ];

  // Render membership plans grid
  function renderMembershipPlans() {
    membershipPlansGrid.innerHTML = '';
    planNames.forEach((plan) => {
      const card = createPlanCard(plan);
      membershipPlansGrid.appendChild(card);
    });
    setupPlanDiscountCalculators();
    addPlanFieldHints();
    setupPlansHoverInfo();
  }

  // Create individual plan card
  function createPlanCard(plan) {
    const card = document.createElement('div');
    card.className = 'plan-editor-card';
    card.style.cssText = `
      background: #f8f9fa;
      border-radius: 10px;
      padding: 16px 18px;
      min-width: 260px;
      max-width: 320px;
      box-shadow: 0 2px 8px #0001;
      margin-bottom: 10px;
      position: relative;
    `;
    
    card.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:1.6em;color:${plan.color};">
          <i class="fas ${plan.icon}"></i>
        </div>
        <input type="text" class="plan-name-input" value="${plan.name}" readonly style="flex:1;font-weight:700;background:#e3eafc;border:none;color:#222;">
      </div>
      <div style="margin-top:10px;display:flex;gap:10px;">
        <input type="number" class="plan-price-input" name="planPrice[]" min="0" placeholder="Price* (₹)" style="width:90px;" required>
        <input type="number" class="plan-discount-input" name="planDiscount[]" min="0" max="100" placeholder="Discount (%)" style="width:80px;">
        <input type="number" class="plan-discount-months-input" name="planDiscountMonths[]" min="0" max="24" placeholder="Months" style="width:70px;">
      </div>
      <textarea class="plan-benefits-input" name="planBenefits[]" placeholder="Benefits (comma separated)*" style="margin-top:10px;width:100%;min-height:38px;resize:vertical;" required></textarea>
      <input type="text" class="plan-note-input" name="planNote[]" placeholder="Note (optional)" style="margin-top:8px;width:100%;">
      <input type="hidden" name="planName[]" value="${plan.name}">
      <input type="hidden" name="planIcon[]" value="${plan.icon}">
      <input type="hidden" name="planColor[]" value="${plan.color}">
      <div class="plan-discounted-amount" style="margin-top:14px;font-size:1.08em;font-weight:600;color:#1976d2;min-height:22px;text-align:right;"></div>
    `;
    
    return card;
  }

  // Setup discount calculators for each plan
  function setupPlanDiscountCalculators() {
    const cards = membershipPlansGrid.querySelectorAll('.plan-editor-card');
    cards.forEach(card => {
      const priceInput = card.querySelector('.plan-price-input');
      const discountInput = card.querySelector('.plan-discount-input');
      const monthsInput = card.querySelector('.plan-discount-months-input');
      const discountedAmountDiv = card.querySelector('.plan-discounted-amount');

      const updateDiscountedAmount = () => {
        const price = parseFloat(priceInput.value) || 0;
        const discount = parseFloat(discountInput.value) || 0;
        const months = parseInt(monthsInput.value) || 0;
        
        if (price > 0 && discount > 0 && months > 0) {
          const total = price * months;
          const discountAmt = total * (discount / 100);
          const finalAmt = total - discountAmt;
          discountedAmountDiv.innerHTML = `
            Discounted: <span style="color:#38b000;">₹${finalAmt.toLocaleString(undefined, {maximumFractionDigits:2})}</span>
            <span style="font-size:0.95em;font-weight:400;color:#888;">
              (You save ₹${discountAmt.toLocaleString(undefined, {maximumFractionDigits:2})})
            </span>
          `;
        } else {
          discountedAmountDiv.innerHTML = '';
        }
      };

      priceInput.addEventListener('input', updateDiscountedAmount);
      discountInput.addEventListener('input', updateDiscountedAmount);
      monthsInput.addEventListener('input', updateDiscountedAmount);
    });
  }

  // Add tooltips for plan fields
  function addPlanFieldHints() {
    membershipPlansGrid.querySelectorAll('.plan-hint-msg').forEach(el => el.remove());
    const cards = membershipPlansGrid.querySelectorAll('.plan-editor-card');
    
    cards.forEach(card => {
      const addTooltip = (input, message) => {
        input.addEventListener('mouseenter', () => showTooltip(input, message));
        input.addEventListener('mouseleave', () => hideTooltip(input));
      };

      addTooltip(card.querySelector('.plan-price-input'), 'Fill per month price');
      addTooltip(card.querySelector('.plan-discount-input'), 'Enter discount percentage');
      addTooltip(card.querySelector('.plan-discount-months-input'), 'Enter discount applied on months');
    });

    function showTooltip(input, message) {
      let tooltip = input.parentNode.querySelector('.plan-hint-tooltip');
      if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.className = 'plan-hint-tooltip';
        tooltip.style.cssText = `
          position: absolute;
          left: 0;
          top: 100%;
          z-index: 10;
          background: #fff;
          color: #1976d2;
          border: 1.5px solid #1976d2;
          border-radius: 7px;
          padding: 7px 14px;
          font-size: 0.98em;
          box-shadow: 0 4px 16px #4361ee22;
          margin-top: 6px;
          white-space: nowrap;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.18s;
        `;
        input.parentNode.style.position = 'relative';
        input.parentNode.appendChild(tooltip);
      }
      tooltip.textContent = message;
      tooltip.style.opacity = '1';
    }

    function hideTooltip(input) {
      const tooltip = input.parentNode.querySelector('.plan-hint-tooltip');
      if (tooltip) tooltip.style.opacity = '0';
    }
  }

  // Setup hover info for plans section
  function setupPlansHoverInfo() {
    const plansSection = membershipPlansGrid.parentElement;
    if (!plansSection) return;

    const infoMsg = document.createElement('div');
    infoMsg.className = 'plans-hover-info-msg';
    infoMsg.style.cssText = `
      display: none;
      margin-top: 8px;
      padding: 10px 14px;
      background: #e3eafc;
      border-radius: 7px;
      color: #1976d2;
      font-size: 0.98em;
      font-weight: 500;
      position: relative;
      z-index: 2;
      box-shadow: 0 2px 8px #4361ee11;
    `;
    infoMsg.innerHTML = '<i class="fas fa-info-circle" style="margin-right:6px;"></i>You can change the Plans after Approval from the dashboard.';
    plansSection.appendChild(infoMsg);
    
    membershipPlansGrid.addEventListener('mouseenter', () => infoMsg.style.display = 'block');
    membershipPlansGrid.addEventListener('mouseleave', () => infoMsg.style.display = 'none');
  }

  // Initial render
  renderMembershipPlans();
}

// ================ MODULE: GYM LOGO ================
function initGymLogoModule() {
  const logoInput = document.getElementById('gymLogo');
  const logoPreview = document.getElementById('logoPreviewImage');
  
  if (!logoInput || !logoPreview) return;

  logoInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => logoPreview.src = ev.target.result;
      reader.readAsDataURL(file);
    } else {
      logoPreview.src = 'https://via.placeholder.com/96x96?text=Logo';
    }
  });
}

// ================ MODULE: ACTIVITIES ================
function initActivitiesModule() {
  const activitiesGrid = document.getElementById('activitiesInteractiveGrid');
  const activitiesError = document.getElementById('activitiesError');
  
  if (!activitiesGrid) return;

  let selectedActivities = [];
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

  // Render activities grid
  function renderActivities() {
    activitiesGrid.innerHTML = '';
    allPossibleActivities.forEach((activity) => {
      const card = createActivityCard(activity);
      activitiesGrid.appendChild(card);
    });
  }

  // Create individual activity card
  function createActivityCard(activity) {
    const card = document.createElement('div');
    card.className = 'activity-card';
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-pressed', selectedActivities.some(a => a.name === activity.name));
    
    card.innerHTML = `
      <div class="activity-icon"><i class="fas ${activity.icon}"></i></div>
      <div class="activity-name">${activity.name}</div>
      <button type="button" class="activity-info-btn" title="View description" tabindex="-1">
        <i class="fas fa-info-circle"></i>
      </button>
    `;
    
    if (selectedActivities.some(a => a.name === activity.name)) {
      card.classList.add('selected');
    }

    card.addEventListener('click', function(e) {
      if (e.target.closest('.activity-info-btn')) return;
      toggleActivitySelection(card, activity);
    });

    card.querySelector('.activity-info-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      showActivityDescription(activity);
    });

    return card;
  }

  // Toggle activity selection
  function toggleActivitySelection(card, activity) {
    card.classList.toggle('selected');
    selectedActivities = card.classList.contains('selected') 
      ? [...selectedActivities, activity]
      : selectedActivities.filter(a => a.name !== activity.name);
    card.setAttribute('aria-pressed', card.classList.contains('selected'));
    
    if (activitiesError) {
      activitiesError.style.display = selectedActivities.length ? 'none' : 'block';
    }
  }

  // Show activity description modal
  function showActivityDescription(activity) {
    const modal = document.createElement('div');
    modal.id = 'activityDescModal';
    modal.className = 'activity-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
    `;
    
    modal.innerHTML = `
      <div class="activity-modal-content" style="background: white; padding: 20px; border-radius: 10px; max-width: 400px; width: 90%;">
        <div class="activity-modal-icon" style="text-align: center; font-size: 2.5em; color: #1976d2;">
          <i class="fas ${activity.icon}"></i>
        </div>
        <div class="activity-modal-name" style="text-align: center; font-size: 1.5em; margin: 10px 0; font-weight: bold;">
          ${activity.name}
        </div>
        <div class="activity-modal-description" style="text-align: center; margin-bottom: 20px;">
          ${activity.description}
        </div>
        <button id="closeActivityDescModal" class="modal-close-btn" style="display: block; margin: 0 auto; padding: 8px 20px; background: #1976d2; color: white; border: none; border-radius: 5px; cursor: pointer;">
          Close
        </button>
      </div>
    `;

    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';

    document.getElementById('closeActivityDescModal').onclick = function() {
      modal.remove();
      document.body.style.overflow = '';
    };

    modal.addEventListener('mousedown', function(e) {
      if (e.target === modal) {
        modal.remove();
        document.body.style.overflow = '';
      }
    });
  }

  // Initial render
  renderActivities();
}

// ================ MODULE: GYM PHOTOS ================
function initGymPhotosModule() {
  const gymPhotoCardsContainer = document.getElementById('gymPhotoCardsContainer');
  const addGymPhotoCardBtn = document.getElementById('addGymPhotoCardBtn');
  
  if (!gymPhotoCardsContainer || !addGymPhotoCardBtn) return;

  // Create a new photo card
  function createPhotoCard() {
    const card = document.createElement('div');
    card.className = 'gym-photo-card';
    card.style.cssText = `
      width: 180px;
      background: #f8f9fa;
      border-radius: 10px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      position: relative;
      box-shadow: 0 2px 8px #0001;
    `;
    
    card.innerHTML = `
      <div class="photo-upload-container" style="width:100%;height:110px;display:flex;align-items:center;justify-content:center;cursor:pointer;position:relative;">
        <div class="photo-upload-placeholder" style="width:100%;height:100px;display:flex;align-items:center;justify-content:center;border-radius:8px;border:1.5px solid #1976d2;background:#e3eafc;position:relative;">
          <i class="fas fa-upload" style="font-size:2.2em;color:#1976d2;"></i>
          <img src="" alt="Photo Preview" class="photo-preview" style="display:none;width:100%;height:100px;object-fit:cover;border-radius:8px;position:absolute;left:0;top:0;">
        </div>
        <input type="file" name="photoFile[]" accept="image/*" style="opacity:0;position:absolute;left:0;top:0;width:100%;height:100%;cursor:pointer;" required>
      </div>
      <input type="text" name="photoTitle[]" class="form-control" placeholder="Title*" style="margin-top:8px;" required>
      <select name="photoCategory[]" class="form-control" style="margin-top:6px;" required>
        <option value="">Select Category*</option>
        <option value="Equipment">Equipment</option>
        <option value="Facility">Facility</option>
        <option value="Group Class">Group Class</option>
        <option value="Trainer">Trainer</option>
        <option value="Member">Member</option>
        <option value="Event">Event</option>
        <option value="Other">Other</option>
      </select>
      <textarea name="photoDescription[]" class="form-control" placeholder="Description*" style="margin-top:6px;resize:vertical;min-height:38px;max-height:80px;" required></textarea>
      <button type="button" class="btn btn-danger remove-gym-photo-card" style="position:absolute;top:6px;right:6px;padding:2px 8px;font-size:0.95em;display:none;">Remove</button>
    `;
    
    return card;
  }

  // Add a new photo card
  function addPhotoCard() {
    const cards = gymPhotoCardsContainer.querySelectorAll('.gym-photo-card');
    if (cards.length >= 5) {
      alert('Maximum 5 photos allowed.');
      return;
    }
    
    const card = createPhotoCard();
    gymPhotoCardsContainer.appendChild(card);
    updateRemoveButtons();
  }

  // Update remove buttons visibility
  function updateRemoveButtons() {
    const cards = gymPhotoCardsContainer.querySelectorAll('.gym-photo-card');
    cards.forEach(card => {
      const removeBtn = card.querySelector('.remove-gym-photo-card');
      if (removeBtn) {
        removeBtn.style.display = cards.length > 1 ? 'inline-block' : 'none';
      }
    });
  }

  // Handle photo upload preview
  function handlePhotoUpload(e) {
    const fileInput = e.target;
    const file = fileInput.files[0];
    const card = fileInput.closest('.gym-photo-card');
    const img = card.querySelector('.photo-preview');
    const icon = card.querySelector('.fa-upload');
    
    if (file && img) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        img.src = ev.target.result;
        img.style.display = 'block';
        if (icon) icon.style.display = 'none';
      };
      reader.readAsDataURL(file);
    } else if (img) {
      img.src = '';
      img.style.display = 'none';
      if (icon) icon.style.display = 'block';
    }
  }

  // Event listeners
  addGymPhotoCardBtn.addEventListener('click', addPhotoCard);
  gymPhotoCardsContainer.addEventListener('click', function(e) {
    if (e.target.classList.contains('remove-gym-photo-card')) {
      e.target.closest('.gym-photo-card').remove();
      updateRemoveButtons();
    }
  });
  gymPhotoCardsContainer.addEventListener('change', function(e) {
    if (e.target.type === 'file') {
      handlePhotoUpload(e);
    }
  });

  // Add initial card
  if (gymPhotoCardsContainer.querySelectorAll('.gym-photo-card').length === 0) {
    addPhotoCard();
  }
  updateRemoveButtons();
}

// ================ MODULE: EQUIPMENT ================
function initEquipmentModule() {
  const equipmentGrid = document.getElementById('equipmentGrid');
  const equipmentInfoMsg = document.querySelector('.equipment-info-msg');
  
  if (!equipmentGrid || !equipmentInfoMsg) return;

  equipmentInfoMsg.style.display = 'none';
  
  equipmentGrid.addEventListener('focusin', () => equipmentInfoMsg.style.display = 'block');
  equipmentGrid.addEventListener('mouseenter', () => equipmentInfoMsg.style.display = 'block');
  
  equipmentGrid.addEventListener('mouseleave', () => {
    if (!equipmentGrid.contains(document.activeElement)) {
      equipmentInfoMsg.style.display = 'none';
    }
  });
  
  equipmentGrid.addEventListener('focusout', () => {
    setTimeout(() => {
      if (!equipmentGrid.contains(document.activeElement)) {
        equipmentInfoMsg.style.display = 'none';
      }
    }, 10);
  });
}

// ================ MODULE: FORM VALIDATION ================
function initFormValidationModule() {
  const form = document.getElementById('gymRegisterForm');
  if (!form) return;

  const passwordInput = document.getElementById('password');
  const passwordReminderMsg = document.getElementById('passwordReminderMsg');
  
  if (passwordInput && passwordReminderMsg) {
    passwordInput.addEventListener('input', function() {
      passwordReminderMsg.style.display = passwordInput.value.trim().length > 0 ? 'block' : 'none';
    });
  }

  // Validate the entire form
  function validateForm() {
    let isValid = true;
    const firstInvalidField = validateRequiredFields();
    const isEmailValid = validateEmail();
    const isPasswordValid = validatePassword();
    const isEquipmentValid = validateEquipment();
    const isActivitiesValid = validateActivities();
    const isPhotosValid = validatePhotos();

    if (firstInvalidField) {
      firstInvalidField.focus();
      isValid = false;
    }
    
    if (!isEmailValid || !isPasswordValid || !isEquipmentValid || !isActivitiesValid || !isPhotosValid) {
      isValid = false;
    }

    return isValid;
  }

  // Validate all required fields
  function validateRequiredFields() {
    let firstInvalid = null;
    document.querySelectorAll('[required]').forEach(field => {
      if (field.offsetParent === null) return; // Skip hidden fields
      
      let isInvalid = false;
      if (field.type === 'checkbox' || field.type === 'radio') {
        const group = document.getElementsByName(field.name);
        isInvalid = !Array.from(group).some(f => f.checked);
      } else if (field.type === 'file') {
        isInvalid = !field.files || field.files.length === 0;
      } else {
        isInvalid = !field.value.trim();
      }

      if (isInvalid) {
        if (!firstInvalid) firstInvalid = field;
        showFieldError(field, 'This field is required');
      } else {
        hideFieldError(field);
      }
    });
    return firstInvalid;
  }

  // Validate email format
  function validateEmail() {
    const emailField = form.querySelector('input[type="email"]');
    if (!emailField) return true;
    
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regex.test(emailField.value.trim())) {
      showFieldError(emailField, 'Enter a valid email');
      return false;
    }
    hideFieldError(emailField);
    return true;
  }

  // Validate password length
  function validatePassword() {
    if (!passwordInput) return true;
    
    if (passwordInput.value.length < 6) {
      showFieldError(passwordInput, 'Password must be at least 6 characters');
      return false;
    }
    hideFieldError(passwordInput);
    return true;
  }

  // Validate at least one equipment selected
  function validateEquipment() {
    const checkedEquip = form.querySelectorAll('input[name="equipment"]:checked');
    const equipError = document.getElementById('equipmentError');
    
    if (!equipError) return true;
    
    if (checkedEquip.length === 0) {
      equipError.style.display = 'block';
      return false;
    }
    equipError.style.display = 'none';
    return true;
  }

  // Validate at least one activity selected
  function validateActivities() {
    const activitiesError = document.getElementById('activitiesError');
    if (!activitiesError) return true;
    const activitiesGrid = document.getElementById('activitiesInteractiveGrid');
    if (!activitiesGrid) return true;
    const selectedActivities = activitiesGrid.querySelectorAll('.activity-card.selected');
    if (selectedActivities.length === 0) {
      activitiesError.style.display = 'block';
      return false;
    }
    activitiesError.style.display = 'none';
    return true;
  }

  // Validate at least one photo uploaded
  function validatePhotos() {
    const photoCards = gymPhotoCardsContainer.querySelectorAll('.gym-photo-card');
    if (photoCards.length === 0) return false;
    
    let allPhotosValid = true;
    photoCards.forEach(card => {
      const fileInput = card.querySelector('input[type="file"]');
      if (!fileInput.files[0]) {
        allPhotosValid = false;
      }
    });
    return allPhotosValid;
  }

  // Show error for a field
  function showFieldError(field, message) {
    field.classList.add('error-border');
    let error = field.nextElementSibling;
    
    if (!(error && error.classList.contains('error'))) {
      error = field.parentElement ? field.parentElement.querySelector('.error') : null;
    }
    
    if (!error && field.hasAttribute('aria-describedby')) {
      error = document.getElementById(field.getAttribute('aria-describedby'));
    }
    
    if (error) {
      error.style.display = 'block';
      error.textContent = message;
    }
  }

  // Hide error for a field
  function hideFieldError(field) {
    field.classList.remove('error-border');
    let error = field.nextElementSibling;
    
    if (!(error && error.classList.contains('error'))) {
      error = field.parentElement ? field.parentElement.querySelector('.error') : null;
    }
    
    if (!error && field.hasAttribute('aria-describedby')) {
      error = document.getElementById(field.getAttribute('aria-describedby'));
    }
    
    if (error) {
      error.style.display = 'none';
    }
  }

  // Expose validateForm for form submission
  window.validateForm = validateForm;
}

// ================ MODULE: FORM SUBMISSION ================
function initFormSubmissionModule() {
  const form = document.getElementById('gymRegisterForm');
  console.log('initFormSubmissionModule: form =', form);
  if (!form) {
    console.error('No form with id="gymRegisterForm" found!');
    return;
  }

  console.log('initFormSubmissionModule: submit event listener attached');

  // Disable form's default submission behavior
  form.setAttribute('novalidate', 'true');
  if (form.hasAttribute('action')) {
    form.removeAttribute('action');
  }
  if (form.hasAttribute('method')) {
    form.removeAttribute('method');
  }

  // Global flag to control form submission
  let isFormSubmissionBlocked = false;
  
  // Add debugging to track all form events
  form.addEventListener('submit', function(e) {
    console.log('🔍 Form submit event detected:', {
      isBlocked: isFormSubmissionBlocked,
      eventType: e.type,
      target: e.target,
      defaultPrevented: e.defaultPrevented
    });
  }, true);

  // Main form submission handler
  async function handleFormSubmission(e) {
    console.log('🚀 handleFormSubmission called:', {
      isBlocked: isFormSubmissionBlocked,
      eventType: e.type
    });
    
    e.preventDefault();
    e.stopImmediatePropagation();
    e.stopPropagation();
    
    // Check if form submission is blocked
    if (isFormSubmissionBlocked) {
      console.log('❌ Form submission blocked by error dialog');
      return false;
    }
    
    // Prevent HTML5 form reset on error
    form.noValidate = true;
    console.log('✅ Form submit event processing started');

    const submitBtn = document.getElementById('submitBtn');
    const btnText = document.getElementById('btnText');
    const loader = document.getElementById('loader');
    const formContainer = document.querySelector('.form-container');

    if (!submitBtn) {
      console.error('Submit button not found');
      return false;
    }

    try {
      // Validate form before submission
      if (!window.validateForm || !window.validateForm()) {
        console.log('❌ Form validation failed');
        // Show error visually, not alert
        const errorSummary = document.getElementById('formErrorSummary');
        if (errorSummary) {
          errorSummary.textContent = 'Please fix the errors above and try again.';
          errorSummary.style.display = 'block';
        }
        return false;
      }
      
      console.log('✅ Form validation passed');

      // Prepare form data
      const formData = prepareFormData();
      console.log('📝 Form data prepared');

      // Show loading state
      if (btnText) btnText.textContent = 'Submitting...';
      if (loader) loader.style.display = 'inline-block';
      submitBtn.disabled = true;
      console.log('⏳ Loading state activated');

      // Submit to server
      console.log('🌐 Sending request to server...');
      const response = await fetch('http://localhost:5000/api/gyms/register', {
        method: 'POST',
        body: formData
      });
      
      console.log('📡 Server response received:', response.status, response.statusText);

      if (!response.ok) {
        let errorMsg = 'Server responded with error';
        try {
          const data = await response.json();
          if (data && (data.message || data.error)) {
            errorMsg = data.message || data.error;
          }
        } catch (e) {
          console.error('Error parsing server response:', e);
        }
        // Make error dialog modal and block all interaction
        console.log('🔥 Showing error dialog and blocking form submission');
        showSubmissionErrorDialog(errorMsg);
        // Focus the error dialog's OK button
        setTimeout(() => {
          const btn = document.getElementById('closeRegistrationErrorDialogBtn');
          if (btn) btn.focus();
        }, 100);
        return false;
      }

      const responseData = await response.json();
      console.log('✅ Registration successful:', responseData);

      // Show custom registration success dialog
      console.log('🎉 Showing success dialog');
      if (formContainer) {
        formContainer.style.display = 'none';
        console.log('📦 Form container hidden');
      }
      showRegistrationSuccessDialog();
      console.log('✨ Success dialog should be visible now');
      
      // Don't return false here - let success flow continue
      return true;
    } catch (error) {
      console.error('Submission error:', error);
      
      // Block form submission immediately on error
      isFormSubmissionBlocked = true;
      
      // Prevent any further form submission attempts
      e.preventDefault();
      e.stopImmediatePropagation();
      e.stopPropagation();
      
      // Show error dialog with specific message for network errors
      let errorMessage = error.message;
      if (error.message.includes('Failed to fetch')) {
        errorMessage = 'Unable to connect to the server. Please check your internet connection and try again.';
      }
      
      showSubmissionErrorDialog(errorMessage);
      setTimeout(() => {
        const btn = document.getElementById('closeRegistrationErrorDialogBtn');
        if (btn) btn.focus();
      }, 100);
      
      return false;
    } finally {
      // Reset button state
      if (btnText) btnText.textContent = 'Register Gym';
      if (loader) loader.style.display = 'none';
      if (submitBtn) submitBtn.disabled = false;
    }
    return false;
  }

  // Set up form submission prevention
  form.onsubmit = function(e) { 
    e.preventDefault();
    e.stopImmediatePropagation();
    console.log('🛑 form.onsubmit: prevented default submission');
    return false; 
  };
  
  // Completely override form submission
  form.addEventListener('submit', function(e) {
    e.preventDefault();
    e.stopImmediatePropagation();
    e.stopPropagation();
    console.log('🛑 submit event listener: prevented default submission');
    return false;
  }, true);
  
  // Add the main form submission handler
  form.addEventListener('submit', handleFormSubmission, false); // Use bubbling phase after prevention

  // Also add click handler to submit button to ensure it works
  const submitBtn = document.getElementById('submitBtn');
  if (submitBtn) {
    submitBtn.addEventListener('click', function(e) {
      e.preventDefault();
      console.log('🔘 Submit button clicked - triggering form submission');
      // Create a synthetic event for handleFormSubmission
      const syntheticEvent = new Event('submit', { bubbles: true, cancelable: true });
      handleFormSubmission(syntheticEvent);
    });
  }

  // Prevent accidental reload on Enter key in any input
  form.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && e.target.tagName.toLowerCase() !== 'textarea') {
      // Only allow Enter for textarea (multi-line), not for form submit
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  });

  // Block any other submit attempts
  form.addEventListener('reset', function(e) {
    e.preventDefault();
    e.stopImmediatePropagation();
    return false;
  });
  
  // Additional prevention for any programmatic form submissions
  form.submit = function() {
    console.log('Form.submit() called - preventing');
    return false;
  };

  // Show a custom registration success dialog/modal
  function showRegistrationSuccessDialog() {
    console.log('🎊 showRegistrationSuccessDialog called');
    // Remove any existing dialog
    let dialog = document.getElementById('registrationSuccessDialog');
    if (dialog) {
      console.log('🗑️ Removing existing dialog');
      dialog.remove();
    }
    dialog = document.createElement('div');
    dialog.id = 'registrationSuccessDialog';
    dialog.style.cssText = `
      position: fixed;
      top: 0; left: 0; width: 100vw; height: 100vh;
      background: rgba(0,0,0,0.55);
      display: flex; align-items: center; justify-content: center;
      z-index: 10010;`;
    dialog.innerHTML = `
      <div style="background: #fff; border-radius: 14px; box-shadow: 0 4px 32px #0002; padding: 36px 32px 28px 32px; max-width: 95vw; width: 370px; text-align: center; position: relative;">
        <div style="font-size:2.5em;color:#38b000;margin-bottom:10px;"><i class='fas fa-check-circle'></i></div>
        <h2 style="margin:0 0 10px 0;font-size:1.35em;color:#1976d2;">Registered Successfully!</h2>
        <div style="font-size:1.08em;color:#333;margin-bottom:10px;">Your gym registration was submitted and is awaiting admin approval.</div>
        <div style="font-size:0.98em;color:#666;margin-bottom:18px;">You'll be notified soon by email once your gym is approved.</div>
        <button id="closeRegistrationSuccessDialogBtn" style="margin-top:8px;padding:8px 28px;font-size:1.08em;background:#1976d2;color:#fff;border:none;border-radius:6px;cursor:pointer;">OK</button>
      </div>
    `;
    document.body.appendChild(dialog);
    document.body.style.overflow = 'hidden';
    console.log('✅ Success dialog created and added to body');
    
    document.getElementById('closeRegistrationSuccessDialogBtn').onclick = function() {
      console.log('👋 Success dialog OK button clicked');
      dialog.remove();
      document.body.style.overflow = '';
      window.location.reload();
    };
    dialog.addEventListener('mousedown', function(e) {
      if (e.target === dialog) {
        console.log('🖱️ Success dialog backdrop clicked');
        dialog.remove();
        document.body.style.overflow = '';
        window.location.reload();
      }
    });
  }

// Show a custom error dialog/modal for submission errors (move to module scope)
function showSubmissionErrorDialog(msg) {
  let dialog = document.getElementById('registrationErrorDialog');
  if (dialog) dialog.remove();
  dialog = document.createElement('div');
  dialog.id = 'registrationErrorDialog';
  dialog.style.cssText = `
    position: fixed;
    top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(0,0,0,0.55);
    display: flex; align-items: center; justify-content: center;
    z-index: 10010;`;
  
  // Special handling for duplicate email/phone error
  let isDuplicate = false;
  let duplicateMsg = '';
  if (msg && typeof msg === 'string' && msg.toLowerCase().includes('gym with this email or phone already exists')) {
    isDuplicate = true;
    duplicateMsg = 'A Gym ADMIN already exists with this email or phone number.';
  }
  
  dialog.innerHTML = `
    <div style="background: #fff; border-radius: 14px; box-shadow: 0 4px 32px #0002; padding: 32px 28px 22px 28px; max-width: 95vw; width: 370px; text-align: center; position: relative;">
      <div style="font-size:2.2em;${isDuplicate ? 'color:#f9a825;' : 'color:#e53935;'}margin-bottom:10px;"><i class='fas ${isDuplicate ? 'fa-user-times' : 'fa-times-circle'}'></i></div>
      <h2 style="margin:0 0 10px 0;font-size:1.18em;${isDuplicate ? 'color:#f9a825;' : 'color:#b71c1c;'}">${isDuplicate ? 'Gym ADMIN Already Exists' : 'Submission Failed'}</h2>
      <div style="font-size:1.05em;color:#333;margin-bottom:10px;">${isDuplicate ? duplicateMsg : (msg ? msg : 'An error occurred during registration. Please try again.')}</div>
      <button id="closeRegistrationErrorDialogBtn" style="margin-top:8px;padding:8px 28px;font-size:1.08em;${isDuplicate ? 'background:#f9a825;' : 'background:#b71c1c;'}color:#fff;border:none;border-radius:6px;cursor:pointer;">OK</button>
    </div>
  `;
  
  document.body.appendChild(dialog);
  document.body.style.overflow = 'hidden';
  
  // Block form submission globally
  isFormSubmissionBlocked = true;
  console.log('🚫 Form submission blocked by error dialog - isFormSubmissionBlocked:', isFormSubmissionBlocked);
  
  // Prevent page navigation during error dialog
  const preventNavigation = function(e) {
    e.preventDefault();
    e.returnValue = '';
    return '';
  };
  window.addEventListener('beforeunload', preventNavigation, true);
  
  // Additional safety: disable submit button completely
  const submitBtn = document.getElementById('submitBtn');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.style.pointerEvents = 'none';
    submitBtn.style.opacity = '0.5';
    console.log('🔒 Submit button disabled');
  }
  
  // Store prevention function for cleanup
  dialog.preventNavigation = preventNavigation;
  
  // Handle OK button click
  document.getElementById('closeRegistrationErrorDialogBtn').onclick = function() {
    // Remove navigation prevention
    if (dialog.preventNavigation) {
      window.removeEventListener('beforeunload', dialog.preventNavigation, true);
    }
    
    // Unblock form submission
    isFormSubmissionBlocked = false;
    console.log('🔓 Form submission unblocked - isFormSubmissionBlocked:', isFormSubmissionBlocked);
    
    // Re-enable submit button
    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.style.pointerEvents = 'auto';
      submitBtn.style.opacity = '1';
      console.log('🔓 Submit button re-enabled');
    }
    
    // Remove dialog
    dialog.remove();
    document.body.style.overflow = '';
    
    // Clear any loading states
    const btnText = document.getElementById('btnText');
    const loader = document.getElementById('loader');
    
    if (btnText) btnText.textContent = 'Register Gym';
    if (loader) loader.style.display = 'none';
  };
  
  // Handle backdrop click
  dialog.addEventListener('mousedown', function(e) {
    if (e.target === dialog) {
      // Remove navigation prevention
      if (dialog.preventNavigation) {
        window.removeEventListener('beforeunload', dialog.preventNavigation, true);
      }
      
      // Unblock form submission
      isFormSubmissionBlocked = false;
      console.log('Form submission unblocked');
      
      // Re-enable submit button
      const submitBtn = document.getElementById('submitBtn');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.style.pointerEvents = 'auto';
        submitBtn.style.opacity = '1';
      }
      
      // Remove dialog
      dialog.remove();
      document.body.style.overflow = '';
      
      // Clear any loading states
      const btnText = document.getElementById('btnText');
      const loader = document.getElementById('loader');
      
      if (btnText) btnText.textContent = 'Register Gym';
      if (loader) loader.style.display = 'none';
    }
  });
}
  // Prepare FormData object for submission
  function prepareFormData() {
    const formData = new FormData();
    const form = document.getElementById('gymRegisterForm');
    
    // Basic Info
    formData.append('gymName', form.gymName.value.trim());
    formData.append('email', form.email.value.trim());
    formData.append('phone', form.phone.value.trim());
    formData.append('password', form.password.value);
    formData.append('currentMembers', form.currentMembers.value.trim());

    // Logo
    const logoInput = document.getElementById('gymLogo');
    if (logoInput?.files?.[0]) {
      formData.append('logo', logoInput.files[0]);
    }

    // Location
    formData.append('address', form.address.value.trim());
    formData.append('city', form.city.value.trim());
    formData.append('state', form.state.value.trim());
    formData.append('pincode', form.pincode.value.trim());
    formData.append('landmark', form.landmark.value.trim());

    // Description
    formData.append('description', form.description.value.trim());

    // Equipment
    document.querySelectorAll('input[name="equipment"]:checked').forEach(chk => {
      formData.append('equipment', chk.value);
    });

    // Activities
    const activitiesGrid = document.getElementById('activitiesInteractiveGrid');
    if (activitiesGrid) {
      const selectedActivities = activitiesGrid.querySelectorAll('.activity-card.selected');
      selectedActivities.forEach(card => {
        const activityName = card.querySelector('.activity-name').textContent;
        // Find the activity object from allPossibleActivities
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
        const activityObj = allPossibleActivities.find(a => a.name === activityName);
        if (activityObj) {
          formData.append('activities', JSON.stringify(activityObj));
        } else {
          // fallback: just send the name
          formData.append('activities', JSON.stringify({ name: activityName, icon: '', description: '' }));
        }
      });
    }

    // Membership Plans (unchanged)
    const membershipPlansGrid = document.getElementById('membershipPlansGrid');
    if (membershipPlansGrid) {
      const planCards = membershipPlansGrid.querySelectorAll('.plan-editor-card');
      planCards.forEach((card, idx) => {
        formData.append(`membershipPlans[${idx}][name]`, card.querySelector('input[name="planName[]"]').value);
        formData.append(`membershipPlans[${idx}][icon]`, card.querySelector('input[name="planIcon[]"]').value);
        formData.append(`membershipPlans[${idx}][color]`, card.querySelector('input[name="planColor[]"]').value);
        formData.append(`membershipPlans[${idx}][price]`, card.querySelector('input[name="planPrice[]"]').value);
        formData.append(`membershipPlans[${idx}][discount]`, card.querySelector('input[name="planDiscount[]"]').value);
        formData.append(`membershipPlans[${idx}][discountMonths]`, card.querySelector('input[name="planDiscountMonths[]"]').value);
        formData.append(`membershipPlans[${idx}][benefits]`, card.querySelector('textarea[name="planBenefits[]"]').value);
        formData.append(`membershipPlans[${idx}][note]`, card.querySelector('input[name="planNote[]"]').value);
      });
    }

    // Gym Photos
    const photoCards = gymPhotoCardsContainer.querySelectorAll('.gym-photo-card');
    photoCards.forEach((card, i) => {
      const fileInput = card.querySelector('input[type="file"]');
      const titleInput = card.querySelector('input[name="photoTitle[]"]');
      const categoryInput = card.querySelector('select[name="photoCategory[]"]');
      const descInput = card.querySelector('textarea[name="photoDescription[]"]');
      if (fileInput?.files?.[0]) {
        formData.append('gymImages', fileInput.files[0]);
      }
      if (titleInput) formData.append(`gymImagesMeta[${i}][title]`, titleInput.value.trim());
      if (descInput) formData.append(`gymImagesMeta[${i}][description]`, descInput.value.trim());
      if (categoryInput) formData.append(`gymImagesMeta[${i}][category]`, categoryInput.value);
    });

    // Customer Support
    formData.append('contactPerson', form.contactPerson.value.trim());
    formData.append('supportEmail', form.supportEmail.value.trim());
    formData.append('supportPhone', form.supportPhone.value.trim());

    // Operating Hours
    formData.append('openingTime', form.openingTime.value);
    formData.append('closingTime', form.closingTime.value);

    return formData;
  }
}

// ================ UTILITY FUNCTIONS ================
function initScrollAnimations() {
  function animateOnScroll() {
    document.querySelectorAll('.form-section').forEach(section => {
      if (section.getBoundingClientRect().top < window.innerHeight - 100) {
        section.style.opacity = '1';
        section.style.transform = 'translateY(0)';
      }
    });
  }
  
  window.addEventListener('scroll', animateOnScroll);
  animateOnScroll(); // Initial check
}