import api from './api';

// The school Admin's "back up, then clear all data". Always acts on the logged-in admin's own school.
export const schoolDataService = {
  // { counts: { Students: 12, Payments: 40, ... }, total }
  getSummary: async () => {
    const response = await api.get('/api/school/data-summary');
    return response.data;
  },

  // An Excel copy of every record that "clear" deletes. Resolves to a Blob.
  downloadBackup: async () => {
    const response = await api.get('/api/school/data-backup', { responseType: 'blob' });
    return response.data;
  },

  // Permanently deletes the school's records. The server only accepts it with the word DELETE. No undo.
  clearAll: async () => {
    const response = await api.post('/api/school/clear-data', { confirm: 'DELETE' });
    return response.data;
  },
};
