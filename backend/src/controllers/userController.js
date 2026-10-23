const User = require('../models/User');

/**
 * @desc    Get all users
 * @route   GET /api/users
 * @access  Private/Admin
 */
const getUsers = async (req, res, next) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: users.length, data: users });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Create a new user
 * @route   POST /api/users
 * @access  Private/Admin
 */
const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required'
      });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'A user with that email already exists'
      });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: role || 'Team Member'
    });

    res.status(201).json({
      success: true,
      data: user.toSafeObject()
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update a user
 * @route   PUT /api/users/:id
 * @access  Private/Admin
 */
const updateUser = async (req, res, next) => {
  try {
    const { name, role } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (name) user.name = name;
    if (role) user.role = role;

    await user.save();

    res.status(200).json({
      success: true,
      data: user.toSafeObject()
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Toggle deactivate/reactivate a user
 * @route   PATCH /api/users/:id/deactivate
 * @access  Private/Admin
 */
const deactivateUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user._id.equals(req.user._id)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot deactivate your own administrator account'
      });
    }

    user.isActive = !user.isActive;
    await user.save();

    res.status(200).json({
      success: true,
      message: `User ${user.isActive ? 'reactivated' : 'deactivated'} successfully`,
      data: user.toSafeObject()
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getUsers,
  createUser,
  updateUser,
  deactivateUser
};
