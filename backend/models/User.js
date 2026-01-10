const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    profile: {
        weight: { type: Number, default: 70 },
        height: { type: Number, default: 175 },
        dob: { type: String, default: "2000-01-01" },
        gender: { type: String, default: "Prefer not to say" },
        profilePicture: { type: String, default: "" }
    },
    activePlan: { type: mongoose.Schema.Types.Mixed, default: null },
    shoes: [{
        name: { type: String, required: true },
        distance: { type: Number, default: 0 },
        target: { type: Number, default: 800 }, // Default ~500 miles/800km
        active: { type: Boolean, default: true }
    }],
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date }
});

module.exports = mongoose.model('User', UserSchema);
