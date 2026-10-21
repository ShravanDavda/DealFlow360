import api from './api';

export const getPendingRegistrations = async () => (await api.get('/admin/user-registrations')).data?.data || [];
export const getPendingRegistrationCount = async () => (await api.get('/admin/user-registrations/pending/count')).data?.data?.count || 0;
export const approveRegistration = async (id) => (await api.patch(`/admin/user-registrations/${id}/approve`)).data?.data || null;
export const rejectRegistration = async (id) => (await api.patch(`/admin/user-registrations/${id}/reject`)).data?.data || null;
export const createAdminUser = async (payload) => (await api.post('/admin/user-registrations/users', payload)).data?.data || null;
