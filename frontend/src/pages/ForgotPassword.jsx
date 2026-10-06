import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Mail, 
  AlertCircle, 
  KeyRound,
  ArrowLeft 
} from 'lucide-react';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { forgotPassword } from '../services/authService';

export const ForgotPassword = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [serverError, setServerError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validate = () => {
    const trimmed = email.trim();
    if (!trimmed) {
      setError('Email address is required');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Please enter a valid email address');
      return false;
    }
    setError('');
    return true;
  };

  const handleChange = (e) => {
    setEmail(e.target.value);
    if (error) setError('');
    if (serverError) setServerError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    if (!validate()) {
      return;
    }

    setIsLoading(true);

    try {
      const trimmedEmail = email.trim().toLowerCase();
      await forgotPassword(trimmedEmail);

      // Navigate to OTP verification page passing email in navigation state
      navigate('/verify-reset-otp', {
        state: { 
          email: trimmedEmail,
          message: "If this email is registered with DealFlow360, a verification code has been sent."
        }
      });
    } catch (err) {
      setServerError(err.message || 'Failed to send verification code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="h-11 w-11 rounded-lg bg-slate-900 flex items-center justify-center text-white shadow-md">
            <KeyRound className="h-6 w-6" />
          </div>
        </div>
        <h2 className="mt-5 text-center text-2xl font-bold tracking-tight text-slate-900">
          Forgot your password?
        </h2>
        <p className="mt-1.5 text-center text-sm text-slate-600">
          Enter your registered email address and we'll send you a verification code.
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

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div>
              <div className="relative">
                <Input
                  id="email"
                  name="email"
                  type="email"
                  label="Email address"
                  placeholder="name@company.com"
                  value={email}
                  onChange={handleChange}
                  error={error}
                  autoComplete="email"
                  required
                />
                <div className="absolute right-3 top-9 text-slate-400 pointer-events-none">
                  <Mail className="h-4 w-4" />
                </div>
              </div>
            </div>

            <div className="pt-1">
              <Button
                type="submit"
                variant="primary"
                isLoading={isLoading}
              >
                Send OTP
              </Button>
            </div>
          </form>

          <div className="mt-6 text-center text-sm border-t border-slate-100 pt-5">
            <Link 
              to="/login" 
              className="inline-flex items-center gap-1.5 font-medium text-slate-700 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 rounded"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Login</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
