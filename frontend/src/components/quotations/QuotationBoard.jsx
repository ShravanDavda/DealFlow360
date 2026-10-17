import React from 'react';
import { QuotationColumn } from './QuotationColumn';

const COLUMNS = [
  'Draft',
  'Pending Approval',
  'Approved',
  'Negotiation',
  'Confirmed',
];

export const QuotationBoard = ({ quotations = [], onQuotationClick }) => {
  return (
    <div className="w-full overflow-x-auto pb-4 pt-1">
      <div className="flex flex-col md:flex-row gap-4 min-w-full md:min-w-max items-start">
        {COLUMNS.map((status) => {
          const columnQuotations = quotations.filter(
            (q) => q.status === status || (status === 'Negotiation' && q.status === 'Under Negotiation')
          );
          return (
            <QuotationColumn
              key={status}
              status={status}
              quotations={columnQuotations}
              onQuotationClick={onQuotationClick}
            />
          );
        })}
      </div>
    </div>
  );
};

export default QuotationBoard;
