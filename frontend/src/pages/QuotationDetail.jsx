import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { DashboardNavbar } from '../components/dashboard/DashboardNavbar';
import { QuotationInfo } from '../components/quotation-detail/QuotationInfo';
import { QuotationProductTable } from '../components/quotation-detail/QuotationProductTable';
import { UpsellSuggestions } from '../components/quotation-detail/UpsellSuggestions';
import { Button } from '../components/ui/Button';

// ============================================================================
// FRONTEND MOCK DATA & FUTURE API CONTRACT
// ============================================================================
// Future Endpoint: GET /api/quotations/:quotationId
// Future Patch Endpoint: PATCH /api/quotations/:quotationId (Save Draft)
// Future Submit Endpoint: POST /api/quotations/:quotationId/submit (Submit for Approval)
// ============================================================================
const CUSTOMER_MAP = {
  'Q-001': 'Acme Corp',
  'Q-002': 'Delta LLC',
  'Q-003': 'Beta Industries',
  'Q-004': 'Nova Retail',
  'Q-005': 'Zenith Co',
  'Q-006': 'Orion Ltd',
  'Q-1042': 'Acme Corp',
};

const DEFAULT_PRODUCTS = [
  {
    id: 'P-001',
    name: 'Laptop Pro 14',
    quantity: 2,
    price: 1200,
    discount: 12,
    discountLimit: 15,
    status: 'OK',
  },
  {
    id: 'P-002',
    name: 'Onsite Setup Service',
    quantity: 1,
    price: 450,
    discount: 18,
    discountLimit: 10,
    status: 'OVER (+8pt)',
  },
  {
    id: 'P-003',
    name: 'Extended Warranty',
    quantity: 1,
    price: 180,
    discount: 10,
    discountLimit: 15,
    status: 'OK',
  },
];

const DEFAULT_SUGGESTIONS = [
  {
    id: 'S-001',
    name: 'Wireless Mouse',
    detail: 'Margin +$18',
  },
  {
    id: 'S-002',
    name: 'Docking Station',
    detail: 'Promo: 12% off',
  },
  {
    id: 'S-003',
    name: 'Care Plan 2yr',
    detail: 'Margin +$46',
  },
];

export const QuotationDetail = () => {
  const { quotationId = 'Q-1042' } = useParams();

  // Determine customer name dynamically based on the quotationId parameter
  const customerName = CUSTOMER_MAP[quotationId] || 'Acme Corp';
  const priceList = 'Standard Price List';

  // Interactive frontend state for suggestions and notifications
  const [selectedSuggestions, setSelectedSuggestions] = useState([]);
  const [feedbackMessage, setFeedbackMessage] = useState('');

  const handleToggleSuggestion = (suggestion) => {
    setSelectedSuggestions((prev) =>
      prev.includes(suggestion.id)
        ? prev.filter((id) => id !== suggestion.id)
        : [...prev, suggestion.id]
    );
  };

  const handleSaveDraft = () => {
    setFeedbackMessage('Draft saved successfully (Frontend mock).');
    setTimeout(() => setFeedbackMessage(''), 4000);
  };

  const handleSubmitForApproval = () => {
    setFeedbackMessage('Submitted for approval (Frontend mock).');
    setTimeout(() => setFeedbackMessage(''), 4000);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* 1. Top Navigation */}
      <DashboardNavbar />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Navigation Breadcrumb / Back Link */}
        <div>
          <Link
            to="/quotations"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Quotations</span>
          </Link>
        </div>

        {/* 2. Page Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Quotation Detail: {quotationId} ({customerName})
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Opened by clicking a row on the Quotations list. Add products, apply discounts, review upsells.
          </p>
        </div>

        {/* Feedback Alert */}
        {feedbackMessage && (
          <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span className="text-sm font-medium text-emerald-800">
              {feedbackMessage}
            </span>
          </div>
        )}

        {/* 3. Quotation Information */}
        <section aria-label="Quotation Information">
          <QuotationInfo
            customerName={customerName}
            priceList={priceList}
          />
        </section>

        {/* 4. Product Table */}
        <section aria-label="Product Line Items">
          <QuotationProductTable products={DEFAULT_PRODUCTS} />
        </section>

        {/* 5. Upsell / Cross-Sell Suggestions */}
        <section aria-label="Upsell Suggestions">
          <UpsellSuggestions
            suggestions={DEFAULT_SUGGESTIONS}
            selectedIds={selectedSuggestions}
            onToggleSuggestion={handleToggleSuggestion}
          />
        </section>

        {/* 6. Bottom Actions */}
        <section aria-label="Actions" className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={handleSaveDraft}
            className="sm:!w-auto px-5"
          >
            Save Draft
          </Button>

          <Button
            type="button"
            variant="primary"
            onClick={handleSubmitForApproval}
            className="sm:!w-auto px-5"
          >
            Submit for Approval
          </Button>
        </section>

      </main>
    </div>
  );
};

export default QuotationDetail;
