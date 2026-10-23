const Project = require('../models/Project');

/**
 * Validates that the logged-in user has permission to access or modify a project.
 * - Admin: always allowed
 * - Manager: allowed if they are primary manager or listed as 'Manager' in members
 * - Member: allowed read & task update if assigned
 * - Viewer: strictly read-only
 */
const requireProjectRole = (requiredRoles = ['Manager', 'Member', 'Viewer']) => {
  return async (req, res, next) => {
    try {
      const projectId = req.params.projectId || req.params.id || req.body.projectId;

      if (!projectId) {
        return res.status(400).json({
          success: false,
          message: 'Project ID is required'
        });
      }

      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }

      // Admins bypass project membership checks
      if (req.user.role === 'Admin') {
        req.project = project;
        return next();
      }

      // Check if user is the assigned primary project manager
      const isPrimaryManager = project.manager && project.manager.toString() === req.user._id.toString();

      // Check if user is in members list
      const memberRecord = project.members.find(
        (m) => m.user && m.user.toString() === req.user._id.toString()
      );

      let userProjectRole = null;
      if (isPrimaryManager) {
        userProjectRole = 'Manager';
      } else if (memberRecord) {
        userProjectRole = memberRecord.role;
      }

      if (!userProjectRole) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: You do not belong to this project'
        });
      }

      // Check if user's role satisfies required role level
      if (!requiredRoles.includes(userProjectRole)) {
        return res.status(403).json({
          success: false,
          message: `Forbidden: Project action requires one of the following roles: [${requiredRoles.join(', ')}]`
        });
      }

      req.project = project;
      req.userProjectRole = userProjectRole;
      next();
    } catch (err) {
      next(err);
    }
  };
};

module.exports = { requireProjectRole };
