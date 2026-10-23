const Task = require('../models/Task');
const Project = require('../models/Project');

/**
 * @desc    Get tasks for a specific project
 * @route   GET /api/projects/:projectId/tasks
 * @access  Private (Project members or Admin)
 */
const getTasksByProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;
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
 * @access  Private
 */
const getTaskById = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignee', 'name email role')
      .populate('project', 'title status manager members');

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    res.status(200).json({ success: true, data: task });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Create a task in a project
 * @route   POST /api/projects/:projectId/tasks
 * @access  Private (Admin or Project Manager)
 */
const createTask = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { title, description, priority, assigneeId } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: 'Task title is required' });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // Role check: Only Admin or Project Manager can create tasks
    const isManager = project.manager && project.manager.equals(req.user._id);
    const isProjectManagerRole = project.members.some(
      (m) => m.user && m.user.equals(req.user._id) && m.role === 'Manager'
    );

    if (req.user.role !== 'Admin' && !isManager && !isProjectManagerRole) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only Project Managers or Admins can create tasks'
      });
    }

    const task = await Task.create({
      project: projectId,
      title,
      description: description || '',
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
 * @access  Private (Admin, PM, or assigned Team Member)
 */
const updateTask = async (req, res, next) => {
  try {
    const { title, description, status, priority, assigneeId, version } = req.body;

    const task = await Task.findById(req.params.id).populate('project');
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    // Authorization check: Viewers cannot edit anything
    if (req.user.role === 'Viewer') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Viewers have read-only access'
      });
    }

    // Optimistic Concurrency Check:
    // If version is provided, verify it matches the current document version
    if (version !== undefined && Number(version) !== task.version) {
      return res.status(409).json({
        success: false,
        isConflict: true,
        message: `Version conflict: Task was modified by another user. (Received version: v${version}, current database version: v${task.version}). Reload latest version.`,
        currentVersion: task.version
      });
    }

    // Build update object
    const updateFields = {};
    if (title !== undefined) updateFields.title = title;
    if (description !== undefined) updateFields.description = description;
    if (status !== undefined) updateFields.status = status;
    if (priority !== undefined) updateFields.priority = priority;
    if (assigneeId !== undefined) updateFields.assignee = assigneeId || null;

    // Atomically update only if version still matches, and increment version
    const updated = await Task.findOneAndUpdate(
      { _id: req.params.id, version: task.version },
      { ...updateFields, $inc: { version: 1 } },
      { new: true, runValidators: true }
    )
      .populate('assignee', 'name email role')
      .populate('project', 'title status');

    // If updated is null, a concurrent race committed between findById and findOneAndUpdate
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
 * @access  Private (Admin or Project Manager)
 */
const deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id).populate('project');

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    // Check permissions
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
