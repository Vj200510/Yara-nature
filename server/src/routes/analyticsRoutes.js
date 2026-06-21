const router = require('express').Router();
const ctrl   = require('../controllers/analyticsController');
const { protect, adminOnly } = require('../middleware/auth');

router.post('/track',          ctrl.trackVisit);
router.get ('/', protect, adminOnly, ctrl.getAnalytics);

module.exports = router;
