import React from 'react';

const RISK_BADGE_CLASSES = {
  HIGH: 'bg-rose-50 text-rose-700 border-rose-200',
  MEDIUM: 'bg-amber-50 text-amber-700 border-amber-200',
  LOW: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

export const ApprovalRow = ({ approval, onClick, onAction, isSalesManager, isFinanceOperations }) => {
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
      <td className="py-4 pl-6 pr-3 font-semibold text-slate-900 font-mono text-sm">
        <span>{approval.quotationId}</span>
        <span className="mt-1 block font-sans text-xs font-normal text-slate-500">{new Date(approval.submittedAt || approval.createdAt).toLocaleDateString()}</span>
      </td>
      <td className="px-3 py-4 font-medium text-slate-900">
        <span>{approval.customerName}</span>
        <span className="mt-1 block w-fit rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-xs font-medium text-slate-600">{approval.customerTier || '--'} Tier</span>
      </td>
      <td className="px-3 py-4 text-slate-700">{approval.salesRep || '--'}</td>
      <td className="px-3 py-4 text-slate-700"><span className="font-semibold">${approval.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span><span className="mt-1 block text-xs text-rose-600">-${approval.discount.toLocaleString(undefined, { minimumFractionDigits: 2 })} disc</span></td>
      <td className="px-3 py-4">
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold border tracking-wide ${riskClass}`}
        >
          {approval.blendedRisk}
        </span>
      </td>
      <td className="px-3 py-4 text-xs text-slate-700"><span>{approval.approvalChain || '--'}</span><span className="mt-1 block text-slate-500">Current: {approval.currentStep || approval.stage || '--'}</span>
      </td>
      <td className="max-w-[220px] px-3 py-4 text-xs text-slate-600">{approval.reasonRequired || '--'}</td>
      <td className="px-3 py-4" onClick={(event) => event.stopPropagation()}>
        {((isSalesManager && (approval.status === 'Pending' || approval.status === 'Pending Approval') && (approval.currentStep === 'Sales Manager' || !approval.currentStep)) || 
          (isFinanceOperations && (approval.status === 'Pending' || approval.status === 'Pending Approval') && (String(approval.currentStep || '').toLowerCase() === 'finance' || !approval.currentStep))) ? (
          <div className="flex flex-wrap justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAction(approval, 'approve');
              }}
              className="rounded bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700 shadow-sm transition-colors cursor-pointer active:scale-95"
            >
              Approve
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAction(approval, 'return');
              }}
              className="rounded bg-amber-500 px-2.5 py-1 text-xs font-semibold text-white hover:bg-amber-600 shadow-sm transition-colors cursor-pointer active:scale-95"
            >
              Return
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAction(approval, 'reject');
              }}
              className="rounded bg-rose-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-rose-700 shadow-sm transition-colors cursor-pointer active:scale-95"
            >
              Reject
            </button>
          </div>
        ) : (
          <span className="text-xs text-slate-400">View →</span>
        )}
      </td>
    </tr>
  );
};

export default ApprovalRow;
