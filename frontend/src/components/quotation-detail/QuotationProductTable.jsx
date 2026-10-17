import React, { useState } from 'react';
import { AlertCircle, Plus, Trash2, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/Button';

export const QuotationProductTable = ({
  products = [],
  availableCatalog = [],
  onUpdateQuantity,
  onUpdateDiscount,
  onRemoveItem,
  onAddItem,
  readOnly = false,
  overallMargin = 0,
  blendedRisk = 'LOW',
  subtotal = 0,
  totalDiscount = 0,
  taxAmount = 0,
  totalAmount = 0,
  currency = 'USD'
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [selectedVariants, setSelectedVariants] = useState({});

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-900">
          Quotation Line Items ({products.length})
        </h2>
        {!readOnly && (
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowPicker(!showPicker)}
            className="sm:!w-auto text-xs px-3 py-1.5 gap-1.5 border-slate-300 text-slate-700 hover:bg-slate-100"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Product to Quote</span>
          </Button>
        )}
      </div>

      {showPicker && availableCatalog.length > 0 && (
        <div className="p-4 bg-slate-100 rounded-lg border border-slate-300 space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-700">
              Select Product to Add from Catalog
            </span>
            <button
              type="button"
              onClick={() => setShowPicker(false)}
              className="text-xs text-slate-500 hover:text-slate-800"
            >
              Close ✕
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {availableCatalog.map((catItem) => (
              <div key={catItem.id} className="p-2.5 bg-white border border-slate-200 rounded text-left hover:border-slate-400 hover:shadow-sm transition-all">
                <div className="font-semibold text-xs text-slate-900 truncate">{catItem.name}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">{catItem.category} • Price resolved from selected price list</div>
                {catItem.variants?.length > 0 && (
                  <select
                    value={selectedVariants[catItem.id] || ''}
                    onChange={(event) => setSelectedVariants((current) => ({ ...current, [catItem.id]: event.target.value }))}
                    className="mt-2 w-full rounded border border-slate-300 px-2 py-1 text-xs"
                  >
                    <option value="">Base product</option>
                    {catItem.variants.map((variant) => (
                      <option key={variant.id} value={variant.id}>{variant.variant_name || variant.variantName} {variant.attributes ? `(${Object.values(variant.attributes).join(', ')})` : ''}</option>
                    ))}
                  </select>
                )}
                <button type="button" onClick={() => { onAddItem?.({ ...catItem, productVariantId: selectedVariants[catItem.id] || null }); setShowPicker(false); }} className="mt-2 w-full rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                  Add product
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-slate-700 font-semibold">
              <tr>
                <th scope="col" className="py-3.5 pl-6 pr-3">Product</th>
                <th scope="col" className="px-3 py-3.5 text-center">Qty</th>
                <th scope="col" className="px-3 py-3.5">Price</th>
                <th scope="col" className="px-3 py-3.5">Discount %</th>
                <th scope="col" className="px-3 py-3.5">Limit</th>
                <th scope="col" className="px-3 py-3.5">Line Total</th>
                <th scope="col" className="px-3 py-3.5">Status</th>
                <th scope="col" className="py-3.5 pr-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {products.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-500">
                    No products added to this quotation yet. Click "+ Add Product to Quote" to start.
                  </td>
                </tr>
              ) : (
                products.map((item) => {
                  const isOverLimit = item.riskStatus === 'OVER' || item.status === 'OVER' || Number(item.overBy) > 0;

                  return (
                    <tr key={item.id || item.productId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 pl-6 pr-3 font-medium text-slate-900">
                        <div>{item.name}</div>
                        <div className="text-xs text-slate-400 font-normal">{item.category}</div>
                      </td>
                      <td className="px-3 py-3.5 text-center">
                        <div className="inline-flex items-center border border-slate-300 rounded shadow-sm bg-white">
                          <button
                            type="button"
                            disabled={readOnly}
                            onClick={() => onUpdateQuantity && onUpdateQuantity(item.id, Math.max(1, Number(item.quantity || 1) - 1))}
                            className="px-2 py-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            -
                          </button>
                          <span className="px-2.5 py-1 text-xs font-semibold text-slate-800 min-w-[24px]">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            disabled={readOnly}
                            onClick={() => onUpdateQuantity && onUpdateQuantity(item.id, Number(item.quantity || 1) + 1)}
                            className="px-2 py-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td className="px-3 py-3.5 text-slate-800 font-medium">
                        {formatCurrency(item.price)}
                      </td>
                      <td className="px-3 py-3.5 text-slate-700">
                        <div className="relative inline-flex items-center w-20">
                          <input
                            type="number"
                            disabled={readOnly}
                            min="0"
                            max="100"
                            value={item.discount}
                            onChange={(e) => onUpdateDiscount && onUpdateDiscount(item.id, Number(e.target.value))}
                            className={`w-full text-right pr-6 pl-2 py-1 text-xs border rounded font-semibold focus:outline-none focus:ring-1 disabled:cursor-not-allowed disabled:bg-slate-100 ${
                              isOverLimit
                                ? 'border-rose-400 text-rose-700 bg-rose-50/50 focus:ring-rose-500'
                                : 'border-slate-300 text-slate-800 focus:ring-slate-900'
                            }`}
                          />
                          <span className="absolute right-2 text-xs text-slate-400 pointer-events-none">%</span>
                        </div>
                      </td>
                      <td className="px-3 py-3.5 text-slate-500 font-medium">
                        {item.discountLimit}%
                      </td>
                      <td className="px-3 py-3.5 text-slate-900 font-semibold">
                        {formatCurrency(item.lineTotal)}
                      </td>
                      <td className="px-3 py-3.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${
                            isOverLimit
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          {isOverLimit ? `OVER (+${item.overBy || Math.max(0, item.discount - item.discountLimit)}pt)` : 'OK'}
                        </span>
                      </td>
                      <td className="py-3.5 pr-6 text-right">
                        <button
                          type="button"
                          disabled={readOnly}
                          onClick={() => onRemoveItem && onRemoveItem(item.id)}
                          className="text-slate-400 hover:text-rose-600 p-1 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                          title="Remove item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="bg-slate-50 p-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-xs text-slate-500 block">Overall Margin</span>
              <span className="text-sm font-bold text-emerald-700">
                {Number(overallMargin).toFixed(1)}%
              </span>
            </div>
            <div className="h-6 w-px bg-slate-300" />
            <div>
              <span className="text-xs text-slate-500 block">Blended Risk Rating</span>
              <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full border ${
                blendedRisk === 'HIGH' 
                  ? 'bg-rose-100 text-rose-800 border-rose-300' 
                  : blendedRisk === 'MEDIUM' 
                  ? 'bg-amber-100 text-amber-800 border-amber-300' 
                  : 'bg-emerald-100 text-emerald-800 border-emerald-300'
              }`}>
                {blendedRisk === 'HIGH' && <ShieldAlert className="h-3 w-3" />}
                {blendedRisk === 'LOW' && <CheckCircle2 className="h-3 w-3" />}
                <span>{blendedRisk} RISK</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-6 text-right">
            <div>
              <span className="text-xs text-slate-500 block">Subtotal</span>
              <span className="text-xs font-semibold text-slate-700">{formatCurrency(subtotal)}</span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Discount</span>
              <span className="text-xs font-semibold text-rose-600">-{formatCurrency(totalDiscount)}</span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Tax</span>
              <span className="text-xs font-semibold text-slate-700">{formatCurrency(taxAmount)}</span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Total</span>
              <span className="text-base font-bold text-slate-900">{formatCurrency(totalAmount)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
        <p className="text-sm text-amber-800 font-medium">
          Discount is checked against each line's own limit as soon as it is entered. Over-limit discounts will trigger approval routing to the Sales Manager and Finance.
        </p>
      </div>
    </div>
  );
};

export default QuotationProductTable;
