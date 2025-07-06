const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const { registerGym, loginGym, updateMyProfile, getMyProfile, getGymsByCities } = require('../controllers/gymController'); 
const gymadminAuth = require('../middleware/gymadminAuth');
const Gym = require('../models/gym');

// --- Membership Plans API ---
const membershipPlanController = require('../controllers/membershipPlanController');
// Get all membership plans for the logged-in gym admin
router.get('/membership-plans', gymadminAuth, membershipPlanController.getMembershipPlans);
// Update all membership plans for the logged-in gym admin
router.put('/membership-plans', gymadminAuth, membershipPlanController.updateMembershipPlans);
// 🔧 Multer Storage Setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/gymPhotos/');
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, unique + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// ✅ Register Gym [POST] /register
router.options('/register', (req, res) => {
  console.log('<<<< OPTIONS request to /register received >>>>');
  res.header('Access-Control-Allow-Origin', 'http://127.0.0.1:5500'); // Or your specific client origin
  res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, X-Requested-With, Origin, Accept'); // Add common headers
  res.sendStatus(204); // No Content - standard for successful OPTIONS
});

router.post('/register',  upload.fields([
  { name: 'gymImages', maxCount: 5 },
]), gymadminAuth, registerGym);

// ✅ Get All Gyms [GET] /
router.get('/', gymadminAuth, async (req, res) => {
  try {
    const gyms = await Gym.find();
    console.log("📦 All gyms fetched:", gyms);
    res.status(200).json(gyms);
  } catch (error) {
    console.error('❌ Failed to fetch gyms:', error);
    res.status(500).json({ message: 'Server error while fetching gyms' });
  }
});

// 🔒 Get My Profile [GET] /profile/me
// ⭐ Gym Admin Login [POST] /login
router.post('/login', require('../controllers/gymController').login);
router.post('/request-password-otp', require('../controllers/gymController').requestPasswordChangeOTP);
router.post('/verify-password-otp', require('../controllers/gymController').verifyPasswordChangeOTP);

// ⭐ Get and Update Logged-in Gym's Profile [GET, PUT] /profile/me
router.get('/profile/me', gymadminAuth, require('../controllers/gymController').getMyProfile);
router.put('/profile/me', gymadminAuth, upload.single('gymLogo'), require('../controllers/gymController').updateMyProfile);

// ⭐ Upload Gym Photo (with metadata)
router.post('/photos', gymadminAuth, upload.single('photo'), require('../controllers/gymController').uploadGymPhoto);
// ⭐ Get all uploaded Gym Photos
router.get('/photos', gymadminAuth, require('../controllers/gymController').getAllGymPhotos);
// ⭐ Edit a Gym Photo
router.patch('/photos/:photoId', gymadminAuth, upload.single('photo'), require('../controllers/gymController').updateGymPhoto);
// remove photo
router.delete('/photos/:photoId', gymadminAuth, require('../controllers/gymController').deleteGymPhoto);
// ✅ Get Gyms with Pending Status [GET] /status/pending
router.get('/status/pending', async (req, res) => {
  try {
    const pendingGyms = await Gym.find({ status: 'pending' }); // Adjust the query if needed
    res.status(200).json(pendingGyms); // Respond with pending gyms
  } catch (error) {
    console.error('❌ Error fetching pending gyms:', error);
    res.status(500).json({ message: 'Error fetching pending gyms' });
  }
});
// ✅ Get Gyms with Approved Status [GET] /status/approved
router.get('/status/approved', async (req, res) => {
  try {
    const approvedGyms = await Gym.find({ status: 'approved' }); // Query for gyms with status 'approved'
    res.status(200).json(approvedGyms); // Respond with approved gyms
  } catch (error) {
    console.error('❌ Error fetching approved gyms:', error);
    res.status(500).json({ message: 'Error fetching approved gyms' });
  }
});

