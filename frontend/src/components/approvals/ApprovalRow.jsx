import React from 'react';

const RISK_BADGE_CLASSES = {
  HIGH: 'bg-rose-50 text-rose-700 border-rose-200',
  MEDIUM: 'bg-amber-50 text-amber-700 border-amber-200',
  LOW: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

/**
 * ApprovalRow - Displays a single approval entry in the approval table.
 * 
 * @param {Object} props
 * @param {Object} props.approval - Approval record
 * @param {Function} props.onClick - Navigation callback with quotationId
 */
export const ApprovalRow = ({ approval, onClick }) => {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick(approval.id || approval.quotationId);
    }
  };

  const riskClass = RISK_BADGE_CLASSES[approval.blendedRisk] || 'bg-slate-50 text-slate-700 border-slate-200';

  return (
    <tr
      onClick={() => onClick(approval.id || approval.quotationId)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`Open approval for ${approval.customerName}, quotation ${approval.quotationId}`}
      className="hover:bg-slate-50 focus:bg-slate-50 focus:outline-none cursor-pointer transition-colors"
    >
      {/* Quotation */}
      <td className="py-4 pl-6 pr-3 font-semibold text-slate-900 font-mono text-sm">
        {approval.quotationId}
      </td>

      {/* Customer */}
      <td className="px-3 py-4 font-medium text-slate-900">
        {approval.customerName}
      </td>

      {/* Blended Risk */}
      <td className="px-3 py-4">
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold border tracking-wide ${riskClass}`}
        >
          {approval.blendedRisk}
        </span>
      </td>

      {/* Stage */}
      <td className="px-3 py-4 text-slate-700 font-medium text-sm">
        {approval.stage}
      </td>

      {/* Assigned To */}
      <td className="px-3 py-4 text-slate-600 text-sm">
        {approval.assignedTo || '-'}
      </td>

      {/* Action Indicator */}
      <td className="py-4 pl-3 pr-6 text-right text-xs font-medium text-slate-400">
        <span className="group-hover:text-slate-700">
          Open &rarr;
        </span>
      </td>
    </tr>
  );
};

export default ApprovalRow;
