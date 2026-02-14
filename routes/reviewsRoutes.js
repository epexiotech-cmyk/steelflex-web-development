const express = require('express');
const router = express.Router();
const controller = require('../controllers/reviewsController');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');

// Multer Setup
const uploadDir = path.join(__dirname, '../public/uploads/reviews');
fs.ensureDirSync(uploadDir);

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '-'))
});

const upload = multer({ storage });

// Admin Routes
router.get('/admin', verifyToken, isAdmin, controller.getAllReviews);

// Create: Support file uploads
router.post('/', verifyToken, isAdmin, upload.fields([
    { name: 'reviewerPhoto', maxCount: 1 },
    { name: 'companyLogo', maxCount: 1 },
    { name: 'reviewImages', maxCount: 5 }
]), controller.createReview);

// Update: Support file uploads + status
router.put('/:id', verifyToken, isAdmin, upload.fields([
    { name: 'reviewerPhoto', maxCount: 1 },
    { name: 'companyLogo', maxCount: 1 },
    { name: 'reviewImages', maxCount: 5 }
]), controller.updateReview);

router.delete('/:id', verifyToken, isAdmin, controller.deleteReview);

// Public Route (Filtered)
router.get('/', controller.getAllReviews);

module.exports = router;
