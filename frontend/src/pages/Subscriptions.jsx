import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Plus, CheckCircle2 } from 'lucide-react';
import { DashboardNavbar } from '../components/dashboard/DashboardNavbar';
import { SubscriptionSummary } from '../components/subscriptions/SubscriptionSummary';
import { SubscriptionTable } from '../components/subscriptions/SubscriptionTable';
import { Button } from '../components/ui/Button';

// ============================================================================
// FRONTEND MOCK DATA & FUTURE BACKEND API CONTRACT
// ============================================================================
// API 1: GET /api/subscriptions/summary
// API 2: GET /api/subscriptions
// API 3: GET /api/subscriptions/:subscriptionId (Detail)
// API 4: POST /api/subscription-plans (Create Plan)
// ============================================================================
const MOCK_SUMMARY = [
  { label: 'Active', count: 18, status: 'active' },
  { label: 'Paused', count: 2, status: 'paused' },
  { label: 'Cancelled', count: 3, status: 'cancelled' },
];

const MOCK_SUBSCRIPTIONS = [
  {
    id: 'SUB-001',
    customerName: 'Acme Corp',
    planName: 'Care Plan 2yr',
    cycle: 'Monthly',
    nextBill: 'Sep 15',
    status: 'Active',
  },
  {
    id: 'SUB-002',
    customerName: 'Beta Industries',
    planName: 'Support SLA',
    cycle: 'Quarterly',
    nextBill: 'Nov 1',
    status: 'Active',
  },
  {
    id: 'SUB-003',
    customerName: 'Delta LLC',
    planName: 'Care Plan 1yr',
    cycle: 'Monthly',
    nextBill: '-',
    status: 'Paused',
  },
];

export const Subscriptions = () => {
  const navigate = useNavigate();
  const [feedbackMessage, setFeedbackMessage] = useState('');

  const handleRowClick = (subscriptionId) => {
    navigate(`/subscriptions/${subscriptionId}`);
  };

  const handleNewPlan = () => {
    setFeedbackMessage('New subscription plan creation selected.');
    setTimeout(() => setFeedbackMessage(''), 4500);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* 1. Top Navigation */}
      <DashboardNavbar />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* 2. Page Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Subscriptions (List)
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Every recurring plan across every customer, regardless of which order it came from
          </p>
        </div>

        {/* Feedback Alert */}
        {feedbackMessage && (
          <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span className="text-sm font-medium text-emerald-800">
              {feedbackMessage}
            </span>
          </div>
        )}

        {/* 3. Subscription Status Summary */}
        <section aria-label="Subscription Summary">
          <SubscriptionSummary summary={MOCK_SUMMARY} />
        </section>

        {/* 4. Subscriptions Table */}
        <section aria-label="Subscriptions Table">
          <SubscriptionTable
            subscriptions={MOCK_SUBSCRIPTIONS}
            onRowClick={handleRowClick}
          />
        </section>

        {/* 5. Informational Notice */}
        <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-800 font-medium">
            Click a subscription row to open its billing detail and proration history.
          </p>
        </div>

        {/* 6. Administrative Bottom Action */}
        <section aria-label="Subscription Actions" className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-start gap-3">
          <Button
            type="button"
            variant="primary"
            onClick={handleNewPlan}
            className="sm:!w-auto px-5 gap-1.5"
          >
            <Plus className="h-4 w-4" />
            <span>+ New Plan (Admin)</span>
          </Button>
        </section>

      </main>
    </div>
  );
};

export default Subscriptions;
