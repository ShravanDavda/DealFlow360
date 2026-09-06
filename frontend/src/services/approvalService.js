import api from './api';

export const getApprovals = async (params = {}) => {
  const response = await api.get('/approvals', { params });
  return response.data?.data || { summary: [], approvals: [] };
};

export const getApprovalDetail = async (approvalId) => {
  const response = await api.get(`/approvals/${approvalId}`);
  return response.data?.data || null;
};

export const approveQuotation = async (approvalId, payload = {}) => {
  const response = await api.post(`/approvals/${approvalId}/approve`, payload);
  return response.data?.data || null;
};

export const rejectQuotation = async (approvalId, payload = {}) => {
  const response = await api.post(`/approvals/${approvalId}/reject`, payload);
  return response.data?.data || null;
};

export const returnForRevision = async (approvalId, payload = {}) => {
  const response = await api.post(`/approvals/${approvalId}/return`, payload);
  return response.data?.data || null;
};
