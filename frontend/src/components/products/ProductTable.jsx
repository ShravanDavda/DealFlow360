import React from 'react';
import { ArrowUpRight } from 'lucide-react';

const CATEGORY_STYLES = {
  Hardware: 'bg-slate-100 text-slate-700 border-slate-200',
  Services: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  Subscription: 'bg-blue-50 text-blue-700 border-blue-200',
};

/**
 * ProductTable - Displays the list of products in the catalog with status, variants, pricing, and taxes.
 * 
 * @param {Object} props
 * @param {Array<Object>} props.products - Array of product objects
 * @param {Function} props.onRowClick - Row selection callback (productId) => void
 */
export const ProductTable = ({ products = [], onRowClick }) => {
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50 text-slate-700 font-semibold">
            <tr>
              <th scope="col" className="py-3.5 pl-6 pr-3">
                Product name
              </th>
              <th scope="col" className="px-3 py-3.5">
                Category
              </th>
              <th scope="col" className="px-3 py-3.5">
                Variants
              </th>
              <th scope="col" className="px-3 py-3.5">
                Price
              </th>
              <th scope="col" className="px-3 py-3.5">
                Unit
              </th>
              <th scope="col" className="px-3 py-3.5">
                Tax
              </th>
              <th scope="col" className="px-3 py-3.5">
                Status
              </th>
              <th scope="col" className="relative py-3.5 pl-3 pr-6 text-right">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {products.length === 0 ? (
              <tr>
                <td colSpan="8" className="py-8 text-center text-slate-500">
                  No products available.
                </td>
              </tr>
            ) : (
              products.map((prod) => {
                const categoryClass = CATEGORY_STYLES[prod.category] || 'bg-slate-100 text-slate-700 border-slate-200';

                return (
                  <tr
                    key={prod.id}
                    onClick={() => onRowClick && onRowClick(prod.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        if (onRowClick) onRowClick(prod.id);
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-label={`Open product detail for ${prod.name}, category ${prod.category}, price ${prod.priceFormatted || prod.price}`}
                    className="hover:bg-slate-50 focus:bg-slate-50 focus:outline-none cursor-pointer transition-colors group"
                  >
                    <td className="py-4 pl-6 pr-3 font-semibold text-slate-900">
                      {prod.name}
                    </td>
                    <td className="px-3 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${categoryClass}`}>
                        {prod.category}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-slate-600">
                      {prod.variants}
                    </td>
                    <td className="px-3 py-4 font-semibold text-slate-900">
                      {prod.priceFormatted || prod.price}
                    </td>
                    <td className="px-3 py-4 text-slate-600">
                      {prod.unit}
                    </td>
                    <td className="px-3 py-4 text-slate-600 font-medium">
                      {prod.tax}
                    </td>
                    <td className="px-3 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {prod.status}
                      </span>
                    </td>
                    <td className="py-4 pl-3 pr-6 text-right text-xs font-medium text-slate-400">
                      <span className="inline-flex items-center gap-1 group-hover:text-slate-900 transition-colors">
                        <span>Open</span>
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProductTable;
