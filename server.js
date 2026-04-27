require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const sharp = require('sharp');
const AdmZip = require('adm-zip');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'steelflex-secure-key';


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
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// Static files
app.use(express.static(path.join(__dirname, 'dist')));
app.use('/assets', express.static(path.join(__dirname, 'dist/assets')));

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
    // No strict limit for backups, but we still filter for security
    fileFilter: (req, file, cb) => {
        const isCareer = req.query.context === 'career';
        const isImage = file.mimetype.startsWith("image/");
        const isDoc = [
            "application/pdf", 
            "application/msword", 
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ].includes(file.mimetype);

        const isBackup = file.fieldname === 'backup';
        const isZip = file.mimetype === 'application/zip' || 
                      file.mimetype === 'application/x-zip-compressed' ||
                      file.originalname.toLowerCase().endsWith('.zip');

        if (isImage || (isBackup && isZip)) {
            cb(null, true);
        } else if (isCareer && isDoc) {
            cb(null, true);
        } else {
            const msg = isBackup ? "Only ZIP files allowed for backup" : 
                       (isCareer ? "Only images and PDF/DOC files allowed" : "Only images allowed");
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

// --- BACKUP TRIGGERS (Must be before SPA fallback) ---
const { performCloudBackup } = require('./src/services/cronService');
const { getLatestStatus } = require('./src/services/backupLogService');

// External trigger for VPS cron (localhost only)
app.get('/admin/backup-now', async (req, res) => {
    const remoteIp = req.ip || req.connection.remoteAddress;
    const isLocal = remoteIp === '127.0.0.1' || remoteIp === '::1' || remoteIp === '::ffff:127.0.0.1';

    if (!isLocal) {
        return res.status(403).json({ error: 'Forbidden', message: 'External triggers only allowed from localhost' });
    }

    try {
        console.log('⚡ External backup trigger received');
        const result = await performCloudBackup();
        res.json({ success: true, message: 'Backup process completed', result });
    } catch (error) {
        res.status(500).json({ error: 'Backup trigger failed', message: error.message });
    }
});

app.get('/api/admin/backup/status', async (req, res) => {
    try {
        const status = await getLatestStatus();
        res.json({ success: true, status });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch backup status' });
    }
});





// --- API COMPATIBILITY & DATA ROUTES ---

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

// Real Login for Admin
app.post('/api/auth/login', async (req, res) => {
    const { userId, password } = req.body;
    const filePath = getDataFilePath('users');
    
    try {
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Users data not found' });
        }

        const users = JSON.parse(fs.readFileSync(filePath, 'utf8') || '[]');
        const user = users.find(u => u.userId === userId);

        if (!user) {
            return res.status(401).json({ error: 'Invalid User ID' });
        }

        // Check password (handle both hashed and plain text)
        let isValid = false;
        if (user.password.startsWith('$2b$')) {
            const bcrypt = require('bcrypt');
            isValid = await bcrypt.compare(password, user.password);
        } else {
            isValid = (password === user.password);
        }

        if (isValid) {
            const userData = { ...user };
            delete userData.password;
            const accessToken = jwt.sign(
                { id: user.id, userId: user.userId, role: user.role },
                JWT_SECRET,
                { expiresIn: '24h' }
            );
            res.json({
                ...userData,
                accessToken
            });
        } else {
            res.status(401).json({ error: 'Invalid Password' });
        }
    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Helper for data fetching
async function handleDataGet(type, res) {
    const filePath = getDataFilePath(type);
    if (!fs.existsSync(filePath)) return res.json([]);
    try {
        const data = await fs.promises.readFile(filePath, 'utf8');
        res.json(JSON.parse(data || '[]'));
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

// 1. Handle legacy routes (e.g. /api/users)
app.get('/api/users', (req, res) => handleDataGet('users', res));
app.get('/api/projects', (req, res) => handleDataGet('projects', res));
app.get('/api/reviews', (req, res) => handleDataGet('reviews', res));
app.get('/api/contact/admin', (req, res) => handleDataGet('contact', res));
app.get('/api/careers/admin', (req, res) => handleDataGet('careers', res));

// 2. Handle new data routes (e.g. /api/data/users)
app.get('/api/data/:type', (req, res) => handleDataGet(req.params.type, res));

// 3. Handle Mutations
app.post(['/api/data/:type', '/api/:type'], async (req, res) => {
    const type = req.params.type;
    const filePath = getDataFilePath(type);
    try {
        let items = [];
        if (fs.existsSync(filePath)) {
            items = JSON.parse(fs.readFileSync(filePath, 'utf8') || '[]');
        }
        
        // Harden Data: Assign essential fields if missing
        const newItem = { ...req.body };
        if (!newItem.id) {
            newItem.id = Date.now().toString() + Math.random().toString(36).substring(2, 9);
        }
        if (!newItem.createdAt && !newItem.date) {
            newItem.createdAt = new Date().toISOString();
        }
        if (!newItem.status && type === 'careers') {
            newItem.status = 'New';
        }
        
        items.push(newItem);
        fs.writeFileSync(filePath, JSON.stringify(items, null, 2));
        res.json({ success: true, item: newItem });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.put(['/api/data/:type/:id', '/api/:type/:id'], async (req, res) => {
    const type = req.params.type;
    const filePath = getDataFilePath(type);
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

app.delete(['/api/data/:type/:id', '/api/:type/:id'], async (req, res) => {
    const type = req.params.type;
    const filePath = getDataFilePath(type);
    try {
        if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Data not found' });
        let items = JSON.parse(fs.readFileSync(filePath, 'utf8') || '[]');
        items = items.filter(i => i.id != req.params.id);
        fs.writeFileSync(filePath, JSON.stringify(items, null, 2));
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});


// --- MAINTENANCE ROUTES ---
app.post('/api/admin/maintenance/clear', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
    
    try {
        const token = authHeader.split(' ')[1];
        let decoded;
        try {
            decoded = jwt.verify(token, JWT_SECRET);
        } catch (e) {
            return res.status(401).json({ error: 'Session invalid or expired. Please logout and login again.' });
        }
        
        if (decoded.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ error: 'Access denied. Super Admin only.' });
        }

        const { types } = req.body;
        if (!types || !Array.isArray(types)) {
            return res.status(400).json({ error: 'Invalid types provided' });
        }

        const results = {};

        for (const type of types) {
            const filePath = getDataFilePath(type);
            
            // 1. Handle File Deletions for specific types
            if (type === 'projects') {
                const folders = [
                    path.join(__dirname, "uploads", "optimized"),
                    path.join(__dirname, "uploads", "thumbs")
                ];
                folders.forEach(folder => {
                    if (fs.existsSync(folder)) {
                        const files = fs.readdirSync(folder);
                        for (const file of files) {
                            if (file !== '.gitkeep') {
                                try {
                                    fs.unlinkSync(path.join(folder, file));
                                } catch (e) {
                                    console.error(`Failed to delete ${file}:`, e.message);
                                }
                            }
                        }
                    }
                });
            }

            // 2. Clear JSON Data
            if (fs.existsSync(filePath)) {
                if (type === 'users') {
                    // Protect ALL Super Admin users
                    const users = JSON.parse(fs.readFileSync(filePath, 'utf8') || '[]');
                    const adminsToKeep = users.filter(u => u.role === 'SUPER_ADMIN');
                    
                    // Fallback: If for some reason no Super Admin is found (shouldn't happen), keep at least the current one from the token
                    if (adminsToKeep.length === 0 && decoded) {
                        const currentUser = users.find(u => u.id === decoded.id);
                        if (currentUser) adminsToKeep.push(currentUser);
                    }

                    fs.writeFileSync(filePath, JSON.stringify(adminsToKeep, null, 2));
                    results[type] = `Cleared (preserved ${adminsToKeep.length} Super Admin(s))`;
                } else {
                    fs.writeFileSync(filePath, JSON.stringify([], null, 2));
                    results[type] = 'Cleared';
                }
            }
        }

        res.json({ success: true, results });
    } catch (err) {
        console.error('Maintenance Clear Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// --- BACKUP ROUTE ---
const { createBackupZip } = require('./src/utils/backupUtil');

app.get('/api/admin/backup', async (req, res) => {
    try {
        const buffer = await createBackupZip();
        const now = new Date();
        const pad = (num) => String(num).padStart(2, '0');
        const fileName = `backup-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}-${pad(now.getMinutes())}.zip`;

        res.set({
            'Content-Type': 'application/zip',
            'Content-Disposition': `attachment; filename="${fileName}"`,
            'Content-Length': buffer.length
        });

        res.send(buffer);
    } catch (error) {
        console.error('Backup generation failed:', error);
        res.status(500).json({ error: 'Failed to create backup', message: error.message });
    }
});

const { listBackups, downloadFile } = require('./src/services/googleDriveService');

// Helper to handle the actual restoration logic
async function processRestore(zipPath, res) {
    try {
        const zip = new AdmZip(zipPath);

        // Safety: Internal backup before restore
        try {
            const safetyZip = new AdmZip();
            const dataDir = path.join(__dirname, 'public/data');
            if (fs.existsSync(dataDir)) safetyZip.addLocalFolder(dataDir, 'public/data');
            const safetyPath = path.join(__dirname, 'backups', `pre-restore-${Date.now()}.zip`);
            if (!fs.existsSync(path.join(__dirname, 'backups'))) fs.mkdirSync(path.join(__dirname, 'backups'));
            safetyZip.writeZip(safetyPath);
        } catch (e) {
            console.warn('Safety backup failed, proceeding with restore anyway:', e);
        }

        // Extract ZIP - true means overwrite
        zip.extractAllTo(__dirname, true);

        // Cleanup temp file
        if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);

        const restoredFolders = [];
        if (fs.existsSync(path.join(__dirname, 'public/data'))) restoredFolders.push('Database JSONs');
        if (fs.existsSync(path.join(__dirname, 'uploads'))) restoredFolders.push('Processed Media');
        if (fs.existsSync(path.join(__dirname, 'public/uploads'))) restoredFolders.push('Project & Career Assets');

        res.json({ 
            success: true, 
            message: 'Data restored successfully',
            summary: restoredFolders
        });
    } catch (error) {
        console.error('Restore Processing Error:', error);
        if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
        res.status(500).json({ error: 'Failed to process restore', message: error.message });
    }
}

app.get('/api/admin/backup/cloud/list', async (req, res) => {
    try {
        const { date } = req.query;
        const backups = await listBackups(30, date);
        res.json({ success: true, backups });
    } catch (error) {
        res.status(500).json({ error: 'Failed to list cloud backups', message: error.message });
    }
});

app.post('/api/admin/backup/cloud/restore/:fileId', async (req, res) => {
    const tempPath = path.join(__dirname, 'uploads', 'temp', `cloud-restore-${Date.now()}.zip`);
    try {
        const fileId = req.params.fileId;
        await downloadFile(fileId, tempPath);
        await processRestore(tempPath, res);
    } catch (error) {
        console.error('Cloud Restore Error:', error);
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        res.status(500).json({ error: 'Failed to restore from cloud', message: error.message });
    }
});

app.post('/api/admin/backup/restore', upload.single('backup'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No backup file uploaded' });
    }
    await processRestore(req.file.path, res);
});

const { initCron } = require('./src/services/cronService');

app.post('/api/admin/backup/cloud', async (req, res) => {
    try {
        const result = await performCloudBackup();
        if (result.success) {
            res.json({ success: true, message: 'Backup uploaded to Google Drive successfully', fileName: result.fileName });
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('Cloud backup trigger failed:', error);
        res.status(500).json({ error: 'Failed to sync with Google Drive', message: error.message });
    }
});

// 3. Admin panel
app.get(/^\/admin($|\/)/, (req, res) => {
    res.sendFile(path.join(__dirname, 'dist/admin', 'index.html'));
});

// 4. Root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// 5. Clean page routing (LAST)
app.get('/:page', (req, res) => {
    const page = req.params.page;

    // Ignore API routes
    if (page.startsWith('api')) {
        return res.status(404).end();
    }

    // Handle admin panel
    if (page === 'admin') {
        return res.sendFile(path.join(__dirname, 'dist/admin', 'index.html'));
    }

    const filePath = path.join(__dirname, 'dist', `${page}.html`);

    if (fs.existsSync(filePath)) {
        return res.sendFile(filePath);
    }

    // fallback to homepage
    return res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

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

        // Initialize Backup Scheduler
        initCron();

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
