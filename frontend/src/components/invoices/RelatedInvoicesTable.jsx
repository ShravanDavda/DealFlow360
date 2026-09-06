import React from 'react';
import { Receipt } from 'lucide-react';

const STATUS_BADGES = {
  Paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Unpaid: 'bg-amber-50 text-amber-700 border-amber-200',
};

export const RelatedInvoicesTable = ({ invoices = [] }) => {
  const formatCurrency = (amount, currency = 'USD') =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Receipt className="h-5 w-5 text-slate-700" />
        <h2 className="text-base font-semibold text-slate-900">
          Related Invoices
        </h2>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-slate-700 font-semibold">
              <tr>
                <th scope="col" className="py-3.5 pl-6 pr-3">
                  Invoice #
                </th>
                <th scope="col" className="px-3 py-3.5">
                  Amount
                </th>
                <th scope="col" className="px-3 py-3.5">
                  Status
                </th>
                <th scope="col" className="py-3.5 pl-3 pr-6">
                  Due Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan="4" className="py-8 text-center text-slate-500">
                    No related invoices found.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => {
                  const badgeClass = STATUS_BADGES[inv.status] || 'bg-slate-100 text-slate-700 border-slate-200';
                  const isRecurring = inv.type === 'Recurring' || inv.isRecurring;

                  return (
                    <tr key={inv.invoiceId} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-4 pl-6 pr-3 font-semibold text-slate-900 font-mono text-sm">
                        <span>{inv.invoiceId}</span>
                        {isRecurring && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-[11px] font-sans font-medium bg-slate-100 text-slate-600 border border-slate-200">
                            Recurring
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-4 font-semibold text-slate-900">
                        {formatCurrency(inv.amount, inv.currency)}
                      </td>
                      <td className="px-3 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badgeClass}`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-4 pl-3 pr-6 text-slate-600 text-sm">
                        {inv.dueDate}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RelatedInvoicesTable;
