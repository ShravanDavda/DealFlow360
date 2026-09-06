import api from './api';

export const getSubscriptions = async () => {
  const response = await api.get('/subscriptions');
  return response.data?.data || [];
};

export const getSubscription = async (subscriptionId) => {
  const response = await api.get(`/subscriptions/${subscriptionId}`);
  return response.data?.data || null;
};

export const modifySubscription = async (subscriptionId, payload = {}) => {
  const response = await api.patch(`/subscriptions/${subscriptionId}`, payload);
  return response.data?.data || null;
};

export const cancelSubscription = async (subscriptionId, payload = {}) => {
  const response = await api.post(`/subscriptions/${subscriptionId}/cancel`, payload);
  return response.data?.data || null;
};

export const getInvoices = async () => {
  const response = await api.get('/invoices');
  return response.data?.data || [];
};

export const getInvoice = async (invoiceId) => {
  const response = await api.get(`/invoices/${invoiceId}`);
  return response.data?.data || null;
};

export const recordPayment = async (invoiceId, payload = {}) => {
  const response = await api.post(`/invoices/${invoiceId}/payment`, payload);
  return response.data?.data || null;
};
