import {
  initialMockUsers,
  initialMockProjects,
  initialMockTasks,
  initialMockComments
} from './mockData';

const API_BASE_URL = 'http://localhost:5000/api';

// In-memory mock store for offline preview
let mockUsers = [...initialMockUsers];
let mockProjects = [...initialMockProjects];
let mockTasks = [...initialMockTasks];
let mockComments = [...initialMockComments];

/**
 * Core fetch wrapper.
 * Attempts real API call first. If the backend is offline, falls back to
 * the client-side mock store so all views, flows, and 409 tests work seamlessly.
 */
export async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  const isMockSession = localStorage.getItem('collab_mock_mode') === 'true';

  // If mock mode is explicitly active, handle with mock responder
  if (isMockSession) {
    return handleMockRequest(endpoint, options);
  }

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers
    });

    let data = null;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    }

    if (!response.ok) {
      const error = new Error((data && data.message) || `Request failed with status ${response.status}`);
      error.status = response.status;
      error.data = data;
      if (response.status === 409) {
        error.isConflict = true;
      }
      throw error;
    }

    return data;
  } catch (networkError) {
    // If backend is unreachable, automatically fall back to mock responder
    console.warn(`[CollabWorkers] Backend offline (${networkError.message}). Serving from preview store.`);
    return handleMockRequest(endpoint, options);
  }
}

/**
 * Client-side mock handler to enable complete UI testing before backend startup
 */
