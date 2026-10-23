import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { projectService, taskService, userService } from '../services/api';
import Modal from '../components/Modal';
import Alert from '../components/Alert';

export default function ProjectDetails() {
  const { id } = useParams();
  const { user } = useAuth();

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('tasks'); // 'tasks' | 'team' | 'overview'
  const [taskFilter, setTaskFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Create Task Modal State
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskPriority, setTaskPriority] = useState('MEDIUM');
  const [taskAssignee, setTaskAssignee] = useState('');
  const [submittingTask, setSubmittingTask] = useState(false);

  // Add Member Modal State
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [memberRole, setMemberRole] = useState('Member');
  const [submittingMember, setSubmittingMember] = useState(false);

  const isProjectManagerOfThis =
    project?.manager?._id === user?._id ||
    project?.members?.some((m) => m.user?._id === user?._id && m.role === 'Manager');
  const canManageProject = user?.role === 'Admin' || isProjectManagerOfThis;

  const loadData = async () => {
    try {
      setLoading(true);
      const [projRes, tasksRes] = await Promise.all([
        projectService.getById(id),
        taskService.getByProject(id, taskFilter === 'All' ? '' : taskFilter)
      ]);
      setProject(projRes.data);
      setTasks(tasksRes.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load project details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id, taskFilter]);

  useEffect(() => {
    if (canManageProject) {
      userService.getAll()
        .then((res) => setAllUsers(res.data || []))
        .catch(() => {});
    }
  }, [canManageProject]);

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    try {
      setSubmittingTask(true);
      setError('');
      await taskService.create(id, {
        title: taskTitle,
        description: taskDesc,
        priority: taskPriority,
        assigneeId: taskAssignee || undefined
      });
      setSuccess('Task created successfully.');
      setTaskTitle('');
      setTaskDesc('');
      setTaskAssignee('');
      setIsTaskModalOpen(false);
      loadData();
    } catch (err) {
      setError(err.message || 'Failed to create task');
    } finally {
      setSubmittingTask(false);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!selectedUserId) return;

    try {
      setSubmittingMember(true);
      setError('');
      await projectService.addMember(id, {
        userId: selectedUserId,
        role: memberRole
      });
      setSuccess('Team member added successfully.');
      setSelectedUserId('');
      setIsMemberModalOpen(false);
      loadData();
    } catch (err) {
      setError(err.message || 'Failed to add member');
    } finally {
      setSubmittingMember(false);
    }
  };

  const handleRemoveMember = async (userId, memberName) => {
    if (!window.confirm(`Remove ${memberName} from this project?`)) return;

    try {
      await projectService.removeMember(id, userId);
      setSuccess(`Removed ${memberName} from project.`);
      loadData();
    } catch (err) {
      setError(err.message || 'Failed to remove member');
    }
  };

  const handleUpdateMemberRole = async (userId, newRole) => {
    try {
      await projectService.updateMemberRole(id, userId, newRole);
      setSuccess('Member role updated.');
      loadData();
    } catch (err) {
      setError(err.message || 'Failed to update member role');
    }
  };

  if (loading) {
    return (
      <div className="main-content">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading project workspace...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="main-content">
        <div className="card">
          <h2>Project Not Found</h2>
          <p className="text-muted">The requested project could not be found or you do not have permission.</p>
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
            <h1>{project.title}</h1>
            <span className={`status-badge status-${project.status}`}>
              {project.status}
            </span>
          </div>
          <p className="text-muted">
            Manager: <strong>{project.manager?.name || 'Unassigned'}</strong> • {project.members?.length || 0} Members
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Link to="/projects" className="btn btn-secondary">
            &larr; Projects
          </Link>
          {canManageProject && (
            <button className="btn btn-primary" onClick={() => setIsTaskModalOpen(true)}>
              + Create Task
            </button>
          )}
        </div>
      </div>

      {error && <Alert type="error" message={error} onDismiss={() => setError('')} />}
      {success && <Alert type="success" message={success} onDismiss={() => setSuccess('')} />}

      {/* Tabs */}
      <div className="tabs-nav">
        <button
          className={`tab-btn ${activeTab === 'tasks' ? 'active' : ''}`}
          onClick={() => setActiveTab('tasks')}
        >
          Tasks ({tasks.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'team' ? 'active' : ''}`}
          onClick={() => setActiveTab('team')}
        >
          Team Members ({project.members?.length || 0})
        </button>
        <button
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Project Overview
        </button>
      </div>

      {/* TAB 1: Tasks */}
      {activeTab === 'tasks' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {['All', 'TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE'].map((s) => (
                <button
                  key={s}
                  className={`btn btn-sm ${taskFilter === s ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setTaskFilter(s)}
                >
                  {s.replace('_', ' ')}
                </button>
              ))}
            </div>
            {canManageProject && (
              <button className="btn btn-primary btn-sm" onClick={() => setIsTaskModalOpen(true)}>
                + New Task
              </button>
            )}
          </div>

          {tasks.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '2.5rem' }}>
              <h3>No tasks found</h3>
              <p className="text-muted">
                {taskFilter === 'All'
                  ? 'No tasks created yet for this project.'
                  : `No tasks matching filter "${taskFilter}".`}
              </p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Task</th>
                    <th>Status</th>
                    <th>Priority</th>
                    <th>Assignee</th>
                    <th>Version</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((t) => (
                    <tr key={t._id}>
                      <td>
                        <strong>{t.title}</strong>
                        <p className="text-muted text-sm" style={{ margin: 0 }}>
                          {t.description ? t.description.substring(0, 60) + '...' : 'No description'}
                        </p>
                      </td>
                      <td>
                        <span className={`status-badge status-${t.status}`}>
                          {t.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, fontSize: '0.8rem' }}>
                          {t.priority}
                        </span>
                      </td>
                      <td>{t.assignee?.name || 'Unassigned'}</td>
                      <td>
                        <code style={{ fontSize: '0.8rem' }}>v{t.version ?? 1}</code>
                      </td>
                      <td>
                        <Link to={`/tasks/${t._id}`} className="btn btn-secondary btn-sm">
                          Details & Edit &rarr;
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Team */}
      {activeTab === 'team' && (
        <div className="card">
          <div className="page-header" style={{ marginBottom: '1rem' }}>
            <h3>Project Team</h3>
            {canManageProject && (
              <button className="btn btn-primary btn-sm" onClick={() => setIsMemberModalOpen(true)}>
                + Add Member
              </button>
            )}
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Member Name</th>
                  <th>Email</th>
                  <th>Project Role</th>
                  {canManageProject && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {project.manager && (
                  <tr>
                    <td>
                      <strong>{project.manager.name}</strong>
                    </td>
                    <td>{project.manager.email}</td>
                    <td>
                      <span className="role-badge badge-pm">Manager</span>
                    </td>
                    {canManageProject && <td><em>Primary Manager</em></td>}
                  </tr>
                )}

                {project.members && project.members.map((m) => (
                  <tr key={m.user?._id || m._id}>
                    <td><strong>{m.user?.name}</strong></td>
                    <td>{m.user?.email}</td>
                    <td>
                      {canManageProject ? (
                        <select
                          className="form-select"
                          style={{ width: 'auto', padding: '0.2rem 0.5rem', fontSize: '0.85rem' }}
                          value={m.role}
                          onChange={(e) => handleUpdateMemberRole(m.user?._id, e.target.value)}
                        >
                          <option value="Manager">Manager</option>
                          <option value="Member">Member</option>
                          <option value="Viewer">Viewer</option>
                        </select>
                      ) : (
                        <span className="role-badge badge-member">{m.role}</span>
                      )}
                    </td>
                    {canManageProject && (
                      <td>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleRemoveMember(m.user?._id, m.user?.name)}
                        >
                          Remove
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Overview */}
      {activeTab === 'overview' && (
        <div className="card">
          <h3>Project Overview</h3>
          <div style={{ marginTop: '1rem' }}>
            <p><strong>Description:</strong></p>
            <p style={{ whiteSpace: 'pre-wrap', color: 'var(--text-main)' }}>
              {project.description || 'No description provided.'}
            </p>
          </div>
          <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
            <p className="text-muted text-sm">Created on: {new Date(project.createdAt).toLocaleDateString()}</p>
            <p className="text-muted text-sm">Project Identifier: <code>{project._id}</code></p>
          </div>
        </div>
      )}

      {/* Modal: Create Task */}
      <Modal isOpen={isTaskModalOpen} onClose={() => setIsTaskModalOpen(false)} title="Create New Task">
        <form onSubmit={handleCreateTask}>
          <div className="form-group">
            <label className="form-label" htmlFor="taskTitle">Task Title *</label>
            <input
              id="taskTitle"
              type="text"
              className="form-input"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder="e.g. Implement Optimistic Locking for Concurrent Edits"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="taskDesc">Description</label>
            <textarea
              id="taskDesc"
              className="form-textarea"
              value={taskDesc}
              onChange={(e) => setTaskDesc(e.target.value)}
              placeholder="Acceptance criteria and technical notes..."
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="taskPriority">Priority</label>
            <select
              id="taskPriority"
              className="form-select"
              value={taskPriority}
              onChange={(e) => setTaskPriority(e.target.value)}
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="taskAssignee">Assignee</label>
            <select
              id="taskAssignee"
              className="form-select"
              value={taskAssignee}
              onChange={(e) => setTaskAssignee(e.target.value)}
            >
              <option value="">Unassigned</option>
              {project.members && project.members.map((m) => (
                <option key={m.user?._id} value={m.user?._id}>
                  {m.user?.name} ({m.role})
                </option>
              ))}
              {project.manager && (
                <option value={project.manager._id}>
                  {project.manager.name} (Project Manager)
                </option>
              )}
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsTaskModalOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submittingTask}>
              {submittingTask ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Add Team Member */}
      <Modal isOpen={isMemberModalOpen} onClose={() => setIsMemberModalOpen(false)} title="Add Team Member">
        <form onSubmit={handleAddMember}>
          <div className="form-group">
            <label className="form-label" htmlFor="memberUser">Select User *</label>
            <select
              id="memberUser"
              className="form-select"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              required
            >
              <option value="">Choose a user...</option>
              {allUsers.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.name} — {u.email} ({u.role})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="memberProjectRole">Project-level Role</label>
            <select
              id="memberProjectRole"
              className="form-select"
              value={memberRole}
              onChange={(e) => setMemberRole(e.target.value)}
            >
              <option value="Member">Member</option>
              <option value="Manager">Manager</option>
              <option value="Viewer">Viewer</option>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsMemberModalOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submittingMember}>
              {submittingMember ? 'Adding...' : 'Add Member'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
