require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');


const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

const uploadDir = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

app.use("/uploads", express.static(uploadDir));

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueName = Date.now() + "-" + file.originalname;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Legacy REST Routes Removed - Now using LocalStorage/Static fallback

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
        const dirsToCreate = [
            path.join(__dirname, 'data'),
            path.join(__dirname, 'public/uploads/projects'),
            path.join(__dirname, 'public/uploads/cvs'),
            path.join(__dirname, 'public/uploads/reviews')
        ];
        dirsToCreate.forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });

        // Initialize JSON files if they don't exist
        const initFile = async (filePath, defaultData) => {
            if (!fs.existsSync(filePath)) {
                fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
                console.log(`Created ${filePath}`);
            }
        };

        await initFile(path.join(__dirname, 'data/users.json'), []);
        await initFile(path.join(__dirname, 'data/reviews.json'), []);
        await initFile(path.join(__dirname, 'data/contact_queries.json'), []);
        await initFile(path.join(__dirname, 'data/projects.json'), []);
        await initFile(path.join(__dirname, 'data/careers.json'), []);

        // Legacy backups and seeders removed for static mode

        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
        });
    } catch (err) {
        console.error('Failed to start server:', err);
    }
}

app.use((err, req, res, next) => {
    console.error("Global Error:", err);
    res.status(500).json({ error: "Server error occurred", message: err.message, stack: err.stack });
});

startServer();
