import React from 'react';
import { Package } from 'lucide-react';

/**
 * StockTable - Displays live warehouse stock levels with reserved and available quantities.
 * 
 * @param {Object} props
 * @param {Array<Object>} props.stockData - Array of stock records
 */
export const StockTable = ({ stockData = [] }) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Package className="h-5 w-5 text-slate-700" />
        <h2 className="text-base font-semibold text-slate-900">
          Warehouse Stock Levels
        </h2>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-slate-700 font-semibold">
              <tr>
                <th scope="col" className="py-3.5 pl-6 pr-3">
                  Warehouse
                </th>
                <th scope="col" className="px-3 py-3.5">
                  Product
                </th>
                <th scope="col" className="px-3 py-3.5 text-center">
                  In Stock
                </th>
                <th scope="col" className="px-3 py-3.5 text-center">
                  Reserved
                </th>
                <th scope="col" className="py-3.5 pl-3 pr-6 text-center">
                  Available
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {stockData.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-slate-500">
                    No stock records available.
                  </td>
                </tr>
              ) : (
                stockData.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 pl-6 pr-3 font-semibold text-slate-900">
                      {item.warehouse}
                    </td>
                    <td className="px-3 py-4 text-slate-800 font-medium">
                      {item.product}
                    </td>
                    <td className="px-3 py-4 text-center text-slate-700 font-medium">
                      {item.inStock}
                    </td>
                    <td className="px-3 py-4 text-center text-slate-500">
                      {item.reserved}
                    </td>
                    <td className="py-4 pl-3 pr-6 text-center font-bold text-slate-900">
                      <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                        {item.available}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StockTable;
