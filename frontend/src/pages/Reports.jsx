import React, { useState } from 'react';
import { CheckCircle2, BarChart3, FileDown, Sheet } from 'lucide-react';
import { DashboardNavbar } from '../components/dashboard/DashboardNavbar';
import { ReportFilters } from '../components/reports/ReportFilters';
import { ReportSummary } from '../components/reports/ReportSummary';
import { Button } from '../components/ui/Button';

// ============================================================================
// FRONTEND MOCK DATA & FUTURE BACKEND API CONTRACT
// ============================================================================
// API 1: GET /api/reports?period=this-month&salesTeam=all&approvalStatus=all&product=all
//   Returns { metrics: { quotesCreated: 148, avgApprovalTimeHours: 6.4, topUpsellProduct: "Care Plan 2yr" } }
// API 2: GET /api/reports/export/pdf
// API 3: GET /api/reports/export/xls
// ============================================================================
const MOCK_REPORT_DATA = {
  filters: {
    periods: ['This Month', 'Last Month', 'This Quarter'],
    salesTeams: ['All Teams', 'Enterprise', 'SMB'],
    approvalStatuses: ['All', 'Pending', 'Approved', 'Returned'],
    products: ['All Products', 'Laptop Pro 14', 'Care Plan 2yr', 'Support SLA'],
  },
  metrics: {
    quotesCreated: 148,
    avgApprovalTime: '6.4 hours',
    topUpsellProduct: 'Care Plan 2yr',
  },
};

export const Reports = () => {
  const [selectedFilters, setSelectedFilters] = useState({
    period: 'This Month',
    salesTeam: 'All Teams',
    approvalStatus: 'All',
    product: 'All Products',
  });

  const [reportData] = useState(MOCK_REPORT_DATA);
  const [feedbackMessage, setFeedbackMessage] = useState('');

  const handleFilterChange = (field, value) => {
    setSelectedFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleExportPDF = () => {
    setFeedbackMessage('PDF export requested.');
    setTimeout(() => setFeedbackMessage(''), 4500);
  };

  const handleExportXLS = () => {
    setFeedbackMessage('XLS export requested.');
    setTimeout(() => setFeedbackMessage(''), 4500);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* 1. Top Navigation - Reusing DealFlow360 Internal Navbar */}
      <DashboardNavbar />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* 2. Page Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-md bg-slate-900 text-white shadow-sm">
              <BarChart3 className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Admin / Reporting Dashboard (Optional)
            </h1>
          </div>
          <p className="text-sm text-slate-600">
            Sales trends, approval bottlenecks and platform usage
          </p>
        </div>

        {/* Action Confirmation Banner */}
        {feedbackMessage && (
          <div 
            className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-3 shadow-sm transition-all animate-in fade-in"
            role="status"
            aria-live="polite"
          >
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span className="text-sm font-semibold text-emerald-900">
              {feedbackMessage}
            </span>
          </div>
        )}

        {/* 3. Horizontal Filter Section (4 Fields) */}
        <section aria-label="Report Filters">
          <ReportFilters
            filters={selectedFilters}
            options={reportData.filters}
            onFilterChange={handleFilterChange}
          />
        </section>

        {/* 4. Three Summary Cards */}
        <section aria-label="Key Reporting Metrics">
          {reportData.metrics ? (
            <ReportSummary metrics={reportData.metrics} />
          ) : (
            <div className="bg-white p-8 rounded-lg border border-slate-200 text-center text-slate-500">
              No reporting data available for the selected filters.
            </div>
          )}
        </section>

        {/* 5. Export Actions */}
        <section 
          aria-label="Export Actions" 
          className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-start gap-3"
        >
          <Button
            type="button"
            variant="outline"
            onClick={handleExportPDF}
            className="sm:!w-auto px-5 gap-2 border-slate-300 text-slate-700 hover:bg-slate-100"
          >
            <FileDown className="h-4 w-4 text-slate-600" />
            <span>Export PDF</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={handleExportXLS}
            className="sm:!w-auto px-5 gap-2 border-slate-300 text-slate-700 hover:bg-slate-100"
          >
            <Sheet className="h-4 w-4 text-slate-600" />
            <span>Export XLS</span>
          </Button>
        </section>

      </main>
    </div>
  );
};

export default Reports;
