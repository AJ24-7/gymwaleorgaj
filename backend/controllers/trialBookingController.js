const TrialBooking = require('../models/TrialBooking');
const Gym = require('../models/gym');
const Notification = require('../models/Notification');
const adminNotificationService = require('../services/adminNotificationService');
const nodemailer = require('nodemailer');

// Create a reusable transporter object using SMTP
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Email templates
const emailTemplates = {
  approved: (name, gymName, bookingID, trialDate, preferredTime, city, pincode) => ({
    subject: 'Trial Booking Approved',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2e7d32;"> Your Trial Booking is Confirmed!</h2>
        <p>Dear ${name},</p>
        <p>We're excited to confirm your trial session at <strong>${gymName}</strong>!</p>
        
        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #1a237e;">Booking Details</h3>
          <p><strong>Booking ID:</strong> ${bookingID}</p>
          <p><strong>Gym Location:</strong> ${city} - ${pincode}</p>
          <p><strong>Trial Date:</strong> ${new Date(trialDate).toDateString()}</p>
          <p><strong>Time Slot:</strong> ${preferredTime}</p>
          <p><strong>Booking Date:</strong> ${new Date().toLocaleDateString()}</p>
          <p><strong>Booking Time:</strong> ${new Date().toLocaleTimeString()}</p>
          <p><strong>Status:</strong> <span style="color: #2e7d32; font-weight: bold;">Confirmed </span></p>
        </div>

        <p>Please arrive 10 minutes before your scheduled time and bring a valid ID.</p>
        <p>We look forward to seeing you at the gym!</p>
        
        <p>Best regards,<br>The FIT-verse Team</p>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 0.8em; color: #666;">
          Need help? Contact us at support@fit-verse.com or call +1 (555) 123-4567
        </p>
      </div>
    `
  }),

  rejected: (name, gymName) => ({
    subject: 'Trial Booking Status Update',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #c62828;">Update on Your Trial Booking</h2>
        <p>Dear ${name},</p>
        <p>We regret to inform you that we're unable to approve your trial booking at <strong>${gymName}</strong> at this time.</p>
        
        <div style="background: #ffebee; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Status:</strong> <span style="color: #c62828;">Not Available</span></p>
          <p>This could be due to high demand or scheduling conflicts.</p>
        </div>

        <p>We encourage you to:</p>
        <ul>
          <li>Try booking for a different date/time</li>
          <li>Check out our other locations</li>
          <li>Contact us for alternative arrangements</li>
        </ul>

        <p>We appreciate your interest in FIT-verse and hope to welcome you soon!</p>
        
        <p>Best regards,<br>The FIT-verse Team</p>
      </div>
    `
  }),

  cancelled: (name, gymName, bookingID) => ({
    subject: 'Trial Booking Cancelled',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ef6c00;">Your Trial Booking Has Been Cancelled</h2>
        <p>Dear ${name},</p>
        <p>This email confirms that your trial booking at <strong>${gymName}</strong> has been cancelled.</p>
        
        <div style="background: #fff3e0; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Booking ID:</strong> ${bookingID}</p>
          <p><strong>Status:</strong> <span style="color: #ef6c00;">Cancelled</span></p>
        </div>

        <p>If this was a mistake or you'd like to reschedule, please contact us immediately.</p>
        <p>We hope to see you at FIT-verse in the future!</p>
        
        <p>Best regards,<br>The FIT-verse Team</p>
      </div>
    `
  })
};

// Send mail helper
const sendMail = async (to, template, data = {}) => {
  try {
    const { subject, html } = emailTemplates[template](...Object.values(data));
    await transporter.sendMail({
      from: `FIT-verse <${process.env.EMAIL_USER}>`,
      to,
      subject: `FIT-verse: ${subject}`,
      html,
      replyTo: 'support@fit-verse.com'
    });
    console.log(`[EMAIL] Sent ${template} email to ${to}`);
  } catch (error) {
    console.error(`[ERROR] Failed to send ${template} email to ${to}:`, error);
  }
};

// Create a new booking
exports.createBooking = async (req, res) => {
  try {
    const { name, email, phone, trialDate, preferredTime, primaryInterest, gymId, gymName } = req.body;

    if (!name || !email || !phone || !trialDate || !preferredTime || !gymId || !gymName) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const newBooking = new TrialBooking({
      name,
      email,
      phone,
      trialDate,
      preferredTime,
      primaryInterest,
      gymId,
      gymName,
      status: 'Pending',
    });

    await newBooking.save();

    // Create admin notification for new trial booking
    try {
      await adminNotificationService.notifyTrialBooking(newBooking);
    } catch (notificationError) {
      console.error('Error creating admin notification for trial booking:', notificationError);
    }

    res.status(201).json({ success: true, message: 'Trial booking created successfully.' });
  } catch (error) {
    console.error("Error creating trial booking:", error);
    res.status(500).json({ success: false, message: 'Server Error creating trial booking', error: error.message });
  }
};

// Get all bookings (for admin)
exports.getAllBookings = async (req, res) => {
  try {
    const bookings = await TrialBooking.find().sort({ createdAt: -1 });
    res.json({ success: true, bookings });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch bookings' });
  }
};

// Delete a trial booking by ID
exports.deleteBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    console.log(`[DEBUG] Deleting booking with ID: ${bookingId}`);
    
    const booking = await TrialBooking.findById(bookingId);
    if (!booking) {
      console.log(`[DEBUG] No booking found with ID: ${bookingId}`);
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    
    // Send cancellation email before deleting
    if (booking.status === 'Approved') {
      await sendMail('cancelled', {
        name: booking.name,
        gymName: booking.gymName,
        bookingID: booking.bookingID || 'N/A'
      });
    }
    
    // Delete the booking
    await TrialBooking.findByIdAndDelete(bookingId);
    console.log(`[DEBUG] Successfully deleted booking: ${bookingId}`);
    
    res.status(200).json({ 
      success: true, 
      message: 'Booking deleted successfully',
      bookingId
    });
  } catch (error) {
    console.error(`[ERROR] Failed to delete booking ${bookingId}:`, error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete booking', 
      error: error.message 
    });
  }
};
// Update booking status with mail and unique ID on approval
exports.updateBookingStatus = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { status } = req.body; // Get status first
    let { city, pincode } = req.body; // Get city and pincode, might be undefined

    if (!['Pending', 'Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const booking = await TrialBooking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // If Approved, generate ID and send mail
    if (status === 'Approved') {
      try {
        // Fetch gym details to get location
        const gym = await Gym.findById(booking.gymId);
        if (!gym) {
          return res.status(404).json({ success: false, message: 'Gym not found' });
        }

        // Use gym's location data
        const currentCity = gym.location?.city || 'GYM';
        const currentPincode = gym.location?.pincode?.toString().substring(0, 6) || '000000';
        
        // Generate a unique code and format the ID
        const code = Math.random().toString(36).substring(2, 6).toUpperCase();
        const gymNameForId = (gym.gymName && typeof gym.gymName === 'string') ? 
          gym.gymName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase() : 'GYM';
        
        // Format: CITY-PIN-GYM-CODE (e.g., DEL-110001-FITV-ABCD)
        const bookingID = `${currentCity.substring(0, 3).toUpperCase()}-${currentPincode}-${gymNameForId}-${code}`.replace(/\s+/g, '');
        
        // Update booking with status and ID
        booking.status = status;
        booking.bookingID = bookingID;
        await booking.save();

        // Send approval email
        await sendMail(booking.email, 'approved', {
          name: booking.name,
          gymName: gym.gymName,
          bookingID,
          trialDate: booking.trialDate,
          preferredTime: booking.preferredTime,
          city: currentCity,
          pincode: currentPincode
        });
      } catch (error) {
        console.error('Error fetching gym details:', error);
        return res.status(500).json({ 
          success: false, 
          message: 'Error fetching gym details',
          error: error.message 
        });
      }

      return res.json({ success: true, message: 'Booking approved and email sent', booking });
    }

    // If Rejected, update status and send rejection mail
    if (status === 'Rejected') {
      booking.status = status;
      await booking.save();

      // Send rejection email
      await sendMail(booking.email, 'rejected', {
        name: booking.name,
        gymName: booking.gymName
      });

      return res.json({ success: true, message: 'Booking rejected and email sent', booking });
    }

    // If just updating to Pending again
    booking.status = status;
    await booking.save();

    res.json({ success: true, message: 'Booking status updated', booking });

  } catch (error) {
    console.error('Error updating booking status:', error);
    res.status(500).json({ success: false, message: 'Error updating status', error: error.message });
  }
};
