import React from 'react';
import { GitFork, ArrowRight, ShieldCheck, UserCheck, Users } from 'lucide-react';

/**
 * ApprovalRulesTable - Displays the approval chain routing rules based on discount ranges and blended risk.
 * 
 * @param {Object} props
 * @param {Array<Object>} props.rules - List of rules { id, discountRange, approvalChain }
 */
export const ApprovalRulesTable = ({ rules = [] }) => {
  const getBadgeStyle = (chainText) => {
    const text = chainText.toLowerCase();
    if (text.includes('no approval')) {
      return {
        badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        icon: <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />,
      };
    }
    if (text.includes('finance')) {
      return {
        badge: 'bg-rose-50 text-rose-700 border-rose-200',
        icon: <Users className="h-3.5 w-3.5 text-rose-600" />,
      };
    }
    return {
      badge: 'bg-amber-50 text-amber-700 border-amber-200',
      icon: <UserCheck className="h-3.5 w-3.5 text-amber-600" />,
    };
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <GitFork className="h-5 w-5 text-slate-700" />
        <h2 className="text-base font-semibold text-slate-900">
          Approval Chain Rules
        </h2>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-slate-700 font-semibold">
              <tr>
                <th scope="col" className="py-3.5 pl-6 pr-4 w-1/2">
                  Discount range
                </th>
                <th scope="col" className="py-3.5 pl-4 pr-6 w-1/2">
                  Approval required
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {rules.map((rule) => {
                const style = getBadgeStyle(rule.approvalChain);

                return (
                  <tr key={rule.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-4 pl-6 pr-4 font-semibold text-slate-900">
                      {rule.discountRange}
                    </td>
                    <td className="py-4 pl-4 pr-6">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border shadow-xs ${style.badge}`}>
                        {style.icon}
                        <span>{rule.approvalChain}</span>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ApprovalRulesTable;
