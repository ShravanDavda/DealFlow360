import React from 'react';
import { Filter } from 'lucide-react';

/**
 * ReportFilters - Renders the horizontal 4-field filter controls for the reporting dashboard:
 * Period, Sales Team, Approval Status, Product.
 * 
 * @param {Object} props
 * @param {Object} props.filters - Current filter values { period, salesTeam, approvalStatus, product }
 * @param {Object} props.options - Available filter options { periods, salesTeams, approvalStatuses, products }
 * @param {Function} props.onFilterChange - Callback when any filter changes: (field, value) => void
 */
export const ReportFilters = ({
  filters = {
    period: 'This Month',
    salesTeam: 'All Teams',
    approvalStatus: 'All',
    product: 'All Products',
  },
  options = {
    periods: ['This Month', 'Last Month', 'This Quarter'],
    salesTeams: ['All Teams', 'Enterprise', 'SMB'],
    approvalStatuses: ['All', 'Pending', 'Approved', 'Returned'],
    products: ['All Products', 'Laptop Pro 14', 'Care Plan 2yr', 'Support SLA'],
  },
  onFilterChange,
}) => {
  const handleChange = (field) => (e) => {
    if (onFilterChange) {
      onFilterChange(field, e.target.value);
    }
  };

  return (
    <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm space-y-4">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
        <Filter className="h-4 w-4 text-slate-500" />
        <h2 className="text-sm font-semibold text-slate-900">
          Filter Reports
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Field 1: Period */}
        <div className="space-y-1.5">
          <label 
            htmlFor="filter-period" 
            className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
          >
            Period
          </label>
          <select
            id="filter-period"
            value={filters.period}
            onChange={handleChange('period')}
            className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-colors hover:border-slate-400 cursor-pointer"
          >
            {options.periods.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        {/* Field 2: Sales Team */}
        <div className="space-y-1.5">
          <label 
            htmlFor="filter-sales-team" 
            className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
          >
            Sales Team
          </label>
          <select
            id="filter-sales-team"
            value={filters.salesTeam}
            onChange={handleChange('salesTeam')}
            className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-colors hover:border-slate-400 cursor-pointer"
          >
            {options.salesTeams.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        {/* Field 3: Approval Status */}
        <div className="space-y-1.5">
          <label 
            htmlFor="filter-approval-status" 
            className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
          >
            Approval Status
          </label>
          <select
            id="filter-approval-status"
            value={filters.approvalStatus}
            onChange={handleChange('approvalStatus')}
            className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-colors hover:border-slate-400 cursor-pointer"
          >
            {options.approvalStatuses.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        {/* Field 4: Product */}
        <div className="space-y-1.5">
          <label 
            htmlFor="filter-product" 
            className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
          >
            Product
          </label>
          <select
            id="filter-product"
            value={filters.product}
            onChange={handleChange('product')}
            className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-colors hover:border-slate-400 cursor-pointer"
          >
            {options.products.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default ReportFilters;
