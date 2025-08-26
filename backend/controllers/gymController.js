
const Gym = require('../models/gym');
const Notification = require('../models/Notification');
const TrialBooking = require('../models/TrialBooking');
const LoginAttempt = require('../models/LoginAttempt');
const SecuritySettings = require('../models/SecuritySettings');
const sendEmail = require('../utils/sendEmail');
const adminNotificationService = require('../services/adminNotificationService');
const EmailService = require('../services/emailService');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const axios = require('axios');
const jwt = require('jsonwebtoken'); // Added jsonwebtoken
const nodemailer = require('nodemailer');
const speakeasy = require('speakeasy');

// Geocoding function to get lat/lng from address
const geocodeAddress = async (address, city, state, pincode) => {
  try {
    const fullAddress = [address, city, state, pincode].filter(Boolean).join(', ');
    const encodedAddress = encodeURIComponent(fullAddress);
    
    console.log(`Geocoding address: ${fullAddress}`);
    
    // Using Nominatim (free geocoding service)
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1&countrycodes=in`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon)
      };
    }
    
    return null;
  } catch (error) {
    console.warn('Geocoding failed:', error);
    return null;
  }
};

// Generate a random 6-digit OTP
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP via email
const sendOTPEmail = async (email, otp) => {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Your OTP for Password Change',
        text: `Your OTP is: ${otp}. This OTP will expire in 10 minutes.`
    };
    await transporter.sendMail(mailOptions);
};

// Send 2FA OTP via email
const send2FAEmail = async (email, otp, gymName) => {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });
        
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Two-Factor Authentication Code - Gym Admin Login',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: linear-gradient(135deg, #2c4ee8ff 0%, #871df2ff 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
                        <h1 style="color: white; margin: 0; font-size: 24px;"><i class="fas fa-lock"></i> Security Verification</h1>
                    </div>
                    
                    <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
                        <h2 style="color: #333; margin-top: 0;">Two-Factor Authentication</h2>
                        <p style="color: #666; font-size: 16px; line-height: 1.5;">
                            Hello from <strong>${gymName || 'Gym Admin'}</strong>,
                        </p>
                        <p style="color: #666; font-size: 16px; line-height: 1.5;">
                            Someone is trying to log in to your gym admin account. To complete the login process, please enter the verification code below:
                        </p>
                        
                        <div style="background: white; border: 2px solid #007bff; border-radius: 8px; padding: 20px; margin: 25px 0; text-align: center;">
                            <p style="color: #666; margin: 0 0 10px 0; font-size: 14px;">Your verification code is:</p>
                            <h1 style="color: #007bff; font-size: 36px; letter-spacing: 5px; margin: 0; font-family: monospace;">${otp}</h1>
                        </div>
                        
                        <p style="color: #666; font-size: 14px; line-height: 1.5;">
                            <strong><i class="fas fa-clock"></i> This code will expire in 10 minutes.</strong>
                        </p>
                        
                        <p style="color: #666; font-size: 14px; line-height: 1.5;">
                            If you didn't request this login, please ignore this email and consider changing your password.
                        </p>
                        
                        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center;">
                            <p style="color: #999; font-size: 12px; margin: 0;">
                                This is an automated message. Please do not reply to this email.
                            </p>
                        </div>
                    </div>
                </div>
            `
        };
        
        await transporter.sendMail(mailOptions);
        return { success: true };
    } catch (error) {
        console.error('Error sending 2FA email:', error);
        return { success: false, error: error.message };
    }
};


