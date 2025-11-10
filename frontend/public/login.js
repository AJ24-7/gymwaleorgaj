document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
  const loginForm = document.getElementById("login-form");
  const signupForm = document.getElementById("signup-form");
  const errorMsg = document.getElementById("error-message");
  const showLoginBtn = document.getElementById("show-login");
  const showSignupBtn = document.getElementById("show-signup");
  
  const API_BASE_URL = "http://localhost:5000/api/users";

  // Check if user was redirected for membership purchase
  const urlParams = new URLSearchParams(window.location.search);
  const redirectReason = urlParams.get('reason');
  if (redirectReason === 'membership') {
    showError('Please login or create an account to purchase membership');
  }

  // Utility Functions
  function showError(message) {
    errorMsg.textContent = message;
    errorMsg.style.display = 'block';
    setTimeout(() => {
      errorMsg.style.display = 'none';
    }, 5000);
  }

  function hideError() {
    errorMsg.style.display = 'none';
  }

  // Form Toggle Functions
  function showLoginForm() {
    showLoginBtn.classList.add('active');
    showSignupBtn.classList.remove('active');
    loginForm.classList.add('active');
    signupForm.classList.remove('active');
    hideError();
  }

  function showSignupForm() {
    showSignupBtn.classList.add('active');
    showLoginBtn.classList.remove('active');
    signupForm.classList.add('active');
    loginForm.classList.remove('active');
    hideError();
  }

  // Event Listeners for Toggle Buttons
  showLoginBtn.addEventListener('click', (e) => {
    e.preventDefault();
    showLoginForm();
  });

  showSignupBtn.addEventListener('click', (e) => {
    e.preventDefault();
    showSignupForm();
  });

  // Initialize
  showLoginForm(); 
   // === Forgot Password Logic ===
  const forgotPasswordLink = document.getElementById('forgotPasswordLink');
  const requestOtpModal = document.getElementById('requestOtpModal');
  const resetPasswordModal = document.getElementById('resetPasswordModal');
  const closeRequestOtp = document.getElementById('closeRequestOtp');
  const closeResetPassword = document.getElementById('closeResetPassword');
  const requestOtpForm = document.getElementById('requestOtpForm');
  const otpEmailInput = document.getElementById('otpEmailInput');
  const requestOtpMessage = document.getElementById('requestOtpMessage');
  const resetPasswordForm = document.getElementById('resetPasswordForm');
  const otpCodeInput = document.getElementById('otpCodeInput');
  const newPasswordInput = document.getElementById('newPasswordInput');
  const confirmNewPasswordInput = document.getElementById('confirmNewPasswordInput');
  const resetPasswordMessage = document.getElementById('resetPasswordMessage');
  let forgotEmail = '';

  function openModal(modal) {
    modal.style.display = 'block';
  }
  function closeModal(modal) {
    modal.style.display = 'none';
  }

  if (forgotPasswordLink && requestOtpModal) {
    forgotPasswordLink.addEventListener('click', (e) => {
      e.preventDefault();
      openModal(requestOtpModal);
      requestOtpMessage.textContent = '';
      otpEmailInput.value = '';
    });
  }
  if (closeRequestOtp) {
    closeRequestOtp.addEventListener('click', () => closeModal(requestOtpModal));
  }
  if (closeResetPassword) {
    closeResetPassword.addEventListener('click', () => closeModal(resetPasswordModal));
  }
  window.addEventListener('click', (e) => {
    if (e.target === requestOtpModal) closeModal(requestOtpModal);
    if (e.target === resetPasswordModal) closeModal(resetPasswordModal);
  });

  if (requestOtpForm) {
    requestOtpForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = otpEmailInput.value.trim();
      if (!email) {
        requestOtpMessage.textContent = 'Please enter your email.';
        requestOtpMessage.style.color = 'red';
        return;
      }
      requestOtpMessage.textContent = 'Sending OTP...';
      requestOtpMessage.style.color = '#333';
      try {
        const res = await fetch(`${API_BASE_URL}/request-password-reset-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        const data = await res.json();
        if (data.success) {
          requestOtpMessage.textContent = 'OTP sent! Check your email.';
          requestOtpMessage.style.color = 'green';
          forgotEmail = email;
          setTimeout(() => {
            closeModal(requestOtpModal);
            openModal(resetPasswordModal);
            resetPasswordMessage.textContent = '';
            otpCodeInput.value = '';
            newPasswordInput.value = '';
            confirmNewPasswordInput.value = '';
          }, 1200);
        } else {
          requestOtpMessage.textContent = data.message || 'Failed to send OTP.';
          requestOtpMessage.style.color = 'red';
        }
      } catch (err) {
        requestOtpMessage.textContent = 'Server error. Try again.';
        requestOtpMessage.style.color = 'red';
      }
    });
  }

  if (resetPasswordForm) {
    resetPasswordForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const otp = otpCodeInput.value.trim();
      const newPassword = newPasswordInput.value.trim();
      const confirmNewPassword = confirmNewPasswordInput.value.trim();
      if (!otp || !newPassword || !confirmNewPassword) {
        resetPasswordMessage.textContent = 'All fields are required.';
        resetPasswordMessage.style.color = 'red';
        return;
      }
      if (newPassword !== confirmNewPassword) {
        resetPasswordMessage.textContent = 'Passwords do not match.';
        resetPasswordMessage.style.color = 'red';
        return;
      }
      resetPasswordMessage.textContent = 'Resetting password...';
      resetPasswordMessage.style.color = '#333';
      try {
        const res = await fetch(`${API_BASE_URL}/verify-password-reset-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: forgotEmail, otp, newPassword })
        });
        const data = await res.json();
        if (data.success) {
          resetPasswordMessage.textContent = 'Password reset successful! You can now login.';
          resetPasswordMessage.style.color = 'green';
          setTimeout(() => {
            closeModal(resetPasswordModal);
          }, 1500);
        } else {
          resetPasswordMessage.textContent = data.message || 'Failed to reset password.';
          resetPasswordMessage.style.color = 'red';
        }
      } catch (err) {
        resetPasswordMessage.textContent = 'Server error. Try again.';
        resetPasswordMessage.style.color = 'red';
      }
    });
  }

  // Enhanced Login Handler
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideError();

    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value.trim();
    const submitBtn = loginForm.querySelector('button[type="submit"]');

    if (!email || !password) {
      return showError("Please fill in both email and password.");
    }

    // Loading state
    submitBtn.disabled = true;
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';

    try {
      const res = await fetch(`${API_BASE_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        submitBtn.innerHTML = '<i class="fas fa-check"></i> Success!';
        localStorage.setItem("token", data.token);
        localStorage.setItem("username", data.user.name || data.user.username);
        
        setTimeout(() => {
          // Check for stored redirect URL (from login prompt on gym details page)
          const storedRedirect = localStorage.getItem('redirectAfterLogin');
          if (storedRedirect) {
            localStorage.removeItem('redirectAfterLogin');
            window.location.href = storedRedirect;
            return;
          }
          
          // Check for redirect URL parameter
          const urlParams = new URLSearchParams(window.location.search);
          const redirectUrl = urlParams.get('redirect');
          
          if (redirectUrl) {
            // Decode and redirect to the original URL
            window.location.href = decodeURIComponent(redirectUrl);
          } else {
            // Default redirect to user profile
            window.location.href = "./userprofile.html";
          }
        }, 1000);
      } else {
        throw new Error(data.message || "Login failed.");
      }
    } catch (err) {
      console.error("Login error:", err);
      showError(err.message || "Network error. Please check your connection.");
    } finally {
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
    }
  });

  // Enhanced Signup Handler
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideError();

    const username = document.getElementById("username").value.trim();
    const email = document.getElementById("signup-email").value.trim();
    const phone = document.getElementById("signup-phone").value.trim();
    const password = document.getElementById("signup-password").value.trim();
    const submitBtn = signupForm.querySelector('button[type="submit"]');

    if (!username || !email || !phone || !password) {
      return showError("Please fill in all fields.");
    }

    if (password.length < 6) {
      return showError("Password must be at least 6 characters long.");
    }

    // Loading state
    submitBtn.disabled = true;
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...';

    try {
      const res = await fetch(`${API_BASE_URL}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, phone, password }),
      });

      const data = await res.json();

      if (res.ok) {
        submitBtn.innerHTML = '<i class="fas fa-check"></i> Account created!';
        localStorage.setItem("token", data.token);
        localStorage.setItem("username", data.user.name || data.user.username);
        
        setTimeout(() => {
          // Check for stored redirect URL (from login prompt on gym details page)
          const storedRedirect = localStorage.getItem('redirectAfterLogin');
          if (storedRedirect) {
            localStorage.removeItem('redirectAfterLogin');
            window.location.href = storedRedirect;
            return;
          }
          
          // Check for redirect URL parameter
          const urlParams = new URLSearchParams(window.location.search);
          const redirectUrl = urlParams.get('redirect');
          
          if (redirectUrl) {
            // Decode and redirect to the original URL
            window.location.href = decodeURIComponent(redirectUrl);
          } else {
            // Default redirect to user profile
            window.location.href = "./userprofile.html";
          }
        }, 1000);
      } else {
        throw new Error(data.message || "Signup failed.");
      }
    } catch (error) {
      console.error("Signup error:", error);
      showError(error.message || "Network error. Please check your connection.");
    } finally {
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
    }
  });

  // Google Login Configuration  
  const GOOGLE_CLIENT_ID = "905615420032-7lun3p0t94s3f9sah5a3v5tbhgm4r485.apps.googleusercontent.com";

  // Enhanced Google credential handler
  async function handleGoogleCredentialResponse(response) {
    console.log('Google credential response received');
    
    if (!response.credential) {
      console.error('No credential in Google response');
      showError('Google login failed: No credential received');
      return;
    }
    
    try {
      console.log('Sending credential to backend...');
      const res = await fetch(`${API_BASE_URL}/google-auth`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ credential: response.credential })
      });
      
      const data = await res.json();
      console.log('Backend response:', data);
      
      if (res.ok) {
        console.log('Google authentication successful');
        localStorage.setItem("token", data.token);
        localStorage.setItem("username", data.user.name || data.user.username);
        localStorage.setItem("profileImage", data.user.profileImage || "");
        
        setTimeout(() => {
          window.location.href = "./userprofile.html";
        }, 100);
      } else {
        console.error('Backend authentication failed:', data.message);
        showError(data.message || "Google authentication failed.");
      }
    } catch (err) {
      console.error('Network error during Google authentication:', err);
      showError("Network error during Google authentication. Please check your connection.");
    }
  }

  // Google button renderer
  function renderGoogleButton(targetId) {
    console.log(`Attempting to render Google button for: ${targetId}`);
    const targetElement = document.getElementById(targetId);
    
    if (!targetElement) {
      console.error(`Target element not found: ${targetId}`);
      return;
    }
    
    if (window.google && window.google.accounts && window.google.accounts.id) {
      console.log('Google API is available, initializing...');
      try {
        google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true
        });
        
        google.accounts.id.renderButton(
          targetElement,
          { 
            theme: "outline", 
            size: "large", 
            width: "100%",
            text: "signin_with",
            shape: "rectangular"
          }
        );
        console.log(`Google button rendered successfully for: ${targetId}`);
      } catch (error) {
        console.error('Error rendering Google button:', error);
        targetElement.innerHTML = '<div style="color: red; text-align: center; padding: 10px;">Google Login Error</div>';
      }
    } else {
      console.log('Google API not ready, retrying in 500ms...');
      setTimeout(() => renderGoogleButton(targetId), 500);
    }
  }

  // Initialize Google Login
  function initializeGoogleLogin() {
    console.log('Initializing Google Login...');
    
    // Add loading indicators
    const loginBtn = document.getElementById("google-signin-btn-login");
    const signupBtn = document.getElementById("google-signin-btn-signup");
    
    if (loginBtn) {
      loginBtn.innerHTML = '<div style="padding: 10px; text-align: center; color: #666;"><i class="fas fa-spinner fa-spin"></i> Loading Google Login...</div>';
    }
    
    if (signupBtn) {
      signupBtn.innerHTML = '<div style="padding: 10px; text-align: center; color: #666;"><i class="fas fa-spinner fa-spin"></i> Loading Google Login...</div>';
    }
    
    // Render buttons after delay
    setTimeout(() => {
      renderGoogleButton("google-signin-btn-login");
      renderGoogleButton("google-signin-btn-signup");
    }, 1000);
  }

  // Initialize Google login when page loads
  initializeGoogleLogin();
});