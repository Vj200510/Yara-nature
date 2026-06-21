const router = require('express').Router();
const ctrl   = require('../controllers/couponController');
const { protect, adminOnly } = require('../middleware/auth');

router.post('/apply',  protect,  ctrl.applyCoupon);
router.get ('/',  protect, adminOnly, ctrl.getCoupons);
router.post('/',  protect, adminOnly, ctrl.createCoupon);
router.delete('/:id', protect, adminOnly, ctrl.deleteCoupon);

module.exports = router;
