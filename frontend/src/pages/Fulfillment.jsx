import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardNavbar } from '../components/dashboard/DashboardNavbar';
import { FulfillmentOrdersTable } from '../components/fulfillment/FulfillmentOrdersTable';
import { getFulfillmentOrders } from '../services/fulfillmentService';

const STATUS_TABS = [['pending', 'Pending'], ['in-progress', 'In Progress'], ['partial', 'Partially Fulfilled'], ['backordered', 'Backordered'], ['fulfilled', 'Fulfilled']];
const matchesTab = (order, tab) => {
  const status = String(order.status || '').toLowerCase();
  if (tab === 'pending') return status.includes('pending');
  if (tab === 'in-progress') return status.includes('accepted') || status.includes('progress');
  if (tab === 'partial') return status.includes('partial');
  if (tab === 'backordered') return status.includes('backorder') || Number(order.remainingQuantity || 0) > 0;
  if (tab === 'fulfilled') return status === 'fulfilled' || (Number(order.remainingQuantity || 0) === 0 && Number(order.requiredQuantity || 0) > 0);
  return true;
};

export const Fulfillment = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [filterMode, setFilterMode] = useState('pending');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    getFulfillmentOrders()
      .then((data) => {
        if (isMounted && data && data.length > 0) {
          setOrders(
            data.map((o) => ({
              id: `ORD-${o.dbId}`,
              orderId: o.quotationId || o.orderId,
              customerName: o.customerName,
              status: o.status,
              quotationId: o.quotationId,
              items: o.itemSummary || '--',
              requiredQuantity: o.requiredQuantity || 0,
              fulfilledQuantity: o.fulfilledQuantity || 0,
              remainingQuantity: o.remainingQuantity || 0,
            }))
          );
        }
      })
      .catch((err) => console.error('Failed to load fulfillment orders:', err))
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleOrderClick = (orderId) => {
    navigate(`/fulfillment/${orderId}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <DashboardNavbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Fulfillment and Multi-Warehouse Stock
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Live stock per warehouse and automated order splitting logic across fulfillment hubs.
          </p>
        </div>

        <section aria-label="Fulfillment Status Tabs" className="flex flex-wrap gap-2">
          {STATUS_TABS.map(([value, label]) => <button key={value} type="button" onClick={() => setFilterMode(value)} className={`rounded px-3 py-1.5 text-xs font-medium ${filterMode === value ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`} aria-pressed={filterMode === value}>{label}</button>)}
        </section>

        <section aria-label="Fulfillment Orders" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">
              Active Fulfillment Orders ({orders.length})
            </h2>
            <span className="text-xs text-slate-500 font-medium">
              Click an order to view and override warehouse splits
            </span>
          </div>

          <FulfillmentOrdersTable
            orders={orders.filter((order) => matchesTab(order, filterMode))}
            onOrderClick={handleOrderClick}
          />
        </section>

      </main>
    </div>
  );
};

export default Fulfillment;
