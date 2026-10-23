const API_BASE_URL = 'http://localhost:5000/api';

/**
 * Core native fetch wrapper that:
 * 1. Automatically attaches the Authorization header when a token is present
 * 2. Parses JSON responses
 * 3. Handles HTTP 409 Conflict detection for concurrent updates
 * 4. Normalizes error messages
 */
export async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem('token');

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  };

  const config = {
    ...options,
    headers
  };

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  } catch (networkError) {
    throw new Error(`Cannot connect to server at ${API_BASE_URL}. Ensure the backend is running.`);
  }

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
}

// Auth API services
export const authService = {
  login: (email, password) =>
    apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    }),
  getMe: () => apiFetch('/auth/me')
};

// Project API services
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

// Task API services
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
  // Sends version for optimistic concurrency update check
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

// Comment API services
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

// Admin User API services
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
