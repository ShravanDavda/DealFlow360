import React from 'react';
import { Package, Layers, Tag } from 'lucide-react';

/**
 * ProductSummary - Displays summary metric cards for the Product Catalog:
 * Total Products, Pricelists, and Variants.
 * 
 * @param {Object} props
 * @param {Object} props.summary - { totalProducts, archivedProducts, priceLists, currencies, variants }
 */
export const ProductSummary = ({
  summary = {
    totalProducts: 128,
    archivedProducts: 6,
    priceLists: 3,
    currencies: 2,
    variants: 340,
  },
}) => {
  const cards = [
    {
      id: 'total-products',
      title: 'Total Products',
      value: summary.totalProducts,
      supportingText: `${summary.totalProducts} active, ${summary.archivedProducts} archived`,
      icon: <Package className="h-5 w-5 text-blue-600" />,
      badgeBg: 'bg-blue-50 border-blue-100',
    },
    {
      id: 'pricelists',
      title: 'Pricelists',
      value: `${summary.priceLists} tiers`,
      supportingText: `${summary.priceLists} tiers, ${summary.currencies} currencies`,
      icon: <Tag className="h-5 w-5 text-amber-600" />,
      badgeBg: 'bg-amber-50 border-amber-100',
    },
    {
      id: 'variants',
      title: 'Variants',
      value: summary.variants,
      supportingText: `${summary.variants} SKUs across all products`,
      icon: <Layers className="h-5 w-5 text-indigo-600" />,
      badgeBg: 'bg-indigo-50 border-indigo-100',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {cards.map((card) => (
        <div
          key={card.id}
          className="bg-white p-6 shadow-sm border border-slate-200 rounded-lg flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-600">
              {card.title}
            </h3>
            <div className={`p-2 rounded-lg border ${card.badgeBg}`}>
              {card.icon}
            </div>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-bold tracking-tight text-slate-900">
              {card.value}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {card.supportingText}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProductSummary;
