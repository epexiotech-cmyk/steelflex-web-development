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

// --- NEW DATA API ROUTES ---
const apiRouter = express.Router();
app.use('/api/data', apiRouter);

const getDataFilePath = (type) => {
    const fileMap = {
        'reviews': 'reviews.json',
        'contact': 'contact_queries.json',
        'projects': 'projects.json',
        'careers': 'careers.json',
        'vacancies': 'vacancies.json',
        'users': 'users.json'
    };
    return path.join(__dirname, 'public/data', fileMap[type] || `${type}.json`);
};

apiRouter.get('/:type', async (req, res) => {
    const filePath = getDataFilePath(req.params.type);
    if (!fs.existsSync(filePath)) return res.json([]);
    try {
        const data = await fs.promises.readFile(filePath, 'utf8');
        res.json(JSON.parse(data || '[]'));
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

apiRouter.post('/:type', async (req, res) => {
    const filePath = getDataFilePath(req.params.type);
    try {
        let items = [];
        if (fs.existsSync(filePath)) {
            items = JSON.parse(fs.readFileSync(filePath, 'utf8') || '[]');
        }
        items.push(req.body);
        fs.writeFileSync(filePath, JSON.stringify(items, null, 2));
        res.json({ success: true, item: req.body });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

apiRouter.put('/:type/:id', async (req, res) => {
    const filePath = getDataFilePath(req.params.type);
    try {
        if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Data not found' });
        let items = JSON.parse(fs.readFileSync(filePath, 'utf8') || '[]');
        const index = items.findIndex(i => i.id == req.params.id);
        if (index !== -1) items[index] = { ...items[index], ...req.body, updatedAt: new Date().toISOString() };
        fs.writeFileSync(filePath, JSON.stringify(items, null, 2));
        res.json({ success: true, item: items[index] });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

apiRouter.delete('/:type/:id', async (req, res) => {
    const filePath = getDataFilePath(req.params.type);
    try {
        if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Data not found' });
        let items = JSON.parse(fs.readFileSync(filePath, 'utf8') || '[]');
        items = items.filter(i => i.id != req.params.id);
        fs.writeFileSync(filePath, JSON.stringify(items, null, 2));
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});
// ----------------------------


// Start Server
async function startServer() {
    try {
        // Ensure upload directories exist
        const dirsToCreate = [
            path.join(__dirname, 'public/data'),
            path.join(__dirname, 'public/uploads/projects'),
            path.join(__dirname, 'public/uploads/cvs'),
            path.join(__dirname, 'public/uploads/reviews')
        ];
        dirsToCreate.forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });

        // Legacy JSON file initialization removed for static mode
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
