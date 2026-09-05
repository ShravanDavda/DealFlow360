import React from 'react';
import { Truck } from 'lucide-react';

const STATUS_BADGES = {
  'Split Pending': 'bg-amber-50 text-amber-700 border-amber-200',
  'Backorder': 'bg-rose-50 text-rose-700 border-rose-200',
  'Fulfilled': 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

/**
 * FulfillmentOrdersTable - Displays orders awaiting fulfillment with clickable rows.
 * 
 * @param {Object} props
 * @param {Array<Object>} props.orders - Array of fulfillment order items
 * @param {Function} props.onOrderClick - Callback when an order row is clicked
 */
export const FulfillmentOrdersTable = ({ orders = [], onOrderClick }) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Truck className="h-5 w-5 text-slate-700" />
        <h2 className="text-base font-semibold text-slate-900">
          Orders Awaiting Fulfillment
        </h2>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-slate-700 font-semibold">
              <tr>
                <th scope="col" className="py-3.5 pl-6 pr-3">
                  Order
                </th>
                <th scope="col" className="px-3 py-3.5">
                  Customer
                </th>
                <th scope="col" className="px-3 py-3.5">
                  Status
                </th>
                <th scope="col" className="px-3 py-3.5">
                  Warehouses
                </th>
                <th scope="col" className="relative py-3.5 pl-3 pr-6">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-slate-500">
                    No orders awaiting fulfillment.
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const badgeClass = STATUS_BADGES[order.status] || 'bg-slate-100 text-slate-700 border-slate-200';

                  return (
                    <tr
                      key={order.id}
                      onClick={() => onOrderClick(order.orderId)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onOrderClick(order.orderId);
                        }
                      }}
                      tabIndex={0}
                      role="button"
                      aria-label={`Open fulfillment detail for order ${order.orderId}, customer ${order.customerName}`}
                      className="hover:bg-slate-50 focus:bg-slate-50 focus:outline-none cursor-pointer transition-colors"
                    >
                      <td className="py-4 pl-6 pr-3 font-semibold text-slate-900 font-mono text-sm">
                        {order.orderId}
                      </td>
                      <td className="px-3 py-4 font-medium text-slate-900">
                        {order.customerName}
                      </td>
                      <td className="px-3 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badgeClass}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-3 py-4 text-slate-700 font-medium text-sm">
                        {order.warehouses}
                      </td>
                      <td className="py-4 pl-3 pr-6 text-right text-xs font-medium text-slate-400">
                        <span className="group-hover:text-slate-700">
                          Open &rarr;
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
    </div>
  );
};

export default FulfillmentOrdersTable;
