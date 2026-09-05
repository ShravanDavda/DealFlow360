import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  AlertCircle, 
  CheckCircle2, 
  Download, 
  CreditCard 
} from 'lucide-react';
import { DashboardNavbar } from '../components/dashboard/DashboardNavbar';
import { InvoiceTimeline } from '../components/invoices/InvoiceTimeline';
import { RelatedInvoicesTable } from '../components/invoices/RelatedInvoicesTable';
import { Button } from '../components/ui/Button';

// ============================================================================
// FRONTEND MOCK DATA & FUTURE BACKEND API CONTRACT
// ============================================================================
// API 1: GET /api/invoices/:invoiceId
// API 2: POST /api/invoices/:invoiceId/payment (Record Payment)
// API 3: GET /api/invoices/:invoiceId/summary-download (Download Summary)
// ============================================================================
const MOCK_INVOICE_DETAILS = {
  'INV-1042': {
    invoiceId: 'INV-1042',
    customerId: 'CUS-001',
    customerName: 'Acme Corp',
    amount: 2730,
    currency: 'USD',
    status: 'Unpaid',
    dueDate: 'Sep 10',
    timeline: [
      { id: 'order-confirmed', label: 'Order Confirmed', status: 'completed' },
      { id: 'shipped', label: 'Shipped', status: 'completed' },
      { id: 'invoiced', label: 'Invoiced', status: 'current' },
      { id: 'paid', label: 'Paid', status: 'pending' },
    ],
    relatedInvoices: [
      {
        invoiceId: 'INV-1042',
        type: 'One-Time',
        amount: 2730,
        currency: 'USD',
        status: 'Unpaid',
        dueDate: 'Sep 10',
      },
      {
        invoiceId: 'INV-1043',
        type: 'Recurring',
        amount: 46,
        currency: 'USD',
        status: 'Paid',
        dueDate: 'Sep 15',
      },
    ],
  },
  'INV-1043': {
    invoiceId: 'INV-1043',
    customerId: 'CUS-001',
    customerName: 'Acme Corp',
    amount: 46,
    currency: 'USD',
    status: 'Paid',
    dueDate: 'Sep 15',
    timeline: [
      { id: 'order-confirmed', label: 'Order Confirmed', status: 'completed' },
      { id: 'shipped', label: 'Shipped', status: 'completed' },
      { id: 'invoiced', label: 'Invoiced', status: 'completed' },
      { id: 'paid', label: 'Paid', status: 'completed' },
    ],
    relatedInvoices: [
      {
        invoiceId: 'INV-1042',
        type: 'One-Time',
        amount: 2730,
        currency: 'USD',
        status: 'Unpaid',
        dueDate: 'Sep 10',
      },
      {
        invoiceId: 'INV-1043',
        type: 'Recurring',
        amount: 46,
        currency: 'USD',
        status: 'Paid',
        dueDate: 'Sep 15',
      },
    ],
  },
  'INV-1038': {
    invoiceId: 'INV-1038',
    customerId: 'CUS-003',
    customerName: 'Nova Retail',
    amount: 9750,
    currency: 'USD',
    status: 'Paid',
    dueDate: 'Aug 30',
    timeline: [
      { id: 'order-confirmed', label: 'Order Confirmed', status: 'completed' },
      { id: 'shipped', label: 'Shipped', status: 'completed' },
      { id: 'invoiced', label: 'Invoiced', status: 'completed' },
      { id: 'paid', label: 'Paid', status: 'completed' },
    ],
    relatedInvoices: [
      {
        invoiceId: 'INV-1038',
        type: 'One-Time',
        amount: 9750,
        currency: 'USD',
        status: 'Paid',
        dueDate: 'Aug 30',
      },
    ],
  },
};

export const InvoiceDetail = () => {
  const { invoiceId } = useParams();
  const [feedbackMessage, setFeedbackMessage] = useState('');

  const detail = MOCK_INVOICE_DETAILS[invoiceId];

  const handleRecordPayment = () => {
    setFeedbackMessage('Payment recording selected.');
    setTimeout(() => setFeedbackMessage(''), 4500);
  };

  const handleDownloadSummary = () => {
    setFeedbackMessage('Invoice summary download selected.');
    setTimeout(() => setFeedbackMessage(''), 4500);
  };

  // 404 / Not Found State
  if (!detail) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <DashboardNavbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-16 flex flex-col items-center justify-center text-center">
          <div className="h-14 w-14 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-4 shadow-sm">
            <AlertCircle className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Invoice not found.
          </h1>
          <p className="text-sm text-slate-600 mb-6 max-w-md">
            The invoice with reference &quot;{invoiceId}&quot; could not be located in current records.
          </p>
          <Link
            to="/invoices"
            className="inline-flex items-center justify-center rounded-md font-medium text-sm transition-colors bg-slate-900 text-white hover:bg-slate-800 h-10 px-5 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
          >
            Back to Invoices
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
            to="/invoices"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Invoices</span>
          </Link>
        </div>

        {/* 2. Page Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Invoice Detail: {detail.invoiceId} ({detail.customerName})
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Opened by clicking a row on the Invoices list
          </p>
        </div>

        {/* Action Confirmation Banner */}
        {feedbackMessage && (
          <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-3 shadow-sm transition-all animate-in fade-in">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span className="text-sm font-semibold text-emerald-900">
              {feedbackMessage}
            </span>
          </div>
        )}

        {/* 3. Lifecycle Timeline */}
        <section aria-label="Invoice Lifecycle">
          <InvoiceTimeline timeline={detail.timeline} />
        </section>

        {/* 4. Related Invoices Table */}
        <section aria-label="Related Invoices">
          <RelatedInvoicesTable invoices={detail.relatedInvoices} />
        </section>

        {/* 5. Action Buttons */}
        <section 
          aria-label="Invoice Actions" 
          className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-start gap-3"
        >
          <Button
            type="button"
            variant="primary"
            onClick={handleRecordPayment}
            className="sm:!w-auto px-5 gap-2 bg-slate-900 hover:bg-slate-800 text-white shadow-sm"
          >
            <CreditCard className="h-4 w-4" />
            <span>Record Payment</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={handleDownloadSummary}
            className="sm:!w-auto px-5 gap-2 border-slate-300 text-slate-700 hover:bg-slate-100"
          >
            <Download className="h-4 w-4" />
            <span>Download Summary</span>
          </Button>
        </section>

        {/* 6. Information / Warning Notice */}
        <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-800 font-medium">
            Partial invoicing stays reconciled with partial delivery, nothing is billed before it ships.
          </p>
        </div>

      </main>
    </div>
  );
};

export default InvoiceDetail;
