import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading session...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="content-container">
        <div className="card alert-card">
          <h2>🚫 Access Denied</h2>
          <p>
            Your current role (<strong>{user.role}</strong>) does not have permission to
            access this page.
          </p>
          <p className="text-muted">This page requires role: {allowedRoles.join(' or ')}.</p>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
