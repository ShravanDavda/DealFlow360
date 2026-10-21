import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  RotateCw, 
  ArrowLeft,
  Mail
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { verifyResetOtp, resendResetOtp } from '../services/authService';

export const VerifyResetOTP = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const initialEmail = location.state?.email || '';
  const initialMessage = location.state?.message || '';

  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [serverError, setServerError] = useState('');
  const [successMessage, setSuccessMessage] = useState(initialMessage);
  const [countdown, setCountdown] = useState(30);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (countdown <= 0) return;
    const interval = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [countdown]);

  const handleOtpChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
    setOtp(val);
    if (otpError) setOtpError('');
    if (serverError) setServerError('');
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setServerError('');
    setSuccessMessage('');

    if (!email.trim()) {
      setServerError('Email address is missing. Please restart the forgot password process.');
      return;
    }

    if (!/^\d{6}$/.test(otp)) {
      setOtpError('Please enter a valid 6-digit numeric verification code');
      return;
    }

    setIsVerifying(true);

    try {
      const response = await verifyResetOtp({
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
      });

      const resetToken = response?.data?.resetToken || response?.resetToken;

      if (!resetToken) {
        throw new Error('Verification succeeded but no reset token was received.');
      }

      // Navigate to create new password, passing resetToken securely in state
      navigate('/reset-password', {
        state: { resetToken },
        replace: true
      });
    } catch (err) {
      setServerError(err.message || 'Failed to verify verification code.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || isResending) return;

    if (!email.trim()) {
      setServerError('Email address is required to resend verification code.');
      return;
    }

    setIsResending(true);
    setServerError('');
    setSuccessMessage('');

    try {
      const response = await resendResetOtp(email.trim().toLowerCase());
      setSuccessMessage(response?.message || 'A new verification code has been sent to your email.');
      setCountdown(30);
      setOtp('');
    } catch (err) {
      setServerError(err.message || 'Failed to resend verification code. Please try again.');
    } finally {
      setIsResending(false);
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
          Verify your email
        </h2>
        <p className="mt-1.5 text-center text-sm text-slate-600">
          Enter the 6-digit verification code sent to your email.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 rounded-lg sm:px-10">
          
          {email ? (
            <div className="mb-5 p-3 rounded-md bg-slate-50 border border-slate-200 flex items-center justify-between text-xs text-slate-600">
              <div className="flex items-center gap-2 truncate">
                <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                <span className="truncate font-medium text-slate-800">{email}</span>
              </div>
              <Link 
                to="/forgot-password" 
                className="text-indigo-600 hover:text-indigo-800 font-medium shrink-0 ml-2"
              >
                Change
              </Link>
            </div>
          ) : (
            <div className="mb-5">
              <label htmlFor="email-input" className="block text-sm font-medium text-slate-700 mb-1">
                Registered email
              </label>
              <input
                id="email-input"
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
          )}

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

          <form onSubmit={handleVerify} className="space-y-6" noValidate>
            <div>
              <label 
                htmlFor="otp-code" 
                className="block text-sm font-medium text-slate-700 text-center mb-2"
              >
                6-Digit Verification Code
              </label>
              <div className="relative">
                <input
                  id="otp-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="000000"
                  value={otp}
                  onChange={handleOtpChange}
                  className={`w-full text-center tracking-[0.5em] text-2xl font-mono py-3 px-4 rounded-md border bg-white text-slate-900 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-slate-900 ${
                    otpError ? 'border-red-500 focus:ring-red-500' : 'border-slate-300 hover:border-slate-400'
                  }`}
                  required
                />
              </div>
              {otpError && (
                <p className="mt-1.5 text-xs text-red-600 text-center font-medium">
                  {otpError}
                </p>
              )}
            </div>

            <div>
              <Button
                type="submit"
                variant="primary"
                isLoading={isVerifying}
                disabled={otp.length !== 6}
              >
                Verify OTP
              </Button>
            </div>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col items-center space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <button
                type="button"
                onClick={handleResend}
                disabled={countdown > 0 || isResending}
                className={`inline-flex items-center gap-1.5 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-slate-900 rounded px-1.5 py-0.5 ${
                  countdown > 0 || isResending
                    ? 'text-slate-400 cursor-not-allowed'
                    : 'text-indigo-600 hover:text-indigo-800'
                }`}
              >
                <RotateCw className={`h-3.5 w-3.5 ${isResending ? 'animate-spin' : ''}`} />
                <span>Resend OTP</span>
              </button>
            </div>

            <p className="text-xs text-slate-500 font-medium">
              {countdown > 0 ? (
                <span>Resend available in {countdown}s</span>
              ) : (
                <span className="text-emerald-600 font-semibold">You can now request a new code</span>
              )}
            </p>

            <div className="pt-2">
              <Link 
                to="/forgot-password" 
                className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back to Forgot Password</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyResetOTP;