// Unified Gym/Admin Login (use for both gym and admin dashboard)
exports.login = async (req, res) => {
  const { email, password, twoFactorCode } = req.body;
  const ipAddress = req.ip || req.connection.remoteAddress || 'Unknown';
  const userAgent = req.get('User-Agent') || 'Unknown';
  
  // Helper function to record login attempt
  const recordLoginAttempt = async (gymId, success, failureReason = null) => {
    try {
      const loginAttempt = new LoginAttempt({
        gymId,
        ipAddress,
        userAgent,
        success,
        failureReason,
        device: extractDeviceInfo(userAgent),
        browser: extractBrowserInfo(userAgent),
        suspicious: await isSuspiciousLogin(gymId, ipAddress),
        location: await getLocationFromIP(ipAddress)
      });
      await loginAttempt.save();
      
      // Send notification if enabled (only if SecuritySettings exist and are configured)
      if (success && gymId) {
        const settings = await SecuritySettings.findOne({ gymId });
        console.log(`🔍 Login notification check for gym ID: ${gymId}`, {
          hasSettings: !!settings,
          loginNotificationsEnabled: settings?.loginNotifications?.enabled,
          fullSettings: settings?.loginNotifications
        });
        
        if (settings && settings.loginNotifications && settings.loginNotifications.enabled) {
          console.log(`📧 Sending successful login notification for gym ID: ${gymId}`);
          await sendLoginNotification(gymId, loginAttempt);
        } else {
          console.log(`🔕 Login notifications disabled for gym ID: ${gymId} (settings: ${settings ? 'exist but disabled' : 'not found'})`);
        }
      } else if (!success && gymId && await shouldNotifyFailedLogin(gymId)) {
        console.log(`📧 Sending failed login notification for gym ID: ${gymId}`);
        await sendLoginNotification(gymId, loginAttempt);
      }
    } catch (error) {
      console.error('Error recording login attempt:', error);
    }
  };
  
  try {
    // Find gym by email
    const gym = await Gym.findOne({ email });
    if (!gym) {
      await recordLoginAttempt(null, false, 'Invalid email');
      return res.status(401).json({ success: false, message: 'Invalid credentials or gym not found.' });
    }
        
    // Check password
    const isMatch = await bcrypt.compare(password, gym.password);
    if (!isMatch) {
      await recordLoginAttempt(gym._id, false, 'Invalid password');
      return res.status(401).json({ success: false, message: 'Invalid credentials or gym not found.' });
    }
    
    // Check if 2FA is enabled via SecuritySettings
    let securitySettings = await SecuritySettings.findOne({ gymId: gym._id });
    if (!securitySettings) {
      // Create default settings if they don't exist
      securitySettings = new SecuritySettings({ 
        gymId: gym._id,
        twoFactorEnabled: false, // Default to disabled
        loginNotifications: { enabled: false }
      });
      await securitySettings.save();
    }

    // Use SecuritySettings to determine 2FA requirement
    const twoFactorRequired = securitySettings.twoFactorEnabled;
    
    if (twoFactorRequired) {
      if (!twoFactorCode) {
        // Generate OTP and send via email
        const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
        
        // Save OTP to database
        gym.twoFactorOTP = otp;
        gym.twoFactorOTPExpiry = otpExpiry;
        await gym.save();
        
        // Send OTP via email
        try {
          const emailResult = await send2FAEmail(email, otp, gym.gymName);
          if (!emailResult.success) {
            await recordLoginAttempt(gym._id, false, '2FA email send failed');
            return res.status(500).json({ 
              success: false, 
              message: 'Failed to send verification code. Please try again.' 
            });
          }
        } catch (emailError) {
          console.error('Error sending 2FA email:', emailError);
          await recordLoginAttempt(gym._id, false, '2FA email send failed');
          return res.status(500).json({ 
            success: false, 
            message: 'Failed to send verification code. Please try again.' 
          });
        }
        
        // Generate temporary token for 2FA verification
        const tempPayload = {
          admin: {
            id: gym.id,
            email: gym.email,
            temp: true
          }
        };
        const tempToken = jwt.sign(tempPayload, process.env.JWT_SECRET, { expiresIn: '15m' });
        
        return res.status(200).json({ 
          success: true, 
          requires2FA: true,
          tempToken,
          message: 'Verification code sent to your email' 
        });
      }
      
      // This is for direct verification (when twoFactorCode is provided)
      // For email OTP, we'll handle this in a separate endpoint
      if (twoFactorCode) {
        await recordLoginAttempt(gym._id, false, 'Direct 2FA verification not supported');
        return res.status(400).json({ 
          success: false, 
          message: 'Please use the email verification process' 
        });
      }
    }
        
    // Check approval status
    if (gym.status !== 'approved') {
      await recordLoginAttempt(gym._id, false, `Account status: ${gym.status}`);
      if (gym.status === 'pending') {
        return res.status(403).json({ success: false, message: 'Your gym registration is pending approval. Please wait for the admin to review your application.' });
      } else if (gym.status === 'rejected') {
        return res.status(403).json({ success: false, message: 'Your gym registration has been rejected. Please contact support for more information.' });
      } else {
        return res.status(403).json({ success: false, message: 'Your gym registration is not approved.' });
      }
    }
        
    // Create and assign a token
    const payload = {
      admin: {
        id: gym.id,
        email: gym.email
      }
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
    
    // Update lastLogin field
    gym.lastLogin = new Date();
    await gym.save();
    
    // Record successful login
    await recordLoginAttempt(gym._id, true);
    
    // Send login notification if enabled
    try {
      if (securitySettings.loginNotifications && securitySettings.loginNotifications.enabled) {
        const loginDetails = {
          timestamp: new Date().toLocaleString('en-US', { 
            timeZone: 'Asia/Kolkata',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          }),
          ip: req.ip || req.connection.remoteAddress || 'Unknown',
          device: extractDeviceInfo(req.get('User-Agent')),
          browser: extractBrowserInfo(req.get('User-Agent')),
          location: await getLocationFromIP(req.ip || req.connection.remoteAddress)
        };
        
        const emailService = new EmailService();
        await emailService.sendLoginAlert(
          gym.email, 
          gym.contactPerson || gym.gymName, 
          loginDetails
        );
        console.log('✅ Login notification sent to:', gym.email);
      }
    } catch (notificationError) {
      console.error('❌ Error sending login notification:', notificationError);
      // Don't fail the login if notification fails
    }
    
    res.status(200).json({
      success: true,
      message: 'Login successful! Redirecting...',
      token,
      gymId: gym.id
    });
  } catch (error) {
    console.error('❌ Unified gym login error:', error);
    res.status(500).json({ success: false, message: 'Server error during login.' });
  }
};

// Request Password Change OTP (moved from gymadminController)
exports.requestPasswordChangeOTP = async (req, res) => {
    const { email } = req.body;
    try {
        const adminUser = await Gym.findOne({ email });
        if (!adminUser) {
            return res.status(404).json({ success: false, message: 'Admin not found.' });
        }
        // Generate and store OTP
        const otp = generateOTP();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
        adminUser.passwordResetOTP = otp;
        adminUser.passwordResetOTPExpiry = otpExpiry;
        await adminUser.save();
        // Send OTP via email
        await sendOTPEmail(email, otp);
        res.json({ success: true, message: 'OTP sent to your email.', email: email });
    } catch (err) {
        console.error('OTP request error:', err);
        res.status(500).json({ success: false, message: 'Server error during OTP generation.' });
    }
};

// Verify Password Change OTP (moved from gymadminController)
exports.verifyPasswordChangeOTP = async (req, res) => {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
        console.error('Incomplete password change request', { email, otpProvided: !!otp, passwordProvided: !!newPassword });
        return res.status(400).json({ success: false, message: 'Email, OTP, and new password are required.' });
    }
    // Password complexity check
    if (newPassword.length < 8) {
        console.warn('Password too short', { email, passwordLength: newPassword.length });
        return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long.' });
    }
    try {
        const adminUser = await Gym.findOne({ 
            email, 
            passwordResetOTP: otp,
            passwordResetOTPExpiry: { $gt: new Date() } 
        });
        if (!adminUser) {
            // More specific error checking
            const userWithEmail = await Gym.findOne({ email });
            if (!userWithEmail) {
                return res.status(404).json({ success: false, message: 'No account found with this email.' });
            }
            const userWithOTP = await Gym.findOne({ 
                email, 
                passwordResetOTP: otp 
            });
            if (userWithOTP && userWithOTP.passwordResetOTPExpiry < new Date()) {
                return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new OTP.' });
            }
            return res.status(400).json({ success: false, message: 'Invalid OTP. Please check and try again.' });
        }
        // Prevent using the same password
        const isOldPassword = await bcrypt.compare(newPassword, adminUser.password);
        if (isOldPassword) {
            return res.status(400).json({ success: false, message: 'New password cannot be the same as the old password.' });
        }
        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        // Update password and clear OTP fields
        adminUser.password = hashedPassword;
        adminUser.passwordResetOTP = undefined;
        adminUser.passwordResetOTPExpiry = undefined;
        await adminUser.save();
        res.json({ success: true, message: 'Password changed successfully.' });
    } catch (err) {
        console.error('Password change error:', err);
        res.status(500).json({ success: false, message: 'Server error during password change.' });
    }
};

