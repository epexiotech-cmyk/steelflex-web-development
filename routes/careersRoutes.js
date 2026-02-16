const express = require('express');
const router = express.Router();
const controller = require('../controllers/careersController');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');

// Multer Config
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../public/uploads/cvs'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Public - Submit Application
router.post('/apply', upload.single('cv'), controller.submitApplication);

// Admin - View/Update/Delete
router.get('/admin', verifyToken, isAdmin, controller.getAllApplications);
router.patch('/admin/:id/status', verifyToken, isAdmin, controller.updateStatus);
router.delete('/admin/:id', verifyToken, isAdmin, controller.deleteApplication);

module.exports = router;
