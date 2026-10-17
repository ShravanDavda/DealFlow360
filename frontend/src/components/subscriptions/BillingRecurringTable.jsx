import React from 'react';
import { CalendarClock } from 'lucide-react';

export const BillingRecurringTable = ({ lines = [] }) => {
  const formatAmount = (amount) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <CalendarClock className="h-5 w-5 text-slate-700" />
        <h2 className="text-base font-semibold text-slate-900">
          Recurring Lines
        </h2>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-slate-700 font-semibold">
              <tr>
                <th scope="col" className="py-3.5 pl-6 pr-3">
                  Plan
                </th>
                <th scope="col" className="px-3 py-3.5">
                  Cycle
                </th>
                <th scope="col" className="px-3 py-3.5 font-mono text-xs">
                  Next Bill Date
                </th>
                <th scope="col" className="py-3.5 pl-3 pr-6 text-right">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {lines.length === 0 ? (
                <tr>
                  <td colSpan="4" className="py-8 text-center text-slate-500">
                    No recurring lines associated with this subscription.
                  </td>
                </tr>
              ) : (
                lines.map((line) => (
                  <tr key={line.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 pl-6 pr-3 font-semibold text-slate-900">
                      {line.plan}
                    </td>
                    <td className="px-3 py-4 text-slate-700">
                      {line.cycle}
                    </td>
                    <td className="px-3 py-4 text-slate-600 font-mono text-xs">
                      {line.nextBillDate || '-'}
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

export default BillingRecurringTable;
