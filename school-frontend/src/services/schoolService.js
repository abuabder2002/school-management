import api from './api';

export const schoolService = {
  listSchools: async () => {
    const response = await api.get('/api/auth/schools');
    return response.data;
  },

  createSchool: async (schoolData) => {
    // schoolData: { name, adminName, adminEmail, adminPassword, subscriptionStart, subscriptionEnd, planType }
    const response = await api.post('/api/auth/schools', schoolData);
    return response.data;
  },

  updateSubscription: async (schoolId, subscriptionData) => {
    // subscriptionData: { subscriptionStart, subscriptionEnd, planType, active }
    const response = await api.put(`/api/auth/schools/${schoolId}/subscription`, subscriptionData);
    return response.data;
  },

  getModules: async (schoolId) => {
    const response = await api.get(`/api/auth/schools/${schoolId}/modules`);
    return response.data;
  },

  setModule: async (schoolId, moduleKey, enabled) => {
    const response = await api.put(`/api/auth/schools/${schoolId}/modules`, { moduleKey, enabled });
    return response.data;
  },
};
