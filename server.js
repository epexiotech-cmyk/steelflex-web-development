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
const DIST_PATH = path.resolve(__dirname, 'dist');

// --- UTILS ---
function slugify(text) {
    if (!text) return "";
    return text.toString().toLowerCase().replace(/\s+/g, "-").replace(/[^\w\-]+/g, "").replace(/\-\-+/g, "-").trim();
}

function generateSeoName(data, ext) {
    const project = slugify(data.project || "project");
    const category = slugify(data.category || "steel-structure");
    const location = slugify(data.location || "india");
    const uniqueId = Date.now() + "-" + Math.floor(Math.random() * 1000);
    return `${project}-${category}-${location}-${uniqueId}${ext}`;
}

// --- GLOBAL MIDDLEWARES ---
app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// Debug Middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// --- CRITICAL DEBUG ROUTE ---
app.get('/ping-debug', (req, res) => {
    res.send('PONG - SERVER IS RUNNING LATEST CODE (V1.3)');
});

// --- API ROUTES ---

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date(), version: '1.3.0' });
});

const getDataFilePath = (type) => {
    const fileMap = { 'reviews': 'reviews.json', 'contact': 'contact_queries.json', 'projects': 'projects.json', 'careers': 'careers.json', 'vacancies': 'vacancies.json', 'users': 'users.json' };
    return path.join(__dirname, 'public/data', fileMap[type] || `${type}.json`);
};

