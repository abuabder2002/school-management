import api from './api';

export const notificationService = {
  // Send broadcast notification (Admin)
  sendNotification: async (notificationData) => {
    const response = await api.post('/api/notifications', notificationData);
    return response.data?.data || response.data;
  },

  // Get full notification history (Admin)
  getHistory: async () => {
    const response = await api.get('/api/notifications/history');
    return response.data?.data || response.data;
  },

  // Get notifications for Students & Parents (Students + Both)
  getStudentNotifications: async () => {
    const response = await api.get('/api/notifications/student');
    return response.data?.data || response.data;
  },

  // Get notifications for Teachers (Teachers + Both)
  getTeacherNotifications: async () => {
    const response = await api.get('/api/notifications/teacher');
    return response.data?.data || response.data;
  },

  // Legacy parent-specific endpoints
  sendParentNotification: async (notificationData) => {
    const response = await api.post('/api/notifications/parent', notificationData);
    return response.data?.data || response.data;
  },

  getParentNotifications: async (parentId) => {
    const response = await api.get(`/api/notifications/parent/${parentId}`);
    return response.data?.data || response.data;
  }
};

export default notificationService;
