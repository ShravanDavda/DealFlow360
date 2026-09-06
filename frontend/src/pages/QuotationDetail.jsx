import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, AlertTriangle, ShieldAlert } from 'lucide-react';
import { DashboardNavbar } from '../components/dashboard/DashboardNavbar';
import { QuotationInfo } from '../components/quotation-detail/QuotationInfo';
import { QuotationProductTable } from '../components/quotation-detail/QuotationProductTable';
import { UpsellSuggestions } from '../components/quotation-detail/UpsellSuggestions';
import { Button } from '../components/ui/Button';
import { 
  getQuotation, 
  updateQuotation, 
  submitQuotation, 
  getRecommendations,
  previewQuotation
} from '../services/quotationService';
import { getProducts } from '../services/productService';

export const QuotationDetail = () => {
  const { quotationId } = useParams();
  const navigate = useNavigate();

  const [quote, setQuote] = useState(null);
  const [products, setProducts] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedSuggestions, setSelectedSuggestions] = useState([]);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [totals, setTotals] = useState({ subtotal: 0, totalDiscount: 0, taxAmount: 0, totalAmount: 0, overallMargin: 0, blendedRisk: 'LOW', totalViolationPoints: 0 });

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [quoteData, recsData, catData] = await Promise.all([
        getQuotation(quotationId),
        getRecommendations(quotationId).catch(() => []),
        getProducts().catch(() => [])
      ]);

      if (quoteData) {
        setQuote(quoteData);
        setProducts(quoteData.products || []);
        setTotals({
          subtotal: quoteData.subtotal,
          totalDiscount: quoteData.totalDiscount,
          taxAmount: quoteData.taxAmount,
          totalAmount: quoteData.totalAmount,
          overallMargin: quoteData.overallMargin,
          blendedRisk: quoteData.blendedRisk,
          totalViolationPoints: quoteData.totalViolationPoints || 0
        });
      }
      setSuggestions(recsData || []);
      setCatalog(catData || []);
    } catch (err) {
      console.error('Error loading quotation:', err);
      setErrorMessage('Failed to load quotation from server.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [quotationId]);

  const recalculate = async (nextProducts) => {
    const calculation = await previewQuotation({
      customerId: quote.customerId,
      priceListId: quote.priceListId,
      items: nextProducts.map((item) => ({
        productId: item.productId,
        productVariantId: item.productVariantId || null,
        quantity: Number(item.quantity),
        discountPercent: Number(item.discount ?? item.discountPercent ?? 0)
      }))
    });
    setProducts(calculation.items.map((item, index) => ({ ...item, id: nextProducts[index]?.id || `ITEM-${item.productId}-${index}`, name: item.itemName, price: item.unitPrice, discount: item.discountGiven, discountLimit: item.allowedDiscount, baseCost: item.baseCost, category: item.category, status: item.riskStatus })));
    setTotals(calculation);
  };

  const handleUpdateQuantity = async (itemId, newQty) => {
    try { await recalculate(products.map((item) => item.id === itemId ? { ...item, quantity: newQty } : item)); } catch (err) { setErrorMessage(err.message); }
  };

  const handleUpdateDiscount = async (itemId, newDiscount) => {
    try { await recalculate(products.map((item) => item.id === itemId ? { ...item, discount: newDiscount } : item)); } catch (err) { setErrorMessage(err.message); }
  };

  const handleRemoveItem = async (itemId) => {
    try { await recalculate(products.filter((item) => item.id !== itemId)); } catch (err) { setErrorMessage(err.message); }
  };

  const handleAddItemFromCatalog = (catItem) => {
    const newItem = {
      id: `ITEM-${Date.now()}`,
      productId: catItem.id,
      quantity: 1,
      discount: 0,
    };
    recalculate([...products, newItem]).catch((err) => setErrorMessage(err.message));
  };

  const handleToggleSuggestion = (suggestion) => {
    const isSelected = selectedSuggestions.includes(suggestion.id);
    if (isSelected) {
      setSelectedSuggestions((prev) => prev.filter((id) => id !== suggestion.id));
    } else {
      setSelectedSuggestions((prev) => [...prev, suggestion.id]);
      const newItem = {
        id: `SUGG-${Date.now()}`,
        productId: suggestion.productId,
        quantity: 1,
        discount: 0,
      };
      recalculate([...products, newItem]).then(() => {
        setFeedbackMessage(`Upsell accepted: Added ${suggestion.name} to quote.`);
        setTimeout(() => setFeedbackMessage(''), 3500);
      }).catch((err) => setErrorMessage(err.message));
    }
  };

  const handleSaveDraft = async () => {
    try {
      setIsSubmitting(true);
      await updateQuotation(quotationId, {
        items: products.map((item) => ({ productId: item.productId, productVariantId: item.productVariantId || null, quantity: item.quantity, discountPercent: item.discount }))
      });
      setFeedbackMessage('Draft saved successfully with updated pricing and margin.');
      setTimeout(() => setFeedbackMessage(''), 4000);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to save draft.');
      setTimeout(() => setErrorMessage(''), 4000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitForApproval = async () => {
    try {
      setIsSubmitting(true);
      const result = await submitQuotation(quotationId, {
        note: `Submitted with ${totals.blendedRisk} Risk rating`
      });

      if (result?.status === 'Pending Approval') {
        setFeedbackMessage(
          `Quotation submitted! Auto-routed to ${result.approvalStage} for approval due to ${totals.blendedRisk} blended risk.`
        );
      } else {
        setFeedbackMessage(`Quotation within discount ceilings! Auto-approved directly to fulfillment.`);
      }

      await loadData();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to submit quotation for approval.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading && !quote) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <DashboardNavbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-16 text-center text-slate-600 font-medium">
          Loading quotation details...
        </main>
      </div>
    );
  }

  const customerName = quote?.customerName || '';
  const priceList = quote?.priceList || '';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <DashboardNavbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        <div className="flex items-center justify-between">
          <Link
            to="/quotations"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Quotations</span>
          </Link>

          {quote?.status === 'Pending Approval' && (
            <Link
              to={`/approvals/${quotationId}`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200 hover:bg-amber-100"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Pending Review at {quote.approvalStage} stage → View in Approvals</span>
            </Link>
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Quotation Builder: {quotationId} ({customerName})
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Add products, adjust discounts, review upsells, and observe real-time margin & approval governance.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
              quote?.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
              quote?.status === 'Pending Approval' ? 'bg-amber-50 text-amber-800 border-amber-200' :
              quote?.status === 'Confirmed' ? 'bg-blue-50 text-blue-700 border-blue-200' :
              'bg-slate-100 text-slate-700 border-slate-200'
            }`}>
              Status: {quote?.status || 'Draft'}
            </span>
          </div>
        </div>

        {feedbackMessage && (
          <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-3 animate-in fade-in">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span className="text-sm font-semibold text-emerald-900">
              {feedbackMessage}
            </span>
          </div>
        )}

        {errorMessage && (
          <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 flex items-center gap-3 animate-in fade-in">
            <ShieldAlert className="h-5 w-5 text-rose-600 shrink-0" />
            <span className="text-sm font-semibold text-rose-900">
              {errorMessage}
            </span>
          </div>
        )}

        <section aria-label="Quotation Information">
          <QuotationInfo
            customerName={`${customerName} (${quote?.customerTier || 'Gold'} Tier)`}
            priceList={priceList}
          />
        </section>

        <section aria-label="Product Line Items">
          <QuotationProductTable
            products={products}
            availableCatalog={catalog}
            onUpdateQuantity={handleUpdateQuantity}
            onUpdateDiscount={handleUpdateDiscount}
            onRemoveItem={handleRemoveItem}
            onAddItem={handleAddItemFromCatalog}
            overallMargin={totals.overallMargin}
            blendedRisk={totals.blendedRisk}
            subtotal={totals.subtotal}
            totalDiscount={totals.totalDiscount}
            taxAmount={totals.taxAmount}
            totalAmount={totals.totalAmount}
            currency={quote?.currency || 'USD'}
          />
        </section>

        <section aria-label="Upsell Suggestions">
          <UpsellSuggestions
            suggestions={suggestions}
            selectedIds={selectedSuggestions}
            onToggleSuggestion={handleToggleSuggestion}
          />
        </section>

        <section aria-label="Actions" className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={handleSaveDraft}
            isLoading={isSubmitting}
            className="sm:!w-auto px-5"
          >
            Save Draft
          </Button>

          <Button
            type="button"
            variant="primary"
            onClick={handleSubmitForApproval}
            isLoading={isSubmitting}
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
