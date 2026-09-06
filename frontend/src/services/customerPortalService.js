import api from './api';

export const getCustomerQuotes = async () => {
  const response = await api.get('/customer/quotes');
  return response.data?.data || [];
};

export const getCustomerQuote = async (quoteId) => {
  const response = await api.get(`/customer/quotes/${quoteId}`);
  return response.data?.data || null;
};

export const getNegotiationHistory = async (quoteId) => {
  const response = await api.get(`/customer/quotes/${quoteId}/history`);
  return response.data?.data || null;
};

export const submitCustomerNegotiation = async (quoteId, payload) => {
  const response = await api.post(`/customer/quotes/${quoteId}/negotiation`, payload);
  return response.data || null;
};

export const confirmCustomerQuote = async (quoteId) => {
  const response = await api.post(`/customer/quotes/${quoteId}/confirm`);
  return response.data || null;
};

export default {
  getCustomerQuotes,
  getCustomerQuote,
  getNegotiationHistory,
  submitCustomerNegotiation,
  confirmCustomerQuote,
};
