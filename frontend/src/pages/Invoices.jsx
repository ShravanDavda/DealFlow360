import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { DashboardNavbar } from '../components/dashboard/DashboardNavbar';
import { InvoiceSummary } from '../components/invoices/InvoiceSummary';
import { InvoiceTable } from '../components/invoices/InvoiceTable';
import { getInvoices } from '../services/billingService';

export const Invoices = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [summary, setSummary] = useState({ unpaid: 0, paid: 0 });
  const [filterMode, setFilterMode] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  const fetchInvoiceList = async () => {
    try {
      setIsLoading(true);
      const data = await getInvoices();
      if (data) {
        setInvoices(data);
        const unpaid = data.filter((i) => i.status === 'Unpaid').length;
        const paid = data.filter((i) => i.status === 'Paid').length;
        setSummary({ unpaid, paid });
      }
    } catch (err) {
      console.error('Failed to load invoices:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoiceList();
  }, []);

  const handleRowClick = (invoiceId) => {
    navigate(`/invoices/${invoiceId}`);
  };

  const visibleInvoices = invoices.filter((invoice) => {
    if (filterMode === 'all') return true;
    if (filterMode === 'credit-notes') return invoice.type === 'Credit Note';
    if (filterMode === 'pending') return invoice.status === 'Unpaid';
    return invoice.type === filterMode || invoice.status === filterMode;
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <DashboardNavbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Invoices ({invoices.length})
            </h1>
            <p className="text-sm text-slate-600">
              Every invoice generated from one-time and recurring hybrid order lines.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchInvoiceList}
            className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 bg-white px-3 py-1.5 rounded-md border border-slate-200 shadow-sm"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
            <span>Refresh Invoices</span>
          </button>
        </div>

        <section aria-label="Billing Tabs" className="flex flex-wrap gap-2">
          {[['all', 'All'], ['One-Time', 'One-Time'], ['Recurring', 'Recurring'], ['pending', 'Pending'], ['Paid', 'Paid'], ['Overdue', 'Overdue'], ['credit-notes', 'Credit Notes']].map(([value, label]) => <button key={value} type="button" onClick={() => setFilterMode(value)} className={`rounded px-3 py-1.5 text-xs font-medium ${filterMode === value ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`} aria-pressed={filterMode === value}>{label}</button>)}
        </section>

        <section aria-label="Invoice Status Summary">
          <InvoiceSummary summary={summary} />
        </section>

        <section aria-label="Invoice List">
          {isLoading && invoices.length === 0 ? (
            <div className="py-12 text-center text-slate-500 font-medium">
              Loading invoices from database...
            </div>
          ) : (
            <InvoiceTable
              invoices={visibleInvoices}
              onRowClick={handleRowClick}
            />
          )}
        </section>

        <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-800 font-medium">
            Click an invoice row to open its full payment, lifecycle timeline, and delivery reconciliation detail.
          </p>
        </div>

      </main>
    </div>
  );
};

export default Invoices;
