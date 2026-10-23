// Base API URL uses Vite dev proxy (/api -> http://localhost:5000/api)
const API_BASE_URL = '/api';

/**
 * Core native fetch wrapper for real backend communication.
 * - Automatically attaches Bearer token header if present.
 * - Throws structured errors with HTTP status codes.
 * - Identifies HTTP 409 Conflict for concurrent updates.
 * - Propagates real errors without fallback mocking.
 */
export async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem('token');

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  };

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers
    });
  } catch (networkError) {
    throw new Error(
      'Unable to connect to the CollabWorkers API server. Please ensure the backend is running on port 5000.'
    );
  }

  let data = null;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    const error = new Error(
      (data && data.message) || `Request failed with status ${response.status}`
    );
    error.status = response.status;
    error.data = data;
    if (response.status === 409) {
      error.isConflict = true;
      error.currentVersion = data?.currentVersion;
    }
    throw error;
  }

  return data;
}

// Authentication Service
export const authService = {
  login: (email, password) =>
    apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    }),
  getMe: () => apiFetch('/auth/me')
};

// Project Management Service
export const projectService = {
  getAll: (status) => {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
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
  delete: (id) =>
    apiFetch(`/projects/${id}`, {
      method: 'DELETE'
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

// Task Management Service
export const taskService = {
  getByProject: (projectId, status) => {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    return apiFetch(`/projects/${projectId}/tasks${query}`);
  },
  getById: (id) => apiFetch(`/tasks/${id}`),
  create: (projectId, taskData) =>
    apiFetch(`/projects/${projectId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(taskData)
    }),
  // Sends version to enable optimistic concurrency check on backend
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

// Comments Service
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

// Admin User Management Service
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
