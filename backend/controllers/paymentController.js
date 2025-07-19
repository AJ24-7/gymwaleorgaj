const Payment = require('../models/Payment');
const mongoose = require('mongoose');

// Get payment statistics
const getPaymentStats = async (req, res) => {
  try {
    const gymId = req.admin.id;
    const { period = 'month' } = req.query;
    
    let startDate, endDate;
    const now = new Date();
    
    if (period === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (period === 'year') {
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date(now.getFullYear(), 11, 31);
    } else {
      startDate = new Date(now.setDate(now.getDate() - 30));
      endDate = new Date();
    }

    const stats = await Payment.aggregate([
      {
        $match: {
          $or: [
            { gymId: new mongoose.Types.ObjectId(gymId) },
            { gymId: gymId }
          ],
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    const received = stats.find(s => s._id === 'received')?.total || 0;
    const paid = stats.find(s => s._id === 'paid')?.total || 0;
    const profit = received - paid;

    // Get previous period for growth calculation
    let prevStartDate, prevEndDate;
    if (period === 'month') {
      prevStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      prevEndDate = new Date(now.getFullYear(), now.getMonth(), 0);
    } else {
      prevStartDate = new Date(startDate);
      prevStartDate.setDate(prevStartDate.getDate() - 30);
      prevEndDate = new Date(startDate);
    }

    const prevStats = await Payment.aggregate([
      {
        $match: {
          $or: [
            { gymId: new mongoose.Types.ObjectId(gymId) },
            { gymId: gymId }
          ],
          createdAt: { $gte: prevStartDate, $lte: prevEndDate }
        }
      },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' }
        }
      }
    ]);

    const prevReceived = prevStats.find(s => s._id === 'received')?.total || 0;
    const prevPaid = prevStats.find(s => s._id === 'paid')?.total || 0;
    const prevProfit = prevReceived - prevPaid;

    const receivedGrowth = prevReceived > 0 ? ((received - prevReceived) / prevReceived) * 100 : 0;
    const paidGrowth = prevPaid > 0 ? ((paid - prevPaid) / prevPaid) * 100 : 0;
    const profitGrowth = prevProfit > 0 ? ((profit - prevProfit) / prevProfit) * 100 : 0;

    res.json({
      success: true,
      data: {
        received,
        paid,
        profit,
        receivedGrowth,
        paidGrowth,
        profitGrowth
      }
    });
  } catch (error) {
    console.error('Error fetching payment stats:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get payment chart data
const getPaymentChartData = async (req, res) => {
  try {
    const gymId = req.admin.id;
    const { month, year } = req.query;
    
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, parseInt(month) + 1, 0);
    
    const chartData = await Payment.aggregate([
      {
        $match: {
          $or: [
            { gymId: new mongoose.Types.ObjectId(gymId) },
            { gymId: gymId }
          ],
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            day: { $dayOfMonth: '$createdAt' },
            type: '$type'
          },
          total: { $sum: '$amount' }
        }
      },
      {
        $group: {
          _id: '$_id.day',
          received: {
            $sum: {
              $cond: [{ $eq: ['$_id.type', 'received'] }, '$total', 0]
            }
          },
          paid: {
            $sum: {
              $cond: [{ $eq: ['$_id.type', 'paid'] }, '$total', 0]
            }
          }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    const daysInMonth = new Date(year, parseInt(month) + 1, 0).getDate();
    const labels = [];
    const receivedData = [];
    const paidData = [];
    const profitData = [];

    for (let i = 1; i <= daysInMonth; i++) {
      labels.push(i);
      const dayData = chartData.find(d => d._id === i);
      const received = dayData?.received || 0;
      const paid = dayData?.paid || 0;
      receivedData.push(received);
      paidData.push(paid);
      profitData.push(received - paid);
    }

    res.json({
      success: true,
      data: {
        labels,
        datasets: [
          {
            label: 'Amount Received',
            data: receivedData,
            backgroundColor: 'rgba(34, 197, 94, 0.2)',
            borderColor: 'rgba(34, 197, 94, 1)',
            borderWidth: 2,
            fill: true
          },
          {
            label: 'Amount Paid',
            data: paidData,
            backgroundColor: 'rgba(239, 68, 68, 0.2)',
            borderColor: 'rgba(239, 68, 68, 1)',
            borderWidth: 2,
            fill: true
          },
          {
            label: 'Profit/Loss',
            data: profitData,
            backgroundColor: 'rgba(59, 130, 246, 0.2)',
            borderColor: 'rgba(59, 130, 246, 1)',
            borderWidth: 2,
            fill: true
          }
        ]
      }
    });
  } catch (error) {
    console.error('Error fetching chart data:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get recent payments
const getRecentPayments = async (req, res) => {
  try {
    const gymId = req.admin.id;
    const { limit = 10 } = req.query;

    const payments = await Payment.find({ gymId })
      .populate('memberId', 'name email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: payments
    });
  } catch (error) {
    console.error('Error fetching recent payments:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get recurring payments
const getRecurringPayments = async (req, res) => {
  try {
    const gymId = req.admin.id;
    const { status = 'all' } = req.query;

    let matchCondition = { $or: [
      { gymId: new mongoose.Types.ObjectId(gymId) },
      { gymId: gymId }
    ], type: 'paid' };
    
    if (status === 'pending') {
      matchCondition.status = 'pending';
    } else if (status === 'overdue') {
      matchCondition.dueDate = { $lt: new Date() };
      matchCondition.status = 'pending';
    }

    const payments = await Payment.find(matchCondition)
      .sort({ dueDate: 1 })
      .limit(50);

    res.json({
      success: true,
      data: payments
    });
  } catch (error) {
    console.error('Error fetching recurring payments:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Add payment
const addPayment = async (req, res) => {
  try {
    const gymId = req.admin.id;
    const {
      type,
      category,
      amount,
      description,
      memberName,
      memberId,
      paymentMethod,
      isRecurring,
      recurringDetails,
      dueDate,
      notes
    } = req.body;

    const payment = new Payment({
      gymId,
      type,
      category,
      amount,
      description,
      memberName,
      memberId,
      paymentMethod,
      isRecurring,
      recurringDetails,
      dueDate,
      notes,
      createdBy: req.user._id
    });

    await payment.save();

    res.json({
      success: true,
      message: 'Payment added successfully',
      data: payment
    });
  } catch (error) {
    console.error('Error adding payment:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Update payment
const updatePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const gymId = req.admin.id;
    const updates = req.body;

    const payment = await Payment.findOneAndUpdate(
      { _id: id, gymId },
      updates,
      { new: true, runValidators: true }
    );

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    res.json({
      success: true,
      message: 'Payment updated successfully',
      data: payment
    });
  } catch (error) {
    console.error('Error updating payment:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Mark payment as paid
const markPaymentAsPaid = async (req, res) => {
  try {
    const { id } = req.params;
    const gymId = req.gym._id;

    const payment = await Payment.findOneAndUpdate(
      { _id: id, gymId },
      { 
        status: 'completed',
        paidDate: new Date()
      },
      { new: true }
    );

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    // If it's a recurring payment, create next payment
    if (payment.isRecurring && payment.recurringDetails.nextDueDate) {
      const nextPayment = new Payment({
        gymId,
        type: payment.type,
        category: payment.category,
        amount: payment.amount,
        description: payment.description,
        paymentMethod: payment.paymentMethod,
        status: 'pending',
        dueDate: payment.recurringDetails.nextDueDate,
        isRecurring: true,
        recurringDetails: {
          frequency: payment.recurringDetails.frequency,
          nextDueDate: calculateNextDueDate(payment.recurringDetails.nextDueDate, payment.recurringDetails.frequency)
        },
        notes: payment.notes,
        createdBy: req.user._id
      });

      await nextPayment.save();
    }

    res.json({
      success: true,
      message: 'Payment marked as paid',
      data: payment
    });
  } catch (error) {
    console.error('Error marking payment as paid:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Delete payment
const deletePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const gymId = req.gym._id;

    const payment = await Payment.findOneAndDelete({ _id: id, gymId });

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    res.json({
      success: true,
      message: 'Payment deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting payment:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Helper function to calculate next due date
const calculateNextDueDate = (currentDate, frequency) => {
  const nextDate = new Date(currentDate);
  
  switch (frequency) {
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    case 'quarterly':
      nextDate.setMonth(nextDate.getMonth() + 3);
      break;
    case 'yearly':
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;
  }
  
  return nextDate;
};

module.exports = {
  getPaymentStats,
  getPaymentChartData,
  getRecentPayments,
  getRecurringPayments,
  addPayment,
  updatePayment,
  markPaymentAsPaid,
  deletePayment
};
