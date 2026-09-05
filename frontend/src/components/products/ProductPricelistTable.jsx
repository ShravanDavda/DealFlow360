import React from 'react';
import { Tag } from 'lucide-react';

/**
 * ProductPricelistTable - Displays configured pricelists, currencies, and pricing rules.
 * 
 * @param {Object} props
 * @param {Array<Object>} props.pricelists - Array of pricelist objects { tier, currency, priceRule }
 */
export const ProductPricelistTable = ({ pricelists = [] }) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Tag className="h-5 w-5 text-slate-700" />
        <h2 className="text-base font-semibold text-slate-900">
          Pricelists
        </h2>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-slate-700 font-semibold">
              <tr>
                <th scope="col" className="py-3.5 pl-6 pr-3 w-1/4">
                  Tier
                </th>
                <th scope="col" className="px-3 py-3.5 w-1/4">
                  Currency
                </th>
                <th scope="col" className="py-3.5 pl-3 pr-6">
                  Price Rule
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {pricelists.length === 0 ? (
                <tr>
                  <td colSpan="3" className="py-8 text-center text-slate-500">
                    No custom pricelists configured for this product.
                  </td>
                </tr>
              ) : (
                pricelists.map((item, idx) => {
                  const currencyDisplay = Array.isArray(item.currency)
                    ? item.currency.join(' / ')
                    : item.currency;

                  return (
                    <tr key={item.tier || idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-4 pl-6 pr-3 font-semibold text-slate-900">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                          {item.tier}
                        </span>
                      </td>
                      <td className="px-3 py-4 text-slate-700 font-medium">
                        {currencyDisplay}
                      </td>
                      <td className="py-4 pl-3 pr-6 text-slate-800 font-medium">
                        {item.priceRule}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ProductPricelistTable;
