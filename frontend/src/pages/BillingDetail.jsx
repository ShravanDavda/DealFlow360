import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, AlertTriangle, ShieldAlert } from 'lucide-react';
import { DashboardNavbar } from '../components/dashboard/DashboardNavbar';
import { BillingOneTimeTable } from '../components/subscriptions/BillingOneTimeTable';
import { BillingRecurringTable } from '../components/subscriptions/BillingRecurringTable';
import { Button } from '../components/ui/Button';
import {
  getSubscription,
  modifySubscription,
  cancelSubscription
} from '../services/billingService';

export const BillingDetail = () => {
  const { subscriptionId } = useParams();
  const [detail, setDetail] = useState(null);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchDetail = async () => {
    try {
      setIsLoading(true);
      const data = await getSubscription(subscriptionId);
      if (data) setDetail(data);
    } catch (err) {
      console.error('Failed to load subscription details:', err);
      setErrorMessage('Could not load subscription details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [subscriptionId]);

  const handleModify = async () => {
    const currentAmount = Number(detail?.recurringLines?.[0]?.amount || 0);
    const input = window.prompt('Enter new recurring amount ($):', currentAmount ? currentAmount.toString() : '50');
    if (input === null) return;
    const newAmount = Number(input);
    if (isNaN(newAmount) || newAmount <= 0) {
      setErrorMessage('Please provide a valid recurring amount greater than 0.');
      setTimeout(() => setErrorMessage(''), 4500);
      return;
    }
    try {
      setIsProcessing(true);
      const updated = await modifySubscription(subscriptionId, {
        newAmount
      });
      if (updated) setDetail(updated);
      setFeedbackMessage(`Subscription modification saved (New recurring amount: $${newAmount.toFixed(2)}).`);
      setTimeout(() => setFeedbackMessage(''), 4500);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to modify subscription.');
      setTimeout(() => setErrorMessage(''), 4500);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = async () => {
    try {
      setIsProcessing(true);
      const updated = await cancelSubscription(subscriptionId, {
        reason: 'Customer initiated cancellation'
      });
      if (updated) setDetail(updated);
      setFeedbackMessage('Subscription cancellation recorded.');
      setTimeout(() => setFeedbackMessage(''), 4500);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to cancel subscription.');
      setTimeout(() => setErrorMessage(''), 4500);
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading && !detail) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <DashboardNavbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-16 text-center text-slate-600 font-medium">
          Loading subscription and billing lines...
        </main>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <DashboardNavbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-16 flex flex-col items-center justify-center text-center">
          <div className="h-12 w-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-4">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">
            Subscription not found
          </h1>
          <p className="text-sm text-slate-600 mb-6 max-w-md">
            The subscription with ID &quot;{subscriptionId}&quot; could not be located in the current records.
          </p>
          <Link
            to="/subscriptions"
            className="inline-flex items-center justify-center rounded-md font-medium text-sm transition-colors bg-slate-900 text-white hover:bg-slate-800 h-10 px-5 shadow-sm"
          >
            Back to Subscriptions
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <DashboardNavbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        <div>
          <Link
            to="/subscriptions"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Subscriptions</span>
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Billing Detail: {detail.customerName} - {detail.planName}
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Hybrid reconciliation: one-time hardware lines and recurring subscription lines on one contract.
            </p>
          </div>

          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
            detail.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
            detail.status === 'Modified' ? 'bg-amber-50 text-amber-800 border-amber-200' :
            'bg-rose-50 text-rose-700 border-rose-200'
          }`}>
            Status: {detail.status}
          </span>
        </div>

        {feedbackMessage && (
          <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-3 animate-in fade-in">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span className="text-sm font-semibold text-emerald-900">
              {feedbackMessage}
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

        <section aria-label="One-Time Lines">
          <BillingOneTimeTable lines={detail.oneTimeLines || []} />
        </section>

        <section aria-label="Recurring Lines">
          <BillingRecurringTable lines={detail.recurringLines || []} />
        </section>

        <section aria-label="Subscription Actions" className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            disabled={isProcessing || !detail?.recurringLines?.[0]?.amount}
            onClick={handleModify}
            className="sm:!w-auto px-5"
          >
            Modify Subscription (Prorate)
          </Button>

          <button
            type="button"
            disabled={isProcessing}
            onClick={handleCancel}
            className="inline-flex items-center justify-center rounded-md font-medium text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 bg-rose-600 text-white hover:bg-rose-700 h-10 px-5 shadow-sm disabled:opacity-60"
          >
            Cancel Subscription (Credit Note)
          </button>
        </section>

      </main>
    </div>
  );
};

export default BillingDetail;
