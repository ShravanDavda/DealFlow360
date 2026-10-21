import api from './api';

export const getNotifications = async (params = {}) => {
  const response = await api.get('/notifications', { params });
  return response.data || { count: 0, unreadCount: 0, data: [] };
};

export const markNotificationAsRead = async (id) => {
  const response = await api.patch(`/notifications/${id}/read`);
  return response.data || null;
};

export const markAllNotificationsAsRead = async () => {
  const response = await api.patch('/notifications/read-all');
  return response.data || null;
};

export default {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
};