// Get Admin Profile (moved from gymadminController)
exports.getAdminProfile = async (req, res) => {
   
    try {
        if (!req.admin || !req.admin.id) {
            console.warn('Invalid admin object in request');
            return res.status(401).json({ message: 'Authentication failed' });
        }
        const admin = await Gym.findById(req.admin.id).select('-password');
        if (!admin) {
            console.warn(`No admin found with ID: ${req.admin.id}`);
            return res.status(404).json({ message: 'Admin profile not found' });
        }
        const logoUrl = admin.logoUrl ? 
            (admin.logoUrl.startsWith('http') ? admin.logoUrl : 
                (admin.logoUrl.startsWith('uploads/') ? `/${admin.logoUrl}` : `/uploads/gym-logos/${admin.logoUrl}`)) : 
            null;
        const profileResponse = {
            gymName: admin.gymName || 'Gym Admin',
            email: admin.email,
            logoUrl: logoUrl,
            phone: admin.phone || '',
            address: admin.address || '',
            description: admin.description || ''
        };
        res.json(profileResponse);
    } catch (error) {
        console.error('Comprehensive error fetching admin profile:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        });
        res.status(500).json({ message: 'Server error while fetching profile' });
    }
};

// Request OTP for Password Reset (moved from gymadminController)
exports.requestOtp = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }
  try {
    const gymAdmin = await Gym.findOne({ email });
    if (!gymAdmin) {
      return res.status(404).json({ message: 'Admin with this email not found.' });
    }
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    gymAdmin.passwordResetToken = otp; 
    gymAdmin.passwordResetExpires = Date.now() + 10 * 60 * 1000; 
    await gymAdmin.save();
    // Send OTP email
    const emailSubject = 'Your Password Reset OTP';
    const emailHtml = `
      <h3>Hello ${gymAdmin.contactPerson || gymAdmin.gymName},</h3>
      <p>You requested a password reset for your FIT-verse admin account.</p>
      <p>Your One-Time Password (OTP) is: <strong>${otp}</strong></p>
      <p>This OTP is valid for 10 minutes.</p>
      <p>If you did not request this, please ignore this email.</p>
      <p>Thank you,<br/>The FIT-verse Team</p>
    `;
    try {
      await sendEmail(gymAdmin.email, emailSubject, emailHtml);
      res.status(200).json({ success: true, message: 'OTP sent to your email address. Please check your inbox (and spam folder).' });
    } catch (emailError) {
      console.error('[requestOtp] Error sending OTP email:', emailError.message, emailError.stack);
      res.status(500).json({ success: false, message: 'Could not send OTP. Please try again later or contact support if the issue persists.' });
    }
  } catch (error) {
    console.error('[requestOtp] An error occurred during OTP request:', error.message, error.stack);
    res.status(500).json({ message: 'Server error while requesting OTP. Please try again later.' });
  }
};

// Reset Password with OTP (moved from gymadminController)
exports.resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword) {
    return res.status(400).json({ success: false, message: 'Email, OTP, and new password are required.' });
  }
  if (newPassword.length < 6) { // Example: Minimum password length, align with your policy
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
  }
  try {
    const admin = await Gym.findOne({
      email,
      passwordResetToken: otp, // Assuming plain OTP is stored for now
      passwordResetExpires: { $gt: Date.now() },
    });
    if (!admin) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP. Please request a new one.' });
    }
    // Hash new password
    const salt = await bcrypt.genSalt(10);
    admin.password = await bcrypt.hash(newPassword, salt);
    admin.passwordResetToken = undefined; // Clear OTP token
    admin.passwordResetExpires = undefined; // Clear OTP expiry
    await admin.save();
    // await sendEmail(admin.email, 'Your Password Has Been Reset', '<p>Your password was successfully reset.</p>');
    res.status(200).json({ success: true, message: 'Password has been reset successfully. You can now login with your new password.' });
  } catch (error) {
    console.error('[resetPassword] Error:', error.message, error.stack);
    res.status(500).json({ success: false, message: 'Error resetting password. Please try again.' });
  }
};

