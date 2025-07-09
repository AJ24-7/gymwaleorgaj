// --- Membership Plans Card Logic ---
const membershipPlansGrid = document.getElementById('membershipPlansGrid');
const planNames = [
  { name: 'Basic', icon: 'fa-leaf', color: '#38b000' },
  { name: 'Standard', icon: 'fa-star', color: '#1976d2' },
  { name: 'Premium', icon: 'fa-crown', color: '#f59e42' }
];

function renderMembershipPlansGrid() {
  if (!membershipPlansGrid) return;
  membershipPlansGrid.innerHTML = '';
  planNames.forEach((plan, idx) => {
    const card = document.createElement('div');
    card.className = 'plan-editor-card';
    card.style = 'background:#f8f9fa;border-radius:10px;padding:16px 18px;min-width:260px;max-width:320px;box-shadow:0 2px 8px #0001;margin-bottom:10px;position:relative;';
    card.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:1.6em;color:${plan.color};"><i class="fas ${plan.icon}"></i></div>
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
    membershipPlansGrid.appendChild(card);
  });
}

renderMembershipPlansGrid();

// --- Discounted Amount Calculation Logic ---
function setupPlanDiscountCalculation() {
  if (!membershipPlansGrid) return;
  const cards = membershipPlansGrid.querySelectorAll('.plan-editor-card');
  cards.forEach(card => {
    const priceInput = card.querySelector('.plan-price-input');
    const discountInput = card.querySelector('.plan-discount-input');
    const monthsInput = card.querySelector('.plan-discount-months-input');
    const discountedAmountDiv = card.querySelector('.plan-discounted-amount');

    function updateDiscountedAmount() {
      const price = parseFloat(priceInput.value);
      const discount = parseFloat(discountInput.value);
      const months = parseInt(monthsInput.value);
      if (!isNaN(price) && price > 0 && !isNaN(discount) && discount > 0 && !isNaN(months) && months > 0) {
        const total = price * months;
        const discountAmt = total * (discount / 100);
        const finalAmt = total - discountAmt;
        discountedAmountDiv.innerHTML = `Discounted: <span style="color:#38b000;">₹${finalAmt.toLocaleString(undefined, {maximumFractionDigits:2})}</span> <span style="font-size:0.95em;font-weight:400;color:#888;">(You save ₹${discountAmt.toLocaleString(undefined, {maximumFractionDigits:2})})</span>`;
      } else {
        discountedAmountDiv.innerHTML = '';
      }
    }

    priceInput.addEventListener('input', updateDiscountedAmount);
    discountInput.addEventListener('input', updateDiscountedAmount);
    monthsInput.addEventListener('input', updateDiscountedAmount);
  });
}

setupPlanDiscountCalculation();

