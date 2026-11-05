import api from './api';

export const feeService = {
  // Class-wise Billing Summary
  getClassBillingSummary: async () => {
    const response = await api.get('/api/fees/class-summary');
    return response.data;
  },

  // Student Billing for a Class
  getStudentBillingByClass: async (className) => {
    const response = await api.get(`/api/fees/class/${encodeURIComponent(className)}`);
    return response.data;
  },

  // Download Excel Template (Class-specific or Multi-Class)
  downloadTemplate: async (className) => {
    const url = className && className !== 'ALL' && className !== 'All Classes'
      ? `/api/fees/template/${encodeURIComponent(className)}`
      : `/api/fees/template`;
    const response = await api.get(url, {
      responseType: 'blob',
    });
    return response;
  },

  // Atomic Bulk Billing Upload (Multi-Class supported)
  bulkUpload: async (className, formData) => {
    const url = className && className !== 'ALL' && className !== 'All Classes'
      ? `/api/fees/bulk-upload?className=${encodeURIComponent(className)}`
      : `/api/fees/bulk-upload`;
    const response = await api.post(url, formData, {
      headers: {
        'Content-Type': undefined,
      },
    });
    return response.data;
  },

  // Individual Student Billing create/update
  createFee: async (feeData) => {
    const response = await api.post('/api/fees', feeData);
    return response.data;
  },

  updateFee: async (id, feeData) => {
    const response = await api.put(`/api/fees/${id}`, feeData);
    return response.data;
  },

  getFeesByStudent: async (studentId) => {
    const response = await api.get(`/api/fees/student/${studentId}`);
    return response.data;
  },

  recordPayment: async (feeId, paymentData) => {
    const response = await api.post(`/api/fees/${feeId}/payments`, paymentData);
    return response.data;
  },

  getPaymentsByFee: async (feeId) => {
    const response = await api.get(`/api/fees/${feeId}/payments`);
    return response.data;
  },

  getPaymentsByStudent: async (studentId) => {
    const response = await api.get(`/api/fees/student/${studentId}/payments`);
    return response.data;
  },

  // Recent Payments for ERP Finance Management. fromDate/toDate (YYYY-MM-DD) narrow the range;
  // when either is set the backend ignores the 10-row default and returns everything in range
  // (still capped by limit), so pass a higher limit alongside a date filter.
  getRecentPayments: async (limit = 10, fromDate = '', toDate = '') => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (fromDate) params.set('fromDate', fromDate);
    if (toDate) params.set('toDate', toDate);
    const response = await api.get(`/api/fees/payments/recent?${params.toString()}`);
    return response.data;
  }
};
