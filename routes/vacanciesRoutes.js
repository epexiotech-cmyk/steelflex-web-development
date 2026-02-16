const express = require('express');
const router = express.Router();
const controller = require('../controllers/vacanciesController');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');

// Public - View Vacancies
router.get('/public', controller.getPublicVacancies);
router.get('/', controller.getAllVacancies);

// Admin - Manage Vacancies
router.post('/', verifyToken, isAdmin, controller.createVacancy);
router.put('/:id', verifyToken, isAdmin, controller.updateVacancy);
router.delete('/:id', verifyToken, isAdmin, controller.deleteVacancy);
router.patch('/:id/toggle-status', verifyToken, isAdmin, controller.toggleStatus);

module.exports = router;
