
const Member = require('../models/Member');
const Gym = require('../models/gym');
const path = require('path');
const sendEmail = require('../utils/sendEmail');

// Add a new member to a gym
exports.addMember = async (req, res) => {
  try {
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
      membershipId: extractStringValue(req.body.membershipId),
      membershipValidUntil: extractStringValue(req.body.membershipValidUntil)
    });
    await member.save();

    // Send membership email if all required fields are present
    try {
      const membershipId = extractStringValue(req.body.membershipId);
      const membershipValidUntil = extractStringValue(req.body.membershipValidUntil);
      
      if (req.body.memberEmail && req.body.memberName && membershipId && req.body.planSelected && req.body.monthlyPlan && membershipValidUntil && gym.name) {
        // Use the same HTML as in memberRoutes.js for consistency
        const html = `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; background: #f6f8fa; padding: 32px 0;">
            <div style="max-width: 480px; margin: 0 auto; background: #fff; border-radius: 16px; box-shadow: 0 4px 24px #0002; padding: 32px 28px;">
              <div style="text-align: center; margin-bottom: 24px;">
                <img src='https://img.icons8.com/color/96/000000/gym.png' alt='Gym Logo' style='width:64px;height:64px;border-radius:12px;box-shadow:0 2px 8px #0001;'>
                <h2 style="color: #1976d2; margin: 18px 0 0 0; font-size: 2rem; letter-spacing: 1px;">Welcome to <span style='background: linear-gradient(90deg,#1976d2,#43e97b 99%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">${gym.name}</span>!</h2>
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
              <p style="color:#888;font-size:0.98rem;text-align:center;margin-top:18px;">Thank you for joining <span style='color:#1976d2;font-weight:600;'>${gym.name}</span>!<br>We look forward to seeing you reach your fitness goals. 💪</p>
            </div>
          </div>
        `;
        await sendEmail(req.body.memberEmail, `Your Membership at ${gym.name}`, html);
      }
    } catch (emailErr) {
      console.error('Error sending membership email:', emailErr);
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
    const members = await Member.find({ gym: gymId }).sort({ joinDate: -1 });
    res.status(200).json(members);
  } catch (err) {
    console.error('Error fetching members:', err);
    res.status(500).json({ message: 'Server error while fetching members' });
  }
};
// Remove members by custom IDs (bulk delete)
exports.removeMembersByIds = async (req, res) => {
  try {
    const gymId = (req.admin && (req.admin.gymId || req.admin.id)) || req.body.gymId;
    if (!gymId) return res.status(400).json({ message: 'Gym ID is required.' });
    const { memberIds } = req.body;
    if (!Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({ message: 'No member IDs provided.' });
    }
    // Only delete members belonging to this gym
    const result = await Member.deleteMany({ _id: { $in: memberIds }, gym: gymId });
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
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    // Find and delete members whose membershipValidUntil is before sevenDaysAgo
    const expiredMembers = await Member.find({
      gym: gymId,
      membershipValidUntil: { $exists: true, $ne: null, $lt: sevenDaysAgo }
    });
    if (!expiredMembers.length) {
      return res.status(200).json({ message: 'No expired members found.', deletedCount: 0 });
    }
    const expiredIds = expiredMembers.map(m => m._id);
    const result = await Member.deleteMany({ _id: { $in: expiredIds } });
    res.status(200).json({ message: `Removed ${result.deletedCount} expired member(s).`, deletedCount: result.deletedCount });
  } catch (err) {
    console.error('Error removing expired members:', err);
    res.status(500).json({ message: 'Server error while removing expired members.' });
  }
};
