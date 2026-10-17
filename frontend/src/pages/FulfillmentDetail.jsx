import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, ShieldAlert } from 'lucide-react';
import { DashboardNavbar } from '../components/dashboard/DashboardNavbar';
import { WarehouseSplitTable } from '../components/fulfillment/WarehouseSplitTable';
import { FulfillmentDetailNotice } from '../components/fulfillment/FulfillmentDetailNotice';
import { Button } from '../components/ui/Button';
import {
  getFulfillmentDetail,
  acceptSplit,
  manualOverride,
  consolidateBackorder
} from '../services/fulfillmentService';

export const FulfillmentDetail = () => {
  const { orderId } = useParams();

  const [orderDetail, setOrderDetail] = useState(null);
  const [actionMessage, setActionMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchDetail = async () => {
    try {
      setIsLoading(true);
      const data = await getFulfillmentDetail(orderId);
      if (data) setOrderDetail(data);
    } catch (err) {
      console.error('Failed to load fulfillment detail:', err);
      setErrorMessage('Could not load fulfillment details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [orderId]);

  const handleAcceptSplit = async () => {
    try {
      setIsProcessing(true);
      const updated = await acceptSplit(orderId);
      if (updated) setOrderDetail(updated);
      setActionMessage('Suggested multi-warehouse split accepted! Pick lists generated.');
      setTimeout(() => setActionMessage(''), 4500);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to accept warehouse split.');
      setTimeout(() => setErrorMessage(''), 4500);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualOverride = async () => {
    try {
      setIsProcessing(true);
      const currentSplits = orderDetail?.warehouseSplits || [];
      const modifiedSplits = currentSplits.map((s, idx) => ({
        ...s,
        quantityFulfilled: idx === 0 ? s.quantityFulfilled + 2 : Math.max(1, s.quantityFulfilled - 2)
      }));

      const updated = await manualOverride(orderId, { splits: modifiedSplits });
      if (updated) setOrderDetail(updated);
      setActionMessage('Manual warehouse allocation saved successfully.');
      setTimeout(() => setActionMessage(''), 4500);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to apply manual override.');
      setTimeout(() => setErrorMessage(''), 4500);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConsolidate = async () => {
    try {
      setIsProcessing(true);
      const updated = await consolidateBackorder(orderId);
      if (updated) setOrderDetail(updated);
      setActionMessage('Backorder stock arrived! Shipments consolidated into single delivery.');
      setTimeout(() => setActionMessage(''), 4500);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to consolidate backorder.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading && !orderDetail) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <DashboardNavbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-16 text-center text-slate-600 font-medium">
          Calculating recommended warehouse fulfillment split...
        </main>
      </div>
    );
  }

  const splits = orderDetail?.warehouseSplits || [];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <DashboardNavbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        <div>
          <Link
            to="/fulfillment"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Fulfillment</span>
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Fulfillment Detail: {orderDetail?.orderId} ({orderDetail?.customerName})
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Live stock split to minimize shipments and fulfill order requirements.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-800 border border-slate-200">
              Status: {orderDetail?.status || 'Pending Split'}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              Shipments: {orderDetail?.totalShipments || splits.length} (Est Cost: ${orderDetail?.totalCost || 0})
            </span>
          </div>
        </div>

        {actionMessage && (
          <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-3 animate-in fade-in">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span className="text-sm font-semibold text-emerald-900">
              {actionMessage}
            </span>
          </div>
        )}

        {errorMessage && (
          <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 flex items-center gap-3 animate-in fade-in">
            <ShieldAlert className="h-5 w-5 text-rose-600 shrink-0" />
            <span className="text-sm font-semibold text-rose-900">
              {errorMessage}
            </span>
          </div>
        )}

        <section aria-label="Warehouse Split Table">
          <WarehouseSplitTable warehouseSplits={splits} />
        </section>

        <section aria-label="Consolidation Notice">
          <FulfillmentDetailNotice />
        </section>

        <section aria-label="Fulfillment Actions" className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={isProcessing}
            onClick={handleConsolidate}
            className="sm:!w-auto px-4 border-slate-300 text-slate-700 hover:bg-slate-100"
          >
            Consolidate Remaining Backorder
          </Button>

          <Button
            type="button"
            variant="secondary"
            disabled={isProcessing}
            onClick={handleManualOverride}
            className="sm:!w-auto px-5"
          >
            Manual Override
          </Button>

          <Button
            type="button"
            variant="primary"
            disabled={isProcessing}
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
