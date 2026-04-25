require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const sharp = require('sharp');


const app = express();
const PORT = process.env.PORT || 3000;

// --- UTILS ---
function slugify(text) {
    if (!text) return "";
    return text
        .toString()
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^\w\-]+/g, "")
        .replace(/\-\-+/g, "-")
        .trim();
}

function generateSeoName(data, ext) {
    const project = slugify(data.project || "project");
    const category = slugify(data.category || "steel-structure");
    const location = slugify(data.location || "india");
    const uniqueId = Date.now() + "-" + Math.floor(Math.random() * 1000);

    return `${project}-${category}-${location}-${uniqueId}${ext}`;
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ limit: '15mb', extended: true }));

// Static files
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

const uploadDir = path.join(__dirname, "uploads");
const tempDir = path.join(uploadDir, "temp");
const optimizedDir = path.join(uploadDir, "optimized");
const thumbsDir = path.join(uploadDir, "thumbs");

// Ensure base upload directories exist
[uploadDir, tempDir, optimizedDir, thumbsDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

app.use("/uploads", express.static(uploadDir));

// Initial upload to temp folder with filtering
const upload = multer({ 
    dest: tempDir,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        const isCareer = req.query.context === 'career';
        const isImage = file.mimetype.startsWith("image/");
        const isDoc = [
            "application/pdf", 
            "application/msword", 
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ].includes(file.mimetype);

        if (isImage) {
            cb(null, true);
        } else if (isCareer && isDoc) {
            cb(null, true);
        } else {
            const msg = isCareer ? "Only images and PDF/DOC files allowed" : "Only images allowed";
            cb(new Error(msg));
        }
    }
});

// Post-upload optimization route
app.post("/upload", upload.single("image"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        const inputPath = req.file.path;
        const isImage = req.file.mimetype.startsWith("image/");
        const isCareer = req.query.context === 'career';
        
        // Extract SEO Data from body (if provided)
        const seoData = {
            project: req.body.project || "general",
            category: req.body.category || (isCareer ? "career" : "steel-structure"),
            location: req.body.location || "india"
        };

        const fileExt = isImage ? ".webp" : path.extname(req.file.originalname);
        const outputFileName = generateSeoName(seoData, fileExt);
        
        // Determine Project Subfolder (for non-career)
        const projectSlug = isCareer ? "career" : slugify(seoData.project);
        const projectOptimizedDir = path.join(optimizedDir, projectSlug);
        const projectThumbsDir = path.join(thumbsDir, projectSlug);

        // Ensure project directories exist
        [projectOptimizedDir, projectThumbsDir].forEach(dir => {
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        });

        const optimizedPath = path.join(projectOptimizedDir, outputFileName);
        const thumbsPath = path.join(projectThumbsDir, outputFileName);

        if (isImage) {
            // 1. Optimize Main Image
            await sharp(inputPath)
                .resize({
                    width: 1920,
                    height: 1080,
                    fit: "inside",
                    withoutEnlargement: true,
                })
                .webp({ quality: 80 })
                .toFile(optimizedPath);

            // 2. Create Thumbnail
            await sharp(inputPath)
                .resize({ width: 400 })
                .webp({ quality: 70 })
                .toFile(thumbsPath);
        } else {
            // Document: move to project subfolder (optimized dir acts as storage)
            fs.copyFileSync(inputPath, optimizedPath);
        }

        // 3. Delete original temp file
        if (fs.existsSync(inputPath)) {
            fs.unlinkSync(inputPath);
        }

        const relativeOptimizedPath = `/uploads/optimized/${projectSlug}/${outputFileName}`;
        const relativeThumbsPath = `/uploads/thumbs/${projectSlug}/${outputFileName}`;

        const responseData = {
            message: isImage ? "Uploaded, Optimized & SEO Optimized" : "Document Uploaded Successfully",
            file: outputFileName,
            url: relativeOptimizedPath,
            type: isImage ? 'image' : 'document'
        };

        if (isImage) {
            responseData.optimizedUrl = relativeOptimizedPath;
            responseData.thumbnailUrl = relativeThumbsPath;
        }

        res.json(responseData);
    } catch (error) {
        console.error("Upload/Optimization Error:", error);
        res.status(500).json({ error: error.message });
    }
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
