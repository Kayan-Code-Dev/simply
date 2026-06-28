import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Auto attach Authorization token from localStorage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('simply_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Auto logout on 401/403 invalid/expired token response
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      const errMsg = error.response.data?.error;
      if (
        errMsg === 'Invalid or expired token.' || 
        errMsg === 'Access token required.' || 
        errMsg === 'Account suspended.'
      ) {
        localStorage.removeItem('simply_token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth endpoints
export const authApi = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
  changePassword: (data) => api.post('/auth/change-password', data),
  checkSponsor: (username) => api.get(`/auth/sponsor/${username}`)
};

// Packages and Universities endpoints
export const packageApi = {
  getUniversities: () => api.get('/packages/universities'),
  purchase: (data) => api.post('/packages/purchase', data),
  uploadReceipt: (transId, receiptPath) => api.post(`/packages/upload-receipt/${transId}`, { receiptPath })
};

// Wallet endpoints
export const walletApi = {
  getInfo: () => api.get('/wallet/info'),
  deposit: (data) => api.post('/wallet/deposit', data),
  withdraw: (data) => api.post('/wallet/withdraw', data),
  transfer: (data) => api.post('/wallet/transfer', data),
  activateAccount: (paymentMethod) => api.post('/wallet/activate-account', { paymentMethod }),
  getCommissions: () => api.get('/wallet/commissions'),
  getPinStatus: () => api.get('/wallet/pin-status'),
  requestOtp: () => api.post('/wallet/request-otp'),
  setPin: (data) => api.post('/wallet/set-pin', data),
  changePin: (data) => api.post('/wallet/change-pin', data)
};

// E-PIN endpoints
export const epinApi = {
  list: () => api.get('/epins'),
  generate: (data) => api.post('/epins/generate', data),
  transfer: (data) => api.post('/epins/transfer', data),
  redeem: (data) => api.post('/epins/redeem', data)
};

// Team endpoints
export const teamApi = {
  getTree: (userId) => api.get('/team/tree', { params: userId ? { userId } : {} }),
  getLegs: () => api.get('/team/legs-performance'),
  getChallenges: () => api.get('/team/challenges'),
  getChallengeProgress: (challengeId) => api.get(`/team/challenge/${challengeId}`),
  getPools: () => api.get('/team/pools')
};

// Admin endpoints
export const adminApi = {
  getStats: () => api.get('/admin/stats'),
  getFinancialAnalytics: (params) => api.get('/admin/financial-analytics', { params }),
  getUsers: () => api.get('/admin/users'),
  updateUser: (userId, data) => api.patch(`/admin/users/${userId}`, data),
  getPendingTransactions: () => api.get('/admin/pending-transactions'),
  approveTransaction: (transId) => api.post(`/admin/approve-transaction/${transId}`),
  rejectTransaction: (transId) => api.post(`/admin/reject-transaction/${transId}`),
  getChallenges: () => api.get('/admin/challenges'),
  createChallenge: (formData) => api.post('/admin/challenges', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  updateChallenge: (id, formData) => api.put(`/admin/challenges/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  deleteChallenge: (id) => api.delete(`/admin/challenges/${id}`),
  distributePools: () => api.post('/admin/distribute-pools'),
  adjustWallet: (userId, data) => api.post(`/admin/users/${userId}/adjust-wallet`, data),
  getAllTransactions: () => api.get('/admin/transactions'),
  impersonateUser: (userId) => api.post(`/admin/users/${userId}/impersonate`),
  getPackages: () => api.get('/admin/packages'),
  createPackage: (formData) => api.post('/admin/packages', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  updatePackage: (id, formData) => api.put(`/admin/packages/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  deletePackage: (id) => api.delete(`/admin/packages/${id}`),
  createUniversity: (data) => api.post('/admin/universities', data),
  updateUniversity: (id, data) => api.put(`/admin/universities/${id}`, data),
  deleteUniversity: (id) => api.delete(`/admin/universities/${id}`),
  getTickets: () => api.get('/admin/tickets'),
  createTicket: (data) => api.post('/admin/tickets', data),
  getMessages: (ticketId) => api.get(`/admin/tickets/${ticketId}/messages`),
  sendMessage: (ticketId, data) => api.post(`/admin/tickets/${ticketId}/messages`, data),
  updateTicketStatus: (ticketId, data) => api.patch(`/admin/tickets/${ticketId}/status`, data),
  getPendingKyc: () => api.get('/admin/kyc/pending'),
  approveKyc: (userId) => api.post(`/admin/kyc/${userId}/approve`),
  rejectKyc: (userId) => api.post(`/admin/kyc/${userId}/reject`),
  getUserStats: (userId) => api.get(`/admin/users/${userId}/stats`),
  getEmailTemplates: () => api.get('/admin/email-templates'),
  updateEmailTemplate: (id, data) => api.put(`/admin/email-templates/${id}`, data),
  testEmailTemplate: (id, data) => api.post(`/admin/email-templates/${id}/test`, data),
  sendEmailBroadcast: (data) => api.post('/admin/email-broadcast', data)
};

// Support Ticket endpoints
export const ticketApi = {
  getTickets: () => api.get('/tickets'),
  createTicket: (data) => api.post('/tickets', data),
  getMessages: (ticketId) => api.get(`/tickets/${ticketId}/messages`),
  sendMessage: (ticketId, data) => api.post(`/tickets/${ticketId}/messages`, data)
};

// System Settings endpoints
export const settingsApi = {
  getBranding: () => api.get('/settings'),
  updateBranding: (formData) => api.put('/settings', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getPaymentSettings: () => api.get('/settings/payment'),
  updatePaymentSettings: (data) => api.put('/settings/payment', data)
};

// News endpoints
export const newsApi = {
  getAll: (params) => api.get('/news', { params }),
  getById: (id) => api.get(`/news/${id}`),
  create: (formData) => api.post('/news', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id, formData) => api.put(`/news/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  delete: (id) => api.delete(`/news/${id}`)
};

// KYC endpoints
export const kycApi = {
  getStatus: () => api.get('/kyc/status'),
  submit: (formData) => api.post('/kyc/submit', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
};

export default api;
