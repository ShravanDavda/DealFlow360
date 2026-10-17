import React from 'react';
import { AlertCircle } from 'lucide-react';

export const FulfillmentNotice = () => {
  return (
    <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-3">
      <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
      <p className="text-sm text-amber-800 font-medium">
        Click an order row to open its warehouse split detail.
      </p>
    </div>
  );
};

export default FulfillmentNotice;
