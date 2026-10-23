import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Alert from '../components/Alert';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { login } = useAuth();
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

  // Helper to fill the inputs with official seeded demo credentials
  const autofillCredentials = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError('');
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
              placeholder="user@neostats.com"
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
            {submitting ? 'Authenticating with MongoDB...' : 'Sign In'}
          </button>
        </form>

        <div className="demo-login-box">
          <p className="text-muted text-sm" style={{ fontWeight: 600, textAlign: 'center' }}>
            Seeded Demo Accounts (Click to Fill Credentials)
          </p>
          <div className="demo-btn-grid">
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={() => autofillCredentials('admin@neostats.com', 'Admin@123')}
            >
              Fill Admin
            </button>
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={() => autofillCredentials('pm@neostats.com', 'Pm@123')}
            >
              Fill Project Manager
            </button>
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={() => autofillCredentials('dev@neostats.com', 'Dev@123')}
            >
              Fill Team Member
            </button>
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={() => autofillCredentials('viewer@neostats.com', 'Viewer@123')}
            >
              Fill Viewer
            </button>
          </div>
          <p className="text-muted text-sm" style={{ textAlign: 'center', marginTop: '0.75rem', fontSize: '0.78rem' }}>
            Clicking fills credentials into the form. Press <strong>Sign In</strong> to authenticate via backend.
          </p>
        </div>
      </div>
    </div>
  );
}
