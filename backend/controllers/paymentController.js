const Payment = require('../models/Payment');
const Member = require('../models/Member');
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

    // Get current stats - for received and paid, use period filter
    // For due and pending, get current outstanding amounts regardless of period
    const [periodStats, currentDuePending] = await Promise.all([
      // Period-based stats for completed payments (received/paid)
      Payment.aggregate([
        {
          $match: {
            $or: [
              { gymId: new mongoose.Types.ObjectId(gymId) },
              { gymId: gymId }
            ],
            type: { $in: ['received', 'paid'] },
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
      ]),
      // Current outstanding due/pending amounts (regardless of creation date)
      Payment.aggregate([
        {
          $match: {
            $or: [
              { gymId: new mongoose.Types.ObjectId(gymId) },
              { gymId: gymId }
            ],
            type: { $in: ['due', 'pending'] },
            status: 'pending' // Only count pending/due payments that haven't been completed
          }
        },
        {
          $group: {
            _id: '$type',
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    const received = periodStats.find(s => s._id === 'received')?.total || 0;
    const paid = periodStats.find(s => s._id === 'paid')?.total || 0;
    const due = currentDuePending.find(s => s._id === 'due')?.total || 0;
    const pending = currentDuePending.find(s => s._id === 'pending')?.total || 0;
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

    // Get previous period stats using the same logic
    const [prevPeriodStats, prevCurrentDuePending] = await Promise.all([
      // Previous period-based stats for completed payments (received/paid)
      Payment.aggregate([
        {
          $match: {
            $or: [
              { gymId: new mongoose.Types.ObjectId(gymId) },
              { gymId: gymId }
            ],
            type: { $in: ['received', 'paid'] },
            createdAt: { $gte: prevStartDate, $lte: prevEndDate }
          }
        },
        {
          $group: {
            _id: '$type',
            total: { $sum: '$amount' }
          }
        }
      ]),
      // Previous outstanding due/pending amounts (for growth comparison)
      Payment.aggregate([
        {
          $match: {
            $or: [
              { gymId: new mongoose.Types.ObjectId(gymId) },
              { gymId: gymId }
            ],
            type: { $in: ['due', 'pending'] },
            status: 'pending',
            createdAt: { $lte: prevEndDate }
          }
        },
        {
          $group: {
            _id: '$type',
            total: { $sum: '$amount' }
          }
        }
      ])
    ]);

    const prevReceived = prevPeriodStats.find(s => s._id === 'received')?.total || 0;
    const prevPaid = prevPeriodStats.find(s => s._id === 'paid')?.total || 0;
    const prevDue = prevCurrentDuePending.find(s => s._id === 'due')?.total || 0;
    const prevPending = prevCurrentDuePending.find(s => s._id === 'pending')?.total || 0;
    const prevProfit = prevReceived - prevPaid;

    const receivedGrowth = prevReceived > 0 ? ((received - prevReceived) / prevReceived) * 100 : 0;
    const paidGrowth = prevPaid > 0 ? ((paid - prevPaid) / prevPaid) * 100 : 0;
    const dueGrowth = prevDue > 0 ? ((due - prevDue) / prevDue) * 100 : 0;
    const pendingGrowth = prevPending > 0 ? ((pending - prevPending) / prevPending) * 100 : 0;
    const profitGrowth = prevProfit > 0 ? ((profit - prevProfit) / prevProfit) * 100 : 0;

    res.json({
      success: true,
      data: {
        received,
        paid,
        due,
        pending,
        profit,
        receivedGrowth,
        paidGrowth,
        dueGrowth,
        pendingGrowth,
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

    let matchCondition = { 
      $or: [
        { gymId: new mongoose.Types.ObjectId(gymId) },
        { gymId: gymId }
      ]
    };
    
    // Only include payments that are actually recurring OR have future due dates
    // For recurring payments, only show them if they're due within 7 days
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    
    matchCondition.$and = [
      {
        $or: [
          { 
            // Recurring payments due within 7 days
            $and: [
              { isRecurring: true },
              { dueDate: { $lte: sevenDaysFromNow } }
            ]
          },
          { 
            // Non-recurring payments with due dates (excluding 'received' type)
            $and: [
              { isRecurring: { $ne: true } },
              { dueDate: { $exists: true, $ne: null } },
              { type: { $in: ['due', 'pending', 'paid'] } } // Exclude 'received' type payments
            ]
          }
        ]
      }
    ];
    
    if (status === 'pending') {
      matchCondition.status = 'pending';
    } else if (status === 'overdue') {
      matchCondition.dueDate = { $lt: new Date() };
      matchCondition.status = 'pending';
    } else if (status === 'completed') {
      matchCondition.status = 'completed';
    }

    const payments = await Payment.find(matchCondition)
      .populate('memberId', 'name email phone')
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

    // Set status based on payment type
    let status;
    if (type === 'received') {
      status = 'completed'; // Received payments are already completed
    } else if (type === 'paid') {
      status = 'completed'; // Paid payments are completed
    } else if (type === 'due' || type === 'pending') {
      status = 'pending'; // Due and pending payments are not yet completed
    } else {
      status = 'pending'; // Default to pending for safety
    }

    const payment = new Payment({
      gymId,
      type,
      category,
      amount,
      description,
      memberName,
      memberId: memberId && memberId.trim() !== '' ? memberId : undefined, // Only set if not empty
      paymentMethod,
      status, // Set the calculated status
      isRecurring,
      recurringDetails,
      dueDate,
      notes,
      createdBy: req.admin.id
    });

    await payment.save();

    // Update member payment status if this is a membership payment
    if (category === 'membership' && memberId) {
      try {
        const updateData = {};
        
        if (type === 'received') {
          updateData.paymentStatus = 'paid';
          updateData.lastPaymentDate = new Date();
          updateData.pendingPaymentAmount = 0;
        } else if (type === 'pending' || type === 'due') {
          updateData.paymentStatus = 'pending';
          updateData.pendingPaymentAmount = amount;
          if (dueDate) {
            updateData.nextPaymentDue = new Date(dueDate);
          }
        }
        
        if (Object.keys(updateData).length > 0) {
          const updatedMember = await Member.findOneAndUpdate(
            { _id: memberId, gym: gymId },
            updateData,
            { new: true }
          );
          
          // Add notification info to response if member payment is pending
          if (updatedMember && (type === 'pending' || type === 'due')) {
            payment.memberNotification = {
              memberName: updatedMember.memberName,
              memberId: updatedMember._id,
              pendingAmount: amount,
              dueDate: dueDate
            };
          }
        }
      } catch (memberUpdateError) {
        console.error('Error updating member payment status:', memberUpdateError);
        // Don't fail the payment creation if member update fails
      }
    }

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
    const gymId = req.admin.id;

    // Find the payment first to check its current type
    const currentPayment = await Payment.findOne({ _id: id, gymId });
    
    if (!currentPayment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    // Determine the new type based on current type
    let newType = currentPayment.type;
    if (currentPayment.type === 'pending') {
      newType = 'received'; // Convert pending to received (money coming IN from members)
    } else if (currentPayment.type === 'due') {
      newType = 'paid'; // Convert due to paid (money going OUT from gym)
    }

    const payment = await Payment.findOneAndUpdate(
      { _id: id, gymId },
      { 
        status: 'completed',
        type: newType, // Update type: pending→received, due→paid for proper stat tracking
        paidDate: new Date()
      },
      { new: true }
    );

    // If it's a recurring payment, create next payment
    if (payment.isRecurring && payment.recurringDetails.nextDueDate) {
      const nextPayment = new Payment({
        gymId,
        type: currentPayment.type, // Keep original type for next payment (pending/due)
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
        createdBy: req.admin.id
      });

      await nextPayment.save();
    }

    res.json({
      success: true,
      message: 'Payment marked as paid and moved to received payments',
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
    const gymId = req.admin.id;

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

// Get payment reminders (due within 7 days or overdue)
const getPaymentReminders = async (req, res) => {
  try {
    const gymId = req.admin.id;
    const now = new Date();
    const oneWeekFromNow = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));

    const reminders = await Payment.find({
      $or: [
        { gymId: new mongoose.Types.ObjectId(gymId) },
        { gymId: gymId }
      ],
      type: 'paid',
      status: 'pending',
      dueDate: {
        $lte: oneWeekFromNow // Due within the next 7 days or already overdue
      }
    })
    .sort({ dueDate: 1 })
    .select('description amount dueDate category status notes');

    res.status(200).json({
      success: true,
      message: 'Payment reminders retrieved successfully',
      data: reminders,
      count: reminders.length
    });
  } catch (error) {
    console.error('Error fetching payment reminders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment reminders',
      error: error.message
    });
  }
};

module.exports = {
  getPaymentStats,
  getPaymentChartData,
  getRecentPayments,
  getRecurringPayments,
  getPaymentReminders,
  addPayment,
  updatePayment,
  markPaymentAsPaid,
  deletePayment
};
