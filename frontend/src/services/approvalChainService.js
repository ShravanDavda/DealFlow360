import api from './api';
export const getApprovalChains = async () => (await api.get('/admin/approval-chains')).data?.data || [];
export const createApprovalChain = async (payload) => (await api.post('/admin/approval-chains', payload)).data?.data || null;
export const updateApprovalChain = async (id, payload) => (await api.put(`/admin/approval-chains/${id}`, payload)).data?.data || null;
export const deactivateApprovalChain = async (id) => (await api.patch(`/admin/approval-chains/${id}/deactivate`)).data?.data || null;