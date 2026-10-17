import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Save, Settings, RefreshCw } from 'lucide-react';
import { DashboardNavbar } from '../components/dashboard/DashboardNavbar';
import { TierDiscountTable } from '../components/settings/TierDiscountTable';
import { CategoryDiscountTable } from '../components/settings/CategoryDiscountTable';
import { ApprovalRulesTable } from '../components/settings/ApprovalRulesTable';
import { Button } from '../components/ui/Button';
import {
  getDiscountApprovalSettings,
  updateDiscountApprovalSettings
} from '../services/settingsService';

export const DiscountApprovalSettings = () => {
  const [config, setConfig] = useState({
    tiers: [],
    categories: [],
    approvalRules: []
  });
  const [tierErrors, setTierErrors] = useState({});
  const [categoryErrors, setCategoryErrors] = useState({});
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [globalError, setGlobalError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const data = await getDiscountApprovalSettings();
      if (data) setConfig(data);
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleTierChange = (id, value) => {
    setFeedbackMessage('');
    setGlobalError('');
    setConfig((prev) => ({
      ...prev,
      tiers: prev.tiers.map((t) =>
        t.id === id ? { ...t, maxDiscountPercent: value } : t
      ),
    }));

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

  const handleSaveConfiguration = async (e) => {
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

    try {
      setIsSaving(true);
      const updated = await updateDiscountApprovalSettings({
        tiers: config.tiers,
        categories: config.categories
      });
      if (updated) setConfig(updated);
      setFeedbackMessage('Discount configuration saved successfully to backend database.');
      setTimeout(() => setFeedbackMessage(''), 5000);
    } catch (err) {
      setGlobalError(err.message || 'Failed to save configuration.');
    } finally {
      setIsSaving(false);
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
                <Settings className="h-5 w-5" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Discount Tiers & Approval Chains
              </h1>
            </div>
            <p className="text-sm text-slate-600">
              Admin configuration for customer tier discount ceilings, category caps, and risk routing.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchSettings}
            className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 bg-white px-3 py-1.5 rounded-md border border-slate-200 shadow-sm"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
            <span>Reload Rules</span>
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

        {globalError && (
          <div 
            className="p-4 rounded-lg bg-rose-50 border border-rose-200 flex items-center gap-3 shadow-sm transition-all animate-in fade-in"
            role="alert"
          >
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
            <span className="text-sm font-medium text-rose-900">
              {globalError}
            </span>
          </div>
        )}

        <form onSubmit={handleSaveConfiguration} className="space-y-8">
          
          <section aria-label="Customer Tier Discount Ceilings">
            <TierDiscountTable
              tiers={config.tiers}
              onChange={handleTierChange}
              errors={tierErrors}
            />
          </section>

          <section aria-label="Product Category Discount Ceilings">
            <CategoryDiscountTable
              categories={config.categories}
              onChange={handleCategoryChange}
              errors={categoryErrors}
            />
          </section>

          <section aria-label="Approval Chain Routing Rules">
            <ApprovalRulesTable rules={config.approvalRules} />
          </section>

          <div className="pt-2 border-t border-slate-200 flex items-center justify-start">
            <Button
              type="submit"
              variant="primary"
              isLoading={isSaving}
              className="sm:!w-auto px-6 gap-2 bg-slate-900 hover:bg-slate-800 text-white shadow-sm"
            >
              <Save className="h-4 w-4" />
              <span>Save Configuration</span>
            </Button>
          </div>

        </form>

        <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
          <div className="space-y-1 text-sm text-amber-900 font-medium leading-relaxed">
            <p>
              When a quote mixes categories with different ceilings (e.g. Hardware 15% and Services 10%), the system computes a blended risk score and routes to the highest required approval level.
            </p>
            <p className="text-xs text-amber-800 font-normal">
              All approvals, rejections, and edits are logged in the database audit trail with timestamp and reason.
            </p>
          </div>
        </div>

      </main>
    </div>
  );
};

export default DiscountApprovalSettings;
