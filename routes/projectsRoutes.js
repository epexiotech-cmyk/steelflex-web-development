const express = require('express');
const router = express.Router();
const controller = require('../controllers/projectsController');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');

// Multer Config
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../public/uploads/projects'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Routes
router.get('/', controller.getAllProjects); // Public view

// Admin routes
router.post('/', verifyToken, isAdmin, upload.array('images', 27), controller.createProject);
router.put('/:id', verifyToken, isAdmin, upload.array('images', 27), controller.updateProject);
router.delete('/:id', verifyToken, isAdmin, controller.deleteProject);

module.exports = router;
