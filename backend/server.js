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

    // Root route - serve index.html (Express 5's {*path} doesn't match '/')
    app.get('/', (req, res) => {
        console.log('Serving index.html for root path');
        res.sendFile(path.resolve(distPath, 'index.html'));
    });

    // Handle React routing - return index.html for all non-API routes
    // Express 5 requires named parameters for wildcards: {*path}
    app.get('/{*path}', (req, res) => {
        // Don't serve index.html for API routes
        if (req.path.startsWith('/api')) {
            return res.status(404).json({ error: 'API endpoint not found' });
        }
        console.log('Serving index.html for path:', req.path);
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
