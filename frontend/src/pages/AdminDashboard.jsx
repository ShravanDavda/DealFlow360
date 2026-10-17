import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  CheckCircle2,
  FileText,
  ShieldCheck,
  UserCog,
  Users,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DashboardNavbar } from '../components/dashboard/DashboardNavbar';
import { Button } from '../components/ui/Button';
import { getApprovals } from '../services/approvalService';
import { getDashboardSummary, getReports } from '../services/reportService';

const DEFAULT_SUMMARY = {
  pendingApprovals: 0,
  openQuotations: 0,
  atRiskDeals: 0,
};

export const AdminDashboard = () => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(DEFAULT_SUMMARY);
  const [approvalSummary, setApprovalSummary] = useState([]);
  const [reportMetrics, setReportMetrics] = useState(null);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      getDashboardSummary(),
      getApprovals(),
      getReports(),
    ])
      .then(([dashboardData, approvalsData, reportsData]) => {
        if (!isMounted) return;
        setSummary(dashboardData || DEFAULT_SUMMARY);
        setApprovalSummary(approvalsData?.summary || []);
        setReportMetrics(reportsData?.metrics || null);
      })
      .catch(() => {
        if (isMounted) setLoadError('Some admin metrics could not be loaded.');
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const getApprovalCount = (status) => (
    approvalSummary.find((item) => item.status === status)?.count || 0
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <DashboardNavbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-md bg-white text-slate-900 shadow-sm">
                <UserCog className="h-6 w-6" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Admin Dashboard</h1>
            </div>
            <p className="mt-1 text-sm text-slate-600">
              Platform-wide visibility across sales and approvals.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate('/reports')}
            className="sm:!w-auto px-4 gap-2"
          >
            <BarChart3 className="h-4 w-4" />
            <span>Open reporting</span>
          </Button>
        </header>

        {loadError && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800" role="status">
            {loadError}
          </div>
        )}

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2" aria-label="Quotation and approval overview">
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Quotation and order overview</h2>
                <p className="mt-1 text-sm text-slate-500">Monitor the platform pipeline.</p>
              </div>
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="rounded-md bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Open quotations</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{summary.openQuotations}</p>
              </div>
              <div className="rounded-md bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">At-risk pipeline</p>
                <p className="mt-2 text-2xl font-bold text-rose-700">{summary.atRiskDeals}</p>
              </div>
            </div>
            <Button type="button" variant="outline" onClick={() => navigate('/quotations')} className="mt-5 sm:!w-auto px-4">
              View quotations and orders
            </Button>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Approval overview</h2>
                <p className="mt-1 text-sm text-slate-500">Governance workload across the team.</p>
              </div>
              <CheckCircle2 className="h-5 w-5 text-amber-600" />
            </div>
            <div className="mt-6 grid grid-cols-3 gap-3">
              {[
                ['Pending', 'pending'],
                ['Approved', 'approved'],
                ['Returned', 'returned'],
              ].map(([label, status]) => (
                <div key={status} className="rounded-md bg-slate-50 p-3">
                  <p className="text-xs font-medium text-slate-500">{label}</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{getApprovalCount(status)}</p>
                </div>
              ))}
            </div>
            <Button type="button" variant="outline" onClick={() => navigate('/approvals')} className="mt-5 sm:!w-auto px-4">
              Review approvals
            </Button>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6" aria-label="Sales performance">
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Sales performance</h2>
                <p className="mt-1 text-sm text-slate-500">Team-level performance signals from reporting.</p>
              </div>
              <Users className="h-5 w-5 text-emerald-600" />
            </div>
            <dl className="mt-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <dt className="text-sm text-slate-600">Quotes created</dt>
                <dd className="font-semibold text-slate-900">{reportMetrics?.quotesCreated ?? '--'}</dd>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <dt className="text-sm text-slate-600">Average approval time</dt>
                <dd className="font-semibold text-slate-900">{reportMetrics?.avgApprovalTime ?? '--'}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-sm text-slate-600">Top upsell product</dt>
                <dd className="font-semibold text-slate-900">{reportMetrics?.topUpsellProduct ?? '--'}</dd>
              </div>
            </dl>
            <Button type="button" variant="outline" onClick={() => navigate('/reports')} className="mt-5 sm:!w-auto px-4">
              View sales reports
            </Button>
          </div>

        </section>

        <section aria-label="Reporting entry points" className="border-t border-slate-200 pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Reporting entry points</h2>
              <p className="mt-1 text-sm text-slate-500">Open detailed analysis and governance views.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button type="button" variant="secondary" onClick={() => navigate('/reports')} className="sm:!w-auto px-4 gap-2">
                <BarChart3 className="h-4 w-4" />
                <span>Reports</span>
              </Button>
              <Button type="button" variant="secondary" onClick={() => navigate('/settings/discount-approval')} className="sm:!w-auto px-4 gap-2">
                <ShieldCheck className="h-4 w-4" />
                <span>Governance settings</span>
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default AdminDashboard;