exports.registerGym = async (req, res) => {
  try {

    // Password check
    const plainPassword = req.body.password;
    if (!plainPassword) {
      return res.status(400).json({ message: 'Password is required' });
    }

    // Duplicate check (by email or phone)
    const existingGym = await Gym.findOne({
      $or: [{ email: req.body.email }, { phone: req.body.phone }]
    });

    if (existingGym) {
      return res.status(400).json({ message: 'Gym with this email or phone already exists' });
    }

    const hashedPassword = await bcrypt.hash(plainPassword, 10);


    // File handling for registration: gymImages (multiple) and logo (single)
    let gymPhotos = [];
    if (req.files && req.files.gymImages) {
      // Parse meta fields for gymImages
      let metaArr = [];
      // Find max index for meta fields
      let maxIdx = -1;
      Object.keys(req.body).forEach(key => {
        const match = key.match(/^gymImagesMeta\[(\d+)\]\[(title|description|category)\]$/);
        if (match) {
          const idx = parseInt(match[1], 10);
          if (idx > maxIdx) maxIdx = idx;
        }
      });
      for (let i = 0; i <= maxIdx; i++) {
        metaArr[i] = {
          title: req.body[`gymImagesMeta[${i}][title]`] || '',
          description: req.body[`gymImagesMeta[${i}][description]`] || '',
          category: req.body[`gymImagesMeta[${i}][category]`] || ''
        };
      }
      const files = req.files.gymImages;
      // Only include photos with all required fields
      gymPhotos = files.map((file, i) => ({
        title: metaArr[i]?.title || '',
        description: metaArr[i]?.description || '',
        category: metaArr[i]?.category || '',
        imageUrl: `uploads/gymPhotos/${file.filename}`,
        uploadedAt: new Date()
      })).filter(photo => photo.title && photo.description && photo.category);
    }

    // Handle gym logo upload (single file, field name: 'logo')
    let logoUrl = '';
    if (req.files && req.files.logo && req.files.logo.length > 0) {
      logoUrl = `/uploads/gym-logos/${req.files.logo[0].filename}`;
    } else {
      logoUrl = '';
    }

    // Parse repeated fields (ensure arrays)

    // Parse activities as array of objects: [{ name, icon, description }]
    let activities = [];
    if (Array.isArray(req.body.activities)) {
      activities = req.body.activities.map(a => {
        if (typeof a === 'string') {
          // Check if string is JSON
          try {
            const parsed = JSON.parse(a);
            return {
              name: parsed.name || '',
              icon: parsed.icon || 'fa-dumbbell',
              description: parsed.description || ''
            };
          } catch {
            // If not JSON, treat as plain name
            return { name: a, icon: 'fa-dumbbell', description: '' };
          }
        } else if (typeof a === 'object' && a !== null && a.name) {
          // Already correct format
          return {
            name: a.name,
            icon: a.icon || 'fa-dumbbell',
            description: a.description || ''
          };
        }
        return null;
      }).filter(Boolean);
    } else if (typeof req.body.activities === 'string') {
      // Accept JSON string or comma-separated
      try {
        const arr = JSON.parse(req.body.activities);
        if (Array.isArray(arr)) {
          activities = arr.map(a =>
            typeof a === 'object' && a !== null
              ? { name: a.name || '', icon: a.icon || 'fa-dumbbell', description: a.description || '' }
              : { name: a, icon: 'fa-dumbbell', description: '' }
          ).filter(Boolean);
        }
      } catch {
        // fallback: comma-separated string
        activities = req.body.activities.split(',').map(s => ({ name: s.trim(), icon: 'fa-dumbbell', description: '' }));
      }
    }


    // Parse membership plans robustly (handle indexed fields from FormData)
    let membershipPlans = [];
    // Collect all membership plan fields by index
    const planFieldRegex = /^membershipPlans\[(\d+)\]\[(\w+)\]$/;
    const planMap = {};
    Object.keys(req.body).forEach(key => {
      const match = key.match(planFieldRegex);
      if (match) {
        const idx = parseInt(match[1], 10);
        const field = match[2];
        if (!planMap[idx]) planMap[idx] = {};
        planMap[idx][field] = req.body[key];
      }
    });
    // Convert planMap to array, parse benefits as array, ensure proper data types
    membershipPlans = Object.keys(planMap).sort((a,b)=>a-b).map(idx => {
      const plan = planMap[idx];
      return {
        name: plan.name || '',
        price: parseFloat(plan.price) || 0,
        discount: parseFloat(plan.discount) || 0,
        discountMonths: parseInt(plan.discountMonths) || 0,
        benefits: plan.benefits ? plan.benefits.split(',').map(b => b.trim()).filter(Boolean) : [],
        note: plan.note || '',
        icon: plan.icon || 'fa-leaf',
        color: plan.color || '#38b000'
      };
    });
    // Fallback: legacy array style (for backward compatibility)
    if (membershipPlans.length === 0 && Array.isArray(req.body.planName)) {
      for (let i = 0; i < req.body.planName.length; i++) {
        membershipPlans.push({
          name: req.body.planName[i] || '',
          price: parseFloat(req.body.planPrice[i]) || 0,
          discount: parseFloat(req.body.planDiscount[i]) || 0,
          discountMonths: parseInt(req.body.planDiscountMonths[i]) || 0,
          benefits: req.body.planBenefits[i]?.split(',').map(b => b.trim()).filter(Boolean) || [],
          note: req.body.planNote[i] || '',
          icon: req.body.planIcon[i] || 'fa-leaf',
          color: req.body.planColor[i] || '#38b000'
        });
      }
    }
    
    // Ensure we have default membership plans if none were provided
    if (membershipPlans.length === 0) {
      membershipPlans = [
        { 
          name: 'Basic', 
          price: 800, 
          discount: 0, 
          discountMonths: 0, 
          benefits: ['Gym Access', 'Group Classes'], 
          note: 'Best for beginners', 
          icon: 'fa-leaf', 
          color: '#38b000' 
        },
        { 
          name: 'Standard', 
          price: 1200, 
          discount: 10, 
          discountMonths: 6, 
          benefits: ['All Basic Benefits', 'Diet Plan', 'Locker Facility'], 
          note: 'Most Popular', 
          icon: 'fa-star', 
          color: '#3a86ff' 
        },
        { 
          name: 'Premium', 
          price: 1800, 
          discount: 15, 
          discountMonths: 12, 
          benefits: ['All Standard Benefits', 'Personal Trainer', 'Spa & Sauna'], 
          note: 'For serious fitness', 
          icon: 'fa-gem', 
          color: '#8338ec' 
        }
      ];
    }

    // Try to geocode the address to get lat/lng coordinates
    let coordinates = null;
    try {
      coordinates = await geocodeAddress(
        req.body.address,
        req.body.city,
        req.body.state,
        req.body.pincode
      );
      if (coordinates) {
        console.log(`✅ Geocoded ${req.body.gymName}: ${coordinates.lat}, ${coordinates.lng}`);
      } else {
        console.log(`⚠️ Could not geocode address for ${req.body.gymName}`);
      }
    } catch (geocodeError) {
      console.error('Geocoding error during registration:', geocodeError);
    }

    const newGym = new Gym({
      gymName: req.body.gymName,
      admin: req.admin ? req.admin.id : null,
      email: req.body.email,
      phone: req.body.phone,
      password: hashedPassword,
      location: {
        address: req.body.address,
        city: req.body.city,
        state: req.body.state,
        pincode: req.body.pincode,
        landmark: req.body.landmark,
        lat: coordinates?.lat || null,
        lng: coordinates?.lng || null
      },
      description: req.body.description,
      gymPhotos,
      logoUrl,
      equipment: Array.isArray(req.body.equipment) ? req.body.equipment : (typeof req.body.equipment === 'string' ? req.body.equipment.split(',').map(e => e.trim()) : []),
      activities,
      membershipPlans,
      contactPerson: req.body.contactPerson,
      supportEmail: req.body.supportEmail,
      supportPhone: req.body.supportPhone,
      openingTime: req.body.openingTime,
      closingTime: req.body.closingTime,
      membersCount: req.body.currentMembers,
      status: 'pending',
    });

    await newGym.save();

    // Create subscription for the gym
    try {
      const subscriptionController = require('./subscriptionController');
      const subscriptionReq = {
        body: {
          gymId: newGym._id,
          plan: req.body.subscriptionPlan || '1month',
          paymentMethod: req.body.paymentMethod || 'razorpay'
        }
      };
      
      // Create a mock response object to capture the subscription result
      let subscriptionCreated = false;
      const mockRes = {
        status: () => mockRes,
        json: (data) => {
          if (data.success) {
            subscriptionCreated = true;
            console.log('✅ Subscription created successfully for gym:', newGym.gymName);
          }
          return mockRes;
        }
      };
      
      await subscriptionController.createSubscription(subscriptionReq, mockRes);
      
      if (!subscriptionCreated) {
        console.warn('⚠️ Subscription creation may have failed for gym:', newGym.gymName);
      }
    } catch (subscriptionError) {
      console.error('Error creating subscription for gym:', subscriptionError);
      // Don't fail the registration if subscription creation fails
    }

    // Create admin notification for new gym registration
    try {
      await adminNotificationService.notifyGymRegistration(newGym);
    } catch (notificationError) {
      console.error('Error creating admin notification:', notificationError);
    }

    // Send confirmation email with subscription information
    try {
      const subscriptionPlan = req.body.subscriptionPlan || '1month';
      const planNames = {
        '1month': 'Monthly',
        '3month': 'Quarterly', 
        '6month': 'Half-Yearly',
        '12month': 'Annual'
      };
      
      await sendEmail(
        newGym.email,
        'Your Gym Registration is Received - Gym-Wale',
        `<h2>Thank you for registering your gym on Gym-Wale!</h2>
        <p>Dear ${newGym.contactPerson || newGym.gymName},</p>
        <p>Your registration has been received and is under review. Our team will contact you soon.</p>
        
        <div style="background: #e3eafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #1976d2; margin: 0 0 10px 0;">Your Subscription Plan</h3>
          <p style="margin: 5px 0;"><strong>Plan:</strong> ${planNames[subscriptionPlan] || 'Monthly'}</p>
          <p style="margin: 5px 0;"><strong>Trial Period:</strong> 1 Month FREE</p>
          <p style="margin: 5px 0;">Your free trial will begin once your gym is approved by our admin team.</p>
        </div>
        
        <p>During your trial period, you'll have access to all features including:</p>
        <ul>
          <li>Customizable Dashboard</li>
          <li>Full Payment Management</li>
          <li>Enhanced Membership Handler</li>
          <li>Fingerprint & Face Recognition</li>
          <li>Advanced Analytics & Reports</li>
          <li>And much more!</li>
        </ul>
        
        <p>Regards,<br/>Gym-Wale Team</p>`
      );
    } catch (mailErr) {
      console.error('Error sending registration email:', mailErr);
    }

    res.status(201).json({
      status: "pending",
      message: "✅ Gym registered successfully! Pending admin approval.",
      subscriptionIncluded: true,
      trialPeriod: "1 month free trial included"
    });

  } catch (error) {
    console.error("❌ Error during gym registration:", error);
    res.status(500).json({ message: "Server error while registering gym" });
  }
};


