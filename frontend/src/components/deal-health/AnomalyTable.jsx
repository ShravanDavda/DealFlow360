import React from 'react';
import { AlertCircle, AlertOctagon } from 'lucide-react';

/**
 * AnomalyTable - Renders flagged deal health anomalies in a clean, accessible table.
 * 
 * @param {Object} props
 * @param {Array<Object>} props.anomalies - List of anomaly records
 */
export const AnomalyTable = ({ anomalies = [] }) => {
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50 text-slate-700 font-semibold">
            <tr>
              <th scope="col" className="py-3.5 pl-6 pr-3">
                Deal
              </th>
              <th scope="col" className="px-3 py-3.5">
                Issue
              </th>
              <th scope="col" className="px-3 py-3.5">
                Flagged
              </th>
              <th scope="col" className="py-3.5 pl-3 pr-6">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {anomalies.length === 0 ? (
              <tr>
                <td colSpan="4" className="py-8 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <AlertCircle className="h-6 w-6 text-slate-400" />
                    <p className="text-sm font-medium text-slate-600">
                      No active deal health anomalies.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              anomalies.map((item) => {
                const isEscalated = item.action.toLowerCase().includes('escalat');
                const isDiscountIssue = item.issue.toLowerCase().includes('discount');

                return (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-4 pl-6 pr-3 font-semibold text-slate-900">
                      {item.deal}
                    </td>
                    <td className="px-3 py-4 text-slate-700">
                      <span className="inline-flex items-center gap-1.5">
                        {isDiscountIssue ? (
                          <AlertOctagon className="h-4 w-4 text-rose-500 shrink-0" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                        )}
                        <span className="font-medium text-slate-800">
                          {item.issue}
                        </span>
                      </span>
                    </td>
                    <td className="px-3 py-4 text-slate-600 text-sm">
                      {item.flaggedDate}
                    </td>
                    <td className="py-4 pl-3 pr-6">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                          isEscalated
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {item.action}
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

export default AnomalyTable;
