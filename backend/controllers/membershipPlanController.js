const Gym = require('../models/gym');

// Get all membership plans for the logged-in gym admin
toPlanResponse = (plan) => ({
  name: plan.name,
  price: plan.price,
  discount: plan.discount,
  discountMonths: plan.discountMonths,
  benefits: plan.benefits,
  note: plan.note,
  icon: plan.icon,
  color: plan.color
});

exports.getMembershipPlans = async (req, res) => {
  try {
    const gym = await Gym.findOne({ admin: req.admin.id });
    if (!gym) return res.status(404).json({ message: 'Gym not found' });
    // Always return exactly 3 plans (Basic, Standard, Premium)
    let plans = gym.membershipPlans || [];
    if (plans.length !== 3) {
      // Fallback: create default plans if not present
      plans = [
        { name: 'Basic', price: 800, discount: 0, discountMonths: 0, benefits: ['Gym Access', 'Group Classes'], note: 'Best for beginners', icon: 'fa-leaf', color: '#38b000' },
        { name: 'Standard', price: 1200, discount: 10, discountMonths: 6, benefits: ['All Basic Benefits', 'Diet Plan', 'Locker Facility'], note: 'Most Popular', icon: 'fa-star', color: '#3a86ff' },
        { name: 'Premium', price: 1800, discount: 15, discountMonths: 12, benefits: ['All Standard Benefits', 'Personal Trainer', 'Spa & Sauna'], note: 'For serious fitness', icon: 'fa-gem', color: '#8338ec' }
      ];
      gym.membershipPlans = plans;
      await gym.save();
    }
    res.json(plans.map(toPlanResponse));
  } catch (err) {
    console.error('[API] Error in getMembershipPlans:', err);
    res.status(500).json({ message: 'Error fetching membership plans', error: err.message });
  }
};

// Update all membership plans for the logged-in gym admin
exports.updateMembershipPlans = async (req, res) => {
  try {
    const gym = await Gym.findOne({ admin: req.admin.id });
    if (!gym) return res.status(404).json({ message: 'Gym not found' });
    const plans = req.body;
    if (!Array.isArray(plans) || plans.length !== 3) {
      return res.status(400).json({ message: 'Must provide exactly 3 plans (Basic, Standard, Premium)' });
    }
    // Validate and assign
    gym.membershipPlans = plans.map(plan => ({
      name: plan.name,
      price: plan.price,
      discount: plan.discount,
      discountMonths: plan.discountMonths,
      benefits: Array.isArray(plan.benefits) ? plan.benefits : [],
      note: plan.note,
      icon: plan.icon,
      color: plan.color
    }));
    await gym.save();
    res.json(gym.membershipPlans.map(toPlanResponse));
  } catch (err) {
    res.status(500).json({ message: 'Error updating membership plans', error: err.message });
  }
};