// Get Gym Profile for Logged-in Admin
exports.getMyProfile = async (req, res) => {
  
  
  const adminId = req.admin && req.admin.id;
  
  if (!adminId) {
    return res.status(401).json({ message: 'Not authorized, no admin ID found' });
  }
  
  try {
    // Find gym by its own ID, since the gym admin is the gym itself
    const gym = await Gym.findById(adminId).select('-password');
    if (!gym) {
      return res.status(404).json({ message: 'Gym profile not found for this admin' });
    }
        
    // Ensure proper data formatting for frontend
    const gymProfile = gym.toObject();
    
    // Ensure logoUrl is properly formatted
    if (gymProfile.logoUrl && !gymProfile.logoUrl.startsWith('http')) {
      gymProfile.logoUrl = gymProfile.logoUrl.startsWith('/') ? gymProfile.logoUrl : `/${gymProfile.logoUrl}`;
    }
    
    // Ensure activities are properly structured
    if (Array.isArray(gymProfile.activities)) {
      gymProfile.activities = gymProfile.activities.map(activity => {
        if (typeof activity === 'string') {
          return { name: activity, icon: 'fa-dumbbell', description: '' };
        } else if (typeof activity === 'object' && activity !== null) {
          return {
            name: activity.name || '',
            icon: activity.icon || 'fa-dumbbell',
            description: activity.description || ''
          };
        }
        return null;
      }).filter(Boolean);
    } else {
      gymProfile.activities = [];
    }
    
    res.status(200).json(gymProfile);
  } catch (error) {
    console.error('❌ Error fetching gym profile for admin:', error);
    res.status(500).json({ message: 'Server error while fetching profile' });
  }
};

// Update Logged-in Gym's Profile (by admin)
// Helper: Validate current password
async function validateCurrentPassword(gym, currentPassword) {
  if (typeof currentPassword !== 'string' || currentPassword.trim().length === 0) {
    return { valid: false, message: 'Current password is required to update profile.' };
  }
  const isMatch = await bcrypt.compare(currentPassword, gym.password);
  if (!isMatch) {
    return { valid: false, message: 'Invalid current password.' };
  }
  return { valid: true };
}

// Helper: Handle password change
async function handlePasswordChange(gym, newPassword) {
  if (typeof newPassword === 'string' && newPassword.trim().length > 0) {
    if (newPassword.length < 8) {
      return { error: 'New password must be at least 8 characters long.' };
    }
    if (await bcrypt.compare(newPassword, gym.password)) {
      return { error: 'New password cannot be the same as the old password.' };
    }
    gym.password = await bcrypt.hash(newPassword, 10);
  }
  return {};
}

// Helper: Update location fields
function updateLocation(gym, { address, city, state, pincode, landmark }) {
  if (!gym.location) gym.location = {};
  if (address) gym.location.address = address;
  if (city) gym.location.city = city;
  if (state) gym.location.state = state;
  if (pincode) gym.location.pincode = pincode;
  if (landmark) gym.location.landmark = landmark;
}

// Helper: Handle logo upload
function handleLogoUpload(gym, file, gymLogo) {
  if (file?.filename) {
    gym.logoUrl = `uploads/gym-logos/${file.filename}`;
  } else if (gymLogo === null) {
    gym.logoUrl = undefined;
  }
}

