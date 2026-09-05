import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { DashboardNavbar } from '../components/dashboard/DashboardNavbar';
import { WarehouseSplitTable } from '../components/fulfillment/WarehouseSplitTable';
import { FulfillmentDetailNotice } from '../components/fulfillment/FulfillmentDetailNotice';
import { Button } from '../components/ui/Button';

// ============================================================================
// FRONTEND MOCK DATA & FUTURE BACKEND API CONTRACT
// ============================================================================
// Endpoint: GET /api/fulfillment/orders/:orderId
// Accept Split: POST /api/fulfillment/orders/:orderId/accept-split
// Manual Override: POST /api/fulfillment/orders/:orderId/manual-override
// ============================================================================
const MOCK_ORDERS_DETAIL = {
  'Q-1042': {
    orderId: 'Q-1042',
    customerName: 'Acme Corp',
    warehouseSplits: [
      {
        id: 'SPLIT-001',
        warehouse: 'Main Warehouse',
        quantityFulfilled: 18,
        estimatedShipments: 1,
        cost: 42,
      },
      {
        id: 'SPLIT-002',
        warehouse: 'East Depot',
        quantityFulfilled: 6,
        estimatedShipments: 1,
        cost: 29,
      },
    ],
  },
  'Q-1030': {
    orderId: 'Q-1030',
    customerName: 'Zenith Co',
    warehouseSplits: [
      {
        id: 'SPLIT-003',
        warehouse: 'East Depot',
        quantityFulfilled: 6,
        estimatedShipments: 1,
        cost: 29,
      },
    ],
  },
};

export const FulfillmentDetail = () => {
  const { orderId = 'Q-1042' } = useParams();

  // Look up order detail dynamically based on URL parameter
  const orderDetail = MOCK_ORDERS_DETAIL[orderId] || {
    orderId: orderId,
    customerName: 'Acme Corp',
    warehouseSplits: [
      {
        id: 'SPLIT-001',
        warehouse: 'Main Warehouse',
        quantityFulfilled: 18,
        estimatedShipments: 1,
        cost: 42,
      },
      {
        id: 'SPLIT-002',
        warehouse: 'East Depot',
        quantityFulfilled: 6,
        estimatedShipments: 1,
        cost: 29,
      },
    ],
  };

  const [actionMessage, setActionMessage] = useState('');

  const handleAcceptSplit = () => {
    setActionMessage('Suggested warehouse split accepted.');
    setTimeout(() => setActionMessage(''), 4500);
  };

  const handleManualOverride = () => {
    setActionMessage('Manual override selected.');
    setTimeout(() => setActionMessage(''), 4500);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* 1. Top Navigation */}
      <DashboardNavbar />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Navigation Breadcrumb / Back Link */}
        <div>
          <Link
            to="/fulfillment"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Fulfillment</span>
          </Link>
        </div>

        {/* 2. Page Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Fulfillment Detail: {orderDetail.orderId} ({orderDetail.customerName})
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Opened by clicking an order row on the Fulfillment list
          </p>
        </div>

        {/* Action Feedback Banner */}
        {actionMessage && (
          <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span className="text-sm font-medium text-emerald-800">
              {actionMessage}
            </span>
          </div>
        )}

        {/* 3. Warehouse Split Table */}
        <section aria-label="Warehouse Split Table">
          <WarehouseSplitTable warehouseSplits={orderDetail.warehouseSplits} />
        </section>

        {/* 4. Automated Guidance Notice */}
        <section aria-label="Consolidation Notice">
          <FulfillmentDetailNotice />
        </section>

        {/* 5. Bottom Actions */}
        <section aria-label="Fulfillment Actions" className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={handleManualOverride}
            className="sm:!w-auto px-5"
          >
            Manual Override
          </Button>

          <Button
            type="button"
            variant="primary"
            onClick={handleAcceptSplit}
            className="sm:!w-auto px-5"
          >
            Accept Suggested Split
          </Button>
        </section>

      </main>
    </div>
  );
};

export default FulfillmentDetail;
