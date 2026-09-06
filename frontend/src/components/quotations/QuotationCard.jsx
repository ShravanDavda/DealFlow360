import React from 'react';

export const QuotationCard = ({ quotation, onClick }) => {
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(quotation.amount);

  return (
    <button
      type="button"
      onClick={() => onClick(quotation.id)}
      className="w-full text-left bg-white p-4 rounded-lg border border-slate-200 shadow-sm hover:border-slate-300 hover:shadow transition-all focus:outline-none focus:ring-2 focus:ring-slate-900 group"
      aria-label={`Quotation for ${quotation.customerName}, amount ${formattedAmount}, status ${quotation.status}`}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-semibold text-slate-900 group-hover:text-slate-700">
          {quotation.customerName}
        </h4>
        <span className="text-xs font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
          {quotation.id}
        </span>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-base font-bold text-slate-800 tracking-tight">
          {formattedAmount}
        </span>
        <span className={`text-xs font-semibold ${quotation.blendedRisk === 'HIGH' ? 'text-rose-700' : 'text-slate-500'}`}>
          {quotation.blendedRisk || 'LOW'}
        </span>
      </div>
      <div className="mt-2 text-xs text-slate-500">
        Updated {quotation.updatedAt ? new Date(quotation.updatedAt).toLocaleDateString() : '--'}
      </div>
    </button>
  );
};

export default QuotationCard;
