const User = require('../models/User');
const Gym = require('../models/gym');
const Trainer = require('../models/trainerModel');
const Membership = require('../models/Membership');
const Notification = require('../models/Notification');
const TrialBooking = require('../models/TrialBooking');
const sendEmail = require('../utils/sendEmail');


exports.getDashboardData = async (req, res) => {
  try {
    const now = new Date();
    const firstDayOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstDayOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDayOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Total Users
    const totalUsers = await User.countDocuments();
    const lastMonthUsers = await User.countDocuments({
      createdAt: { $gte: firstDayOfLastMonth, $lte: lastDayOfLastMonth }
    });
    const thisMonthUsers = await User.countDocuments({
      createdAt: { $gte: firstDayOfThisMonth }
    });

    // Active Members
    const activeMembers = await Membership.countDocuments({ active: true });
    const lastMonthMembers = await Membership.countDocuments({
      createdAt: { $gte: firstDayOfLastMonth, $lte: lastDayOfLastMonth }, active: true
    });
    const thisMonthMembers = await Membership.countDocuments({
      createdAt: { $gte: firstDayOfThisMonth }, active: true
    });

    // Pending Approvals
    const pendingGyms = await Gym.countDocuments({ status: 'pending' });
    const pendingTrainers = await Trainer.countDocuments({ status: 'pending' });

    // Revenue
    const totalRevenue = await Gym.aggregate([{ $group: { _id: null, total: { $sum: '$revenue' } } }]);
    const thisMonthRevenue = await Gym.aggregate([
      { $match: { createdAt: { $gte: firstDayOfThisMonth } } },
      { $group: { _id: null, total: { $sum: '$revenue' } } }
    ]);
    const lastMonthRevenue = await Gym.aggregate([
      { $match: { createdAt: { $gte: firstDayOfLastMonth, $lte: lastDayOfLastMonth } } },
      { $group: { _id: null, total: { $sum: '$revenue' } } }
    ]);

    const percent = (curr, prev) =>
      prev === 0 ? 100 : Math.round(((curr - prev) / prev) * 100);

    // Trial Bookings
    const totalTrialBookings = await TrialBooking.countDocuments();
    const pendingTrialApprovals = await TrialBooking.countDocuments({ status: 'pending' });

    res.json({
      totalUsers,
      activeMembers,
      pendingGyms,
      pendingTrainers,
      totalRevenue: totalRevenue[0]?.total || 0,
      totalTrialBookings,
      pendingTrialApprovals,
      changes: {
        users: percent(thisMonthUsers, lastMonthUsers),
        members: percent(thisMonthMembers, lastMonthMembers),
        revenue: percent(thisMonthRevenue[0]?.total || 0, lastMonthRevenue[0]?.total || 0),
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Approve a gym
exports.approveGym = async (req, res) => {
  try {
    const gym = await Gym.findById(req.params.id);

    if (!gym) return res.status(404).json({ error: 'Gym not found' });

    // Set the gym as approved - the gym will use its own ID for authentication
    gym.status = 'approved';
    gym.approvedAt = new Date();
    await gym.save();

    try {
      await sendEmail(
        gym.email,
        '🎉 Your Gym Registration is Approved!',
        `<h3>Hello ${gym.contactPerson || gym.gymName || 'Gym Owner'},</h3>
        <p>Your gym "${gym.gymName}" has been approved by FIT-verse Admin. You can now <a href="http://localhost:5000/frontend/public/login.html">log in</a> and manage your profile.</p>
        <p><strong>Login Details:</strong><br/>
        Email: ${gym.email}<br/>
        Use your registration password to log in.</p>
        <p>Thank you for choosing FIT-verse!</p>`
      );
      console.log(`✅ Approval email sent to ${gym.email}`);
    } catch (emailErr) {
      console.error(`❌ Failed to send approval email to ${gym.email}:`, emailErr.message);
    }

    res.json({ message: 'Gym approved successfully', gym });
  } catch (error) {
    console.error('Error approving gym:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Reject a gym
exports.rejectGym = async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason || typeof reason !== 'string' || !reason.trim()) {
      return res.status(400).json({ error: 'Rejection reason is required.' });
    }
    const gym = await Gym.findByIdAndUpdate(
      req.params.id,
      {
        status: 'rejected',
        rejectionReason: reason,
        rejectedAt: new Date()
      },
      { new: true }
    );
    if (!gym) return res.status(404).json({ error: 'Gym not found' });
    try {
      await sendEmail(
        gym.email,
        '❌ Your Gym Registration is Rejected',
        `<h3>Hello ${gym.ownerName || gym.name || 'Gym Owner'},</h3>
        <p>Unfortunately, your gym "<strong>${gym.name}</strong>" has been rejected.</p>
        <p><strong>Reason:</strong> ${reason}</p>
        <p>Please review your submission and try again if appropriate.</p>
        <p>- Team FIT-verse</p>`
      );
      console.log(`✅ Rejection email sent to ${gym.email}`);
    } catch (emailErr) {
      console.error(`❌ Failed to send rejection email to ${gym.email}:`, emailErr.message);
    }
    res.json({ message: 'Gym rejected successfully and email attempt made.', gym });
  } catch (error) {
    console.error('Error rejecting gym:', error);
    res.status(500).json({ error: 'Server error' });
  }
};


// Revoke approval
exports.revokeGym = async (req, res) => {
  try {
    const gym = await Gym.findByIdAndUpdate(req.params.id, { status: 'pending' }, { new: true });
    if (!gym) return res.status(404).json({ error: 'Gym not found' });
    res.json({ message: 'Gym approval revoked', gym });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Reconsider rejection
exports.reconsiderGym = async (req, res) => {
  try {
    const gym = await Gym.findByIdAndUpdate(req.params.id, { status: 'pending', $unset: { rejectionReason: 1 } }, { new: true });
    if (!gym) return res.status(404).json({ error: 'Gym not found' });
    res.json({ message: 'Gym sent back to pending', gym });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};
// delete a gym
exports.deleteGym = async (req, res) => {
  try {
      const gymId = req.params.id;
      const deletedGym = await Gym.findByIdAndDelete(gymId);

      if (!deletedGym) {
          return res.status(404).json({ message: 'Gym not found' });
      }

      res.status(200).json({ message: 'Gym deleted successfully' });
  } catch (error) {
      console.error('Delete gym error:', error);
      res.status(500).json({ message: 'Internal server error' });
  }
};
// Get all notifications for the admin
exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.getAllNotifications(req.admin._id);
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching notifications' });
  }
};

// Mark a notification as read
exports.markNotificationRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    if (notification.user.toString() !== req.admin._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    await notification.markAsRead();
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Error marking notification as read' });
  }
};

// Admin-specific: Get gym details by ID (regardless of status)
exports.getGymById = async (req, res) => {
  try {
    const gym = await Gym.findById(req.params.id).select('-password');
    if (!gym) {
      return res.status(404).json({ message: 'Gym not found' });
    }
    console.log('[DEBUG] Admin getGymById - returning gym:', gym.gymName);
    console.log('[DEBUG] Admin getGymById - gymPhotos:', gym.gymPhotos);
    res.status(200).json(gym);
  } catch (error) {
    console.error("Error fetching gym by ID for admin:", error);
    res.status(500).json({ message: 'Server error while fetching gym details' });
  }
};

// Admin-specific: Get all gyms (regardless of status)
exports.getAllGyms = async (req, res) => {
  try {
    const gyms = await Gym.find({}).select('-password');
    console.log('[DEBUG] Admin getAllGyms - returning', gyms.length, 'gyms');
    res.status(200).json(gyms);
  } catch (error) {
    console.error("Error fetching all gyms for admin:", error);
    res.status(500).json({ message: 'Server error while fetching gyms' });
  }
};

// Admin-specific: Get gyms by status
exports.getGymsByStatus = async (req, res) => {
  try {
    const { status } = req.params;
    const gyms = await Gym.find({ status }).select('-password');
    console.log('[DEBUG] Admin getGymsByStatus - returning', gyms.length, 'gyms with status:', status);
    res.status(200).json(gyms);
  } catch (error) {
    console.error("Error fetching gyms by status for admin:", error);
    res.status(500).json({ message: 'Server error while fetching gyms' });
  }
};