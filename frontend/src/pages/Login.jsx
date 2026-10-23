import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Alert from '../components/Alert';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { login, previewLogin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }

    try {
      setError('');
      setSubmitting(true);
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleInstantPreview = (roleName) => {
    previewLogin(roleName);
    navigate('/dashboard');
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div className="brand-badge-large">CW</div>
          <h2 style={{ marginTop: '0.75rem', fontSize: '1.6rem' }}>CollabWorkers</h2>
          <p className="text-muted text-sm">Collaborative Project Management Platform</p>
        </div>

        {error && <Alert type="error" message={error} onDismiss={() => setError('')} />}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@collabworkers.com"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
            style={{ width: '100%', marginTop: '0.5rem' }}
            disabled={submitting}
          >
            {submitting ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div className="demo-login-box">
          <p className="text-muted text-sm" style={{ fontWeight: 600, textAlign: 'center' }}>
            Instant Role Preview (Direct Access)
          </p>
          <div className="demo-btn-grid">
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={() => handleInstantPreview('Admin')}
            >
              Admin View
            </button>
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={() => handleInstantPreview('Project Manager')}
            >
              Project Manager
            </button>
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={() => handleInstantPreview('Team Member')}
            >
              Team Member
            </button>
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={() => handleInstantPreview('Viewer')}
            >
              Viewer View
            </button>
          </div>
          <p className="text-muted text-sm" style={{ textAlign: 'center', marginTop: '0.75rem', fontSize: '0.78rem' }}>
            Click any role above to instantly inspect all pages, permissions, and features.
          </p>
        </div>
      </div>
    </div>
  );
}
