import React from 'react';
import { Activity } from 'lucide-react';

export const RecentActivity = ({ activities = [] }) => {
  return (
    <div className="bg-white p-6 shadow-sm border border-slate-200 rounded-lg">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
        <Activity className="h-5 w-5 text-slate-700" />
        <h2 className="text-base font-semibold text-slate-900">
          Recent Activity
        </h2>
      </div>

      {activities.length === 0 ? (
        <p className="text-sm text-slate-500 py-4 text-center">
          No recent activity to display.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100" role="list">
          {activities.map((item, index) => {
            const text = typeof item === 'string' ? item : item.text;
            const time = typeof item === 'object' ? item.time : null;

            return (
              <li key={index} className="py-3 flex items-start gap-3 first:pt-1 last:pb-1">
                <span className="h-2 w-2 rounded-full bg-slate-400 mt-2 shrink-0" aria-hidden="true" />
                <div className="flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <p className="text-sm font-medium text-slate-700">
                    {text}
                  </p>
                  {time && (
                    <span className="text-xs text-slate-400 whitespace-nowrap">
                      {time}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default RecentActivity;
