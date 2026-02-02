const express = require('express');
const router = express.Router();
const controller = require('../controllers/contactController');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');

// Public route for website to submit
router.post('/', controller.createQuery);

// Admin routes
router.use('/admin', verifyToken, isAdmin);
router.get('/admin', controller.getAllQueries);
router.put('/admin/:id/read', controller.markAsRead);
router.delete('/admin/:id', controller.deleteQuery);

module.exports = router;
