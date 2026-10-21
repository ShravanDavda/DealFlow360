import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock3, CreditCard, Package, RotateCcw, Truck, FileText } from 'lucide-react';
import { DashboardNavbar } from '../components/dashboard/DashboardNavbar';
import { getApprovals } from '../services/approvalService';
import { getFulfillmentOrders } from '../services/fulfillmentService';
import { getInvoices, getSubscriptions } from '../services/billingService';
import { getCurrentUser } from '../services/authService';

const initialData = {
  approvals: [],
  fulfillment: [],
  invoices: [],
  subscriptions: [],
};

const countBy = (items, predicate) => items.filter(predicate).length;

const MetricCard = ({ title, value, icon: Icon, tone }) => (
  <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex items-center justify-between">
      <p className="text-sm font-medium text-slate-600">{title}</p>
      <Icon className={`h-5 w-5 ${tone}`} />
    </div>
    <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
  </article>
);

const Overview = ({ title, rows }) => (
  <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
    <h2 className="text-base font-semibold text-slate-900">{title}</h2>
    <dl className="mt-4 divide-y divide-slate-100">
      {rows.map(([label, value]) => (
        <div key={label} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
          <dt className="text-sm text-slate-600">{label}</dt>
          <dd className="text-sm font-semibold text-slate-900">{value}</dd>
        </div>
      ))}
    </dl>
  </section>
);

export const FinanceOperationsDashboard = () => {
  const [data, setData] = useState(initialData);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const isFinance = user?.role === 'finance';

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setErrorMessage('');

    getCurrentUser()
      .then((userRes) => {
        if (!isMounted) return;
        const currentUser = userRes?.data || null;
        setUser(currentUser);
        const isFinanceUser = currentUser?.role === 'finance';

        const promises = [
          getApprovals({ role: 'Finance', status: 'all' }),
          getInvoices(),
          getSubscriptions(),
        ];

        // Only authorized operations / admin roles may access fulfillment orders
        if (!isFinanceUser) {
          promises.push(getFulfillmentOrders());
        }

        return Promise.all(promises).then(([approvalData, invoices, subscriptions, fulfillment]) => {
          if (!isMounted) return;
          setData({
            approvals: approvalData?.approvals || [],
            fulfillment: fulfillment || [],
            invoices: invoices || [],
            subscriptions: subscriptions || [],
          });
        });
      })
      .catch((err) => {
        if (isMounted) {
          setErrorMessage(err?.response?.data?.message || err?.message || 'Could not load metrics from the server.');
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const pendingApprovals = countBy(data.approvals, (item) => item.status === 'Pending' && String(item.currentStep || '').toLowerCase() === 'finance');
  const fulfillmentPending = countBy(data.fulfillment, (item) => ['Pending Split', 'Split Pending'].includes(item.status));
  const backorders = countBy(data.fulfillment, (item) => String(item.status || '').toLowerCase().includes('backorder') || Number(item.remainingQuantity || 0) > 0);
  const unpaidInvoices = countBy(data.invoices, (item) => item.status === 'Unpaid');
  const overdueInvoices = countBy(data.invoices, (item) => item.status === 'Overdue');
  const paidInvoices = countBy(data.invoices, (item) => item.status === 'Paid');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <DashboardNavbar />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <header>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {isFinance ? 'Finance Dashboard' : 'Operations Dashboard'}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {isFinance
              ? 'Monitor finance approvals, invoice statuses, and billing operations.'
              : 'Monitor operations approvals, fulfillment readiness, and warehouse split progress.'}
          </p>
        </header>

        {errorMessage && (
          <div className="flex items-center gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-800">
            <AlertCircle className="h-5 w-5 shrink-0" />
            {errorMessage}
          </div>
        )}
        {isLoading && <p className="text-sm font-medium text-slate-500">Loading live metrics...</p>}

        {isFinance ? (
          <section aria-label="Finance key performance indicators" className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard title="Pending Finance Approvals" value={pendingApprovals} icon={Clock3} tone="text-amber-600" />
            <MetricCard title="Unpaid Invoices" value={unpaidInvoices} icon={CreditCard} tone="text-blue-600" />
            <MetricCard title="Overdue Invoices" value={overdueInvoices} icon={AlertCircle} tone="text-rose-600" />
            <MetricCard title="Active Subscriptions" value={data.subscriptions.length} icon={RotateCcw} tone="text-emerald-600" />
          </section>
        ) : (
          <section aria-label="Operations key performance indicators" className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard title="Pending Operations Approvals" value={pendingApprovals} icon={Clock3} tone="text-amber-600" />
            <MetricCard title="Orders Awaiting Fulfillment" value={fulfillmentPending} icon={Truck} tone="text-blue-600" />
            <MetricCard title="Backorders" value={backorders} icon={Package} tone="text-rose-600" />
            <MetricCard title="Billing Issues" value={unpaidInvoices + overdueInvoices} icon={CreditCard} tone="text-orange-600" />
          </section>
        )}

        {isFinance ? (
          <section className="grid grid-cols-1 gap-5 lg:grid-cols-2" aria-label="Finance operational overviews">
            <Overview
              title="Approval Overview"
              rows={[
                ['Pending Finance Approval', pendingApprovals],
                ['Approved', countBy(data.approvals, (item) => item.status === 'Approved')],
                ['Returned for Revision', countBy(data.approvals, (item) => item.status === 'Returned')],
              ]}
            />
            <Overview
              title="Billing & Invoicing Overview"
              rows={[
                ['Unpaid Invoices', unpaidInvoices],
                ['Paid Invoices', paidInvoices],
                ['Overdue Invoices', overdueInvoices],
                ['Active Subscriptions', data.subscriptions.length],
                ['Credit Notes', countBy(data.invoices, (item) => item.type === 'Credit Note')],
              ]}
            />
          </section>
        ) : (
          <section className="grid grid-cols-1 gap-5 lg:grid-cols-3" aria-label="Operations overviews">
            <Overview
              title="Approval Overview"
              rows={[
                ['Pending', pendingApprovals],
                ['Approved', countBy(data.approvals, (item) => item.status === 'Approved')],
                ['Returned', countBy(data.approvals, (item) => item.status === 'Returned')],
              ]}
            />
            <Overview
              title="Fulfillment Overview"
              rows={[
                ['Awaiting Fulfillment', countBy(data.fulfillment, (item) => ['Pending Split', 'Split Pending'].includes(item.status))],
                ['Partially Fulfilled', countBy(data.fulfillment, (item) => ['Partially Fulfilled', 'Partially Shipped'].includes(item.status))],
                ['Backordered', backorders],
                ['Fulfilled', countBy(data.fulfillment, (item) => item.status === 'Fulfilled')],
              ]}
            />
            <Overview
              title="Billing Overview"
              rows={[
                ['Pending Invoices', unpaidInvoices],
                ['Recurring Billing', data.subscriptions.length],
                ['Payment Issues', overdueInvoices],
                ['Credit Notes', countBy(data.invoices, (item) => item.type === 'Credit Note')],
              ]}
            />
          </section>
        )}

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          {isFinance
            ? 'Metrics are calculated from the current approval, invoice, and subscription records.'
            : 'Metrics are calculated from the current approval, fulfillment, invoice, and subscription records.'}
        </div>
      </main>
    </div>
  );
};

export default FinanceOperationsDashboard;
