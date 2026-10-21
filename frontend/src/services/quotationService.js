import api from './api';

export const getQuotations = async (params = {}) => {
  const response = await api.get('/quotations', { params });
  return response.data?.data || [];
};

export const getQuotation = async (quotationId) => {
  const response = await api.get(`/quotations/${quotationId}`);
  return response.data?.data || null;
};

export const createQuotation = async (payload) => {
  const response = await api.post('/quotations', payload);
  return response.data?.data || null;
};

export const previewQuotation = async (payload) => {
  const response = await api.post('/quotations/preview', payload);
  return response.data?.data || null;
};

export const updateQuotation = async (quotationId, payload) => {
  const response = await api.put(`/quotations/${quotationId}`, payload);
  return response.data?.data || null;
};

export const submitQuotation = async (quotationId, payload = {}) => {
  const response = await api.post(`/quotations/${quotationId}/submit`, payload);
  return response.data?.data || null;
};

export const getRecommendations = async (quotationId) => {
  const response = await api.get(`/quotations/${quotationId}/recommendations`);
  return response.data?.data || [];
};

export const getQuotationMessages = async (quotationId) => {
  const response = await api.get(`/quotations/${quotationId}/messages`);
  return response.data?.data || [];
};

export const sendQuotationMessage = async (quotationId, message) => {
  const response = await api.post(`/quotations/${quotationId}/messages`, { message });
  return response.data?.data || null;
};
