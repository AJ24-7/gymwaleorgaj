
// backend/controllers/trainerController.js
const Trainer = require('../models/trainerModel');
const Gym = require('../models/gym');
const sendEmail = require('../utils/sendEmail'); 
const nodemailer = require('nodemailer'); 
// GET /api/trainers/all?status=pending|approved|rejected
exports.getAllTrainersForAdmin = async (req, res) => {
  try {
    const { status } = req.query;
    let query = {};
    if (status && status !== 'all') {
      query.status = new RegExp(`^${status}$`, 'i');
    }
    const trainers = await Trainer.find(query)
      .populate({ path: 'gym', select: 'gymName' })
      .lean();
    const formatted = trainers.map(tr => {
      let gymNames = [];
      if (Array.isArray(tr.gym)) {
        gymNames = tr.gym.map(g => g?.gymName || '');
      } else if (tr.gym && tr.gym.gymName) {
        gymNames = [tr.gym.gymName];
      }
      let image = tr.image || tr.photo || '';
      if (image && !/^https?:\/\//.test(image)) {
        image = `/uploads/trainers/${image}`;
      }
      return {
        ...tr,
        gym: gymNames,
        image,
      };
    });
    res.json(formatted);
  } catch (err) {
    console.error('[getAllTrainersForAdmin] Error:', err);
    res.status(500).json({ message: 'Failed to fetch trainers' });
  }
};
// Get all approved trainers
exports.getAllApprovedTrainers = async (req, res) => {
  try {
    // Fetch only approved trainers and populate gym details
    const trainers = await Trainer.find({ status: 'approved' })
      .populate('gym')
      .select('-password'); // Exclude password or sensitive data

    const processedTrainers = trainers.map(trainer => {
      return {
        _id: trainer._id,
        id: trainer._id, // for frontend compatibility if using 'id'
        name: `${trainer.firstName || ''} ${trainer.lastName || ''}`.trim(),
        email: trainer.email,
        phone: trainer.phone,
        specialties: trainer.specialty ? [trainer.specialty] : [],
        experience: trainer.experience,
        locations: trainer.locations,
        availability: trainer.availability,
        bio: trainer.bio,
        shortBio: trainer.bio ? trainer.bio.substring(0, 100) + (trainer.bio.length > 100 ? '...' : '') : 'No bio available.',
        rate: trainer.rate,
        image: trainer.photo ? `/uploads/trainers/${trainer.photo}` : null,
        gym: trainer.gym ? {
          _id: trainer.gym._id,
          gymName: trainer.gym.gymName,
          address: trainer.gym.location?.address || '',
          city: trainer.gym.location?.city || '',
          logoUrl: trainer.gym.logoUrl || null
        } : null,
      };
    });

    res.status(200).json(processedTrainers);
  } catch (error) {
    console.error('Error fetching approved trainers:', error);
    res.status(500).json({ message: 'Server error while fetching trainers.' });
  }
};

// Get all trainers (for admin dashboard, all statuses)
exports.getAllTrainers = async (req, res) => {
  try {
    // Populate gym field to get gym details
    const trainers = await Trainer.find().populate('gym').select('-password');
    const processedTrainers = trainers.map(trainer => {
      return {
        _id: trainer._id,
        id: trainer._id,
        firstName: trainer.firstName,
        lastName: trainer.lastName,
        email: trainer.email,
        phone: trainer.phone,
        specialty: trainer.specialty,
        status: trainer.status,
        experience: trainer.experience,
        certifications: trainer.certifications,
        availability: trainer.availability,
        locations: trainer.locations,
        bio: trainer.bio,
        rate: trainer.rate,
        // Always provide full image URL for frontend
        image: trainer.photo ? `/uploads/trainers/${trainer.photo}` : null,
        gym: trainer.gym ? {
          _id: trainer.gym._id,
          gymName: trainer.gym.gymName,
          address: trainer.gym.location?.address || '',
          city: trainer.gym.location?.city || '',
          logoUrl: trainer.gym.logoUrl || null
        } : null,
      };
    });
    res.status(200).json(processedTrainers);
  } catch (error) {
    console.error('Error fetching all trainers:', error);
    res.status(500).json({ message: 'Server error while fetching trainers.' });
  }
};

