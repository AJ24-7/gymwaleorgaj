const Member = require('../models/Member');
const Gym = require('../models/gym');
const path = require('path');

const sendEmail = require('../utils/sendEmail');
const Payment = require('../models/Payment');

// Add a new member to a gym
exports.addMember = async (req, res) => {
  try {
    // Duplicate check: email or phone for this gym
    const forceAdd = req.body.forceAdd === 'true' || req.body.forceAdd === true;
    const email = req.body.memberEmail;
    const phone = req.body.memberPhone;
    if (!forceAdd && (email || phone)) {
      const duplicate = await Member.findOne({
        gym: ((req.admin && (req.admin.gymId || req.admin.id)) || req.body.gymId),
        $or: [
          { email: email },
          { phone: phone }
        ]
      });
      if (duplicate) {
        return res.status(409).json({
          code: 'DUPLICATE_MEMBER',
          message: 'A member with this email or phone number already exists.'
        });
      }
    }
   
    for (const [key, value] of Object.entries(req.body)) {
    }
    
    // Accept gymId from req.admin (set by gymadminAuth) or body
    const gymId = (req.admin && (req.admin.gymId || req.admin.id)) || req.body.gymId;
    
    if (!gymId) return res.status(400).json({ message: 'Gym ID is required.' });
    const gym = await Gym.findById(gymId);
    if (!gym) return res.status(404).json({ message: 'Gym not found.' });
    

    let profileImagePath = '';
    if (req.file) {
      // Save relative path for frontend use
      profileImagePath = '/uploads/profile-pics/' + req.file.filename;
    }

    // Helper function to extract string value from potential array
    const extractStringValue = (value) => {
      if (Array.isArray(value)) {
        return value[0]; // Take first value if array
      }
      return value;
    };

    // Extract membership fields from request body
    let membershipId = extractStringValue(req.body.membershipId);
    let membershipValidUntil = extractStringValue(req.body.membershipValidUntil);
    // FALLBACK: Generate membershipId if missing (frontend should send it, but backup)
    if (!membershipId) {
      const now = new Date();
      const ym = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}`;
      const random = Math.random().toString(36).substring(2, 8).toUpperCase();
      const gymShort = (gym.gymName || 'GYM').replace(/[^A-Za-z0-9]/g, '').substring(0,6).toUpperCase();
      const planShort = (req.body.planSelected || 'PLAN').replace(/[^A-Za-z0-9]/g, '').substring(0,6).toUpperCase();
      membershipId = `${gymShort}-${ym}-${planShort}-${random}`;
    }
    
    // FALLBACK: Generate membershipValidUntil if missing 
    if (!membershipValidUntil) {
      const now = new Date();
      let months = 1;
      const monthlyPlan = req.body.monthlyPlan || '';
      if (/3\s*Months?/i.test(monthlyPlan)) months = 3;
      else if (/6\s*Months?/i.test(monthlyPlan)) months = 6;
      else if (/12\s*Months?/i.test(monthlyPlan)) months = 12;
      const validUntil = new Date(now);
      validUntil.setMonth(validUntil.getMonth() + months);
      membershipValidUntil = validUntil.toISOString().split('T')[0];
    }
    
   
    
   

    const member = new Member({
      gym: gymId,
      memberName: req.body.memberName,
      age: req.body.memberAge,
      gender: req.body.memberGender,
      phone: req.body.memberPhone,
      email: req.body.memberEmail,
      address: req.body.memberAddress,
      paymentMode: req.body.paymentMode,
      paymentAmount: req.body.paymentAmount,
      planSelected: req.body.planSelected,
      monthlyPlan: req.body.monthlyPlan,
      activityPreference: req.body.activityPreference,
      profileImage: profileImagePath,
      membershipId: membershipId,
      membershipValidUntil: membershipValidUntil
    });
    

    await member.save();

    // Create payment record for membership
    try {
      const payment = new Payment({
        gymId: gymId,
        type: 'received',
        category: 'membership',
        amount: req.body.paymentAmount || 0,
        description: `Membership payment for ${req.body.memberName || 'Member'}`,
        memberName: req.body.memberName || '',
        memberId: member._id,
        paymentMethod: req.body.paymentMode || 'cash',
        status: 'completed',
        createdBy: (req.admin && req.admin.id) || gymId
      });
      await payment.save();
    } catch (paymentErr) {
      console.error('[MemberController] Error creating payment record:', paymentErr);
      // Do not block member creation if payment fails
    }

    // Create notification for new member
    try {
      const Notification = require('../models/Notification');
      const memberName = req.body.memberName || 'New Member';
      
      const notification = new Notification({
        title: 'New Member Added',
        message: `${memberName} has joined your gym with ${req.body.planSelected || 'Unknown'} plan`,
        type: 'new-member',
        priority: 'normal',
        icon: 'fa-user-plus',
        color: '#4caf50',
        user: gymId,
        metadata: {
          memberName: memberName,
          planSelected: req.body.planSelected,
          membershipId: membershipId  // Use the extracted membershipId
        }
      });
      await notification.save();
    } catch (notifError) {
      console.error('Error creating notification:', notifError);
      // Don't block member creation if notification fails
    }

    // Send membership email if all required fields are present
    try {
     
      if (req.body.memberEmail && req.body.memberName && membershipId && req.body.planSelected && req.body.monthlyPlan && membershipValidUntil && gym.gymName) {
        // Use gym logo from profile if available, otherwise fallback to default icon
        let gymLogoUrl = 'https://img.icons8.com/color/96/000000/gym.png';
        if (gym.logo && typeof gym.logo === 'string' && gym.logo.trim() !== '') {
          // If logo is a relative path, prepend server URL or use as is for absolute URLs
          if (/^https?:\/\//i.test(gym.logo)) {
            gymLogoUrl = gym.logo;
          } else {
            // Assuming logo is stored in /uploads/gymImages/ or similar
            gymLogoUrl = `http://localhost:5000${gym.logo.startsWith('/') ? '' : '/'}${gym.logo}`;
          }
        }
        const html = `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; background: #f6f8fa; padding: 32px 0;">
            <div style="max-width: 480px; margin: 0 auto; background: #fff; border-radius: 16px; box-shadow: 0 4px 24px #0002; padding: 32px 28px;">
              <div style="text-align: center; margin-bottom: 24px;">
                <img src='${gymLogoUrl}' alt='Gym Logo' style='width:64px;height:64px;border-radius:12px;box-shadow:0 2px 8px #0001;'>
                <h2 style="color: #1976d2; margin: 18px 0 0 0; font-size: 2rem; letter-spacing: 1px;">Welcome to ${gym.gymName}!</h2>
              </div>
              <p style="font-size: 1.1rem; color: #333; margin-bottom: 18px;">Hi <b style='color:#1976d2;'>${req.body.memberName}</b>,</p>
              <div style="background: linear-gradient(90deg,#e3f2fd 60%,#fceabb 100%); border-radius: 10px; padding: 18px 20px; margin-bottom: 18px; box-shadow: 0 2px 8px #1976d220;">
                <div style="font-size: 1.1rem; margin-bottom: 10px; color:#333;">🎉 <b>Your membership has been <span style='color:#43e97b;'>created</span> successfully!</b></div>
                <ul style="list-style:none;padding:0;margin:0;font-size:1.08rem;">
                  <li style="margin-bottom:8px;"><span style='font-weight:600;color:#1976d2;'>Membership ID:</span> <span style='background:#e3f2fd;padding:2px 8px;border-radius:6px;font-weight:500;letter-spacing:1px;'>${membershipId}</span></li>
                  <li style="margin-bottom:8px;"><span style='font-weight:600;color:#1976d2;'>Plan:</span> <span style='background:#fceabb;padding:2px 8px;border-radius:6px;font-weight:500;'>${req.body.planSelected} <span style='color:#1976d2;'>(${req.body.monthlyPlan})</span></span></li>
                  <li><span style='font-weight:600;color:#1976d2;'>Valid Until:</span> <span style='background:#e3f2fd;padding:2px 8px;border-radius:6px;font-weight:500;'>${membershipValidUntil}</span></li>
                </ul>
              </div>
              <div style="text-align:center;margin:24px 0 12px 0;">
                <a href="#" style="display:inline-block;padding:12px 32px;background:linear-gradient(90deg,#1976d2,#43e97b 99%);color:#fff;border-radius:8px;text-decoration:none;font-size:1.1rem;font-weight:600;box-shadow:0 2px 8px #1976d220;transition:background 0.2s;">View Your Profile</a>
              </div>
              <p style="color:#888;font-size:0.98rem;text-align:center;margin-top:18px;">Thank you for joining <span style='color:#1976d2;font-weight:600;'>${gym.gymName}</span>!<br>We look forward to seeing you reach your fitness goals. 💪</p>
            </div>
          </div>
        `;
        await sendEmail(req.body.memberEmail, `Your Membership at ${gym.gymName}`, html);
      } else {
       
      }
    } catch (emailErr) {
      console.error('[MemberController] Error sending membership email:', emailErr);
      // Don't block member creation if email fails
    }

    res.status(201).json({ message: 'Member added successfully', member });
  } catch (err) {
    console.error('Error adding member:', err);
    res.status(500).json({ message: 'Server error while adding member' });
  }
};

