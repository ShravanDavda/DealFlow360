import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Mail, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  CheckCircle2, 
  ShieldCheck 
} from 'lucide-react';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { loginUser } from '../services/authService';
import { GoogleAuthButton } from '../components/auth/GoogleAuthButton';

export const Login = () => {
  const navigate = useNavigate();

  const handleGoogleSuccess = (response) => {
    setServerError('');
    if (response?.isNewUser || response?.data?.registrationStatus === 'PENDING') {
      setSuccessMessage('Registration submitted with Google. An administrator must approve your account before you can sign in.');
      return;
    }

    const token = response?.token || response?.data?.token;
    if (token) {
      localStorage.setItem('token', token);
    }

    const userRole = response?.data?.user?.role;
    navigate(
      userRole === 'admin'
        ? '/admin-dashboard'
        : userRole === 'sales_rep'
        ? '/sales-rep-dashboard'
        : userRole === 'sales_manager'
        ? '/sales-manager-dashboard'
        : userRole === 'customer'
        ? '/customer/quotes'
        : '/dashboard',
      { replace: true }
    );
  };
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
    if (serverError) setServerError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    setSuccessMessage('');

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await loginUser({
        email: formData.email.trim(),
        password: formData.password,
      });

      const token = response?.token || response?.data?.token;
      if (token) {
        localStorage.setItem('token', token);
      }

      const userRole = response?.data?.user?.role;
      navigate(
        userRole === 'admin' 
          ? '/admin-dashboard' 
          : userRole === 'sales_rep' 
          ? '/sales-rep-dashboard' 
          : userRole === 'sales_manager' 
          ? '/sales-manager-dashboard' 
          : userRole === 'customer'
          ? '/customer/quotes'
          : '/dashboard', 
        { replace: true }
      );
    } catch (err) {
      setServerError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="h-11 w-11 rounded-lg bg-slate-900 flex items-center justify-center text-white shadow-md">
            <ShieldCheck className="h-6 w-6" />
          </div>
        </div>
        <h2 className="mt-5 text-center text-2xl font-bold tracking-tight text-slate-900">
          Sign in to your account
        </h2>
        <p className="mt-1.5 text-center text-sm text-slate-600">
          Enter your email and password to access your workspace
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 rounded-lg sm:px-10">
          
          {serverError && (
            <div className="mb-5 p-3.5 rounded-md bg-red-50 border border-red-200 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
              <div className="text-sm text-red-700 font-medium">
                {serverError}
              </div>
            </div>
          )}

          {successMessage && (
            <div className="mb-5 p-3.5 rounded-md bg-emerald-50 border border-emerald-200 flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
              <div className="text-sm text-emerald-700 font-medium">
                {successMessage}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            
            <div>
              <div className="relative">
                <Input
                  id="email"
                  name="email"
                  type="email"
                  label="Email address"
                  placeholder="name@company.com"
                  value={formData.email}
                  onChange={handleChange}
                  error={errors.email}
                  autoComplete="email"
                  required
                />
                <div className="absolute right-3 top-9 text-slate-400 pointer-events-none">
                  <Mail className="h-4 w-4" />
                </div>
              </div>
            </div>

            <div>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  label="Password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  error={errors.password}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-9 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <div className="mt-1.5 flex justify-end">
                <Link
                  to="/forgot-password"
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-800 hover:underline focus:outline-none focus:ring-2 focus:ring-indigo-600 rounded"
                >
                  Forgot Password?
                </Link>
              </div>
            </div>

            <div className="pt-1">
              <Button
                type="submit"
                variant="primary"
                isLoading={isLoading}
              >
                Sign in
              </Button>
            </div>
          </form>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-500 font-medium">Or continue with</span>
            </div>
          </div>

          <GoogleAuthButton
            onSuccess={handleGoogleSuccess}
            onError={(err) => {
              setServerError(err);
              setSuccessMessage('');
            }}
            disabled={isLoading}
          />
          <div className="mt-6 text-center text-sm text-slate-600 border-t border-slate-100 pt-5 space-y-2">
            <div>
              Don't have an account?{' '}
              <Link 
                to="/register" 
                className="font-medium text-slate-900 hover:underline focus:outline-none focus:ring-2 focus:ring-slate-900 rounded"
              >
                Sign up
              </Link>
            </div>
            <div>
              Customer with an activation code?{' '}
              <Link 
                to="/activate" 
                className="font-medium text-indigo-600 hover:text-indigo-800 hover:underline focus:outline-none focus:ring-2 focus:ring-indigo-600 rounded"
              >
                Activate your account
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
