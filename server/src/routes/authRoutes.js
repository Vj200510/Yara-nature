const router = require('express').Router();
const { body } = require('express-validator');
const ctrl   = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const validate   = require('../middleware/validate');

const registerRules = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

const loginRules = [
  body('email').isEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password is required'),
];

router.post('/register', registerRules, validate, ctrl.register);
router.post('/login',    loginRules,    validate, ctrl.login);
router.post('/logout',   protect,                 ctrl.logout);
router.get ('/me',       protect,                 ctrl.getProfile);
router.put ('/me',       protect,                 ctrl.updateProfile);
router.put ('/password', protect,                 ctrl.changePassword);
router.post('/forgot-password',          ctrl.forgotPassword);
router.put ('/reset-password/:token',    ctrl.resetPassword);
router.post('/address',  protect,                 ctrl.addAddress);
router.delete('/address/:id', protect,            ctrl.deleteAddress);

module.exports = router;
