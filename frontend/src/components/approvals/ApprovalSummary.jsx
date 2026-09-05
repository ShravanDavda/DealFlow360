import React from 'react';
import { Clock, RotateCcw, CheckCircle2 } from 'lucide-react';

const STATUS_CONFIG = {
  pending: {
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    icon: <Clock className="h-4 w-4 text-amber-600" />,
  },
  returned: {
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
    icon: <RotateCcw className="h-4 w-4 text-rose-600" />,
  },
  approved: {
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    icon: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
  },
};

/**
 * ApprovalSummary - Renders status summary indicator cards.
 * 
 * @param {Object} props
 * @param {Array<Object>} props.summary - Array of summary indicators { label, count, status }
 */
export const ApprovalSummary = ({ summary = [] }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {summary.map((item) => {
        const config = STATUS_CONFIG[item.status.toLowerCase()] || {
          badgeClass: 'bg-slate-50 text-slate-800 border-slate-200',
          icon: null,
        };

        return (
          <div
            key={item.label}
            className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between"
          >
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                {item.label}
              </p>
              <p className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
                {item.count} {item.label}
              </p>
            </div>
            <div className={`p-2 rounded-lg border ${config.badgeClass}`}>
              {config.icon}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ApprovalSummary;
