import React from 'react';
import { AlertCircle, AlertTriangle } from 'lucide-react';

/**
 * ApprovalRiskTable - Displays the "Why This Quote Was Flagged" table
 * along with the highlighted rule explanation.
 * 
 * @param {Object} props
 * @param {Array<Object>} props.riskLines - Array of risk line items
 */
export const ApprovalRiskTable = ({ riskLines = [] }) => {
  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-amber-600" />
        <h2 className="text-base font-semibold text-slate-900">
          Why This Quote Was Flagged
        </h2>
      </div>

      {/* Table Container */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-slate-700 font-semibold">
              <tr>
                <th scope="col" className="py-3.5 pl-6 pr-3">
                  Line
                </th>
                <th scope="col" className="px-3 py-3.5">
                  Discount Given
                </th>
                <th scope="col" className="px-3 py-3.5">
                  Limit Allowed
                </th>
                <th scope="col" className="py-3.5 pl-3 pr-6">
                  Over By
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {riskLines.length === 0 ? (
                <tr>
                  <td colSpan="4" className="py-8 text-center text-slate-500">
                    No risk lines to display.
                  </td>
                </tr>
              ) : (
                riskLines.map((item) => {
                  const isOver = item.status === 'OVER' || item.overBy > 0;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-4 pl-6 pr-3 font-medium text-slate-900">
                        {item.line}
                      </td>
                      <td className="px-3 py-4 text-slate-700">
                        {item.discountGiven}%
                      </td>
                      <td className="px-3 py-4 text-slate-500">
                        {item.limitAllowed}%
                      </td>
                      <td className="py-4 pl-3 pr-6">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                            isOver
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          {isOver ? `${item.overBy} pt OVER` : `${item.overBy} pt - OK`}
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

      {/* Flag Explanation Banner */}
      <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
        <p className="text-sm text-amber-800 font-medium">
          Worst single line (8pt over) plus overall pattern across the order sets the blended score. One bad line is enough to require approval.
        </p>
      </div>
    </div>
  );
};

export default ApprovalRiskTable;
