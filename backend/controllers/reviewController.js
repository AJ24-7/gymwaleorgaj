const Review = require('../models/Review');
const Gym = require('../models/gym'); // Assuming you have a Gym model
const User = require('../models/User'); // Assuming you have a User model

// @desc    Submit a review for a gym
// @route   POST /api/reviews
// @access  Private (User must be logged in)
const addReview = async (req, res) => {
    const { gymId, rating, comment, reviewerName } = req.body;
    const userId = req.userId; // Extracted from authMiddleware

    console.log('Adding review:', { gymId, rating, comment, reviewerName, userId });

    try {
        const gym = await Gym.findById(gymId);
        if (!gym) {
            console.log('Gym not found:', gymId);
            return res.status(404).json({ 
                success: false,
                message: 'Gym not found' 
            });
        }

        // Check if the user has already reviewed this gym
        const existingReview = await Review.findOne({ gym: gymId, user: userId });
        if (existingReview) {
            console.log('User already reviewed this gym:', userId, gymId);
            return res.status(400).json({ 
                success: false,
                message: 'You have already reviewed this gym' 
            });
        }

        const review = new Review({
            gym: gymId,        // Changed from gymId to gym
            user: userId,      // Changed from userId to user
            rating: Number(rating),
            comment,
            reviewerName: reviewerName || req.user?.name || 'Anonymous'
        });

        const savedReview = await review.save();
        console.log('Review saved successfully:', savedReview._id);

        res.status(201).json({ 
            success: true,
            message: 'Review submitted successfully', 
            review: savedReview 
        });

    } catch (error) {
        console.error('Error submitting review:', error);
        res.status(500).json({ 
            success: false,
            message: 'Server error while submitting review',
            error: error.message 
        });
    }
};

// @desc    Get all reviews for a specific gym
// @route   GET /api/reviews/gym/:gymId
// @access  Public
const getGymReviews = async (req, res) => {
    const { gymId } = req.params;
    console.log('Getting reviews for gym:', gymId);

    try {
        const gym = await Gym.findById(gymId);
        if (!gym) {
            console.log('Gym not found:', gymId);
            return res.status(404).json({ 
                success: false,
                message: 'Gym not found' 
            });
        }

        const reviews = await Review.find({ gym: gymId, isActive: true })
            .populate('gym', 'gymName logoUrl')
            .populate('user', 'firstName lastName profileImage')
            .populate('adminReply.repliedBy', 'gymName logoUrl')
            .sort({ isFeatured: -1, createdAt: -1 }); // Featured reviews first

        console.log('Found reviews:', reviews.length);
        console.log('Reviews data:', reviews);

        res.json({
            success: true,
            reviews: reviews,
            count: reviews.length
        });

    } catch (error) {
        console.error('Error fetching reviews:', error);
        res.status(500).json({ 
            success: false,
            message: 'Server error while fetching reviews',
            error: error.message 
        });
    }
};

// @desc    Get average rating and review count for a specific gym
// @route   GET /api/reviews/gym/:gymId/average
// @access  Public
const getGymAverageRating = async (req, res) => {
    try {
        const { gymId } = req.params;
        console.log('Getting average rating for gym:', gymId);

        // Get all reviews for the gym
        const reviews = await Review.find({ gym: gymId, isActive: true });
        console.log('Found reviews for average calculation:', reviews.length);

        if (!reviews || reviews.length === 0) {
            console.log('No reviews found, returning default values');
            return res.json({
                success: true,
                averageRating: 0,
                totalReviews: 0,
                message: 'No reviews found for this gym'
            });
        }

        // Calculate average rating
        const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
        const averageRating = totalRating / reviews.length;

        console.log('Calculated average rating:', averageRating, 'from', reviews.length, 'reviews');

        res.json({
            success: true,
            averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal place
            totalReviews: reviews.length
        });

    } catch (error) {
        console.error('Error getting gym average rating:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving gym average rating',
            error: error.message
        });
    }
};

// @desc    Update a review
// @route   PUT /api/reviews/:reviewId
// @access  Private (User who created the review)
const updateReview = async (req, res) => {
    const { reviewId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.userId;

    try {
        const review = await Review.findById(reviewId);
        
        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Review not found'
            });
        }

        // Check if the user owns this review
        if (review.user.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'You can only update your own reviews'
            });
        }

        review.rating = rating || review.rating;
        review.comment = comment || review.comment;
        review.updatedAt = new Date();

        await review.save();

        res.json({
            success: true,
            message: 'Review updated successfully',
            review: review
        });

    } catch (error) {
        console.error('Error updating review:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating review',
            error: error.message
        });
    }
};

