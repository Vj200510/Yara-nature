const router = require('express').Router();
const ctrl   = require('../controllers/uploadController');
const { protect, adminOnly } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

router.post(
  '/product/:productId',
  protect, adminOnly,
  upload.array('images', 6),
  ctrl.uploadProductImages
);

router.post(
  '/avatar',
  protect,
  upload.single('avatar'),
  ctrl.uploadAvatar
);

router.delete(
  '/product/image/:imageId',
  protect, adminOnly,
  ctrl.deleteProductImage
);

module.exports = router;