exports.updateMyProfile = async (req, res) => {
  const adminId = req.admin?.id;
  if (!adminId) {
    return res.status(401).json({ message: 'Not authorized' });
  }

  const { gymName, email, phone, address, city, state, pincode, landmark, description, contactPerson, supportEmail, supportPhone, openingTime, closingTime, status, currentPassword, newPassword, gymLogo } = req.body;

  try {
    const gym = await Gym.findById(adminId);
    if (!gym) {
      return res.status(404).json({ message: 'Gym not found for this admin' });
    }

    // Prepare fields to update
    if (gymName) gym.gymName = gymName;
    if (email) gym.email = email;
    if (phone) gym.phone = phone;
    if (description) gym.description = description;
    if (contactPerson) gym.contactPerson = contactPerson;
    if (supportEmail) gym.supportEmail = supportEmail;
    if (supportPhone) gym.supportPhone = supportPhone;
    if (openingTime) gym.openingTime = openingTime;
    if (closingTime) gym.closingTime = closingTime;
    if (status) gym.status = status;

    updateLocation(gym, { address, city, state, pincode, landmark });

    // Secure Current Password Check
    const passwordValidation = await validateCurrentPassword(gym, currentPassword);
    if (!passwordValidation.valid) {
      return res.status(401).json({ message: passwordValidation.message });
    }

    // Secure Password Change Logic
    const passwordChangeResult = await handlePasswordChange(gym, newPassword);
    if (passwordChangeResult.error) {
      return res.status(400).json({ message: passwordChangeResult.error });
    }

    handleLogoUpload(gym, req.file, gymLogo);

    await gym.save();
    const profileData = gym.toObject();
    delete profileData.password;

    res.status(200).json({
      message: 'Profile updated successfully',
      gym: profileData
    });

  } catch (error) {
    console.error("Error updating gym profile:", error);
    if (error.code === 11000) {
      let field = 'unknown';
      if (error.message.includes('email')) field = 'email';
      else if (error.message.includes('phone')) field = 'phone';
      return res.status(400).json({ message: `This ${field} is already in use by another gym.` });
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Validation Error', errors: error.errors });
    }
    res.status(500).json({ message: 'Server error while updating profile' });
  }
};

// Change password for logged-in gym admin
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required.' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'New password must be at least 8 characters long.' });
    }

    // Get the gym from the database
    const gym = await Gym.findById(req.gym.id);
    if (!gym) {
      return res.status(404).json({ message: 'Gym not found.' });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, gym.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ message: 'Current password is incorrect.' });
    }

    // Check if new password is different from current password
    const isSamePassword = await bcrypt.compare(newPassword, gym.password);
    if (isSamePassword) {
      return res.status(400).json({ message: 'New password cannot be the same as the current password.' });
    }

    // Hash and save new password
    gym.password = await bcrypt.hash(newPassword, 10);
    await gym.save();

    res.status(200).json({ message: 'Password changed successfully.' });

  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ message: 'Server error while changing password.' });
  }
};

// Fetch gyms by a list of cities
exports.getGymsByCities = async (req, res) => {
  try {
    const { cities } = req.body; // Expect an array of city names in the request body

    if (!cities || !Array.isArray(cities) || cities.length === 0) {
      return res.status(400).json({ message: 'Please provide a list of cities.' });
    }

   
    const cityRegexes = cities.map(city => new RegExp(`^${city}$`, 'i'));

    const gyms = await Gym.find({
      'location.city': { $in: cityRegexes },
      status: 'approved' // Only show approved gyms
    }).select('-password'); // Exclude sensitive data like passwords

    if (!gyms || gyms.length === 0) {
      
      return res.status(200).json([]);
    }

    // Optional: Transform data if needed, for example, to construct full image URLs
    const processedGyms = gyms.map(gym => {
      return {
        _id: gym._id,
        id: gym._id, // for frontend compatibility if using 'id'
        name: gym.gymName,
        city: gym.location.city, 
      };
    });

    res.status(200).json(processedGyms);

  } catch (error) {
    console.error('Error fetching gyms by cities:', error);
    res.status(500).json({ message: 'Server error while fetching gyms by cities.' });
  }
};

exports.uploadGymPhoto = async (req, res) => {
  try {
    const adminId = req.admin && req.admin.id;
    if (!adminId) {
      return res.status(401).json({ success: false, message: 'Not authorized, no admin ID found' });
    }
    console.log('req.admin:', req.admin);
    console.log('req.body:', req.body);
    console.log('req.file:', req.file);
    const { title, description, category } = req.body;
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No photo uploaded.' });
    }
    const imageUrl = `/uploads/gymPhotos/${req.file.filename}`;
    const imageObj = { title, description, category, imageUrl, uploadedAt: new Date() };
    const gym = await Gym.findOneAndUpdate(
      { admin: adminId },
      { $push: { gymPhotos: imageObj } },
      { new: true }
    );
    if (!gym) {
      return res.status(404).json({ success: false, message: 'Gym not found for this admin.' });
    }
    res.json({ success: true, gymImage: imageObj, gym });
  } catch (err) {
    console.error('Gym Photo Upload Error:', err); // <-- Add this line
    res.status(500).json({ success: false, message: 'Failed to upload gym photo', error: err.message });
  }
};

// Update a gym photo by ID for the logged-in admin
exports.updateGymPhoto = async (req, res) => {
  try {
    console.log('DEBUG: updateGymPhoto adminId =', req.admin && req.admin.id, 'photoId =', req.params.photoId);

    const adminId = req.admin && req.admin.id;
    if (!adminId) {
      return res.status(401).json({ success: false, message: 'Not authorized, no admin ID found' });
    }
    const { photoId } = req.params;
    const { title, description } = req.body;
    let updateFields = {};
    if (title) updateFields['gymPhotos.$.title'] = title;
    if (description) updateFields['gymPhotos.$.description'] = description;
    if (req.file) {
      updateFields['gymPhotos.$.imageUrl'] = `/uploads/gymPhotos/${req.file.filename}`;
    }
    // Find and update the photo in gymPhotos array
    const gym = await Gym.findOneAndUpdate(
      { admin: adminId, 'gymPhotos._id': photoId },
      { $set: updateFields },
      { new: true }
    );
    if (!gym) {
      return res.status(404).json({ success: false, message: 'Gym not found or not authorized.' });
    }
    const updatedPhoto = gym.gymPhotos.id(photoId);
    if (!updatedPhoto) {
      return res.status(404).json({ success: false, message: 'Photo not found in this gym.' });
    }
    res.json({ success: true, photo: updatedPhoto });
  } catch (err) {
    console.error('Update Gym Photo Error:', err);
    res.status(500).json({ success: false, message: 'Failed to update gym photo', error: err.message });
  }
};
// Delete a gym photo by ID for the logged-in admin
exports.deleteGymPhoto = async (req, res) => {
  try {
    const adminId = req.admin && req.admin.id;
    if (!adminId) {
      return res.status(401).json({ success: false, message: 'Not authorized, no admin ID found' });
    }
    const { photoId } = req.params;
    // Remove the photo from the gymPhotos array
    const gym = await Gym.findOneAndUpdate(
      { admin: adminId },
      { $pull: { gymPhotos: { _id: photoId } } },
      { new: true }
    );
    if (!gym) {
      return res.status(404).json({ success: false, message: 'Gym not found or not authorized.' });
    }
    res.json({ success: true, message: 'Photo removed successfully.' });
  } catch (err) {
    console.error('Delete Gym Photo Error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete gym photo', error: err.message });
  }
};
// Get all gym photos for the logged-in admin
exports.getAllGymPhotos = async (req, res) => {
  try {
    // Debug logging for authentication troubleshooting
    console.log('DEBUG: getAllGymPhotos req.admin =', req.admin);
    console.log('DEBUG: getAllGymPhotos req.headers.authorization =', req.headers['authorization']);
    const adminId = req.admin && req.admin.id;
    if (!adminId) {
      return res.status(401).json({ success: false, message: 'Not authorized, no admin ID found' });
    }
    
    // Look for gym by its own ID (adminId is actually the gym's ID from JWT token)
    const gym = await Gym.findById(adminId);
    if (!gym) {
      return res.status(404).json({ success: false, message: 'Gym not found for this admin.' });
    }
    
    res.json({ success: true, photos: gym.gymPhotos || [] });
  } catch (err) {
    console.error('Get Gym Photos Error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch gym photos', error: err.message });
  }
};



