const express = require('express');
const router = express.Router();
const controller = require('../controllers/contactController');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');

// Public route for website to submit
router.post('/', controller.createQuery);

// Admin routes
router.use('/', verifyToken, isAdmin); // Protect all other routes
router.get('/', controller.getAllQueries); // GET /api/contact
router.patch('/:id/read', controller.markAsRead); // PATCH /api/contact/:id/read
router.delete('/:id', controller.deleteQuery); // DELETE /api/contact/:id

// Keep old admin routes for backward compatibility if needed, or remove. 
// User asked for GET /api/contact, so the above covers it.
// The app.js might still be calling /admin, so we can alias or update app.js.
// Let's aliasing for safety:
router.get('/admin', controller.getAllQueries);
router.put('/admin/:id/read', controller.markAsRead);
router.delete('/admin/:id', controller.deleteQuery);

module.exports = router;
