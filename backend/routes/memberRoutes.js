const express = require('express');
const router = express.Router();
const { addMember, getMembers, updateMember, removeMembersByIds, removeExpiredMembers, renewMembership, updateMemberPaymentStatus, getMembersWithPendingPayments, getExpiringMembers, grantSevenDayAllowance, markPaymentAsPaid, addMembershipPlan } = require('../controllers/memberController');
const { registerOnlineMember } = require('../controllers/onlineMembershipController');
const { registerMemberViaQR } = require('../controllers/qrRegistrationController');
const gymadminAuth = require('../middleware/gymadminAuth');
const memberImageUpload = require('../middleware/memberImageUpload');
const Member = require('../models/Member');


// Simple test route
router.get('/test', (req, res) => {
  res.json({ message: 'Member routes are working' });
});

// Remove members by custom IDs (bulk delete)
router.delete('/bulk', gymadminAuth, removeMembersByIds);

// Remove all expired members (membership expired > 7 days ago)
router.delete('/expired', gymadminAuth, removeExpiredMembers);

// Remove expired members (automatic cleanup)
router.post('/remove-expired', gymadminAuth, async (req, res) => {
  try {
    const { expiredMemberIds } = req.body;
    const result = await Member.deleteMany({ _id: { $in: expiredMemberIds } });
    res.json({ message: `${result.deletedCount} expired members removed successfully` });
  } catch (error) {
    console.error('Error removing expired members:', error);
    res.status(500).json({ error: 'Failed to remove expired members' });
  }
});

// Add a new member (protected route, with image upload)
router.post('/', gymadminAuth, memberImageUpload.single('profileImage'), addMember);

// Add member via user authentication (for online membership purchases)
router.post('/add', require('../middleware/authMiddleware'), addMember);

// Register member after successful online payment
router.post('/register-online', require('../middleware/authMiddleware'), registerOnlineMember);

// Renew membership for existing member
router.put('/renew/:memberId', gymadminAuth, renewMembership);

