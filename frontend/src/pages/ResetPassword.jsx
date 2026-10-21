import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { 
  KeyRound, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  CheckCircle2, 
  ArrowLeft,
  ShieldAlert
} from 'lucide-react';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { resetPassword } from '../services/authService';

export const ResetPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const resetToken = location.state?.resetToken || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const validate = () => {
    const newErrors = {};

    if (!newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (newPassword.length < 6) {
      newErrors.newPassword = 'Password must be at least 6 characters long';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Confirm password is required';
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    if (!resetToken) {
      setServerError('No valid password reset authorization token found. Please restart.');
      return;
    }

    if (!validate()) {
      return;
    }

    setIsLoading(true);

    try {
      await resetPassword({
        resetToken,
        newPassword,
        confirmPassword,
      });

      setIsSuccess(true);

      // Redirect to login after brief feedback
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 2000);
    } catch (err) {
      setServerError(err.message || 'Failed to reset password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // If no resetToken is present, prompt the user to start again
  if (!resetToken && !isSuccess) {
    return (
      <div className="min-h-screen flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 rounded-lg sm:px-10 text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-amber-100 mb-4">
              <ShieldAlert className="h-6 w-6 text-amber-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Invalid Reset Session
            </h3>
            <p className="text-sm text-slate-600 mb-6">
              You must verify your email verification code before setting a new password. No active reset token was found.
            </p>
            <Link
              to="/forgot-password"
              className="inline-flex items-center justify-center rounded-md font-medium text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 bg-slate-900 text-white hover:bg-slate-800 h-10 px-4 py-2 w-full shadow-sm"
            >
              Start password reset again
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="h-11 w-11 rounded-lg bg-slate-900 flex items-center justify-center text-white shadow-md">
            <KeyRound className="h-6 w-6" />
          </div>
        </div>
        <h2 className="mt-5 text-center text-2xl font-bold tracking-tight text-slate-900">
          Create a new password
        </h2>
        <p className="mt-1.5 text-center text-sm text-slate-600">
          Enter a secure password for your DealFlow360 account
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 rounded-lg sm:px-10">
          
          {isSuccess ? (
            <div className="text-center py-4 space-y-4">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-emerald-100">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Your password has been reset successfully.
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  Redirecting to login...
                </p>
              </div>
              <div className="pt-2">
                <Link
                  to="/login"
                  replace
                  className="inline-flex items-center justify-center rounded-md font-medium text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 bg-slate-900 text-white hover:bg-slate-800 h-10 px-4 py-2 w-full shadow-sm"
                >
                  Proceed to Login
                </Link>
              </div>
            </div>
          ) : (
            <>
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
                      id="newPassword"
                      name="newPassword"
                      type={showPassword ? 'text' : 'password'}
                      label="New Password"
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        if (errors.newPassword) setErrors((prev) => ({ ...prev, newPassword: '' }));
                        if (serverError) setServerError('');
                      }}
                      error={errors.newPassword}
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
                      label="Confirm New Password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: '' }));
                        if (serverError) setServerError('');
                      }}
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

                <div className="pt-1">
                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={isLoading}
                  >
                    Reset Password
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
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
