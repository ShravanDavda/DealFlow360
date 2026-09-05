import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, AlertTriangle } from 'lucide-react';
import { DashboardNavbar } from '../components/dashboard/DashboardNavbar';
import { BillingOneTimeTable } from '../components/subscriptions/BillingOneTimeTable';
import { BillingRecurringTable } from '../components/subscriptions/BillingRecurringTable';
import { Button } from '../components/ui/Button';

// ============================================================================
// FRONTEND MOCK DATA & FUTURE BACKEND API CONTRACT
// ============================================================================
// API 1: GET /api/subscriptions/:subscriptionId/billing
// API 2: PATCH /api/subscriptions/:subscriptionId (Modify)
// API 3: POST /api/subscriptions/:subscriptionId/cancel (Cancel)
// API 4: GET /api/subscriptions/:subscriptionId/proration-history
// ============================================================================
const MOCK_BILLING_DETAILS = {
  'SUB-001': {
    subscriptionId: 'SUB-001',
    customerId: 'CUS-001',
    customerName: 'Acme Corp',
    planName: 'Care Plan 2yr',
    oneTimeLines: [
      {
        id: 'LINE-001',
        product: 'Laptop Pro 14',
        quantity: 2,
        amount: 2280,
      },
      {
        id: 'LINE-002',
        product: 'Onsite Setup',
        quantity: 1,
        amount: 450,
      },
    ],
    recurringLines: [
      {
        id: 'REC-001',
        plan: 'Care Plan 2yr',
        cycle: 'Monthly',
        nextBillDate: 'Sep 15',
        amount: 46,
      },
      {
        id: 'REC-002',
        plan: 'Support SLA',
        cycle: 'Quarterly',
        nextBillDate: 'Nov 1',
        amount: 300,
      },
    ],
  },
  'SUB-002': {
    subscriptionId: 'SUB-002',
    customerId: 'CUS-002',
    customerName: 'Beta Industries',
    planName: 'Support SLA',
    oneTimeLines: [],
    recurringLines: [
      {
        id: 'REC-003',
        plan: 'Support SLA',
        cycle: 'Quarterly',
        nextBillDate: 'Nov 1',
        amount: 300,
      },
    ],
  },
  'SUB-003': {
    subscriptionId: 'SUB-003',
    customerId: 'CUS-003',
    customerName: 'Delta LLC',
    planName: 'Care Plan 1yr',
    oneTimeLines: [],
    recurringLines: [
      {
        id: 'REC-004',
        plan: 'Care Plan 1yr',
        cycle: 'Monthly',
        nextBillDate: '-',
        amount: 0,
      },
    ],
  },
};

export const BillingDetail = () => {
  const { subscriptionId } = useParams();
  const [feedbackMessage, setFeedbackMessage] = useState('');

  const detail = MOCK_BILLING_DETAILS[subscriptionId];

  const handleModify = () => {
    setFeedbackMessage('Subscription modification selected.');
    setTimeout(() => setFeedbackMessage(''), 4500);
  };

  const handleCancel = () => {
    setFeedbackMessage('Subscription cancellation selected.');
    setTimeout(() => setFeedbackMessage(''), 4500);
  };

  // Not Found State
  if (!detail) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <DashboardNavbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-16 flex flex-col items-center justify-center text-center">
          <div className="h-12 w-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-4">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">
            Subscription not found.
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
      {/* 1. Top Navigation */}
      <DashboardNavbar />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Navigation Breadcrumb / Back Link */}
        <div>
          <Link
            to="/subscriptions"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Subscriptions</span>
          </Link>
        </div>

        {/* 2. Page Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Billing Detail: {detail.customerName} - {detail.planName}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Opened by clicking a row on the Subscriptions list
          </p>
        </div>

        {/* Action Confirmation Banner */}
        {feedbackMessage && (
          <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span className="text-sm font-medium text-emerald-800">
              {feedbackMessage}
            </span>
          </div>
        )}

        {/* 3. Section 1 - One-Time Lines */}
        <section aria-label="One-Time Lines">
          <BillingOneTimeTable lines={detail.oneTimeLines} />
        </section>

        {/* 4. Section 2 - Recurring Lines */}
        <section aria-label="Recurring Lines">
          <BillingRecurringTable lines={detail.recurringLines} />
        </section>

        {/* 5. Bottom Actions */}
        <section aria-label="Subscription Actions" className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={handleModify}
            className="sm:!w-auto px-5"
          >
            Modify Subscription
          </Button>

          <button
            type="button"
            onClick={handleCancel}
            className="inline-flex items-center justify-center rounded-md font-medium text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 bg-rose-600 text-white hover:bg-rose-700 h-10 px-5 shadow-sm"
          >
            Cancel Subscription
          </button>
        </section>

      </main>
    </div>
  );
};

export default BillingDetail;
