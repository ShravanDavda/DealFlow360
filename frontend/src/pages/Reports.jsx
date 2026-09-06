import React, { useState, useEffect } from 'react';
import { CheckCircle2, BarChart3, FileText, Sheet } from 'lucide-react';
import { jsPDF } from 'jspdf';
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
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      // Top brand accent line
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, 210, 6, 'F');

      // Title & Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(15, 23, 42);
      doc.text('DealFlow360', 20, 24);

      doc.setFillColor(241, 245, 249);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(80, 18, 28, 8, 2, 2, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);
      doc.text('REPORT', 87, 23.5);

      // Subtitle
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);
      doc.text('Admin & Operations Reporting Dashboard', 20, 31);

      // Generation Metadata
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      const generatedDate = new Date().toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
      doc.text(`Generated: ${generatedDate}`, 190, 24, { align: 'right' });
      doc.text('Status: Live Snapshot', 190, 30, { align: 'right' });

      // Horizontal Divider
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(20, 37, 190, 37);

      // SECTION 1: REPORT FILTERS
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text('APPLIED FILTER CRITERIA', 20, 46);

      // Filter container card
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(20, 50, 170, 32, 2, 2, 'FD');

      // Filter grid
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text('PERIOD:', 26, 59);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
      doc.text(String(selectedFilters.period || 'This Month'), 60, 59);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 116, 139);
      doc.text('APPROVAL STATUS:', 110, 59);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
      doc.text(String(selectedFilters.approvalStatus || 'All'), 148, 59);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 116, 139);
      doc.text('SALES TEAM:', 26, 72);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
      doc.text(String(selectedFilters.salesTeam || 'All Teams'), 60, 72);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 116, 139);
      doc.text('PRODUCT:', 110, 72);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
      doc.text(String(selectedFilters.product || 'All Products'), 148, 72);

      // SECTION 2: KEY PERFORMANCE METRICS
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text('KEY REPORTING METRICS', 20, 94);

      const quotesCount = reportData.metrics?.quotesCreated ?? 0;
      const approvalTime = reportData.metrics?.avgApprovalTime ?? '0.0 hours';
      const topUpsell = reportData.metrics?.topUpsellProduct ?? 'None';

      // KPI Card 1: Quotes Created
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(20, 99, 52, 40, 2, 2, 'FD');
      doc.setFillColor(59, 130, 246);
      doc.rect(20, 99, 52, 2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text('QUOTES CREATED', 25, 109);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.setTextColor(15, 23, 42);
      doc.text(String(quotesCount), 25, 122);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(String(selectedFilters.period || 'This Month'), 25, 131);

      // KPI Card 2: Avg Approval Time
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(79, 99, 52, 40, 2, 2, 'FD');
      doc.setFillColor(245, 158, 11);
      doc.rect(79, 99, 52, 2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text('AVG APPROVAL TIME', 84, 109);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(17);
      doc.setTextColor(15, 23, 42);
      doc.text(String(approvalTime), 84, 122);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text('Turnaround efficiency', 84, 131);

      // KPI Card 3: Top Upsell Product
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(138, 99, 52, 40, 2, 2, 'FD');
      doc.setFillColor(16, 185, 129);
      doc.rect(138, 99, 52, 2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text('TOP UPSELL PRODUCT', 143, 109);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(15, 23, 42);
      const truncatedUpsell = String(topUpsell).length > 17 ? String(topUpsell).substring(0, 17) + '...' : String(topUpsell);
      doc.text(truncatedUpsell, 143, 122);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text('Highest volume upsell', 143, 131);

      // SECTION 3: REPORT SUMMARY BREAKDOWN
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text('METRICS SUMMARY TABLE', 20, 153);

      // Table Header
      doc.setFillColor(241, 245, 249);
      doc.rect(20, 158, 170, 8, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.rect(20, 158, 170, 8, 'S');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text('METRIC / PARAMETER', 25, 163.5);
      doc.text('VALUE', 105, 163.5);
      doc.text('SCOPE / NOTES', 150, 163.5);

      // Table Rows
      const tableRows = [
        { label: 'Reporting Period', value: String(selectedFilters.period), notes: 'Selected timeframe' },
        { label: 'Assigned Sales Team', value: String(selectedFilters.salesTeam), notes: 'Team filter' },
        { label: 'Approval Status', value: String(selectedFilters.approvalStatus), notes: 'Workflow status' },
        { label: 'Product Filter', value: String(selectedFilters.product), notes: 'Catalog focus' },
        { label: 'Total Quotes Created', value: String(quotesCount), notes: 'Volume generated' },
        { label: 'Average Approval Time', value: String(approvalTime), notes: 'Approval duration' },
        { label: 'Top Upsell Product', value: String(topUpsell), notes: 'Leading accessory/item' },
      ];

      let currentY = 166;
      tableRows.forEach((row, index) => {
        if (index % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(20, currentY, 170, 8, 'F');
        }
        doc.setDrawColor(226, 232, 240);
        doc.rect(20, currentY, 170, 8, 'S');

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(15, 23, 42);
        doc.text(row.label, 25, currentY + 5.5);
        doc.text(row.value, 105, currentY + 5.5);
        doc.setTextColor(100, 116, 139);
        doc.text(row.notes, 150, currentY + 5.5);

        currentY += 8;
      });

      // FOOTER
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(20, 268, 190, 268);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text('DealFlow360 Executive Reporting Dashboard - Confidential', 20, 274);
      doc.text('Page 1 of 1', 190, 274, { align: 'right' });

      doc.save('DealFlow360_Report.pdf');

      setFeedbackMessage('Executive PDF report exported successfully.');
      setTimeout(() => setFeedbackMessage(''), 4500);
    } catch (err) {
      console.error('Failed to export PDF report:', err);
      setFeedbackMessage('Failed to export PDF report.');
      setTimeout(() => setFeedbackMessage(''), 4500);
    }
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
            <FileText className="h-4 w-4 text-slate-600" />
            <span>Export PDF</span>
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