// @desc    Delete a review
// @route   DELETE /api/reviews/:reviewId
// @access  Private (User who created the review)
const deleteReview = async (req, res) => {
    const { reviewId } = req.params;
    const userId = req.userId;

    try {
        const review = await Review.findById(reviewId);
        
        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Review not found'
            });
        }

        // Check if the user owns this review
        if (review.user.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'You can only delete your own reviews'
            });
        }

        // Soft delete - mark as inactive
        review.isActive = false;
        await review.save();

        res.json({
            success: true,
            message: 'Review deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting review:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting review',
            error: error.message
        });
    }
};

// @desc    Add admin reply to a review
// @route   PUT /api/reviews/:reviewId/reply
// @access  Private (Gym Admin only)
const addAdminReply = async (req, res) => {
    const { reviewId } = req.params;
    const { reply } = req.body;
    const gymId = req.admin && (req.admin.gymId || req.admin.id);

    try {
        // Find the review
        const review = await Review.findById(reviewId).populate('gym', 'gymName logoUrl');
        
        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Review not found'
            });
        }

        // Check if the admin owns this gym
        if (review.gym._id.toString() !== gymId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'You can only reply to reviews for your gym'
            });
        }

        // Add or update admin reply
        review.adminReply = {
            reply: reply,
            repliedAt: new Date(),
            repliedBy: gymId
        };

        await review.save();

        res.json({
            success: true,
            message: 'Admin reply added successfully',
            review: review
        });

    } catch (error) {
        console.error('Error adding admin reply:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding admin reply',
            error: error.message
        });
    }
};

// @desc    Feature/Unfeature a review (Gym Admin)
// @route   PUT /api/reviews/:reviewId/feature
// @access  Private (Gym Admin only)
const toggleFeatureReview = async (req, res) => {
    const { reviewId } = req.params;
    const gymId = req.admin && (req.admin.gymId || req.admin.id);

    try {
        // Find the review
        const review = await Review.findById(reviewId).populate('gym', 'gymName logoUrl');
        
        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Review not found'
            });
        }

        // Check if the admin owns this gym
        if (review.gym._id.toString() !== gymId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'You can only feature reviews for your gym'
            });
        }

        // Toggle featured status
        review.isFeatured = !review.isFeatured;
        review.featuredAt = review.isFeatured ? new Date() : null;
        review.featuredBy = review.isFeatured ? gymId : null;

        await review.save();

        res.json({
            success: true,
            message: `Review ${review.isFeatured ? 'featured' : 'unfeatured'} successfully`,
            review: review
        });

    } catch (error) {
        console.error('Error toggling review feature status:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating review feature status',
            error: error.message
        });
    }
};

// @desc    Delete a review (Gym Admin)
// @route   DELETE /api/reviews/:reviewId/gym-delete
// @access  Private (Gym Admin only)
const gymDeleteReview = async (req, res) => {
    const { reviewId } = req.params;
    const gymId = req.admin && (req.admin.gymId || req.admin.id);

    try {
        // Find the review
        const review = await Review.findById(reviewId).populate('gym', 'gymName');
        
        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Review not found'
            });
        }

        // Check if the admin owns this gym
        if (review.gym._id.toString() !== gymId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'You can only delete reviews for your gym'
            });
        }

        // Soft delete - mark as inactive
        review.isActive = false;
        await review.save();

        res.json({
            success: true,
            message: 'Review deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting review:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting review',
            error: error.message
        });
    }
};

// @desc    Get featured reviews for a specific gym
// @route   GET /api/reviews/gym/:gymId/featured
// @access  Public
const getFeaturedReviews = async (req, res) => {
    const { gymId } = req.params;
    console.log('Getting featured reviews for gym:', gymId);

    try {
        const gym = await Gym.findById(gymId);
        if (!gym) {
            console.log('Gym not found:', gymId);
            return res.status(404).json({ 
                success: false,
                message: 'Gym not found' 
            });
        }

        const featuredReviews = await Review.find({ 
            gym: gymId, 
            isActive: true, 
            isFeatured: true 
        })
            .populate('gym', 'gymName logoUrl')
            .populate('user', 'firstName lastName profileImage')
            .populate('adminReply.repliedBy', 'gymName logoUrl')
            .sort({ featuredAt: -1 })
            .limit(5); // Limit to 5 featured reviews

        console.log('Found featured reviews:', featuredReviews.length);

        res.json({
            success: true,
            reviews: featuredReviews,
            count: featuredReviews.length
        });

    } catch (error) {
        console.error('Error fetching featured reviews:', error);
        res.status(500).json({ 
            success: false,
            message: 'Server error while fetching featured reviews',
            error: error.message 
        });
    }
};

module.exports = {
    addReview,
    getGymReviews,
    getGymAverageRating,
    updateReview,
    deleteReview,
    addAdminReply,
    toggleFeatureReview,
    gymDeleteReview,
    getFeaturedReviews
};
