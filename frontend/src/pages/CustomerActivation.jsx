import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  KeyRound, 
  Mail, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  CheckCircle2, 
  ShieldCheck,
  ArrowRight
} from 'lucide-react';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { activateCustomerAccount } from '../services/authService';

export const CustomerActivation = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [formData, setFormData] = useState({
    email: searchParams.get('email') || '',
    activationCode: searchParams.get('code') || '',
    password: '',
    confirmPassword: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [isActivated, setIsActivated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const emailParam = searchParams.get('email');
    const codeParam = searchParams.get('code');
    if (emailParam || codeParam) {
      setFormData((prev) => ({
        ...prev,
        email: emailParam || prev.email,
        activationCode: codeParam || prev.activationCode,
      }));
    }
  }, [searchParams]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.activationCode.trim()) {
      newErrors.activationCode = 'Activation code is required';
    }

    if (!formData.password) {
      newErrors.password = 'New password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters long';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const formattedValue = name === 'activationCode' ? value.toUpperCase() : value;
    
    setFormData((prev) => ({
      ...prev,
      [name]: formattedValue,
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

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      await activateCustomerAccount({
        email: formData.email.trim(),
        activationCode: formData.activationCode.trim(),
        password: formData.password,
        confirmPassword: formData.confirmPassword,
      });

      setIsActivated(true);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Activation failed. Please verify your activation code.';
      setServerError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  if (isActivated) {
    return (
      <div className="min-h-screen flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 rounded-xl sm:px-10 text-center">
            <div className="mx-auto w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mb-4">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              Account Activated!
            </h2>
            
            <p className="text-slate-600 text-sm mb-6 leading-relaxed">
              Your Customer Portal account (<span className="font-semibold text-slate-800">{formData.email}</span>) is now active and your password has been securely set.
            </p>

            <Button
              type="button"
              variant="primary"
              onClick={() => navigate('/login')}
              className="flex items-center justify-center gap-2"
            >
              <span>Go to Sign In</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="h-11 w-11 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-md">
            <KeyRound className="h-6 w-6" />
          </div>
        </div>
        <h2 className="mt-5 text-center text-2xl font-bold tracking-tight text-slate-900">
          Activate Customer Portal
        </h2>
        <p className="mt-1.5 text-center text-sm text-slate-600">
          Enter your single-use activation code and create your secure password
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 rounded-xl sm:px-10">
          
          {serverError && (
            <div className="mb-5 p-3.5 rounded-md bg-red-50 border border-red-200 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
              <div className="text-sm text-red-700 font-medium">
                {serverError}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            
            <div>
              <div className="relative">
                <Input
                  id="email"
                  name="email"
                  type="email"
                  label="Portal Login Email"
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
                  id="activationCode"
                  name="activationCode"
                  type="text"
                  label="Activation Code"
                  placeholder="e.g. DF360-X8K29P"
                  value={formData.activationCode}
                  onChange={handleChange}
                  error={errors.activationCode}
                  autoComplete="off"
                  required
                />
                <div className="absolute right-3 top-9 text-slate-400 pointer-events-none">
                  <KeyRound className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Provided by your account manager or administrator.
              </p>
            </div>

            <div>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  label="New Password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  error={errors.password}
                  autoComplete="new-password"
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

            <div>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  label="Confirm Password"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  error={errors.confirmPassword}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute right-3 top-9 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                isLoading={isLoading}
              >
                Activate Account
              </Button>
            </div>
          </form>

          <div className="mt-6 text-center text-sm text-slate-600 border-t border-slate-100 pt-5">
            Already activated?{' '}
            <Link 
              to="/login" 
              className="font-medium text-slate-900 hover:underline focus:outline-none focus:ring-2 focus:ring-slate-900 rounded"
            >
              Sign in to Portal
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerActivation;
