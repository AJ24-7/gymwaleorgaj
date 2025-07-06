const mongoose = require('mongoose');


const memberSchema = new mongoose.Schema({
  gym: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Gym',
    required: true
  },
  memberName: { type: String, required: true },
  age: { type: Number, required: true },
  gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true },
  paymentMode: { type: String, enum: ['Cash', 'Card', 'UPI', 'Online'], required: true },
  paymentAmount: { type: Number, required: true },
  planSelected: { type: String, enum: ['Basic', 'Standard', 'Premium'], required: true },
  monthlyPlan: { type: String, enum: ['1 Month', '3 Months', '6 Months', '12 Months'], required: true },
  activityPreference: { type: String, required: true },
  address: { type: String },
  joinDate: { type: Date, default: Date.now },
  profileImage: { type: String },
  membershipId: { type: String },
  membershipValidUntil: { type: String }
});

module.exports = mongoose.model('Member', memberSchema);
