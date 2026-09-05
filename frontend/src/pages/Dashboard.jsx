import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, FileText, AlertTriangle, Plus, CheckSquare } from 'lucide-react';
import { DashboardNavbar } from '../components/dashboard/DashboardNavbar';
import { SummaryCard } from '../components/dashboard/SummaryCard';
import { RecentActivity } from '../components/dashboard/RecentActivity';
import { Button } from '../components/ui/Button';

// ============================================================================
// TEMPORARY MOCK DATA
// Note: This data will be replaced by backend API responses in a future task.
// ============================================================================
const MOCK_SUMMARY_CARDS = [
  {
    id: 'pending-approvals',
    title: 'Pending Approvals',
    value: 4,
    supportingText: '4 quotations waiting',
    icon: <Clock className="h-5 w-5 text-amber-600" />,
  },
  {
    id: 'open-quotations',
    title: 'Open Quotations',
    value: 12,
    supportingText: '12 active deals',
    icon: <FileText className="h-5 w-5 text-blue-600" />,
  },
  {
    id: 'at-risk-deals',
    title: 'At-Risk Deals',
    value: 3,
    supportingText: '3 flagged by Deal Health',
    icon: <AlertTriangle className="h-5 w-5 text-rose-600" />,
  },
];

const MOCK_RECENT_ACTIVITIES = [
  'Acme Corp quotation approved by Finance',
  'Beta Industries requested a discount change',
  'East Depot stock updated for Order #2291',
];

export const Dashboard = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* 1. Top Navigation */}
      <DashboardNavbar />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* 2. Page Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Sales Dashboard / Home
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Central hub, links out to every module below
          </p>
        </div>

        {/* 3. Three Summary Cards */}
        <section aria-labelledby="metrics-heading">
          <h2 id="metrics-heading" className="sr-only">Sales Metrics Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {MOCK_SUMMARY_CARDS.map((card) => (
              <SummaryCard
                key={card.id}
                title={card.title}
                value={card.value}
                supportingText={card.supportingText}
                icon={card.icon}
              />
            ))}
          </div>
        </section>

        {/* 4. Quick Action Buttons */}
        <section aria-label="Quick Actions">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Button
              type="button"
              variant="primary"
              onClick={() => navigate('/quotations/new')}
              className="sm:!w-auto px-5 gap-1.5"
            >
              <Plus className="h-4 w-4" />
              <span>+ New Quotation</span>
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

        {/* 5. Recent Activity Section */}
        <section aria-label="Recent Activity">
          <RecentActivity activities={MOCK_RECENT_ACTIVITIES} />
        </section>

      </main>
    </div>
  );
};

export default Dashboard;
