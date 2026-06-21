const router = require('express').Router();
const ctrl   = require('../controllers/faqController');
const { protect, adminOnly } = require('../middleware/auth');

router.get ('/',           ctrl.getFAQs);
router.post('/',    protect, adminOnly, ctrl.createFAQ);
router.put ('/:id', protect, adminOnly, ctrl.updateFAQ);
router.delete('/:id', protect, adminOnly, ctrl.deleteFAQ);

module.exports = router;
