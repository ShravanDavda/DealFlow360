import api from './api';
export const getWarehouses = async () => (await api.get('/admin/warehouses')).data?.data || [];
export const createWarehouse = async (payload) => (await api.post('/admin/warehouses', payload)).data?.data || null;
export const updateWarehouse = async (id, payload) => (await api.put(`/admin/warehouses/${id}`, payload)).data?.data || null;
export const deactivateWarehouse = async (id) => (await api.patch(`/admin/warehouses/${id}/deactivate`)).data?.data || null;
export const upsertInventory = async (id, payload) => (await api.put(`/admin/warehouses/${id}/inventory`, payload)).data?.data || null;