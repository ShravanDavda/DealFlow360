import api from './api';

export const getSalesManagerDashboard = async () => (await api.get('/dashboard/sales-manager')).data?.data || null;
