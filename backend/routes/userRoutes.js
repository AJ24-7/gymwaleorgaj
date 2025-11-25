const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');
const multer = require('multer');
const { googleAuth } = require('../controllers/userController');
const { saveWorkoutSchedule, getWorkoutSchedule, getUserCoupons, saveOfferToProfile, checkCouponValidity } = require('../controllers/userController');

const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');
const { registerUser, loginUser, updateProfile, requestPasswordResetOTP, verifyPasswordResetOTP, changePassword, getUserProfile } = require('../controllers/userController');
// ======================
// ✅ Upload Config for Profile Images
// ======================
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/profile-pics'),
  filename: (req, file, cb) => cb(null, `${Date.now()}${path.extname(file.originalname)}`)
});
const upload = multer({ storage });

// ======================
// ✅ Auth Routes
// ======================
// OPTIONS handlers for CORS preflight
router.options('/signup', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(204);
});

router.options('/login', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(204);
});

router.options('/google-auth', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(204);
});

router.post('/signup', registerUser);
router.post('/login', loginUser);
router.post('/google-auth', googleAuth);

//Workout scheduler
router.post('/workout-schedule', authMiddleware, saveWorkoutSchedule);
router.get('/workout-schedule', authMiddleware, getWorkoutSchedule);

// ======================
// ✅ Forgot Password Routes
// ======================
router.post('/request-password-reset-otp', requestPasswordResetOTP);
router.post('/verify-password-reset-otp', verifyPasswordResetOTP);
router.post('/reset-password-with-otp', verifyPasswordResetOTP); // Alias for backward compatibility

// ======================
// ✅ Profile Routes
// ======================
router.get('/profile', authMiddleware, getUserProfile); // Use the proper controller function

// ======================
// ✅ Update Profile Route with controller
// ======================
router.put('/update-profile', authMiddleware, upload.single('profileImage'), updateProfile);

// ======================
// ✅ Change Password Route
// ======================
router.put('/change-password', authMiddleware, changePassword);

// ======================
// ✅ User Coupons Routes
// ======================
router.get('/:userId/coupons', authMiddleware, getUserCoupons);
router.post('/:userId/coupons', authMiddleware, saveOfferToProfile);
router.get('/:userId/coupons/:couponId/check', authMiddleware, checkCouponValidity);

module.exports = router;
