import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { projectService, userService } from '../services/api';
import Modal from '../components/Modal';
import Alert from '../components/Alert';

export default function Projects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [managers, setManagers] = useState([]);
  const [filterStatus, setFilterStatus] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [managerId, setManagerId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canCreateProject = user?.role === 'Admin' || user?.role === 'Project Manager';

  const loadProjects = async () => {
    try {
      setLoading(true);
      const res = await projectService.getAll(filterStatus === 'All' ? '' : filterStatus);
      setProjects(res.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, [filterStatus]);

  // Load project managers for creation dropdown
  useEffect(() => {
    if (canCreateProject) {
      userService.getAll()
        .then((res) => {
          const eligibleManagers = (res.data || []).filter(
            (u) => u.role === 'Project Manager' || u.role === 'Admin'
          );
          setManagers(eligibleManagers);
        })
        .catch(() => {});
    }
  }, [canCreateProject]);

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      setSubmitting(true);
      setError('');
      await projectService.create({
        title,
        description,
        managerId: managerId || undefined
      });
      setSuccess('Project created successfully!');
      setTitle('');
      setDescription('');
      setManagerId('');
      setIsModalOpen(false);
      loadProjects();
    } catch (err) {
      setError(err.message || 'Failed to create project');
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchiveProject = async (id, projectTitle) => {
    if (!window.confirm(`Are you sure you want to archive "${projectTitle}"?`)) return;

    try {
      await projectService.archive(id);
      setSuccess(`Project "${projectTitle}" archived.`);
      loadProjects();
    } catch (err) {
      setError(err.message || 'Failed to archive project');
    }
  };

  return (
    <div className="main-content">
      <div className="page-header">
        <div>
          <h1>Projects</h1>
          <p className="text-muted">Manage, organize, and monitor collaborative projects</p>
        </div>
        {canCreateProject && (
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            + Create Project
          </button>
        )}
      </div>

      {error && <Alert type="error" message={error} onDismiss={() => setError('')} />}
      {success && <Alert type="success" message={success} onDismiss={() => setSuccess('')} />}

      {/* Filter Tabs */}
      <div className="tabs-nav">
        {['All', 'Active', 'Archived'].map((status) => (
          <button
            key={status}
            className={`tab-btn ${filterStatus === status ? 'active' : ''}`}
            onClick={() => setFilterStatus(status)}
          >
            {status} Projects
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading projects...</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <h3>No projects found</h3>
          <p className="text-muted">
            {filterStatus === 'All'
              ? 'Get started by creating your first project.'
              : `No ${filterStatus.toLowerCase()} projects at this time.`}
          </p>
        </div>
      ) : (
        <div className="grid-3">
          {projects.map((proj) => (
            <div key={proj._id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <h3>{proj.title}</h3>
                  <span className={`status-badge status-${proj.status}`}>
                    {proj.status}
                  </span>
                </div>
                <p className="text-muted" style={{ minHeight: '48px', fontSize: '0.9rem' }}>
                  {proj.description || 'No description provided.'}
                </p>
                <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', fontSize: '0.85rem' }}>
                  <p><strong>Manager:</strong> {proj.manager?.name || 'Unassigned'}</p>
                  <p><strong>Team Members:</strong> {proj.members?.length || 0}</p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem' }}>
                <Link to={`/projects/${proj._id}`} className="btn btn-primary btn-sm" style={{ flex: 1, textDecoration: 'none' }}>
                  Open Workspace
                </Link>
                {(user?.role === 'Admin' || user?.role === 'Project Manager') && proj.status === 'Active' && (
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleArchiveProject(proj._id, proj.title)}
                  >
                    Archive
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create New Project">
        <form onSubmit={handleCreateProject}>
          <div className="form-group">
            <label className="form-label" htmlFor="title">Project Title *</label>
            <input
              id="title"
              type="text"
              className="form-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Mobile App Redesign"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="description">Description</label>
            <textarea
              id="description"
              className="form-textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Summary of goals and milestones..."
            />
          </div>

          {user?.role === 'Admin' && (
            <div className="form-group">
              <label className="form-label" htmlFor="manager">Assign Project Manager</label>
              <select
                id="manager"
                className="form-select"
                value={managerId}
                onChange={(e) => setManagerId(e.target.value)}
              >
                <option value="">Select a manager...</option>
                {managers.map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.name} ({m.role})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