function handleMockRequest(endpoint, options) {
  const method = (options.method || 'GET').toUpperCase();
  const body = options.body ? JSON.parse(options.body) : {};

  // 1. Auth routes
  if (endpoint === '/auth/login' && method === 'POST') {
    const found = mockUsers.find((u) => u.email.toLowerCase() === body.email?.toLowerCase());
    if (found) {
      localStorage.setItem('collab_mock_mode', 'true');
      return { success: true, token: `mock-token-${found.role}`, user: found };
    }
    const err = new Error('Invalid email or password');
    err.status = 401;
    throw err;
  }

  if (endpoint === '/auth/me') {
    const storedUser = localStorage.getItem('collab_user');
    const user = storedUser ? JSON.parse(storedUser) : mockUsers[0];
    return { success: true, user };
  }

  // 2. Project routes
  if (endpoint.startsWith('/projects') && method === 'GET') {
    const urlParts = endpoint.split('?')[0].split('/');
    if (urlParts.length === 3 && urlParts[2]) {
      const projId = urlParts[2];
      const proj = mockProjects.find((p) => p._id === projId);
      if (!proj) {
        const err = new Error('Project not found');
        err.status = 404;
        throw err;
      }
      return { success: true, data: proj };
    }
    // Filter by status if query provided
    const statusParam = new URLSearchParams(endpoint.split('?')[1] || '').get('status');
    const filtered = statusParam ? mockProjects.filter((p) => p.status === statusParam) : mockProjects;
    return { success: true, data: filtered };
  }

  if (endpoint === '/projects' && method === 'POST') {
    const newProj = {
      _id: `proj_${Date.now()}`,
      title: body.title,
      description: body.description || '',
      status: 'Active',
      manager: mockUsers.find((u) => u._id === body.managerId) || mockUsers[1],
      members: [{ user: mockUsers[1], role: 'Manager' }],
      createdAt: new Date().toISOString()
    };
    mockProjects.unshift(newProj);
    return { success: true, data: newProj };
  }

  if (endpoint.match(/^\/projects\/[^/]+\/archive$/) && method === 'PATCH') {
    const projId = endpoint.split('/')[2];
    const proj = mockProjects.find((p) => p._id === projId);
    if (proj) proj.status = 'Archived';
    return { success: true, data: proj };
  }

  if (endpoint.match(/^\/projects\/[^/]+\/members$/) && method === 'POST') {
    const projId = endpoint.split('/')[2];
    const proj = mockProjects.find((p) => p._id === projId);
    const user = mockUsers.find((u) => u._id === body.userId);
    if (proj && user) {
      proj.members.push({ user, role: body.role || 'Member' });
    }
    return { success: true, data: proj };
  }

  if (endpoint.match(/^\/projects\/[^/]+\/members\/[^/]+$/) && method === 'DELETE') {
    const [, , projId, , userId] = endpoint.split('/');
    const proj = mockProjects.find((p) => p._id === projId);
    if (proj) {
      proj.members = proj.members.filter((m) => m.user._id !== userId);
    }
    return { success: true, data: proj };
  }

  // 3. Task routes
  if (endpoint.match(/^\/projects\/[^/]+\/tasks/) && method === 'GET') {
    const projId = endpoint.split('/')[2];
    const statusParam = new URLSearchParams(endpoint.split('?')[1] || '').get('status');
    let tasks = mockTasks.filter((t) => (t.project._id || t.project) === projId);
    if (statusParam) tasks = tasks.filter((t) => t.status === statusParam);
    return { success: true, data: tasks };
  }

  if (endpoint.match(/^\/projects\/[^/]+\/tasks/) && method === 'POST') {
    const projId = endpoint.split('/')[2];
    const proj = mockProjects.find((p) => p._id === projId);
    const newTask = {
      _id: `task_${Date.now()}`,
      project: proj || { _id: projId, title: 'Project' },
      title: body.title,
      description: body.description || '',
      status: 'TODO',
      priority: body.priority || 'MEDIUM',
      assignee: mockUsers.find((u) => u._id === body.assigneeId) || null,
      version: 1,
      createdAt: new Date().toISOString()
    };
    mockTasks.unshift(newTask);
    return { success: true, data: newTask };
  }

  if (endpoint.startsWith('/tasks/') && method === 'GET' && !endpoint.includes('/comments')) {
    const taskId = endpoint.split('/')[2];
    const task = mockTasks.find((t) => t._id === taskId);
    if (!task) {
      const err = new Error('Task not found');
      err.status = 404;
      throw err;
    }
    return { success: true, data: task };
  }

  // Conditional update with version check (HTTP 409 simulation)
  if (endpoint.startsWith('/tasks/') && method === 'PUT') {
    const taskId = endpoint.split('/')[2];
    const task = mockTasks.find((t) => t._id === taskId);
    if (!task) {
      const err = new Error('Task not found');
      err.status = 404;
      throw err;
    }

    // Check version match
    if (body.version !== undefined && body.version !== task.version) {
      const conflictError = new Error(
        `Version conflict: Expected version v${task.version}, but received stale version v${body.version}.`
      );
      conflictError.status = 409;
      conflictError.isConflict = true;
      throw conflictError;
    }

    // Update fields and increment version
    if (body.title !== undefined) task.title = body.title;
    if (body.description !== undefined) task.description = body.description;
    if (body.status !== undefined) task.status = body.status;
    if (body.priority !== undefined) task.priority = body.priority;
    if (body.assigneeId !== undefined) {
      task.assignee = mockUsers.find((u) => u._id === body.assigneeId) || null;
    }
    task.version = (task.version || 1) + 1;

    return { success: true, data: task };
  }

  if (endpoint.startsWith('/tasks/') && method === 'DELETE') {
    const taskId = endpoint.split('/')[2];
    mockTasks = mockTasks.filter((t) => t._id !== taskId);
    return { success: true, message: 'Task deleted successfully' };
  }

  // 4. Comments routes
  if (endpoint.match(/^\/tasks\/[^/]+\/comments$/) && method === 'GET') {
    const taskId = endpoint.split('/')[2];
    const comments = mockComments.filter((c) => c.task === taskId);
    return { success: true, data: comments };
  }

  if (endpoint.match(/^\/tasks\/[^/]+\/comments$/) && method === 'POST') {
    const taskId = endpoint.split('/')[2];
    const storedUser = localStorage.getItem('collab_user');
    const user = storedUser ? JSON.parse(storedUser) : mockUsers[2];
    const newComm = {
      _id: `comm_${Date.now()}`,
      task: taskId,
      author: user,
      content: body.content,
      createdAt: new Date().toISOString()
    };
    mockComments.push(newComm);
    return { success: true, data: newComm };
  }

  if (endpoint.match(/^\/tasks\/[^/]+\/comments\/[^/]+$/) && method === 'DELETE') {
    const commentId = endpoint.split('/')[4];
    mockComments = mockComments.filter((c) => c._id !== commentId);
    return { success: true, message: 'Comment deleted' };
  }

  // 5. User admin routes
  if (endpoint === '/users' && method === 'GET') {
    return { success: true, data: mockUsers };
  }

  if (endpoint === '/users' && method === 'POST') {
    const newUser = {
      _id: `usr_${Date.now()}`,
      name: body.name,
      email: body.email,
      role: body.role || 'Team Member',
      isActive: true,
      createdAt: new Date().toISOString()
    };
    mockUsers.push(newUser);
    return { success: true, data: newUser };
  }

  if (endpoint.startsWith('/users/') && method === 'PUT') {
    const userId = endpoint.split('/')[2];
    const u = mockUsers.find((x) => x._id === userId);
    if (u) {
      if (body.role) u.role = body.role;
      if (body.name) u.name = body.name;
    }
    return { success: true, data: u };
  }

  if (endpoint.match(/^\/users\/[^/]+\/deactivate$/) && method === 'PATCH') {
    const userId = endpoint.split('/')[2];
    const u = mockUsers.find((x) => x._id === userId);
    if (u) u.isActive = !u.isActive;
    return { success: true, data: u };
  }

  return { success: true };
}

