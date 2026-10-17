import React from 'react';
import { ShoppingBag } from 'lucide-react';

export const BillingOneTimeTable = ({ lines = [] }) => {
  const formatAmount = (amount) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <ShoppingBag className="h-5 w-5 text-slate-700" />
        <h2 className="text-base font-semibold text-slate-900">
          One-Time Lines (from originating order)
        </h2>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-slate-700 font-semibold">
              <tr>
                <th scope="col" className="py-3.5 pl-6 pr-3">
                  Product
                </th>
                <th scope="col" className="px-3 py-3.5 text-center">
                  Qty
                </th>
                <th scope="col" className="py-3.5 pl-3 pr-6 text-right">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {lines.length === 0 ? (
                <tr>
                  <td colSpan="3" className="py-8 text-center text-slate-500">
                    No one-time lines associated with this order.
                  </td>
                </tr>
              ) : (
                lines.map((line) => (
                  <tr key={line.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 pl-6 pr-3 font-semibold text-slate-900">
                      {line.product}
                    </td>
                    <td className="px-3 py-4 text-center text-slate-700 font-medium">
                      {line.quantity}
                    </td>
                    <td className="py-4 pl-3 pr-6 text-right font-bold text-slate-900">
                      {formatAmount(line.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BillingOneTimeTable;
