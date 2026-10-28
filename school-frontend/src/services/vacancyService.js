import api from './api';

export const vacancyService = {
  list: async () => {
    const response = await api.get('/api/auth/vacancies');
    return response.data;
  },

  create: async (vacancy) => {
    const response = await api.post('/api/auth/vacancies', vacancy);
    return response.data;
  },

  update: async (id, vacancy) => {
    const response = await api.put(`/api/auth/vacancies/${id}`, vacancy);
    return response.data;
  },

  remove: async (id) => {
    const response = await api.delete(`/api/auth/vacancies/${id}`);
    return response.data;
  },
};
