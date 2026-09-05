import React from 'react';
import { AlertCircle } from 'lucide-react';

/**
 * QuotationProductTable - Displays quotation line items, discounts, limits, and status,
 * followed by the discount validation rule warning.
 * 
 * @param {Object} props
 * @param {Array<Object>} props.products - Array of quotation product line items
 */
export const QuotationProductTable = ({ products = [] }) => {
  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);

  return (
    <div className="space-y-4">
      {/* Product Table Container */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-slate-700 font-semibold">
              <tr>
                <th scope="col" className="py-3.5 pl-6 pr-3">
                  Product
                </th>
                <th scope="col" className="px-3 py-3.5 text-center">
                  Qty
                </th>
                <th scope="col" className="px-3 py-3.5">
                  Price
                </th>
                <th scope="col" className="px-3 py-3.5">
                  Discount
                </th>
                <th scope="col" className="px-3 py-3.5">
                  Limit
                </th>
                <th scope="col" className="py-3.5 pl-3 pr-6">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {products.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-500">
                    No products added to this quotation yet.
                  </td>
                </tr>
              ) : (
                products.map((item) => {
                  const isOverLimit = item.status && item.status.includes('OVER');

                  return (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-4 pl-6 pr-3 font-medium text-slate-900">
                        {item.name}
                      </td>
                      <td className="px-3 py-4 text-center text-slate-700">
                        {item.quantity}
                      </td>
                      <td className="px-3 py-4 text-slate-800 font-medium">
                        {formatCurrency(item.price)}
                      </td>
                      <td className="px-3 py-4 text-slate-700">
                        {item.discount}%
                      </td>
                      <td className="px-3 py-4 text-slate-500">
                        {item.discountLimit}%
                      </td>
                      <td className="py-4 pl-3 pr-6">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                            isOverLimit
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          {item.status}
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

      {/* Discount Validation Warning Banner */}
      <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
        <p className="text-sm text-amber-800 font-medium">
          Discount is checked against each line's own limit, as soon as it is entered, not only at submit time.
        </p>
      </div>
    </div>
  );
};

export default QuotationProductTable;
