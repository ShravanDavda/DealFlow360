import React, { useEffect, useState } from 'react';
import { AlertTriangle, BarChart3, CheckCircle2, Clock3, FileText, RefreshCw, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DashboardNavbar } from '../components/dashboard/DashboardNavbar';
import { Button } from '../components/ui/Button';
import { getDealHealth } from '../services/dealHealthService';
import { getSalesManagerDashboard } from '../services/salesManagerDashboardService';

const EMPTY_DATA = {
  metrics: { pendingApprovals: 0, teamOpenQuotations: 0, atRiskDeals: 0, teamApprovedQuotations: 0 },
  pipeline: { Draft: 0, 'Pending Approval': 0, Approved: 0, 'Under Negotiation': 0, Confirmed: 0 },
  approvalActivity: { pending: 0, approved: 0, returned: 0 },
  health: { stalledDeals: 0, discountAnomalies: 0, deliverySlippage: 0 },
  recentQuotations: [],
  teamActivity: { quotesCreated: 0, quotesApproved: 0, quotesInNegotiation: 0, topSalesRep: '--' },
};

const statusLabel = (status) => status === 'Under Negotiation' ? 'Negotiation' : status;

export const SalesManagerDashboard = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(EMPTY_DATA);
  const [health, setHealth] = useState({ stalledDeals: 0, discountAnomalies: 0, deliverySlippage: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = async () => {
    setIsLoading(true);
    try {
      const [dashboard, healthData] = await Promise.all([getSalesManagerDashboard(), getDealHealth()]);
      setData(dashboard || EMPTY_DATA);
      setHealth(healthData?.summary || EMPTY_DATA.health);
      setError('');
    } catch (requestError) {
      setError(requestError.message || 'Unable to load the Sales Manager dashboard.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const metrics = data.metrics || EMPTY_DATA.metrics;
  const cards = [
    ['Pending Approvals', metrics.pendingApprovals, 'Requests at the Sales Manager step', Clock3, 'text-amber-600'],
    ['Team Open Quotations', metrics.teamOpenQuotations, 'Active team pipeline', FileText, 'text-blue-600'],
    ['At-Risk Deals', metrics.atRiskDeals, 'High-risk team quotations', AlertTriangle, 'text-rose-600'],
    ['Team Approved Quotations', metrics.teamApprovedQuotations, 'Approved or confirmed quotes', CheckCircle2, 'text-emerald-600'],
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <DashboardNavbar />
      <main className="flex-1 mx-auto w-full max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div><h1 className="text-2xl font-bold tracking-tight text-slate-900">Sales Manager Dashboard</h1><p className="mt-1 text-sm text-slate-600">Monitor team quotations, approvals, and sales performance.</p></div>
          <Button type="button" variant="outline" onClick={loadDashboard} className="sm:!w-auto px-3 gap-2"><RefreshCw className={isLoading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} /><span>Refresh</span></Button>
        </header>
        {error && <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700" role="alert">{error}</div>}

        <section aria-label="Sales Manager metrics" className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([title, value, description, Icon, color]) => <button type="button" key={title} onClick={() => navigate(title === 'Pending Approvals' ? '/approvals' : '/quotations')} className="rounded-lg border border-slate-200 bg-white p-5 text-left shadow-sm hover:shadow-md"><div className="flex items-center justify-between"><span className="text-sm font-medium text-slate-600">{title}</span><Icon className={`h-5 w-5 ${color}`} /></div><p className="mt-4 text-3xl font-bold text-slate-900">{value}</p><p className="mt-1 text-xs text-slate-500">{description}</p></button>)}</section>

        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm" aria-label="Approval overview"><div className="flex items-center justify-between"><div><h2 className="text-lg font-semibold text-slate-900">Approval Overview</h2><p className="mt-1 text-sm text-slate-500">Team quotation approval activity.</p></div><Button type="button" onClick={() => navigate('/approvals')} className="hidden sm:!w-auto px-4 sm:inline-flex">Review Approval Queue</Button></div><div className="mt-5 grid grid-cols-3 gap-3">{Object.entries(data.approvalActivity || {}).map(([label, count]) => <div key={label} className="rounded-md bg-slate-50 p-4"><p className="text-xs font-medium capitalize text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold text-slate-900">{count}</p></div>)}</div></section>

        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm" aria-label="Team sales pipeline"><div className="flex items-center justify-between"><div><h2 className="text-lg font-semibold text-slate-900">Team Sales Pipeline</h2><p className="mt-1 text-sm text-slate-500">All team quotations by current status.</p></div><Button type="button" variant="outline" onClick={() => navigate('/quotations')} className="hidden sm:!w-auto px-4 sm:inline-flex">View Quotations</Button></div><div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-5">{Object.entries(data.pipeline || {}).map(([status, count]) => <button type="button" key={status} onClick={() => navigate('/quotations')} className="rounded-md bg-slate-50 p-4 text-left hover:bg-slate-100"><p className="text-xs font-medium text-slate-500">{statusLabel(status)}</p><p className="mt-2 text-2xl font-bold text-slate-900">{count}</p></button>)}</div></section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3"><section className="rounded-lg border border-slate-200 bg-white shadow-sm lg:col-span-2" aria-label="Recent team quotations"><div className="border-b border-slate-100 px-6 py-5"><h2 className="text-lg font-semibold text-slate-900">Recent Team Quotations</h2><p className="mt-1 text-sm text-slate-500">Recent activity across the sales team.</p></div><div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-slate-600"><tr><th className="px-6 py-3 font-semibold">Quotation</th><th className="px-3 py-3 font-semibold">Sales Rep</th><th className="px-3 py-3 font-semibold">Customer</th><th className="px-3 py-3 font-semibold">Amount</th><th className="px-3 py-3 font-semibold">Status</th><th className="px-6 py-3 font-semibold">Risk</th></tr></thead><tbody className="divide-y divide-slate-100">{data.recentQuotations?.map((quote) => <tr key={quote.id} onClick={() => navigate(`/quotations/${quote.quoteCode}`)} className="cursor-pointer hover:bg-slate-50"><td className="px-6 py-4 font-mono text-slate-700">{quote.quoteCode}</td><td className="px-3 py-4 text-slate-700">{quote.salesRep}</td><td className="px-3 py-4 font-medium text-slate-900">{quote.customerName}</td><td className="px-3 py-4 text-slate-700">${quote.amount.toLocaleString()}</td><td className="px-3 py-4 text-slate-700">{statusLabel(quote.status)}</td><td className={`px-6 py-4 font-semibold ${quote.risk === 'HIGH' ? 'text-rose-700' : 'text-slate-600'}`}>{quote.risk || 'LOW'}</td></tr>)}{!data.recentQuotations?.length && <tr><td colSpan="6" className="px-6 py-10 text-center text-slate-500">No team quotations found.</td></tr>}</tbody></table></div></section>

          <section className="space-y-6" aria-label="Team activity and quick actions"><div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-lg font-semibold text-slate-900">Deal Health Summary</h2><dl className="mt-5 space-y-4">{Object.entries(health).map(([label, value]) => <div key={label} className="flex justify-between border-b border-slate-100 pb-3 last:border-0"><dt className="text-sm capitalize text-slate-600">{label.replace(/([A-Z])/g, ' $1')}</dt><dd className="font-semibold text-rose-700">{value}</dd></div>)}</dl></div><div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-lg font-semibold text-slate-900">Team Sales Activity</h2><dl className="mt-5 space-y-4"><div className="flex justify-between"><dt className="text-sm text-slate-600">Quotes created</dt><dd className="font-semibold text-slate-900">{data.teamActivity?.quotesCreated}</dd></div><div className="flex justify-between"><dt className="text-sm text-slate-600">Quotes approved</dt><dd className="font-semibold text-slate-900">{data.teamActivity?.quotesApproved}</dd></div><div className="flex justify-between"><dt className="text-sm text-slate-600">Top Sales Rep</dt><dd className="font-semibold text-slate-900">{data.teamActivity?.topSalesRep}</dd></div></dl></div></section></div>

        <section aria-label="Quick actions" className="border-t border-slate-200 pt-5"><div className="flex flex-wrap gap-3"><Button type="button" onClick={() => navigate('/approvals')} className="gap-2"><ShieldAlert className="h-4 w-4" />Review Approval Queue</Button><Button type="button" variant="outline" onClick={() => navigate('/quotations')} className="gap-2"><FileText className="h-4 w-4" />View Quotations</Button><Button type="button" variant="outline" onClick={() => navigate('/reports')} className="gap-2"><BarChart3 className="h-4 w-4" />View Reports</Button></div></section>
      </main>
    </div>
  );
};

export default SalesManagerDashboard;
