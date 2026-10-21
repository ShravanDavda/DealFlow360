import React from 'react';

const STATUS_BADGE_CLASSES = {
  'Draft': 'bg-slate-100 text-slate-700 border-slate-200',
  'Pending Approval': 'bg-amber-50 text-amber-700 border-amber-200',
  'Approved': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Negotiation': 'bg-blue-50 text-blue-700 border-blue-200',
  'Confirmed': 'bg-indigo-50 text-indigo-700 border-indigo-200',
};

export const QuotationTable = ({ quotations = [], onQuotationClick, managerView = false, salesRepView = false }) => {
  const formatAmount = (amount) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);

  const actionFor = (quotation) => {
    if (quotation.status === 'Draft') return 'Edit Draft';
    if (quotation.status === 'Pending Approval') return 'Track Approval';
    if (quotation.status === 'Approved' || quotation.status === 'Confirmed') return 'Track Fulfillment';
    if (quotation.status === 'Under Negotiation') return 'View Negotiation';
    return 'View Details';
  };

  if (salesRepView) {
    return (
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 font-semibold text-slate-700"><tr><th className="px-6 py-3.5">Quotation</th><th className="px-3 py-3.5">Customer</th><th className="px-3 py-3.5">Amount</th><th className="px-3 py-3.5">Margin</th><th className="px-3 py-3.5">Status</th><th className="px-3 py-3.5">Risk</th><th className="px-3 py-3.5">Updated</th><th className="px-6 py-3.5 text-right">Action</th></tr></thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {quotations.length === 0 ? <tr><td colSpan="8" className="py-10 text-center text-slate-500">No quotations found.</td></tr> : quotations.map((quotation) => <tr key={quotation.id} onClick={() => onQuotationClick(quotation.id)} className="cursor-pointer hover:bg-slate-50">
                <td className="px-6 py-4 font-mono font-semibold text-slate-700">{quotation.id}</td>
                <td className="px-3 py-4 font-medium text-slate-900">{quotation.customerName}</td>
                <td className="px-3 py-4 font-semibold text-slate-800">{formatAmount(quotation.amount)}</td>
                <td className="px-3 py-4 font-semibold text-emerald-700">{Number(quotation.overallMargin || 0).toFixed(1)}%</td>
                <td className="px-3 py-4"><span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASSES[quotation.status] || 'border-slate-200 bg-slate-100 text-slate-700'}`}>{quotation.status}</span></td>
                <td className={`px-3 py-4 text-xs font-semibold ${quotation.blendedRisk === 'HIGH' ? 'text-rose-700' : quotation.blendedRisk === 'MEDIUM' ? 'text-amber-700' : 'text-emerald-700'}`}>{quotation.blendedRisk || 'LOW'}</td>
                <td className="px-3 py-4 text-slate-600">{quotation.updatedAt ? new Date(quotation.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '--'}</td>
                <td className="px-6 py-4 text-right text-sm font-medium text-blue-700">Open <span aria-hidden="true">→</span></td>
              </tr>)}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (managerView) {
    return (
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 font-semibold text-slate-700"><tr><th className="px-6 py-3.5">Customer &amp; Quote</th><th className="px-3 py-3.5">Amount</th><th className="px-3 py-3.5">Margin</th><th className="px-3 py-3.5">Stage / Status</th><th className="px-6 py-3.5 text-right">Action</th></tr></thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {quotations.length === 0 ? <tr><td colSpan="5" className="py-10 text-center text-slate-500">No quotations found.</td></tr> : quotations.map((quotation) => <tr key={quotation.id} onClick={() => onQuotationClick(quotation.status === 'Pending Approval' ? `approval:${quotation.id}` : quotation.id)} className="cursor-pointer hover:bg-slate-50">
                <td className="px-6 py-4"><div className="flex items-center gap-2"><span className="font-medium text-slate-900">{quotation.customerName}</span><span className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-600">{quotation.customerTier || '--'}</span><span className="font-mono text-xs text-slate-400">{quotation.id}</span></div></td>
                <td className="px-3 py-4 font-semibold text-slate-800">{formatAmount(quotation.amount)}</td>
                <td className="px-3 py-4 font-semibold text-emerald-700">{Number(quotation.overallMargin || 0).toFixed(1)}%</td>
                <td className="px-3 py-4"><span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASSES[quotation.status] || 'border-slate-200 bg-slate-100 text-slate-700'}`}>{quotation.status}</span></td>
                <td className="px-6 py-4 text-right text-sm font-medium text-blue-700">{actionFor(quotation)} <span aria-hidden="true">→</span></td>
              </tr>)}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50 text-slate-700 font-semibold">
            <tr>
              <th scope="col" className="py-3.5 pl-6 pr-3">
                Quote Number
              </th>
              <th scope="col" className="py-3.5 pl-6 pr-3">
                Customer
              </th>
              <th scope="col" className="px-3 py-3.5">
                Sales Rep
              </th>
              <th scope="col" className="px-3 py-3.5">
                Amount
              </th>
              <th scope="col" className="px-3 py-3.5">
                Status
              </th>
              <th scope="col" className="px-3 py-3.5">
                Created
              </th>
              <th scope="col" className="relative py-3.5 pl-3 pr-6">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {quotations.length === 0 ? (
              <tr>
                <td colSpan="7" className="py-8 text-center text-slate-500">
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
                  <td className="py-4 pl-6 pr-3 font-mono text-slate-700">
                    {quotation.quoteCode || quotation.quotationId || quotation.id}
                  </td>
                  <td className="py-4 pl-6 pr-3 font-medium text-slate-900">
                    <div className="flex items-center gap-2">
                      <span>{quotation.customerName}</span>
                      <span className="text-xs font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                        {quotation.id}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-4 text-slate-700">{quotation.salesRep || '--'}</td>
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
                  <td className="px-3 py-4 text-slate-600">
                    {quotation.createdAt || quotation.created_at ? new Date(quotation.createdAt || quotation.created_at).toLocaleDateString() : '--'}
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
