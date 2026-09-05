import React from 'react';
import { ApprovalRow } from './ApprovalRow';

/**
 * ApprovalTable - Renders the table of quotations requiring or in approval.
 * 
 * @param {Object} props
 * @param {Array<Object>} props.approvals - Filtered array of approvals
 * @param {Function} props.onRowClick - Row selection callback
 */
export const ApprovalTable = ({ approvals = [], onRowClick }) => {
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50 text-slate-700 font-semibold">
            <tr>
              <th scope="col" className="py-3.5 pl-6 pr-3">
                Quotation
              </th>
              <th scope="col" className="px-3 py-3.5">
                Customer
              </th>
              <th scope="col" className="px-3 py-3.5">
                Blended Risk
              </th>
              <th scope="col" className="px-3 py-3.5">
                Stage
              </th>
              <th scope="col" className="px-3 py-3.5">
                Assigned To
              </th>
              <th scope="col" className="relative py-3.5 pl-3 pr-6">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {approvals.length === 0 ? (
              <tr>
                <td colSpan="6" className="py-8 text-center text-slate-500">
                  No approvals matching the current filter.
                </td>
              </tr>
            ) : (
              approvals.map((approval) => (
                <ApprovalRow
                  key={approval.id}
                  approval={approval}
                  onClick={onRowClick}
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
