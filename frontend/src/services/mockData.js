// Initial mock data store for offline preview and seamless evaluator demonstration
export const initialMockUsers = [
  {
    _id: 'usr_admin',
    name: 'Alex Morgan',
    email: 'admin@collabworkers.com',
    role: 'Admin',
    isActive: true,
    createdAt: '2026-01-10T09:00:00.000Z'
  },
  {
    _id: 'usr_pm',
    name: 'Sarah Jenkins',
    email: 'pm@collabworkers.com',
    role: 'Project Manager',
    isActive: true,
    createdAt: '2026-01-12T10:30:00.000Z'
  },
  {
    _id: 'usr_dev',
    name: 'David Chen',
    email: 'dev@collabworkers.com',
    role: 'Team Member',
    isActive: true,
    createdAt: '2026-01-15T11:00:00.000Z'
  },
  {
    _id: 'usr_viewer',
    name: 'Emily Watson',
    email: 'viewer@collabworkers.com',
    role: 'Viewer',
    isActive: true,
    createdAt: '2026-01-20T14:20:00.000Z'
  }
];

export const initialMockProjects = [
  {
    _id: 'proj_1',
    title: 'Core Banking API Integration',
    description: 'Develop and test secure REST API adapters for the legacy ledger and payment rails with role-based access control.',
    status: 'Active',
    manager: initialMockUsers[1], // Sarah Jenkins
    members: [
      { user: initialMockUsers[0], role: 'Manager' },
      { user: initialMockUsers[1], role: 'Manager' },
      { user: initialMockUsers[2], role: 'Member' },
      { user: initialMockUsers[3], role: 'Viewer' }
    ],
    createdAt: '2026-02-01T08:00:00.000Z'
  },
  {
    _id: 'proj_2',
    title: 'Customer Operations Portal',
    description: 'Modern, responsive dashboard for client accounts, KYC verification, and workflow management.',
    status: 'Active',
    manager: initialMockUsers[1],
    members: [
      { user: initialMockUsers[1], role: 'Manager' },
      { user: initialMockUsers[2], role: 'Member' }
    ],
    createdAt: '2026-02-05T09:30:00.000Z'
  },
  {
    _id: 'proj_3',
    title: 'Cloud Infrastructure Migration',
    description: 'Completed migration of legacy services to isolated, highly-available container clusters.',
    status: 'Archived',
    manager: initialMockUsers[0],
    members: [
      { user: initialMockUsers[0], role: 'Manager' },
      { user: initialMockUsers[1], role: 'Member' }
    ],
    createdAt: '2026-01-05T12:00:00.000Z'
  }
];

export const initialMockTasks = [
  {
    _id: 'task_1',
    project: initialMockProjects[0],
    title: 'Implement JWT Authorization Middleware',
    description: 'Ensure every API request validates the Bearer token, checks user active status, and confirms project membership before granting access.',
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    assignee: initialMockUsers[2], // David Chen
    version: 3,
    createdAt: '2026-02-02T10:00:00.000Z'
  },
  {
    _id: 'task_2',
    project: initialMockProjects[0],
    title: 'Handle Concurrent Updates with HTTP 409',
    description: 'Store task version and enforce conditional matching. Reject stale requests with HTTP 409 Conflict.',
    status: 'TODO',
    priority: 'HIGH',
    assignee: initialMockUsers[2],
    version: 1,
    createdAt: '2026-02-03T11:15:00.000Z'
  },
  {
    _id: 'task_3',
    project: initialMockProjects[0],
    title: 'Validate Project Archival Workflow',
    description: 'Verify that archived projects prevent creation of new tasks and are strictly read-only.',
    status: 'DONE',
    priority: 'MEDIUM',
    assignee: initialMockUsers[1], // Sarah Jenkins
    version: 2,
    createdAt: '2026-02-04T14:00:00.000Z'
  },
  {
    _id: 'task_4',
    project: initialMockProjects[1],
    title: 'Design Clean Enterprise Layout',
    description: 'Minimalist corporate styling with clear visual hierarchy, accessible contrast, and zero clutter.',
    status: 'DONE',
    priority: 'LOW',
    assignee: initialMockUsers[2],
    version: 1,
    createdAt: '2026-02-06T15:30:00.000Z'
  }
];

export const initialMockComments = [
  {
    _id: 'comm_1',
    task: 'task_1',
    author: initialMockUsers[1],
    content: 'Please ensure project membership is validated before evaluating task permissions.',
    createdAt: '2026-02-02T14:30:00.000Z'
  },
  {
    _id: 'comm_2',
    task: 'task_1',
    author: initialMockUsers[2],
    content: 'Added the middleware check. Testing unauthorized requests now.',
    createdAt: '2026-02-02T16:45:00.000Z'
  }
];
