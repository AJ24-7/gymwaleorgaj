console.log('<<<<< SERVER.JS IS LOADING - VERSION 1.2.0>>>>>');

// Import required modules
const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
require('dotenv').config();

// Create Express app
const app = express();

// Ensure critical upload directories exist (prevents silent Multer ENOENT errors)
const fs = require('fs');
const uploadDirs = [
  path.join(__dirname, 'uploads'),
  path.join(__dirname, 'uploads', 'trainers')
];
uploadDirs.forEach(dir => {
  try { if (!fs.existsSync(dir)) { fs.mkdirSync(dir, { recursive: true }); console.log('📁 Created directory:', dir); } } catch (e) { console.error('❌ Failed to create directory', dir, e); }
});


// Request logging middleware - placed early to catch all requests
app.use((req, res, next) => {
  
  next();
});

// Face Recognition Service
const FaceRecognitionService = require('./backend/services/faceRecognitionService');
const dotenv = require('dotenv');
const connectDB = require('./backend/config/db');

dotenv.config();

connectDB();


const userRoutes = require('./backend/routes/userRoutes');
const userBookingRoutes = require('./backend/routes/userBookingRoutes');
const userPaymentRoutes = require('./backend/routes/userPaymentRoutes');
const userPreferenceRoutes = require('./backend/routes/userPreferenceRoutes');
const trainerRoutes = require('./backend/routes/trainerRoutes');
const adminRoutes = require('./backend/routes/adminRoutes');
const gymRoutes = require('./backend/routes/gymRoutes');
const subscriptionRoutes = require('./backend/routes/subscriptionRoutes');
const trialBookingRoutes = require('./backend/routes/trialBookingRoutes');
const reviewRoutes = require('./backend/routes/reviewRoutes');
const dietRoutes = require('./backend/routes/dietRoutes');
const memberRoutes = require('./backend/routes/memberRoutes');
const notificationRoutes = require('./backend/routes/notificationRoutes');
const adminNotificationRoutes = require('./backend/routes/adminNotificationRoutes');
const gymNotificationRoutes = require('./backend/routes/gymNotificationRoutes');
const supportRoutes = require('./backend/routes/supportRoutes');
const communicationRoutes = require('./backend/routes/communicationRoutes');
const gymCommunicationRoutes = require('./backend/routes/gymCommunicationRoutes');
const whatsappRoutes = require('./backend/routes/whatsappRoutes');
const attendanceRoutes = require('./backend/routes/attendanceRoutes');
const paymentRoutes = require('./backend/routes/paymentRoutes');
const cashValidationRoutes = require('./backend/routes/cashValidationRoutes');
const equipmentRoutes = require('./backend/routes/equipmentRoutes');
const qrCodeRoutes = require('./backend/routes/qrCodeRoutes');
const biometricRoutes = require('./backend/routes/biometricRoutes');
const securityRoutes = require('./backend/routes/securityRoutes');
const offersRoutes = require('./backend/routes/offersRoutes');
const testRoutes = require('./backend/routes/testRoutes');
if (typeof testRoutes !== 'function') {
  console.error('ERROR: testRoutes is not a function!', testRoutes);
}
const NotificationScheduler = require('./backend/services/notificationScheduler');
const SubscriptionService = require('./backend/services/subscriptionService');  


// <<<< TEMPORARY TEST ROUTE >>>>
app.get('/test-route', (req, res) => {
  res.status(200).send('Test route is working!');
});
// <<<< END TEMPORARY TEST ROUTE >>>>
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple request logger for debugging
app.use((req, res, next) => {
    if (req.path.includes('/api/')) {
        console.log(`[API] ${req.method} ${req.path}`);
        if (req.path.includes('/api/trial-bookings')) {
            console.log(`[TRIAL-BOOKING] ${req.method} ${req.path}`, {
                headers: req.headers,
                body: req.body,
                query: req.query
            });
        }
    }
    next();
});
app.use('/uploads/gymImages', express.static(path.join(__dirname, 'uploads/gymImages')));
app.use('/uploads/gymPhotos', express.static(path.join(__dirname, 'uploads/gymPhotos')));
app.use('/uploads/gym-logos', express.static(path.join(__dirname, 'uploads/gym-logos')));
app.use('/uploads/equipment', express.static(path.join(__dirname, 'uploads/equipment')));

