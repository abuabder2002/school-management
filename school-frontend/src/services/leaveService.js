import api from './api';

export const leaveService = {
  // Parent submit leave request (no approval — recorded directly)
  submit: async (data) => {
    const response = await api.post('/api/attendance/leave', data);
    return response.data;
  },

  // Admin get all submitted leave records (read-only)
  getAll: async () => {
    const response = await api.get('/api/attendance/leave');
    return response.data;
  },

  // Admin records a leave directly for a student whose parent didn't submit one.
  // Notifies the student's parent portal.
  submitAdminLeave: async (data) => {
    const response = await api.post('/api/attendance/leave/admin', data);
    return response.data;
  },

  // Teacher get leave records for assigned class/section (backend-filtered)
  getTeacherLeaves: async () => {
    const response = await api.get('/api/attendance/leave/teacher');
    return response.data;
  },

  // Parent get own submitted leave requests
  getMyLeave: async () => {
    const response = await api.get('/api/attendance/leave/my');
    return response.data;
  },

  // ---- Teacher's own leave ----

  // Teacher submits leave for themselves (teacherName is their own display name)
  submitTeacherLeave: async (data) => {
    const response = await api.post('/api/attendance/teacher-leave', data);
    return response.data;
  },

  // Admin: every teacher's leave, most recent first
  getAllTeacherLeave: async () => {
    const response = await api.get('/api/attendance/teacher-leave');
    return response.data;
  },

  // Teacher: only their own submitted leave
  getMyTeacherLeave: async () => {
    const response = await api.get('/api/attendance/teacher-leave/my');
    return response.data;
  },

  // ---- Leave Reasons (bilingual English + Tamil) ----

  // Get active reasons for parent dropdown
  getActiveReasons: async () => {
    const response = await api.get('/api/attendance/leave-reasons');
    return response.data;
  },

  // Admin: get ALL reasons (active + inactive)
  getAllReasons: async () => {
    const response = await api.get('/api/attendance/leave-reasons/all');
    return response.data;
  },

  // Admin: create a new predefined reason
  createReason: async (data) => {
    const response = await api.post('/api/attendance/leave-reasons', data);
    return response.data;
  },

  // Admin: update English/Tamil text of a reason
  updateReason: async (id, data) => {
    const response = await api.put(`/api/attendance/leave-reasons/${id}`, data);
    return response.data;
  },

  // Admin: soft-delete (deactivate) a reason — historical records remain
  deleteReason: async (id) => {
    const response = await api.delete(`/api/attendance/leave-reasons/${id}`);
    return response.data;
  },

  // Admin: re-enable a deactivated reason
  reactivateReason: async (id) => {
    const response = await api.put(`/api/attendance/leave-reasons/${id}/reactivate`);
    return response.data;
  },

  // ---- Leave Reasons (Super Admin, apply to every school) ----

  // Super Admin: all global reasons (active + inactive)
  getGlobalReasons: async () => {
    const response = await api.get('/api/attendance/leave-reasons/global');
    return response.data;
  },

  // Super Admin: create a reason visible to every school
  createGlobalReason: async (data) => {
    const response = await api.post('/api/attendance/leave-reasons/global', data);
    return response.data;
  },

  // Super Admin: update a global reason's text
  updateGlobalReason: async (id, data) => {
    const response = await api.put(`/api/attendance/leave-reasons/global/${id}`, data);
    return response.data;
  },

  // Super Admin: deactivate a global reason for every school
  deleteGlobalReason: async (id) => {
    const response = await api.delete(`/api/attendance/leave-reasons/global/${id}`);
    return response.data;
  },

  // Super Admin: re-enable a deactivated global reason
  reactivateGlobalReason: async (id) => {
    const response = await api.put(`/api/attendance/leave-reasons/global/${id}/reactivate`);
    return response.data;
  },
};
