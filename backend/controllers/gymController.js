
const Gym = require('../models/gym');
const Notification = require('../models/Notification');
const TrialBooking = require('../models/TrialBooking');
const sendEmail = require('../utils/sendEmail');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken'); // Added jsonwebtoken
const nodemailer = require('nodemailer');

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

// Admin Login (moved from gymadminController)
// Unified Gym/Admin Login (use for both gym and admin dashboard)
exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    // Find gym by email
    const gym = await Gym.findOne({ email });
    if (!gym) {
      return res.status(401).json({ success: false, message: 'Invalid credentials or gym not found.' });
    }
    // Check password
    const isMatch = await bcrypt.compare(password, gym.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials or gym not found.' });
    }
    // Check approval status
    if (gym.status !== 'approved') {
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
    res.status(200).json({
      success: true,
      message: 'Login successful! Redirecting...',
      token,
      gymId: gym.id
    });
  } catch (error) {
    console.error('Unified gym login error:', error);
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
    console.log('Password Change Request:', { email, otp: otp ? 'PROVIDED' : 'MISSING' });
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
    console.group('Get Admin Profile');
    console.log('Request Admin:', req.admin);
    try {
        if (!req.admin || !req.admin.id) {
            console.warn('Invalid admin object in request');
            console.groupEnd();
            return res.status(401).json({ message: 'Authentication failed' });
        }
        const admin = await Gym.findById(req.admin.id).select('-password');
        console.log('Admin Found:', !!admin);
        if (!admin) {
            console.warn(`No admin found with ID: ${req.admin.id}`);
            console.groupEnd();
            return res.status(404).json({ message: 'Admin profile not found' });
        }
        const logoUrl = admin.logoUrl ? 
            (admin.logoUrl.startsWith('http') ? admin.logoUrl : 
                (admin.logoUrl.startsWith('uploads/') ? `/${admin.logoUrl}` : `/uploads/gymimages/${admin.logoUrl}`)) : 
            null;
        const profileResponse = {
            gymName: admin.gymName || 'Gym Admin',
            email: admin.email,
            logoUrl: logoUrl,
            phone: admin.phone || '',
            address: admin.address || '',
            description: admin.description || ''
        };
        console.log('Profile Response:', profileResponse);
        console.groupEnd();
        res.json(profileResponse);
    } catch (error) {
        console.error('Comprehensive error fetching admin profile:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        });
        console.groupEnd();
        res.status(500).json({ message: 'Server error while fetching profile' });
    }
};

// Request OTP for Password Reset (moved from gymadminController)
exports.requestOtp = async (req, res) => {
  console.log('[requestOtp] Function called.'); // New Log
  const { email } = req.body;
  console.log('[requestOtp] Received email:', email); // New Log
  if (!email) {
    console.log('[requestOtp] Email is missing. Sending 400.'); // New Log
    return res.status(400).json({ message: 'Email is required' });
  }
  try {
    console.log(`[requestOtp] Searching for admin with email: ${email}`); // New Log
    const gymAdmin = await Gym.findOne({ email });
    if (!gymAdmin) {
      console.log(`[requestOtp] Admin not found for email: ${email}. Sending 404.`); // New Log
      return res.status(404).json({ message: 'Admin with this email not found.' });
    }
    console.log('[requestOtp] Admin found:', gymAdmin._id); // New Log
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`[requestOtp] Generated OTP: ${otp} for admin: ${gymAdmin._id}`);
    gymAdmin.passwordResetToken = otp; 
    gymAdmin.passwordResetExpires = Date.now() + 10 * 60 * 1000; 
    console.log(`[requestOtp] Saving OTP for admin: ${gymAdmin._id}`); // New Log
    await gymAdmin.save();
    console.log(`[requestOtp] OTP saved successfully for admin: ${gymAdmin._id}`); // New Log
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
      console.log(`[requestOtp] Attempting to send OTP email to: ${gymAdmin.email}`);
      await sendEmail(gymAdmin.email, emailSubject, emailHtml);
      console.log(`[requestOtp] OTP email sent successfully to: ${gymAdmin.email}.`);
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
  console.log('[resetPassword] Function called.');
  console.log('[resetPassword] Received data:', { email, otp: '[REDACTED]', newPassword: '[REDACTED]' });
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
      console.log(`[resetPassword] Invalid or expired OTP for email: ${email}`);
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP. Please request a new one.' });
    }
    console.log(`[resetPassword] Admin found and OTP + expiry verified for: ${email}`);
    // Hash new password
    const salt = await bcrypt.genSalt(10);
    admin.password = await bcrypt.hash(newPassword, salt);
    admin.passwordResetToken = undefined; // Clear OTP token
    admin.passwordResetExpires = undefined; // Clear OTP expiry
    console.log(`[resetPassword] Attempting to save new password for: ${email}`);
    await admin.save();
    console.log(`[resetPassword] New password saved successfully for: ${email}`);
    // Optionally, send a confirmation email
    // await sendEmail(admin.email, 'Your Password Has Been Reset', '<p>Your password was successfully reset.</p>');
    res.status(200).json({ success: true, message: 'Password has been reset successfully. You can now login with your new password.' });
  } catch (error) {
    console.error('[resetPassword] Error:', error.message, error.stack);
    res.status(500).json({ success: false, message: 'Error resetting password. Please try again.' });
  }
};

