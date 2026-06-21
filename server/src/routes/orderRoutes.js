const router = require('express').Router();
const ctrl   = require('../controllers/orderController');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect);
router.post('/razorpay',            ctrl.createRazorpayOrder);
router.post('/',                    ctrl.placeOrder);
router.get ('/my',                  ctrl.myOrders);
router.get ('/:id',                 ctrl.getOrder);
router.put ('/:id/cancel',          ctrl.cancelOrder);

// Admin
router.get ('/',         adminOnly, ctrl.allOrders);
router.put ('/:id/status', adminOnly, ctrl.updateOrderStatus);

module.exports = router;
