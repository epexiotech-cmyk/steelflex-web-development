const express = require('express');
const router = express.Router();
const controller = require('../controllers/reviewsController');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');

router.get('/', controller.getAllReviews); // Public or Protected? Usually public for site, but this is admin API.
// If this API is ONLY for Admin Panel, then protect it.
// If the website also consumes this, we might need a separate public route.
// Assuming this is the Admin API based on user prompt "Modules to Implement ... Admin Panel"
// We'll protect write operations. Read can be public if needed, but for Admin Panel usage, we expect auth.

router.get('/admin', verifyToken, isAdmin, controller.getAllReviews); // Admin View
router.post('/', verifyToken, isAdmin, controller.createReview);
router.put('/:id', verifyToken, isAdmin, controller.updateReview);
router.delete('/:id', verifyToken, isAdmin, controller.deleteReview);

module.exports = router;