// Approve a trainer
exports.approveTrainer = async (req, res) => {
  console.log('[DEBUG] approveTrainer called. Params:', req.params);

  try {
    const trainer = await Trainer.findById(req.params.id);
    if (!trainer) return res.status(404).json({ message: 'Trainer not found' });

    trainer.status = 'approved';
    await trainer.save();

    // Create notification for trainer approval
    try {
      const Notification = require('../models/Notification');
      const displayName = (trainer.firstName || '') + (trainer.lastName ? ' ' + trainer.lastName : '');
      const trainerName = displayName.trim() || 'Trainer';
      
      // Get gym admin for notification
      const gymId = trainer.gym;
      if (gymId) {
        const notification = new Notification({
          title: 'Trainer Approved',
          message: `${trainerName}'s trainer application has been approved`,
          type: 'trainer-approved',
          priority: 'normal',
          icon: 'fa-check-circle',
          color: '#4caf50',
          user: gymId,
          metadata: {
            trainerId: trainer._id,
            trainerName: trainerName,
            trainerEmail: trainer.email
          }
        });
        await notification.save();
      }
    } catch (notifError) {
      console.error('Error creating notification:', notifError);
      // Don't block trainer approval if notification fails
    }

    // Send approval email
    const subject = 'Trainer Approval - FIT-verse';
    // Use firstName and lastName for greeting, fallback to 'Trainer' if both missing
    const displayName = (trainer.firstName || '') + (trainer.lastName ? ' ' + trainer.lastName : '');
    const greetingName = displayName.trim() || 'Trainer';
    const html = `
      <h3>Hello ${greetingName},</h3>
      <p>Congratulations! Your trainer registration has been <strong>approved</strong> by the FIT-verse admin team.</p>
      <p>You can now login and access your trainer dashboard.</p>
      <br>
      <p>Best regards,<br/>FIT-verse Team</p>
    `;

    // Email to trainer (wrap in try/catch like adminController)
    try {
      console.log('[DEBUG] About to send approval email to:', trainer.email);
      console.log('[DEBUG] EMAIL_USER:', process.env.EMAIL_USER);
      console.log('[DEBUG] EMAIL_PASS present:', !!process.env.EMAIL_PASS);
      await sendEmail(
        trainer.email,
        '🎉 Your Trainer Registration is Approved!',
        `<h3>Hello ${greetingName},</h3>
         <p>Congratulations! Your trainer registration has been <strong>approved</strong> by the FIT-verse admin team.</p>
         <p>You can now <a href="http://localhost:5000/trainer-login">log in</a> and access your trainer dashboard.</p>
         <p>Best regards,<br/>FIT-verse Team</p>`
      );
      console.log('[DEBUG] sendEmail executed for:', trainer.email);
    } catch (emailErr) {
      console.error('❌ Failed to send approval email to trainer:', emailErr.message);
    }

    res.status(200).json({ message: 'Trainer approved successfully and email sent', trainer });
  } catch (error) {
    console.error('Error approving trainer:', error);
    res.status(500).json({ message: 'Error approving trainer' });
  }
};
// Reject a trainer
exports.rejectTrainer = async (req, res) => {
  try {
    const { reason } = req.body || {};
    const trainer = await Trainer.findById(req.params.id);
    if (!trainer) return res.status(404).json({ message: 'Trainer not found' });
    trainer.status = 'rejected';
    // Store the rejection reason if supported in schema (not present by default)
    if ('rejectionReason' in trainer) {
      trainer.rejectionReason = reason || '';
    }
    await trainer.save();

    // Create notification for trainer rejection
    try {
      const Notification = require('../models/Notification');
      const displayName = (trainer.firstName || '') + (trainer.lastName ? ' ' + trainer.lastName : '');
      const trainerName = displayName.trim() || 'Trainer';
      
      // Get gym admin for notification
      const gymId = trainer.gym;
      if (gymId) {
        const notification = new Notification({
          title: 'Trainer Rejected',
          message: `${trainerName}'s trainer application has been rejected`,
          type: 'trainer-rejected',
          priority: 'normal',
          icon: 'fa-times-circle',
          color: '#f44336',
          user: gymId,
          metadata: {
            trainerId: trainer._id,
            trainerName: trainerName,
            trainerEmail: trainer.email,
            rejectionReason: reason || 'No reason provided'
          }
        });
        await notification.save();
      }
    } catch (notifError) {
      console.error('Error creating notification:', notifError);
      // Don't block trainer rejection if notification fails
    }

    // Send rejection email
    try {
      const displayName = (trainer.firstName || '') + (trainer.lastName ? ' ' + trainer.lastName : '');
      await sendEmail(
        trainer.email,
        'Trainer Application Rejected - FIT-verse',
        `<p>Dear ${displayName || 'Trainer'},</p>
         <p>We regret to inform you that your trainer application has been <b>rejected</b>.</p>
         <p><strong>Reason for rejection:</strong></p>
         <blockquote>${reason ? reason : 'No specific reason provided.'}</blockquote>
         <p>If you believe this was a mistake or wish to reapply, please contact our support team or update your application accordingly.</p>
         <p>Best regards,<br/>FIT-verse Team</p>`
      );
    } catch (emailErr) {
      console.error('❌ Failed to send rejection email to trainer:', emailErr.message);
    }

    res.status(200).json({ message: 'Trainer rejected successfully and email sent', trainer, reason });
  } catch (error) {
    console.error('Error rejecting trainer:', error);
    res.status(500).json({ message: 'Error rejecting trainer' });
  }
};

