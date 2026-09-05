import React from 'react';
import { FileText, Clock, TrendingUp } from 'lucide-react';

/**
 * ReportSummary - Renders the three summary metric cards for the reporting dashboard:
 * Quotes Created, Avg Approval Time, and Top Upsell Product.
 * 
 * @param {Object} props
 * @param {Object} props.metrics - { quotesCreated, avgApprovalTime, topUpsellProduct }
 */
export const ReportSummary = ({
  metrics = {
    quotesCreated: 148,
    avgApprovalTime: '6.4 hours',
    topUpsellProduct: 'Care Plan 2yr',
  },
}) => {
  const cards = [
    {
      id: 'quotes-created',
      title: 'Quotes Created',
      value: metrics.quotesCreated,
      supportingText: `${metrics.quotesCreated} this month`,
      icon: <FileText className="h-5 w-5 text-blue-600" />,
      badgeBg: 'bg-blue-50 border-blue-100',
    },
    {
      id: 'avg-approval-time',
      title: 'Avg Approval Time',
      value: metrics.avgApprovalTime,
      supportingText: metrics.avgApprovalTime,
      icon: <Clock className="h-5 w-5 text-amber-600" />,
      badgeBg: 'bg-amber-50 border-amber-100',
    },
    {
      id: 'top-upsell-product',
      title: 'Top Upsell Product',
      value: metrics.topUpsellProduct,
      supportingText: metrics.topUpsellProduct,
      icon: <TrendingUp className="h-5 w-5 text-emerald-600" />,
      badgeBg: 'bg-emerald-50 border-emerald-100',
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

export default ReportSummary;
