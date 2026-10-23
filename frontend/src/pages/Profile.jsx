import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const { user } = useAuth();

  const getRoleResponsibilities = (role) => {
    switch (role) {
      case 'Admin':
        return [
          'Full administrative control: create, edit, and deactivate user accounts.',
          'Create, update, and archive any platform project.',
          'Assign project managers to individual projects.',
          'Global visibility across all projects, tasks, and system events.'
        ];
      case 'Project Manager':
        return [
          'Manage assigned project workspaces and oversee milestones.',
          'Add and remove team members and designate project-level roles.',
          'Create, update, assign, and delete project tasks.',
          'Enforce sprint progress and modify task statuses.'
        ];
      case 'Team Member':
        return [
          'Access projects where active membership has been granted.',
          'Review assigned tasks and update statuses as work progresses.',
          'Participate in task discussions and post technical comments.',
          'Edit task descriptions and requirements for assigned work.'
        ];
      case 'Viewer':
        return [
          'Read-only access across assigned projects and tasks.',
          'Review project scopes, team rosters, and task completion metrics.',
          'Modifications and deletions are strictly restricted by server authorization.'
        ];
      default:
        return ['Standard platform permissions.'];
    }
  };

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
          <h1>User Profile</h1>
          <p className="text-muted">Personal account credentials and authorization specifications</p>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <h3>Account Information</h3>
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
                <span className={`role-badge ${getRoleBadgeClass(user?.role)}`}>
                  {user?.role}
                </span>
              </div>
            </div>
            <div>
              <p className="text-muted text-sm">User Identifier</p>
              <code style={{ fontSize: '0.8rem' }}>{user?._id || user?.id}</code>
            </div>
          </div>
        </div>

        <div className="card">
          <h3>Role Responsibilities & Permissions</h3>
          <p className="text-muted text-sm" style={{ margin: '0.5rem 0 1rem' }}>
            Specifications enforced by server-side authorization for <strong>{user?.role}</strong>:
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
