import React, { useState } from 'react';
import { Link } from 'react-router-dom';
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

export const Login = () => {
  // Form states
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Client-side validation
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

    // Clear individual field errors on change
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

      // Store JWT token if provided by the backend response
      const token = response?.token || response?.data?.token;
      if (token) {
        localStorage.setItem('token', token);
      }

      setSuccessMessage(response?.message || 'Logged in successfully!');
    } catch (err) {
      setServerError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand header */}
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
          
          {/* Server Error Alert */}
          {serverError && (
            <div className="mb-5 p-3.5 rounded-md bg-red-50 border border-red-200 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
              <div className="text-sm text-red-700 font-medium">
                {serverError}
              </div>
            </div>
          )}

          {/* Success Alert */}
          {successMessage && (
            <div className="mb-5 p-3.5 rounded-md bg-emerald-50 border border-emerald-200 flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
              <div className="text-sm text-emerald-700 font-medium">
                {successMessage}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            
            {/* Email Field */}
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

            {/* Password Field */}
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
            </div>

            {/* Submit Button */}
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

          {/* Switch to Register link */}
          <div className="mt-6 text-center text-sm text-slate-600 border-t border-slate-100 pt-5">
            Don't have an account?{' '}
            <Link 
              to="/register" 
              className="font-medium text-slate-900 hover:underline focus:outline-none focus:ring-2 focus:ring-slate-900 rounded"
            >
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
