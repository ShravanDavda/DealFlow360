import React from 'react';
import { Package } from 'lucide-react';

/**
 * ProductGeneralInfo - Displays general product specifications and pricing metadata.
 * 
 * @param {Object} props
 * @param {Object} props.product - Detailed product object
 */
export const ProductGeneralInfo = ({ product }) => {
  if (!product) return null;

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 space-y-6">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
        <Package className="h-5 w-5 text-slate-700" />
        <h2 className="text-base font-semibold text-slate-900">
          Product and pricelist
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12 text-sm">
        {/* Left Column */}
        <div className="space-y-4">
          <div>
            <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Product Name
            </span>
            <span className="mt-1 block font-semibold text-slate-900 text-base">
              {product.name}
            </span>
          </div>

          <div>
            <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Category
            </span>
            <span className="mt-1 inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200">
              {product.category}
            </span>
          </div>

          <div>
            <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Price
            </span>
            <span className="mt-1 block font-semibold text-slate-900 text-base">
              {product.priceFormatted || `$${product.price}`}
            </span>
          </div>

          <div>
            <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Unit
            </span>
            <span className="mt-1 block text-slate-800">
              {product.unit}
            </span>
          </div>

          <div>
            <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Description
            </span>
            <span className="mt-1 block text-slate-600 leading-relaxed">
              {product.description || '-'}
            </span>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          <div>
            <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Tax %
            </span>
            <span className="mt-1 block font-medium text-slate-900">
              {product.tax || `${product.taxPercent || 0}%`}
            </span>
          </div>

          <div>
            <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Subscription
            </span>
            <span className="mt-1 block text-slate-800">
              {product.isSubscription ? 'Yes' : 'No'}
            </span>
          </div>

          <div>
            <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Recurring
            </span>
            <span className="mt-1 block text-slate-800">
              {product.recurring || product.recurringCycle || '-'}
            </span>
          </div>

          <div>
            <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Quantity on Hand
            </span>
            <span className="mt-1 block font-semibold text-slate-900">
              {product.quantityOnHand !== undefined && product.quantityOnHand !== null
                ? product.quantityOnHand
                : '-'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductGeneralInfo;
