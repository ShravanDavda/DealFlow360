import api from './api';

export const getDealHealth = async () => {
  const response = await api.get('/deal-health');
  return response.data?.data || { summary: {}, anomalies: [] };
};

export const escalateDeal = async (dealId, payload = {}) => {
  const response = await api.post(`/deal-health/${dealId}/escalate`, payload);
  return response.data || null;
};

export const nudgeRep = async (dealId, payload = {}) => {
  const response = await api.post(`/deal-health/${dealId}/nudge`, payload);
  return response.data || null;
};
