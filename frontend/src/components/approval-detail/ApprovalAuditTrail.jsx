import React from 'react';
import { History } from 'lucide-react';

const ACTION_BADGES = {
  Submitted: 'bg-blue-50 text-blue-700 border-blue-200',
  Resubmitted: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  Returned: 'bg-rose-50 text-rose-700 border-rose-200',
  Approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Rejected: 'bg-red-50 text-red-700 border-red-200',
};

/**
 * ApprovalAuditTrail - Displays chronological history of user actions on the quotation.
 * 
 * @param {Object} props
 * @param {Array<Object>} props.auditTrail - List of audit entries { id, user, action, date, note }
 */
export const ApprovalAuditTrail = ({ auditTrail = [] }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <History className="h-5 w-5 text-slate-700" />
        <h2 className="text-base font-semibold text-slate-900">
          Audit Trail
        </h2>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-slate-700 font-semibold">
              <tr>
                <th scope="col" className="py-3.5 pl-6 pr-3">
                  User
                </th>
                <th scope="col" className="px-3 py-3.5">
                  Action
                </th>
                <th scope="col" className="px-3 py-3.5">
                  Date
                </th>
                <th scope="col" className="py-3.5 pl-3 pr-6">
                  Note
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {auditTrail.length === 0 ? (
                <tr>
                  <td colSpan="4" className="py-8 text-center text-slate-500">
                    No audit records available.
                  </td>
                </tr>
              ) : (
                auditTrail.map((entry) => {
                  const badgeClass = ACTION_BADGES[entry.action] || 'bg-slate-100 text-slate-700 border-slate-200';

                  return (
                    <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-4 pl-6 pr-3 font-medium text-slate-900">
                        {entry.user}
                      </td>
                      <td className="px-3 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold border ${badgeClass}`}>
                          {entry.action}
                        </span>
                      </td>
                      <td className="px-3 py-4 text-slate-500 whitespace-nowrap">
                        {entry.date}
                      </td>
                      <td className="py-4 pl-3 pr-6 text-slate-700">
                        {entry.note}
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

export default ApprovalAuditTrail;
