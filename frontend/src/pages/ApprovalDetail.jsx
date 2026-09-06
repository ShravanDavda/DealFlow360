import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, ShieldAlert } from 'lucide-react';
import { DashboardNavbar } from '../components/dashboard/DashboardNavbar';
import { ApprovalRiskSummary } from '../components/approval-detail/ApprovalRiskSummary';
import { ApprovalRiskTable } from '../components/approval-detail/ApprovalRiskTable';
import { ApprovalTimeline } from '../components/approval-detail/ApprovalTimeline';
import { ApprovalAuditTrail } from '../components/approval-detail/ApprovalAuditTrail';
import { Button } from '../components/ui/Button';
import { getCurrentUser } from '../services/authService';
import {
  getApprovalDetail,
  approveQuotation,
  rejectQuotation,
  returnForRevision,
} from '../services/approvalService';

export const ApprovalDetail = () => {
  const { approvalId } = useParams();

  const [approval, setApproval] = useState(null);
  const [actionMessage, setActionMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [userRole, setUserRole] = useState(null);

  const fetchDetail = async () => {
    try {
      setIsLoading(true);
      const data = await getApprovalDetail(approvalId);
      if (data) setApproval(data);
    } catch (err) {
      console.error('Failed to load approval details:', err);
      setErrorMessage('Could not load approval record from server.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
    getCurrentUser().then((response) => setUserRole(response?.data?.role || null)).catch(() => setUserRole(null));
  }, [approvalId]);

  const currentStep = String(approval?.approval?.steps?.find((step) => step.status === 'PENDING')?.approverRole || approval?.currentStep || approval?.approvalStage || '').toLowerCase().replace(/_/g, ' ');
  const isPending = approval?.status === 'Pending' || approval?.status === 'Pending Approval';
  const isAdmin = userRole === 'admin';
  const isManagerStep = currentStep === 'sales manager' || !currentStep;
  const isFinanceStep = currentStep === 'finance' || !currentStep;
  const canAct = isPending && (
    ((userRole === 'sales_manager' || isAdmin) && isManagerStep) ||
    ((['finance', 'operations'].includes(userRole) || isAdmin) && isFinanceStep)
  );

  const handleApprove = async () => {
    try {
      setIsProcessing(true);
      const res = await approveQuotation(approvalId, {
        note: 'Approved discount terms within authority'
      });
      if (res) setApproval(res);
      setActionMessage('Quotation approved successfully! Status updated.');
      setTimeout(() => setActionMessage(''), 4500);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to approve quotation.');
      setTimeout(() => setErrorMessage(''), 4500);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    try {
      setIsProcessing(true);
      const res = await rejectQuotation(approvalId, {
        reason: 'Discount exceeds policy threshold without margin justification'
      });
      if (res) setApproval(res);
      setActionMessage('Quotation has been rejected.');
      setTimeout(() => setActionMessage(''), 4500);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to reject quotation.');
      setTimeout(() => setErrorMessage(''), 4500);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReturn = async () => {
    try {
      setIsProcessing(true);
      const res = await returnForRevision(approvalId, {
        note: 'Returned to sales rep for line discount reduction'
      });
      if (res) setApproval(res);
      setActionMessage('Quotation returned to sales rep for revision.');
      setTimeout(() => setActionMessage(''), 4500);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to return quotation.');
      setTimeout(() => setErrorMessage(''), 4500);
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading && !approval) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <DashboardNavbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-16 text-center text-slate-600 font-medium">
          Loading approval details...
        </main>
      </div>
    );
  }

  const riskLines = approval?.riskLines || [];
  const workflow = approval?.workflow || [];
  const auditTrail = approval?.auditTrail || [];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <DashboardNavbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        <div>
          <Link
            to="/approvals"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Approvals</span>
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Approval Detail: {approval?.quotationId} ({approval?.customerName})
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Blended risk analysis and governance review for requested discounts.
            </p>
          </div>

          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
            approval?.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
            approval?.status === 'Pending' || approval?.status === 'Pending Approval' ? 'bg-amber-50 text-amber-800 border-amber-200' :
            approval?.status === 'Rejected' ? 'bg-rose-50 text-rose-700 border-rose-200' :
            'bg-slate-100 text-slate-700 border-slate-200'
          }`}>
            Stage: {approval?.approvalStage || approval?.stage || 'Review'}
          </span>
        </div>

        {actionMessage && (
          <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-3 animate-in fade-in">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span className="text-sm font-semibold text-emerald-900">
              {actionMessage}
            </span>
          </div>
        )}

        {errorMessage && (
          <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 flex items-center gap-3 animate-in fade-in">
            <ShieldAlert className="h-5 w-5 text-rose-600 shrink-0" />
            <span className="text-sm font-semibold text-rose-900">
              {errorMessage}
            </span>
          </div>
        )}

        <section aria-label="Risk Summary">
          <ApprovalRiskSummary
            blendedRisk={approval?.blendedRisk || 'LOW'}
            customerTier={approval?.customerTier || 'Gold'}
          />
        </section>

        <section aria-label="Risk Breakdown">
          <ApprovalRiskTable riskLines={riskLines} />
        </section>

        <section aria-label="Approval Workflow">
          <ApprovalTimeline workflow={workflow} />
        </section>

        <section aria-label="Audit Trail">
          <ApprovalAuditTrail auditTrail={auditTrail} />
        </section>

        {canAct && <section aria-label="Approval Actions" className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3">
          <button
            type="button"
            disabled={isProcessing}
            onClick={handleReject}
            className="inline-flex items-center justify-center rounded-md font-medium text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 bg-rose-600 text-white hover:bg-rose-700 h-10 px-5 shadow-sm disabled:opacity-60"
          >
            Reject
          </button>

          <Button
            type="button"
            variant="secondary"
            disabled={isProcessing}
            onClick={handleReturn}
            className="sm:!w-auto px-5"
          >
            Return for Revision
          </Button>

          <Button
            type="button"
            variant="primary"
            disabled={isProcessing}
            onClick={handleApprove}
            className="sm:!w-auto px-5"
          >
            Approve
          </Button>
        </section>}

      </main>
    </div>
  );
};

export default ApprovalDetail;
