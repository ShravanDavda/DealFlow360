import api from './api';

export const getFulfillmentOrders = async () => {
  const response = await api.get('/fulfillment/orders');
  return response.data?.data || [];
};

export const getFulfillmentDetail = async (orderId) => {
  const response = await api.get(`/fulfillment/orders/${orderId}`);
  return response.data?.data || null;
};

export const acceptSplit = async (orderId) => {
  const response = await api.post(`/fulfillment/orders/${orderId}/accept-split`);
  return response.data?.data || null;
};

export const manualOverride = async (orderId, payload = {}) => {
  const response = await api.post(`/fulfillment/orders/${orderId}/manual-override`, payload);
  return response.data?.data || null;
};

export const consolidateBackorder = async (orderId) => {
  const response = await api.post(`/fulfillment/orders/${orderId}/consolidate-backorder`);
  return response.data?.data || null;
};
