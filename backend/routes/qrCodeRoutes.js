const express = require('express');
const router = express.Router();
const {
  createQRCode,
  getQRCodes,
  getQRCodeByToken,
  validateQRCode,
  updateQRCode,
  deactivateQRCode,
  getQRCodeStats
} = require('../controllers/qrCodeController');
const gymadminAuth = require('../middleware/gymadminAuth');

// Create a new QR code (protected route for gym admins)
router.post('/', gymadminAuth, createQRCode);

// Get QR codes for a gym (protected route)
router.get('/', gymadminAuth, getQRCodes);

// Get QR code statistics (protected route)
router.get('/stats', gymadminAuth, getQRCodeStats);

// Validate QR code for registration (public route)
router.get('/validate/:token', validateQRCode);

// Get QR code by token (protected route)
router.get('/:token', gymadminAuth, getQRCodeByToken);

// Update QR code (protected route)
router.put('/:token', gymadminAuth, updateQRCode);

// Deactivate QR code (protected route)
router.patch('/:token/deactivate', gymadminAuth, deactivateQRCode);

module.exports = router;
