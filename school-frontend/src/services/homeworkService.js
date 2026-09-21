import api from './api';

export const homeworkService = {
  getAll: async () => {
    const response = await api.get('/api/academic/homework');
    return response.data;
  },

  getByClass: async (className) => {
    const response = await api.get(`/api/academic/homework/class/${encodeURIComponent(className)}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/api/academic/homework', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/api/academic/homework/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/api/academic/homework/${id}`);
    return response.data;
  },
};
