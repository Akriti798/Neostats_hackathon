const express = require('express');
const router = express.Router();
const {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  archiveProject,
  addMember,
  updateMemberRole,
  removeMember
} = require('../controllers/projectController');
const { getTasksByProject, createTask } = require('../controllers/taskController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(getProjects)
  .post(authorize('Admin', 'Project Manager'), createProject);

router.route('/:id')
  .get(getProjectById)
  .put(updateProject);

router.patch('/:id/archive', archiveProject);

// Project Membership endpoints
router.post('/:id/members', addMember);
router.patch('/:id/members/:userId', updateMemberRole);
router.delete('/:id/members/:userId', removeMember);

// Nested tasks under project: /api/projects/:projectId/tasks
router.route('/:projectId/tasks')
  .get(getTasksByProject)
  .post(createTask);

module.exports = router;