exports.registerGym = async (req, res) => {
  try {
    console.log("🟡 Incoming form body:", req.body);
    console.log("🟡 Uploaded files:", req.files);

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


    // File handling (gymImages is an array of uploaded files)
    // --- Updated: Parse gymImagesMeta for title, description, category ---
    let gymPhotos = [];
    if (req.files && req.files.gymImages && req.body.gymImagesMeta) {
      // gymImagesMeta is sent as indexed fields: gymImagesMeta[0][title], etc.
      const files = req.files.gymImages;
      // Parse meta fields
      let metaArr = [];
      // Find max index
      let maxIdx = -1;
      Object.keys(req.body).forEach(key => {
        const match = key.match(/^gymImagesMeta\[(\d+)\]\[title\]$/);
        if (match) {
          const idx = parseInt(match[1], 10);
          if (idx > maxIdx) maxIdx = idx;
        }
      });
      for (let i = 0; i <= maxIdx; i++) {
        metaArr[i] = {
          title: req.body[`gymImagesMeta[${i}][title]`] || '',
          description: req.body[`gymImagesMeta[${i}][description]`] || '',
          category: req.body[`gymImagesMeta[${i}][category]`] || '',
        };
      }
      gymPhotos = files.map((file, i) => ({
        title: metaArr[i]?.title || '',
        description: metaArr[i]?.description || '',
        category: metaArr[i]?.category || '',
        imageUrl: `uploads/gymImages/${file.filename}`,
        uploadedAt: new Date()
      }));
    } else if (req.files && req.files.gymImages) {
      // Fallback: just filenames
      gymPhotos = req.files.gymImages.map(file => ({
        title: '',
        description: '',
        category: '',
        imageUrl: `uploads/gymImages/${file.filename}`,
        uploadedAt: new Date()
      }));
    } else {
      gymPhotos = [];
    }

    // Handle gym logo upload (single file, field name: 'logo')
    let logoUrl = '';
    if (req.files && req.files.logo && req.files.logo.length > 0) {
      logoUrl = `uploads/gymImages/${req.files.logo[0].filename}`;
    } else {
      logoUrl = '';
    }

    // Parse repeated fields (ensure arrays)

    // Parse activities as array of objects: [{ name, icon, description }]
    let activities = [];
    if (Array.isArray(req.body.activities)) {
      activities = req.body.activities.map(a => {
        if (typeof a === 'object' && a !== null && a.name) {
          // Already correct format
          return {
            name: a.name,
            icon: a.icon || 'fa-dumbbell',
            description: a.description || ''
          };
        } else if (typeof a === 'string') {
          // If string, treat as name only
          return { name: a, icon: 'fa-dumbbell', description: '' };
        } else if (typeof a === 'object' && a !== null) {
          // If object but not with .name, try to join values (fixes broken spread)
          const name = Object.values(a).filter(v => typeof v === 'string').join('').trim();
          return {
            name: name,
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


    // Parse membership plans (array of objects)
    let membershipPlans = [];
    if (Array.isArray(req.body.planName)) {
      for (let i = 0; i < req.body.planName.length; i++) {
        membershipPlans.push({
          name: req.body.planName[i],
          price: req.body.planPrice[i],
          discount: req.body.planDiscount[i],
          discountMonths: req.body.planDiscountMonths[i],
          benefits: req.body.planBenefits[i]?.split(',').map(b => b.trim()),
          note: req.body.planNote[i],
          icon: req.body.planIcon[i],
          color: req.body.planColor[i]
        });
      }
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
        landmark: req.body.landmark
      },
      description: req.body.description,
      gymPhotos,
      logoUrl,
      equipment: Array.isArray(req.body.equipment) ? req.body.equipment : (typeof req.body.equipment === 'string' ? req.body.equipment.split(',').map(e => e.trim()) : []),
      otherEquipment: req.body.otherEquipment || '',
      activities,
      otherActivities: req.body.otherActivities || '',
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
    console.log("✅ Gym saved successfully to DB (according to Mongoose):", newGym);

    // Send confirmation email
    try {
      await sendEmail(
        newGym.email,
        'Your Gym Registration is Received - Fit-verse',
        `<h2>Thank you for registering your gym on Fit-verse!</h2>
        <p>Dear ${newGym.contactPerson || newGym.gymName},</p>
        <p>Your registration has been received and is under review. Our team will contact you soon.</p>
        <p>Regards,<br/>Fit-verse Team</p>`
      );
    } catch (mailErr) {
      console.error('Error sending registration email:', mailErr);
    }

    res.status(201).json({
      status: "pending",
      message: "✅ Gym registered successfully! Pending admin approval."
    });

  } catch (error) {
    console.error("❌ Error during gym registration:", error);
    res.status(500).json({ message: "Server error while registering gym" });
  }
};


// Get Gym Profile for Logged-in Gym Admin
exports.getMyProfile = async (req, res) => {
  try {
    // req.gym is set by the authMiddleware
    const gym = await Gym.findById(req.gym.id).select('-password');
    if (!gym) {
      return res.status(404).json({ message: 'Gym profile not found' });
    }
    // Construct logo URL
    let logoUrl = gym.gymImages && gym.gymImages.length > 0 
      ? `/uploads/gymImages/${gym.gymImages[0]}` 
      : null;
    // Debug: Log the logoUrl being returned
    console.log('[getMyProfile] Returning logoUrl:', logoUrl);
    res.json({
      gymName: gym.gymName,
      email: gym.email,
      phone: gym.phone,
      logoUrl: logoUrl,
      location: gym.location,
      description: gym.description,
      activities: gym.activities || []
    });
  } catch (error) {
    console.error('Error fetching gym profile:', error);
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
    gym.logoUrl = `uploads/gymImages/${file.filename}`;
  } else if (gymLogo === null) {
    gym.logoUrl = undefined;
  }
}

exports.updateMyProfile = async (req, res) => {
  const adminId = req.admin?.id;
  console.log("Fetching gym for adminId:", adminId);
  if (!adminId) {
    return res.status(401).json({ message: 'Not authorized' });
  }

  const { gymName, email, phone, address, city, state, pincode, landmark, description, currentPassword, newPassword, gymLogo } = req.body;

  try {
    const gym = await Gym.findOne({ admin: adminId });
    if (!gym) {
      return res.status(404).json({ message: 'Gym not found for this admin' });
    }

    // Prepare fields to update
    if (gymName) gym.gymName = gymName;
    if (email) gym.email = email;
    if (phone) gym.phone = phone;
    if (description) gym.description = description;

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

    // Debug: Log file and body
    console.log('File received:', req.file);
    console.log('Body received:', req.body);

    handleLogoUpload(gym, req.file, gymLogo);

    await gym.save();
    // Debug: Log final logoUrl
    console.log('Final logoUrl:', gym.logoUrl);
    const profileData = gym.toObject();
    delete profileData.password;

    // Debug: Log the logoUrl being returned
    console.log('[getMyProfile] Returning logoUrl:', profileData.logoUrl);
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

// Get Gym Profile for Logged-in Admin
exports.getMyProfile = async (req, res) => {
  const adminId = req.admin && req.admin.id;
  if (!adminId) {
    return res.status(401).json({ message: 'Not authorized, no admin ID found' });
  }
  try {
    const gym = await Gym.findOne({ admin: adminId }).select('-password');
    if (!gym) {
      return res.status(404).json({ message: 'Gym profile not found for this admin' });
    }
    res.status(200).json(gym.toObject());
  } catch (error) {
    res.status(500).json({ message: 'Server error while fetching profile' });
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
    const gym = await Gym.findOne({ admin: adminId });
    if (!gym) {
      return res.status(404).json({ success: false, message: 'Gym not found for this admin.' });
    }
    res.json({ success: true, photos: gym.gymPhotos });
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