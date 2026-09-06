import React from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

export const InvoiceSummary = ({ summary = { unpaid: 4, paid: 21 } }) => {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div 
        className="inline-flex items-center gap-2.5 px-4 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 shadow-sm"
        aria-label={`${summary.unpaid} Unpaid Invoices`}
      >
        <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse" aria-hidden="true" />
        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" aria-hidden="true" />
        <span className="text-sm font-bold text-amber-900">
          {summary.unpaid} Unpaid
        </span>
      </div>

      <div 
        className="inline-flex items-center gap-2.5 px-4 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 shadow-sm"
        aria-label={`${summary.paid} Paid Invoices`}
      >
        <span className="flex h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" aria-hidden="true" />
        <span className="text-sm font-bold text-emerald-900">
          {summary.paid} Paid
        </span>
      </div>
    </div>
  );
};

export default InvoiceSummary;
