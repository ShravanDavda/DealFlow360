import React from 'react';
import { Layers } from 'lucide-react';

/**
 * WarehouseSplitTable - Displays warehouse fulfillment splits with quantities, estimated shipments, and costs.
 * 
 * @param {Object} props
 * @param {Array<Object>} props.warehouseSplits - Array of split allocations
 */
export const WarehouseSplitTable = ({ warehouseSplits = [] }) => {
  const formatCost = (amount) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Layers className="h-5 w-5 text-slate-700" />
        <h2 className="text-base font-semibold text-slate-900">
          Warehouse Split Allocation
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
                  Qty Fulfilled
                </th>
                <th scope="col" className="px-3 py-3.5 text-center">
                  Est. Shipments
                </th>
                <th scope="col" className="py-3.5 pl-3 pr-6 text-right">
                  Cost
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {warehouseSplits.length === 0 ? (
                <tr>
                  <td colSpan="4" className="py-8 text-center text-slate-500">
                    No warehouse splits available.
                  </td>
                </tr>
              ) : (
                warehouseSplits.map((split) => (
                  <tr key={split.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 pl-6 pr-3 font-semibold text-slate-900">
                      {split.warehouse}
                    </td>
                    <td className="px-3 py-4 text-slate-800 font-medium">
                      {split.quantityFulfilled} units
                    </td>
                    <td className="px-3 py-4 text-center text-slate-600 font-medium">
                      {split.estimatedShipments}
                    </td>
                    <td className="py-4 pl-3 pr-6 text-right font-bold text-slate-900">
                      {formatCost(split.cost)}
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

export default WarehouseSplitTable;
