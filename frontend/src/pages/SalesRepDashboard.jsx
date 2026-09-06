import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, FileText, Plus, RefreshCw, ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DashboardNavbar } from '../components/dashboard/DashboardNavbar';
import { Button } from '../components/ui/Button';
import { getSalesRepDashboard } from '../services/salesRepDashboardService';

const EMPTY_DATA = {
  user: { name: '' },
  metrics: { openQuotations: 0, pendingApprovals: 0, approvedQuotations: 0, atRiskQuotations: 0, quotesCreated: 0, quotesInNegotiation: 0 },
  pipeline: { Draft: 0, 'Pending Approval': 0, Approved: 0, 'Under Negotiation': 0, Confirmed: 0 },
  recentQuotations: [],
  fulfillment: [],
};

const statusLabel = (status) => status === 'Under Negotiation' ? 'Negotiation' : status;

export const SalesRepDashboard = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(EMPTY_DATA);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = async () => {
    setIsLoading(true);
    try {
      setData((await getSalesRepDashboard()) || EMPTY_DATA);
      setError('');
    } catch (requestError) {
      setError(requestError.message || 'Unable to load your sales dashboard.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const metrics = data.metrics || EMPTY_DATA.metrics;
  const pipeline = data.pipeline || EMPTY_DATA.pipeline;
  const cards = [
    ['My Open Quotations', metrics.openQuotations, 'Active deals in your pipeline', FileText, 'text-blue-600'],
    ['Pending Approval', metrics.pendingApprovals, 'Awaiting manager or finance review', Clock3, 'text-amber-600'],
    ['Approved Quotations', metrics.approvedQuotations, 'Approved or confirmed quotes', CheckCircle2, 'text-emerald-600'],
    ['At-Risk Quotations', metrics.atRiskQuotations, 'High-risk quotes requiring attention', AlertTriangle, 'text-rose-600'],
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <DashboardNavbar />
      <main className="flex-1 mx-auto w-full max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Sales Representative Dashboard</h1>
            <p className="mt-1 text-sm text-slate-600">Welcome, {data.user?.name || 'Sales Representative'}. Your sales workspace and quotation activity.</p>
          </div>
          <Button type="button" variant="outline" onClick={loadDashboard} className="sm:!w-auto px-3 gap-2"><RefreshCw className={isLoading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} /><span>Refresh</span></Button>
        </header>

        {error && <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700" role="alert">{error}</div>}

        <section aria-label="My quotation metrics" className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map(([title, value, description, Icon, color]) => <button type="button" key={title} onClick={() => navigate('/quotations')} className="rounded-lg border border-slate-200 bg-white p-5 text-left shadow-sm transition-shadow hover:shadow-md"><div className="flex items-center justify-between"><span className="text-sm font-medium text-slate-600">{title}</span><Icon className={`h-5 w-5 ${color}`} /></div><p className="mt-4 text-3xl font-bold text-slate-900">{value ?? 0}</p><p className="mt-1 text-xs text-slate-500">{description}</p></button>)}
        </section>

        <section aria-label="My sales pipeline" className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between"><div><h2 className="text-lg font-semibold text-slate-900">My Sales Pipeline</h2><p className="mt-1 text-sm text-slate-500">Your quotations by current status.</p></div><Button type="button" variant="outline" onClick={() => navigate('/pipeline')} className="hidden sm:!w-auto px-3 sm:inline-flex">View Pipeline</Button></div>
          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-5">{Object.entries(pipeline).map(([status, count]) => <button type="button" key={status} onClick={() => navigate('/quotations')} className="rounded-md bg-slate-50 p-4 text-left hover:bg-slate-100"><p className="text-xs font-medium text-slate-500">{statusLabel(status)}</p><p className="mt-2 text-2xl font-bold text-slate-900">{count}</p></button>)}</div>
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <section aria-label="Recent quotations" className="rounded-lg border border-slate-200 bg-white shadow-sm lg:col-span-2"><div className="flex items-center justify-between border-b border-slate-100 px-6 py-5"><div><h2 className="text-lg font-semibold text-slate-900">Recent Quotations</h2><p className="mt-1 text-sm text-slate-500">Your latest quotation activity.</p></div><FileText className="h-5 w-5 text-blue-600" /></div><div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-slate-600"><tr><th className="px-6 py-3 font-semibold">Quotation</th><th className="px-3 py-3 font-semibold">Customer</th><th className="px-3 py-3 font-semibold">Amount</th><th className="px-3 py-3 font-semibold">Status</th><th className="px-6 py-3 font-semibold">Risk</th></tr></thead><tbody className="divide-y divide-slate-100">{data.recentQuotations?.map((quote) => <tr key={quote.id} onClick={() => navigate(`/quotations/${quote.quoteCode || quote.id}`)} className="cursor-pointer hover:bg-slate-50"><td className="px-6 py-4 font-mono text-slate-700">{quote.quoteCode}</td><td className="px-3 py-4 font-medium text-slate-900">{quote.customerName}</td><td className="px-3 py-4 text-slate-700">${quote.amount.toLocaleString()}</td><td className="px-3 py-4 text-slate-700">{statusLabel(quote.status)}</td><td className={`px-6 py-4 font-semibold ${quote.risk === 'HIGH' ? 'text-rose-700' : 'text-slate-600'}`}>{quote.risk || 'LOW'}</td></tr>)}{!data.recentQuotations?.length && <tr><td colSpan="5" className="px-6 py-10 text-center text-slate-500">No quotations created yet.</td></tr>}</tbody></table></div></section>

          <section aria-label="Sales activity and quick actions" className="space-y-6"><div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-lg font-semibold text-slate-900">Sales Activity</h2><dl className="mt-5 space-y-4"><div className="flex justify-between border-b border-slate-100 pb-3"><dt className="text-sm text-slate-600">Quotes created</dt><dd className="font-semibold text-slate-900">{metrics.quotesCreated}</dd></div><div className="flex justify-between border-b border-slate-100 pb-3"><dt className="text-sm text-slate-600">Quotes approved</dt><dd className="font-semibold text-slate-900">{metrics.approvedQuotations}</dd></div><div className="flex justify-between"><dt className="text-sm text-slate-600">In negotiation</dt><dd className="font-semibold text-slate-900">{metrics.quotesInNegotiation}</dd></div></dl></div><div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-lg font-semibold text-slate-900">Quick Actions</h2><div className="mt-4 space-y-3"><Button type="button" onClick={() => navigate('/quotations')} className="gap-2"><Plus className="h-4 w-4" />New Quotation</Button><Button type="button" variant="outline" onClick={() => navigate('/quotations')} className="gap-2"><FileText className="h-4 w-4" />View Quotations</Button><Button type="button" variant="outline" onClick={() => navigate('/pipeline')} className="gap-2"><ShoppingBag className="h-4 w-4" />View Pipeline</Button></div></div></section>
        </div>

        <section aria-label="Fulfillment tracking" className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-center gap-2"><ShoppingBag className="h-5 w-5 text-emerald-600" /><h2 className="text-lg font-semibold text-slate-900">Fulfillment Tracking</h2></div><div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">{data.fulfillment?.map((item) => <div key={item.quoteCode} className="rounded-md bg-slate-50 p-4"><p className="font-mono text-sm text-slate-700">{item.quoteCode}</p><p className="mt-1 font-medium text-slate-900">{item.customerName}</p><p className="mt-2 text-xs text-slate-500">Fulfillment: {item.fulfillmentStatus}</p></div>)}{!data.fulfillment?.length && <p className="text-sm text-slate-500">No approved or confirmed quotations to track.</p>}</div></section>
        <section aria-label="Upsell opportunities" className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-center gap-2"><ShoppingBag className="h-5 w-5 text-blue-600" /><h2 className="text-lg font-semibold text-slate-900">Upsell Opportunities</h2></div><div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">{data.upsellOpportunities?.map((item) => <div key={`${item.productName}-${item.reason}`} className="rounded-md bg-slate-50 p-4"><p className="font-medium text-slate-900">{item.productName}</p><p className="mt-1 text-xs text-slate-500">{item.reason || 'Recommended for your quotation'}</p><p className="mt-2 text-sm font-semibold text-emerald-700">Margin impact: +${item.marginDelta.toLocaleString()}</p></div>)}{!data.upsellOpportunities?.length && <p className="text-sm text-slate-500">No recommendations available yet.</p>}</div></section>
      </main>
    </div>
  );
};

export default SalesRepDashboard;
