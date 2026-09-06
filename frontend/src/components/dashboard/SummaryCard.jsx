import React from 'react';

export const SummaryCard = ({ title, value, supportingText, icon }) => {
  return (
    <div className="bg-white p-6 shadow-sm border border-slate-200 rounded-lg flex flex-col justify-between">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-600">
          {title}
        </h3>
        {icon && (
          <div className="text-slate-400 p-1.5 rounded-md bg-slate-50 border border-slate-100">
            {icon}
          </div>
        )}
      </div>
      <div className="mt-4">
        <p className="text-3xl font-bold tracking-tight text-slate-900">
          {value}
        </p>
        <p className="mt-1 text-sm text-slate-500">
          {supportingText}
        </p>
      </div>
    </div>
  );
};

export default SummaryCard;
