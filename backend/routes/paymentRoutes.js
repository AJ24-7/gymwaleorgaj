const express = require('express');
const router = express.Router();
const {
  getPaymentStats,
  getPaymentChartData,
  getRecentPayments,
  getRecurringPayments,
  addPayment,
  updatePayment,
  markPaymentAsPaid,
  deletePayment
} = require('../controllers/paymentController');

const gymAdminAuth = require('../middleware/gymadminAuth');

// Get payment statistics

// Payment routes
router.get('/stats', gymAdminAuth, getPaymentStats);
router.get('/chart-data', gymAdminAuth, getPaymentChartData);
router.get('/recent', gymAdminAuth, getRecentPayments);
router.get('/recurring', gymAdminAuth, getRecurringPayments);
router.post('/', gymAdminAuth, addPayment);
router.put('/:id', gymAdminAuth, updatePayment);
router.patch('/:id/mark-paid', gymAdminAuth, markPaymentAsPaid);
router.delete('/:id', gymAdminAuth, deletePayment);

module.exports = router;
