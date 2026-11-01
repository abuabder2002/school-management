import api from './api';

export const academicService = {
  // Classes
  getAllClasses: async () => {
    const response = await api.get('/api/academic/classes');
    return response.data;
  },

  createClass: async (classData) => {
    const response = await api.post('/api/academic/classes', classData);
    return response.data;
  },

  // Subjects
  // schoolId is honored only for a SUPER_ADMIN caller (see academic-service's resolveSchoolId overload);
  // every other role keeps seeing their own school regardless of what's passed.
  getAllSubjects: async (schoolId) => {
    const response = await api.get('/api/academic/subjects', { params: schoolId ? { schoolId } : {} });
    return response.data;
  },

  createSubject: async (subjectData) => {
    const response = await api.post('/api/academic/subjects', subjectData);
    return response.data;
  },

  // Exams
  getAllExams: async () => {
    const response = await api.get('/api/academic/exams');
    return response.data;
  },

  createExam: async (examData) => {
    const response = await api.post('/api/academic/exams', examData);
    return response.data;
  },

  // Marks
  submitMarks: async (markData) => {
    const response = await api.post('/api/academic/marks', markData);
    return response.data;
  },

  getMarksByStudent: async (studentId) => {
    const response = await api.get(`/api/academic/marks/student/${studentId}`);
    return response.data;
  },

  // Board Results — schoolId is honored only for a SUPER_ADMIN caller; every other role
  // (ADMIN/TEACHER) always sees/acts on their own school regardless of what's passed.
  getBoardResults: async (schoolId) => {
    const response = await api.get('/api/academic/board-results', { params: schoolId ? { schoolId } : {} });
    return response.data;
  },

  createBoardResult: async (data, schoolId) => {
    const response = await api.post('/api/academic/board-results', data, { params: schoolId ? { schoolId } : {} });
    return response.data;
  },

  updateBoardResult: async (id, data, schoolId) => {
    const response = await api.put(`/api/academic/board-results/${id}`, data, { params: schoolId ? { schoolId } : {} });
    return response.data;
  },

  deleteBoardResult: async (id, schoolId) => {
    const response = await api.delete(`/api/academic/board-results/${id}`, { params: schoolId ? { schoolId } : {} });
    return response.data;
  },
};
