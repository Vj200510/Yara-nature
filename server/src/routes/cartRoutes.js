const router = require('express').Router();
const ctrl   = require('../controllers/cartController');
const { protect } = require('../middleware/auth');

router.use(protect);
router.get ('/',             ctrl.getCart);
router.post('/',             ctrl.addToCart);
router.put ('/:itemId',      ctrl.updateCartItem);
router.delete('/:itemId',    ctrl.removeFromCart);

module.exports = router;
