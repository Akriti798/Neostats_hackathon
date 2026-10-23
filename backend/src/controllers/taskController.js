const Task = require('../models/Task');
const Project = require('../models/Project');

/**
 * Helper: Check if user has membership in a project
 */
const checkProjectMembership = (project, user) => {
  if (user.role === 'Admin') return true;
  const isManager = project.manager && project.manager.equals(user._id);
  const isMember = project.members && project.members.some((m) => m.user && m.user.equals(user._id));
  return isManager || isMember;
};

/**
 * @desc    Get tasks for a specific project
 * @route   GET /api/projects/:projectId/tasks
 * @access  Private (Project members or Admin)
 */
const getTasksByProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // Server-enforced authorization: user must belong to project
    if (!checkProjectMembership(project, req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have access to this project'
      });
    }

    let query = { project: projectId };
    if (req.query.status) {
      query.status = req.query.status;
    }

    const tasks = await Task.find(query)
      .populate('assignee', 'name email role')
      .populate('project', 'title status')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get single task by ID
 * @route   GET /api/tasks/:id
 * @access  Private (Project members or Admin)
 */
const getTaskById = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignee', 'name email role')
      .populate('project', 'title status manager members');

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    // Server-enforced authorization: user must belong to the task's project
    if (task.project && !checkProjectMembership(task.project, req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have access to this task'
      });
    }

    res.status(200).json({ success: true, data: task });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Create a task in a project
 * @route   POST /api/projects/:projectId/tasks
 * @access  Private (Admin or assigned Project Manager)
 */
const createTask = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { title, description, priority, assigneeId } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Task title is required' });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    if (project.status === 'Archived') {
      return res.status(400).json({
        success: false,
        message: 'Cannot create tasks in an archived project'
      });
    }

    // Server-enforced authorization: Only Admin or the assigned Project Manager can create tasks
    const isManager = project.manager && project.manager.equals(req.user._id);
    const isProjectManagerMember = project.members && project.members.some(
      (m) => m.user && m.user.equals(req.user._id) && m.role === 'Manager'
    );

    if (req.user.role !== 'Admin' && !isManager && !isProjectManagerMember) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only the assigned Project Manager or Admin can create tasks'
      });
    }

    const task = await Task.create({
      project: projectId,
      title: title.trim(),
      description: description ? description.trim() : '',
      priority: priority || 'MEDIUM',
      assignee: assigneeId || null,
      version: 1
    });

    const populated = await Task.findById(task._id).populate('assignee', 'name email role');

    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update a task with Optimistic Concurrency Control (HTTP 409 Conflict)
 * @route   PUT /api/tasks/:id
 * @access  Private (Assignee, PM of project, or Admin)
 */
const updateTask = async (req, res, next) => {
  try {
    const { title, description, status, priority, assigneeId, version } = req.body;

    // 1. Mandatory version requirement for concurrent update safety
    if (version === undefined || version === null || typeof version !== 'number' || isNaN(version)) {
      return res.status(400).json({
        success: false,
        message: 'Task version number is required for updates to prevent concurrent overwrite'
      });
    }

    const task = await Task.findById(req.params.id).populate('project');
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    const project = task.project;

    // 2. Server-side role & membership authorization
    if (req.user.role !== 'Admin' && (!project || !checkProjectMembership(project, req.user))) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have access to this project'
      });
    }

    // Viewers cannot edit anything
    if (req.user.role === 'Viewer') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Viewers have read-only access'
      });
    }

    // Project cannot be modified if archived
    if (project && project.status === 'Archived') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update tasks in an archived project'
      });
    }

    const isManager = project && project.manager && project.manager.equals(req.user._id);

    // Project Managers can only manage their assigned projects
    if (req.user.role === 'Project Manager' && !isManager) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Project Managers can only update tasks in their assigned projects'
      });
    }

    // Team Members can update only their assigned tasks
    if (req.user.role === 'Team Member') {
      const isAssigned = task.assignee && task.assignee.equals(req.user._id);
      if (!isAssigned) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: Team members can only update tasks assigned to them'
        });
      }

      // Team Members cannot reassign tasks to others
      if (assigneeId !== undefined && assigneeId !== (task.assignee ? task.assignee.toString() : null)) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: Team members cannot reassign tasks'
        });
      }

      // Team Members cannot change priority
      if (priority !== undefined && priority !== task.priority) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: Team members cannot change task priority'
        });
      }
    }

    // 3. Optimistic Concurrency Check (HTTP 409 Conflict)
    if (Number(version) !== task.version) {
      return res.status(409).json({
        success: false,
        isConflict: true,
        message: `Version conflict: Task was modified by another user. (Submitted version: v${version}, current database version: v${task.version}). Please reload latest task data.`,
        currentVersion: task.version
      });
    }

    // Build update fields
    const updateFields = {};
    if (title !== undefined && title.trim()) updateFields.title = title.trim();
    if (description !== undefined) updateFields.description = description.trim();
    if (status !== undefined) updateFields.status = status;
    if (priority !== undefined && req.user.role !== 'Team Member') updateFields.priority = priority;
    if (assigneeId !== undefined && req.user.role !== 'Team Member') {
      updateFields.assignee = assigneeId || null;
    }

    // Atomic conditional update: only matches if version equals expected version
    const updated = await Task.findOneAndUpdate(
      { _id: req.params.id, version: Number(version) },
      { ...updateFields, $inc: { version: 1 } },
      { new: true, runValidators: true }
    )
      .populate('assignee', 'name email role')
      .populate('project', 'title status');

    // If updated is null, a concurrent transaction modified the document
    if (!updated) {
      const freshTask = await Task.findById(req.params.id);
      return res.status(409).json({
        success: false,
        isConflict: true,
        message: `Version conflict: A concurrent modification occurred. Please reload task data.`,
        currentVersion: freshTask ? freshTask.version : null
      });
    }

    res.status(200).json({
      success: true,
      message: `Task updated successfully to version v${updated.version}`,
      data: updated
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Delete a task
 * @route   DELETE /api/tasks/:id
 * @access  Private (Admin or assigned Project Manager)
 */
const deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id).populate('project');

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    const project = task.project;
    const isManager = project && project.manager && project.manager.equals(req.user._id);

    if (req.user.role !== 'Admin' && !isManager) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only Project Managers or Admins can delete tasks'
      });
    }

    await task.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getTasksByProject,
  getTaskById,
  createTask,
  updateTask,
  deleteTask
};
