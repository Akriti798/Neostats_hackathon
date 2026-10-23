import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { userService } from '../services/api';
import Modal from '../components/Modal';
import Alert from '../components/Alert';

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Create User Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Team Member');
  const [submitting, setSubmitting] = useState(false);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await userService.getAll();
      setUsers(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load user directory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!name || !email || !password) return;

    try {
      setSubmitting(true);
      setError('');
      await userService.create({ name, email, password, role });
      setSuccess(`User "${name}" created successfully.`);
      setName('');
      setEmail('');
      setPassword('');
      setRole('Team Member');
      setIsModalOpen(false);
      loadUsers();
    } catch (err) {
      setError(err.message || 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleDeactivate = async (u) => {
    const action = u.isActive ? 'deactivate' : 'reactivate';
    if (!window.confirm(`Confirm action: ${action} user "${u.name}"?`)) return;

    try {
      setError('');
      await userService.deactivate(u._id);
      setSuccess(`User "${u.name}" ${action}d successfully.`);
      loadUsers();
    } catch (err) {
      setError(err.message || `Failed to ${action} user`);
    }
  };

  const handleUpdateRole = async (userId, newRole) => {
    try {
      setError('');
      await userService.update(userId, { role: newRole });
      setSuccess('User platform role updated.');
      loadUsers();
    } catch (err) {
      setError(err.message || 'Failed to update user role');
    }
  };

  return (
    <div className="main-content">
      <div className="page-header">
        <div>
          <h1>User Directory & Access Control</h1>
          <p className="text-muted">Administrator panel: Provision, update, and manage accounts</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          + Create User
        </button>
      </div>

      {error && <Alert type="error" message={error} onDismiss={() => setError('')} />}
      {success && <Alert type="success" message={success} onDismiss={() => setSuccess('')} />}

      <div className="card">
        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading user directory...</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Platform Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id} style={{ opacity: u.isActive === false ? 0.6 : 1 }}>
                    <td>
                      <strong>{u.name}</strong>
                      {u._id === currentUser?._id && (
                        <span className="text-muted text-sm" style={{ marginLeft: '0.5rem' }}>
                          (Current User)
                        </span>
                      )}
                    </td>
                    <td>{u.email}</td>
                    <td>
                      <select
                        className="form-select"
                        style={{ width: 'auto', padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}
                        value={u.role}
                        onChange={(e) => handleUpdateRole(u._id, e.target.value)}
                        disabled={u._id === currentUser?._id}
                      >
                        <option value="Admin">Admin</option>
                        <option value="Project Manager">Project Manager</option>
                        <option value="Team Member">Team Member</option>
                        <option value="Viewer">Viewer</option>
                      </select>
                    </td>
                    <td>
                      {u.isActive !== false ? (
                        <span className="status-badge status-DONE">Active</span>
                      ) : (
                        <span className="status-badge status-BLOCKED">Deactivated</span>
                      )}
                    </td>
                    <td>
                      {u._id !== currentUser?._id && (
                        <button
                          className={`btn btn-sm ${u.isActive !== false ? 'btn-danger' : 'btn-secondary'}`}
                          onClick={() => handleToggleDeactivate(u)}
                        >
                          {u.isActive !== false ? 'Deactivate' : 'Reactivate'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Create User */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Provision New User">
        <form onSubmit={handleCreateUser}>
          <div className="form-group">
            <label className="form-label" htmlFor="name">Full Name *</label>
            <input
              id="name"
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rachel Adams"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="email">Email Address *</label>
            <input
              id="email"
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="rachel@collabworkers.com"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Temporary Password *</label>
            <input
              id="password"
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="role">Platform Role</label>
            <select
              id="role"
              className="form-select"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="Admin">Admin (Full administrative privileges)</option>
              <option value="Project Manager">Project Manager (Manage projects, tasks, team)</option>
              <option value="Team Member">Team Member (Task execution & discussions)</option>
              <option value="Viewer">Viewer (Read-only access)</option>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Account'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
