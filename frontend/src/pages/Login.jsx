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
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const setDemoCredentials = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError('');
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <span style={{ fontSize: '2.5rem' }}>⚡</span>
          <h2>NeoStats Project Hub</h2>
          <p className="text-muted">Collaborative Project Management Platform</p>
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
            {submitting ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div className="demo-login-box">
          <p className="text-muted text-sm" style={{ fontWeight: 600, textAlign: 'center' }}>
            🚀 Evaluator Quick Demo Accounts
          </p>
          <div className="demo-btn-grid">
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={() => setDemoCredentials('admin@neostats.com', 'Admin@123')}
            >
              👑 Admin
            </button>
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={() => setDemoCredentials('pm@neostats.com', 'Pm@123')}
            >
              💼 Project Manager
            </button>
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={() => setDemoCredentials('dev@neostats.com', 'Dev@123')}
            >
              🛠️ Team Member
            </button>
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={() => setDemoCredentials('viewer@neostats.com', 'Viewer@123')}
            >
              👀 Viewer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
