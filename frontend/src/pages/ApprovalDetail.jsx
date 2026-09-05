import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { DashboardNavbar } from '../components/dashboard/DashboardNavbar';
import { ApprovalRiskSummary } from '../components/approval-detail/ApprovalRiskSummary';
import { ApprovalRiskTable } from '../components/approval-detail/ApprovalRiskTable';
import { ApprovalTimeline } from '../components/approval-detail/ApprovalTimeline';
import { ApprovalAuditTrail } from '../components/approval-detail/ApprovalAuditTrail';
import { Button } from '../components/ui/Button';

// ============================================================================
// FRONTEND MOCK DATA & FUTURE BACKEND API CONTRACT
// ============================================================================
// Endpoint: GET /api/approvals/:approvalId
// Approve: POST /api/approvals/:approvalId/approve
// Return: POST /api/approvals/:approvalId/return
// Reject: POST /api/approvals/:approvalId/reject
// ============================================================================
const MOCK_APPROVAL_LOOKUP = {
  'A-001': {
    id: 'A-001',
    quotationId: 'Q-1042',
    customerName: 'Acme Corp',
    blendedRisk: 'HIGH',
    customerTier: 'Gold',
  },
  'Q-1042': {
    id: 'A-001',
    quotationId: 'Q-1042',
    customerName: 'Acme Corp',
    blendedRisk: 'HIGH',
    customerTier: 'Gold',
  },
  'A-002': {
    id: 'A-002',
    quotationId: 'Q-1039',
    customerName: 'Beta Industries',
    blendedRisk: 'MEDIUM',
    customerTier: 'Silver',
  },
  'Q-1039': {
    id: 'A-002',
    quotationId: 'Q-1039',
    customerName: 'Beta Industries',
    blendedRisk: 'MEDIUM',
    customerTier: 'Silver',
  },
  'A-003': {
    id: 'A-003',
    quotationId: 'Q-1035',
    customerName: 'Nova Retail',
    blendedRisk: 'LOW',
    customerTier: 'Standard',
  },
  'Q-1035': {
    id: 'A-003',
    quotationId: 'Q-1035',
    customerName: 'Nova Retail',
    blendedRisk: 'LOW',
    customerTier: 'Standard',
  },
};

const DEFAULT_RISK_LINES = [
  {
    id: 'RL-001',
    line: 'Laptop (Hardware)',
    discountGiven: 12,
    limitAllowed: 15,
    overBy: 0,
    status: 'OK',
  },
  {
    id: 'RL-002',
    line: 'Setup Service (Services)',
    discountGiven: 18,
    limitAllowed: 10,
    overBy: 8,
    status: 'OVER',
  },
];

const DEFAULT_WORKFLOW = [
  {
    id: 'submitted',
    label: 'Submitted',
    status: 'completed',
  },
  {
    id: 'sales-manager',
    label: 'Sales Manager',
    status: 'current',
  },
  {
    id: 'finance',
    label: 'Finance',
    status: 'upcoming',
  },
  {
    id: 'confirmed',
    label: 'Confirmed',
    status: 'upcoming',
  },
];

const DEFAULT_AUDIT_TRAIL = [
  {
    id: 'AUD-001',
    user: 'J. Rao',
    action: 'Submitted',
    date: 'Aug 20',
    note: 'Initial 12% discount',
  },
  {
    id: 'AUD-002',
    user: 'M. Shah',
    action: 'Returned',
    date: 'Aug 21',
    note: 'Requested justification',
  },
  {
    id: 'AUD-003',
    user: 'J. Rao',
    action: 'Resubmitted',
    date: 'Aug 22',
    note: 'Added margin note',
  },
];

export const ApprovalDetail = () => {
  const { approvalId = 'A-001' } = useParams();

  // Look up approval details dynamically based on URL parameter
  const approval = MOCK_APPROVAL_LOOKUP[approvalId] || {
    id: approvalId,
    quotationId: approvalId.startsWith('Q-') ? approvalId : 'Q-1042',
    customerName: 'Acme Corp',
    blendedRisk: 'HIGH',
    customerTier: 'Gold',
  };

  const [actionMessage, setActionMessage] = useState('');

  const handleAction = (actionName) => {
    setActionMessage(`Approval action recorded: ${actionName}`);
    setTimeout(() => setActionMessage(''), 4500);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* 1. Top Navigation */}
      <DashboardNavbar />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Navigation Breadcrumb / Back Link */}
        <div>
          <Link
            to="/approvals"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Approvals</span>
          </Link>
        </div>

        {/* 2. Page Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Approval Detail: {approval.quotationId} ({approval.customerName})
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Opened by clicking a row on the Approvals list
          </p>
        </div>

        {/* Action Confirmation Banner */}
        {actionMessage && (
          <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span className="text-sm font-medium text-emerald-800">
              {actionMessage}
            </span>
          </div>
        )}

        {/* 3. Risk Summary (Blended Risk & Customer Tier) */}
        <section aria-label="Risk Summary">
          <ApprovalRiskSummary
            blendedRisk={approval.blendedRisk}
            customerTier={approval.customerTier}
          />
        </section>

        {/* 4. Why This Quote Was Flagged & Risk Table */}
        <section aria-label="Risk Breakdown">
          <ApprovalRiskTable riskLines={DEFAULT_RISK_LINES} />
        </section>

        {/* 5. Approval Workflow Stepper */}
        <section aria-label="Approval Workflow">
          <ApprovalTimeline workflow={DEFAULT_WORKFLOW} />
        </section>

        {/* 6. Audit Trail */}
        <section aria-label="Audit Trail">
          <ApprovalAuditTrail auditTrail={DEFAULT_AUDIT_TRAIL} />
        </section>

        {/* 7. Bottom Actions */}
        <section aria-label="Approval Actions" className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => handleAction('Reject')}
            className="inline-flex items-center justify-center rounded-md font-medium text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 bg-rose-600 text-white hover:bg-rose-700 h-10 px-5 shadow-sm"
          >
            Reject
          </button>

          <Button
            type="button"
            variant="secondary"
            onClick={() => handleAction('Return for Revision')}
            className="sm:!w-auto px-5"
          >
            Return for Revision
          </Button>

          <Button
            type="button"
            variant="primary"
            onClick={() => handleAction('Approve')}
            className="sm:!w-auto px-5"
          >
            Approve
          </Button>
        </section>

      </main>
    </div>
  );
};

export default ApprovalDetail;
