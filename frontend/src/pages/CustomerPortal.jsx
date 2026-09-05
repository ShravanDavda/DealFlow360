import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  FileText, 
  Calendar, 
  Percent, 
  Info,
  ArrowLeft 
} from 'lucide-react';
import { CustomerNavbar } from '../components/customer/CustomerNavbar';
import { NegotiationLineTable } from '../components/customer/NegotiationLineTable';
import { Button } from '../components/ui/Button';

// ============================================================================
// FRONTEND MOCK DATA & FUTURE BACKEND API CONTRACT
// ============================================================================
// API 1: GET /api/customer/quotes/:quoteId
// API 2: POST /api/customer/quotes/:quoteId/negotiation
// API 3: POST /api/customer/quotes/:quoteId/confirm
// API 4: GET /api/customer/quotes/:quoteId/messages (Future)
// ============================================================================
const MOCK_CUSTOMER_QUOTES = {
  'Q-1042': {
    quoteId: 'Q-1042',
    customerName: 'Acme Corp',
    status: 'Under Negotiation',
    negotiationLines: [
      {
        id: 'LINE-001',
        productName: 'Extended Warranty',
        customerComment: 'Can this be 15% off instead of 10%?',
      },
      {
        id: 'LINE-002',
        productName: 'Onsite Setup',
        customerComment: 'Can we push this to next month?',
      },
    ],
  },
  'Q-1039': {
    quoteId: 'Q-1039',
    customerName: 'Beta Industries',
    status: 'Under Negotiation',
    negotiationLines: [
      {
        id: 'LINE-003',
        productName: 'Support SLA',
        customerComment: 'Can the billing cycle be changed?',
      },
    ],
  },
  'Q-1035': {
    quoteId: 'Q-1035',
    customerName: 'Nova Retail',
    status: 'Under Negotiation',
    negotiationLines: [
      {
        id: 'LINE-004',
        productName: 'Laptop Pro 14',
        customerComment: 'Can we adjust the delivery date?',
      },
    ],
  },
};

