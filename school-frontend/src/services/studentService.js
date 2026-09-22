import api from './api';

export const studentService = {
  getAllStudents: async () => {
    const response = await api.get('/api/students');
    return response.data;
  },

  getStudentById: async (id) => {
    const response = await api.get(`/api/students/${id}`);
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

  getStudentsByParent: async (parentId) => {
    const response = await api.get(`/api/students/parent/${parentId}`);
    return response.data;
  },

  importExcel: async (formData) => {
    const response = await api.post('/api/students/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  exportExcel: async () => {
    const response = await api.get('/api/students/export', {
      responseType: 'blob',
    });
    return response;
  },

  downloadBulkTemplate: async () => {
    const response = await api.get('/api/students/bulk-template', {
      responseType: 'blob',
    });
    return response;
  },

  bulkUpload: async (formData) => {
    const response = await api.post('/api/students/bulk-upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }
};
