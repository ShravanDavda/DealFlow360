import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, FileText, AlertTriangle, Plus, CheckSquare } from 'lucide-react';
import { DashboardNavbar } from '../components/dashboard/DashboardNavbar';
import { SummaryCard } from '../components/dashboard/SummaryCard';
import { RecentActivity } from '../components/dashboard/RecentActivity';
import { Button } from '../components/ui/Button';
import { getDashboardSummary } from '../services/reportService';

export const Dashboard = () => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState({
    pendingApprovals: 0,
    openQuotations: 0,
    atRiskDeals: 0,
    recentActivities: []
  });

  useEffect(() => {
    let isMounted = true;
    getDashboardSummary()
      .then((data) => {
        if (isMounted && data) {
          setMetrics(data);
        }
      })
      .catch((err) => console.error('Failed to load dashboard metrics:', err));

    return () => {
      isMounted = false;
    };
  }, []);

  const summaryCards = [
    {
      id: 'pending-approvals',
      title: 'Pending Approvals',
      value: metrics.pendingApprovals,
      supportingText: `${metrics.pendingApprovals} quotations waiting`,
      icon: <Clock className="h-5 w-5 text-amber-600" />,
      onClick: () => navigate('/approvals')
    },
    {
      id: 'open-quotations',
      title: 'Open Quotations',
      value: metrics.openQuotations,
      supportingText: `${metrics.openQuotations} active deals in pipeline`,
      icon: <FileText className="h-5 w-5 text-blue-600" />,
      onClick: () => navigate('/quotations')
    },
    {
      id: 'at-risk-deals',
      title: 'At-Risk Deals',
      value: metrics.atRiskDeals,
      supportingText: `${metrics.atRiskDeals} flagged by Deal Health`,
      icon: <AlertTriangle className="h-5 w-5 text-rose-600" />,
      onClick: () => navigate('/deal-health')
    },
  ];

  const handleNewQuotation = () => {
    navigate('/quotations');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <DashboardNavbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Sales Operations Hub
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Real-time overview of deal momentum, approval queues, inventory fulfillment, and contract health.
          </p>
        </div>

        <section aria-labelledby="metrics-heading">
          <h2 id="metrics-heading" className="sr-only">Sales Metrics Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {summaryCards.map((card) => (
              <div 
                key={card.id} 
                onClick={card.onClick}
                className="cursor-pointer transition-transform hover:-translate-y-0.5"
              >
                <SummaryCard
                  title={card.title}
                  value={card.value}
                  supportingText={card.supportingText}
                  icon={card.icon}
                />
              </div>
            ))}
          </div>
        </section>

        <section aria-label="Quick Actions">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Button
              type="button"
              variant="primary"
              onClick={handleNewQuotation}
              className="sm:!w-auto px-5 gap-1.5"
            >
              <Plus className="h-4 w-4" />
              <span>New Quotation</span>
            </Button>

            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate('/approvals')}
              className="sm:!w-auto px-5 gap-1.5"
            >
              <CheckSquare className="h-4 w-4 text-slate-600" />
              <span>View Approvals</span>
            </Button>
          </div>
        </section>

        <section aria-label="Recent Activity">
          <RecentActivity activities={metrics.recentActivities} />
        </section>

      </main>
    </div>
  );
};

export default Dashboard;
