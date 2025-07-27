const QRCode = require('../models/QRCode');
const Member = require('../models/Member');
const Gym = require('../models/gym');
const sendEmail = require('../utils/sendEmail');

// Register member via QR code
const registerMemberViaQR = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth,
      gender,
      address,
      emergencyName,
      emergencyPhone,
      selectedPlan,
      gymId,
      qrToken,
      registrationType,
      specialOffer
    } = req.body;

    // Validate QR code
    const qrCode = await QRCode.getValidQRCode(qrToken);
    if (!qrCode || qrCode.gymId._id.toString() !== gymId) {
      return res.status(400).json({ 
        message: 'Invalid or expired QR code' 
      });
    }

    // Check if email already exists for this gym
    const existingMember = await Member.findOne({ email, gym: gymId });
    if (existingMember) {
      return res.status(400).json({ 
        message: 'A member with this email already exists' 
      });
    }

    // Get gym details
    const gym = await Gym.findById(gymId);
    if (!gym) {
      return res.status(404).json({ message: 'Gym not found' });
    }

    // Calculate membership dates based on registration type
    let membershipStartDate = new Date();
    let membershipEndDate = new Date();
    let membershipStatus = 'pending'; // Will be 'active' after payment
    
    if (registrationType === 'trial') {
      membershipEndDate.setDate(membershipEndDate.getDate() + 3);
      membershipStatus = 'trial';
    } else {
      membershipEndDate.setMonth(membershipEndDate.getMonth() + 1);
    }

    // Create member record
    const memberData = {
      name: `${firstName} ${lastName}`,
      email,
      phone,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      gender,
      address,
      emergencyContact: {
        name: emergencyName,
        phone: emergencyPhone
      },
      gym: gymId,
      membershipPlan: selectedPlan,
      membershipStartDate,
      membershipEndDate,
      membershipStatus,
      registrationSource: 'qr_code',
      qrCodeToken: qrToken,
      registrationType,
      specialOffer,
      paymentStatus: registrationType === 'trial' ? 'paid' : 'pending',
      joinedDate: new Date()
    };

    const newMember = new Member(memberData);
    await newMember.save();

    // Increment QR code usage
    await qrCode.incrementUsage({
      memberId: newMember._id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Send welcome email
    try {
      await sendWelcomeEmail(newMember, gym, registrationType, specialOffer);
    } catch (emailError) {
      console.error('Error sending welcome email:', emailError);
      // Don't fail registration if email fails
    }

    // Determine next steps based on registration type
    let nextSteps = {};
    
    if (registrationType === 'trial') {
      nextSteps = {
        message: 'Trial membership activated! You can start using the gym immediately.',
        action: 'visit_gym',
        details: 'Your 3-day trial starts now. Visit the gym to begin your fitness journey!'
      };
    } else {
      // Create payment link/session for paid memberships
      nextSteps = {
        message: 'Registration successful! Please complete payment to activate your membership.',
        action: 'payment_required',
        paymentUrl: `/payment?member=${newMember._id}&plan=${selectedPlan}`,
        details: 'You will be redirected to complete your payment.'
      };
    }

    res.status(201).json({
      message: 'Member registration successful',
      member: {
        id: newMember._id,
        name: newMember.name,
        email: newMember.email,
        membershipPlan: newMember.membershipPlan,
        membershipStatus: newMember.membershipStatus,
        registrationType: newMember.registrationType
      },
      gym: {
        name: gym.name,
        address: gym.address,
        contact: gym.contact
      },
      nextSteps
    });

  } catch (error) {
    console.error('Error in QR member registration:', error);
    res.status(500).json({ 
      message: 'Registration failed. Please try again.',
      error: error.message 
    });
  }
};

