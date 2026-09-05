import React, { useState } from 'react';
import { CheckCircle2, AlertCircle, Save, Settings } from 'lucide-react';
import { DashboardNavbar } from '../components/dashboard/DashboardNavbar';
import { TierDiscountTable } from '../components/settings/TierDiscountTable';
import { CategoryDiscountTable } from '../components/settings/CategoryDiscountTable';
import { ApprovalRulesTable } from '../components/settings/ApprovalRulesTable';
import { Button } from '../components/ui/Button';

// ============================================================================
// FRONTEND MOCK DATA & FUTURE BACKEND API CONTRACT
// ============================================================================
// API 1: GET /api/settings/discount-approval
//   Returns { tiers: [ ... ], categories: [ ... ], approvalRules: [ ... ] }
// API 2: PUT /api/settings/discount-approval
//   Payload: { tiers: [ ... ], categories: [ ... ], approvalRules: [ ... ] }
//   Returns { success: true, message: "Discount configuration saved successfully", data: { ... } }
// API 3: GET /api/settings/discount-approval/audit
//   Returns audit trail of configuration updates
// ============================================================================
const MOCK_DISCOUNT_CONFIG = {
  tiers: [
    {
      id: 'bronze',
      name: 'Bronze',
      maxDiscountPercent: 5,
    },
    {
      id: 'silver',
      name: 'Silver',
      maxDiscountPercent: 10,
    },
    {
      id: 'gold',
      name: 'Gold',
      maxDiscountPercent: 15,
    },
  ],

  categories: [
    {
      id: 'hardware',
      name: 'Hardware',
      maxDiscountPercent: 15,
    },
    {
      id: 'services',
      name: 'Services',
      maxDiscountPercent: 10,
    },
  ],

  approvalRules: [
    {
      id: 'within-limit',
      discountRange: 'Within tier/category limit',
      approvalChain: 'No approval needed',
    },
    {
      id: 'medium-risk',
      discountRange: 'Over limit, blended risk medium',
      approvalChain: 'Sales Manager',
    },
    {
      id: 'high-risk',
      discountRange: 'Over limit, blended high risk',
      approvalChain: 'Sales Manager then Finance',
    },
  ],
};

export const DiscountApprovalSettings = () => {
  const [config, setConfig] = useState(MOCK_DISCOUNT_CONFIG);
  const [tierErrors, setTierErrors] = useState({});
  const [categoryErrors, setCategoryErrors] = useState({});
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [globalError, setGlobalError] = useState('');

  const handleTierChange = (id, value) => {
    setFeedbackMessage('');
    setGlobalError('');
    setConfig((prev) => ({
      ...prev,
      tiers: prev.tiers.map((t) =>
        t.id === id ? { ...t, maxDiscountPercent: value } : t
      ),
    }));

    // Inline validation check
    const num = Number(value);
    if (value === '' || isNaN(num) || num < 0 || num > 100) {
      setTierErrors((prev) => ({
        ...prev,
        [id]: 'Discount must be between 0% and 100%.',
      }));
    } else {
      setTierErrors((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  const handleCategoryChange = (id, value) => {
    setFeedbackMessage('');
    setGlobalError('');
    setConfig((prev) => ({
      ...prev,
      categories: prev.categories.map((c) =>
        c.id === id ? { ...c, maxDiscountPercent: value } : c
      ),
    }));

    // Inline validation check
    const num = Number(value);
    if (value === '' || isNaN(num) || num < 0 || num > 100) {
      setCategoryErrors((prev) => ({
        ...prev,
        [id]: 'Discount must be between 0% and 100%.',
      }));
    } else {
      setCategoryErrors((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  const handleSaveConfiguration = (e) => {
    e?.preventDefault();
    setFeedbackMessage('');
    setGlobalError('');

    const newTierErrors = {};
    config.tiers.forEach((t) => {
      const num = Number(t.maxDiscountPercent);
      if (t.maxDiscountPercent === '' || isNaN(num) || num < 0 || num > 100) {
        newTierErrors[t.id] = 'Discount must be between 0% and 100%.';
      }
    });

    const newCatErrors = {};
    config.categories.forEach((c) => {
      const num = Number(c.maxDiscountPercent);
      if (c.maxDiscountPercent === '' || isNaN(num) || num < 0 || num > 100) {
        newCatErrors[c.id] = 'Discount must be between 0% and 100%.';
      }
    });

    setTierErrors(newTierErrors);
    setCategoryErrors(newCatErrors);

    if (Object.keys(newTierErrors).length > 0 || Object.keys(newCatErrors).length > 0) {
      setGlobalError('Please fix the validation errors before saving. Discount values must be between 0% and 100%.');
      return;
    }

    // Successfully saved to local component state (frontend only)
    setFeedbackMessage('Discount configuration saved successfully.');
    setTimeout(() => {
      setFeedbackMessage('');
    }, 5000);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* 1. Top Navigation */}
      <DashboardNavbar />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* 2. Page Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-md bg-slate-900 text-white shadow-sm">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Discount tiers and approval chains
              </h1>
              <p className="mt-0.5 text-sm text-slate-600">
                Admin configuration for discount ceilings and risk-based approval chains
              </p>
            </div>
          </div>
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

        {/* Global Error Banner */}
        {globalError && (
          <div 
            className="p-4 rounded-lg bg-rose-50 border border-rose-200 flex items-center gap-3 shadow-sm transition-all"
            role="alert"
          >
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
            <span className="text-sm font-medium text-rose-900">
              {globalError}
            </span>
          </div>
        )}

        {/* Configuration Form */}
        <form onSubmit={handleSaveConfiguration} className="space-y-8">
          
          {/* Section 1 — Tier Discount Ceilings */}
          <section aria-label="Customer Tier Discount Ceilings">
            <TierDiscountTable
              tiers={config.tiers}
              onChange={handleTierChange}
              errors={tierErrors}
            />
          </section>

          {/* Section 2 — Category Discount Ceilings */}
          <section aria-label="Product Category Discount Ceilings">
            <CategoryDiscountTable
              categories={config.categories}
              onChange={handleCategoryChange}
              errors={categoryErrors}
            />
          </section>

          {/* Section 3 — Approval Chain Rules */}
          <section aria-label="Approval Chain Routing Rules">
            <ApprovalRulesTable rules={config.approvalRules} />
          </section>

          {/* Primary Save Action Button */}
          <div className="pt-2 border-t border-slate-200 flex items-center justify-start">
            <Button
              type="submit"
              variant="primary"
              className="sm:!w-auto px-6 gap-2 bg-slate-900 hover:bg-slate-800 text-white shadow-sm"
            >
              <Save className="h-4 w-4" />
              <span>Save configuration</span>
            </Button>
          </div>

        </form>

        {/* Informational Warning / Guidance Notice */}
        <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
          <div className="space-y-1 text-sm text-amber-900 font-medium leading-relaxed">
            <p>
              When a quote mixes categories with different ceilings, the system must compute a blended risk score and route to the highest required level.
            </p>
            <p className="text-xs text-amber-800 font-normal">
              All approvals, rejections, and edits must be logged with user, timestamp, and reason.
            </p>
          </div>
        </div>

      </main>
    </div>
  );
};

export default DiscountApprovalSettings;
