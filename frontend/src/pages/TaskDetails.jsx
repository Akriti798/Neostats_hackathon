import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { taskService, commentService } from '../services/api';
import Alert from '../components/Alert';

export default function TaskDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [task, setTask] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [conflictError, setConflictError] = useState(null);

  // Edit form state
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [updating, setUpdating] = useState(false);

  // Comment state
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  const loadTask = async () => {
    try {
      setLoading(true);
      setError('');
      setConflictError(null);
      const res = await taskService.getById(id);
      const t = res.data;
      setTask(t);
      setStatus(t.status);
      setPriority(t.priority);
      setTitle(t.title);
      setDescription(t.description || '');

      const commRes = await commentService.getByTask(id);
      setComments(commRes.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load task details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTask();
  }, [id]);

  const handleUpdateTask = async (e) => {
    e.preventDefault();
    if (!task) return;

    try {
      setUpdating(true);
      setError('');
      setSuccess('');
      setConflictError(null);

      const res = await taskService.update(id, {
        title,
        description,
        status,
        priority,
        version: task.version
      });

      setTask(res.data);
      setSuccess(`Task successfully updated to version v${res.data.version}.`);
    } catch (err) {
      if (err.status === 409 || err.isConflict) {
        setConflictError(
          err.message ||
            'Concurrent update conflict: This task was modified by another transaction. Changes were not committed.'
        );
      } else {
        setError(err.message || 'Failed to update task');
      }
    } finally {
      setUpdating(false);
    }
  };

  // Simulates a stale update with mismatched version to test HTTP 409
  const handleSimulateConflict = async () => {
    if (!task) return;
    try {
      setUpdating(true);
      setError('');
      setSuccess('');
      setConflictError(null);

      const staleVersion = Math.max(0, (task.version || 1) - 1);

      await taskService.update(id, {
        title,
        description,
        status,
        priority,
        version: staleVersion
      });
    } catch (err) {
      if (err.status === 409 || err.isConflict) {
        setConflictError(
          `[HTTP 409 Conflict Detected] ${err.message || 'Version mismatch.'} The server rejected the stale update.`
        );
      } else {
        setError(err.message);
      }
    } finally {
      setUpdating(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      setSubmittingComment(true);
      setError('');
      await commentService.create(id, newComment);
      setNewComment('');
      const commRes = await commentService.getByTask(id);
      setComments(commRes.data || []);
    } catch (err) {
      setError(err.message || 'Failed to post comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      await commentService.delete(id, commentId);
      setComments(comments.filter((c) => c._id !== commentId));
    } catch (err) {
      setError(err.message || 'Failed to delete comment');
    }
  };

  const handleDeleteTask = async () => {
    if (!window.confirm(`Confirm deletion of task "${task?.title}"?`)) return;
    try {
      await taskService.delete(id);
      navigate(`/projects/${task?.project?._id || task?.project}`);
    } catch (err) {
      setError(err.message || 'Failed to delete task');
    }
  };

  const isViewer = user?.role === 'Viewer';
  const isTeamMember = user?.role === 'Team Member';
  const isAssigned = (task?.assignee?._id || task?.assignee) === user?._id;
  const canEditTask = user?.role === 'Admin' || user?.role === 'Project Manager' || (isTeamMember && isAssigned);
  const canDeleteTask = user?.role === 'Admin' || user?.role === 'Project Manager';

  if (loading) {
    return (
      <div className="main-content">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading task details...</p>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="main-content">
        <div className="card">
          <h2>Task Not Found</h2>
          <p className="text-muted">The requested task could not be located.</p>
          <Link to="/projects" className="btn btn-primary" style={{ marginTop: '1rem' }}>
            Return to Projects
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <h1>{task.title}</h1>
            <span className={`status-badge status-${task.status}`}>
              {task.status.replace('_', ' ')}
            </span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Current Version: <strong style={{ color: 'var(--primary)' }}>v{task.version ?? 1}</strong>
            </span>
          </div>
          <p className="text-muted">
            Project:{' '}
            <Link
              to={`/projects/${task.project?._id || task.project}`}
              style={{ color: 'var(--primary)', textDecoration: 'none' }}
            >
              {task.project?.title || 'Back to Project'}
            </Link>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Link to={`/projects/${task.project?._id || task.project}`} className="btn btn-secondary">
            &larr; Project Workspace
          </Link>
          {canDeleteTask && (
            <button className="btn btn-danger" onClick={handleDeleteTask}>
              Delete Task
            </button>
          )}
        </div>
      </div>

      {/* HTTP 409 Conflict Banner */}
      {conflictError && (
        <div className="conflict-banner">
          <h4>Version Conflict Detected (HTTP 409)</h4>
          <p style={{ margin: '0.5rem 0' }}>{conflictError}</p>
          <p className="text-muted text-sm">
            Another team member updated this task before your changes were submitted. To prevent accidental data
            overwrites, your modification was rejected. Please reload the latest state before attempting changes.
          </p>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            style={{ marginTop: '0.75rem' }}
            onClick={loadTask}
          >
            Reload Latest State
          </button>
        </div>
      )}

      {error && <Alert type="error" message={error} onDismiss={() => setError('')} />}
      {success && <Alert type="success" message={success} onDismiss={() => setSuccess('')} />}

      <div className="grid-2">
        {/* Left Column: Edit Form */}
        <div className="card">
          <h3>Task Details & Attributes</h3>
          <form onSubmit={handleUpdateTask} style={{ marginTop: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="title">Task Title</label>
              <input
                id="title"
                type="text"
                className="form-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={!canEditTask}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="description">Description</label>
              <textarea
                id="description"
                className="form-textarea"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={!canEditTask}
              />
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label" htmlFor="status">Status</label>
                <select
                  id="status"
                  className="form-select"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  disabled={!canEditTask}
                >
                  <option value="TODO">To Do</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="BLOCKED">Blocked</option>
                  <option value="DONE">Done</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="priority">Priority</label>
                <select
                  id="priority"
                  className="form-select"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  disabled={!canEditTask || isTeamMember}
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Assignee</label>
              <p className="text-muted text-sm">
                Current Assignee: <strong>{task.assignee?.name || 'Unassigned'}</strong>
              </p>
            </div>

            {!canEditTask && (
              <p className="text-muted text-sm" style={{ padding: '0.5rem 0', fontStyle: 'italic' }}>
                {isViewer
                  ? 'Viewers have read-only access to tasks.'
                  : isTeamMember && !isAssigned
                  ? 'Team members can only update tasks assigned to them.'
                  : 'You do not have permission to modify this task.'}
              </p>
            )}

            {canEditTask && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="submit" className="btn btn-primary" disabled={updating}>
                  {updating ? 'Saving...' : `Save Changes (Version: v${task.version ?? 1})`}
                </button>

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleSimulateConflict}
                  disabled={updating}
                  title="Simulates submitting with an outdated version to verify HTTP 409 handling"
                >
                  Simulate Stale Version Update (Test HTTP 409)
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Right Column: Comments Section */}
        <div className="card">
          <h3>Comments & Discussion ({comments.length})</h3>

          {!isViewer && (
            <form onSubmit={handleAddComment} style={{ marginTop: '1rem', marginBottom: '1.5rem' }}>
              <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                <textarea
                  className="form-textarea"
                  rows={2}
                  placeholder="Add a comment or status update..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  required
                />
              </div>
              <button
                type="submit"
                className="btn btn-secondary btn-sm"
                disabled={submittingComment}
              >
                {submittingComment ? 'Posting...' : 'Post Comment'}
              </button>
            </form>
          )}

          {comments.length === 0 ? (
            <p className="text-muted" style={{ padding: '1rem 0' }}>
              No comments posted yet.
            </p>
          ) : (
            <div>
              {comments.map((c) => (
                <div key={c._id} className="comment-item">
                  <div style={{ flex: 1 }}>
                    <span className="comment-author">{c.author?.name || 'User'}</span>
                    <span className="comment-date">
                      {new Date(c.createdAt).toLocaleDateString()} at{' '}
                      {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <p className="comment-body">{c.content}</p>
                  </div>
                  {(user?.role === 'Admin' || c.author?._id === user?._id) && (
                    <button
                      className="btn btn-danger btn-sm"
                      style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                      onClick={() => handleDeleteComment(c._id)}
                      title="Delete Comment"
                    >
                      Delete
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
