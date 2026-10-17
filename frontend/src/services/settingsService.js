import api from './api';

export const getDiscountApprovalSettings = async () => {
  const response = await api.get('/settings/discount-approval');
  return response.data?.data || { tiers: [], categories: [], approvalRules: [] };
};

export const updateDiscountApprovalSettings = async (payload) => {
  const response = await api.put('/settings/discount-approval', payload);
  return response.data?.data || null;
};