// Send welcome email to new member
const sendWelcomeEmail = async (member, gym, registrationType, specialOffer) => {
  try {
    let subject, htmlContent;

    if (registrationType === 'trial') {
      subject = `Welcome to ${gym.name} - Your 3-Day Trial Starts Now! 🎉`;
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa;">
          <div style="background: linear-gradient(135deg, #1976d2, #1565c0); color: white; padding: 30px; text-align: center;">
            <h1 style="margin: 0; font-size: 2.5rem;">🎉 Welcome to ${gym.name}!</h1>
            <p style="margin: 10px 0 0 0; font-size: 1.2rem;">Your 3-Day Trial Starts Now</p>
          </div>
          
          <div style="padding: 30px; background: white;">
            <h2 style="color: #333; margin-bottom: 20px;">Hi ${member.name}!</h2>
            
            <p style="font-size: 16px; line-height: 1.6; color: #555;">
              Congratulations! Your 3-day trial membership at <strong>${gym.name}</strong> is now active. 
              You can start your fitness journey immediately!
            </p>
            
            <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4caf50;">
              <h3 style="margin: 0 0 10px 0; color: #2e7d32;">✅ Trial Details</h3>
              <ul style="margin: 0; padding-left: 20px; color: #555;">
                <li>Duration: 3 Days</li>
                <li>Plan: ${member.membershipPlan}</li>
                <li>Start Date: ${member.membershipStartDate.toLocaleDateString()}</li>
                <li>End Date: ${member.membershipEndDate.toLocaleDateString()}</li>
              </ul>
            </div>
            
            ${specialOffer ? `
            <div style="background: #fff3e0; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ff9800;">
              <h3 style="margin: 0 0 10px 0; color: #ef6c00;">🎁 Special Offer</h3>
              <p style="margin: 0; color: #555; font-weight: 600;">${specialOffer}</p>
            </div>
            ` : ''}
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin: 0 0 15px 0; color: #333;">📍 Gym Information</h3>
              <p style="margin: 5px 0; color: #555;"><strong>Address:</strong> ${gym.address}</p>
              <p style="margin: 5px 0; color: #555;"><strong>Phone:</strong> ${gym.contact}</p>
              <p style="margin: 5px 0; color: #555;"><strong>Email:</strong> ${gym.email}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <p style="font-size: 16px; color: #555; margin-bottom: 20px;">
                Ready to start your fitness journey? Visit us today!
              </p>
            </div>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px;">
            <p style="margin: 0;">This email was sent because you registered via QR code at ${gym.name}</p>
          </div>
        </div>
      `;
    } else {
      subject = `Welcome to ${gym.name} - Complete Your Membership! 🎉`;
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa;">
          <div style="background: linear-gradient(135deg, #1976d2, #1565c0); color: white; padding: 30px; text-align: center;">
            <h1 style="margin: 0; font-size: 2.5rem;">🎉 Welcome to ${gym.name}!</h1>
            <p style="margin: 10px 0 0 0; font-size: 1.2rem;">Your Registration is Almost Complete</p>
          </div>
          
          <div style="padding: 30px; background: white;">
            <h2 style="color: #333; margin-bottom: 20px;">Hi ${member.name}!</h2>
            
            <p style="font-size: 16px; line-height: 1.6; color: #555;">
              Thank you for registering at <strong>${gym.name}</strong>! Your membership details have been recorded,
              and you're just one step away from starting your fitness journey.
            </p>
            
            <div style="background: #fff3e0; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ff9800;">
              <h3 style="margin: 0 0 10px 0; color: #ef6c00;">⏳ Next Step Required</h3>
              <p style="margin: 0; color: #555; font-weight: 600;">
                Please complete your payment to activate your membership and start using our facilities.
              </p>
            </div>
            
            <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #1976d2;">
              <h3 style="margin: 0 0 10px 0; color: #1976d2;">📋 Membership Details</h3>
              <ul style="margin: 0; padding-left: 20px; color: #555;">
                <li>Plan: ${member.membershipPlan}</li>
                <li>Type: ${registrationType === 'premium' ? 'Premium Registration' : 'Standard Registration'}</li>
                <li>Registration Date: ${member.joinedDate.toLocaleDateString()}</li>
                <li>Status: Pending Payment</li>
              </ul>
            </div>
            
            ${specialOffer ? `
            <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4caf50;">
              <h3 style="margin: 0 0 10px 0; color: #2e7d32;">🎁 Special Offer</h3>
              <p style="margin: 0; color: #555; font-weight: 600;">${specialOffer}</p>
            </div>
            ` : ''}
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin: 0 0 15px 0; color: #333;">📍 Gym Information</h3>
              <p style="margin: 5px 0; color: #555;"><strong>Address:</strong> ${gym.address}</p>
              <p style="margin: 5px 0; color: #555;"><strong>Phone:</strong> ${gym.contact}</p>
              <p style="margin: 5px 0; color: #555;"><strong>Email:</strong> ${gym.email}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <p style="font-size: 16px; color: #555; margin-bottom: 20px;">
                Once payment is completed, you'll receive your membership confirmation and can start using our facilities immediately.
              </p>
            </div>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px;">
            <p style="margin: 0;">This email was sent because you registered via QR code at ${gym.name}</p>
          </div>
        </div>
      `;
    }

    await sendEmail({
      to: member.email,
      subject,
      html: htmlContent
    });

    console.log(`Welcome email sent to ${member.email}`);

  } catch (error) {
    console.error('Error sending welcome email:', error);
    throw error;
  }
};

module.exports = {
  registerMemberViaQR,
  sendWelcomeEmail
};
