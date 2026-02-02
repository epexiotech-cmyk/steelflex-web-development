require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs-extra');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const reviewsRoutes = require('./routes/reviewsRoutes');
const contactRoutes = require('./routes/contactRoutes');
const projectsRoutes = require('./routes/projectsRoutes');
const careersRoutes = require('./routes/careersRoutes');
const seedSuperAdmin = require('./utils/seeder');

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/careers', careersRoutes);

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

// Serve Admin Panel (SPA fallback for admin routes)
app.get(/^\/admin($|\/)/, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
async function startServer() {
    try {
        // Ensure data directories exist
        await fs.ensureDir(path.join(__dirname, 'data'));
        await fs.ensureDir(path.join(__dirname, 'public/uploads/projects'));
        await fs.ensureDir(path.join(__dirname, 'public/uploads/cvs'));

        // Initialize JSON files if they don't exist
        const initFile = async (filePath, defaultData) => {
            if (!(await fs.pathExists(filePath))) {
                await fs.writeJson(filePath, defaultData, { spaces: 2 });
                console.log(`Created ${filePath}`);
            }
        };

        await initFile(path.join(__dirname, 'data/users.json'), []);
        await initFile(path.join(__dirname, 'data/reviews.json'), []);
        await initFile(path.join(__dirname, 'data/contact_queries.json'), []);
        await initFile(path.join(__dirname, 'data/projects.json'), []);
        await initFile(path.join(__dirname, 'data/careers.json'), []);

        // Seed Super Admin
        await seedSuperAdmin();


        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
        });
    } catch (err) {
        console.error('Failed to start server:', err);
    }
}

startServer();
