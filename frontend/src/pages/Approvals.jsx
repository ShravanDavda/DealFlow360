import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Filter, RefreshCw, Search } from 'lucide-react';
import { DashboardNavbar } from '../components/dashboard/DashboardNavbar';
import { ApprovalSummary } from '../components/approvals/ApprovalSummary';
import { ApprovalTable } from '../components/approvals/ApprovalTable';
import { approveQuotation, getApprovals, rejectQuotation, returnForRevision } from '../services/approvalService';
import { getCurrentUser } from '../services/authService';

export const Approvals = () => {
  const navigate = useNavigate();
  const [filterMode, setFilterMode] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [approvals, setApprovals] = useState([]);
  const [summary, setSummary] = useState([
    { label: 'Pending', count: 0, status: 'pending' },
    { label: 'Returned', count: 0, status: 'returned' },
    { label: 'Approved', count: 0, status: 'approved' },
  ]);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const isSalesManager = userRole === 'sales_manager';
  const isFinanceOperations = ['finance', 'operations'].includes(userRole);

  const fetchApprovalsData = async (mode = filterMode) => {
    try {
      setIsLoading(true);
      const data = await getApprovals({ status: mode === 'high-risk' ? 'all' : mode, ...(isSalesManager ? { role: 'Sales Manager' } : isFinanceOperations ? { role: 'Finance' } : {}) });
      if (data) {
        if (data.approvals) setApprovals(data.approvals);
        if (data.summary) setSummary(data.summary);
      }
    } catch (err) {
      console.error('Failed to load approvals:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getCurrentUser().then((response) => setUserRole(response?.data?.role || null)).catch(() => setUserRole(null));
  }, []);

  useEffect(() => {
    fetchApprovalsData(filterMode);
  }, [filterMode, isSalesManager]);

  const handleRowClick = (quotationId) => {
    navigate(`/approvals/${quotationId}`);
  };

  const handleAction = async (approval, action) => {
    if (!window.confirm(`${action === 'approve' ? 'Approve' : action === 'reject' ? 'Reject' : 'Return'} ${approval.quotationId}?`)) return;
    try {
      if (action === 'approve') await approveQuotation(approval.quotationId, { note: 'Approved discount terms within authority' });
      if (action === 'reject') await rejectQuotation(approval.quotationId, { reason: 'Discount exceeds policy threshold without margin justification' });
      if (action === 'return') await returnForRevision(approval.quotationId, { note: 'Returned to sales rep for line discount reduction' });
      await fetchApprovalsData(filterMode);
    } catch (error) {
      console.error(`Failed to ${action} quotation:`, error);
    }
  };

  const visibleApprovals = approvals.filter((approval) => {
    const query = searchTerm.trim().toLowerCase();
    const matchesSearch = !query || [approval.quotationId, approval.customerName, approval.salesRep].some((value) => String(value || '').toLowerCase().includes(query));
    const matchesRisk = filterMode !== 'high-risk' || approval.blendedRisk === 'HIGH';
    return matchesSearch && matchesRisk;
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <DashboardNavbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {isSalesManager ? 'Approval Queue' : 'Approvals Queue'}
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Quotations requiring multi-tier discount approval, margin exception handling, or executive sign-off.
            </p>
          </div>

          <button
            type="button"
            onClick={() => fetchApprovalsData(filterMode)}
            className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 bg-white px-3 py-1.5 rounded-md border border-slate-200 shadow-sm"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
            <span>Refresh Queue</span>
          </button>
        </div>

        <section aria-label="Approvals Summary">
          <ApprovalSummary summary={summary} />
        </section>

        <section aria-label="Approvals Filters" className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <label className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-500"><Search className="h-4 w-4 shrink-0" /><input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search by quote ID, customer, sales rep..." className="min-w-0 flex-1 outline-none" /></label>
          <div className="flex flex-wrap items-center gap-2"><span className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-slate-500"><Filter className="h-3.5 w-3.5" />Status:</span>{[['pending', 'Pending'], ['approved', 'Approved'], ['returned', 'Returned'], ['rejected', 'Rejected'], ['all', 'All']].map(([value, label]) => <button key={value} type="button" onClick={() => setFilterMode(value)} className={`rounded px-3 py-1.5 text-xs font-medium ${filterMode === value ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`} aria-pressed={filterMode === value}>{label}</button>)}</div>
        </section>

        <section aria-label="Approvals Table">
          {isLoading && approvals.length === 0 ? (
            <div className="py-12 text-center text-slate-500 font-medium">
              Loading approvals from database...
            </div>
          ) : (
            <ApprovalTable
              approvals={visibleApprovals}
              onRowClick={handleRowClick}
              onAction={handleAction}
              isSalesManager={isSalesManager}
              isFinanceOperations={isFinanceOperations}
            />
          )}
        </section>

        <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-900">
          <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
          <p className="font-semibold">Sales Governance &amp; Multi-Tier Approval Chain Rules</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-indigo-800"><li>Low-risk quotations may proceed without approval.</li><li>High-risk quotations follow the configured approval chain.</li><li>Finance becomes the next stage when required by the configured chain.</li><li>Approval actions and returns are recorded in the audit trail.</li></ul>
        </div>

      </main>
    </div>
  );
};

export default Approvals;
