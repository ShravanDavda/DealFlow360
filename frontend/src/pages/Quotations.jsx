import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, LayoutGrid, Table as TableIcon } from 'lucide-react';
import { DashboardNavbar } from '../components/dashboard/DashboardNavbar';
import { QuotationBoard } from '../components/quotations/QuotationBoard';
import { QuotationTable } from '../components/quotations/QuotationTable';
import { Button } from '../components/ui/Button';

// ============================================================================
// FRONTEND MOCK DATA & API CONTRACT SPECIFICATION
// ============================================================================
// Expected Backend Endpoint:
// GET /api/quotations
// Headers: Authorization: Bearer <access_token>
// Response format:
// {
//   "success": true,
//   "data": [ ... array of quotation objects below ... ]
// }
// ============================================================================
const MOCK_QUOTATIONS = [
  {
    id: 'Q-001',
    customerName: 'Acme Corp',
    amount: 12400,
    status: 'Draft',
  },
  {
    id: 'Q-002',
    customerName: 'Delta LLC',
    amount: 3200,
    status: 'Draft',
  },
  {
    id: 'Q-003',
    customerName: 'Beta Industries',
    amount: 28900,
    status: 'Pending Approval',
  },
  {
    id: 'Q-004',
    customerName: 'Nova Retail',
    amount: 9750,
    status: 'Approved',
  },
  {
    id: 'Q-005',
    customerName: 'Zenith Co',
    amount: 15300,
    status: 'Negotiation',
  },
  {
    id: 'Q-006',
    customerName: 'Orion Ltd',
    amount: 41000,
    status: 'Confirmed',
  },
];

export const Quotations = () => {
  const navigate = useNavigate();
  // View mode state: 'kanban' (default) or 'table'
  const [viewMode, setViewMode] = useState('kanban');

  const handleQuotationClick = (quotationId) => {
    navigate(`/quotations/${quotationId}`);
  };

  const handleToggleView = () => {
    setViewMode((prev) => (prev === 'kanban' ? 'table' : 'kanban'));
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* 1. Top Navigation */}
      <DashboardNavbar />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* 2. Page Header & Top Quick Controls */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Quotations (List)
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Every quotation in the system, one row per quotation, click a row to open it
            </p>
          </div>

          {/* Controls: New Quotation & Toggle View */}
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleToggleView}
              className="sm:!w-auto px-4 gap-2"
              aria-label={viewMode === 'kanban' ? 'Switch to Table View' : 'Switch to Kanban View'}
            >
              {viewMode === 'kanban' ? (
                <>
                  <TableIcon className="h-4 w-4 text-slate-600" />
                  <span>Switch to Table View</span>
                </>
              ) : (
                <>
                  <LayoutGrid className="h-4 w-4 text-slate-600" />
                  <span>Switch to Kanban View</span>
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="primary"
              onClick={() => navigate('/quotations/new')}
              className="sm:!w-auto px-4 gap-1.5"
            >
              <Plus className="h-4 w-4" />
              <span>+ New Quotation</span>
            </Button>
          </div>
        </div>

        {/* 3. Quotation Content (Kanban or Table View) */}
        <section aria-label="Quotations List">
          {viewMode === 'kanban' ? (
            <QuotationBoard
              quotations={MOCK_QUOTATIONS}
              onQuotationClick={handleQuotationClick}
            />
          ) : (
            <QuotationTable
              quotations={MOCK_QUOTATIONS}
              onQuotationClick={handleQuotationClick}
            />
          )}
        </section>

        {/* 4. Bottom Actions (as specified in design reference) */}
        <section aria-label="Bottom Actions" className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 border-t border-slate-200">
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
            variant="outline"
            onClick={handleToggleView}
            className="sm:!w-auto px-5 gap-2"
          >
            {viewMode === 'kanban' ? (
              <>
                <TableIcon className="h-4 w-4 text-slate-600" />
                <span>Switch to Table View</span>
              </>
            ) : (
              <>
                <LayoutGrid className="h-4 w-4 text-slate-600" />
                <span>Switch to Kanban View</span>
              </>
            )}
          </Button>
        </section>

      </main>
    </div>
  );
};

export default Quotations;
