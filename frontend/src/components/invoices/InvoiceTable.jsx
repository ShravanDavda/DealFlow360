import React from 'react';
import { ArrowUpRight } from 'lucide-react';

const STATUS_BADGES = {
  Paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Unpaid: 'bg-amber-50 text-amber-700 border-amber-200',
};

export const InvoiceTable = ({ invoices = [], onRowClick }) => {
  const formatCurrency = (amount, currency = 'USD') =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50 text-slate-700 font-semibold">
            <tr>
              <th scope="col" className="py-3.5 pl-6 pr-3">
                Invoice
              </th>
              <th scope="col" className="px-3 py-3.5">
                Customer
              </th>
              <th scope="col" className="px-3 py-3.5">Order</th>
              <th scope="col" className="px-3 py-3.5">Type</th>
              <th scope="col" className="px-3 py-3.5">
                Amount
              </th>
              <th scope="col" className="px-3 py-3.5">
                Status
              </th>
              <th scope="col" className="px-3 py-3.5">
                Due Date
              </th>
              <th scope="col" className="px-3 py-3.5">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {invoices.length === 0 ? (
              <tr>
                <td colSpan="8" className="py-8 text-center text-slate-500">
                  No invoices found.
                </td>
              </tr>
            ) : (
              invoices.map((inv) => {
                const badgeClass = STATUS_BADGES[inv.status] || 'bg-slate-100 text-slate-700 border-slate-200';

                return (
                  <tr
                    key={inv.id}
                    onClick={() => onRowClick && onRowClick(inv.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        if (onRowClick) onRowClick(inv.id);
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-label={`Open invoice detail for ${inv.id}, customer ${inv.customerName}, amount ${formatCurrency(inv.amount, inv.currency)}, status ${inv.status}`}
                    className="hover:bg-slate-50 focus:bg-slate-50 focus:outline-none cursor-pointer transition-colors group"
                  >
                    <td className="py-4 pl-6 pr-3 font-semibold text-slate-900 font-mono text-sm">
                      {inv.id}
                    </td>
                    <td className="px-3 py-4 font-medium text-slate-800">
                      {inv.customerName}
                    </td>
                    <td className="px-3 py-4 text-slate-600">{inv.order || '--'}</td>
                    <td className="px-3 py-4 text-slate-600">{inv.type || '--'}</td>
                    <td className="px-3 py-4 font-semibold text-slate-900">
                      {formatCurrency(inv.amount, inv.currency)}
                    </td>
                    <td className="px-3 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badgeClass}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-slate-600 text-sm">
                      {inv.dueDate}
                    </td>
                    <td className="py-4 pl-3 pr-6 text-right text-xs font-medium text-slate-400">
                      <span className="inline-flex items-center gap-1 group-hover:text-slate-900 transition-colors">
                        <span>Open</span>
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InvoiceTable;
