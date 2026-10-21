import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Plus, CheckCircle2 } from 'lucide-react';
import { DashboardNavbar } from '../components/dashboard/DashboardNavbar';
import { SubscriptionSummary } from '../components/subscriptions/SubscriptionSummary';
import { SubscriptionTable } from '../components/subscriptions/SubscriptionTable';
import { Button } from '../components/ui/Button';
import { getSubscriptions } from '../services/billingService';

export const Subscriptions = () => {
  const navigate = useNavigate();
  const [subscriptions, setSubscriptions] = useState([]);
  const [summary, setSummary] = useState([
    { label: 'Active', count: 0, status: 'active' },
    { label: 'Paused', count: 0, status: 'paused' },
    { label: 'Cancelled', count: 0, status: 'cancelled' },
  ]);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    getSubscriptions()
      .then((data) => {
        if (!isMounted || !data) return;
        const formatted = data.map((s) => ({
          id: s.id,
          customerName: s.customer,
          planName: s.plan,
          cycle: s.cycle,
          nextBill: s.nextBilling,
          status: s.status,
        }));
        setSubscriptions(formatted);

        const activeCount = formatted.filter((s) => s.status === 'Active').length;
        const cancelledCount = formatted.filter((s) => s.status === 'Cancelled').length;
        const pausedCount = formatted.filter((s) => s.status === 'Paused' || s.status === 'Modified').length;

        setSummary([
          { label: 'Active', count: activeCount, status: 'active' },
          { label: 'Paused / Mod', count: pausedCount, status: 'paused' },
          { label: 'Cancelled', count: cancelledCount, status: 'cancelled' },
        ]);
      })
      .catch((err) => console.error('Failed to load subscriptions:', err))
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleRowClick = (subscriptionId) => {
    navigate(`/subscriptions/${subscriptionId}`);
  };

  const handleNewPlan = () => {
    setFeedbackMessage('New recurring plan configuration opened.');
    setTimeout(() => setFeedbackMessage(''), 4500);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <DashboardNavbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Subscriptions & Recurring Plans
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Every recurring plan across every customer, reconciled alongside one-time hardware orders.
          </p>
        </div>

        {feedbackMessage && (
          <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span className="text-sm font-medium text-emerald-800">
              {feedbackMessage}
            </span>
          </div>
        )}

        <section aria-label="Subscription Summary">
          <SubscriptionSummary summary={summary} />
        </section>

        <section aria-label="Subscriptions Table">
          {isLoading && subscriptions.length === 0 ? (
            <div className="py-12 text-center text-slate-500 font-medium">
              Loading active subscriptions from database...
            </div>
          ) : (
            <SubscriptionTable
              subscriptions={subscriptions}
              onRowClick={handleRowClick}
            />
          )}
        </section>

        <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-800 font-medium">
            Click a subscription row to view its separate one-time and recurring billing schedules, proration rules, and cancellation controls.
          </p>
        </div>

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
