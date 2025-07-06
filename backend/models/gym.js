const mongoose = require('mongoose');

const gymSchema = new mongoose.Schema({
  gymName: { type: String, required: true },
  admin: { type: mongoose.Schema.Types.ObjectId, ref: 'GymAdmin', required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  password: { type: String, required: true },
  passwordResetOTP: { type: String },
passwordResetOTPExpiry: { type: Date },
   
  location: {
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    landmark: { type: String }
  },

  description: { type: String },
  gymPhotos: [{
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, required: true },
    imageUrl: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now }
  }],
  logoUrl: { type: String },

  equipment: [String],
  otherEquipment: { type: String },
  activities: [String],
  otherActivities: { type: String },

  membershipPlans: [
    {
      name: { type: String, required: true },
      price: { type: Number, required: true },
      discount: { type: Number, default: 0 },
      discountMonths: { type: Number, default: 0 },
      benefits: [{ type: String }],
      note: { type: String },
      icon: { type: String, default: 'fa-leaf' },
      color: { type: String, default: '#38b000' }
    }
  ],

  contactPerson: { type: String, required: true },  // Use contactPerson for the owner's name
  supportEmail: { type: String },
  supportPhone: { type: String },
  openingTime: { type: String },
  closingTime: { type: String },

  membersCount: { type: Number, default: 0 }, // added new field
  status: { type: String, default: 'pending' },
  rejectionReason: { type: String },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date },
  approvedAt: {
    type: Date,
  },
  rejectedAt: {
    type: Date
  }
  
});

// Automatically update `updatedAt` on save
gymSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.models.Gym || mongoose.model('Gym', gymSchema);
