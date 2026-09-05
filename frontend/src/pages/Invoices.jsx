import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { DashboardNavbar } from '../components/dashboard/DashboardNavbar';
import { InvoiceSummary } from '../components/invoices/InvoiceSummary';
import { InvoiceTable } from '../components/invoices/InvoiceTable';

// ============================================================================
// FRONTEND MOCK DATA & FUTURE BACKEND API CONTRACT
// ============================================================================
// API 1: GET /api/invoices
//   Returns { summary: { unpaid: 4, paid: 21 }, invoices: [ ... ] }
// API 2: GET /api/invoices/:invoiceId (Page 13 - Invoice Detail)
// API 3: POST /api/invoices/:invoiceId/payment (Future Payment)
// API 4: GET /api/invoices/:invoiceId/reconciliation (Future Reconciliation)
// ============================================================================
const MOCK_INVOICE_SUMMARY = {
  unpaid: 4,
  paid: 21,
};

const MOCK_INVOICES = [
  {
    id: 'INV-1042',
    customerId: 'CUS-001',
    customerName: 'Acme Corp',
    amount: 2730,
    currency: 'USD',
    status: 'Unpaid',
    dueDate: 'Sep 10',
  },
  {
    id: 'INV-1043',
    customerId: 'CUS-001',
    customerName: 'Acme Corp',
    amount: 46,
    currency: 'USD',
    status: 'Paid',
    dueDate: 'Sep 15',
  },
  {
    id: 'INV-1038',
    customerId: 'CUS-003',
    customerName: 'Nova Retail',
    amount: 9750,
    currency: 'USD',
    status: 'Paid',
    dueDate: 'Aug 30',
  },
];

export const Invoices = () => {
  const navigate = useNavigate();

  const handleRowClick = (invoiceId) => {
    navigate(`/invoices/${invoiceId}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* 1. Top Navigation - Reusing DealFlow360 Internal Navbar */}
      <DashboardNavbar />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* 2. Page Header */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Invoices (List)
          </h1>
          <p className="text-sm text-slate-600">
            Every invoice generated from one-time and recurring orders
          </p>
        </div>

        {/* 3. Summary Status Indicators */}
        <section aria-label="Invoice Status Summary">
          <InvoiceSummary summary={MOCK_INVOICE_SUMMARY} />
        </section>

        {/* 4. Invoice Table */}
        <section aria-label="Invoice List">
          <InvoiceTable
            invoices={MOCK_INVOICES}
            onRowClick={handleRowClick}
          />
        </section>

        {/* 5. Informational Callout */}
        <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-800 font-medium">
            Click an invoice row to open its full payment and delivery reconciliation detail.
          </p>
        </div>

      </main>
    </div>
  );
};

export default Invoices;