// Delete a trainer
exports.deleteTrainer = async (req, res) => {
  try {
    const trainer = await Trainer.findByIdAndDelete(req.params.id);
    if (!trainer) return res.status(404).json({ message: 'Trainer not found' });
    res.status(200).json({ message: 'Trainer deleted successfully' });
  } catch (error) {
    console.error('Error deleting trainer:', error);
    res.status(500).json({ message: 'Error deleting trainer' });
  }
};

// Controller function for trainer registration (moved from trainerRoutes.js for consistency)
exports.registerTrainer = async (req, res) => {
  try {
    // Debug: log incoming files and body
    console.log('DEBUG Multer req.files:', req.files);
    console.log('DEBUG Multer req.body:', req.body);
    const {
      firstName, lastName, email, phone,
      specialty, experience, availability,
      bio, rate
    } = req.body;

    // Ensure locations is an array
    let locations = req.body.locations;
    if (locations && !Array.isArray(locations)) {
        locations = [locations];
    } else if (!locations) {
        locations = [];
    }
    

    // Support both 'photo' and 'profileImage' for backward/forward compatibility
    let photo = null;
    if (req.files?.profileImage?.[0]) {
      photo = req.files.profileImage[0].filename;
    } else if (req.files?.photo?.[0]) {
      photo = req.files.photo[0].filename;
    }
    const certifications = req.files?.certifications?.map(f => `trainers/certifications/${f.filename}`) || [];

    const gym = req.body.gym || null;

    const newTrainer = new Trainer({
      firstName, lastName, email, phone,
      specialty, 
      experience: Number(experience) || 0, 
      availability,
      locations, 
      bio, 
      rate: Number(rate) || 0,
      certifications, 
      photo,
      gym,
      status: 'pending' // Default status
    });

    await newTrainer.save();

    // Send notification email to admin (optional: you can add your admin email here)
    try {
      await sendEmail(
        process.env.ADMIN_EMAIL || 'admin@fit-verse.com',
        'New Trainer Registration Pending Approval',
        `<p>A new trainer registration has been submitted and is pending approval:</p>
         <ul>
           <li>Name: ${firstName} ${lastName}</li>
           <li>Email: ${email}</li>
           <li>Phone: ${phone}</li>
           <li>Specialty: ${specialty}</li>
         </ul>`
      );
    } catch (err) {
      console.error('Failed to send admin notification email:', err.message);
    }

    // Send confirmation email to trainer
    try {
      await sendEmail(
        email,
        'Trainer Registration Received - FIT-verse',
        `<h3>Hello ${firstName} ${lastName},</h3>
         <p>Your trainer registration has been received and is <strong>pending admin approval</strong>.</p>
         <p>You will be notified by email once your application is reviewed.</p>
         <br><p>Best regards,<br/>FIT-verse Team</p>`
      );
    } catch (err) {
      console.error('Failed to send trainer confirmation email:', err.message);
    }

    res.status(201).json({ message: 'Application submitted successfully. Awaiting admin approval.' });
  } catch (err) {
    console.error('Error during trainer registration:', err);
    res.status(500).json({ message: 'Trainer registration failed.', error: err.message });
  }
};
