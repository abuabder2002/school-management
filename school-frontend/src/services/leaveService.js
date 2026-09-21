import api from './api';

export const leaveService = {
  // Parent submit leave request
  submit: async (data) => {
    const response = await api.post('/api/attendance/leave', data);
    return response.data;
  },

  // Admin/Teacher get all leave requests
  getAll: async () => {
    const response = await api.get('/api/attendance/leave');
    return response.data;
  },

  // Parent get own leave requests
  getMyLeave: async () => {
    const response = await api.get('/api/attendance/leave/my');
    return response.data;
  },

  // Admin/Teacher approve
  approve: async (id, note = '') => {
    const response = await api.put(`/api/attendance/leave/${id}/approve`, { note });
    return response.data;
  },

  // Admin/Teacher reject
  reject: async (id, note = '') => {
    const response = await api.put(`/api/attendance/leave/${id}/reject`, { note });
    return response.data;
  },
};
