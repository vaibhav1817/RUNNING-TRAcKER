const mongoose = require('mongoose');

const RunSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    date: { type: Date, default: Date.now },
    time: { type: Number, required: true }, // in seconds
    distance: { type: Number, required: true }, // in km
    pace: { type: String }, // formated string or number
    calories: { type: Number },
    path: [
        {
            lat: Number,
            lng: Number
        }
    ],
    // 🔹 Social Features
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    comments: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        text: { type: String, required: true },
        date: { type: Date, default: Date.now }
    }],
    deleted: { type: Boolean, default: false },
    caption: { type: String, default: "" },
    isPosted: { type: Boolean, default: false } // Manual post only
});

module.exports = mongoose.model('Run', RunSchema);
