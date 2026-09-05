import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Filter } from 'lucide-react';
import { DashboardNavbar } from '../components/dashboard/DashboardNavbar';
import { ApprovalSummary } from '../components/approvals/ApprovalSummary';
import { ApprovalTable } from '../components/approvals/ApprovalTable';

// ============================================================================
// FRONTEND MOCK DATA & FUTURE BACKEND API CONTRACT
// ============================================================================
// Endpoint: GET /api/approvals
// Headers: Authorization: Bearer <access_token>
// Future Response Format:
// {
//   "success": true,
//   "data": {
//     "summary": { "pending": 3, "returned": 1, "approved": 12 },
//     "approvals": [ ... array below ... ]
//   }
// }
// ============================================================================
const MOCK_SUMMARY = [
  { label: 'Pending', count: 3, status: 'pending' },
  { label: 'Returned', count: 1, status: 'returned' },
  { label: 'Approved', count: 12, status: 'approved' },
];

const MOCK_APPROVALS = [
  {
    id: 'A-001',
    quotationId: 'Q-1042',
    customerName: 'Acme Corp',
    blendedRisk: 'HIGH',
    stage: 'Sales Manager',
    assignedTo: 'M. Shah',
    status: 'Pending',
  },
  {
    id: 'A-002',
    quotationId: 'Q-1039',
    customerName: 'Beta Industries',
    blendedRisk: 'MEDIUM',
    stage: 'Finance',
    assignedTo: 'R. Iyer',
    status: 'Pending',
  },
  {
    id: 'A-003',
    quotationId: 'Q-1035',
    customerName: 'Nova Retail',
    blendedRisk: 'LOW',
    stage: 'Auto-Approved',
    assignedTo: null,
    status: 'Approved',
  },
];

export const Approvals = () => {
  const navigate = useNavigate();

  // Filter state: 'pending' (default: "Pending Only") or 'all'
  const [filterMode, setFilterMode] = useState('pending');

  const handleRowClick = (quotationId) => {
    navigate(`/approvals/${quotationId}`);
  };

  // Filter approvals based on selected filter
  const visibleApprovals = MOCK_APPROVALS.filter((approval) => {
    if (filterMode === 'pending') {
      return approval.status === 'Pending';
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* 1. Top Navigation */}
      <DashboardNavbar />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* 2. Page Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Approvals (List)
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Every quotation that needs, needs, or is going through approval
          </p>
        </div>

        {/* 3. Summary Indicators */}
        <section aria-label="Approvals Summary">
          <ApprovalSummary summary={MOCK_SUMMARY} />
        </section>

        {/* 4. Filter Control Bar */}
        <section aria-label="Approvals Filters" className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-500" />
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
              Filter:
            </span>
            <div className="inline-flex rounded-md border border-slate-200 bg-white p-1 shadow-sm" role="group" aria-label="Approval Filter Options">
              <button
                type="button"
                onClick={() => setFilterMode('pending')}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  filterMode === 'pending'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                aria-pressed={filterMode === 'pending'}
              >
                Pending Only
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  filterMode === 'all'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                aria-pressed={filterMode === 'all'}
              >
                All
              </button>
            </div>
          </div>

          <span className="text-xs text-slate-500 font-medium">
            Showing {visibleApprovals.length} of {MOCK_APPROVALS.length} records
          </span>
        </section>

        {/* 5. Approvals Table */}
        <section aria-label="Approvals Table">
          <ApprovalTable
            approvals={visibleApprovals}
            onRowClick={handleRowClick}
          />
        </section>

        {/* 6. Informational / Warning Banner */}
        <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-800 font-medium">
            Click any row to open its full approval detail, risk breakdown, and audit trail.
          </p>
        </div>

      </main>
    </div>
  );
};

export default Approvals;
