import React, { useState } from 'react';
import { MessageSquare, Send, User, Shield, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/Button';

export const QuotationConversationPanel = ({
  messages = [],
  customerName = 'Customer',
  quoteCode = '',
  onSendReply,
  isSending = false,
  readOnly = false,
}) => {
  const [replyText, setReplyText] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setError('');
    setSuccess('');

    const trimmed = replyText.trim();
    if (!trimmed) {
      setError('Please enter a message before sending.');
      return;
    }

    if (trimmed.length > 2000) {
      setError('Message cannot exceed 2000 characters.');
      return;
    }

    try {
      await onSendReply(trimmed);
      setReplyText('');
      setSuccess('Reply sent to customer successfully.');
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to send reply.');
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-6 py-4">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Customer Negotiation & Conversation
            </h2>
            <p className="text-xs text-slate-500">
              Two-way messaging with {customerName} for Quotation #{quoteCode}
            </p>
          </div>
        </div>
        <span className="text-xs font-medium text-slate-500 bg-white border border-slate-200 rounded-full px-3 py-1">
          {messages.length} {messages.length === 1 ? 'Message' : 'Messages'}
        </span>
      </div>

      {/* Message history */}
      <div className="p-6 space-y-4 max-h-[420px] overflow-y-auto">
        {messages.length === 0 ? (
          <div className="text-center py-10 px-4">
            <div className="mx-auto h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
              <MessageSquare className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium text-slate-700">No conversation messages yet</p>
            <p className="text-xs text-slate-500 mt-1">
              Customer questions and counter-offer comments for this quotation will appear here.
            </p>
          </div>
        ) : (
          messages.map((item, idx) => {
            const isRep =
              item.senderRole === 'sales_rep' ||
              item.senderRole === 'Sales Representative' ||
              item.messageType === 'sales_reply';
            const isCounter =
              item.messageType === 'counter_offer' ||
              (item.requestedDiscount !== null && item.requestedDiscount !== undefined);

            return (
              <div
                key={item.id || idx}
                className={`p-4 rounded-xl border transition-all ${
                  isRep
                    ? 'bg-blue-50/50 border-blue-200 ml-6 sm:ml-12'
                    : isCounter
                    ? 'bg-amber-50/50 border-amber-200 mr-6 sm:mr-12'
                    : 'bg-slate-50/80 border-slate-200 mr-6 sm:mr-12'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/50 pb-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        isRep
                          ? 'bg-blue-600 text-white'
                          : isCounter
                          ? 'bg-amber-600 text-white'
                          : 'bg-slate-600 text-white'
                      }`}
                    >
                      {isRep ? <Shield className="h-3 w-3" /> : <User className="h-3 w-3" />}
                    </div>
                    <span className="text-xs font-bold text-slate-900">
                      {item.senderName || (isRep ? 'Sales Representative' : customerName)}
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        isRep
                          ? 'bg-blue-100 text-blue-800'
                          : isCounter
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {isRep
                        ? 'Sales Rep Reply'
                        : isCounter
                        ? `Counter-Offer (${item.requestedDiscount}%)`
                        : 'Customer Inquiry'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    <Clock className="h-3 w-3" />
                    <span>
                      {item.createdAt
                        ? new Date(item.createdAt).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Recent'}
                    </span>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                  {item.message || item.customerComment}
                </p>

                {isCounter && (
                  <div className="mt-2 pt-2 border-t border-amber-200/60 flex items-center justify-between text-[11px] text-amber-800 font-medium">
                    <span>Requested discount on {item.productName || 'quotation line items'}:</span>
                    <span className="font-bold">{item.requestedDiscount}%</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Reply Composer */}
      {!readOnly && (
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 border-t border-slate-100 bg-slate-50/30">
          {error && (
            <div className="mb-3 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-3 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="rep-reply-textarea" className="block text-xs font-semibold text-slate-700">
              Reply to Customer
            </label>
            <textarea
              id="rep-reply-textarea"
              rows="3"
              value={replyText}
              onChange={(e) => {
                setReplyText(e.target.value);
                if (error) setError('');
              }}
              placeholder={`Write a message to ${customerName} regarding their inquiry or counter-offer...`}
              disabled={isSending}
              maxLength={2000}
              className="block w-full rounded-lg border border-slate-300 p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
            />
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-400">
                {replyText.length} / 2000 characters · Replies will notify the customer immediately
              </span>
              <Button
                type="submit"
                variant="primary"
                disabled={isSending || !replyText.trim()}
                isLoading={isSending}
                className="sm:!w-auto px-4 py-2 text-xs gap-1.5 bg-slate-900 hover:bg-slate-800 text-white"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Send Reply</span>
              </Button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};

export default QuotationConversationPanel;
