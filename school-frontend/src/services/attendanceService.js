import api from './api';

export const attendanceService = {
  markAttendance: async (attendanceData) => {
    // attendanceData: { studentId, date, status, remarks }
    const response = await api.post('/api/attendance', attendanceData);
    return response.data;
  },

  getAttendanceByStudent: async (studentId) => {
    const response = await api.get(`/api/attendance/student/${studentId}`);
    return response.data;
  },

  getTodayAttendance: async () => {
    const response = await api.get('/api/attendance/today');
    return response.data;
  }
};
