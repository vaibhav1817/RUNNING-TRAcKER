const mongoose = require('mongoose');
const Run = require('./models/Run');

const mongoURI = "mongodb+srv://vaibhavgpatil:1817vaibhav@cluster0.conpqtt.mongodb.net/?appName=Cluster0";

mongoose.connect(mongoURI)
    .then(async () => {
        console.log('MongoDB Connected for Custom Test');

        try {
            // Create a dummy user ID (we can't check refs easily without looking up a user, but mongo usually allows random OIDs if not strictly enforcing ref integrity at app level, usually Mongoose doesn't enforce ref existence on save unless populated)
            // Actually, let's grab a real user if possible, or just generate a random ObjectId
            const randomUserId = new mongoose.Types.ObjectId();

            const newRun = new Run({
                user: randomUserId,
                time: 120,
                distance: 0.5,
                pace: "4:00",
                calories: 30,
                path: [{ lat: 12.9716, lng: 77.5946 }, { lat: 12.9717, lng: 77.5947 }],
                date: new Date()
            });

            const saved = await newRun.save();
            console.log("SUCCESS: Test Run Saved!", saved);

            // Cleanup
            await Run.findByIdAndDelete(saved._id);
            console.log("Cleanup: Deleted test run");

            process.exit(0);
        } catch (err) {
            console.error("FAILURE: Could not save run", err);
            process.exit(1);
        }
    })
    .catch(err => {
        console.error('Connection Error:', err);
        process.exit(1);
    });
