import React from 'react';
import { ApprovalRow } from './ApprovalRow';

export const ApprovalTable = ({ approvals = [], onRowClick, onAction, isSalesManager, isFinanceOperations }) => {
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50 text-slate-700 font-semibold">
            <tr>
              <th className="py-3.5 pl-6 pr-3">Quotation</th>
              <th className="px-3 py-3.5">Customer &amp; Tier</th>
              <th className="px-3 py-3.5">Sales Rep</th>
              <th className="px-3 py-3.5">Amount &amp; Discount</th>
              <th className="px-3 py-3.5">Blended Risk</th>
              <th className="px-3 py-3.5">Approval Chain</th>
              <th className="px-3 py-3.5">Reason Required</th>
              <th className="py-3.5 pl-3 pr-6">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {approvals.length === 0 ? (
              <tr>
                <td colSpan="8" className="py-8 text-center text-slate-500">
                  No approvals matching the current filter.
                </td>
              </tr>
            ) : (
              approvals.map((approval) => (
                <ApprovalRow
                  key={approval.id}
                  approval={approval}
                  onClick={onRowClick}
                  onAction={onAction}
                  isSalesManager={isSalesManager}
                  isFinanceOperations={isFinanceOperations}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ApprovalTable;
