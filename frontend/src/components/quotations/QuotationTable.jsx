import React from 'react';

const STATUS_BADGE_CLASSES = {
  'Draft': 'bg-slate-100 text-slate-700 border-slate-200',
  'Pending Approval': 'bg-amber-50 text-amber-700 border-amber-200',
  'Approved': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Negotiation': 'bg-blue-50 text-blue-700 border-blue-200',
  'Confirmed': 'bg-indigo-50 text-indigo-700 border-indigo-200',
};

/**
 * QuotationTable - Renders quotations in a responsive, accessible table format.
 * 
 * @param {Object} props
 * @param {Array<Object>} props.quotations - Array of quotation records
 * @param {Function} props.onQuotationClick - Callback when a row is clicked
 */
export const QuotationTable = ({ quotations = [], onQuotationClick }) => {
  const formatAmount = (amount) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50 text-slate-700 font-semibold">
            <tr>
              <th scope="col" className="py-3.5 pl-6 pr-3">
                Customer
              </th>
              <th scope="col" className="px-3 py-3.5">
                Amount
              </th>
              <th scope="col" className="px-3 py-3.5">
                Status
              </th>
              <th scope="col" className="relative py-3.5 pl-3 pr-6">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {quotations.length === 0 ? (
              <tr>
                <td colSpan="4" className="py-8 text-center text-slate-500">
                  No quotations found.
                </td>
              </tr>
            ) : (
              quotations.map((quotation) => (
                <tr
                  key={quotation.id}
                  onClick={() => onQuotationClick(quotation.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onQuotationClick(quotation.id);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={`Open quotation for ${quotation.customerName}`}
                  className="hover:bg-slate-50 focus:bg-slate-50 focus:outline-none cursor-pointer transition-colors"
                >
                  <td className="py-4 pl-6 pr-3 font-medium text-slate-900">
                    <div className="flex items-center gap-2">
                      <span>{quotation.customerName}</span>
                      <span className="text-xs font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                        {quotation.id}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-4 text-slate-800 font-semibold">
                    {formatAmount(quotation.amount)}
                  </td>
                  <td className="px-3 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                        STATUS_BADGE_CLASSES[quotation.status] ||
                        'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {quotation.status}
                    </span>
                  </td>
                  <td className="py-4 pl-3 pr-6 text-right text-xs font-medium text-slate-500">
                    <span className="text-slate-400 group-hover:text-slate-600">
                      Open &rarr;
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default QuotationTable;
