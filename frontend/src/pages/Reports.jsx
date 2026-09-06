import React, { useState, useEffect } from 'react';
import { CheckCircle2, BarChart3, FileDown, Sheet } from 'lucide-react';
import { DashboardNavbar } from '../components/dashboard/DashboardNavbar';
import { ReportFilters } from '../components/reports/ReportFilters';
import { ReportSummary } from '../components/reports/ReportSummary';
import { Button } from '../components/ui/Button';
import { getReports, exportReportXls } from '../services/reportService';

export const Reports = () => {
  const [selectedFilters, setSelectedFilters] = useState({
    period: 'This Month',
    salesTeam: 'All Teams',
    approvalStatus: 'All',
    product: 'All Products',
  });

  const [reportData, setReportData] = useState({
    filters: {
      periods: ['This Month', 'Last Month', 'This Quarter'],
      salesTeams: ['All Teams', 'Enterprise', 'SMB'],
      approvalStatuses: ['All', 'Pending', 'Approved', 'Returned'],
      products: ['All Products'],
    },
    metrics: {
      quotesCreated: 0,
      avgApprovalTime: '0.0 hours',
      topUpsellProduct: 'None',
    },
  });

  const [feedbackMessage, setFeedbackMessage] = useState('');

  useEffect(() => {
    let isMounted = true;
    getReports(selectedFilters)
      .then((res) => {
        if (isMounted && res) setReportData(res);
      })
      .catch((err) => console.error('Failed to load reports:', err));

    return () => {
      isMounted = false;
    };
  }, [selectedFilters]);

  const handleFilterChange = (field, value) => {
    setSelectedFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleExportPDF = () => {
    const text = `DEALFLOW360 EXECUTIVE REPORT\nPeriod: ${selectedFilters.period}\nTeam: ${selectedFilters.salesTeam}\nQuotes Created: ${reportData.metrics?.quotesCreated}\nAvg Approval Time: ${reportData.metrics?.avgApprovalTime}\nTop Upsell: ${reportData.metrics?.topUpsellProduct}\n`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dealflow360-report-${selectedFilters.period.toLowerCase().replace(' ', '-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);

    setFeedbackMessage('Executive PDF/Text report exported successfully.');
    setTimeout(() => setFeedbackMessage(''), 4500);
  };

  const handleExportXLS = async () => {
    try {
      const blob = await exportReportXls(selectedFilters);
      const url = URL.createObjectURL(new Blob([blob], { type: 'text/csv' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `dealflow360-report-${selectedFilters.period.toLowerCase().replace(' ', '-')}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      setFeedbackMessage('Sales spreadsheet (CSV/XLS) exported successfully.');
      setTimeout(() => setFeedbackMessage(''), 4500);
    } catch (err) {
      console.error('Failed to export CSV:', err);
      setFeedbackMessage('Failed to export CSV report.');
      setTimeout(() => setFeedbackMessage(''), 4500);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <DashboardNavbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-md bg-slate-900 text-white shadow-sm">
              <BarChart3 className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Admin & Operations Reporting Dashboard
            </h1>
          </div>
          <p className="text-sm text-slate-600">
            Sales momentum, approval bottleneck indicators, discount governance trends, and top products.
          </p>
        </div>

        {feedbackMessage && (
          <div 
            className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-3 shadow-sm transition-all animate-in fade-in"
            role="status"
          >
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span className="text-sm font-semibold text-emerald-900">
              {feedbackMessage}
            </span>
          </div>
        )}

        <section aria-label="Report Filters">
          <ReportFilters
            filters={selectedFilters}
            options={reportData.filters}
            onFilterChange={handleFilterChange}
          />
        </section>

        <section aria-label="Key Reporting Metrics">
          {reportData.metrics ? (
            <ReportSummary metrics={reportData.metrics} />
          ) : (
            <div className="bg-white p-8 rounded-lg border border-slate-200 text-center text-slate-500">
              No reporting data available for the selected filters.
            </div>
          )}
        </section>

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
            <span>Export Summary</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={handleExportXLS}
            className="sm:!w-auto px-5 gap-2 border-slate-300 text-slate-700 hover:bg-slate-100"
          >
            <Sheet className="h-4 w-4 text-slate-600" />
            <span>Export CSV / XLS</span>
          </Button>
        </section>

      </main>
    </div>
  );
};

export default Reports;