export const CustomerPortal = () => {
  const { quoteId = 'Q-1042' } = useParams();

  // Retrieve current customer quote
  const quote = MOCK_CUSTOMER_QUOTES[quoteId];

  // Form input states
  const [counterDiscount, setCounterDiscount] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  
  // Validation and feedback states
  const [validationError, setValidationError] = useState('');
  const [actionFeedback, setActionFeedback] = useState('');
  const [lastSubmitted, setLastSubmitted] = useState(null);

  // Minimum selectable date: today in YYYY-MM-DD format
  const todayDateString = new Date().toISOString().split('T')[0];

  const handleSubmitRequest = (e) => {
    e?.preventDefault();
    setValidationError('');
    setActionFeedback('');

    // Form validation
    const discountNum = Number(counterDiscount);
    if (counterDiscount === '' || isNaN(discountNum)) {
      setValidationError('Please enter a valid counter discount percentage.');
      return;
    }

    if (discountNum < 0 || discountNum > 100) {
      setValidationError('Counter discount percentage must be between 0% and 100%.');
      return;
    }

    if (!deliveryDate) {
      setValidationError('Please specify a requested delivery date.');
      return;
    }

    if (deliveryDate < todayDateString) {
      setValidationError('Requested delivery date cannot be in the past.');
      return;
    }

    // Record submission into local React state (frontend only)
    setLastSubmitted({
      counterDiscount: discountNum,
      deliveryDate,
      submittedAt: new Date().toISOString(),
    });

    setActionFeedback('Negotiation request submitted.');
    setTimeout(() => {
      setActionFeedback('');
    }, 5000);
  };

  const handleConfirmQuotation = () => {
    setValidationError('');
    setActionFeedback('Quotation confirmation selected.');
    setTimeout(() => {
      setActionFeedback('');
    }, 5000);
  };

  // Not Found State for unknown quote IDs
  if (!quote) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <CustomerNavbar quoteId="Q-1042" />
        <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-16 flex flex-col items-center justify-center text-center">
          <div className="h-14 w-14 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-4 shadow-sm">
            <AlertCircle className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Quote not found.
          </h1>
          <p className="text-sm text-slate-600 mb-6 max-w-md">
            The quotation reference &quot;{quoteId}&quot; could not be found or you do not have permission to access it.
          </p>
          <Link
            to="/customer/quotes/Q-1042"
            className="inline-flex items-center justify-center rounded-md font-medium text-sm transition-colors bg-slate-900 text-white hover:bg-slate-800 h-10 px-5 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
          >
            Back to My Quotation
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Customer Portal Top Navigation */}
      <CustomerNavbar quoteId={quote.quoteId} />

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Header Section */}
        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-md bg-slate-100 text-slate-700">
                  <FileText className="h-5 w-5" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  Customer Portal Negotiation Screen
                </h1>
              </div>
              <p className="mt-2 text-sm text-slate-600">
                Customer reviews and negotiates the quote directly, no email needed
              </p>
            </div>

            {/* Quotation Reference & Customer Status Badge */}
            <div className="flex flex-col sm:items-end gap-1.5 shrink-0">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Quote Ref: {quote.quoteId} ({quote.customerName})
              </span>
              <span 
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 shadow-sm"
                aria-label={`Current quotation status: ${quote.status}`}
              >
                <Clock className="h-3.5 w-3.5 text-amber-600" />
                <span>Status: {quote.status}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Global Action / Submission Feedback Banner */}
        {actionFeedback && (
          <div 
            className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-3 shadow-sm transition-all animate-in fade-in"
            role="status"
            aria-live="polite"
          >
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span className="text-sm font-semibold text-emerald-900">
              {actionFeedback}
            </span>
          </div>
        )}

        {/* Validation Error Message */}
        {validationError && (
          <div 
            className="p-4 rounded-lg bg-rose-50 border border-rose-200 flex items-center gap-3 shadow-sm transition-all"
            role="alert"
          >
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
            <span className="text-sm font-medium text-rose-900">
              {validationError}
            </span>
          </div>
        )}

        {/* Section 1: Negotiation Line Items Table */}
        <section aria-label="Quotation Lines for Negotiation" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">
              Line Items Under Review
            </h2>
            <span className="text-xs text-slate-500">
              Review and submit negotiation feedback per line
            </span>
          </div>

          <NegotiationLineTable lines={quote.negotiationLines} />
        </section>

        {/* Section 2: Negotiation Request Form */}
        <section 
          aria-label="Negotiation Proposal" 
          className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm space-y-6"
        >
          <div className="border-b border-slate-200 pb-4">
            <h2 className="text-base font-semibold text-slate-900">
              Submit Counter-Offer & Delivery Terms
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Specify your proposed discount and target delivery schedule for this quotation.
            </p>
          </div>

          <form onSubmit={handleSubmitRequest} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Field 1: Counter Discount % */}
              <div className="space-y-1.5">
                <label 
                  htmlFor="counter-discount" 
                  className="block text-sm font-medium text-slate-700"
                >
                  Counter Discount %
                </label>
                <div className="relative rounded-md shadow-sm">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <Percent className="h-4 w-4" />
                  </div>
                  <input
                    id="counter-discount"
                    name="counterDiscount"
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    placeholder="Enter discount"
                    value={counterDiscount}
                    onChange={(e) => {
                      setCounterDiscount(e.target.value);
                      if (validationError) setValidationError('');
                    }}
                    className="block w-full rounded-md border border-slate-300 pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-colors hover:border-slate-400"
                    aria-describedby="counter-discount-desc"
                  />
                </div>
                <p id="counter-discount-desc" className="text-xs text-slate-500">
                  Propose your target discount percentage between 0% and 100%.
                </p>
              </div>

              {/* Field 2: Requested Delivery Date */}
              <div className="space-y-1.5">
                <label 
                  htmlFor="requested-delivery-date" 
                  className="block text-sm font-medium text-slate-700"
                >
                  Requested Delivery Date
                </label>
                <div className="relative rounded-md shadow-sm">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <input
                    id="requested-delivery-date"
                    name="requestedDeliveryDate"
                    type="date"
                    min={todayDateString}
                    value={deliveryDate}
                    onChange={(e) => {
                      setDeliveryDate(e.target.value);
                      if (validationError) setValidationError('');
                    }}
                    className="block w-full rounded-md border border-slate-300 pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-colors hover:border-slate-400"
                    aria-describedby="requested-delivery-date-desc"
                  />
                </div>
                <p id="requested-delivery-date-desc" className="text-xs text-slate-500">
                  Select a preferred future date for delivery or project completion.
                </p>
              </div>

            </div>

            {/* Informational Guidance */}
            <div className="rounded-md bg-slate-50 p-4 border border-slate-200 flex items-start gap-3">
              <Info className="h-5 w-5 text-slate-500 mt-0.5 shrink-0" />
              <div className="text-xs text-slate-600 leading-relaxed">
                Submitting counter terms will immediately alert the account team to re-evaluate your proposal. If all terms align with your needs without changes, you may directly confirm the quotation.
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleConfirmQuotation}
                className="sm:!w-auto px-6 border-slate-300 text-slate-800 hover:bg-slate-100"
              >
                Confirm Quotation
              </Button>

              <Button
                type="submit"
                variant="primary"
                className="sm:!w-auto px-6 bg-slate-900 hover:bg-slate-800 text-white shadow-sm"
              >
                Submit Request
              </Button>
            </div>
          </form>
        </section>

      </main>
    </div>
  );
};

export default CustomerPortal;
