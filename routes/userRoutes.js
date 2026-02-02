const express = require('express');
const router = express.Router();
const controller = require('../controllers/userController');
const { verifyToken, isSuperAdmin } = require('../middleware/authMiddleware');

// All routes require Super Admin
router.use(verifyToken);
router.use(isSuperAdmin);

router.get('/', controller.getAllUsers);
router.post('/', controller.createUser);
router.put('/:id', controller.updateUser);
router.delete('/:id', controller.deleteUser);

module.exports = router;