// Public: Get gym details by ID (for details page)
exports.getGymById = async (req, res) => {
  try {
    const gym = await Gym.findOne({ _id: req.params.id, status: 'approved' }).select('-password');
    if (!gym) {
      return res.status(404).json({ message: 'Gym not found or not approved' });
    }
    res.status(200).json(gym);
  } catch (error) {
    console.error("Error fetching gym by ID:", error);
    res.status(500).json({ message: 'Server error while fetching gym details' });
  }
};
// Update Activities for the logged-in gym admin
exports.updateActivities = async (req, res) => {
  const adminId = req.admin && req.admin.id;
  if (!adminId) {
    return res.status(401).json({ message: 'Not authorized, no admin ID found' });
  }
  try {
    const { activities } = req.body;
    if (!Array.isArray(activities)) {
      return res.status(400).json({ message: 'Activities must be an array.' });
    }
    // Validate each activity object
    for (const act of activities) {
      if (!act.name || !act.icon || !act.description) {
        return res.status(400).json({ message: 'Each activity must have name, icon, and description.' });
      }
    }
    const gym = await Gym.findOneAndUpdate(
      { admin: adminId },
      { $set: { activities } },
      { new: true }
    );
    if (!gym) {
      return res.status(404).json({ message: 'Gym not found for this admin.' });
    }
    res.status(200).json({ message: 'Activities updated successfully.', activities: gym.activities });
  } catch (error) {
    console.error('Error updating activities:', error);
    res.status(500).json({ message: 'Server error while updating activities.' });
  }
};

// Get membership plans for the logged-in gym admin
exports.getMembershipPlans = async (req, res) => {
  try {
    const adminId = req.admin && req.admin.id;
    if (!adminId) {
      return res.status(401).json({ message: 'Not authorized, no admin ID found' });
    }
    
    const gym = await Gym.findOne({ admin: adminId });
    if (!gym) {
      return res.status(404).json({ message: 'Gym not found for this admin.' });
    }
    
    // Return membership plans or default plans if none exist
    let membershipPlans = gym.membershipPlans || [];
    
    // If no membership plans exist, return default plans
    if (membershipPlans.length === 0) {
      membershipPlans = [
        { 
          name: 'Basic', 
          price: 800, 
          discount: 0, 
          discountMonths: 0, 
          benefits: ['Gym Access', 'Group Classes'], 
          note: 'Best for beginners', 
          icon: 'fa-leaf', 
          color: '#38b000' 
        },
        { 
          name: 'Standard', 
          price: 1200, 
          discount: 10, 
          discountMonths: 6, 
          benefits: ['All Basic Benefits', 'Diet Plan', 'Locker Facility'], 
          note: 'Most Popular', 
          icon: 'fa-star', 
          color: '#3a86ff' 
        },
        { 
          name: 'Premium', 
          price: 1800, 
          discount: 15, 
          discountMonths: 12, 
          benefits: ['All Standard Benefits', 'Personal Trainer', 'Spa & Sauna'], 
          note: 'For serious fitness', 
          icon: 'fa-gem', 
          color: '#8338ec' 
        }
      ];
    }
    
    res.status(200).json(membershipPlans);
  } catch (error) {
    console.error('Error fetching membership plans:', error);
    res.status(500).json({ message: 'Server error while fetching membership plans' });
  }
};

// Update membership plans for the logged-in gym admin
exports.updateMembershipPlans = async (req, res) => {
  try {
    const adminId = req.admin && req.admin.id;
    if (!adminId) {
      return res.status(401).json({ message: 'Not authorized, no admin ID found' });
    }
    
    const membershipPlans = req.body;
    
    // Validate membership plans structure
    if (!Array.isArray(membershipPlans) || membershipPlans.length !== 3) {
      return res.status(400).json({ message: 'Membership plans must be an array of 3 plans.' });
    }
    
    // Validate each plan
    for (const plan of membershipPlans) {
      if (!plan.name || typeof plan.price !== 'number' || !Array.isArray(plan.benefits)) {
        return res.status(400).json({ message: 'Each plan must have name, price, and benefits array.' });
      }
    }
    
    // Ensure proper data types and structure
    const processedPlans = membershipPlans.map(plan => ({
      name: plan.name,
      price: parseFloat(plan.price) || 0,
      discount: parseFloat(plan.discount) || 0,
      discountMonths: parseInt(plan.discountMonths) || 0,
      benefits: Array.isArray(plan.benefits) ? plan.benefits : [],
      note: plan.note || '',
      icon: plan.icon || 'fa-leaf',
      color: plan.color || '#38b000'
    }));
    
    const gym = await Gym.findOneAndUpdate(
      { admin: adminId },
      { $set: { membershipPlans: processedPlans } },
      { new: true }
    );
    
    if (!gym) {
      return res.status(404).json({ message: 'Gym not found for this admin.' });
    }
    
    res.status(200).json({ 
      message: 'Membership plans updated successfully.', 
      membershipPlans: gym.membershipPlans 
    });
  } catch (error) {
    console.error('Error updating membership plans:', error);
    res.status(500).json({ message: 'Server error while updating membership plans' });
  }
};

// ===== SECURITY HELPER FUNCTIONS =====

// Extract device info from user agent
const extractDeviceInfo = (userAgent) => {
  if (!userAgent) return 'Unknown device';
  
  if (userAgent.includes('Mobile')) return 'Mobile Device';
  if (userAgent.includes('Tablet')) return 'Tablet';
  if (userAgent.includes('Windows')) return 'Windows PC';
  if (userAgent.includes('Mac')) return 'Mac';
  if (userAgent.includes('Linux')) return 'Linux PC';
  
  return 'Unknown device';
};

