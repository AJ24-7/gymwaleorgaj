const mongoose = require('mongoose');

module.exports = (req, res, next) => {
  try {
    const isAdmin = true; // Replace with actual admin auth logic
    if (!isAdmin) return res.status(403).json({ msg: 'Access denied' });
    
    // Set the admin ID for the request (use string ID to match the service)
    req.admin = {
      _id: '507f1f77bcf86cd799439011' // Default admin ID as string
    };
    
    console.log('Admin auth middleware - admin set:', req.admin);
    next();
  } catch (error) {
    console.error('Error in admin auth middleware:', error);
    res.status(500).json({ msg: 'Authentication error' });
  }
};