import api from './api';

export const holidayService = {
  getAll: async () => {
    const response = await api.get('/api/attendance/holidays');
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/api/attendance/holidays', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/api/attendance/holidays/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/api/attendance/holidays/${id}`);
    return response.data;
  },
};
