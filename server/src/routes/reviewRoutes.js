const router = require('express').Router();
const ctrl   = require('../controllers/reviewController');
const { protect, adminOnly } = require('../middleware/auth');

router.get ('/:productId',          ctrl.getProductReviews);
router.post('/',          protect,  ctrl.submitReview);
router.get ('/',     protect, adminOnly, ctrl.allReviews);
router.put ('/:id',  protect, adminOnly, ctrl.approveReview);
router.delete('/:id', protect, adminOnly, ctrl.deleteReview);

module.exports = router;
