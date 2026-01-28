require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Database Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.error('MongoDB Connection Error:', err));

// Routes
const runRoutes = require('./routes/runRoutes');
const authRoutes = require('./routes/authRoutes');
const communityRoutes = require('./routes/communityRoutes');
const userRoutes = require('./routes/userRoutes');

app.use('/api/runs', runRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/users', userRoutes);

const path = require('path');

// Serve Static Assets in Production
if (process.env.NODE_ENV === 'production') {
    const distPath = path.join(__dirname, '../dist');
    console.log('Serving static files from:', distPath);

    // Set static folder
    app.use(express.static(distPath));

    // Fallback: serve index.html for any route not handled above (SPA support)
    app.use((req, res, next) => {
        // Skip API routes
        if (req.path.startsWith('/api')) {
            return res.status(404).json({ error: 'API endpoint not found' });
        }

        // Skip requests for static files (they should be handled by express.static)
        // If a file request reaches here, it means the file doesn't exist
        const hasExtension = /\.[a-zA-Z0-9]+$/.test(req.path);
        if (hasExtension) {
            // Don't serve index.html for missing static files - return 404 instead
            return res.status(404).send('File not found');
        }

        // For all other routes (SPA client-side routes), serve index.html
        res.sendFile(path.resolve(distPath, 'index.html'));
    });
} else {
    app.get('/', (req, res) => {
        res.json({ message: "Welcome to the Running Tracker API (Dev Mode)" });
    });
}

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
