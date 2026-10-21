import React from 'react';
import { QuotationCard } from './QuotationCard';

export const QuotationColumn = ({ status, quotations = [], onQuotationClick }) => {
  const count = quotations.length;
  const countText = count === 1 ? '1 quotation' : `${count} quotations`;

  return (
    <div className="flex-1 min-w-[240px] max-w-full md:max-w-xs bg-slate-100/70 p-3 rounded-lg border border-slate-200 flex flex-col">
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="text-sm font-semibold text-slate-800">
          {status}
        </h3>
        <span className="text-xs text-slate-500 font-medium">
          {countText}
        </span>
      </div>

      <div className="space-y-2.5 flex-1">
        {quotations.length === 0 ? (
          <div className="h-24 border border-dashed border-slate-300 rounded-lg flex items-center justify-center text-xs text-slate-400">
            No quotations
          </div>
        ) : (
          quotations.map((quotation) => (
            <QuotationCard
              key={quotation.id}
              quotation={quotation}
              onClick={onQuotationClick}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default QuotationColumn;
