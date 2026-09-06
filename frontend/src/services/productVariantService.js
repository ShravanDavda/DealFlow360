import api from './api';

export const getProductVariants = async (productId) => {
  const response = await api.get(`/product-variants/product/${productId}`);
  return response.data?.data || [];
};

export const createProductVariant = async (variant) => {
  const response = await api.post('/product-variants', variant);
  return response.data?.data || null;
};

export const updateProductVariant = async (variantId, variant) => {
  const response = await api.put(`/product-variants/${variantId}`, variant);
  return response.data?.data || null;
};

export const deactivateProductVariant = async (variantId) => {
  const response = await api.patch(`/product-variants/${variantId}/deactivate`);
  return response.data?.data || null;
};