// ✅ Get Gyms with Rejected Status [GET] /status/rejected
router.get('/status/rejected', async (req, res) => {
  try {
    const rejectedGyms = await Gym.find({ status: 'rejected' }); // Query for gyms with status 'rejected'
    res.status(200).json(rejectedGyms); // Respond with rejected gyms
  } catch (error) {
    console.error('❌ Error fetching rejected gyms:', error);
    res.status(500).json({ message: 'Error fetching rejected gyms' });
  }
});
// ✅ Get Gyms by selected cities [POST] /by-cities
router.post('/by-cities', getGymsByCities);

// ✅ Search Gyms [GET] /search
router.get('/search', async (req, res) => {
  try {
    const { city, pincode, maxPrice } = req.query;
    let activities = req.query.activities;

    // Debug log: received activities
    console.log('Received activities from query:', activities);

    // Robust normalization for activities (handles undefined, string, array)
    let activityArray = [];
    if (Array.isArray(activities)) {
      activityArray = activities;
    } else if (typeof activities === 'string' && activities.trim() !== '') {
      activityArray = [activities];
    }
    // Defensive: filter out empty strings
    activityArray = activityArray.filter(a => typeof a === 'string' && a.trim() !== '');
    console.log('Normalized activityArray:', activityArray);

    const filter = { status: 'approved' };

    // City filter (case-insensitive)
    if (city && typeof city === 'string' && city.trim() !== '') {
      filter['location.city'] = { $regex: new RegExp(city.trim(), 'i') };
    }

    // Pincode filter
    if (pincode) {
      filter['location.pincode'] = pincode;
    }

    // Activities filter: gyms must have ANY of the selected activities (case-insensitive)
    if (activityArray.length > 0) {
      const cleanedActivities = activityArray
        .filter(a => typeof a === 'string' && a.trim() !== '')
        .map(a => new RegExp(a.trim(), 'i'));

      if (cleanedActivities.length > 0) {
        filter.activities = { $in: cleanedActivities };
      }
    }

    // Price handling
    let useAggregation = false;
    let price = null;
    if (maxPrice) {
      price = Number(maxPrice);
      if (!isNaN(price)) {
        useAggregation = true;
      }
    }

    console.log('🔍 Final filter before price aggregation:\n', JSON.stringify(filter, null, 2));

    let gyms;
    if (useAggregation) {
      gyms = await Gym.aggregate([
        { $match: filter },
        {
          $addFields: {
            'membershipPlans.basic.priceNum': { $toDouble: '$membershipPlans.basic.price' },
            'membershipPlans.standard.priceNum': { $toDouble: '$membershipPlans.standard.price' },
            'membershipPlans.premium.priceNum': { $toDouble: '$membershipPlans.premium.price' },
          }
        },
        {
          $match: {
            $or: [
              { 'membershipPlans.basic.priceNum': { $lte: price } },
              { 'membershipPlans.standard.priceNum': { $lte: price } },
              { 'membershipPlans.premium.priceNum': { $lte: price } },
            ]
          }
        }
      ]);
    } else {
      gyms = await Gym.find(filter);
    }

    console.log(`✅ Found gyms: ${gyms.length}`);
    res.status(200).json(gyms);

  } catch (error) {
    console.error('❌ Error in /search:', error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Server error during gym search', error: error.message });
    }
  }
});

// ✅ Get Single Gym by ID [GET] /:id
router.get('/:id', async (req, res) => {
  try {
    // Only return gym if status is 'approved'
    const gym = await Gym.findOne({ _id: req.params.id, status: 'approved' });
    if (!gym) {
      return res.status(404).json({ message: 'Gym not found or not approved' });
    }
    res.status(200).json(gym);
  } catch (error) {
    console.error('❌ Failed to fetch gym with ID', req.params.id + ':', error);
    // Handle invalid ObjectId error
    if (error.name === 'CastError' && error.kind === 'ObjectId') {
      return res.status(400).json({ message: 'Invalid Gym ID format' });
    }
    res.status(500).json({ message: 'Error fetching gym', error: error.message });
  }
});


module.exports = router;
