const router = require('express').Router();
const ctrl   = require('../controllers/contactController');
const { protect, adminOnly } = require('../middleware/auth');

router.post('/',           ctrl.submitContact);
router.get ('/', protect, adminOnly, ctrl.getContacts);
router.put ('/:id', protect, adminOnly, ctrl.updateContact);
router.delete('/:id', protect, adminOnly, ctrl.deleteContact);

module.exports = router;
