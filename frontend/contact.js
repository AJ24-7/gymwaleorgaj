function logout() {
  localStorage.removeItem('token'); // only remove token if that's what you're using
  window.location.href = 'index.html';
}
document.addEventListener('DOMContentLoaded', function () {
  // === LOADING SCREEN ===
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

  // === NAVIGATION BAR: Toggle & Active Link Highlight ===
  const menuToggle = document.querySelector('.menu-toggle');
  const navLinks = document.querySelector('.nav-links');
  const links = document.querySelectorAll('.nav-link');
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';

  // Mobile menu toggle
  if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', function () {
      navLinks.classList.toggle('nav-active');
    });
  }

  // Dropdown open/close for mobile
  document.querySelectorAll('.dropdown > a').forEach(function (dropLink) {
    dropLink.addEventListener('click', function (e) {
      if (window.innerWidth <= 900) {
        e.preventDefault();
        const parentDropdown = this.parentElement;
        parentDropdown.classList.toggle('open');
        document.querySelectorAll('.dropdown').forEach(function (dd) {
          if (dd !== parentDropdown) dd.classList.remove('open');
        });
      }
    });
  });

  // Settings submenu open/close for mobile
  document.querySelectorAll('.settings-option > a').forEach(function (settingsLink) {
    settingsLink.addEventListener('click', function (e) {
      if (window.innerWidth <= 900) {
        e.preventDefault();
        const parentOption = this.parentElement;
        parentOption.classList.toggle('open');
        document.querySelectorAll('.settings-option').forEach(function (opt) {
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

  // === USER AUTHENTICATION & PROFILE PICTURE ===
  const token = localStorage.getItem("token");
  const userNav = document.getElementById("user-profile-nav");
  const loginNav = document.getElementById("login-signup-nav");
  const logoutBtn = document.getElementById('logout-btn');

  if (userNav) userNav.style.display = "none";
  if (loginNav) loginNav.style.display = "none";

  if (logoutBtn) {
    logoutBtn.addEventListener('click', function (e) {
      e.preventDefault();
      localStorage.removeItem('token');
      window.location.href = 'index.html';
    });
  }

  if (!token) {
    if (loginNav) loginNav.style.display = "block";
  } else {
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

        if (userNav) userNav.style.display = "block";
        if (loginNav) loginNav.style.display = "none";
      })
      .catch(error => {
        console.error("Error fetching user:", error.message);
        if (loginNav) loginNav.style.display = "block";
      });
  }

  // === FAQ TOGGLE ===
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');
    question.addEventListener('click', () => {
      item.classList.toggle('active');
      faqItems.forEach(otherItem => {
        if (otherItem !== item && otherItem.classList.contains('active')) {
          otherItem.classList.remove('active');
        }
      });
    });
  });

  // === CONTACT FORM ENHANCEMENT WITH QUICK MESSAGES AND API INTEGRATION ===
  let selectedQuickMessage = null;
  let userProfile = null;

  // Load quick messages and user profile
  loadQuickMessages();
  loadUserProfile();

  async function loadQuickMessages() {
    try {
      const response = await fetch('http://localhost:5000/api/admin/communication/contact/quick-messages');
      if (response.ok) {
        const result = await response.json();
        displayQuickMessages(result.data);
      }
    } catch (error) {
      console.error('Error loading quick messages:', error);
    }
  }

  function displayQuickMessages(messages) {
    const quickMessagesGrid = document.getElementById('quickMessagesGrid');
    if (!quickMessagesGrid) return;

    quickMessagesGrid.innerHTML = messages.map(msg => `
      <div class="quick-message-btn" data-message='${JSON.stringify(msg)}'>
        <div class="title">${msg.title}</div>
        <div class="preview">${msg.message}</div>
      </div>
    `).join('');

    // Add click event listeners
    quickMessagesGrid.querySelectorAll('.quick-message-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const messageData = JSON.parse(this.dataset.message);
        selectQuickMessage(messageData, this);
      });
    });
  }

  function selectQuickMessage(messageData, buttonElement) {
    // Update selected state
    document.querySelectorAll('.quick-message-btn').forEach(btn => {
      btn.classList.remove('selected');
    });
    buttonElement.classList.add('selected');

    selectedQuickMessage = messageData;

    // Auto-fill form fields
    document.getElementById('subject').value = messageData.title;
    document.getElementById('category').value = messageData.category;
    document.getElementById('message').value = messageData.message;

    // Show/hide activities section based on quick message category
    toggleActivitiesSection(messageData.category);
  }

  // Function to toggle activities section visibility
  function toggleActivitiesSection(category) {
    const activitiesSection = document.getElementById('activitiesSection');
    const relevantCategories = ['membership', 'service', 'general'];
    const relevantQuickMessages = ['membership_info', 'gym_locations', 'personal_training'];
    
    const shouldShow = relevantCategories.includes(category) || 
                      (selectedQuickMessage && relevantQuickMessages.includes(selectedQuickMessage.id));

    if (shouldShow) {
      activitiesSection.classList.add('show');
    } else {
      activitiesSection.classList.remove('show');
      // Clear selected activities when hiding
      document.querySelectorAll('input[name="activities"]:checked').forEach(checkbox => {
        checkbox.checked = false;
      });
    }
  }

  // Add event listener for category dropdown changes
  document.getElementById('category').addEventListener('change', function() {
    const selectedCategory = this.value;
    toggleActivitiesSection(selectedCategory);
  });

  async function loadUserProfile() {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const response = await fetch('http://localhost:5000/api/users/profile', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        userProfile = await response.json();
        
        // Auto-fill and lock user information
        const nameField = document.getElementById('name');
        const emailField = document.getElementById('email');
        const phoneField = document.getElementById('phone');

        if (userProfile.name) {
          nameField.value = userProfile.name;
          lockField(nameField);
        }
        
        if (userProfile.email) {
          emailField.value = userProfile.email;
          lockField(emailField);
        }
        
        if (userProfile.phone) {
          phoneField.value = userProfile.phone;
          lockField(phoneField);
        }
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  }

  // Function to lock a field
  function lockField(field) {
    field.disabled = true;
    field.parentElement.classList.add('field-locked');
  }

  // === ENHANCED CONTACT FORM SUBMISSION ===
  const contactForm = document.getElementById('contactForm');
  const successMessage = document.getElementById('successMessage');
  const errorMessage = document.getElementById('errorMessage');
  const submitBtn = document.getElementById('submitBtn');

  if (contactForm) {
    contactForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      
      const token = localStorage.getItem("token");
      
      // Check if user is logged in for certain categories
      const category = document.getElementById('category').value;
      const requiresAuth = ['membership', 'service', 'partnership'].includes(category);
      
      if (requiresAuth && !token) {
        // Store current form data and redirect to login
        const formData = getFormData();
        localStorage.setItem('pendingContactForm', JSON.stringify(formData));
        localStorage.setItem('redirectAfterLogin', window.location.href);
        showError('Please login to submit this type of inquiry. You will be redirected to the login page.');
        setTimeout(() => {
          window.location.href = '/frontend/public/login.html';
        }, 2000);
        return;
      }

      await submitContactForm();
    });
  }

  function getFormData() {
    const interestedActivities = Array.from(document.querySelectorAll('input[name="activities"]:checked'))
      .map(checkbox => checkbox.value);

    return {
      name: document.getElementById('name').value,
      email: document.getElementById('email').value,
      phone: document.getElementById('phone').value,
      subject: document.getElementById('subject').value,
      category: document.getElementById('category').value,
      message: document.getElementById('message').value,
      quickMessage: selectedQuickMessage?.id || null,
      interestedActivities: interestedActivities
    };
  }

  // Update form reset function to handle locked fields and activities section
  function resetForm() {
    const form = document.getElementById('contactForm');
    
    // Reset form fields but preserve locked user data
    const nameField = document.getElementById('name');
    const emailField = document.getElementById('email');
    const phoneField = document.getElementById('phone');
    
    const preservedName = nameField.disabled ? nameField.value : '';
    const preservedEmail = emailField.disabled ? emailField.value : '';
    const preservedPhone = phoneField.disabled ? phoneField.value : '';
    
    form.reset();
    
    // Restore preserved data
    if (preservedName) nameField.value = preservedName;
    if (preservedEmail) emailField.value = preservedEmail;
    if (preservedPhone) phoneField.value = preservedPhone;
    
    // Hide activities section and clear selection
    document.getElementById('activitiesSection').classList.remove('show');
    selectedQuickMessage = null;
    document.querySelectorAll('.quick-message-btn').forEach(btn => {
      btn.classList.remove('selected');
    });
  }

  async function submitContactForm() {
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoading = submitBtn.querySelector('.btn-loading');
    
    // Show loading state
    btnText.style.display = 'none';
    btnLoading.style.display = 'flex';
    submitBtn.disabled = true;

    try {
      const formData = getFormData();
      const token = localStorage.getItem("token");

      const headers = {
        'Content-Type': 'application/json'
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('http://localhost:5000/api/admin/communication/public/contact', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (response.ok && result.success) {
        const additionalData = {
          ticketId: result.ticketId || result.data?.ticketId,
          email: formData.email
        };
        showSuccess(result.message || 'Your message has been sent successfully!', additionalData);
        resetForm();
      } else {
        throw new Error(result.message || 'Failed to send message');
      }

    } catch (error) {
      console.error('Error submitting contact form:', error);
      showError(error.message || 'Failed to send message. Please try again.');
    } finally {
      // Reset button state
      btnText.style.display = 'block';
      btnLoading.style.display = 'none';
      submitBtn.disabled = false;
    }
  }

  function showSuccess(message, additionalData = {}) {
    const successModal = document.getElementById('successModal');
    const messageEl = document.getElementById('successModalMessage');
    const ticketIdEl = document.getElementById('ticketIdDisplay');
    const emailEl = document.getElementById('emailDisplay');
    
    // Update modal content
    messageEl.textContent = message;
    
    if (additionalData.ticketId) {
      ticketIdEl.textContent = additionalData.ticketId;
    }
    
    if (additionalData.email) {
      emailEl.textContent = additionalData.email;
    } else {
      const emailField = document.getElementById('email');
      emailEl.textContent = emailField.value || 'your email';
    }
    
    // Show modal
    successModal.classList.add('show');
    successModal.style.display = 'block';
    
    // Auto-hide after 10 seconds
    setTimeout(() => {
      hideSuccessModal();
    }, 10000);
  }

  function showError(message) {
    const errorModal = document.getElementById('errorModal');
    const messageEl = document.getElementById('errorModalMessage');
    
    messageEl.textContent = message;
    errorModal.classList.add('show');
    errorModal.style.display = 'block';
  }

  function hideSuccessModal() {
    const successModal = document.getElementById('successModal');
    successModal.classList.remove('show');
    setTimeout(() => {
      successModal.style.display = 'none';
    }, 300);
  }

  function hideErrorModal() {
    const errorModal = document.getElementById('errorModal');
    errorModal.classList.remove('show');
    setTimeout(() => {
      errorModal.style.display = 'none';
    }, 300);
  }

  // Modal event listeners
  document.getElementById('closeSuccessModal')?.addEventListener('click', hideSuccessModal);
  document.getElementById('okSuccessModal')?.addEventListener('click', hideSuccessModal);
  document.getElementById('closeErrorModal')?.addEventListener('click', hideErrorModal);
  document.getElementById('okErrorModal')?.addEventListener('click', hideErrorModal);
  document.getElementById('retryErrorModal')?.addEventListener('click', () => {
    hideErrorModal();
    // Optionally trigger form submission again
  });

  // Close modals when clicking backdrop
  document.getElementById('successModal')?.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-backdrop')) {
      hideSuccessModal();
    }
  });

  document.getElementById('errorModal')?.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-backdrop')) {
      hideErrorModal();
    }
  });

  // Check for pending contact form after login redirect
  window.addEventListener('load', function() {
    const pendingForm = localStorage.getItem('pendingContactForm');
    if (pendingForm && localStorage.getItem('token')) {
      try {
        const formData = JSON.parse(pendingForm);
        
        // Fill form with pending data
        Object.keys(formData).forEach(key => {
          if (key === 'interestedActivities') {
            formData[key].forEach(activity => {
              const checkbox = document.querySelector(`input[name="activities"][value="${activity}"]`);
              if (checkbox) checkbox.checked = true;
            });
          } else {
            const field = document.getElementById(key);
            if (field) field.value = formData[key];
          }
        });

        localStorage.removeItem('pendingContactForm');
        showSuccess('You have been logged in! Please review and submit your message.');
      } catch (error) {
        console.error('Error restoring pending form:', error);
      }
    }
  });

  // === SLIDE-UP ANIMATION ===
  const animateOnScroll = () => {
    const elements = document.querySelectorAll('.slide-up');
    elements.forEach((element) => {
      const elementPosition = element.getBoundingClientRect().top;
      const screenPosition = window.innerHeight / 1.2;

      if (elementPosition < screenPosition) {
        element.style.opacity = '1';
        element.style.transform = 'translateY(0)';
      }
    });
  };

  document.querySelectorAll('.slide-up').forEach((el, index) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(50px)';
    el.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
    el.style.transitionDelay = `${index * 0.1}s`;
  });

  window.addEventListener('load', animateOnScroll);
  window.addEventListener('scroll', animateOnScroll);

  // === SETTINGS SUBMENU SUPPORT (Desktop & Mobile) ===
  const settingsOptions = document.querySelectorAll('.settings-option');

  settingsOptions.forEach((option) => {
    option.addEventListener('mouseenter', function () {
      const submenu = this.querySelector('.settings-submenu');
      if (submenu) submenu.style.display = 'block';
    });

    option.addEventListener('mouseleave', function () {
      const submenu = this.querySelector('.settings-submenu');
      if (submenu) submenu.style.display = 'none';
    });

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
});
