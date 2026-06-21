const router = require('express').Router();
const ctrl   = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect, adminOnly);
router.get('/dashboard',     ctrl.getDashboard);
router.get('/users',         ctrl.getUsers);
router.get('/revenue-chart', ctrl.getRevenueChart);

module.exports = router;