// Send membership email (public endpoint for frontend fallback)
router.post('/send-membership-email', gymadminAuth, async (req, res) => {
  const { to, memberName, membershipId, plan, monthlyPlan, validUntil, gymName, gymLogo } = req.body;
  const sendEmail = require('../utils/sendEmail');
  try {
    // Use gym logo from profile if available, otherwise fallback to default icon
    let gymLogoUrl = 'https://img.icons8.com/color/96/000000/gym.png';
    if (gymLogo && typeof gymLogo === 'string' && gymLogo.trim() !== '') {
      if (/^https?:\/\//i.test(gymLogo)) {
        gymLogoUrl = gymLogo;
      } else {
        gymLogoUrl = `http://localhost:5000${gymLogo.startsWith('/') ? '' : '/'}${gymLogo}`;
      }
    }
    const html = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; background: #f6f8fa; padding: 32px 0;">
        <div style="max-width: 480px; margin: 0 auto; background: #fff; border-radius: 16px; box-shadow: 0 4px 24px #0002; padding: 32px 28px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <img src='${gymLogoUrl}' alt='Gym Logo' style='width:64px;height:64px;border-radius:12px;box-shadow:0 2px 8px #0001;'>
            <h2 style="color: #1976d2; margin: 18px 0 0 0; font-size: 2rem; letter-spacing: 1px;">Welcome to ${gymName || 'our gym'}!</h2>
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
    const gymId = (req.admin && (req.admin.gymId || req.admin.id));
    
    if (!gymId) {
      return res.status(400).json({
        success: false,
        message: 'Gym ID is required'
      });
    }
    
    // Calculate target date (days from now)
    const today = new Date();
    const targetDate = new Date();
    targetDate.setDate(today.getDate() + parseInt(days));
    
    // Format dates to match the string format in database (YYYY-MM-DD)
    const todayStr = today.toISOString().split('T')[0];
    const targetDateStr = targetDate.toISOString().split('T')[0];
    
    
    const expiringMembers = await Member.find({
      gym: gymId,
      membershipValidUntil: {
        $lte: targetDateStr,
        $gte: todayStr
      }
    }).select('memberName email phone membershipValidUntil planSelected membershipId');
    
    
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

// Get membership details by email (for user profile)
router.get('/membership-by-email/:email', async (req, res) => {
  try {
    const { email } = req.params;
    console.log('Fetching membership for email:', email);
    
    // Find member by email and populate gym status
    const member = await Member.findOne({ email: email })
      .populate('gym', 'gymName logo status address city state');
    
    if (!member) {
      return res.status(404).json({ message: 'No membership found for this email' });
    }
    
    // Check if gym is approved (by status field)
    if (!member.gym || member.gym.status !== 'approved') {
      return res.status(404).json({ message: 'Membership found but gym is not approved' });
    }
    
    // Calculate days left
    const today = new Date();
    const validUntil = new Date(member.membershipValidUntil);
    const timeDiff = validUntil.getTime() - today.getTime();
    const daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    // Prepare response data
   const membershipData = {
  membershipId: member.membershipId,
  memberName: member.memberName,
  email: member.email,
  phone: member.phone,
  planSelected: member.planSelected, // was planName
  monthlyPlan: member.monthlyPlan,
  membershipValidUntil: member.membershipValidUntil, // was validUntil
  paymentAmount: member.paymentAmount, // was amountPaid
  paymentMode: member.paymentMode,     // was paidVia
  joinDate: member.joinDate,
  daysLeft: daysLeft,
  isActive: daysLeft > 0,
  activityPreference: member.activityPreference,
  profileImage: member.profileImage,
  gym: {
    id: member.gym._id,
    name: member.gym.gymName,
    logo: member.gym.logo,
    address: member.gym.address,
    city: member.gym.city,
    state: member.gym.state
  }
};
    
    res.json({ success: true, membership: membershipData });
  } catch (error) {
    console.error('Error fetching membership:', error);
    res.status(500).json({ message: 'Server error while fetching membership details' });
  }
});

// Update member payment status
router.patch('/:memberId/payment-status', gymadminAuth, updateMemberPaymentStatus);

// Get members with pending payments
router.get('/pending-payments', gymadminAuth, getMembersWithPendingPayments);

// Get members whose membership is expiring within 3 days or already expired
router.get('/expiring', gymadminAuth, getExpiringMembers);

// Grant 7-day allowance for a member
router.post('/seven-day-allowance', gymadminAuth, grantSevenDayAllowance);

// Mark payment as paid and activate membership
router.post('/mark-payment-paid', gymadminAuth, markPaymentAsPaid);

// Renew membership with payment confirmation
router.patch('/:memberId/renew-membership', gymadminAuth, async (req, res) => {
  try {
    const { memberId } = req.params;
    const { 
      paymentStatus, 
      membershipValidUntil, 
      membershipStartDate, 
      pendingPaymentAmount, 
      paymentAmount,
      lastPaymentDate 
    } = req.body;

    const Member = require('../models/Member');
    
    const updatedMember = await Member.findByIdAndUpdate(
      memberId,
      {
        paymentStatus: paymentStatus || 'paid',
        membershipValidUntil: new Date(membershipValidUntil),
        membershipStartDate: new Date(membershipStartDate),
        pendingPaymentAmount: pendingPaymentAmount || 0,
        paymentAmount: paymentAmount,
        lastPaymentDate: new Date(lastPaymentDate)
      },
      { new: true }
    );

    if (!updatedMember) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    res.json({ success: true, member: updatedMember });
  } catch (error) {
    console.error('Error renewing membership:', error);
    res.status(500).json({ success: false, message: 'Failed to renew membership', error: error.message });
  }
});

// Send renewal email notification
router.post('/send-renewal-email', gymadminAuth, async (req, res) => {
  try {
    const { 
      memberId, 
      memberEmail, 
      memberName, 
      planSelected, 
      monthlyPlan, 
      amount, 
      validUntil, 
      startDate 
    } = req.body;

    const sendEmail = require('../utils/sendEmail');
    
    const validUntilDate = new Date(validUntil).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const startDateFormatted = new Date(startDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const emailTemplate = `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 28px;">🎉 Payment Received!</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Your membership has been successfully renewed</p>
        </div>
        
        <div style="padding: 30px; background: #f8f9fa;">
          <h2 style="color: #2c3e50; margin-bottom: 20px;">Hi ${memberName}!</h2>
          
          <p style="font-size: 16px; margin-bottom: 20px;">
            Great news! We have successfully received your payment and your gym membership has been renewed.
          </p>

          <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #22c55e; margin: 20px 0;">
            <h3 style="color: #22c55e; margin-top: 0;">Membership Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555;">Plan:</td>
                <td style="padding: 8px 0;">${planSelected} (${monthlyPlan})</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555;">Amount Paid:</td>
                <td style="padding: 8px 0; color: #22c55e; font-weight: bold;">₹${amount}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555;">Start Date:</td>
                <td style="padding: 8px 0;">${startDateFormatted}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555;">Valid Until:</td>
                <td style="padding: 8px 0; color: #e74c3c; font-weight: bold;">${validUntilDate}</td>
              </tr>
            </table>
          </div>

          <div style="background: #e8f5e8; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 0; color: #2d5a2d;">
              <strong>✅ Your membership is now active!</strong> You can access all gym facilities and services included in your plan.
            </p>
          </div>

          <p style="font-size: 16px; margin: 20px 0;">
            Thank you for choosing us for your fitness journey. We're here to support you in achieving your health and wellness goals!
          </p>

          <div style="text-align: center; margin: 30px 0;">
            <p style="color: #666; font-style: italic;">
              Questions? Contact us anytime - we're here to help! 💪
            </p>
          </div>
        </div>
        
        <div style="background: #2c3e50; color: white; padding: 20px; text-align: center; font-size: 14px;">
          <p style="margin: 0;">This is an automated email. Please do not reply to this message.</p>
        </div>
      </div>
    `;

    await sendEmail(
      memberEmail, 
      '🎉 Payment Received - Membership Renewed Successfully!', 
      emailTemplate
    );

    res.json({ success: true, message: 'Renewal email sent successfully' });
  } catch (error) {
    console.error('Error sending renewal email:', error);
    res.status(500).json({ success: false, message: 'Failed to send renewal email', error: error.message });
  }
});

// Get a single member by ID
router.get('/:id', gymadminAuth, async (req, res) => {
  try {
    const member = await Member.findById(req.params.id);
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }
    res.json(member);
  } catch (error) {
    console.error('Error fetching member:', error);
    res.status(500).json({ error: 'Failed to fetch member' });
  }
});

// Register member through cash payment validation - DISABLED (using new cash validation system)
// router.post('/register-cash-payment', gymadminAuth, registerCashPayment);

// Add membership plan to existing member (for duplicate member handling) - TEMPORARILY DISABLED
// router.post('/add-membership-plan', gymadminAuth, require('../controllers/memberController').addMembershipPlan);

// Register member via QR code (public endpoint)
router.post('/register-via-qr', registerMemberViaQR);

module.exports = router;
