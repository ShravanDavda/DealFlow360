import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowRightLeft,
  CalendarClock,
  CheckCircle2,
  Edit3,
  Info,
  Plus,
  RotateCcw,
  ShieldCheck,
  X,
} from 'lucide-react';
import { DashboardNavbar } from '../components/dashboard/DashboardNavbar';
import { Button } from '../components/ui/Button';
import { getProducts } from '../services/productService';
import {
  createSubscriptionPlan,
  deleteSubscriptionPlan,
  activateSubscriptionPlan,
  deactivateSubscriptionPlan,
  getSubscriptionPlans,
  updateSubscriptionPlan,
} from '../services/subscriptionPlanService';

const EMPTY_FORM = {
  id: null,
  name: '',
  description: '',
  billingInterval: 'Monthly',
  recurringPrice: '',
  productIds: [],
  prorationRule: 'Calendar Month / Immediate (Prorate first cycle)',
  cancellationRule: 'End of Billing Cycle',
  partialRefundRule: 'Prorated within 14 days',
};

const PRORATION_RULES = [
  'Calendar Month / Immediate (Prorate first cycle)',
  'Full Period Charge',
];

const CANCELLATION_RULES = ['End of Billing Cycle', 'Immediate'];
const REFUND_RULES = ['Prorated within 14 days', 'Prorated unused months', 'Non-refundable after 30 days'];

const getPlanProducts = (plan) => plan.products || [];
const getPlanPrice = (plan) => plan.recurringPrice ?? plan.recurringAmount ?? plan.price ?? null;

