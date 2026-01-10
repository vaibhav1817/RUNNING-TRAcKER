const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Run = require('../models/Run');
const auth = require('../middleware/auth');

// Search Users
router.get('/search', auth, async (req, res) => {
    try {
        const query = req.query.q;
        if (!query) return res.json([]);

        // Case-insensitive search
        const users = await User.find({
            username: { $regex: query, $options: 'i' },
            _id: { $ne: req.user.id } // Exclude self
        }).select('username profile.profilePicture followers');

        // Check if I follow them
        const result = users.map(user => ({
            _id: user._id,
            username: user.username,
            profilePicture: user.profile.profilePicture,
            isFollowing: user.followers.includes(req.user.id)
        }));

        res.json(result);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Follow a User
router.put('/follow/:id', auth, async (req, res) => {
    try {
        if (req.params.id === req.user.id) {
            return res.status(400).json({ message: "Cannot follow yourself" });
        }

        const targetUser = await User.findById(req.params.id);
        const currentUser = await User.findById(req.user.id);

        if (!targetUser) return res.status(404).json({ message: "User not found" });

        // Add to following/followers if not already present
        if (!targetUser.followers.includes(req.user.id)) {
            await targetUser.updateOne({ $push: { followers: req.user.id } });
            await currentUser.updateOne({ $push: { following: req.params.id } });
            res.json({ message: "Followed successfully" });
        } else {
            res.status(400).json({ message: "Already following" });
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Unfollow a User
router.put('/unfollow/:id', auth, async (req, res) => {
    try {
        const targetUser = await User.findById(req.params.id);
        const currentUser = await User.findById(req.user.id);

        if (!targetUser) return res.status(404).json({ message: "User not found" });

        if (targetUser.followers.includes(req.user.id)) {
            await targetUser.updateOne({ $pull: { followers: req.user.id } });
            await currentUser.updateOne({ $pull: { following: req.params.id } });
            res.json({ message: "Unfollowed successfully" });
        } else {
            res.status(400).json({ message: "You are not following this user" });
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get Social Feed (Runs from people I follow)
router.get('/feed', auth, async (req, res) => {
    try {
        const currentUser = await User.findById(req.user.id);

        // Find runs where user is in 'following' list
        // Populate user details (name/pic) for the cards
        const feedRuns = await Run.find({
            user: { $in: currentUser.following }
        })
            .sort({ date: -1 })
            .limit(20)
            .populate('user', 'username profile.profilePicture');

        res.json(feedRuns);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
