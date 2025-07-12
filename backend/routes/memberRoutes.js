const express = require('express');
const router = express.Router();
const { addMember, getMembers, updateMember, removeMembersByIds, removeExpiredMembers } = require('../controllers/memberController');
const gymadminAuth = require('../middleware/gymadminAuth');
const memberImageUpload = require('../middleware/memberImageUpload');
// Remove members by custom IDs (bulk delete)
router.delete('/bulk', gymadminAuth, removeMembersByIds);

// Remove all expired members (membership expired > 7 days ago)
router.delete('/expired', gymadminAuth, removeExpiredMembers);
// Add a new member (protected route, with image upload)

// Add a new member (protected route, with image upload)
router.post('/', gymadminAuth, memberImageUpload.single('profileImage'), addMember);

// Send membership email (public endpoint for frontend fallback)
router.post('/send-membership-email', gymadminAuth, async (req, res) => {
  const { to, memberName, membershipId, plan, monthlyPlan, validUntil, gymName } = req.body;
  const sendEmail = require('../utils/sendEmail');
  try {
    const html = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; background: #f6f8fa; padding: 32px 0;">
        <div style="max-width: 480px; margin: 0 auto; background: #fff; border-radius: 16px; box-shadow: 0 4px 24px #0002; padding: 32px 28px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <img src='https://img.icons8.com/color/96/000000/gym.png' alt='Gym Logo' style='width:64px;height:64px;border-radius:12px;box-shadow:0 2px 8px #0001;'>
            <h2 style="color: #1976d2; margin: 18px 0 0 0; font-size: 2rem; letter-spacing: 1px;">Welcome to <span style='background: linear-gradient(90deg,#1976d2,#43e97b 99%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;'>${gymName || 'our gym'}</span>!</h2>
          </div>
          <p style="font-size: 1.1rem; color: #333; margin-bottom: 18px;">Hi <b style='color:#1976d2;'>${memberName}</b>,</p>
          <div style="background: linear-gradient(90deg,#e3f2fd 60%,#fceabb 100%); border-radius: 10px; padding: 18px 20px; margin-bottom: 18px; box-shadow: 0 2px 8px #1976d220;">
            <div style="font-size: 1.1rem; margin-bottom: 10px; color:#333;">🎉 <b>Your membership has been <span style='color:#43e97b;'>created</span> successfully!</b></div>
            <ul style="list-style:none;padding:0;margin:0;font-size:1.08rem;">
              <li style="margin-bottom:8px;"><span style='font-weight:600;color:#1976d2;'>Membership ID:</span> <span style='background:#e3f2fd;padding:2px 8px;border-radius:6px;font-weight:500;letter-spacing:1px;'>${membershipId}</span></li>
              <li style="margin-bottom:8px;"><span style='font-weight:600;color:#1976d2;'>Plan:</span> <span style='background:#fceabb;padding:2px 8px;border-radius:6px;font-weight:500;'>${plan} <span style='color:#1976d2;'>(${monthlyPlan})</span></span></li>
              <li><span style='font-weight:600;color:#1976d2;'>Valid Until:</span> <span style='background:#e3f2fd;padding:2px 8px;border-radius:6px;font-weight:500;'>${validUntil}</span></li>
            </ul>
          </div>
          <div style="text-align:center;margin:24px 0 12px 0;">
            <a href="#" style="display:inline-block;padding:12px 32px;background:linear-gradient(90deg,#1976d2,#43e97b 99%);color:#fff;border-radius:8px;text-decoration:none;font-size:1.1rem;font-weight:600;box-shadow:0 2px 8px #1976d220;transition:background 0.2s;">View Your Profile</a>
          </div>
          <p style="color:#888;font-size:0.98rem;text-align:center;margin-top:18px;">Thank you for joining <span style='color:#1976d2;font-weight:600;'>${gymName || 'our gym'}</span>!<br>We look forward to seeing you reach your fitness goals. 💪</p>
        </div>
      </div>
    `;
    await sendEmail(to, `Your Membership at ${gymName || 'our gym'}`, html);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to send email', error: err.message });
  }
});


// Get only new members added in the last 7 days (protected route)
router.get('/new', gymadminAuth, async (req, res) => {
  try {
    const gymId = (req.admin && (req.admin.gymId || req.admin.id)) || req.body.gymId;
    if (!gymId) return res.status(400).json({ message: 'Gym ID is required.' });
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const members = await require('../models/Member').find({
      gym: gymId,
      joinDate: { $gte: sevenDaysAgo }
    }).sort({ joinDate: -1 });
    res.status(200).json(members);
  } catch (err) {
    console.error('Error fetching new members:', err);
    res.status(500).json({ message: 'Server error while fetching new members' });
  }
});

// Get all members for a gym (protected route)
router.get('/', gymadminAuth, getMembers);

// Update member details (protected route, with image upload)
router.put('/:memberId', gymadminAuth, memberImageUpload.single('profileImage'), updateMember);

// Get members with expiring memberships
router.get('/expiring', gymadminAuth, async (req, res) => {
  try {
    const Member = require('../models/Member');
    const { days = 3 } = req.query;
    const daysFromNow = new Date();
    daysFromNow.setDate(daysFromNow.getDate() + parseInt(days));
    
    const expiringMembers = await Member.find({
      gymId: req.gymId,
      membershipValidUntil: {
        $lte: daysFromNow,
        $gte: new Date()
      }
    }).select('name email phone membershipValidUntil planSelected membershipId');
    
    res.json({
      success: true,
      members: expiringMembers,
      count: expiringMembers.length
    });
  } catch (error) {
    console.error('Error fetching expiring memberships:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching expiring memberships'
    });
  }
});

module.exports = router;
