import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, ShieldAlert, BellRing, AlertTriangle, RefreshCw } from 'lucide-react';
import { DashboardNavbar } from '../components/dashboard/DashboardNavbar';
import { DealHealthSummary } from '../components/deal-health/DealHealthSummary';
import { AnomalyTable } from '../components/deal-health/AnomalyTable';
import { Button } from '../components/ui/Button';
import { getDealHealth, escalateDeal, nudgeRep } from '../services/dealHealthService';

export const DealHealth = () => {
  const navigate = useNavigate();
  const [data, setData] = useState({
    summary: { stalledDeals: 0, discountAnomalies: 0, deliverySlippage: 0 },
    anomalies: []
  });
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchHealthData = async () => {
    try {
      setIsLoading(true);
      const res = await getDealHealth();
      if (res) setData(res);
    } catch (err) {
      console.error('Failed to load deal health data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthData();
  }, []);

  const handleEscalate = async () => {
    const firstAnomaly = data.anomalies[0];
    if (!firstAnomaly?.dealId) {
      setFeedbackMessage('No flagged deal anomalies available to escalate.');
      setTimeout(() => setFeedbackMessage(''), 4500);
      return;
    }
    const targetId = firstAnomaly.dealId;
    try {
      await escalateDeal(targetId, {
        reason: 'Escalated to Sales Manager for margin justification'
      });
      setFeedbackMessage(`Deal ${targetId} escalated to Sales Manager for margin review.`);
      setTimeout(() => setFeedbackMessage(''), 4500);
      await fetchHealthData();
    } catch (err) {
      console.error('Failed to escalate deal:', err);
    }
  };

  const handleNudgeRep = async () => {
    const firstAnomaly = data.anomalies[0];
    if (!firstAnomaly?.dealId) {
      setFeedbackMessage('No flagged deal anomalies available to nudge.');
      setTimeout(() => setFeedbackMessage(''), 4500);
      return;
    }
    const targetId = firstAnomaly.dealId;
    try {
      await nudgeRep(targetId, {
        message: 'Automated notification sent to account executive to update stalled quotation'
      });
      setFeedbackMessage(`Automated nudge alert sent to rep for deal ${targetId}.`);
      setTimeout(() => setFeedbackMessage(''), 4500);
      await fetchHealthData();
    } catch (err) {
      console.error('Failed to nudge rep:', err);
    }
  };

  const handleRowClick = (anomaly) => {
    if (anomaly.dealId) {
      navigate(`/quotations/${anomaly.dealId}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <DashboardNavbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-md bg-slate-900 text-white shadow-sm">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Deal Health & Anomaly Dashboard
              </h1>
            </div>
            <p className="text-sm text-slate-600">
              Real-time governance flags for stalled deals, discount anomalies, and delivery slippages.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchHealthData}
            className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 bg-white px-3 py-1.5 rounded-md border border-slate-200 shadow-sm"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
            <span>Refresh Flags</span>
          </button>
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

        <section aria-label="Deal Health Summary Metrics">
          <DealHealthSummary summary={data.summary} />
        </section>

        <section aria-label="Flagged Deals Table" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">
              Flagged Deals & Anomalies ({data.anomalies.length})
            </h2>
            <span className="text-xs text-slate-500 font-medium">
              Click any deal alert to open its quotation directly
            </span>
          </div>

          <AnomalyTable 
            anomalies={data.anomalies} 
            onRowClick={handleRowClick}
          />
        </section>

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
            <span>Escalate Selected</span>
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
