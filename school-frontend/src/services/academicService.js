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
  getAllSubjects: async () => {
    const response = await api.get('/api/academic/subjects');
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
  }
};
