import api from './api';

export const getSalesRepDashboard = async () => (await api.get('/dashboard/sales-rep')).data?.data || null;
