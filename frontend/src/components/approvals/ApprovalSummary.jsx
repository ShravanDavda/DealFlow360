import React from 'react';
import { Clock, RotateCcw, CheckCircle2, AlertTriangle } from 'lucide-react';

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
  'high-risk': {
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
    icon: <AlertTriangle className="h-4 w-4 text-rose-600" />,
  },
};

export const ApprovalSummary = ({ summary = [] }) => {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
              <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{item.count}</p>
              <p className="mt-1 text-xs text-slate-500">{item.status === 'pending' ? 'Awaiting Manager review' : item.status === 'high-risk' ? 'Requires Manager → Finance handoff' : item.status === 'returned' ? 'With Sales Rep for rework' : 'Authorized for deal creation'}</p>
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
