import React from 'react';

const STATUS_BADGES = {
  Active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Paused: 'bg-amber-50 text-amber-700 border-amber-200',
  Cancelled: 'bg-rose-50 text-rose-700 border-rose-200',
};

export const SubscriptionTable = ({ subscriptions = [], onRowClick }) => {
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
                Plan
              </th>
              <th scope="col" className="px-3 py-3.5">
                Cycle
              </th>
              <th scope="col" className="px-3 py-3.5">
                Next Bill
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
            {subscriptions.length === 0 ? (
              <tr>
                <td colSpan="6" className="py-8 text-center text-slate-500">
                  No subscriptions found.
                </td>
              </tr>
            ) : (
              subscriptions.map((sub) => {
                const badgeClass = STATUS_BADGES[sub.status] || 'bg-slate-100 text-slate-700 border-slate-200';

                return (
                  <tr
                    key={sub.id}
                    onClick={() => onRowClick(sub.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onRowClick(sub.id);
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-label={`Open subscription detail for ${sub.customerName}, plan ${sub.planName}`}
                    className="hover:bg-slate-50 focus:bg-slate-50 focus:outline-none cursor-pointer transition-colors"
                  >
                    <td className="py-4 pl-6 pr-3 font-semibold text-slate-900">
                      {sub.customerName}
                    </td>
                    <td className="px-3 py-4 font-medium text-slate-800">
                      {sub.planName}
                    </td>
                    <td className="px-3 py-4 text-slate-600">
                      {sub.cycle}
                    </td>
                    <td className="px-3 py-4 text-slate-600 font-mono text-xs">
                      {sub.nextBill || '-'}
                    </td>
                    <td className="px-3 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badgeClass}`}>
                        {sub.status}
                      </span>
                    </td>
                    <td className="py-4 pl-3 pr-6 text-right text-xs font-medium text-slate-400">
                      <span className="group-hover:text-slate-700">
                        Open &rarr;
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

export default SubscriptionTable;
