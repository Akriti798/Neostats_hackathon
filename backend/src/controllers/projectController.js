const Project = require('../models/Project');
const User = require('../models/User');

/**
 * @desc    Get all accessible projects
 * @route   GET /api/projects
 * @access  Private
 */
const getProjects = async (req, res, next) => {
  try {
    let query = {};

    // If status filter provided
    if (req.query.status) {
      query.status = req.query.status;
    }

    // Role-based visibility:
    // Admin sees all projects; others see projects they manage or belong to
    if (req.user.role !== 'Admin') {
      query.$or = [
        { manager: req.user._id },
        { 'members.user': req.user._id }
      ];
    }

    const projects = await Project.find(query)
      .populate('manager', 'name email role')
      .populate('members.user', 'name email role')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: projects.length,
      data: projects
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get single project by ID
 * @route   GET /api/projects/:id
 * @access  Private
 */
const getProjectById = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('manager', 'name email role')
      .populate('members.user', 'name email role');

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // Membership check for non-admins
    if (req.user.role !== 'Admin') {
      const isManager = project.manager && project.manager._id.equals(req.user._id);
      const isMember = project.members.some((m) => m.user && m.user._id.equals(req.user._id));
      if (!isManager && !isMember) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: You do not have access to this project'
        });
      }
    }

    res.status(200).json({ success: true, data: project });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Create a project
 * @route   POST /api/projects
 * @access  Private (Admin or Project Manager)
 */
const createProject = async (req, res, next) => {
  try {
    const { title, description, managerId } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: 'Project title is required' });
    }

    // Determine project manager
    let assignedManager = req.user._id;
    if (req.user.role === 'Admin' && managerId) {
      const candidate = await User.findById(managerId);
      if (candidate) {
        assignedManager = candidate._id;
      }
    }

    const project = await Project.create({
      title,
      description: description || '',
      manager: assignedManager,
      members: [
        {
          user: assignedManager,
          role: 'Manager'
        }
      ]
    });

    const populated = await Project.findById(project._id)
      .populate('manager', 'name email role')
      .populate('members.user', 'name email role');

    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update project
 * @route   PUT /api/projects/:id
 * @access  Private (Admin or assigned PM)
 */
const updateProject = async (req, res, next) => {
  try {
    const { title, description } = req.body;
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // Only Admin or project's manager can update
    if (req.user.role !== 'Admin' && (!project.manager || !project.manager.equals(req.user._id))) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only the assigned Project Manager or Admin can update this project'
      });
    }

    if (title) project.title = title;
    if (description !== undefined) project.description = description;

    await project.save();

    const populated = await Project.findById(project._id)
      .populate('manager', 'name email role')
      .populate('members.user', 'name email role');

    res.status(200).json({ success: true, data: populated });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Archive project
 * @route   PATCH /api/projects/:id/archive
 * @access  Private (Admin or assigned PM)
 */
const archiveProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    if (req.user.role !== 'Admin' && (!project.manager || !project.manager.equals(req.user._id))) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only the assigned Project Manager or Admin can archive this project'
      });
    }

    project.status = 'Archived';
    await project.save();

    res.status(200).json({
      success: true,
      message: 'Project archived successfully',
      data: project
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Add member to project
 * @route   POST /api/projects/:id/members
 * @access  Private (Admin or assigned PM)
 */
const addMember = async (req, res, next) => {
  try {
    const { userId, role } = req.body;
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    if (req.user.role !== 'Admin' && (!project.manager || !project.manager.equals(req.user._id))) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only the assigned Project Manager or Admin can add team members'
      });
    }

    const userToAdd = await User.findById(userId);
    if (!userToAdd) {
      return res.status(404).json({ success: false, message: 'User to add was not found' });
    }

    const alreadyMember = project.members.some(
      (m) => m.user && m.user.toString() === userId.toString()
    );

    if (alreadyMember) {
      return res.status(400).json({
        success: false,
        message: 'User is already a member of this project'
      });
    }

    project.members.push({
      user: userId,
      role: role || 'Member'
    });

    await project.save();

    const populated = await Project.findById(project._id)
      .populate('manager', 'name email role')
      .populate('members.user', 'name email role');

    res.status(200).json({ success: true, data: populated });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update project-level member role
 * @route   PATCH /api/projects/:id/members/:userId
 * @access  Private (Admin or assigned PM)
 */
const updateMemberRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    if (req.user.role !== 'Admin' && (!project.manager || !project.manager.equals(req.user._id))) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only the assigned Project Manager or Admin can change member roles'
      });
    }

    const member = project.members.find(
      (m) => m.user && m.user.toString() === req.params.userId.toString()
    );

    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found on this project' });
    }

    member.role = role || member.role;
    await project.save();

    res.status(200).json({ success: true, data: project });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Remove member from project
 * @route   DELETE /api/projects/:id/members/:userId
 * @access  Private (Admin or assigned PM)
 */
const removeMember = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    if (req.user.role !== 'Admin' && (!project.manager || !project.manager.equals(req.user._id))) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only the assigned Project Manager or Admin can remove members'
      });
    }

    project.members = project.members.filter(
      (m) => m.user && m.user.toString() !== req.params.userId.toString()
    );

    await project.save();

    res.status(200).json({
      success: true,
      message: 'Member removed from project successfully',
      data: project
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  archiveProject,
  addMember,
  updateMemberRole,
  removeMember
};
