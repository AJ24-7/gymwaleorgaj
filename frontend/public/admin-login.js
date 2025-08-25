document.addEventListener('DOMContentLoaded', function() {
    
    // Form elements
    const loginForm = document.getElementById('adminLoginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const emailError = document.getElementById('email-error');
    const passwordError = document.getElementById('password-error');
    const loginButton = document.getElementById('loginButton');
    const buttonText = document.getElementById('buttonText');
    const spinner = document.getElementById('spinner');
    
   
    
    if (!loginForm) {
        console.error('❌ Login form not found! Cannot attach event listener.');
        return;
    }
    
    
    // Forgot password elements
    const forgotPasswordLink = document.getElementById('forgotPassword');
    const forgotPasswordModal = document.getElementById('forgotPasswordModal');
    const closeModal = document.getElementById('closeModal');
    const resetEmailInput = document.getElementById('resetEmail');
    const resetEmailError = document.getElementById('reset-email-error');
    const resetSuccess = document.getElementById('reset-success');
    const resetButton = document.getElementById('resetButton');
    const submitNewPasswordButton = document.getElementById('submitNewPassword');
    const otpGroup = document.getElementById('otp-group');
    const newpassGroup = document.getElementById('newpass-group');
    const resetOtpInput = document.getElementById('resetOtp');
    const resetOtpError = document.getElementById('reset-otp-error');
    const resetNewPasswordInput = document.getElementById('resetNewPassword');
    const resetNewPassError = document.getElementById('reset-newpass-error');

    // Forgot Password Modal Logic
    if (forgotPasswordLink && forgotPasswordModal) {
      forgotPasswordLink.addEventListener('click', function(e) {
        e.preventDefault();
        forgotPasswordModal.classList.add('active');
      });
    }
    if (closeModal && forgotPasswordModal) {
      closeModal.addEventListener('click', function() {
        forgotPasswordModal.classList.remove('active');
      });
    }
    
    resetButton.addEventListener('click', async function() {
      // Validate email
      const email = resetEmailInput.value.trim();
      if (!email) {
        resetEmailError.textContent = "Please enter your email";
        resetEmailError.style.display = "block";
        return;
      }
      resetEmailError.style.display = "none";
      // Send OTP
      resetButton.disabled = true;
      resetButton.textContent = "Sending...";
      try {
        const res = await fetch('http://localhost:5000/api/gyms/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        const data = await res.json();
        if (data.success) {
          resetSuccess.textContent = `OTP sent to ${email}`;
          resetSuccess.style.display = "block";
          resetSuccess.classList.add('success-message');
          resetSuccess.classList.remove('error-message');
          // Hide email input, show OTP input
          resetEmailInput.parentElement.style.display = "none";
          otpGroup.style.display = "block";
          resetButton.style.display = "none";
          submitNewPasswordButton.style.display = "block";
          submitNewPasswordButton.textContent = "Verify OTP";
          // Update instructions
          const otpInstruction = document.getElementById('otp-instruction');
          if (otpInstruction) {
            otpInstruction.textContent = `We've sent a 6-digit verification code to ${email}. Please enter it below:`;
          }
        } else {
          resetEmailError.textContent = data.message || "Failed to send OTP";
          resetEmailError.style.display = "block";
        }
      } catch (error) {
        resetEmailError.textContent = "Network error. Please try again.";
        resetEmailError.style.display = "block";
      } finally {
        resetButton.disabled = false;
        resetButton.textContent = "Send OTP";
      }
    });
    
    submitNewPasswordButton.addEventListener('click', async function() {
      const email = resetEmailInput.value.trim();
      const otp = resetOtpInput.value.trim();
      const newPassword = resetNewPasswordInput.value.trim();
      // First check if we're in OTP verification phase
      if (newpassGroup.style.display === "none") {
        // OTP verification phase
        if (!otp || otp.length !== 6) {
          resetOtpError.textContent = "Please enter a valid 6-digit OTP";
          resetOtpError.style.display = "block";
          return;
        }
        submitNewPasswordButton.disabled = true;
        submitNewPasswordButton.textContent = "Verifying...";
        try {
          const res = await fetch('http://localhost:5000/api/gyms/verify-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, otp })
          });
          const data = await res.json();
          if (data.success) {
            resetOtpError.style.display = "none";
            newpassGroup.style.display = "block";
            submitNewPasswordButton.textContent = "Reset Password";
            // Update instructions
            const otpInstruction = document.getElementById('otp-instruction');
            if (otpInstruction) {
              otpInstruction.textContent = "OTP verified! Now enter your new password:";
            }
          } else {
            resetOtpError.textContent = data.message || "Invalid OTP";
            resetOtpError.style.display = "block";
          }
        } catch (error) {
          resetOtpError.textContent = "Network error. Please try again.";
          resetOtpError.style.display = "block";
        } finally {
          submitNewPasswordButton.disabled = false;
          if (newpassGroup.style.display === "none") {
            submitNewPasswordButton.textContent = "Verify OTP";
          }
        }
        return;
      }
      // Password reset phase
      resetOtpError.style.display = "none";
      resetNewPassError.style.display = "none";
      if (!otp || otp.length !== 6) {
        resetOtpError.textContent = "Please enter a valid 6-digit OTP";
        resetOtpError.style.display = "block";
        return;
      }
      if (!newPassword || newPassword.length < 8) {
        resetNewPassError.textContent = "Password must be at least 8 characters";
        resetNewPassError.style.display = "block";
        return;
      }
      submitNewPasswordButton.disabled = true;
      submitNewPasswordButton.textContent = "Resetting...";
      try {
        const res = await fetch('http://localhost:5000/api/gyms/verify-password-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, otp, newPassword })
        });
        const data = await res.json();
        if (data.success) {
          resetSuccess.textContent = "Password changed successfully!";
          resetSuccess.style.display = "block";
          resetSuccess.classList.add('success-message');
          resetSuccess.classList.remove('error-message');
          // Close modal after short delay and reset fields
          setTimeout(() => {
            forgotPasswordModal.classList.remove('active');
            // Reset modal fields for next use
            resetEmailInput.value = '';
            resetOtpInput.value = '';
            resetNewPasswordInput.value = '';
            resetSuccess.textContent = '';
            resetEmailError.textContent = '';
            resetOtpError.textContent = '';
            resetNewPassError.textContent = '';
            resetEmailInput.parentElement.style.display = "block";
            // Show email instruction again
            const emailInstruction = document.getElementById('email-instruction');
            if (emailInstruction) {
              emailInstruction.style.display = "block";
            }
            otpGroup.style.display = "none";
            newpassGroup.style.display = "none";
            resetButton.style.display = "block";
            submitNewPasswordButton.style.display = "none";
            // Clear OTP instruction
            const otpInstruction = document.getElementById('otp-instruction');
            if (otpInstruction) {
              otpInstruction.textContent = '';
            }
          }, 1200);
          // Close modal before showing global message
          setTimeout(() => {
            const globalSuccess = document.getElementById('global-success-message');
            if (globalSuccess) {
              globalSuccess.textContent = "Password reset successful! You can now log in with your new password.";
              globalSuccess.style.display = "block";
              globalSuccess.style.color = "#28a745";
              globalSuccess.style.fontWeight = "600";
              globalSuccess.style.marginTop = "20px";
              globalSuccess.style.padding = "12px";
              globalSuccess.style.borderRadius = "8px";
              globalSuccess.style.backgroundColor = "#d4edda";
              globalSuccess.style.border = "1px solid #c3e6cb";
              setTimeout(() => {
                globalSuccess.style.display = "none";
              }, 5000);
            }
          }, 1500);
        } else {
          resetNewPassError.textContent = data.message || "Failed to reset password";
          resetNewPassError.style.display = "block";
        }
      } catch (error) {
        resetNewPassError.textContent = "Network error. Please try again.";
        resetNewPassError.style.display = "block";
      } finally {
        submitNewPasswordButton.disabled = false;
        submitNewPasswordButton.textContent = "Reset Password";
      }
    });

    // Password toggle functionality
    const togglePassword = document.getElementById('togglePassword');
    const togglePasswordIcon = document.getElementById('togglePasswordIcon');
    if (togglePassword && passwordInput && togglePasswordIcon) {
      togglePassword.addEventListener('click', function() {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        togglePasswordIcon.classList.toggle('fa-eye');
        togglePasswordIcon.classList.toggle('fa-eye-slash');
      });
      togglePassword.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          togglePassword.click();
        }
      });
    }

    // Form validation functions
    function validateEmail() {
      const emailValue = emailInput.value.trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      
      if (!emailValue) {
        emailError.textContent = 'Email is required';
        emailError.style.display = 'block';
        return false;
      } else if (!emailRegex.test(emailValue)) {
        emailError.textContent = 'Please enter a valid email address';
        emailError.style.display = 'block';
        return false;
      } else {
        emailError.style.display = 'none';
        return true;
      }
    }

    function validatePassword() {
      const passwordValue = passwordInput.value;
      
      if (!passwordValue) {
        passwordError.textContent = 'Password is required';
        passwordError.style.display = 'block';
        return false;
      } else if (passwordValue.length < 8) {
        passwordError.textContent = 'Password must be at least 8 characters';
        passwordError.style.display = 'block';
        return false;
      } else {
        passwordError.style.display = 'none';
        return true;
      }
    }
    
    // Login function
    async function handleLogin(e) {
      if (e) {
        e.preventDefault();
      }

      // Clear any previous tokens to avoid stale state
      localStorage.removeItem('gymAdminToken');
      

      const isEmailValid = validateEmail();
      const isPasswordValid = validatePassword();

      if (!isEmailValid || !isPasswordValid) {
        loginForm.classList.add('shake');
        setTimeout(() => loginForm.classList.remove('shake'), 500);
        return;
      }

      // Show loading state
      buttonText.style.display = 'none';
      spinner.style.display = 'block';
      loginButton.disabled = true;

      try {
        // Use JSON for login. Backend must use express.json() middleware.
        const formData = new FormData(loginForm);
        const loginPayload = Object.fromEntries(formData);
        
       
        const response = await fetch('http://localhost:5000/api/gyms/login', {
          method: 'POST',
          body: JSON.stringify(loginPayload),
          headers: { 'Content-Type': 'application/json' }
        });


        const data = await response.json();

        if (response.ok && data.success) {
          // Check if 2FA is required
          if (data.requires2FA) {
            // Show 2FA modal
            show2FAModal(data.tempToken, loginPayload.email);
            return;
          }
          
          // Normal login success
          if (data.token && data.gymId) {
            // Successful login
            showAnimatedSuccess();
           
            // Store JWT token and gymId in localStorage with verification
            try {
              // Clear ALL potential old tokens and gymId first
              const oldTokenKeys = ['gymAdminToken', 'token', 'authToken', 'gymAuthToken', 'adminToken'];
              const oldGymKeys = ['gymId', 'currentGymId', 'gym_id'];
              
              oldTokenKeys.forEach(key => {
                if (localStorage.getItem(key)) {
                  localStorage.removeItem(key);
                }
              });
              
              oldGymKeys.forEach(key => {
                if (localStorage.getItem(key)) {
                  localStorage.removeItem(key);
                }
              });
              
              // Store the new token in BOTH localStorage and sessionStorage for redundancy
              localStorage.setItem('gymAdminToken', data.token);
              sessionStorage.setItem('gymAdminToken', data.token);
              
              // Store the gymId in multiple keys for compatibility
              localStorage.setItem('gymId', data.gymId);
              localStorage.setItem('currentGymId', data.gymId);
              sessionStorage.setItem('gymId', data.gymId);
              
              // Also store it with alternative keys as backup
              localStorage.setItem('authToken', data.token);
              localStorage.setItem('token', data.token);
              
              // Verify token and gymId were actually stored
              const storedToken = localStorage.getItem('gymAdminToken');
              const sessionToken = sessionStorage.getItem('gymAdminToken');
              const storedGymId = localStorage.getItem('gymId');
              const sessionGymId = sessionStorage.getItem('gymId');
              
              console.log('🔍 Token and GymId verification:', {
                localStorage: !!storedToken,
                sessionStorage: !!sessionToken,
                tokenMatches: storedToken === data.token,
                sessionMatches: sessionToken === data.token,
                tokenLength: storedToken?.length || 0,
                gymId: storedGymId,
                sessionGymId: sessionGymId,
                gymIdMatches: storedGymId === data.gymId
              });
              
              if (storedToken === data.token && storedGymId === data.gymId) {
               
                
                // Use a longer delay to ensure localStorage has fully committed
                setTimeout(() => {
                  // Pass token and gymId as URL parameters as backup
                  const dashboardUrl = `http://localhost:5000/gymadmin/gymadmin.html?token=${encodeURIComponent(data.token)}&gymId=${encodeURIComponent(data.gymId)}`;
                  window.location.replace(dashboardUrl);
                }, 1000); // Increased to 1 second
              } else {
                throw new Error('Token or GymId verification failed');
              }
            } catch (storageError) {
              console.error('❌ localStorage error:', storageError);
              showErrorMessage('Failed to store authentication token. Please try again.');
            }
          }
        } else {
          // Login failed
          showErrorMessage(data.message || 'Login failed. Please try again.');
          loginForm.classList.add('shake');
          setTimeout(() => loginForm.classList.remove('shake'), 500);
        }
      } catch (error) {
        showErrorMessage('Network error. Please try again.');
        console.error('Login error:', error);
      } finally {
        // Reset button state
        buttonText.style.display = 'block';
        spinner.style.display = 'none';
        loginButton.disabled = false;
      }
    }
    
    // Attach event listeners
    loginForm.addEventListener('submit', handleLogin);
    loginButton.addEventListener('click', handleLogin);
  
    // Error and success messages - unified system
    function showErrorMessage(message) {
      // Remove any existing messages
      const existingMessages = loginForm.querySelectorAll('.submit-error, .success-message-container');
      existingMessages.forEach(msg => msg.remove());
      
      // Show notification instead of inline message for consistency
      showNotification('error', 'Login Failed', message);
      
      // Add shake animation to form
      loginForm.classList.add('shake');
      setTimeout(() => loginForm.classList.remove('shake'), 500);
    }    function showAnimatedSuccess() {
      console.log('🎉 Showing enhanced success message...');
      
      // Create consistent success message with the new UI style
      const successDiv = document.createElement('div');
      successDiv.className = 'success-message-container';
      successDiv.innerHTML = `
        <div class="success-header">
          <div class="success-icon">
            <i class="fas fa-check" aria-hidden="true"></i>
          </div>
          <h3 class="success-title">Login Successful!</h3>
        </div>
        <p class="success-message">Welcome back! Redirecting to your dashboard...</p>
        <div class="success-progress">
          <div class="progress-bar"></div>
        </div>
      `;
      
      // Display the success message in the feedback area
      const feedback = document.getElementById('login-feedback');
      if (feedback) {
        feedback.innerHTML = '';
        feedback.appendChild(successDiv);
        feedback.style.display = 'block';
      } else {
        // Fallback: append to form if feedback element not found
        loginForm.appendChild(successDiv);
      }
      
      // Also show a notification using the enhanced system
      showNotification('success', 'Login Successful!', 'Welcome back! Redirecting to your dashboard...');
    }
    
    // 2FA Modal Functions
    function show2FAModal(tempToken, email) {
      // Create 2FA modal HTML for email OTP
      const modal2FA = document.createElement('div');
      modal2FA.id = 'twoFAModal';
      modal2FA.className = 'forgot-password-modal active';
      modal2FA.innerHTML = `
        <div class="modal-content">
          <span class="close-modal" onclick="close2FAModal()">&times;</span>
          <h2><i class="fas fa-shield-alt"></i> Two-Factor Authentication</h2>
          <p style="margin-bottom: 20px; color: #666;">
            We've sent a 6-digit verification code to your email: <strong>${email}</strong>
          </p>
          <div class="form-group">
            <label for="twoFACode" style="display: block; margin-bottom: 8px; font-weight: 500; color: #333;">
              Enter verification code:
            </label>
            <input type="text" id="twoFACode" placeholder="000000" maxlength="6" 
                   style="text-align: center; font-size: 1.4em; letter-spacing: 0.5em; width: 100%; padding: 15px; border: 2px solid #ddd; border-radius: 8px;" />
            <div class="error-message" id="twoFA-error" style="margin-top: 10px;"></div>
          </div>
          <button type="button" id="verify2FAButton" class="login-btn" style="width: 100%; margin-top: 15px;">
            <i class="fas fa-check-circle"></i> Verify Code
          </button>
          <div style="text-align: center; margin-top: 15px;">
            <button type="button" id="resend2FAButton" class="resend-btn" style="background: none; border: none; color: #007bff; text-decoration: underline; cursor: pointer; font-size: 0.9em;">
              <i class="fas fa-redo"></i> Resend Code
            </button>
          </div>
          <p style="font-size: 0.85em; color: #888; margin-top: 15px; text-align: center;">
            <i class="fas fa-clock"></i> Code expires in 10 minutes
          </p>
        </div>
      `;
      
      document.body.appendChild(modal2FA);
      
      // Focus on input
      const codeInput = document.getElementById('twoFACode');
      setTimeout(() => codeInput.focus(), 100);
      
      // Add event listeners
      document.getElementById('verify2FAButton').addEventListener('click', () => verify2FA(tempToken, email));
      document.getElementById('resend2FAButton').addEventListener('click', () => resend2FA(tempToken, email));
      
      // Allow Enter key to submit
      codeInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          verify2FA(tempToken, email);
        }
      });
      
      // Auto-format input (only allow digits)
      codeInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, ''); // Remove non-digits
        if (value.length > 6) value = value.slice(0, 6);
        e.target.value = value;
      });
    }
    
    async function verify2FA(tempToken, email) {
      const code = document.getElementById('twoFACode').value.trim();
      const errorDiv = document.getElementById('twoFA-error');
      const verifyButton = document.getElementById('verify2FAButton');
      
      if (!code || code.length !== 6) {
        errorDiv.textContent = 'Please enter a 6-digit code';
        errorDiv.style.display = 'block';
        return;
      }
      
      verifyButton.disabled = true;
      verifyButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...';
      
      try {
        const response = await fetch('http://localhost:5000/api/gyms/verify-login-2fa', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${tempToken}`
          },
          body: JSON.stringify({ otp: code })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
          // Successful 2FA verification
          verifyButton.innerHTML = '<i class="fas fa-check"></i> Verified!';
          verifyButton.style.backgroundColor = '#28a745';
          
          setTimeout(() => {
            close2FAModal();
            
            // Store tokens and redirect
            localStorage.setItem('gymAdminToken', data.token);
            localStorage.setItem('gymId', data.gymId);
            sessionStorage.setItem('gymAdminToken', data.token);
            sessionStorage.setItem('gymId', data.gymId);
            
            showAnimatedSuccess();
            setTimeout(() => {
              const dashboardUrl = `http://localhost:5000/gymadmin/gymadmin.html?token=${encodeURIComponent(data.token)}&gymId=${encodeURIComponent(data.gymId)}`;
              window.location.replace(dashboardUrl);
            }, 1000);
          }, 500);
        } else {
          errorDiv.textContent = data.message || 'Invalid code. Please try again.';
          errorDiv.style.display = 'block';
          verifyButton.innerHTML = '<i class="fas fa-check-circle"></i> Verify Code';
          verifyButton.disabled = false;
        }
      } catch (error) {
        errorDiv.textContent = 'Network error. Please try again.';
        errorDiv.style.display = 'block';
        console.error('2FA verification error:', error);
        verifyButton.innerHTML = '<i class="fas fa-check-circle"></i> Verify Code';
        verifyButton.disabled = false;
      }
    }
    
    async function resend2FA(tempToken, email) {
      const resendButton = document.getElementById('resend2FAButton');
      const originalText = resendButton.innerHTML;
      
      resendButton.disabled = true;
      resendButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
      
      try {
        const response = await fetch('http://localhost:5000/api/gyms/resend-2fa-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tempToken, email })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
          resendButton.innerHTML = '<i class="fas fa-check"></i> Code Sent!';
          resendButton.style.color = '#28a745';
          
          // Show success message
          const errorDiv = document.getElementById('twoFA-error');
          errorDiv.textContent = 'New verification code sent to your email';
          errorDiv.style.color = '#28a745';
          errorDiv.style.display = 'block';
          
          setTimeout(() => {
            resendButton.innerHTML = originalText;
            resendButton.style.color = '#007bff';
            resendButton.disabled = false;
            errorDiv.style.display = 'none';
          }, 3000);
        } else {
          resendButton.innerHTML = originalText;
          resendButton.disabled = false;
          
          const errorDiv = document.getElementById('twoFA-error');
          errorDiv.textContent = data.message || 'Failed to resend code. Please try again.';
          errorDiv.style.color = '#dc3545';
          errorDiv.style.display = 'block';
        }
      } catch (error) {
        resendButton.innerHTML = originalText;
        resendButton.disabled = false;
        
        const errorDiv = document.getElementById('twoFA-error');
        errorDiv.textContent = 'Network error. Please try again.';
        errorDiv.style.color = '#dc3545';
        errorDiv.style.display = 'block';
        console.error('2FA resend error:', error);
      }
    }
    
    function close2FAModal() {
      const modal = document.getElementById('twoFAModal');
      if (modal) {
        modal.remove();
      }
      // Reset login button state
      buttonText.style.display = 'block';
      spinner.style.display = 'none';
      loginButton.disabled = false;
    }
    
    // Make close2FAModal globally available
    window.close2FAModal = close2FAModal;
    
    // Initialize professional UI enhancements
    console.log('🎨 Initializing professional UI enhancements...');
    initializeInputEffects();
    setupAccessibility();
    initializeValidation();
    setupPasswordToggle();
    
    console.log('✅ Professional UI enhancements initialized successfully');
    
    function initializeInputEffects() {
        [emailInput, passwordInput].forEach(input => {
            if (!input) return;
            
            input.addEventListener('focus', () => {
                input.parentElement.classList.add('input-focused');
                clearFieldError(input);
            });
            
            input.addEventListener('blur', () => {
                input.parentElement.classList.remove('input-focused');
                if (input.value.trim() === '') {
                    input.parentElement.classList.remove('input-filled');
                } else {
                    input.parentElement.classList.add('input-filled');
                }
            });
            
            input.addEventListener('input', () => {
                clearFieldError(input);
                if (input.value.trim() !== '') {
                    input.parentElement.classList.add('input-filled');
                } else {
                    input.parentElement.classList.remove('input-filled');
                }
            });
        });
    }
    
    function setupAccessibility() {
        // Improve screen reader support
        document.querySelectorAll('.error-message').forEach(error => {
            error.setAttribute('aria-live', 'polite');
        });
    }
    
    function initializeValidation() {
        if (emailInput) emailInput.addEventListener('blur', validateEmail);
        if (passwordInput) passwordInput.addEventListener('blur', validatePassword);
    }
    
    function setupPasswordToggle() {
        const togglePassword = document.getElementById('togglePassword');
        const togglePasswordIcon = document.getElementById('togglePasswordIcon');
        
        if (!togglePassword || !togglePasswordIcon || !passwordInput) return;
        
        // Toggle password visibility with accessibility
        togglePassword.addEventListener('click', togglePasswordVisibility);
        togglePassword.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                togglePasswordVisibility();
            }
        });
        
        function togglePasswordVisibility() {
            const isPasswordVisible = passwordInput.getAttribute('type') === 'text';
            const newType = isPasswordVisible ? 'password' : 'text';
            const newIcon = isPasswordVisible ? 'fa-eye' : 'fa-eye-slash';
            const oldIcon = isPasswordVisible ? 'fa-eye-slash' : 'fa-eye';
            const ariaLabel = isPasswordVisible ? 'Show password' : 'Hide password';
            
            passwordInput.setAttribute('type', newType);
            togglePasswordIcon.classList.remove(oldIcon);
            togglePasswordIcon.classList.add(newIcon);
            togglePassword.setAttribute('aria-label', ariaLabel);
        }
    }
    
    function validateEmail() {
        if (!emailInput) return false;
        
        const email = emailInput.value.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (!email) {
            showFieldError(emailInput, 'Email is required');
            return false;
        } else if (!emailRegex.test(email)) {
            showFieldError(emailInput, 'Please enter a valid email address');
            return false;
        }
        
        clearFieldError(emailInput);
        return true;
    }
    
    function validatePassword() {
        if (!passwordInput) return false;
        
        const password = passwordInput.value;
        
        if (!password) {
            showFieldError(passwordInput, 'Password is required');
            return false;
        } else if (password.length < 8) {
            showFieldError(passwordInput, 'Password must be at least 8 characters');
            return false;
        }
        
        clearFieldError(passwordInput);
        return true;
    }
    
    function showFieldError(field, message) {
        const errorElement = field.parentElement.querySelector('.error-message');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
            field.classList.add('error');
            field.setAttribute('aria-invalid', 'true');
        }
    }
    
    function clearFieldError(field) {
        const errorElement = field.parentElement.querySelector('.error-message');
        if (errorElement) {
            errorElement.style.display = 'none';
            field.classList.remove('error');
            field.removeAttribute('aria-invalid');
        }
    }
    
    // Professional Notification System
    function showNotification(type, title, message, duration = 5000) {
        // Remove existing notifications
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notification => notification.remove());
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.setAttribute('role', 'alert');
        notification.setAttribute('aria-live', 'polite');
        
        const iconMap = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };
        
        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-icon">
                    <i class="${iconMap[type] || iconMap.info}" aria-hidden="true"></i>
                </div>
                <div class="notification-text">
                    <div class="notification-title">${title}</div>
                    <div class="notification-message">${message}</div>
                </div>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Trigger animation
        setTimeout(() => notification.classList.add('show'), 100);
        
        // Auto remove
        const removeNotification = () => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 400);
        };
        
        if (duration > 0) {
            setTimeout(removeNotification, duration);
        }
        
        return { notification, remove: removeNotification };
    }
    
    // Enhanced success message with accessibility
    function showProfessionalSuccess(message) {
        console.log('🎯 Showing professional success:', message);
        
        // Use the unified success system
        showAnimatedSuccess();
        
        return showNotification('success', 'Login Successful', message);
    }
    
    // Make functions globally available
    window.showNotification = showNotification;
    window.showProfessionalSuccess = showProfessionalSuccess;
});
