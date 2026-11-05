import api from './api';

export const studentService = {
  getAllStudents: async (params = {}) => {
    const response = await api.get('/api/students', { params });
    return response.data;
  },

  getStudentById: async (id) => {
    const response = await api.get(`/api/students/${id}`);
    return response.data;
  },

  getDistinctClasses: async () => {
    const response = await api.get('/api/students/classes');
    return response.data;
  },

  getActiveStudentsByClass: async (className) => {
    const response = await api.get(`/api/students/class/${encodeURIComponent(className)}/active`);
    return response.data;
  },

  // Sections this school's own students actually use in a class — never a fixed A/B/C/D list.
  getSectionsForClass: async (className) => {
    const response = await api.get(`/api/students/class/${encodeURIComponent(className)}/sections`);
    return response.data;
  },

  createStudent: async (studentData) => {
    const response = await api.post('/api/students', studentData);
    return response.data;
  },

  updateStudent: async (id, studentData) => {
    const response = await api.put(`/api/students/${id}`, studentData);
    return response.data;
  },

  deleteStudent: async (id) => {
    const response = await api.delete(`/api/students/${id}`);
    return response.data;
  },

  // Permanently deletes every student record. No undo.
  clearAllStudents: async () => {
    const response = await api.delete('/api/students/clear-all');
    return response.data;
  },

  updateStudentStatus: async (id, status) => {
    const response = await api.patch(`/api/students/${id}/status`, { status });
    return response.data;
  },

  getStudentsByParent: async (parentId) => {
    const response = await api.get(`/api/students/parent/${parentId}`);
    return response.data;
  },

  importExcel: async (formData) => {
    const response = await api.post('/api/students/import', formData, {
      headers: {
        'Content-Type': undefined,
      },
    });
    return response.data;
  },

  exportExcel: async (className) => {
    const response = await api.get('/api/students/export', {
      params: className ? { className } : {},
      responseType: 'blob',
    });
    return response;
  },

  resetParentPassword: async (id, newPassword) => {
    const response = await api.patch(`/api/students/${id}/parent-password`, { newPassword });
    return response.data;
  },

  getClassSummary: async () => {
    const response = await api.get('/api/students/class-summary');
    return response.data;
  },

  downloadBulkTemplate: async (className) => {
    const response = await api.get('/api/students/bulk-template', {
      params: className ? { className } : {},
      responseType: 'blob',
    });
    return response;
  },

  bulkValidate: async (formData, className) => {
    const response = await api.post('/api/students/bulk-validate', formData, {
      params: className ? { className } : {},
      headers: {
        'Content-Type': undefined,
      },
    });
    return response.data;
  },

  bulkUpload: async (formData, className) => {
    const response = await api.post('/api/students/bulk-upload', formData, {
      params: className ? { className } : {},
      headers: {
        'Content-Type': undefined,
      },
    });
    return response.data;
  }
};
