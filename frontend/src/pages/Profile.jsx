import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const { user } = useAuth();

  const getRoleResponsibilities = (role) => {
    switch (role) {
      case 'Admin':
        return [
          'Manage all platform users (create, update, deactivate).',
          'Create and delete projects.',
          'Assign project managers to projects.',
          'View all projects and tasks across the platform.'
        ];
      case 'Project Manager':
        return [
          'Manage assigned projects.',
          'Add and remove team members and assign project-level roles.',
          'Create, update, and delete tasks.',
          'Assign tasks to team members.',
          'Change task statuses.'
        ];
      case 'Team Member':
        return [
          'View projects you belong to.',
          'View assigned tasks.',
          'Update task details and statuses for your tasks.',
          'Add comments and participate in task discussions.'
        ];
      case 'Viewer':
        return [
          'Read-only access to projects and tasks.',
          'View project descriptions, team rosters, and task statuses.',
          'No update or delete permissions.'
        ];
      default:
        return ['Standard platform access.'];
    }
  };

  return (
    <div className="main-content">
      <div className="page-header">
        <div>
          <h1>User Profile</h1>
          <p className="text-muted">Account details and role-based permissions</p>
        </div>
      </div>

      <div className="grid-2">
        {/* User Info Card */}
        <div className="card">
          <h3>Personal Details</h3>
          <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <p className="text-muted text-sm">Full Name</p>
              <p style={{ fontWeight: 600, fontSize: '1.1rem' }}>{user?.name}</p>
            </div>
            <div>
              <p className="text-muted text-sm">Email Address</p>
              <p style={{ fontWeight: 500 }}>{user?.email}</p>
            </div>
            <div>
              <p className="text-muted text-sm">Platform Role</p>
              <div style={{ marginTop: '0.25rem' }}>
                <span className={`role-badge badge-${user?.role === 'Admin' ? 'admin' : user?.role === 'Project Manager' ? 'pm' : user?.role === 'Team Member' ? 'member' : 'viewer'}`}>
                  {user?.role}
                </span>
              </div>
            </div>
            <div>
              <p className="text-muted text-sm">User ID</p>
              <code style={{ fontSize: '0.8rem' }}>{user?._id || user?.id}</code>
            </div>
          </div>
        </div>

        {/* Role Responsibilities Card */}
        <div className="card">
          <h3>NeoStats Role Specifications</h3>
          <p className="text-muted text-sm" style={{ margin: '0.5rem 0 1rem' }}>
            Responsibilities enforced on the backend for <strong>{user?.role}</strong>:
          </p>
          <ul style={{ paddingLeft: '1.25rem', lineHeight: 1.8 }}>
            {getRoleResponsibilities(user?.role).map((resp, idx) => (
              <li key={idx} style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                {resp}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
