// Quick test script to check JWT token generation and validation
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI);

const User = require('./backend/models/User');

async function testAuth() {
    try {
        console.log('=== Testing Authentication ===');
        
        // Find a test user
        const testUser = await User.findOne().limit(1);
        if (!testUser) {
            console.log('No users found in database');
            return;
        }
        
        console.log('Found test user:', testUser.email);
        
        // Generate a token
        const token = jwt.sign(
            { userId: testUser._id },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        console.log('Generated token:', token.substring(0, 50) + '...');
        
        // Verify the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('Decoded token:', decoded);
        
        // Test the auth middleware logic
        const user = await User.findById(decoded.userId).select('-password');
        if (user) {
            console.log('User verification successful:', user.email);
            console.log('User ID:', user._id);
        } else {
            console.log('User not found during verification');
        }
        
    } catch (error) {
        console.error('Auth test failed:', error);
    } finally {
        mongoose.disconnect();
    }
}

testAuth();
