import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  AlertCircle, 
  CheckCircle2, 
  Download, 
  CreditCard,
  ShieldAlert
} from 'lucide-react';
import { DashboardNavbar } from '../components/dashboard/DashboardNavbar';
import { InvoiceTimeline } from '../components/invoices/InvoiceTimeline';
import { RelatedInvoicesTable } from '../components/invoices/RelatedInvoicesTable';
import { Button } from '../components/ui/Button';
import { getInvoice, recordPayment } from '../services/billingService';

export const InvoiceDetail = () => {
  const { invoiceId } = useParams();
  const [detail, setDetail] = useState(null);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchDetail = async () => {
    try {
      setIsLoading(true);
      const data = await getInvoice(invoiceId);
      if (data) setDetail(data);
    } catch (err) {
      console.error('Failed to load invoice details:', err);
      setErrorMessage('Could not load invoice from server.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [invoiceId]);

  const handleRecordPayment = async () => {
    try {
      setIsProcessing(true);
      const updated = await recordPayment(invoiceId, {
        amount: detail?.amount,
        paymentMethod: 'Credit Card (Stripe demo)'
      });
      if (updated) setDetail(updated);
      setFeedbackMessage(`Payment of $${Number(detail?.amount || 0).toLocaleString()} recorded! Invoice status updated to Paid.`);
      setTimeout(() => setFeedbackMessage(''), 5000);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to record payment.');
      setTimeout(() => setErrorMessage(''), 5000);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadSummary = () => {
    const summaryText = `DEALFLOW360 INVOICE RECEIPT\n--------------------------------\nInvoice: ${detail?.invoiceId}\nCustomer: ${detail?.customerName}\nAmount: $${Number(detail?.amount || 0).toLocaleString()} ${detail?.currency || 'USD'}\nStatus: ${detail?.status}\nDue Date: ${detail?.dueDate}\nGenerated on: ${new Date().toLocaleDateString()}\n`;
    const blob = new Blob([summaryText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${detail?.invoiceId}-receipt.txt`;
    a.click();
    URL.revokeObjectURL(url);

    setFeedbackMessage('Invoice receipt downloaded successfully.');
    setTimeout(() => setFeedbackMessage(''), 4500);
  };

  if (isLoading && !detail) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <DashboardNavbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-16 text-center text-slate-600 font-medium">
          Loading invoice lifecycle details...
        </main>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <DashboardNavbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-16 flex flex-col items-center justify-center text-center">
          <div className="h-14 w-14 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-4 shadow-sm">
            <AlertCircle className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Invoice not found
          </h1>
          <p className="text-sm text-slate-600 mb-6 max-w-md">
            The invoice with reference &quot;{invoiceId}&quot; could not be located in current records.
          </p>
          <Link
            to="/invoices"
            className="inline-flex items-center justify-center rounded-md font-medium text-sm transition-colors bg-slate-900 text-white hover:bg-slate-800 h-10 px-5 shadow-sm"
          >
            Back to Invoices
          </Link>
        </main>
      </div>
    );
  }

  const isPaid = detail.status === 'Paid';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <DashboardNavbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        <div>
          <Link
            to="/invoices"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Invoices</span>
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Invoice Detail: {detail.invoiceId} ({detail.customerName})
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Reconciled billing schedule and payment status for confirmed orders.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
              isPaid
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}>
              Status: {detail.status}
            </span>
            <span className="text-sm font-bold text-slate-900 bg-white px-3 py-1 rounded-md border border-slate-200 shadow-sm">
              ${Number(detail.amount || 0).toLocaleString()} {detail.currency || 'USD'}
            </span>
          </div>
        </div>

        {feedbackMessage && (
          <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-3 shadow-sm transition-all animate-in fade-in">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span className="text-sm font-semibold text-emerald-900">
              {feedbackMessage}
            </span>
          </div>
        )}

        {errorMessage && (
          <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 flex items-center gap-3 shadow-sm transition-all animate-in fade-in">
            <ShieldAlert className="h-5 w-5 text-rose-600 shrink-0" />
            <span className="text-sm font-semibold text-rose-900">
              {errorMessage}
            </span>
          </div>
        )}

        <section aria-label="Invoice Lifecycle">
          <InvoiceTimeline timeline={detail.timeline || []} />
        </section>

        <section aria-label="Related Invoices">
          <RelatedInvoicesTable invoices={detail.relatedInvoices || []} />
        </section>

        <section 
          aria-label="Invoice Actions" 
          className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-start gap-3"
        >
          {!isPaid ? (
            <Button
              type="button"
              variant="primary"
              disabled={isProcessing}
              onClick={handleRecordPayment}
              className="sm:!w-auto px-5 gap-2 bg-slate-900 hover:bg-slate-800 text-white shadow-sm"
            >
              <CreditCard className="h-4 w-4" />
              <span>Record Payment</span>
            </Button>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md font-medium text-sm">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>Invoice Paid in Full</span>
            </div>
          )}

          <Button
            type="button"
            variant="outline"
            onClick={handleDownloadSummary}
            className="sm:!w-auto px-5 gap-2 border-slate-300 text-slate-700 hover:bg-slate-100"
          >
            <Download className="h-4 w-4 text-slate-600" />
            <span>Download Summary</span>
          </Button>
        </section>

        <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-800 font-medium">
            Partial invoicing stays reconciled with partial warehouse delivery; nothing is billed before it ships.
          </p>
        </div>

      </main>
    </div>
  );
};

export default InvoiceDetail;
