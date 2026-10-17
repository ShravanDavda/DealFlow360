import React from 'react';
import { Percent, Shield } from 'lucide-react';

export const TierDiscountTable = ({ tiers = [], onChange, errors = {} }) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5 text-slate-700" />
        <h2 className="text-base font-semibold text-slate-900">
          Tier Discount Ceilings
        </h2>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-slate-700 font-semibold">
              <tr>
                <th scope="col" className="py-3.5 pl-6 pr-4 w-1/2">
                  Tier
                </th>
                <th scope="col" className="py-3.5 pl-4 pr-6 w-1/2">
                  Max Discount
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {tiers.map((item) => {
                const hasError = !!errors[item.id];

                return (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-4 pl-6 pr-4 font-semibold text-slate-900 align-middle">
                      <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                        {item.name}
                      </span>
                    </td>
                    <td className="py-4 pl-4 pr-6 align-middle">
                      <div className="max-w-[200px] space-y-1">
                        <div className="relative rounded-md shadow-sm">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="1"
                            value={item.maxDiscountPercent}
                            onChange={(e) => onChange && onChange(item.id, e.target.value)}
                            aria-label={`Maximum discount percentage for ${item.name}`}
                            className={`block w-full rounded-md border px-3 py-1.5 pr-8 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-colors ${
                              hasError
                                ? 'border-rose-500 focus:ring-rose-500'
                                : 'border-slate-300 hover:border-slate-400'
                            }`}
                          />
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400">
                            <Percent className="h-3.5 w-3.5" />
                          </div>
                        </div>
                        {hasError && (
                          <p className="text-xs text-rose-600 font-medium">
                            {errors[item.id]}
                          </p>
                        )}
                      </div>
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

export default TierDiscountTable;
