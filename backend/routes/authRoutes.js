const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Run = require('../models/Run');
const auth = require('../middleware/auth');

const cryptoRandomString = require('crypto-random-string');

// @route   POST api/auth/forgot-password
// @desc    Request password reset (generates token)
// @access  Public
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const token = cryptoRandomString({ length: 32, type: 'url-safe' });
        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

        await user.save();

        console.log('--------------------------------------------------');
        console.log(`PASSWORD RESET LINK FOR ${email}:`);
        console.log(`http://localhost:5173/#/reset-password/${token}`);
        console.log('--------------------------------------------------');

        res.json({ message: 'Reset link logged to server console (Simulated Email)' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST api/auth/reset-password
// @desc    Reset password using token
// @access  Public
router.post('/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;
    try {
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired token' });
        }

        // Encrypt new password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);

        // Clear reset tokens
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;

        await user.save();

        res.json({ message: 'Password reset successful' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error' });
    }
});

const { check, validationResult } = require('express-validator');

// ... (imports remain)

// @route   POST api/auth/register
// @desc    Register user
// @access  Public
router.post('/register', [
    check('username', 'Username is required').not().isEmpty(),
    check('email', 'Please include a valid email').isEmail(),
    check('password')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
        .matches(/\d/).withMessage('Password must contain a number')
        .matches(/[a-zA-Z]/).withMessage('Password must contain a letter')
], async (req, res) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, password } = req.body;

    try {
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ message: 'User already exists' });
        }

        user = new User({ username, email, password });

        // Encrypt password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        await user.save();

        // Return JWT
        const payload = { user: { id: user.id } };
        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: 360000 }, (err, token) => {
            if (err) throw err;
            res.json({ token, user: { id: user.id, username: user.username, email: user.email } });
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error: ' + err.message });
    }
});

// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        let user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid Credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid Credentials' });
        }

        const payload = { user: { id: user.id } };
        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: 360000 }, (err, token) => {
            if (err) throw err;
            res.json({ token, user: { id: user.id, username: user.username, email: user.email } });
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error: ' + err.message });
    }
});

// @route   GET api/auth/user
// @desc    Get logged in user
// @access  Private
router.get('/user', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
            .select('-password')
            .populate('followers', 'username profile.profilePicture')
            .populate('following', 'username profile.profilePicture');
        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/auth/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', auth, async (req, res) => {
    try {
        const { name, weight, height, dob, gender, profilePicture } = req.body;
        const user = await User.findById(req.user.id);

        if (!user) return res.status(404).json({ message: 'User not found' });

        // Update fields
        if (name) user.username = name;
        if (weight) user.profile.weight = weight;
        if (height) user.profile.height = height;
        if (dob) user.profile.dob = dob;
        if (gender) user.profile.gender = gender;
        if (profilePicture !== undefined) user.profile.profilePicture = profilePicture;

        await user.save();
        res.json({
            id: user.id,
            username: user.username,
            email: user.email,
            profile: user.profile
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error: ' + err.message });
    }
});

// @route   PUT api/auth/plan
// @desc    Update active training plan
// @access  Private
router.put('/plan', auth, async (req, res) => {
    try {
        const { plan } = req.body;
        const user = await User.findById(req.user.id);

        if (!user) return res.status(404).json({ message: 'User not found' });

        user.activePlan = plan;
        await user.save();
        res.json(user.activePlan);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error: ' + err.message });
    }
});

// @route   GET api/auth/search
// @desc    Search for users
// @access  Private
router.get('/search', auth, async (req, res) => {
    try {
        const query = req.query.q;
        if (!query) return res.json([]);

        // Find users matching query (regex), exclude current user
        const users = await User.find({
            username: { $regex: query, $options: 'i' },
            _id: { $ne: req.user.id }
        }).select('username profile.profilePicture followers');

        // Map to return isFollowing status
        const currentUser = await User.findById(req.user.id);
        const results = users.map(u => ({
            _id: u._id,
            username: u.username,
            profilePicture: u.profile?.profilePicture,
            isFollowing: currentUser.following.includes(u._id)
        }));

        res.json(results);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/auth/follow/:id
// @desc    Follow/Unfollow user
// @access  Private
router.put('/follow/:id', auth, async (req, res) => {
    try {
        const targetId = req.params.id;
        if (targetId === req.user.id) return res.status(400).json({ message: "Cannot follow yourself" });

        const currentUser = await User.findById(req.user.id);
        const targetUser = await User.findById(targetId);

        if (!targetUser) return res.status(404).json({ message: "User not found" });

        // Check if already following
        if (currentUser.following.includes(targetId)) {
            // Unfollow
            currentUser.following = currentUser.following.filter(id => id.toString() !== targetId);
            targetUser.followers = targetUser.followers.filter(id => id.toString() !== req.user.id);
            await currentUser.save();
            await targetUser.save();
            res.json({ message: "Unfollowed", isFollowing: false });
        } else {
            // Follow
            currentUser.following.push(targetId);
            targetUser.followers.push(req.user.id);
            await currentUser.save();
            await targetUser.save();
            res.json({ message: "Followed", isFollowing: true });
        }
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE api/auth/delete
// @desc    Delete user and all associated data
// @access  Private
router.delete('/delete', auth, async (req, res) => {
    try {
        // Delete all runs by this user
        await Run.deleteMany({ user: req.user.id });

        // Delete the user
        await User.findByIdAndDelete(req.user.id);

        res.json({ message: 'User and all data deleted successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error: ' + err.message });
    }
});

module.exports = router;