// Extract browser info from user agent
const extractBrowserInfo = (userAgent) => {
  if (!userAgent) return 'Unknown browser';
  
  if (userAgent.includes('Chrome')) return 'Chrome';
  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Safari')) return 'Safari';
  if (userAgent.includes('Edge')) return 'Edge';
  if (userAgent.includes('Opera')) return 'Opera';
  
  return 'Unknown browser';
};

// Check if login is suspicious based on patterns
const isSuspiciousLogin = async (gymId, ipAddress) => {
  try {
    if (!gymId) return false;
    
    // Check for multiple failed attempts from same IP in last hour
    const recentFailures = await LoginAttempt.countDocuments({
      gymId,
      ipAddress,
      success: false,
      timestamp: { $gt: new Date(Date.now() - 60 * 60 * 1000) }
    });
    
    if (recentFailures >= 3) return true;
    
    // Check if this is a new IP for this gym
    const previousLogins = await LoginAttempt.countDocuments({
      gymId,
      ipAddress,
      success: true
    });
    
    // If no previous successful logins from this IP, mark as suspicious
    if (previousLogins === 0) return true;
    
    return false;
  } catch (error) {
    console.error('Error checking suspicious login:', error);
    return false;
  }
};

// Get location from IP address using a free geolocation service
const getLocationFromIP = async (ipAddress) => {
  try {
    console.log(`🌍 Getting location for IP: ${ipAddress}`);
    
    // Handle local/private IP addresses
    if (ipAddress === '127.0.0.1' || 
        ipAddress === '::1' || 
        ipAddress.startsWith('192.168.') || 
        ipAddress.startsWith('10.') || 
        ipAddress.startsWith('172.')) {
      console.log('📍 Local IP detected, returning Local Network');
      return {
        city: 'Local Network',
        country: 'Local',
        coordinates: { lat: 0, lng: 0 }
      };
    }

    // Use a free geolocation service (ip-api.com allows 1000 requests/month for free)
    console.log(`🔍 Querying geolocation service for IP: ${ipAddress}`);
    const response = await axios.get(`http://ip-api.com/json/${ipAddress}?fields=status,country,city,lat,lon,regionName`, {
      timeout: 5000 // 5 second timeout
    });
    
    if (response.data && response.data.status === 'success') {
      const locationData = {
        city: response.data.city || 'Unknown',
        country: response.data.country || 'Unknown',
        region: response.data.regionName || '',
        coordinates: { 
          lat: response.data.lat || 0, 
          lng: response.data.lon || 0 
        }
      };
      console.log('✅ Location found:', locationData);
      return locationData;
    } else {
      console.log('⚠️ Geolocation service returned unsuccessful status');
    }
    
    // Fallback for failed requests or invalid IPs
    console.log('📍 Using fallback location');
    return {
      city: 'Unknown',
      country: 'Unknown',
      coordinates: { lat: 0, lng: 0 }
    };
  } catch (error) {
    console.error('❌ Error getting location from IP:', error.message);
    // Return fallback location on error
    return {
      city: 'Unknown',
      country: 'Unknown',
      coordinates: { lat: 0, lng: 0 }
    };
  }
};

// Check if failed login should trigger notification
const shouldNotifyFailedLogin = async (gymId) => {
  try {
    const settings = await SecuritySettings.findOne({ gymId });
    // Only return true if settings exist AND notifications are enabled
    return settings && settings.loginNotifications && settings.loginNotifications.enabled;
  } catch (error) {
    console.error('Error checking notification settings:', error);
    return false;
  }
};

// Send login notification
const sendLoginNotification = async (gymId, loginAttempt) => {
  try {
    const gym = await Gym.findById(gymId);
    const settings = await SecuritySettings.findOne({ gymId });
    
    // Only send notifications if SecuritySettings exist AND notifications are enabled
    if (!gym || !settings || !settings.loginNotifications || !settings.loginNotifications.enabled) {
      return;
    }
    
    const preferences = settings.loginNotifications.preferences;
    
    // Only send notification if preferences allow it
    if (preferences.suspiciousOnly && !loginAttempt.suspicious) {
      return;
    }
    
    const subject = loginAttempt.success ? 
      'Successful Login to Your Gym Account' : 
      'Failed Login Attempt on Your Gym Account';
    
    const message = `
      ${loginAttempt.success ? 'Successful' : 'Failed'} login attempt for ${gym.gymName}
      
      Time: ${loginAttempt.timestamp.toLocaleString()}
      IP Address: ${loginAttempt.ipAddress}
      Device: ${loginAttempt.device}
      Browser: ${loginAttempt.browser}
      Location: ${loginAttempt.location?.city || 'Unknown'}${loginAttempt.location?.region ? ', ' + loginAttempt.location.region : ''}, ${loginAttempt.location?.country || 'Unknown'}
      
      ${loginAttempt.suspicious ? '⚠️ This login attempt has been marked as suspicious.' : ''}
      ${!loginAttempt.success ? `Failure reason: ${loginAttempt.failureReason}` : ''}
      
      If this wasn't you, please secure your account immediately.
    `;
    
    if (preferences.email) {
      console.log(`📤 Attempting to send email notification to: ${gym.email}`, {
        subject,
        hasEmailFunction: typeof sendEmail === 'function',
        preferences
      });
      
      try {
        await sendEmail(gym.email, subject, message);
        console.log(`✅ Email notification sent successfully to: ${gym.email}`);
      } catch (emailError) {
        console.error(`❌ Failed to send email notification to: ${gym.email}`, emailError);
      }
    } else {
      console.log(`🔕 Email notifications disabled in preferences for gym ID: ${gymId}`);
    }
    
    // You can add browser notification logic here if needed
    
  } catch (error) {
    console.error('Error sending login notification:', error);
  }
};

// Verify backup code for 2FA
const verifyBackupCode = async (gym, code) => {
  try {
    if (!gym.twoFactorBackupCodes || gym.twoFactorBackupCodes.length === 0) {
      return false;
    }
    
    // Check if any of the hashed backup codes match
    for (let i = 0; i < gym.twoFactorBackupCodes.length; i++) {
      const isMatch = await bcrypt.compare(code, gym.twoFactorBackupCodes[i]);
      if (isMatch) {
        // Remove the used backup code
        gym.twoFactorBackupCodes.splice(i, 1);
        await gym.save();
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error verifying backup code:', error);
    return false;
  }
};

// Export the send2FAEmail function for use in routes
module.exports.send2FAEmail = send2FAEmail;

