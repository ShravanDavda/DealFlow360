import React from 'react';
import { Clock, AlertTriangle, Truck } from 'lucide-react';

export const DealHealthSummary = ({ 
  summary = {
    stalledDeals: 5,
    discountAnomalies: 2,
    deliverySlippage: 3,
  } 
}) => {
  const cards = [
    {
      id: 'stalled-deals',
      title: 'Stalled Deals',
      value: summary.stalledDeals,
      supportingText: `${summary.stalledDeals} quotes idle / >7 days`,
      icon: <Clock className="h-5 w-5 text-amber-600" />,
      badgeBg: 'bg-amber-50 border-amber-100',
    },
    {
      id: 'discount-anomalies',
      title: 'Discount Anomalies',
      value: summary.discountAnomalies,
      supportingText: `${summary.discountAnomalies} above rep average`,
      icon: <AlertTriangle className="h-5 w-5 text-rose-600" />,
      badgeBg: 'bg-rose-50 border-rose-100',
    },
    {
      id: 'delivery-slippage',
      title: 'Delivery Slippage',
      value: summary.deliverySlippage,
      supportingText: `${summary.deliverySlippage} promise dates at risk`,
      icon: <Truck className="h-5 w-5 text-indigo-600" />,
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
            <h2 className="text-sm font-medium text-slate-600">
              {card.title}
            </h2>
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

export default DealHealthSummary;
