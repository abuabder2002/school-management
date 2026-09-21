import api from './api';

export const feeService = {
  getFeesByStudent: async (studentId) => {
    const response = await api.get(`/api/fees/student/${studentId}`);
    return response.data;
  },

  createFee: async (feeData) => {
    // feeData: { studentId, totalAmount, paidAmount, dueDate, description, feeType, academicYear }
    const response = await api.post('/api/fees', feeData);
    return response.data;
  },

  updateFee: async (id, feeData) => {
    // feeData: { totalAmount, paidAmount, dueDate, description, feeType, academicYear }
    const response = await api.put(`/api/fees/${id}`, feeData);
    return response.data;
  },

  recordPayment: async (feeId, paymentData) => {
    // paymentData: { amountPaid, paymentDate, paymentMethod, note }
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
  }
};
