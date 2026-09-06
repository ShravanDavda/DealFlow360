import api from './api';

export const getDashboardSummary = async () => {
  const response = await api.get('/dashboard/dashboard-summary');
  return response.data?.data || null;
};

export const getReports = async (params = {}) => {
  const response = await api.get('/reports', { params });
  return response.data?.data || null;
};

export const exportReportXls = async (params = {}) => {
  const response = await api.get('/reports/export-xls', { params, responseType: 'blob' });
  return response.data;
};
