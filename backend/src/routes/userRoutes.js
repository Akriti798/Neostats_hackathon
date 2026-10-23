const express = require('express');
const router = express.Router();
const {
  getUsers,
  createUser,
  updateUser,
  deactivateUser
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

// All user management routes require login and Admin role
router.use(protect);
router.use(authorize('Admin'));

router.route('/')
  .get(getUsers)
  .post(createUser);

router.route('/:id')
  .put(updateUser);

router.patch('/:id/deactivate', deactivateUser);

module.exports = router;
