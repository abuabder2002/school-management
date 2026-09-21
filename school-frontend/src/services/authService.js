import api from './api';

export const authService = {
  login: async (credentials) => {
    // credentials: { username, password }
    const response = await api.post('/api/auth/login', credentials);
    return response.data;
  },

  register: async (userData) => {
    // userData: { username, password, email, role }
    const response = await api.post('/api/auth/register', userData);
    return response.data;
  },

  validate: async () => {
    const response = await api.get('/api/auth/validate');
    return response.data;
  },

  getParents: async () => {
    const response = await api.get('/api/auth/parents');
    return response.data;
  },

  createParent: async (parentData) => {
    // parentData: { name, email, password, studentId }
    // Uses dedicated POST /api/auth/parents which enforces role=PARENT and requires studentId
    const response = await api.post('/api/auth/parents', parentData);
    return response.data;
  }
};