// Update member details
exports.updateMember = async (req, res) => {
  try {
    const { memberId } = req.params;
    const updateFields = {};

    // Only allow updating specific fields
    if (req.body.phone) updateFields.phone = req.body.phone;
    if (req.body.email) updateFields.email = req.body.email;
    if (req.body.address) updateFields.address = req.body.address;
    if (req.body.activityPreference) updateFields.activityPreference = req.body.activityPreference;

    if (req.file) {
      updateFields.profileImage = '/uploads/profile-pics/' + req.file.filename;
    }

    const updatedMember = await Member.findByIdAndUpdate(
      memberId,
      { $set: updateFields },
      { new: true }
    );

    if (!updatedMember) {
      return res.status(404).json({ message: 'Member not found' });
    }

    res.status(200).json({ message: 'Member updated successfully', member: updatedMember });
  } catch (err) {
    console.error('Error updating member:', err);
    res.status(500).json({ message: 'Server error while updating member' });
  }
};

// Get all members for a gym
exports.getMembers = async (req, res) => {
  try {
    const gymId = (req.admin && (req.admin.gymId || req.admin.id)) || req.body.gymId;
    if (!gymId) return res.status(400).json({ message: 'Gym ID is required.' });
    
    const members = await Member.find({ gym: gymId });
    res.status(200).json(members);
  } catch (err) {
    console.error('Error fetching members:', err);
    res.status(500).json({ message: 'Server error while fetching members' });
  }
};

