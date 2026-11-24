import api from './api';

export const marksService = {
  // Query marks with filters: className, section, examName, subjectName
  getMarks: async (params = {}) => {
    const response = await api.get('/api/academic/marks', { params });
    return response.data;
  },

  getMarkById: async (id) => {
    const response = await api.get(`/api/academic/marks/${id}`);
    return response.data;
  },

  saveMark: async (markData) => {
    const response = await api.post('/api/academic/marks', markData);
    return response.data;
  },

  updateMark: async (id, markData) => {
    const response = await api.put(`/api/academic/marks/${id}`, markData);
    return response.data;
  },

  deleteMark: async (id) => {
    const response = await api.delete(`/api/academic/marks/${id}`);
    return response.data;
  },

  saveBatchMarks: async (batchData) => {
    const response = await api.post('/api/academic/marks/batch', batchData);
    return response.data;
  },

  bulkUpload: async (formData, params = {}) => {
    const response = await api.post('/api/academic/marks/bulk-upload', formData, {
      params,
      headers: {
        'Content-Type': undefined,
      },
    });
    return response.data;
  },

  // Mark sheet template: one row per student, one column per selected subject
  downloadTemplate: async ({ className, section, subjectIds = [], examName } = {}) => {
    const response = await api.get('/api/academic/marks/bulk-template', {
      params: {
        subjectIds: subjectIds.join(','),
        ...(className && { className }),
        ...(className && section && { section }),
        ...(examName && { examName }),
      },
      responseType: 'blob',
    });
    return response;
  },

  // Section Subjects: which subjects each class + section studies (pre-selects the template columns)
  getSectionSubjects: async () => {
    const response = await api.get('/api/academic/section-subjects');
    return response.data;
  },

  saveSectionSubjects: async ({ className, section, subjectIds }) => {
    const response = await api.put('/api/academic/section-subjects', { className, section, subjectIds });
    return response.data;
  },

  // Supporting master data
  getExams: async () => {
    const response = await api.get('/api/academic/exams');
    return response.data;
  },

  getSubjects: async () => {
    const response = await api.get('/api/academic/subjects');
    return response.data;
  },

  getClasses: async () => {
    const response = await api.get('/api/academic/classes');
    return response.data;
  },

  createExam: async (examData) => {
    const response = await api.post('/api/academic/exams', examData);
    return response.data;
  },

  updateExam: async (id, examData) => {
    const response = await api.put(`/api/academic/exams/${id}`, examData);
    return response.data;
  },

  deleteExam: async (id) => {
    const response = await api.delete(`/api/academic/exams/${id}`);
    return response.data;
  },

  createSubject: async (subjectData) => {
    const response = await api.post('/api/academic/subjects', subjectData);
    return response.data;
  },

  updateSubject: async (id, subjectData) => {
    const response = await api.put(`/api/academic/subjects/${id}`, subjectData);
    return response.data;
  },

  deleteSubject: async (id) => {
    const response = await api.delete(`/api/academic/subjects/${id}`);
    return response.data;
  },

  getMarksByStudent: async (studentId) => {
    const response = await api.get(`/api/academic/marks/student/${studentId}`);
    return response.data;
  }
};


export default marksService;
