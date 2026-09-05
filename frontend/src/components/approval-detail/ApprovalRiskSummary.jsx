import React from 'react';
import { ShieldAlert, Award } from 'lucide-react';

const RISK_BADGES = {
  HIGH: 'bg-rose-50 text-rose-700 border-rose-200',
  MEDIUM: 'bg-amber-50 text-amber-700 border-amber-200',
  LOW: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

/**
 * ApprovalRiskSummary - Displays Blended Risk and Customer Tier indicators.
 * 
 * @param {Object} props
 * @param {string} props.blendedRisk - Risk level (e.g. 'HIGH')
 * @param {string} props.customerTier - Customer tier (e.g. 'Gold')
 */
export const ApprovalRiskSummary = ({ blendedRisk = 'HIGH', customerTier = 'Gold' }) => {
  const riskClass = RISK_BADGES[blendedRisk] || 'bg-slate-50 text-slate-700 border-slate-200';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Blended Risk Indicator */}
      <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Blended Risk
          </span>
          <span className="text-lg font-bold text-slate-900 mt-1 block">
            Risk Assessment
          </span>
        </div>
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-rose-600" />
          <span className={`px-3 py-1 rounded-md text-sm font-bold border tracking-wide ${riskClass}`}>
            {blendedRisk}
          </span>
        </div>
      </div>

      {/* Customer Tier Indicator */}
      <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Customer Tier
          </span>
          <span className="text-lg font-bold text-slate-900 mt-1 block">
            Account Status
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Award className="h-5 w-5 text-amber-600" />
          <span className="px-3 py-1 rounded-md text-sm font-semibold border bg-amber-50 text-amber-800 border-amber-200 tracking-wide">
            {customerTier}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ApprovalRiskSummary;