// Remove members by their custom membership IDs (bulk delete)
exports.removeMembersByIds = async (req, res) => {
  try {
    const { membershipIds } = req.body; // Array of custom membership IDs
    const gymId = (req.admin && (req.admin.gymId || req.admin.id)) || req.body.gymId;
    
    if (!membershipIds || membershipIds.length === 0) {
      return res.status(400).json({ message: 'No membership IDs provided.' });
    }
    
    const result = await Member.deleteMany({
      gym: gymId,
      membershipId: { $in: membershipIds }
    });
    
    res.status(200).json({ message: `Removed ${result.deletedCount} member(s).`, deletedCount: result.deletedCount });
  } catch (err) {
    console.error('Error removing members by IDs:', err);
    res.status(500).json({ message: 'Server error while removing members.' });
  }
};

// Remove all members whose membership expired more than 7 days ago
exports.removeExpiredMembers = async (req, res) => {
  try {
    const gymId = (req.admin && (req.admin.gymId || req.admin.id)) || req.body.gymId;
    if (!gymId) return res.status(400).json({ message: 'Gym ID is required.' });
    
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const result = await Member.deleteMany({
      gym: gymId,
      membershipValidUntil: { $lt: sevenDaysAgo }
    });
    
    res.status(200).json({ message: `Removed ${result.deletedCount} expired member(s).`, deletedCount: result.deletedCount });
  } catch (err) {
    console.error('Error removing expired members:', err);
    res.status(500).json({ message: 'Server error while removing expired members.' });
  }
};