// Serve biometric agent files
app.use('/biometric-agent', express.static(path.join(__dirname, 'biometric-agent')));

// Serve the frontend directory for direct HTML access (e.g., /frontend/biometric-device-setup.html)
app.use('/frontend', require('express').static(path.join(__dirname, 'frontend')));

// Route to download biometric agent as zip
app.get('/biometric-agent.zip', (req, res) => {
  const archiver = require('archiver');
  const fs = require('fs');
  
  try {
    const agentPath = path.join(__dirname, 'biometric-agent');
    
    // Check if biometric-agent folder exists
    if (!fs.existsSync(agentPath)) {
      return res.status(404).json({ error: 'Biometric agent files not found' });
    }
    
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="FitverseBiometricAgent.zip"');
    
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    archive.on('error', (err) => {
      console.error('Archive error:', err);
      res.status(500).json({ error: 'Failed to create archive' });
    });
    
    archive.pipe(res);
    archive.directory(agentPath, 'FitverseBiometricAgent');
    archive.finalize();
    
  } catch (error) {
    console.error('Error creating biometric agent zip:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Route to download simple biometric agent as zip (lightweight version)
app.get('/simple-biometric-agent.zip', (req, res) => {
  const archiver = require('archiver');
  const fs = require('fs');
  
  try {
    const agentPath = path.join(__dirname, 'biometric-agent');
    
    // Check if biometric-agent folder exists
    if (!fs.existsSync(agentPath)) {
      return res.status(404).json({ error: 'Biometric agent files not found' });
    }
    
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="FitverseSimpleBiometricAgent.zip"');
    
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    archive.on('error', (err) => {
      console.error('Archive error:', err);
      res.status(500).json({ error: 'Failed to create archive' });
    });
    
    archive.pipe(res);
    
    // Only include files needed for simple agent
    const simpleAgentFiles = [
      'simple-agent.js',
      'simple-package.json',
      'install-service.js',
      'install-simple-agent.bat',
      'install-startup-agent.bat',
      'monitor-service.bat',
      'test-agent.bat',
      'direct-test.bat',
      'fix-firewall.ps1',
      'advanced-diagnostics.bat'
    ];
    
    simpleAgentFiles.forEach(file => {
      const filePath = path.join(agentPath, file);
      if (fs.existsSync(filePath)) {
        if (file === 'simple-package.json') {
          // Rename simple-package.json to package.json in the archive
          archive.file(filePath, { name: 'package.json' });
        } else {
          archive.file(filePath, { name: file });
        }
      }
    });
    
    archive.finalize();
    
  } catch (error) {
    console.error('Error creating simple biometric agent zip:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


const allowedOrigins = [
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:5501',
  'http://127.0.0.1:5501',
  'http://localhost:5502',
  'http://127.0.0.1:5502',
  'http://localhost:5000',
  'http://127.0.0.1:5000',
  null
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('❌ Not allowed by CORS'));
    }
  },
  credentials: true
}));

// ===== QR REGISTRATION ROUTES (MUST BE BEFORE OTHER API ROUTES) =====
// QR-based member registration route
app.post('/api/register-via-qr', async (req, res) => {
  try {
   
    
    const QRCode = require('./backend/models/QRCode');
    const Member = require('./backend/models/Member');
    const Gym = require('./backend/models/gym');
    
    const {
      qrToken,
      memberName,
      memberEmail,
      memberPhone, 
      memberAge,
      memberGender,
      memberAddress,
      gymId,
      activityPreference,
      planSelected,
      registrationType = 'standard',
      specialOffer
    } = req.body;


    // Validate required fields based on what frontend actually sends
    if (!memberName || !memberEmail || !memberPhone || !memberAge || !memberGender || !activityPreference || !planSelected) {
      return res.status(400).json({ 
        message: 'Missing required fields',
        required: ['memberName', 'memberEmail', 'memberPhone', 'memberAge', 'memberGender', 'activityPreference', 'planSelected'],
        received: Object.keys(req.body)
      });
    }

    // Validate QR code (make it optional for testing)
    let qrCode = null;
    if (qrToken) {
      qrCode = await QRCode.findOne({ 
        token: qrToken, 
        isActive: true,
        expiryDate: { $gt: new Date() }
      });
      
      if (!qrCode) {
       
        const allQRCodes = await QRCode.find({ gymId: gymId });
        allQRCodes.forEach(qr => {
        });
        
        // Instead of rejecting, proceed with direct registration
        qrCode = null; // Ensure it's null for later logic
      } else {
      }
    } 
    // Get gym details
    const gym = await Gym.findById(gymId);
    if (!gym) {
      return res.status(404).json({ message: 'Gym not found' });
    }

   

    // Convert planSelected from ID to name if needed
    let planName = planSelected;
    if (planSelected && planSelected.length === 24) { // Looks like ObjectId
      if (gym.membershipPlans && gym.membershipPlans.length > 0) {
        const selectedPlan = gym.membershipPlans.find(plan => 
          plan._id && plan._id.toString() === planSelected
        );
        if (selectedPlan) {
          planName = selectedPlan.name;
        } else {
          // Fallback to default plan names
          planName = 'Standard';
        }
      } else {
        planName = 'Standard';
      }
    }

    // Ensure plan name is properly capitalized and valid
    const validPlanNames = ['Basic', 'Standard', 'Premium'];
    const formattedPlanName = planName.charAt(0).toUpperCase() + planName.slice(1).toLowerCase();
    const finalPlanName = validPlanNames.includes(formattedPlanName) ? formattedPlanName : 'Standard';


    // Create member record with correct field names for Member schema
    const memberData = {
      gym: gymId,
      memberName: memberName,
      age: parseInt(memberAge),
      gender: memberGender,
      phone: memberPhone,
      email: memberEmail,
      paymentMode: 'pending', // Default since payment is handled separately
      paymentAmount: 800, // Default amount, will be updated based on plan selection
      planSelected: finalPlanName,
      monthlyPlan: '1 Month', // Default, will be updated when user selects duration
      activityPreference,
      address: memberAddress || '',
      joinDate: new Date(),
      membershipId: `${(gym.gymName || gym.name || 'GYM').substring(0,3).toUpperCase()}${Date.now()}`,
      paymentStatus: registrationType === 'trial' ? 'paid' : 'pending'
    };


    const newMember = new Member(memberData);
    await newMember.save();


    // Increment QR code usage (only if QR code was used)
    if (qrCode) {
      qrCode.usageCount += 1;
      qrCode.lastUsedAt = new Date();
      await qrCode.save();
    } else {
    }

    // Determine next steps based on registration type
    let nextSteps = {};
    
    if (registrationType === 'trial') {
      nextSteps = {
        message: 'Trial membership activated!',
        action: 'visit_gym',
        redirectUrl: '/registration-complete?type=trial&name=' + encodeURIComponent(memberName)
      };
    } else {
      // For paid memberships, redirect to payment
      nextSteps = {
        message: 'Registration successful! Please complete payment.',
        action: 'payment_required',
        paymentOptions: {
          memberId: newMember._id,
          planName: planSelected,
          amount: 800, // Default amount
          duration: '1 Month'
        },
        redirectUrl: '/payment-gateway'
      };
    }

    res.json({
      success: true,
      message: 'Registration successful!',
      memberId: newMember._id,
      membershipId: memberData.membershipId,
      nextSteps
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      message: 'Registration failed. Please try again.',
      error: error.message 
    });
  }
});

// Debug route to see what data is being sent
app.post('/api/debug-qr-data', (req, res) => {
  console.log('=== DEBUG QR DATA ===');
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  console.log('Body type:', typeof req.body);
  console.log('Body keys:', Object.keys(req.body));
  res.json({ 
    message: 'Debug complete', 
    received: req.body,
    keys: Object.keys(req.body)
  });
});
// ===== END QR REGISTRATION ROUTES =====

// Simple test endpoint
app.get('/api/test-endpoint', (req, res) => {
  console.log('Test endpoint hit!');
  res.json({ message: 'Test endpoint working!', timestamp: new Date().toISOString() });
});

// ✅ API routes FIRST - these take priority
console.log('🎫 Starting API route mounting...');
app.use('/api/users', userRoutes);
app.use('/api/bookings', userBookingRoutes);
app.use('/api/user-payments', userPaymentRoutes);
app.use('/api/user-preferences', userPreferenceRoutes);
app.use('/api/trainers', trainerRoutes);

// Mount communication routes BEFORE general admin routes to prevent conflicts
app.use('/api/admin/communication', communicationRoutes);

app.use('/api/admin', adminRoutes);
app.use('/api/gyms', gymRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/trial-bookings', trialBookingRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/diet', dietRoutes);
app.use('/api/members', (req, res, next) => {
  next();
}, memberRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin/notifications', adminNotificationRoutes);
app.use('/api/gym/notifications', gymNotificationRoutes);
app.use('/api/gym/communication', gymCommunicationRoutes); // Enhanced Gym-Admin Communication System

app.use('/api/support', supportRoutes); // Legacy Admin Support System (still needed for admin panel)

app.use('/api/whatsapp', whatsappRoutes); // WhatsApp Business API Integration
app.use('/api/attendance', (req, res, next) => {
  next();
}, attendanceRoutes);
app.use('/api/payments', (req, res, next) => {
  next();
}, paymentRoutes);
app.use('/api/cash-validation', (req, res, next) => {
  next();
}, cashValidationRoutes);
app.use('/api/gym', (req, res, next) => {
  next();
}, equipmentRoutes);

// Mount equipment routes under /api/equipment as well for direct access
app.use('/api/equipment', (req, res, next) => {
  next();
}, equipmentRoutes);

// QR Code routes
app.use('/api/qr-codes', (req, res, next) => {
  next();
}, qrCodeRoutes);

// Biometric attendance routes
app.use('/api/biometric', (req, res, next) => {
  next();
}, biometricRoutes);

// Security routes for admin settings
app.use('/api/security', (req, res, next) => {
  next();
}, securityRoutes);

// Offers and Coupons Management routes
app.use('/api/admin', (req, res, next) => {
  next();
}, offersRoutes);



// Simple test route directly in server.js
app.get('/api/simple-test', (req, res) => {
  res.json({ success: true, message: 'Simple test route working!', timestamp: new Date().toISOString() });
});

// ✅ Static file serving AFTER API routes
app.use(express.static(path.join(__dirname, 'frontend')));
app.use('/public', express.static(path.join(__dirname, 'frontend/public')));
app.use('/gymadmin', express.static(path.join(__dirname, 'frontend/gymadmin')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve register.html for /register route (for QR code registration)
app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'register.html'));
});

// Debug route to see what data is being sent
app.post('/api/debug-qr-data', (req, res) => {
  res.json({ 
    message: 'Debug complete', 
    received: req.body,
    keys: Object.keys(req.body)
  });
});

// Direct registration endpoint (no QR validation required)
app.post('/api/register-direct', async (req, res) => {
  try {
   
    const Member = require('./backend/models/Member');
    const Gym = require('./backend/models/gym');
    
    const {
      memberName,
      memberEmail,
      memberPhone, 
      memberAge,
      memberGender,
      memberAddress,
      gymId,
      activityPreference,
      planSelected,
      registrationType = 'standard'
    } = req.body;

  

    // Validate required fields
    if (!memberName || !memberEmail || !memberPhone || !memberAge || !memberGender || !activityPreference || !planSelected) {
      return res.status(400).json({ 
        message: 'Missing required fields',
        required: ['memberName', 'memberEmail', 'memberPhone', 'memberAge', 'memberGender', 'activityPreference', 'planSelected'],
        received: Object.keys(req.body)
      });
    }

    // Get gym details (optional - can work without gymId)
    let gym = null;
    if (gymId) {
      gym = await Gym.findById(gymId);
      if (!gym) {
        return res.status(404).json({ message: 'Gym not found' });
      }
    }


    // Use plan name directly
    const planName = planSelected || 'Standard';

    // Create member record
    const memberData = {
      gym: gymId || null,
      memberName: memberName,
      age: parseInt(memberAge),
      gender: memberGender,
      phone: memberPhone,
      email: memberEmail,
      paymentMode: 'pending',
      paymentAmount: 800,
      planSelected: planName,
      monthlyPlan: '1 Month',
      activityPreference,
      address: memberAddress || '',
      joinDate: new Date(),
      membershipId: `${gym ? (gym.gymName || gym.name || 'GYM').substring(0,3).toUpperCase() : 'DIR'}${Date.now()}`,
      paymentStatus: registrationType === 'trial' ? 'paid' : 'pending'
    };


    const newMember = new Member(memberData);
    await newMember.save();


    // Determine next steps
    let nextSteps = {
      message: 'Registration successful! Please complete payment.',
      action: 'payment_required',
      paymentOptions: {
        memberId: newMember._id,
        planName: planName,
        amount: 800,
        duration: '1 Month'
      },
      redirectUrl: '/payment-gateway'
    };

    res.json({
      success: true,
      message: 'Direct registration successful!',
      memberId: newMember._id,
      membershipId: memberData.membershipId,
      nextSteps
    });

  } catch (error) {
    console.error('Direct registration error:', error);
    res.status(500).json({ 
      message: 'Direct registration failed. Please try again.',
      error: error.message 
    });
  }
});

// Payment integration routes for QR registrations
const { createPaymentSession, verifyPayment, getPaymentStatus, handlePaymentWebhook } = require('./backend/controllers/paymentController');
app.post('/api/payment/create-session', createPaymentSession);
app.post('/api/payment/verify', verifyPayment);
app.get('/api/payment/status/:paymentId', getPaymentStatus);
app.post('/api/payment/webhook', handlePaymentWebhook);

// Serve payment gateway page
app.get('/payment-gateway', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'payment-gateway.html'));
});

// Serve payment success page
app.get('/payment/success', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'payment-success.html'));
});

// Serve payment cancel page
app.get('/payment/cancel', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'payment-cancel.html'));
});

// ✅ Connect MongoDB and Start Server
const startServer = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
    });
    console.log("✅ MongoDB Connected");

    // Initialize notification scheduler
    const notificationScheduler = new NotificationScheduler();

    // Initialize subscription service cron jobs
    SubscriptionService.initializeCronJobs();

    // Initialize QR code cleanup scheduler
    const QRCodeModel = require('./backend/models/QRCode');
    QRCodeModel.scheduleCleanup();

    const PORT = process.env.PORT || 5000;
    const HOST = process.env.HOST || '0.0.0.0'; // Listen on all interfaces
    
    app.listen(PORT, HOST, () => {
      console.log(`🚀 Server running on http://${HOST}:${PORT}`);
      console.log(`🌐 Server accessible on local network at http://[YOUR_IP]:${PORT}`);
      console.log(`📊 Subscription management system initialized`);
    });

  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err);
    process.exit(1);
  }
};

startServer();
