import api from './api';

export const getProducts = async () => {
  const response = await api.get('/products');
  return response.data?.data || [];
};

export const getProduct = async (productId) => {
  const response = await api.get(`/products/${productId}`);
  return response.data?.data || null;
};

export const createProduct = async (product) => {
  const response = await api.post('/products', product);
  return response.data?.data || null;
};

export const updateProduct = async (productId, product) => {
  const response = await api.put(`/products/${productId}`, product);
  return response.data?.data || null;
};

export const deactivateProduct = async (productId) => {
  const response = await api.patch(`/products/${productId}/deactivate`);
  return response.data?.data || null;
};

export const toProductRow = (product) => ({
  ...product,
  category: product.category || product.category_name || 'Uncategorized',
  variants: product.variants || '-',
  price: Number(product.price ?? product.base_cost ?? 0),
  priceFormatted: product.priceFormatted || `$${Number(product.price ?? product.base_cost ?? 0).toLocaleString()}`,
  unit: product.unit || 'Each',
  tax: product.tax || '0%',
  status: product.status || (product.is_active ? 'Active' : 'Archived'),
});

export const toProductDetail = (product) => ({
  ...toProductRow(product),
  taxPercent: Number(product.taxPercent ?? 0),
  description: product.description || '',
  isSubscription: Boolean(product.isSubscription),
  recurring: product.recurring || '-',
  quantityOnHand: product.quantityOnHand ?? '-',
  variants: product.variants || [],
  pricelists: product.pricelists || [],
});
