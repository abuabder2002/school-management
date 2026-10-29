import api from './api';

export const scheduleService = {
  getForClass: async (className, section, date) => {
    const response = await api.get('/api/academic/schedule', { params: { className, section: section || undefined, date: date || undefined } });
    return response.data;
  },

  create: async (entry) => {
    const response = await api.post('/api/academic/schedule', entry);
    return response.data;
  },

  update: async (id, entry) => {
    const response = await api.put(`/api/academic/schedule/${id}`, entry);
    return response.data;
  },

  remove: async (id) => {
    const response = await api.delete(`/api/academic/schedule/${id}`);
    return response.data;
  },
};