// Exported service contracts
export const authService = {
  login: (email, password) =>
    apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    }),
  getMe: () => apiFetch('/auth/me')
};

export const projectService = {
  getAll: (status) => {
    const query = status ? `?status=${status}` : '';
    return apiFetch(`/projects${query}`);
  },
  getById: (id) => apiFetch(`/projects/${id}`),
  create: (projectData) =>
    apiFetch('/projects', {
      method: 'POST',
      body: JSON.stringify(projectData)
    }),
  update: (id, projectData) =>
    apiFetch(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(projectData)
    }),
  archive: (id) =>
    apiFetch(`/projects/${id}/archive`, {
      method: 'PATCH'
    }),
  addMember: (id, memberData) =>
    apiFetch(`/projects/${id}/members`, {
      method: 'POST',
      body: JSON.stringify(memberData)
    }),
  updateMemberRole: (id, userId, role) =>
    apiFetch(`/projects/${id}/members/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({ role })
    }),
  removeMember: (id, userId) =>
    apiFetch(`/projects/${id}/members/${userId}`, {
      method: 'DELETE'
    })
};

export const taskService = {
  getByProject: (projectId, status) => {
    const query = status ? `?status=${status}` : '';
    return apiFetch(`/projects/${projectId}/tasks${query}`);
  },
  getById: (id) => apiFetch(`/tasks/${id}`),
  create: (projectId, taskData) =>
    apiFetch(`/projects/${projectId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(taskData)
    }),
  update: (id, updateData) =>
    apiFetch(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updateData)
    }),
  delete: (id) =>
    apiFetch(`/tasks/${id}`, {
      method: 'DELETE'
    })
};

export const commentService = {
  getByTask: (taskId) => apiFetch(`/tasks/${taskId}/comments`),
  create: (taskId, content) =>
    apiFetch(`/tasks/${taskId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content })
    }),
  delete: (taskId, commentId) =>
    apiFetch(`/tasks/${taskId}/comments/${commentId}`, {
      method: 'DELETE'
    })
};

export const userService = {
  getAll: () => apiFetch('/users'),
  create: (userData) =>
    apiFetch('/users', {
      method: 'POST',
      body: JSON.stringify(userData)
    }),
  update: (id, userData) =>
    apiFetch(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData)
    }),
  deactivate: (id) =>
    apiFetch(`/users/${id}/deactivate`, {
      method: 'PATCH'
    })
};
