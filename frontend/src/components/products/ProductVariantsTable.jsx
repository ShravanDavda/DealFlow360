import React from 'react';
import { Layers } from 'lucide-react';

export const ProductVariantsTable = ({ variants = [] }) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Layers className="h-5 w-5 text-slate-700" />
        <h2 className="text-base font-semibold text-slate-900">
          Product Variants
        </h2>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-slate-700 font-semibold">
              <tr>
                <th scope="col" className="py-3.5 pl-6 pr-3 w-1/4">
                  Attribute
                </th>
                <th scope="col" className="px-3 py-3.5">
                  Values
                </th>
                <th scope="col" className="py-3.5 pl-3 pr-6 text-right">
                  Extra Price
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {variants.length === 0 ? (
                <tr>
                  <td colSpan="3" className="py-8 text-center text-slate-500">
                    No variants configured for this product.
                  </td>
                </tr>
              ) : (
                variants.map((v, idx) => {
                  const valuesText = Array.isArray(v.values) ? v.values.join(', ') : v.values;
                  const extraPriceFormatted = 
                    typeof v.extraPrice === 'number'
                      ? v.extraPrice === 0
                        ? '$0'
                        : `+$${v.extraPrice}`
                      : v.extraPrice || '$0';

                  return (
                    <tr key={v.attribute || idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-4 pl-6 pr-3 font-semibold text-slate-900">
                        {v.attribute}
                      </td>
                      <td className="px-3 py-4 text-slate-700 font-medium">
                        {valuesText}
                      </td>
                      <td className="py-4 pl-3 pr-6 text-right font-semibold text-slate-900">
                        {extraPriceFormatted}
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

export default ProductVariantsTable;
