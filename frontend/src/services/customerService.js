import api from './api';

export const getCustomers = async () => {
  const response = await api.get('/customers');
  return response.data?.data || [];
};
export const getCustomer = async (id) => (await api.get(`/customers/${id}`)).data?.data || null;
export const createCustomer = async (payload) => (await api.post('/customers', payload)).data?.data || null;
export const updateCustomer = async (id, payload) => (await api.put(`/customers/${id}`, payload)).data?.data || null;
export const deactivateCustomer = async (id) => (await api.patch(`/customers/${id}/deactivate`)).data?.data || null;
export const activateCustomer = async (id) => (await api.patch(`/customers/${id}/activate`)).data?.data || null;
export const reissueCustomerActivation = async (id) => (await api.post(`/customers/${id}/reissue-activation`)).data?.data || null;
export const getCustomerTiers = async () => (await api.get('/customer-tiers')).data?.data || [];