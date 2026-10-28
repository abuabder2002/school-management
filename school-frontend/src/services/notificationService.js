import api from './api';

export const notificationService = {
  /** Admin: Send a new notification */
  sendNotification: async (data) => {
    // data: { date, audience, message }
    const response = await api.post('/api/notifications', data);
    return response.data;
  },

  /** Admin: Get all notification history */
  getHistory: async () => {
    const response = await api.get('/api/notifications/history');
    return response.data;
  },

  /** Student/Teacher: Get my applicable notifications. className is needed for Parent/Student
   *  portals so class-targeted broadcasts can be matched (ignored for Teacher/Admin). */
  getMyNotifications: async (className) => {
    const response = await api.get('/api/notifications/my', { params: className ? { className } : {} });
    return response.data;
  },

  /** Admin: Edit the message of a previously sent notification */
  updateNotification: async (id, message) => {
    const response = await api.put(`/api/notifications/${id}`, { message });
    return response.data;
  },
};
