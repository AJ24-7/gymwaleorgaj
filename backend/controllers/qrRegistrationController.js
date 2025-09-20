const QRCode = require('../models/QRCode');
const Member = require('../models/Member');
const Gym = require('../models/gym');
const sendEmail = require('../utils/sendEmail');

// Import cash validation functions
const { createCashValidationRequest } = require('./cashValidationController');

// Register member via QR code
const registerMemberViaQR = async (req, res) => {
  try {
    const {
      memberName,
      email,
      phone,
      age,
      gender,
      address,
      activityPreference,
      planSelected,
      monthlyPlan,
      paymentAmount,
      paymentMode,
      gymId,
      qrToken,
      registrationType,
      specialOffer,
      // Legacy field names for backward compatibility
      firstName,
      lastName,
      selectedPlan
    } = req.body;

    console.log('=== QR REGISTRATION REQUEST ===');
    console.log('Request body:', req.body);

    // Use memberName if provided, otherwise combine firstName and lastName
    const finalMemberName = memberName || (firstName && lastName ? `${firstName} ${lastName}` : '');
    const finalPlanSelected = planSelected || selectedPlan || '';

    // Validate required fields
    if (!finalMemberName || !email || !phone || !age || !gender || !activityPreference || !finalPlanSelected || !monthlyPlan || !paymentAmount || !paymentMode) {
      return res.status(400).json({ 
        message: 'Missing required fields',
        required: ['memberName', 'email', 'phone', 'age', 'gender', 'activityPreference', 'planSelected', 'monthlyPlan', 'paymentAmount', 'paymentMode']
      });
    }

    // Validate QR code
    console.log('=== QR VALIDATION DEBUG ===');
    console.log('Received QR token:', qrToken);
    console.log('Received gym ID:', gymId);
    console.log('Token type:', typeof qrToken);
    console.log('Gym ID type:', typeof gymId);
    
    const qrCode = await QRCode.getValidQRCode(qrToken);
    console.log('QR code query result:', qrCode ? 'FOUND' : 'NOT FOUND');
    
    if (!qrCode) {
      // Let's also try to find ANY QR code with this token (even expired/inactive)
      const anyQRCode = await QRCode.findOne({ token: qrToken });
      console.log('Any QR code with token (including expired):', anyQRCode ? 'EXISTS' : 'DOES NOT EXIST');
      
      if (anyQRCode) {
        console.log('Found QR code details:');
        console.log('- ID:', anyQRCode._id);
        console.log('- Token:', anyQRCode.token);
        console.log('- Gym ID:', anyQRCode.gymId);
        console.log('- Is Active:', anyQRCode.isActive);
        console.log('- Expiry Date:', anyQRCode.expiryDate);
        console.log('- Usage Count:', anyQRCode.usageCount);
        console.log('- Usage Limit:', anyQRCode.usageLimit);
        console.log('- Current Time:', new Date());
        console.log('- Is Expired:', new Date() > anyQRCode.expiryDate);
      }
      
      console.log('QR code not found or invalid:', qrToken);
      return res.status(400).json({ 
        message: 'Invalid or expired QR code' 
      });
    }
    
    console.log('QR code found:', qrCode._id, 'for gym:', qrCode.gymId._id.toString());
    
    // Handle both ObjectId and string comparisons
    const qrGymId = qrCode.gymId._id ? qrCode.gymId._id.toString() : qrCode.gymId.toString();
    const providedGymId = gymId.toString();
    
    if (qrGymId !== providedGymId) {
      console.log('Gym ID mismatch. QR gym:', qrGymId, 'Provided gym:', providedGymId);
      return res.status(400).json({ 
        message: 'QR code is not valid for this gym' 
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

    // Create member record with correct field names for Member schema
    console.log('=== PAYMENT MODE CHECK ===');
    console.log('Payment mode:', paymentMode);
    console.log('Registration type:', registrationType);

    // For cash payments (except trials), create cash validation instead of member
    if (paymentMode === 'cash' && registrationType !== 'trial') {
      console.log('💰 Cash payment detected - creating cash validation request');
      
      // Create cash validation request using the dedicated system
      const validationData = {
        memberName: finalMemberName,
        email,
        phone,
        planName: finalPlanSelected,
        duration: monthlyPlan,
        amount: paymentAmount,
        gymId: gymId || 'default_gym',
        qrToken: qrToken,
        registrationData: {
          age: parseInt(age),
          gender,
          address: address || '',
          activityPreference
        }
      };

      const { validationCode, expiresAt } = createCashValidationRequest(validationData);
      
      return res.status(202).json({
        success: true,
        requiresCashValidation: true,
        validationCode,
        message: 'Cash validation request created. Please ask gym admin to confirm payment.',
        expiresAt: expiresAt.toISOString(),
        timeLeft: 120, // 2 minutes in seconds
        nextSteps: {
          message: 'Payment verification required',
          action: 'cash_validation',
          details: `Please provide this code to the gym admin: ${validationCode}`,
          validationCode: validationCode
        }
      });
    }

    // ONLY for trial registrations and online payments (NOT for cash payments)
    if (registrationType === 'trial' || paymentMode !== 'cash') {
      const memberData = {
        gym: gymId,
        memberName: finalMemberName,
        age: parseInt(age),
        gender,
        phone,
        email,
        paymentMode: paymentMode || 'pending',
        paymentAmount: parseFloat(paymentAmount),
        planSelected: finalPlanSelected.charAt(0).toUpperCase() + finalPlanSelected.slice(1).toLowerCase(), // Ensure proper case
        monthlyPlan: parseInt(monthlyPlan), // Convert to number
        activityPreference,
        address: address || '',
        joinDate: new Date(),
        membershipId: `${(gym.gymName || gym.name || 'GYM').substring(0,3).toUpperCase()}${Date.now()}`,
        paymentStatus: registrationType === 'trial' ? 'paid' : 'pending'
      };

      console.log('Creating member with data:', memberData);

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
          details: 'Your 3-day trial starts now. Visit the gym to begin your fitness journey!',
          redirectUrl: '/registration-complete?type=trial'
        };
      } else {
        // For paid memberships, prepare payment options
        const baseAmount = selectedPlan?.price || 1000; // Default amount if plan not found
        const duration = selectedPlan?.duration || 1;
        
        nextSteps = {
          message: 'Registration successful! Please complete payment to activate your membership.',
          action: 'payment_required',
          paymentOptions: {
            memberId: newMember._id,
            amount: baseAmount,
            duration: duration,
            planName: selectedPlan?.name || 'Membership Plan',
            supportedMethods: ['razorpay', 'stripe', 'upi', 'paypal']
          },
          paymentUrl: `/payment?member=${newMember._id}&plan=${selectedPlan}&amount=${baseAmount}`,
          details: 'Choose your preferred payment method to complete the registration.',
          redirectUrl: '/payment-gateway'
        };
      }

      res.status(201).json({
        message: 'Member registration successful',
        member: {
          id: newMember._id,
          name: newMember.memberName,
          email: newMember.email,
          membershipPlan: newMember.planSelected, // Map to existing field
          planSelected: newMember.planSelected,
          monthlyPlan: newMember.monthlyPlan,
          membershipId: newMember.membershipId,
          paymentStatus: newMember.paymentStatus
        },
        gym: {
          name: gym.gymName || gym.name,
          address: gym.address,
          contact: gym.contact
        },
        nextSteps
      });
    } else {
      // This should never happen because cash payments return early above
      return res.status(400).json({
        success: false,
        message: 'Invalid payment mode or registration type combination'
      });
    }

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
                <li>Plan: ${member.planSelected}</li>
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
                <li>Plan: ${member.planSelected}</li>
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
      title: `Welcome to ${gym.name}!`,
      preheader: registrationType === 'instant' ? 'Your membership is confirmed and active' : 'Complete your payment to activate membership',
      bodyHtml: `
        <p>Hi <strong style="color:#10b981;">${member.name}</strong>,</p>
        <p>🎉 Welcome to <strong>${gym.name}</strong>! Your registration via QR code is complete.</p>
        
        <div style="background:#1e293b;border:1px solid #334155;padding:18px;border-radius:14px;margin:18px 0;">
          <table style="width:100%;font-size:13px;">
            <tr><td style="padding:6px 0;color:#94a3b8;width:140px;"><strong>Member ID:</strong></td><td style="padding:6px 0;background:#0d4d89;color:#ffffff;padding:4px 10px;border-radius:6px;font-weight:600;letter-spacing:1px;">${member.membershipId}</td></tr>
            <tr><td style="padding:6px 0;color:#94a3b8;"><strong>Plan:</strong></td><td style="padding:6px 0;">${member.planSelected}</td></tr>
            <tr><td style="padding:6px 0;color:#94a3b8;"><strong>Status:</strong></td><td style="padding:6px 0;color:${registrationType === 'instant' ? '#10b981' : '#f59e0b'};">${registrationType === 'instant' ? 'Active' : 'Pending Payment'}</td></tr>
            ${member.validUntil ? `<tr><td style="padding:6px 0;color:#94a3b8;"><strong>Valid Until:</strong></td><td style="padding:6px 0;">${new Date(member.validUntil).toLocaleDateString()}</td></tr>` : ''}
          </table>
        </div>
        
        ${registrationType === 'instant' 
          ? '<p style="color:#10b981;text-align:center;">✅ Your membership is confirmed and active!</p>'
          : '<p style="color:#f59e0b;text-align:center;">⏳ Complete your payment to activate your membership.</p>'
        }
        
        ${specialOffer ? `
          <div style="background:#1e293b;border:1px solid #334155;padding:18px;border-radius:14px;margin:18px 0;">
            <h4 style="color:#38bdf8;margin:0 0 8px 0;">🎁 Special Offer</h4>
            <p style="color:#cbd5e1;margin:0;font-size:14px;">${specialOffer}</p>
          </div>
        ` : ''}
        
        <p style="color:#cbd5e1;font-size:14px;text-align:center;margin-top:20px;">
          ${registrationType === 'instant' 
            ? 'Start your fitness journey today! 💪'
            : 'Once payment is completed, you\'ll receive your membership confirmation.'
          }
        </p>
      `,
      action: {
        label: registrationType === 'instant' ? 'Visit Gym' : 'Complete Payment',
        url: registrationType === 'instant' 
          ? `#gym-${gym._id}` 
          : `${process.env.BRAND_PORTAL_URL || 'https://gym-wale.com'}/payment/${member.membershipId}`
      },
      footerNote: `This email was sent because you registered via QR code at ${gym.name}`
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
