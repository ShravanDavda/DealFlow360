import React from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardNavbar } from '../components/dashboard/DashboardNavbar';
import { StockTable } from '../components/fulfillment/StockTable';
import { FulfillmentOrdersTable } from '../components/fulfillment/FulfillmentOrdersTable';
import { FulfillmentNotice } from '../components/fulfillment/FulfillmentNotice';

// ============================================================================
// FRONTEND MOCK DATA & FUTURE BACKEND API CONTRACT
// ============================================================================
// API 1: GET /api/fulfillment/stock
// API 2: GET /api/fulfillment/orders
// API 3 (Detail): GET /api/fulfillment/orders/:orderId
// ============================================================================
const MOCK_STOCK_DATA = [
  {
    id: 'ST-001',
    warehouse: 'Main Warehouse',
    product: 'Laptop Pro 14',
    inStock: 40,
    reserved: 18,
    available: 22,
  },
  {
    id: 'ST-002',
    warehouse: 'East Depot',
    product: 'Laptop Pro 14',
    inStock: 10,
    reserved: 6,
    available: 4,
  },
  {
    id: 'ST-003',
    warehouse: 'Main Warehouse',
    product: 'Docking Station',
    inStock: 65,
    reserved: 12,
    available: 53,
  },
];

const MOCK_FULFILLMENT_ORDERS = [
  {
    id: 'ORD-001',
    orderId: 'Q-1042',
    customerName: 'Acme Corp',
    status: 'Split Pending',
    warehouses: 'Main + East Depot',
  },
  {
    id: 'ORD-002',
    orderId: 'Q-1030',
    customerName: 'Zenith Co',
    status: 'Backorder',
    warehouses: 'East Depot',
  },
];

export const Fulfillment = () => {
  const navigate = useNavigate();

  const handleOrderClick = (orderId) => {
    navigate(`/fulfillment/${orderId}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* 1. Top Navigation */}
      <DashboardNavbar />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* 2. Page Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Fulfillment and Stock (List)
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Live stock per warehouse, plus every order that still needs fulfilling
          </p>
        </div>

        {/* 3. Section 1 - Warehouse Stock Levels */}
        <section aria-label="Warehouse Stock Levels">
          <StockTable stockData={MOCK_STOCK_DATA} />
        </section>

        {/* 4. Section 2 - Orders Awaiting Fulfillment */}
        <section aria-label="Orders Awaiting Fulfillment" className="space-y-4">
          <FulfillmentOrdersTable
            orders={MOCK_FULFILLMENT_ORDERS}
            onOrderClick={handleOrderClick}
          />
          
          {/* 5. Information Message */}
          <FulfillmentNotice />
        </section>

      </main>
    </div>
  );
};

export default Fulfillment;
