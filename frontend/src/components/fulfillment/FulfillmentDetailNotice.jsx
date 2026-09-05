import React from 'react';
import { AlertCircle } from 'lucide-react';

/**
 * FulfillmentDetailNotice - Displays the automated consolidation notice below the split table.
 */
export const FulfillmentDetailNotice = () => {
  return (
    <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-3">
      <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
      <p className="text-sm text-amber-800 font-medium">
        &quot;Consolidate Remaining Backorder&quot; prompt appears automatically once East Depot restocks.
      </p>
    </div>
  );
};

export default FulfillmentDetailNotice;
