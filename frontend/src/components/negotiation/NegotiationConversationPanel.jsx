import React, { useState } from 'react';
import { 
  MessageSquare, 
  Send, 
  User, 
  Briefcase, 
  ShieldCheck, 
  Clock, 
  AlertCircle,
  Tag,
  CheckCircle2,
  Info
} from 'lucide-react';
import { sendQuotationMessage } from '../../services/quotationService';
import { Button } from '../ui/Button';

export const NegotiationConversationPanel = ({ 
  quotation, 
  currentUser, 
  messages = [], 
  onMessageSent 
}) => {
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const quoteId = quotation?.quoteCode || quotation?.id;
  const isFinalized = ['Confirmed', 'Rejected'].includes(quotation?.status);

  const handleSendReply = async (e) => {
    e?.preventDefault();
    if (!replyText.trim()) {
      setErrorMsg('Please enter a reply message before sending.');
      return;
    }
    if (replyText.trim().length > 2000) {
      setErrorMsg('Message exceeds the maximum limit of 2,000 characters.');
      return;
    }

    try {
      setIsSending(true);
      setErrorMsg('');
      setSuccessMsg('');

      await sendQuotationMessage(quoteId, replyText.trim());

      setReplyText('');
      setSuccessMsg('Reply sent to customer successfully.');
      setTimeout(() => setSuccessMsg(''), 4000);

      if (onMessageSent) {
        await onMessageSent();
      }
    } catch (err) {
      console.error('Failed to send negotiation reply:', err);
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to send reply to customer.');
    } finally {
      setIsSending(false);
    }
  };

  const getSenderRoleBadge = (role, senderName) => {
    const normRole = (role || '').toLowerCase();
    if (normRole === 'customer') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
          <User className="h-3 w-3" />
          <span>Customer</span>
        </span>
      );
    }
    if (normRole === 'sales_rep') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
          <Briefcase className="h-3 w-3" />
          <span>Sales Representative</span>
        </span>
      );
    }
    if (normRole === 'sales_manager' || normRole === 'admin') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
          <ShieldCheck className="h-3 w-3" />
          <span className="capitalize">{normRole.replace('_', ' ')}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
        <span>{role || 'Participant'}</span>
      </span>
    );
  };

  return (
    <section 
      aria-label="Quotation Negotiation Conversation" 
      className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden"
    >
      <div className="border-b border-slate-200 px-6 py-4 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Customer Negotiation & Conversation
            </h2>
            <p className="text-xs text-slate-500">
              Direct two-way messaging between {quotation?.customerName || 'the Customer'} and Sales Representative.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500">Quotation Context:</span>
          <span className="font-semibold text-slate-800">{quoteId}</span>
          <span className="text-slate-300">•</span>
          <span className="px-2 py-0.5 rounded font-medium bg-slate-100 text-slate-700 border border-slate-200">
            {quotation?.status || 'Draft'}
          </span>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Messages List */}
        <div className="space-y-4 max-h-[460px] overflow-y-auto pr-1">
          {(!messages || messages.length === 0) ? (
            <div className="text-center py-8 px-4 border border-dashed border-slate-200 rounded-lg bg-slate-50/50">
              <MessageSquare className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-700">No negotiation messages on this quotation yet.</p>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Customer questions, counter-offers, and Sales Representative responses will appear here chronologically.
              </p>
            </div>
          ) : (
            messages.map((item, idx) => {
              const isCust = (item.senderRole || '').toLowerCase() === 'customer';
              const hasDiscount = item.requestedDiscount !== null && item.requestedDiscount !== undefined && Number(item.requestedDiscount) > 0;
              const textContent = item.message || item.customerComment || '';

              return (
                <div 
                  key={item.id || idx}
                  className={`p-4 rounded-lg border transition-all ${
                    isCust 
                      ? 'bg-slate-50/80 border-slate-200/80 mr-4 sm:mr-8' 
                      : 'bg-indigo-50/50 border-indigo-100 ml-4 sm:ml-8'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
                    <div className="flex items-center gap-2">
                      {getSenderRoleBadge(item.senderRole, item.senderName)}
                      <span className="text-xs font-semibold text-slate-800">
                        {item.senderName || (isCust ? (quotation?.customerName || 'Customer') : 'Sales Representative')}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{item.createdAt ? new Date(item.createdAt).toLocaleString() : ''}</span>
                    </div>
                  </div>

                  {/* Counter-offer notice if present */}
                  {hasDiscount && (
                    <div className="mt-2.5 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-semibold">
                        <Tag className="h-3.5 w-3.5 text-amber-600" />
                        <span>Counter-Discount Proposal: {item.requestedDiscount}%</span>
                      </div>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 uppercase tracking-wide">
                        {item.status || 'Under Review'}
                      </span>
                    </div>
                  )}

                  {/* Message body */}
                  <div className="mt-2.5 text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                    {textContent || (hasDiscount ? 'Proposed counter-discount terms.' : 'No message body provided.')}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Reply Composer */}
        <div className="pt-4 border-t border-slate-200">
          {errorMsg && (
            <div className="mb-3 p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-3 p-3 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {isFinalized ? (
            <div className="p-4 rounded-md bg-slate-100 border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
              <Info className="h-4 w-4 text-slate-500 shrink-0" />
              <span>
                This quotation has been <strong>{quotation?.status}</strong>. New negotiation messages can no longer be sent.
              </span>
            </div>
          ) : (
            <form onSubmit={handleSendReply} className="space-y-3">
              <div>
                <label htmlFor="negotiationReply" className="block text-xs font-medium text-slate-700 mb-1">
                  Reply to Customer
                </label>
                <textarea
                  id="negotiationReply"
                  rows={3}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={`Write your response to ${quotation?.customerName || 'the customer'}... (e.g. clarification on pricing, tiered quantity discount, or delivery expectations)`}
                  disabled={isSending}
                  className="w-full rounded-md border border-slate-300 p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 transition-colors"
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Info className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span>
                    Replies notify the customer in-app. Ordinary replies do not alter quotation commercial terms or approvals.
                  </span>
                </div>

                <div className="flex items-center justify-end gap-3 shrink-0">
                  <span className="text-xs text-slate-400">
                    {replyText.length}/2000
                  </span>
                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={isSending}
                    disabled={isSending || !replyText.trim()}
                    className="gap-2 sm:!w-auto px-5"
                  >
                    <Send className="h-4 w-4" />
                    <span>Send Reply</span>
                  </Button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
};

export default NegotiationConversationPanel;
