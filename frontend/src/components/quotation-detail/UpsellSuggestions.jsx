import React from 'react';
import { Plus, Check, Sparkles } from 'lucide-react';

export const UpsellSuggestions = ({
  suggestions = [],
  selectedIds = [],
  onToggleSuggestion,
  readOnly = false,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-slate-700" />
        <h2 className="text-base font-semibold text-slate-900">
          Upsell and Cross-Sell Suggestions
        </h2>
      </div>

      {readOnly && (
        <p className="text-sm text-slate-500">
          Upsell and cross-sell recommendations are configured by Admin and applied by the Sales Representative while editing a quotation.
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {suggestions.map((item) => {
          const isSelected = selectedIds.includes(item.id);

          return (
            <div
              key={item.id}
              onClick={readOnly ? undefined : () => onToggleSuggestion && onToggleSuggestion(item)}
              role={readOnly ? undefined : 'button'}
              tabIndex={readOnly ? undefined : 0}
              onKeyDown={(e) => {
                if (readOnly) return;
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onToggleSuggestion && onToggleSuggestion(item);
                }
              }}
              className={`p-4 rounded-lg border text-left transition-all ${readOnly ? '' : 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-900'} ${
                isSelected
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : 'bg-white text-slate-900 border-slate-200 shadow-sm hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-sm">
                  {item.name.startsWith('+') ? item.name : `+ ${item.name}`}
                </span>
                <div
                  className={`h-6 w-6 rounded-full flex items-center justify-center text-xs shrink-0 ${
                    isSelected
                      ? 'bg-white text-slate-900'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {readOnly ? null : isSelected ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                </div>
              </div>
              <p
                className={`mt-2 text-xs font-medium ${
                  isSelected ? 'text-slate-300' : 'text-slate-500'
                }`}
              >
                {item.detail}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default UpsellSuggestions;
