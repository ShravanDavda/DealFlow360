import React from 'react';
import { Check, Clock, CircleDot } from 'lucide-react';

/**
 * InvoiceTimeline - Displays the 4-step payment and invoice lifecycle.
 * Order Confirmed -> Shipped -> Invoiced -> Paid
 * 
 * @param {Object} props
 * @param {Array<Object>} props.timeline - Array of stages { id, label, status }
 */
export const InvoiceTimeline = ({ timeline = [] }) => {
  return (
    <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-4">
      <div className="flex items-center gap-2">
        <CircleDot className="h-5 w-5 text-slate-700" />
        <h2 className="text-base font-semibold text-slate-900">
          Payment & Delivery Lifecycle
        </h2>
      </div>

      <div className="pt-2">
        {/* Desktop / Tablet Horizontal Stepper */}
        <div className="hidden sm:flex items-center justify-between relative">
          {timeline.map((stage, idx) => {
            const isCompleted = stage.status === 'completed';
            const isCurrent = stage.status === 'current';
            const isLast = idx === timeline.length - 1;

            return (
              <React.Fragment key={stage.id}>
                {/* Step Circle & Label */}
                <div className="flex flex-col items-center text-center z-10 min-w-[100px]">
                  <div
                    className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                      isCompleted
                        ? 'bg-slate-900 text-white shadow-sm'
                        : isCurrent
                        ? 'bg-white border-2 border-slate-900 text-slate-900 ring-4 ring-slate-100'
                        : 'bg-slate-100 border border-slate-300 text-slate-400'
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="h-4 w-4 stroke-[2.5]" />
                    ) : isCurrent ? (
                      <Clock className="h-4 w-4 text-slate-900" />
                    ) : (
                      idx + 1
                    )}
                  </div>
                  <span
                    className={`mt-2 text-xs font-semibold ${
                      isCurrent
                        ? 'text-slate-900'
                        : isCompleted
                        ? 'text-slate-800'
                        : 'text-slate-400'
                    }`}
                  >
                    {stage.label}
                  </span>
                  <span className="text-[11px] text-slate-400 capitalize">
                    {stage.status}
                  </span>
                </div>

                {/* Connector Line */}
                {!isLast && (
                  <div
                    className={`flex-1 h-0.5 mx-2 -mt-7 ${
                      isCompleted ? 'bg-slate-900' : 'bg-slate-200'
                    }`}
                    aria-hidden="true"
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Mobile Vertical Stepper */}
        <div className="sm:hidden space-y-4">
          {timeline.map((stage, idx) => {
            const isCompleted = stage.status === 'completed';
            const isCurrent = stage.status === 'current';

            return (
              <div key={stage.id} className="flex items-center gap-3">
                <div
                  className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                    isCompleted
                      ? 'bg-slate-900 text-white'
                      : isCurrent
                      ? 'bg-white border-2 border-slate-900 text-slate-900 ring-2 ring-slate-100'
                      : 'bg-slate-100 border border-slate-300 text-slate-400'
                  }`}
                >
                  {isCompleted ? <Check className="h-3.5 w-3.5" /> : idx + 1}
                </div>
                <div className="flex-1 flex items-center justify-between">
                  <span className={`text-sm font-semibold ${isCurrent ? 'text-slate-900' : 'text-slate-700'}`}>
                    {stage.label}
                  </span>
                  <span className="text-xs text-slate-400 capitalize">
                    {stage.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default InvoiceTimeline;
