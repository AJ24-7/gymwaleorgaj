console.log('<<<<< SERVER.JS IS LOADING - VERSION 1.2.0>>>>>'); // Replace XYZ with a new number each time
const dotenv = require('dotenv');
const express = require("express");
const connectDB = require('./backend/config/db');
const mongoose = require("mongoose");
const cors = require("cors");
const path = require('path');

dotenv.config();

connectDB();


const userRoutes = require('./backend/routes/userRoutes');
const trainerRoutes = require('./backend/routes/trainerRoutes');
const adminRoutes = require('./backend/routes/adminRoutes');
const gymRoutes = require('./backend/routes/gymRoutes');
const trialBookingRoutes = require('./backend/routes/trialBookingRoutes');
const reviewRoutes = require('./backend/routes/reviewRoutes');
const dietRoutes = require('./backend/routes/dietRoutes');
const memberRoutes = require('./backend/routes/memberRoutes');
const notificationRoutes = require('./backend/routes/notificationRoutes');
const adminNotificationRoutes = require('./backend/routes/adminNotificationRoutes');
const gymNotificationRoutes = require('./backend/routes/gymNotificationRoutes');
const supportRoutes = require('./backend/routes/supportRoutes');
const attendanceRoutes = require('./backend/routes/attendanceRoutes');
const paymentRoutes = require('./backend/routes/paymentRoutes');
const equipmentRoutes = require('./backend/routes/equipmentRoutes');
const qrCodeRoutes = require('./backend/routes/qrCodeRoutes');
const NotificationScheduler = require('./backend/services/notificationScheduler');  

console.log("[DEBUG] server.js: trainerRoutes type is:", typeof trainerRoutes);
console.log("[DEBUG] server.js: notificationRoutes type is:", typeof notificationRoutes);

const app = express();

// <<<< TEMPORARY TEST ROUTE >>>>
app.get('/test-route', (req, res) => {
  console.log('[DEBUG] /test-route was hit!');
  res.status(200).send('Test route is working!');
});
// <<<< END TEMPORARY TEST ROUTE >>>>
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads/gymImages', express.static(path.join(__dirname, 'uploads/gymImages')));
app.use('/uploads/gymPhotos', express.static(path.join(__dirname, 'uploads/gymPhotos')));
app.use('/uploads/gym-logos', express.static(path.join(__dirname, 'uploads/gym-logos')));
app.use('/uploads/equipment', express.static(path.join(__dirname, 'uploads/equipment')));


const allowedOrigins = [
  'http://localhost:5500',
  'http://127.0.0.1:5500',
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
app.use(express.static(path.join(__dirname, 'frontend')));
app.use('/public', express.static(path.join(__dirname, 'frontend/public')));
app.use('/gymadmin', express.static(path.join(__dirname, 'frontend/gymadmin')));
// ✅ Your API routes
app.use('/api/users', userRoutes);
app.use('/api/trainers', trainerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/gyms', gymRoutes);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/trial-bookings', trialBookingRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/diet', dietRoutes);
app.use('/api/members', (req, res, next) => {
  next();
}, memberRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin/notifications', adminNotificationRoutes);
app.use('/api/gym/notifications', gymNotificationRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/attendance', (req, res, next) => {
  next();
}, attendanceRoutes);
app.use('/api/payments', (req, res, next) => {
  console.log(`💳 Payment route accessed: ${req.method} ${req.url}`);
  next();
}, paymentRoutes);
app.use('/api/gym', (req, res, next) => {
  console.log(`🏋️ Equipment route accessed: ${req.method} ${req.url}`);
  next();
}, equipmentRoutes);

// Mount equipment routes under /api/equipment as well for direct access
app.use('/api/equipment', (req, res, next) => {
  console.log(`🏋️ Direct Equipment route accessed: ${req.method} ${req.url}`);
  next();
}, equipmentRoutes);

// QR Code routes

app.use('/api/qr-codes', (req, res, next) => {
  console.log(`📱 QR Code route accessed: ${req.method} ${req.url}`);
  next();
}, qrCodeRoutes);

// Serve register.html for /register route (for QR code registration)
app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'register.html'));
});

// QR-based member registration route
const { registerMemberViaQR } = require('./backend/controllers/qrRegistrationController');
app.post('/api/register-via-qr', registerMemberViaQR);

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

    // Initialize QR code cleanup scheduler
    const QRCodeModel = require('./backend/models/QRCode');
    QRCodeModel.scheduleCleanup();

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });

  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err);
    process.exit(1);
  }
};

startServer();
