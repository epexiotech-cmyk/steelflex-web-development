const express = require('express');
const router = express.Router();
const controller = require('../controllers/reviewsController');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');

// Multer Config specifically for reviews
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../public/uploads/reviews'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Public routes for website to submit and view
router.post('/', upload.fields([
    { name: 'reviewerPhoto', maxCount: 1 },
    { name: 'companyLogo', maxCount: 1 },
    { name: 'projectImages', maxCount: 10 }
]), controller.createReview);

router.get('/accepted', controller.getAcceptedReviews);

// Admin routes
router.use('/', verifyToken, isAdmin); // Protect all below routes
router.get('/', controller.getAllReviews); // GET /api/reviews
router.put('/:id', controller.updateReviewStatus); // PUT /api/reviews/:id
router.delete('/:id', controller.deleteReview); // DELETE /api/reviews/:id

// For fallback references from admin app.js if any
router.get('/admin', controller.getAllReviews);

module.exports = router;
