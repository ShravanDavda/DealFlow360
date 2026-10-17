import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  FileText, 
  Calendar, 
  Percent, 
  Info,
  ShieldAlert,
  ArrowLeft,
  MessageSquare,
  Package,
  History,
  DollarSign,
  TrendingDown,
  HelpCircle,
  Check,
  X,
  ShieldCheck
} from 'lucide-react';
import { CustomerNavbar } from '../components/customer/CustomerNavbar';
import { Button } from '../components/ui/Button';
import {
  getCustomerQuote,
  getNegotiationHistory,
  submitCustomerNegotiation,
  confirmCustomerQuote
} from '../services/customerPortalService';

export const CustomerPortal = () => {
  const { quoteId } = useParams();

  const [quote, setQuote] = useState(null);
  const [historyItems, setHistoryItems] = useState([]);
  const [activeTab, setActiveTab] = useState('counter');
  
  const [counterDiscount, setCounterDiscount] = useState('');
  const [counterDeliveryDate, setCounterDeliveryDate] = useState('');
  const [counterComment, setCounterComment] = useState('');

  const [questionText, setQuestionText] = useState('');
  const [questionDeliveryDate, setQuestionDeliveryDate] = useState('');

  const [validationError, setValidationError] = useState('');
  const [actionFeedback, setActionFeedback] = useState('');
  const [reApprovalAlert, setReApprovalAlert] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const todayDateString = new Date().toISOString().split('T')[0];

  const fetchQuoteData = async () => {
    try {
      setIsLoading(true);
      const [quoteData, historyData] = await Promise.all([
        getCustomerQuote(quoteId),
        getNegotiationHistory(quoteId).catch(() => null)
      ]);

      if (quoteData) {
        setQuote(quoteData);
        if (quoteData.status === 'Approved') {
          setActiveTab('confirm');
        }
      }

      let combinedHistory = [];
      if (historyData) {
        const lines = (historyData.negotiationLines || []).map((line) => ({
          id: `line-${line.id}`,
          type: line.requestedDiscount ? 'counter_discount' : 'question',
          title: line.productName || (line.requestedDiscount ? 'Counter-Discount Proposal' : 'Question / Change Request'),
          comment: line.customerComment,
          discount: line.requestedDiscount ? Number(line.requestedDiscount) : null,
          status: line.status || 'Under Review',
          createdAt: line.createdAt
        }));

        const audits = (historyData.auditTrail || []).map((audit) => ({
          id: `audit-${audit.id}`,
          type: 'audit_event',
          title: audit.action === 'APPROVAL_STEP_APPROVED' 
            ? `${audit.userName || 'Approver'} Approved Step`
            : audit.action === 'QUOTATION_APPROVED'
            ? 'Quotation Approved'
            : audit.action === 'Confirmed'
            ? 'Quotation Confirmed'
            : audit.action,
          comment: audit.note,
          status: audit.action.includes('APPROVED') || audit.action === 'Confirmed' ? 'Approved' : 'Standard',
          createdAt: audit.createdAt
        }));

        combinedHistory = [...lines, ...audits].sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );
      } else if (quoteData?.negotiationHistory) {
        combinedHistory = quoteData.negotiationHistory.map((h) => ({
          id: `h-${h.id}`,
          type: h.requestedDiscount ? 'counter_discount' : 'question',
          title: h.productName || 'Negotiation Entry',
          comment: h.comment,
          discount: h.requestedDiscount ? Number(h.requestedDiscount) : null,
          status: h.status,
          createdAt: h.createdAt
        }));
      }
      setHistoryItems(combinedHistory);
    } catch (err) {
      console.error('Failed to load customer quotation:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQuoteData();
  }, [quoteId]);

  const previewCalculation = useMemo(() => {
    if (!quote) return null;
    const subtotal = Number(quote.subtotal || 0);
    const parsedDiscount = parseFloat(counterDiscount);
    if (isNaN(parsedDiscount) || parsedDiscount < 0 || parsedDiscount > 100) {
      return null;
    }
    const discountAmount = (subtotal * parsedDiscount) / 100;
    const estimatedSubtotalAfterDiscount = Math.max(0, subtotal - discountAmount);
    const taxRate = subtotal > 0 ? Number(quote.taxAmount || 0) / Math.max(1, subtotal - Number(quote.totalDiscount || 0)) : 0;
    const estimatedTax = estimatedSubtotalAfterDiscount * taxRate;
    const estimatedTotal = estimatedSubtotalAfterDiscount + estimatedTax;
    const originalTotal = Number(quote.totalAmount || 0);
    const savings = originalTotal - estimatedTotal;

    return {
      discountPercent: parsedDiscount,
      discountAmount,
      estimatedTotal,
      savings: Math.max(0, savings)
    };
  }, [quote, counterDiscount]);

  const handleQuestionSubmit = async (e) => {
    e?.preventDefault();
    setValidationError('');
    setActionFeedback('');
    setReApprovalAlert(false);

    if (!questionText.trim()) {
      setValidationError('Please enter your question or change request description.');
      return;
    }

    if (questionDeliveryDate && questionDeliveryDate < todayDateString) {
      setValidationError('Requested delivery date cannot be in the past.');
      return;
    }

    try {
      setIsProcessing(true);
      const res = await submitCustomerNegotiation(quoteId, {
        customerComment: questionText.trim(),
        requestedDeliveryDate: questionDeliveryDate || undefined,
      });

      setActionFeedback(res?.message || 'Your question / change request has been submitted to your account manager.');
      setQuestionText('');
      setQuestionDeliveryDate('');
      await fetchQuoteData();
    } catch (err) {
      setValidationError(err.response?.data?.message || err.message || 'Failed to submit question.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCounterSubmit = async (e) => {
    e?.preventDefault();
    setValidationError('');
    setActionFeedback('');
    setReApprovalAlert(false);

    const discountNum = Number(counterDiscount);
    if (counterDiscount === '' || isNaN(discountNum) || discountNum < 0 || discountNum > 100) {
      setValidationError('Please enter a valid counter-discount percentage between 0% and 100%.');
      return;
    }

    if (counterDeliveryDate && counterDeliveryDate < todayDateString) {
      setValidationError('Requested delivery date cannot be in the past.');
      return;
    }

    try {
      setIsProcessing(true);
      const res = await submitCustomerNegotiation(quoteId, {
        counterDiscount: discountNum,
        customerComment: counterComment.trim() || undefined,
        requestedDeliveryDate: counterDeliveryDate || undefined,
      });

      if (res?.reEnteredApproval || res?.data?.reEnteredApproval) {
        setReApprovalAlert(true);
        setActionFeedback(res.message || `Counter-discount (${discountNum}%) submitted. Routed to Sales Management for approval.`);
      } else {
        setActionFeedback(res?.message || `Counter-discount (${discountNum}%) applied and approved! You can now confirm the quotation.`);
        setActiveTab('confirm');
      }

      setCounterDiscount('');
      setCounterComment('');
      setCounterDeliveryDate('');
      await fetchQuoteData();
    } catch (err) {
      setValidationError(err.response?.data?.message || err.message || 'Failed to submit counter-discount.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmQuotation = async () => {
    try {
      setIsProcessing(true);
      setValidationError('');
      setShowConfirmModal(false);
      const res = await confirmCustomerQuote(quoteId);
      setActionFeedback(res?.message || 'Quotation confirmed! Order created and sent to fulfillment.');
      await fetchQuoteData();
    } catch (err) {
      setValidationError(err.response?.data?.message || err.message || 'Failed to confirm quotation.');
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Confirmed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-sm">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            <span>Confirmed</span>
          </span>
        );
      case 'Approved':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-sm">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            <span>Approved & Ready</span>
          </span>
        );
      case 'Pending Approval':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 shadow-sm">
            <Clock className="h-3.5 w-3.5 text-amber-600" />
            <span>Under Management Review</span>
          </span>
        );
      case 'Under Negotiation':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200 shadow-sm">
            <Clock className="h-3.5 w-3.5 text-blue-600" />
            <span>Under Negotiation</span>
          </span>
        );
      case 'Rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200 shadow-sm">
            <AlertCircle className="h-3.5 w-3.5 text-rose-600" />
            <span>Rejected</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-50 text-slate-800 border border-slate-200 shadow-sm">
            <Clock className="h-3.5 w-3.5 text-slate-600" />
            <span>{status || 'Draft'}</span>
          </span>
        );
    }
  };

  if (isLoading && !quote) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <CustomerNavbar quoteId={quoteId} />
        <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-16 text-center text-slate-600 font-medium">
          Loading secure quotation negotiation portal...
        </main>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <CustomerNavbar />
        <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-16 flex flex-col items-center justify-center text-center">
          <div className="h-14 w-14 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-4 shadow-sm">
            <AlertCircle className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Quote not found
          </h1>
          <p className="text-sm text-slate-600 mb-6 max-w-md">
            The quotation reference &quot;{quoteId}&quot; could not be found, belongs to another account, or is expired.
          </p>
          <Link
            to="/customer/quotes"
            className="inline-flex items-center justify-center rounded-md font-medium text-sm transition-colors bg-slate-900 text-white hover:bg-slate-800 h-10 px-5 shadow-sm"
          >
            Back to My Quotations
          </Link>
        </main>
      </div>
    );
  }

  const isConfirmed = quote.status === 'Confirmed';
  const isPendingApproval = quote.status === 'Pending Approval';
  const isUnderNegotiation = quote.status === 'Under Negotiation';
  const isRejected = quote.status === 'Rejected';
  const isApproved = quote.status === 'Approved';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <CustomerNavbar quoteId={quote.quoteId} />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        <div>
          <Link
            to="/customer/quotes"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to My Quotations</span>
          </Link>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-md bg-slate-100 text-slate-700">
                  <FileText className="h-5 w-5" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  Quotation #{quote.quoteId}
                </h1>
              </div>
              <p className="mt-2 text-sm text-slate-600">
                Prepared for <span className="font-semibold text-slate-800">{quote.customerName}</span>
              </p>
            </div>

            <div className="flex flex-col sm:items-end gap-1.5 shrink-0">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Current Status
              </span>
              {getStatusBadge(quote.status)}
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center sm:text-left">
            <div>
              <span className="text-xs text-slate-500 font-medium">Issue Date</span>
              <p className="text-sm font-semibold text-slate-900 mt-0.5">
                {quote.createdAt ? new Date(quote.createdAt).toLocaleDateString() : 'N/A'}
              </p>
            </div>
            <div>
              <span className="text-xs text-slate-500 font-medium">Delivery Date</span>
              <p className="text-sm font-semibold text-slate-900 mt-0.5">
                {quote.requestedDeliveryDate ? new Date(quote.requestedDeliveryDate).toLocaleDateString() : 'Standard (14 Days)'}
              </p>
            </div>
            <div>
              <span className="text-xs text-slate-500 font-medium">Total Discount</span>
              <p className="text-sm font-semibold text-emerald-600 mt-0.5">
                -${Number(quote.discountAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <span className="text-xs text-slate-500 font-medium">Contract Total</span>
              <p className="text-base font-bold text-slate-900 mt-0.5">
                ${Number(quote.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} {quote.currency}
              </p>
            </div>
          </div>
        </div>

        {actionFeedback && (
          <div 
            className={`p-4 rounded-lg border flex items-center gap-3 shadow-sm transition-all animate-in fade-in ${
              reApprovalAlert
                ? 'bg-amber-50 border-amber-300 text-amber-900'
                : 'bg-emerald-50 border-emerald-200 text-emerald-900'
            }`}
            role="status"
          >
            {reApprovalAlert ? (
              <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            )}
            <span className="text-sm font-semibold">
              {actionFeedback}
            </span>
          </div>
        )}

        {validationError && (
          <div 
            className="p-4 rounded-lg bg-rose-50 border border-rose-200 flex items-center gap-3 shadow-sm transition-all animate-in fade-in"
            role="alert"
          >
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
            <span className="text-sm font-medium text-rose-900">
              {validationError}
            </span>
          </div>
        )}

        {isConfirmed && (
          <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span className="text-sm font-medium text-emerald-800">
              This quotation is confirmed! Downstream fulfillment orders and invoices have been generated.
            </span>
          </div>
        )}

        {isPendingApproval && (
          <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 flex items-center gap-3">
            <Clock className="h-5 w-5 text-amber-600 shrink-0" />
            <span className="text-sm font-medium text-amber-800">
              Your counter-offer exceeds standard discount limits and is currently undergoing review by Sales Management. You will receive an updated status shortly.
            </span>
          </div>
        )}

        {isUnderNegotiation && (
          <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 flex items-center gap-3">
            <MessageSquare className="h-5 w-5 text-blue-600 shrink-0" />
            <span className="text-sm font-medium text-blue-800">
              Your question / change request is being reviewed by your account manager.
            </span>
          </div>
        )}

        <section aria-label="Quotation Products and Line Items" className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-slate-600" />
              <h2 className="text-base font-semibold text-slate-900">
                Products & Commercial Terms
              </h2>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              {(quote.lineItems || []).length} Item(s)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-slate-700 font-semibold text-xs uppercase tracking-wider">
                <tr>
                  <th scope="col" className="py-3.5 pl-6 pr-4">Product</th>
                  <th scope="col" className="py-3.5 px-4 text-center">Qty</th>
                  <th scope="col" className="py-3.5 px-4 text-right">Unit Price</th>
                  <th scope="col" className="py-3.5 px-4 text-right">Discount</th>
                  <th scope="col" className="py-3.5 px-4 text-right">Tax</th>
                  <th scope="col" className="py-3.5 pl-4 pr-6 text-right">Line Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {(!quote.lineItems || quote.lineItems.length === 0) ? (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-slate-500">
                      No line items found for this quotation.
                    </td>
                  </tr>
                ) : (
                  quote.lineItems.map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-4 pl-6 pr-4 font-medium text-slate-900">
                        <div>{item.productName}</div>
                        {item.sku && (
                          <div className="text-xs text-slate-400 mt-0.5">SKU: {item.sku}</div>
                        )}
                      </td>
                      <td className="py-4 px-4 text-center text-slate-700 font-medium">
                        {item.quantity}
                      </td>
                      <td className="py-4 px-4 text-right text-slate-700 font-medium">
                        ${Number(item.unitPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-4 px-4 text-right text-slate-700">
                        {Number(item.discountPercent || 0) > 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {item.discountPercent}%
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">0%</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-right text-slate-700 text-xs">
                        {item.taxPercent ? `${item.taxPercent}%` : '0%'}
                      </td>
                      <td className="py-4 pl-4 pr-6 text-right font-semibold text-slate-900">
                        ${Number(item.lineTotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-slate-50 p-6 border-t border-slate-200 flex justify-end">
            <div className="w-full sm:w-80 space-y-2.5 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span>${Number(quote.subtotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-medium">
                <span>Total Discount</span>
                <span>-${Number(quote.discountAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Estimated Tax</span>
                <span>+${Number(quote.taxAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between text-base font-bold text-slate-900">
                <span>Total Contract Value</span>
                <span>${Number(quote.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} {quote.currency}</span>
              </div>
            </div>
          </div>
        </section>

        {!isConfirmed && !isRejected && (
          <section className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
            <div className="border-b border-slate-200 bg-slate-50/50 p-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => { setActiveTab('counter'); setValidationError(''); }}
                className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-semibold transition-all ${
                  activeTab === 'counter'
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <TrendingDown className="h-4 w-4 text-indigo-600" />
                <span>Counter Discount</span>
              </button>

              <button
                type="button"
                onClick={() => { setActiveTab('question'); setValidationError(''); }}
                className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-semibold transition-all ${
                  activeTab === 'question'
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <HelpCircle className="h-4 w-4 text-blue-600" />
                <span>Ask Question / Request Change</span>
              </button>

              <button
                type="button"
                onClick={() => { setActiveTab('confirm'); setValidationError(''); }}
                className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-semibold transition-all ${
                  activeTab === 'confirm'
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <CheckCircle2 className={`h-4 w-4 ${isApproved ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span>Confirm Quotation</span>
                {isApproved && (
                  <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    Ready
                  </span>
                )}
              </button>
            </div>

            {activeTab === 'counter' && (
              <div className="p-6 space-y-6">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    Propose a Counter-Discount
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Enter your target discount percentage across this order. Proposals within standard policy thresholds update instantly; larger concessions are sent to Sales Management.
                  </p>
                </div>

                <form onSubmit={handleCounterSubmit} className="space-y-6">
                  <div>
                    <span className="block text-xs font-medium text-slate-600 mb-2">
                      Quick Discount Presets:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {[5, 10, 15, 20].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setCounterDiscount(preset.toString())}
                          className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                            counterDiscount === preset.toString()
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          {preset}% Discount
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <label htmlFor="counter-discount-input" className="block text-sm font-medium text-slate-700">
                        Counter Discount % *
                      </label>
                      <div className="relative rounded-md shadow-sm">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                          <Percent className="h-4 w-4" />
                        </div>
                        <input
                          id="counter-discount-input"
                          type="number"
                          min="0"
                          max="100"
                          step="0.5"
                          placeholder="e.g. 15"
                          value={counterDiscount}
                          onChange={(e) => {
                            setCounterDiscount(e.target.value);
                            if (validationError) setValidationError('');
                          }}
                          disabled={isProcessing}
                          className="block w-full rounded-md border border-slate-300 pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="counter-delivery-date" className="block text-sm font-medium text-slate-700">
                        Requested Delivery Date (Optional)
                      </label>
                      <div className="relative rounded-md shadow-sm">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                          <Calendar className="h-4 w-4" />
                        </div>
                        <input
                          id="counter-delivery-date"
                          type="date"
                          min={todayDateString}
                          value={counterDeliveryDate}
                          onChange={(e) => {
                            setCounterDeliveryDate(e.target.value);
                            if (validationError) setValidationError('');
                          }}
                          disabled={isProcessing}
                          className="block w-full rounded-md border border-slate-300 pl-10 pr-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="counter-comment-input" className="block text-sm font-medium text-slate-700">
                      Rationale / Message (Optional)
                    </label>
                    <textarea
                      id="counter-comment-input"
                      rows="2"
                      placeholder="e.g. In exchange for this discount, we can commit to standard payment terms..."
                      value={counterComment}
                      onChange={(e) => setCounterComment(e.target.value)}
                      disabled={isProcessing}
                      className="block w-full rounded-md border border-slate-300 p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>

                  {previewCalculation && (
                    <div className="p-4 rounded-lg bg-indigo-50/70 border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">
                          Live Contract Estimate ({previewCalculation.discountPercent}% Discount)
                        </span>
                        <p className="text-xs text-slate-600">
                          Estimated New Total: <strong className="text-slate-900 text-sm font-bold">${previewCalculation.estimatedTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                        </p>
                      </div>
                      <div className="bg-white px-3.5 py-1.5 rounded border border-indigo-200 text-center sm:text-right">
                        <span className="text-[11px] text-slate-500 block">Projected Savings</span>
                        <span className="text-sm font-extrabold text-emerald-600">
                          -${previewCalculation.savings.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end pt-2">
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={isProcessing || !counterDiscount}
                      className="sm:!w-auto px-6 bg-slate-900 hover:bg-slate-800 text-white"
                    >
                      Submit Counter-Discount
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {activeTab === 'question' && (
              <div className="p-6 space-y-6">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    Ask Question or Request Specification / Terms Change
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Submit questions regarding scope, product specifications, delivery schedules, or commercial terms directly to your account representative.
                  </p>
                </div>

                <form onSubmit={handleQuestionSubmit} className="space-y-6">
                  <div className="space-y-1.5">
                    <label htmlFor="question-text" className="block text-sm font-medium text-slate-700">
                      Your Question / Change Request *
                    </label>
                    <textarea
                      id="question-text"
                      rows="4"
                      placeholder="e.g. Can we adjust delivery to Phase 1 and Phase 2 shipments? Please clarify warranty coverage for Line 1..."
                      value={questionText}
                      onChange={(e) => {
                        setQuestionText(e.target.value);
                        if (validationError) setValidationError('');
                      }}
                      disabled={isProcessing}
                      required
                      className="block w-full rounded-md border border-slate-300 p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>

                  <div className="space-y-1.5 max-w-sm">
                    <label htmlFor="question-delivery-date" className="block text-sm font-medium text-slate-700">
                      Target Delivery Date (Optional)
                    </label>
                    <div className="relative rounded-md shadow-sm">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                        <Calendar className="h-4 w-4" />
                      </div>
                      <input
                        id="question-delivery-date"
                        type="date"
                        min={todayDateString}
                        value={questionDeliveryDate}
                        onChange={(e) => setQuestionDeliveryDate(e.target.value)}
                        disabled={isProcessing}
                        className="block w-full rounded-md border border-slate-300 pl-10 pr-4 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={isProcessing || !questionText.trim()}
                      className="sm:!w-auto px-6 bg-slate-900 hover:bg-slate-800 text-white"
                    >
                      Send Question to Account Manager
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {activeTab === 'confirm' && (
              <div className="p-6 space-y-6">
                {isApproved ? (
                  <div className="space-y-4">
                    <div className="p-5 rounded-lg bg-emerald-50/70 border border-emerald-200">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="h-6 w-6 text-emerald-600 mt-0.5 shrink-0" />
                        <div>
                          <h4 className="text-base font-bold text-emerald-950">
                            Quotation Approved & Ready for Confirmation
                          </h4>
                          <p className="text-sm text-emerald-800 mt-1 leading-relaxed">
                            All pricing and discount rules have been approved. You can confirm this quotation to place your order into fulfillment.
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-emerald-200/60 flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <span className="text-xs text-emerald-700 font-medium">Final Contract Value</span>
                          <p className="text-xl font-extrabold text-emerald-950">
                            ${Number(quote.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} {quote.currency}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="primary"
                          onClick={() => setShowConfirmModal(true)}
                          disabled={isProcessing}
                          className="sm:!w-auto px-6 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm font-semibold text-sm"
                        >
                          Confirm Quotation & Place Order
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 rounded-lg bg-slate-50 border border-slate-200 text-center space-y-3">
                    <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center mx-auto">
                      <Info className="h-5 w-5" />
                    </div>
                    <h4 className="text-base font-semibold text-slate-800">
                      Quotation Confirmation Awaiting Approval
                    </h4>
                    <p className="text-sm text-slate-600 max-w-md mx-auto">
                      {isPendingApproval
                        ? 'Your quotation currently has a counter-discount proposal under review by Sales Management. Once approved, the confirmation button will be enabled.'
                        : 'Please review line items or propose terms. Once approved, you can confirm this quotation online.'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        <section aria-label="Negotiation History" className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
            <History className="h-4 w-4 text-slate-600" />
            <h2 className="text-base font-semibold text-slate-900">
              Negotiation & Activity History
            </h2>
          </div>

          {historyItems.length === 0 ? (
            <p className="text-sm text-slate-500 py-4 text-center">
              No previous negotiation rounds on this quotation yet.
            </p>
          ) : (
            <div className="space-y-3 pt-1">
              {historyItems.map((item, idx) => (
                <div 
                  key={item.id || idx} 
                  className="p-4 rounded-lg border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-start justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                        item.type === 'counter_discount'
                          ? 'bg-indigo-100 text-indigo-800'
                          : item.type === 'audit_event'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {item.type === 'counter_discount'
                          ? 'Counter Discount'
                          : item.type === 'audit_event'
                          ? 'Workflow Event'
                          : 'Customer Inquiry'}
                      </span>

                      {item.discount > 0 && (
                        <span className="text-xs font-bold text-emerald-700">
                          Proposed {item.discount}% Discount
                        </span>
                      )}

                      <span className="text-xs text-slate-400">
                        {item.createdAt ? new Date(item.createdAt).toLocaleString() : ''}
                      </span>
                    </div>

                    <div className="text-sm text-slate-800 font-medium pt-0.5">
                      {item.title}
                    </div>

                    {item.comment && (
                      <div className="flex items-start gap-2 text-xs text-slate-600 mt-1 bg-white p-2.5 rounded border border-slate-200/70">
                        <MessageSquare className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                        <span>{item.comment}</span>
                      </div>
                    )}
                  </div>

                  <div className="shrink-0 sm:self-center">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                      item.status === 'Approved' 
                        ? 'bg-emerald-100 text-emerald-800' 
                        : item.status === 'Under Review' || item.status === 'Pending' || item.status === 'Pending Approval'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-200 text-slate-800'
                    }`}>
                      {item.status || 'Logged'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </main>

      {showConfirmModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 px-4 py-6 sm:py-10 flex items-center justify-center" role="dialog" aria-modal="true">
          <div className="mx-auto max-w-md w-full rounded-xl bg-white shadow-2xl overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-base">Confirm Quotation</h3>
                  <p className="text-xs text-slate-300">
                    Order Placement Confirmation
                  </p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setShowConfirmModal(false)} 
                className="text-slate-400 hover:text-white rounded-md p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-600 leading-relaxed">
                By confirming, you agree to the commercial terms and line items outlined in quotation <strong className="text-slate-900 font-mono">#{quote.quoteId}</strong>.
              </p>

              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2 text-xs text-slate-700">
                <div className="flex justify-between">
                  <span className="text-slate-500">Customer:</span>
                  <span className="font-medium">{quote.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Line Items:</span>
                  <span className="font-medium">{(quote.lineItems || []).length} Products</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Discount:</span>
                  <span className="font-medium text-emerald-700">-${Number(quote.discountAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-bold text-slate-900">
                  <span>Final Total:</span>
                  <span>${Number(quote.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} {quote.currency}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowConfirmModal(false)}
                  className="sm:!w-auto px-4"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleConfirmQuotation}
                  disabled={isProcessing}
                  className="sm:!w-auto px-5 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Confirm & Place Order
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default CustomerPortal;
