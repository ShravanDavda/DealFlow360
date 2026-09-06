import api from './api';

export const getPriceLists = async () => (await api.get('/price-lists')).data?.data || [];
export const getPriceList = async (id) => (await api.get(`/price-lists/${id}`)).data?.data || null;
export const createPriceList = async (payload) => (await api.post('/price-lists', payload)).data?.data || null;
export const updatePriceList = async (id, payload) => (await api.put(`/price-lists/${id}`, payload)).data?.data || null;
export const deactivatePriceList = async (id) => (await api.patch(`/price-lists/${id}/deactivate`)).data?.data || null;
export const deletePriceList = async (id) => (await api.delete(`/price-lists/${id}`)).data?.data || null;
export const getPriceListItems = async (id) => (await api.get(`/price-list-items/price-list/${id}`)).data?.data || [];
export const createPriceListItem = async (payload) => (await api.post('/price-list-items', payload)).data?.data || null;
export const updatePriceListItem = async (id, payload) => (await api.put(`/price-list-items/${id}`, payload)).data?.data || null;
export const deactivatePriceListItem = async (id) => (await api.patch(`/price-list-items/${id}/deactivate`)).data?.data || null;