app.post('/api/auth/login', async (req, res) => {
    const { userId, password } = req.body;
    const filePath = getDataFilePath('users');
    try {
        if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Users data not found' });
        const users = JSON.parse(fs.readFileSync(filePath, 'utf8') || '[]');
        const user = users.find(u => u.userId === userId);
        if (!user) return res.status(401).json({ error: 'Invalid User ID' });
        let isValid = false;
        if (user.password.startsWith('$2b$')) {
            const bcrypt = require('bcrypt');
            isValid = await bcrypt.compare(password, user.password);
        } else { isValid = (password === user.password); }
        if (isValid) {
            const userData = { ...user }; delete userData.password;
            const accessToken = jwt.sign({ id: user.id, userId: user.userId, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
            res.json({ ...userData, accessToken });
        } else { res.status(401).json({ error: 'Invalid Password' }); }
    } catch (error) { res.status(500).json({ error: 'Internal Error' }); }
});

async function handleDataGet(type, res) {
    const filePath = getDataFilePath(type);
    if (!fs.existsSync(filePath)) return res.json([]);
    try {
        const data = await fs.promises.readFile(filePath, 'utf8');
        res.json(JSON.parse(data || '[]'));
    } catch (e) { res.status(500).json({ error: e.message }); }
}

app.get('/api/users', (req, res) => handleDataGet('users', res));
app.get('/api/projects', (req, res) => handleDataGet('projects', res));
app.get('/api/reviews', (req, res) => handleDataGet('reviews', res));
app.get('/api/contact/admin', (req, res) => handleDataGet('contact', res));
app.get('/api/careers/admin', (req, res) => handleDataGet('careers', res));
app.get('/api/data/:type', (req, res) => handleDataGet(req.params.type, res));

app.post(['/api/data/:type', '/api/:type'], async (req, res) => {
    const type = req.params.type;
    const filePath = getDataFilePath(type);
    try {
        let items = [];
        if (fs.existsSync(filePath)) items = JSON.parse(fs.readFileSync(filePath, 'utf8') || '[]');
        const newItem = { ...req.body };
        if (!newItem.id) newItem.id = Date.now().toString() + Math.random().toString(36).substring(2, 9);
        if (!newItem.createdAt && !newItem.date) newItem.createdAt = new Date().toISOString();
        if (!newItem.status && type === 'careers') newItem.status = 'New';
        items.push(newItem);
        fs.writeFileSync(filePath, JSON.stringify(items, null, 2));
        res.json({ success: true, item: newItem });
    } catch (e) { res.status(500).json({ error: e.message }); }
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
    } catch (e) { res.status(500).json({ error: e.message }); }
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
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

const { performCloudBackup } = require('./src/services/cronService');
const { getLatestStatus } = require('./src/services/backupLogService');
const { createBackupZip } = require('./src/utils/backupUtil');
const { listBackups, downloadFile } = require('./src/services/googleDriveService');

app.post('/api/admin/maintenance/clear', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const token = authHeader.split(' ')[1];
        let decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.role !== 'SUPER_ADMIN') return res.status(403).json({ error: 'Access denied' });
        const { types } = req.body;
        const results = {};
        for (const type of types) {
            const filePath = getDataFilePath(type);
            if (type === 'projects') {
                const folders = [path.join(__dirname, "uploads", "optimized"), path.join(__dirname, "uploads", "thumbs")];
                folders.forEach(folder => { if (fs.existsSync(folder)) fs.readdirSync(folder).forEach(file => { if (file !== '.gitkeep') try { fs.unlinkSync(path.join(folder, file)); } catch (e) {} }); });
            }
            if (fs.existsSync(filePath)) {
                if (type === 'users') {
                    const users = JSON.parse(fs.readFileSync(filePath, 'utf8') || '[]');
                    const adminsToKeep = users.filter(u => u.role === 'SUPER_ADMIN');
                    fs.writeFileSync(filePath, JSON.stringify(adminsToKeep, null, 2));
                    results[type] = `Cleared (${adminsToKeep.length})`;
                } else { fs.writeFileSync(filePath, JSON.stringify([], null, 2)); results[type] = 'Cleared'; }
            }
        }
        res.json({ success: true, results });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/backup/status', async (req, res) => {
    try { res.json({ success: true, status: await getLatestStatus() }); }
    catch (error) { res.status(500).json({ error: 'Failed' }); }
});

app.get('/api/admin/backup', async (req, res) => {
    try {
        const buffer = await createBackupZip();
        const now = new Date();
        const fileName = `backup-${now.toISOString().split('T')[0]}.zip`;
        res.set({ 'Content-Type': 'application/zip', 'Content-Disposition': `attachment; filename="${fileName}"`, 'Content-Length': buffer.length });
        res.send(buffer);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

async function processRestore(zipPath, res) {
    try {
        const zip = new AdmZip(zipPath); zip.extractAllTo(__dirname, true);
        if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
        res.json({ success: true, message: 'Restored' });
    } catch (error) { res.status(500).json({ error: error.message }); }
}

app.get('/api/admin/backup/cloud/list', async (req, res) => {
    try { res.json({ success: true, backups: await listBackups(30, req.query.date) }); }
    catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/admin/backup/cloud/restore/:fileId', async (req, res) => {
    const tempPath = path.join(__dirname, 'uploads', 'temp', `cloud-restore-${Date.now()}.zip`);
    try { await downloadFile(req.params.fileId, tempPath); await processRestore(tempPath, res); }
    catch (error) { if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath); res.status(500).json({ error: error.message }); }
});

app.post('/api/admin/backup/cloud', async (req, res) => {
    try {
        const result = await performCloudBackup();
        if (result.success) res.json({ success: true, message: 'Success', fileName: result.fileName });
        else throw new Error(result.error);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// --- UPLOADS ---
const uploadDir = path.resolve(__dirname, "uploads");
const tempDir = path.join(uploadDir, "temp");
const optimizedDir = path.join(uploadDir, "optimized");
const thumbsDir = path.join(uploadDir, "thumbs");
[uploadDir, tempDir, optimizedDir, thumbsDir].forEach(dir => { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); });

app.use("/uploads", express.static(uploadDir));
const upload = multer({ dest: tempDir });

app.post("/upload", upload.single("image"), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "No file" });
        const inputPath = req.file.path;
        const isImage = req.file.mimetype.startsWith("image/");
        const isCareer = req.query.context === 'career';
        const seoData = { project: req.body.project || "general", category: req.body.category || (isCareer ? "career" : "steel-structure"), location: req.body.location || "india" };
        const outputFileName = generateSeoName(seoData, isImage ? ".webp" : path.extname(req.file.originalname));
        const projectSlug = isCareer ? "career" : slugify(seoData.project);
        const pOpt = path.join(optimizedDir, projectSlug);
        const pThm = path.join(thumbsDir, projectSlug);
        [pOpt, pThm].forEach(dir => { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); });
        if (isImage) {
            await sharp(inputPath).resize({ width: 1920, height: 1080, fit: "inside", withoutEnlargement: true }).webp({ quality: 80 }).toFile(path.join(pOpt, outputFileName));
            await sharp(inputPath).resize({ width: 400 }).webp({ quality: 70 }).toFile(path.join(pThm, outputFileName));
        } else { fs.copyFileSync(inputPath, path.join(pOpt, outputFileName)); }
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        res.json({ message: "Success", url: `/uploads/optimized/${projectSlug}/${outputFileName}`, thumbnailUrl: `/uploads/thumbs/${projectSlug}/${outputFileName}` });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// --- SERVING ---
app.use('/assets', express.static(path.join(DIST_PATH, 'assets')));
app.get(/^\/admin($|\/)/, (req, res) => res.sendFile(path.join(DIST_PATH, 'admin', 'index.html')));
app.use(express.static(DIST_PATH, { index: 'index.html' }));

app.get('/:page', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/admin') || req.path.startsWith('/ping') || req.path.includes('.')) return next();
    const possiblePaths = [path.join(DIST_PATH, req.params.page, 'index.html'), path.join(DIST_PATH, `${req.params.page}.html`)];
    for (const p of possiblePaths) { if (fs.existsSync(p)) return res.sendFile(p); }
    next();
});

// FINAL COMPATIBILITY FIX: Use regex catch-all (.*) for Express 5.x
app.get('(.*)', (req, res) => {
    const cp = path.join(DIST_PATH, 'index.html');
    if (fs.existsSync(cp)) res.sendFile(cp);
    else res.status(404).send('Not Found');
});

const { initCron } = require('./src/services/cronService');
async function startServer() {
    try {
        [path.join(__dirname, 'public/data'), path.join(__dirname, 'public/uploads/projects'), path.join(__dirname, 'public/uploads/cvs'), path.join(__dirname, 'public/uploads/reviews')].forEach(dir => { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); });
        initCron();
        app.listen(PORT, () => { console.log(`🚀 Server running on port ${PORT}`); });
    } catch (err) { console.error(err); }
}

app.use((err, req, res, next) => {
    console.error("Global Error:", err);
    res.status(500).json({ error: "Server error", message: err.message });
});
startServer();
