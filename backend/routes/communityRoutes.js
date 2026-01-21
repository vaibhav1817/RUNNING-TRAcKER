
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth'); // Optional: Is community public or private? Let's make it private/protected.
const Run = require('../models/Run');
const User = require('../models/User');

// @route   GET api/community/leaderboard
// @desc    Get top runners by total distance
// @access  Private
router.get('/leaderboard', auth, async (req, res) => {
    try {
        const leaderboard = await Run.aggregate([
            {
                $group: {
                    _id: "$user",
                    totalDistance: { $sum: "$distance" },
                    totalRuns: { $sum: 1 }
                }
            },
            { $sort: { totalDistance: -1 } },
            { $limit: 20 },
            {
                $lookup: {
                    from: "users",
                    localField: "_id",
                    foreignField: "_id",
                    as: "userDetails"
                }
            },
            { $unwind: "$userDetails" },
            {
                $project: {
                    _id: 1,
                    totalDistance: 1,
                    totalRuns: 1,
                    username: "$userDetails.username",
                    profilePicture: "$userDetails.profile.profilePicture"
                }
            }
        ]);

        res.json(leaderboard);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error: ' + err.message });
    }
});

// @route   GET api/community/feed
// @desc    Get recent runs from all users
// @access  Private
router.get('/feed', auth, async (req, res) => {
    try {
        const runs = await Run.find({ isPosted: true, deleted: { $ne: true } })
            .sort({ date: -1 })
            .limit(50)
            .populate('user', 'username profile');

        res.json(runs);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error: ' + err.message });
    }
});

module.exports = router;
