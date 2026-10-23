const express = require('express');
const router = express.Router();
const {
  getTaskById,
  updateTask,
  deleteTask
} = require('../controllers/taskController');
const {
  getComments,
  createComment,
  deleteComment
} = require('../controllers/commentController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/:id')
  .get(getTaskById)
  .put(updateTask)
  .delete(deleteTask);

// Comments nested under tasks: /api/tasks/:taskId/comments
router.route('/:taskId/comments')
  .get(getComments)
  .post(createComment);

router.delete('/:taskId/comments/:commentId', deleteComment);

module.exports = router;
