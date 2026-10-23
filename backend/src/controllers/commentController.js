const Comment = require('../models/Comment');
const Task = require('../models/Task');
const Project = require('../models/Project');

/**
 * Helper: Check if user belongs to project
 */
const checkProjectMembership = (project, user) => {
  if (user.role === 'Admin') return true;
  const isManager = project.manager && project.manager.equals(user._id);
  const isMember = project.members && project.members.some((m) => m.user && m.user.equals(user._id));
  return isManager || isMember;
};

/**
 * @desc    Get comments for a task
 * @route   GET /api/tasks/:taskId/comments
 * @access  Private (Project members or Admin)
 */
const getComments = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.taskId).populate('project');
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    if (task.project && !checkProjectMembership(task.project, req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have access to this task'
      });
    }

    const comments = await Comment.find({ task: req.params.taskId })
      .populate('author', 'name email role')
      .sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      count: comments.length,
      data: comments
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Create a comment on a task
 * @route   POST /api/tasks/:taskId/comments
 * @access  Private (Admin, PM, or Team Member of the project)
 */
const createComment = async (req, res, next) => {
  try {
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Comment content is required' });
    }

    // Viewers cannot comment
    if (req.user.role === 'Viewer') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Viewers have read-only access and cannot post comments'
      });
    }

    const task = await Task.findById(req.params.taskId).populate('project');
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    // Server-enforced authorization: user must belong to project
    if (task.project && !checkProjectMembership(task.project, req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You must belong to the project to post comments'
      });
    }

    const comment = await Comment.create({
      task: req.params.taskId,
      author: req.user._id,
      content: content.trim()
    });

    const populated = await Comment.findById(comment._id).populate('author', 'name email role');

    res.status(201).json({
      success: true,
      data: populated
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Delete a comment
 * @route   DELETE /api/tasks/:taskId/comments/:commentId
 * @access  Private (Author or Admin)
 */
const deleteComment = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.commentId);

    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    // Only comment author or Admin can delete
    if (req.user.role !== 'Admin' && !comment.author.equals(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You can only delete your own comments'
      });
    }

    await comment.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Comment deleted successfully'
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getComments,
  createComment,
  deleteComment
};
