import api from './api';

export const registerUser = async (userData) => {
  const response = await api.post('/auth/register', userData);
  return response.data;
};

export const loginUser = async (credentials) => {
  const response = await api.post('/auth/login', credentials);
  return response.data;
};

export const getCurrentUser = async () => {
  const response = await api.get('/auth/me');
  return response.data;
};

export const activateCustomerAccount = async (activationData) => {
  const response = await api.post('/auth/activate-customer', activationData);
  return response.data;
};

export const loginWithGoogle = async (googleAuthData) => {
  const response = await api.post('/auth/google', googleAuthData);
  return response.data;
};

export const forgotPassword = async (email) => {
  const response = await api.post('/auth/forgot-password', { email });
  return response.data;
};

export const resendResetOtp = async (email) => {
  const response = await api.post('/auth/resend-reset-otp', { email });
  return response.data;
};

export const verifyResetOtp = async ({ email, otp }) => {
  const response = await api.post('/auth/verify-reset-otp', { email, otp });
  return response.data;
};

export const resetPassword = async ({ resetToken, newPassword, confirmPassword }) => {
  const response = await api.post('/auth/reset-password', { resetToken, newPassword, confirmPassword });
  return response.data;
};
