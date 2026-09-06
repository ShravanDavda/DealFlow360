import api from './api';

export const getProductPairings = async (params = {}) => {
  const response = await api.get('/product-pairings', { params });
  return response.data?.data || [];
};

export const getProductPairing = async (id) => {
  const response = await api.get(`/product-pairings/${id}`);
  return response.data?.data || null;
};

export const createProductPairing = async (payload) => {
  const response = await api.post('/product-pairings', payload);
  return response.data?.data || null;
};

export const updateProductPairing = async (id, payload) => {
  const response = await api.put(`/product-pairings/${id}`, payload);
  return response.data?.data || null;
};

export const deactivateProductPairing = async (id) => {
  const response = await api.patch(`/product-pairings/${id}/deactivate`);
  return response.data?.data || null;
};

export const deleteProductPairing = async (id, { hard = false } = {}) => {
  const response = await api.delete(`/product-pairings/${id}`, { params: { hard } });
  return response.data;
};

export const getProductRecommendations = async (productId) => {
  const response = await api.get(`/product-pairings/recommendations/${productId}`);
  return response.data?.data || null;
};

export default {
  getProductPairings,
  getProductPairing,
  createProductPairing,
  updateProductPairing,
  deactivateProductPairing,
  deleteProductPairing,
  getProductRecommendations,
};