// --- Membership Plan Card Field Hints ---
function addPlanFieldHints() {
  if (!membershipPlansGrid) return;
  membershipPlansGrid.querySelectorAll('.plan-hint-msg').forEach(el => el.remove());
  const cards = membershipPlansGrid.querySelectorAll('.plan-editor-card');
  cards.forEach(card => {
    const priceInput = card.querySelector('.plan-price-input');
    const discountInput = card.querySelector('.plan-discount-input');
    const monthsInput = card.querySelector('.plan-discount-months-input');

    function createTooltip(input, msg) {
      let tooltip = input.parentNode.querySelector('.plan-hint-tooltip');
      if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.className = 'plan-hint-tooltip';
        tooltip.style = `
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
        tooltip.textContent = msg;
        input.parentNode.style.position = 'relative';
        input.parentNode.appendChild(tooltip);
      }
      tooltip.textContent = msg;
      return tooltip;
    }

    function showTooltip(input, msg) {
      const tooltip = createTooltip(input, msg);
      tooltip.style.opacity = '1';
    }
    function hideTooltip(input) {
      const tooltip = input.parentNode.querySelector('.plan-hint-tooltip');
      if (tooltip) tooltip.style.opacity = '0';
    }

    priceInput.addEventListener('mouseenter', () => showTooltip(priceInput, 'Fill per month price'));
    priceInput.addEventListener('mouseleave', () => hideTooltip(priceInput));
    discountInput.addEventListener('mouseenter', () => showTooltip(discountInput, 'Enter discount percentage'));
    discountInput.addEventListener('mouseleave', () => hideTooltip(discountInput));
    monthsInput.addEventListener('mouseenter', () => showTooltip(monthsInput, 'Enter discount applied on months'));
    monthsInput.addEventListener('mouseleave', () => hideTooltip(monthsInput));
  });
}

addPlanFieldHints();

// --- Membership Plans Section Hover Info ---
const plansGrid = document.getElementById('membershipPlansGrid');
if (plansGrid?.parentElement) {
  const infoMsg = document.createElement('div');
  infoMsg.className = 'plans-hover-info-msg';
  infoMsg.style = 'display:none;margin-top:8px;padding:10px 14px;background:#e3eafc;border-radius:7px;color:#1976d2;font-size:0.98em;font-weight:500;position:relative;z-index:2;box-shadow:0 2px 8px #4361ee11;';
  infoMsg.innerHTML = '<i class="fas fa-info-circle" style="margin-right:6px;"></i>You can change the Plans after Approval from the dashboard.';
  plansGrid.parentElement.appendChild(infoMsg);
  
  plansGrid.addEventListener('mouseenter', () => infoMsg.style.display = 'block');
  plansGrid.addEventListener('mouseleave', () => infoMsg.style.display = 'none');
}

console.log("✅ DOM Ready");

// --- Main Form Logic ---
const form = document.getElementById('gymRegisterForm');
if (!form) {
  console.error('❌ Could not find form with id gymRegisterForm');
} else {
  console.log('✅ Form submit handler attached');
  const API_BASE_URL = 'http://localhost:5000/api';

  // --- Gym Logo Upload & Preview ---
  const logoInput = document.getElementById('gymLogo');
  const logoPreview = document.getElementById('logoPreviewImage');
  if (logoInput && logoPreview) {
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

  // --- Animate Form Sections on Scroll ---
  function animateOnScroll() {
    document.querySelectorAll('.form-section').forEach(section => {
      if (section.getBoundingClientRect().top < window.innerHeight - 100) {
        section.style.opacity = '1';
        section.style.transform = 'translateY(0)';
      }
    });
  }
  window.addEventListener('scroll', animateOnScroll);
  animateOnScroll();

  // --- Password Reminder Message ---
  const passwordInput = document.getElementById('password');
  const passwordReminderMsg = document.getElementById('passwordReminderMsg');
  if (passwordInput && passwordReminderMsg) {
    passwordInput.addEventListener('input', function() {
      passwordReminderMsg.style.display = passwordInput.value.trim().length > 0 ? 'block' : 'none';
    });
  }

  // --- Interactive Activities Offered Section ---
  const activitiesGrid = document.getElementById('activitiesInteractiveGrid');
  const activitiesError = document.getElementById('activitiesError');
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

  function renderActivitiesGrid() {
    if (!activitiesGrid) return;
    activitiesGrid.innerHTML = '';
    allPossibleActivities.forEach((act) => {
      const card = document.createElement('div');
      card.className = 'activity-card';
      card.tabIndex = 0;
      card.setAttribute('role', 'button');
      card.setAttribute('aria-pressed', selectedActivities.some(a => a.name === act.name));
      card.innerHTML = `
        <div class="activity-icon"><i class="fas ${act.icon}"></i></div>
        <div class="activity-name">${act.name}</div>
        <button type="button" class="activity-info-btn" title="View description" tabindex="-1"><i class="fas fa-info-circle"></i></button>
      `;
      if (selectedActivities.some(a => a.name === act.name)) {
        card.classList.add('selected');
      }
      card.addEventListener('click', function(e) {
        if (e.target.closest('.activity-info-btn')) return;
        card.classList.toggle('selected');
        selectedActivities = card.classList.contains('selected') 
          ? [...selectedActivities, act]
          : selectedActivities.filter(a => a.name !== act.name);
        card.setAttribute('aria-pressed', card.classList.contains('selected'));
        if (activitiesError) activitiesError.style.display = selectedActivities.length ? 'none' : 'block';
      });
      card.querySelector('.activity-info-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        showActivityDescriptionModal(act);
      });
      activitiesGrid.appendChild(card);
    });
  }

  function showActivityDescriptionModal(activity) {
    let modal = document.getElementById('activityDescModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'activityDescModal';
      modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0,0,0,0.25);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 99999;
      `;
      document.body.appendChild(modal);
    }
    modal.innerHTML = `
      <div style="background:#fff;max-width:350px;width:90vw;padding:28px 22px 18px 22px;border-radius:12px;box-shadow:0 4px 32px rgba(0,0,0,0.18);text-align:center;position:relative;">
        <div style="font-size:2.2em;color:#1976d2;margin-bottom:8px;"><i class="fas ${activity.icon}"></i></div>
        <div style="font-size:1.18em;font-weight:700;margin-bottom:8px;">${activity.name}</div>
        <div style="font-size:1em;color:#444;margin-bottom:18px;white-space:pre-line;">${activity.description}</div>
        <button id="closeActivityDescModal" style="background:#1976d2;color:#fff;padding:8px 24px;border:none;border-radius:6px;font-size:1em;cursor:pointer;">Close</button>
      </div>
    `;
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    document.getElementById('closeActivityDescModal').onclick = function() {
      modal.style.display = 'none';
      document.body.style.overflow = '';
    };
    modal.addEventListener('mousedown', function(e) {
      if (e.target === modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
      }
    });
  }

  renderActivitiesGrid();

  // --- Gym Photo Cards Dynamic Logic ---
  const gymPhotoCardsContainer = document.getElementById('gymPhotoCardsContainer');
  const addGymPhotoCardBtn = document.getElementById('addGymPhotoCardBtn');

  function createGymPhotoCard() {
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

  function updateRemovePhotoCardButtons() {
    const cards = gymPhotoCardsContainer.querySelectorAll('.gym-photo-card');
    cards.forEach(card => {
      const removeBtn = card.querySelector('.remove-gym-photo-card');
      if (removeBtn) removeBtn.style.display = cards.length > 1 ? 'inline-block' : 'none';
    });
  }

  function addGymPhotoCard() {
    const cards = gymPhotoCardsContainer.querySelectorAll('.gym-photo-card');
    if (cards.length >= 5) {
      alert('Maximum 5 photos allowed.');
      return;
    }
    const card = createGymPhotoCard();
    gymPhotoCardsContainer.appendChild(card);
    updateRemovePhotoCardButtons();
  }

  if (addGymPhotoCardBtn && gymPhotoCardsContainer) {
    addGymPhotoCardBtn.addEventListener('click', addGymPhotoCard);
    gymPhotoCardsContainer.addEventListener('click', function(e) {
      if (e.target.classList.contains('remove-gym-photo-card')) {
        e.target.closest('.gym-photo-card').remove();
        updateRemovePhotoCardButtons();
      }
    });
    gymPhotoCardsContainer.addEventListener('change', function(e) {
      if (e.target.type === 'file') {
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
    });
    if (gymPhotoCardsContainer.querySelectorAll('.gym-photo-card').length === 0) {
      addGymPhotoCard();
    }
    updateRemovePhotoCardButtons();
  }

  // --- Equipment Info Message Show/Hide ---
  const equipmentGrid = document.getElementById('equipmentGrid');
  const equipmentInfoMsg = document.querySelector('.equipment-info-msg');
  if (equipmentGrid && equipmentInfoMsg) {
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

  // --- Form Validation ---
  function validateForm() {
    let valid = true;
    console.log("Starting form validation...");

    // Required fields check
    document.querySelectorAll('[required]').forEach(field => {
      const error = field.nextElementSibling;
      if (!field.value.trim()) {
        console.log(`Validation failed for ${field.name || field.className}`);
        field.classList.add('error-border');
        if (error && error.classList.contains('error')) {
          error.style.display = 'block';
        }
        valid = false;
      } else {
        field.classList.remove('error-border');
        if (error && error.classList.contains('error')) {
          error.style.display = 'none';
        }
      }
    });

    // Email validation
    const emailField = form.querySelector('input[type="email"]');
    if (emailField) {
      const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!regex.test(emailField.value.trim())) {
        console.log("Invalid email format");
        emailField.classList.add('error-border');
        if (emailField.nextElementSibling) {
          emailField.nextElementSibling.style.display = 'block';
          emailField.nextElementSibling.textContent = 'Enter a valid email';
        }
        valid = false;
      }
    }

    // Password validation
    const passwordField = form.querySelector('input[type="password"]');
    if (passwordField && passwordField.value.length < 6) {
      console.log("Password too short");
      passwordField.classList.add('error-border');
      if (passwordField.nextElementSibling) {
        passwordField.nextElementSibling.style.display = 'block';
        passwordField.nextElementSibling.textContent = 'Password must be at least 6 characters';
      }
      valid = false;
    }

    // Equipment validation
    const checkedEquip = form.querySelectorAll('input[name="equipment"]:checked');
    const equipError = document.getElementById('equipmentError');
    if (equipError) {
      equipError.style.display = checkedEquip.length ? 'none' : 'block';
      if (!checkedEquip.length) {
        console.log("No equipment selected");
        valid = false;
      }
    }

    // Activities validation
    if (activitiesError) {
      activitiesError.style.display = selectedActivities.length ? 'none' : 'block';
      if (!selectedActivities.length) {
        console.log("No activities selected");
        valid = false;
      }
    }

    // Photo validation
    const photoCards = gymPhotoCardsContainer.querySelectorAll('.gym-photo-card');
    if (photoCards.length === 0) {
      console.log("No photos added");
      valid = false;
    } else {
      photoCards.forEach(card => {
        const fileInput = card.querySelector('input[type="file"]');
        if (!fileInput.files[0]) {
          console.log("Photo not uploaded");
          valid = false;
        }
      });
    }

    console.log(`Form validation ${valid ? 'passed' : 'failed'}`);
    return valid;
  }

  // --- Form Submission ---
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log("Form submit initiated");

    const submitBtn = document.getElementById('submitBtn');
    const btnText = document.getElementById('btnText');
    const loader = document.getElementById('loader');
    const formContainer = document.querySelector('.form-container');
    const successMessage = document.getElementById('successMessage');

    if (!submitBtn) {
    console.error('❌ Submit button with id submitBtn not found');
    alert('Submit button not found: #submitBtn');
  } else {
    console.log('✅ Submit button found:', submitBtn);
  }

    try {
      console.log("Validating form...");
      if (!validateForm()) {
        console.log("Validation failed - stopping submission");
        return;
      }

      console.log("Preparing submission...");
      btnText.textContent = 'Submitting...';
      loader.style.display = 'inline-block';
      submitBtn.disabled = true;

      const formData = new FormData();
      // Basic Info
      formData.append('gymName', form.gymName.value.trim());
      formData.append('currentMembers', form.currentMembers.value.trim());
      formData.append('email', form.email.value.trim());
      formData.append('phone', form.phone.value.trim());
      formData.append('password', form.password.value);
      
      // Logo
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
      selectedActivities.forEach(act => formData.append('activities', act.name));

      // Membership Plans
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

      console.log("Sending request to server...");
      const res = await fetch(`${API_BASE_URL}/gyms/register`, {
        method: "POST",
        body: formData,
      });

      console.log("Response received, status:", res.status);
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = { message: text };
      }

      if (!res.ok) throw new Error(data.message || "Server error");
      
      console.log("✅ Registration success:", data);
      formContainer.style.display = 'none';
      successMessage.innerHTML = `
        <div class="loading-animation">
          <div class="loader-circle"></div>
          <p>Processing your registration...</p>
        </div>
      `;
      successMessage.style.display = 'block';
      
      setTimeout(() => {
        successMessage.innerHTML = `
          <div class="success-animation">
            <svg class="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
              <circle class="checkmark__circle" cx="26" cy="26" r="25" fill="none"/>
              <path class="checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
            </svg>
            <h3>Registration Successful!</h3>
            <p>Your gym registration has been received. Please check your email for confirmation.</p>
          </div>
        `;
      }, 2000);

    } catch (err) {
      console.error("❌ Submit error:", err);
      btnText.textContent = 'Register Gym';
      loader.style.display = 'none';
      submitBtn.disabled = false;
      
      let errorMessage = err && err.message ? err.message : String(err);
      if (err.message && err.message.includes("Network")) {
        errorMessage = "Check your internet connection.";
      } else if (err.message && err.message.includes("Server")) {
        errorMessage = "Server error. Try again later.";
      }

      successMessage.innerHTML = `
        <div class="error-message">
          <h3>Registration Failed</h3>
          <p>${errorMessage}</p>
          <button id="tryAgainBtn" class="btn">Try Again</button>
        </div>
      `;
      successMessage.style.display = 'block';
      
      document.getElementById('tryAgainBtn')?.addEventListener('click', () => {
        successMessage.style.display = 'none';
        formContainer.style.display = 'block';
      });
    }
  });
}