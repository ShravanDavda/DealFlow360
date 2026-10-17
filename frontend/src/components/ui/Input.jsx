import React, { forwardRef } from 'react';

export const Input = forwardRef(({ 
  label, 
  error, 
  id, 
  type = 'text', 
  className = '', 
  ...props 
}, ref) => {
  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label 
          htmlFor={id} 
          className="block text-sm font-medium text-slate-700"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={id}
          ref={ref}
          type={type}
          className={`w-full rounded-md border bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 ${
            error 
              ? 'border-red-500 focus:ring-red-500' 
              : 'border-slate-300 hover:border-slate-400'
          } ${className}`}
          {...props}
        />
      </div>
      {error && (
        <p className="text-xs text-red-600 font-medium">
          {error}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';
