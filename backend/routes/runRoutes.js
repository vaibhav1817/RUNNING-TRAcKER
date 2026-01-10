const express = require('express');
const { check, validationResult } = require('express-validator');
const router = express.Router();
const Run = require('../models/Run');
const auth = require('../middleware/auth');

// Get user's best run (fastest pace)
router.get('/best', auth, async (req, res) => {
    try {
        // Find runs with distance > 0.5km to avoid noise
        // Sort by pace (ascending -> lower is faster)
        const bestRun = await Run.findOne({
            user: req.user.id,
            distance: { $gt: 0.5 },
            deleted: { $ne: true }
        }).sort({ pace: 1 });

        if (!bestRun) {
            return res.status(404).json({ message: 'No runs found for ghost mode' });
        }
        res.json(bestRun);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get all runs (belonging to logged in user)
router.get('/', auth, async (req, res) => {
    try {
        const runs = await Run.find({ user: req.user.id, deleted: { $ne: true } }).sort({ date: -1 });
        res.json(runs);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

const fs = require('fs');

// Save a run
router.post('/', [
    auth,
    check('distance', 'Distance must be positive').isFloat({ min: 0 }),
    check('time', 'Time must be positive').isInt({ min: 0 }),
    check('pace', 'Pace is required').exists(),
    check('calories', 'Calories must be numeric').isNumeric()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const errorMsg = JSON.stringify(errors.array());
            fs.appendFileSync('backend/error.log', `[${new Date().toISOString()}] Validation Error: ${errorMsg}\n`);
            console.error("Validation Errors:", errors.array());
            return res.status(400).json({ errors: errors.array() });
        }

        console.log("Saving run for user:", req.user.id);
        const payloadSize = JSON.stringify(req.body).length;
        console.log("Saving run for user:", req.user.id);
        console.log("Run data payload size:", payloadSize);

        const run = new Run({
            user: req.user.id,
            time: req.body.time,
            distance: req.body.distance,
            pace: req.body.pace,
            calories: req.body.calories,
            path: req.body.path, // Pass full path
            date: req.body.date || Date.now()
        });

        const newRun = await run.save();
        console.log("Run saved successfully", newRun._id);
        res.status(201).json(newRun);
    } catch (err) {
        console.error("CRASH SAVING RUN:", err);
        console.error(err.stack);
        res.status(500).json({ message: "Server Error: " + err.message });
    }
});

// 🔹 TOGGLE LIKE
router.put('/:id/like', auth, async (req, res) => {
    try {
        const run = await Run.findById(req.params.id);
        if (!run) return res.status(404).json({ message: 'Run not found' });

        // Check if user already liked
        if (run.likes.includes(req.user.id)) {
            // Unlike
            await run.updateOne({ $pull: { likes: req.user.id } });
            res.json({ message: "Unliked", liked: false });
        } else {
            // Like
            await run.updateOne({ $push: { likes: req.user.id } });
            res.json({ message: "Liked", liked: true });
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 🔹 ADD COMMENT
router.post('/:id/comment', auth, async (req, res) => {
    try {
        if (!req.body.text) return res.status(400).json({ message: "Text required" });

        const run = await Run.findById(req.params.id);
        if (!run) return res.status(404).json({ message: 'Run not found' });

        const newComment = {
            user: req.user.id,
            text: req.body.text
        };

        await run.updateOne({ $push: { comments: newComment } });

        // Return full comments with populated user for immediate UI update
        const updatedRun = await Run.findById(req.params.id)
            .populate('comments.user', 'username profile.profilePicture');

        res.json(updatedRun.comments);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Delete a run
router.delete('/:id', auth, async (req, res) => {
    try {
        const run = await Run.findById(req.params.id);
        if (!run) return res.status(404).json({ message: 'Run not found' });

        // Check user
        if (run.user.toString() !== req.user.id) {
            return res.status(401).json({ message: 'User not authorized' });
        }

        // Soft Delete
        run.deleted = true;
        await run.save();

        res.json({ message: 'Run moved to trash' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 🔹 GET TRASH (Deleted Runs)
router.get('/history/trash', auth, async (req, res) => {
    try {
        const runs = await Run.find({ user: req.user.id, deleted: true }).sort({ date: -1 });
        res.json(runs);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 🔹 RESTORE RUN
router.put('/:id/restore', auth, async (req, res) => {
    try {
        const run = await Run.findById(req.params.id);
        if (!run) return res.status(404).json({ message: 'Run not found' });

        if (run.user.toString() !== req.user.id) {
            return res.status(401).json({ message: 'User not authorized' });
        }

        run.deleted = false;
        await run.save();
        res.json(run);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @route   PUT api/runs/:id/post
// @desc    Update run caption / post status
// @access  Private
router.put('/:id/post', auth, async (req, res) => {
    try {
        const { caption } = req.body;
        const run = await Run.findById(req.params.id);

        if (!run) return res.status(404).json({ message: 'Run not found' });
        if (run.user.toString() !== req.user.id) {
            return res.status(401).json({ message: 'User not authorized' });
        }

        run.caption = caption;
        run.isPosted = true; // Ensure it's posted
        await run.save();

        res.json(run);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 🔹 PERMANENT DELETE (Single Run)
router.delete('/:id/permanent', auth, async (req, res) => {
    try {
        const run = await Run.findById(req.params.id);
        if (!run) return res.status(404).json({ message: 'Run not found' });

        if (run.user.toString() !== req.user.id) {
            return res.status(401).json({ message: 'User not authorized' });
        }

        await Run.findByIdAndDelete(req.params.id);
        res.json({ message: 'Run permanently deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Delete all runs for the user
router.delete('/', auth, async (req, res) => {
    try {
        await Run.deleteMany({ user: req.user.id });
        res.json({ message: 'All runs deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
