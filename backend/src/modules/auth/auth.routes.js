const router = require('express').Router();
const authController = require('./auth.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/role.middleware');

// Public routes
router.post('/login', authController.login);

// Protected routes
router.use(authenticate);
router.get('/profile', authController.getProfile);
router.put('/change-password', authController.changePassword);

// Admin only
router.post('/register', authorize('ADMIN'), authController.register);
router.get('/users', authorize('ADMIN'), authController.listUsers);

module.exports = router;
