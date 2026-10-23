import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { projectService } from '../services/api';
import Alert from '../components/Alert';

export default function Dashboard() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);
        const res = await projectService.getAll();
        setProjects(res.data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  const activeProjects = projects.filter((p) => p.status === 'Active');
  const archivedProjects = projects.filter((p) => p.status === 'Archived');

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'Admin': return 'badge-admin';
      case 'Project Manager': return 'badge-pm';
      case 'Team Member': return 'badge-member';
      case 'Viewer': return 'badge-viewer';
      default: return 'badge-default';
    }
  };

  return (
    <div className="main-content">
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="text-muted">
            Signed in as <strong>{user?.name}</strong> • Role: <span className={`role-badge ${getRoleBadgeClass(user?.role)}`}>{user?.role}</span>
          </p>
        </div>
        <div>
          {(user?.role === 'Admin' || user?.role === 'Project Manager') && (
            <Link to="/projects" className="btn btn-primary">
              + New Project
            </Link>
          )}
        </div>
      </div>

      {error && <Alert type="error" message={error} onDismiss={() => setError('')} />}

      {/* Metrics Row */}
      <div className="grid-4" style={{ marginBottom: '2rem' }}>
        <div className="card" style={{ marginBottom: 0 }}>
          <p className="text-muted text-sm">Total Projects</p>
          <h2 style={{ color: 'var(--primary)', marginTop: '0.25rem' }}>{projects.length}</h2>
        </div>
        <div className="card" style={{ marginBottom: 0 }}>
          <p className="text-muted text-sm">Active Projects</p>
          <h2 style={{ color: 'var(--info)', marginTop: '0.25rem' }}>{activeProjects.length}</h2>
        </div>
        <div className="card" style={{ marginBottom: 0 }}>
          <p className="text-muted text-sm">Archived Projects</p>
          <h2 style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>{archivedProjects.length}</h2>
        </div>
        <div className="card" style={{ marginBottom: 0 }}>
          <p className="text-muted text-sm">Access Scope</p>
          <h2 style={{ color: 'var(--text-main)', marginTop: '0.25rem', fontSize: '1.25rem' }}>
            {user?.role === 'Admin' ? 'System Wide' : 'Assigned Projects'}
          </h2>
        </div>
      </div>

      {/* Active Projects Section */}
      <div className="card">
        <div className="page-header" style={{ marginBottom: '1rem' }}>
          <h3>Accessible Projects</h3>
          <Link to="/projects" className="text-sm" style={{ color: 'var(--primary)', textDecoration: 'none' }}>
            View all projects &rarr;
          </Link>
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading projects...</p>
          </div>
        ) : projects.length === 0 ? (
          <p className="text-muted" style={{ padding: '1rem 0' }}>
            No projects available yet. Create one or contact your administrator.
          </p>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Project Name</th>
                  <th>Status</th>
                  <th>Manager</th>
                  <th>Members</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {projects.slice(0, 5).map((proj) => (
                  <tr key={proj._id}>
                    <td>
                      <strong>{proj.title}</strong>
                      <p className="text-muted text-sm" style={{ margin: 0 }}>
                        {proj.description ? proj.description.substring(0, 60) + '...' : 'No description'}
                      </p>
                    </td>
                    <td>
                      <span className={`status-badge status-${proj.status}`}>
                        {proj.status}
                      </span>
                    </td>
                    <td>{proj.manager?.name || 'Unassigned'}</td>
                    <td>{proj.members?.length || 0}</td>
                    <td>
                      <Link to={`/projects/${proj._id}`} className="btn btn-secondary btn-sm">
                        Open Workspace
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