export const AdminSubscriptionPlans = () => {
  const [plans, setPlans] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [planData, productData] = await Promise.all([getSubscriptionPlans(), getProducts()]);
      setPlans(planData);
      setProducts(productData.filter((product) => product.is_active !== false));
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Unable to load subscription plans.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreate = () => {
    setMessage({ type: '', text: '' });
    setForm({ ...EMPTY_FORM });
  };

  const openEdit = (plan) => {
    setMessage({ type: '', text: '' });
    setForm({
      ...EMPTY_FORM,
      ...plan,
      recurringPrice: getPlanPrice(plan) ?? '',
      productIds: getPlanProducts(plan).map((product) => product.id),
      isActive: plan.isActive ?? plan.is_active ?? true,
    });
  };

  const closeForm = () => {
    if (!isSaving) setForm(null);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleProductChange = (event) => {
    const productId = Number(event.target.value);
    setForm((current) => ({
      ...current,
      productIds: productId ? [productId] : [],
    }));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) {
      setMessage({ type: 'error', text: 'Plan name is required.' });
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        billingInterval: form.billingInterval,
        recurringPrice: form.recurringPrice === '' ? null : Number(form.recurringPrice),
        productIds: form.productIds,
        prorationRule: form.prorationRule,
        cancellationRule: form.cancellationRule,
        partialRefundRule: form.partialRefundRule,
        isActive: form.isActive ?? true,
      };

      if (form.id) await updateSubscriptionPlan(form.id, payload);
      else await createSubscriptionPlan(payload);

      setForm(null);
      setMessage({ type: 'success', text: 'Subscription plan saved successfully.' });
      await loadData();
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Unable to save subscription plan.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeactivate = async (plan) => {
    const isActive = plan.isActive ?? plan.is_active ?? true;
    const action = isActive ? 'Deactivate' : 'Activate';
    if (!window.confirm(`${action} ${plan.name}?`)) return;
    try {
      if (isActive) await deactivateSubscriptionPlan(plan.id);
      else await activateSubscriptionPlan(plan.id);
      setMessage({ type: 'success', text: `Subscription plan ${isActive ? 'deactivated' : 'activated'} successfully.` });
      await loadData();
    } catch (error) {
      setMessage({ type: 'error', text: error.message || `Unable to ${isActive ? 'deactivate' : 'activate'} subscription plan.` });
    }
  };

  const handleDelete = async () => {
    if (!form?.id || !window.confirm(`Delete ${form.name}? This cannot be undone.`)) return;
    setIsSaving(true);
    try {
      await deleteSubscriptionPlan(form.id);
      setForm(null);
      setMessage({ type: 'success', text: 'Subscription plan deleted successfully.' });
      await loadData();
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Unable to delete subscription plan.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardNavbar />
      <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white shadow-sm">
                <ArrowRightLeft className="h-5 w-5" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Subscription Plan Configuration</h1>
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Configure recurring billing schedules (Monthly, Quarterly, Yearly), proration policies, and cancellation/refund governance.
            </p>
          </div>
          <Button type="button" onClick={openCreate} className="sm:!w-auto px-4 gap-2">
            <Plus className="h-4 w-4" />
            <span>New Plan</span>
          </Button>
        </header>

        {message.text && (
          <div className={`flex items-center gap-3 rounded-md border px-4 py-3 text-sm font-medium ${message.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`} role="status">
            {message.type === 'error' ? <AlertCircle className="h-5 w-5 shrink-0" /> : <CheckCircle2 className="h-5 w-5 shrink-0" />}
            <span>{message.text}</span>
          </div>
        )}

        <section aria-label="Subscription plans">
          {isLoading ? (
            <div className="rounded-lg border border-slate-200 bg-white py-16 text-center text-sm font-medium text-slate-500">
              Loading subscription plans...
            </div>
          ) : plans.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-white py-16 text-center text-sm text-slate-500">
              No subscription plans configured yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {plans.map((plan) => {
                const isActive = plan.isActive ?? plan.is_active ?? true;
                const planProducts = getPlanProducts(plan);
                const price = getPlanPrice(plan);
                return (
                  <article key={plan.id} className="flex min-h-[430px] flex-col rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
                    <div className="flex items-center justify-between gap-3">
                      <span className="rounded border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
                        {plan.billingInterval || 'Monthly'}
                      </span>
                      <span className={`rounded border px-2 py-1 text-xs font-semibold ${isActive ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-100 text-slate-600'}`}>
                        {isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <h2 className="mt-6 text-xl font-bold text-slate-900">{plan.name}</h2>
                    <p className="mt-1 text-sm text-slate-500">Service: {planProducts[0]?.name || 'No product associated'}</p>
                    <div className="mt-5 flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-slate-900">{price === null ? '--' : `$${Number(price).toLocaleString()}`}</span>
                      <span className="text-sm font-medium text-slate-500">/ {String(plan.billingInterval || 'monthly').toLowerCase()}</span>
                    </div>
                    <p className="mt-6 min-h-[48px] text-sm leading-6 text-slate-600">{plan.description || 'No description provided.'}</p>

                    <div className="my-5 border-t border-slate-100" />
                    <dl className="space-y-3 text-sm text-slate-600">
                      <div className="flex items-start gap-2"><CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" /><div><dt className="inline font-semibold text-slate-700">Proration:</dt> <dd className="inline">{plan.prorationRule || 'Not configured'}</dd></div></div>
                      <div className="flex items-start gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" /><div><dt className="inline font-semibold text-slate-700">Cancel:</dt> <dd className="inline">{plan.cancellationRule || 'Not configured'}</dd></div></div>
                      <div className="flex items-start gap-2"><RotateCcw className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" /><div><dt className="inline font-semibold text-slate-700">Refund:</dt> <dd className="inline">{plan.partialRefundRule || 'Not configured'}</dd></div></div>
                    </dl>

                    <div className="mt-auto border-t border-slate-100 pt-5">
                      <div className="flex items-center justify-between gap-3">
                        <button type="button" onClick={() => handleDeactivate(plan)} className={`text-sm font-medium ${isActive ? 'text-slate-600 hover:text-red-700' : 'text-emerald-700 hover:text-emerald-800'}`}>
                          {isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <Button type="button" variant="outline" onClick={() => openEdit(plan)} className="!w-auto px-4 gap-2">
                          <Edit3 className="h-4 w-4" />
                          <span>Edit Plan</span>
                        </Button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <aside className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-5 py-4 text-amber-900" role="note">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <p className="text-sm font-semibold">Subscription plans configured here integrate directly with the Billing and Invoice Generation engine.</p>
            <p className="mt-1 text-sm text-amber-800">When a quotation containing recurring line items is confirmed, DealFlow360 provisions an active subscription schedule with the proration and billing cycle specified above.</p>
          </div>
        </aside>
      </main>

      {form && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/45 px-4 py-6 sm:py-10" role="dialog" aria-modal="true" aria-labelledby="subscription-plan-modal-title">
          <div className="mx-auto max-w-2xl rounded-lg bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <h2 id="subscription-plan-modal-title" className="text-lg font-bold text-slate-900">{form.id ? 'Edit Subscription Plan' : 'Create Subscription Plan'}</h2>
              <button type="button" onClick={closeForm} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close modal"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-5 px-6 py-6">
              <label className="block text-sm font-medium text-slate-700">Plan Name *<input required name="name" value={form.name} onChange={handleChange} placeholder="e.g. Care Plan 2yr - Enterprise SLA" className="mt-2 block w-full rounded-md border border-slate-300 px-3.5 py-2.5 font-normal text-slate-900 placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-slate-900" /></label>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700">Billing Cycle *<select required name="billingInterval" value={form.billingInterval} onChange={handleChange} className="mt-2 block w-full rounded-md border border-slate-300 bg-white px-3.5 py-2.5 font-normal text-slate-700 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-slate-900"><option>Monthly</option><option>Quarterly</option><option>Yearly</option></select></label>
                <label className="block text-sm font-medium text-slate-700">Recurring Price ($) *<input required name="recurringPrice" type="number" min="0" step="0.01" value={form.recurringPrice} onChange={handleChange} className="mt-2 block w-full rounded-md border border-slate-300 px-3.5 py-2.5 font-normal text-slate-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-slate-900" /></label>
              </div>

              <label className="block text-sm font-medium text-slate-700">Associated Service/Product<select value={form.productIds[0] || ''} onChange={handleProductChange} className="mt-2 block w-full rounded-md border border-slate-300 bg-white px-3.5 py-2.5 font-normal text-slate-700 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-slate-900"><option value="">Select a product or service</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>

              <label className="block text-sm font-medium text-slate-700">Proration Rule<select name="prorationRule" value={form.prorationRule} onChange={handleChange} className="mt-2 block w-full rounded-md border border-slate-300 bg-white px-3.5 py-2.5 font-normal text-slate-700 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-slate-900">{PRORATION_RULES.map((rule) => <option key={rule}>{rule}</option>)}</select></label>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700">Cancellation Rule<select name="cancellationRule" value={form.cancellationRule} onChange={handleChange} className="mt-2 block w-full rounded-md border border-slate-300 bg-white px-3.5 py-2.5 font-normal text-slate-700 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-slate-900">{CANCELLATION_RULES.map((rule) => <option key={rule}>{rule}</option>)}</select></label>
                <label className="block text-sm font-medium text-slate-700">Partial Refund Rule<select name="partialRefundRule" value={form.partialRefundRule} onChange={handleChange} className="mt-2 block w-full rounded-md border border-slate-300 bg-white px-3.5 py-2.5 font-normal text-slate-700 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-slate-900">{REFUND_RULES.map((rule) => <option key={rule}>{rule}</option>)}</select></label>
              </div>

              <label className="block text-sm font-medium text-slate-700">Description<textarea name="description" rows="3" value={form.description} onChange={handleChange} placeholder="SLA scope and coverage terms..." className="mt-2 block w-full resize-y rounded-md border border-slate-300 px-3.5 py-2.5 font-normal text-slate-900 placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-slate-900" /></label>

              <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-5">
                {form.id ? <button type="button" onClick={handleDelete} disabled={isSaving} className="text-sm font-medium text-red-600 hover:text-red-800 disabled:opacity-50">Delete Plan</button> : <span />}
                <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={closeForm} className="!w-auto px-5">Cancel</Button>
                <Button type="submit" isLoading={isSaving} className="!w-auto px-5">Save Plan</Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSubscriptionPlans;
