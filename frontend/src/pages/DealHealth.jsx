import React, { useState } from 'react';
import { CheckCircle2, ShieldAlert, BellRing, AlertTriangle } from 'lucide-react';
import { DashboardNavbar } from '../components/dashboard/DashboardNavbar';
import { DealHealthSummary } from '../components/deal-health/DealHealthSummary';
import { AnomalyTable } from '../components/deal-health/AnomalyTable';
import { Button } from '../components/ui/Button';

// ============================================================================
// FRONTEND MOCK DATA & FUTURE BACKEND API CONTRACT
// ============================================================================
// API 1: GET /api/deal-health
//   Returns { summary: { stalledDeals: 5, discountAnomalies: 2, deliverySlippage: 3 }, anomalies: [ ... ] }
// API 2: POST /api/deal-health/:dealId/escalate
//   Request: { reason: string }
//   Response: { success: true, message: "Deal escalation initiated", data: { dealId, status: "ESCALATED" } }
// API 3: POST /api/deal-health/:dealId/nudge
//   Request: { message: string }
//   Response: { success: true, message: "Rep nudge sent", data: { dealId, status: "NUDGED" } }
// ============================================================================
const MOCK_DEAL_HEALTH = {
  summary: {
    stalledDeals: 5,
    discountAnomalies: 2,
    deliverySlippage: 3,
  },
  anomalies: [
    {
      id: 'DH-001',
      dealId: 'Q-1030',
      deal: 'Zenith Co',
      issue: 'Idle 9 days',
      flaggedDate: 'Aug 24',
      action: 'Nudge sent',
    },
    {
      id: 'DH-002',
      dealId: 'Q-1035',
      deal: 'Delta LLC',
      issue: 'Discount 22% vs avg 8%',
      flaggedDate: 'Aug 25',
      action: 'Escalated to Manager',
    },
  ],
};

export const DealHealth = () => {
  const [data] = useState(MOCK_DEAL_HEALTH);
  const [feedbackMessage, setFeedbackMessage] = useState('');

  const handleEscalate = () => {
    setFeedbackMessage('Deal escalation initiated.');
    setTimeout(() => setFeedbackMessage(''), 4500);
  };

  const handleNudgeRep = () => {
    setFeedbackMessage('Rep nudge sent.');
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
              <ShieldAlert className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Deal Health and Anomaly Dashboard
            </h1>
          </div>
          <p className="text-sm text-slate-600">
            Real-time flags for stalled deals and unusual discount patterns
          </p>
        </div>

        {/* Global Feedback Banner */}
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

        {/* 3. Summary Cards */}
        <section aria-label="Deal Health Summary Metrics">
          <DealHealthSummary summary={data.summary} />
        </section>

        {/* 4. Anomaly Table Section */}
        <section aria-label="Flagged Deals Table" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">
              Flagged Deals & Anomalies
            </h2>
            <span className="text-xs text-slate-500 font-medium">
              {data.anomalies.length} deals requiring attention
            </span>
          </div>

          <AnomalyTable anomalies={data.anomalies} />
        </section>

        {/* 5. Bottom Action Buttons */}
        <section 
          aria-label="Deal Health Actions" 
          className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-start gap-3"
        >
          <button
            type="button"
            onClick={handleEscalate}
            className="inline-flex items-center justify-center rounded-md font-medium text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 bg-rose-600 text-white hover:bg-rose-700 h-10 px-5 shadow-sm gap-2"
          >
            <AlertTriangle className="h-4 w-4" />
            <span>Escalate</span>
          </button>

          <Button
            type="button"
            variant="outline"
            onClick={handleNudgeRep}
            className="sm:!w-auto px-5 gap-2 border-slate-300 text-slate-700 hover:bg-slate-100"
          >
            <BellRing className="h-4 w-4 text-slate-600" />
            <span>Nudge Rep</span>
          </Button>
        </section>

      </main>
    </div>
  );
};

export default DealHealth;
