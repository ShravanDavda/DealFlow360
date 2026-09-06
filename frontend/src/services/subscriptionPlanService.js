import api from './api';
export const getSubscriptionPlans = async () => (await api.get('/admin/subscription-plans')).data?.data || [];
export const createSubscriptionPlan = async (payload) => (await api.post('/admin/subscription-plans', payload)).data?.data || null;
export const updateSubscriptionPlan = async (id, payload) => (await api.put(`/admin/subscription-plans/${id}`, payload)).data?.data || null;
export const deactivateSubscriptionPlan = async (id) => (await api.patch(`/admin/subscription-plans/${id}/deactivate`)).data?.data || null;
export const activateSubscriptionPlan = async (id) => (await api.patch(`/admin/subscription-plans/${id}/activate`)).data?.data || null;
export const deleteSubscriptionPlan = async (id) => (await api.delete(`/admin/subscription-plans/${id}`)).data?.data || null;