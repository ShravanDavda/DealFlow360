import React, { useState, useEffect } from 'react';
import { ShieldCheck, User, AlertCircle, X } from 'lucide-react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

export const GoogleProfileCompletionModal = ({
  isOpen,
  onClose,
  onSubmit,
  initialUsername = '',
  initialRole = '',
  isLoading = false,
  serverError = '',
}) => {
  const [username, setUsername] = useState(initialUsername);
  const [role, setRole] = useState(initialRole);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      setUsername(initialUsername);
      setRole(initialRole);
      setErrors({});
    }
  }, [isOpen, initialUsername, initialRole]);

  if (!isOpen) return null;

  const validate = () => {
    const newErrors = {};
    const trimmedUser = username.trim();

    if (!trimmedUser) {
      newErrors.username = 'Username is required';
    } else if (trimmedUser.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    } else if (trimmedUser.length > 50) {
      newErrors.username = 'Username must not exceed 50 characters';
    } else if (!/^[a-zA-Z0-9_.-]+$/.test(trimmedUser)) {
      newErrors.username = 'Username can only contain letters, numbers, underscores, periods, and hyphens';
    }

    if (!role) {
      newErrors.role = 'Role is required';
    } else if (!['sales_rep', 'finance', 'sales_manager'].includes(role)) {
      newErrors.role = 'Please select a valid staff role';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({
      username: username.trim(),
      role,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div 
        className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="google-profile-title"
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-slate-900 flex items-center justify-center text-white shadow-sm">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 id="google-profile-title" className="text-lg font-bold text-slate-900">
                Complete your profile
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Set your username and staff role for Google registration
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="text-slate-400 hover:text-slate-600 rounded-md p-1 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-900"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4" noValidate>
          {serverError && (
            <div className="p-3 rounded-md bg-red-50 border border-red-200 flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
              <div className="text-xs text-red-700 font-medium">
                {serverError}
              </div>
            </div>
          )}

          <div>
            <div className="relative">
              <Input
                id="google-profile-username"
                name="username"
                type="text"
                label="Username"
                placeholder="e.g. rahul123"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (errors.username) setErrors((prev) => ({ ...prev, username: '' }));
                }}
                error={errors.username}
                autoComplete="username"
                autoFocus
                required
              />
              <div className="absolute right-3 top-9 text-slate-400 pointer-events-none">
                <User className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Unique identifier for your account (at least 3 characters)
            </p>
          </div>

          <div>
            <label htmlFor="google-profile-role" className="block text-sm font-medium text-slate-700">
              Role
            </label>
            <select
              id="google-profile-role"
              name="role"
              value={role}
              onChange={(e) => {
                setRole(e.target.value);
                if (errors.role) setErrors((prev) => ({ ...prev, role: '' }));
              }}
              className={`mt-1.5 w-full rounded-md border bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent ${
                errors.role ? 'border-red-500 focus:ring-red-500' : 'border-slate-300 hover:border-slate-400'
              }`}
              required
            >
              <option value="" disabled>Select a role</option>
              <option value="sales_rep">Sales representative</option>
              <option value="finance">Finance/Operator</option>
              <option value="sales_manager">SalesManager</option>
            </select>
            {errors.role && (
              <p className="mt-1.5 text-xs text-red-600 font-medium">
                {errors.role}
              </p>
            )}
            <p className="mt-1 text-xs text-slate-500">
              Staff roles require administrator approval before access is granted.
            </p>
          </div>

          <div className="pt-2 flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="w-1/3"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isLoading}
              className="w-2/3"
            >
              Complete Registration
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GoogleProfileCompletionModal;
