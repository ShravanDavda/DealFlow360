import React from 'react';
import { User, Tag } from 'lucide-react';

/**
 * QuotationInfo - Displays the Customer and Price List details.
 * 
 * @param {Object} props
 * @param {string} props.customerName - Name of the customer
 * @param {string} props.priceList - Active price list name
 */
export const QuotationInfo = ({ customerName, priceList }) => {
  return (
    <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Customer Field */}
        <div>
          <label 
            htmlFor="customer-name" 
            className="block text-sm font-medium text-slate-700 mb-1.5"
          >
            Customer
          </label>
          <div className="relative">
            <input
              id="customer-name"
              type="text"
              readOnly
              value={customerName || ''}
              className="w-full rounded-md border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-900 shadow-sm focus:outline-none cursor-default"
            />
            <div className="absolute right-3 top-2.5 text-slate-400 pointer-events-none">
              <User className="h-4 w-4" />
            </div>
          </div>
        </div>

        {/* Price List Field */}
        <div>
          <label 
            htmlFor="price-list" 
            className="block text-sm font-medium text-slate-700 mb-1.5"
          >
            Price List
          </label>
          <div className="relative">
            <input
              id="price-list"
              type="text"
              readOnly
              value={priceList || ''}
              className="w-full rounded-md border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-900 shadow-sm focus:outline-none cursor-default"
            />
            <div className="absolute right-3 top-2.5 text-slate-400 pointer-events-none">
              <Tag className="h-4 w-4" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuotationInfo;
