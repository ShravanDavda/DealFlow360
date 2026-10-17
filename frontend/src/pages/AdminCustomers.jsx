import React, { useEffect, useState } from 'react';
import { Edit3, Plus, Users, X, KeyRound, Copy, Check } from 'lucide-react';
import { DashboardNavbar } from '../components/dashboard/DashboardNavbar';
import { Button } from '../components/ui/Button';
import { getCurrentUser } from '../services/authService';
import {
  activateCustomer,
  createCustomer,
  deactivateCustomer,
  getCustomerTiers,
  getCustomers,
  updateCustomer,
  reissueCustomerActivation,
} from '../services/customerService';

const EMPTY_FORM = {
  id: null,
  customerCode: '',
  companyName: '',
  contactName: '',
  email: '',
  phone: '',
  customerTierId: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  country: '',
  postalCode: '',
  currency: 'USD',
  isActive: true,
};

export const AdminCustomers = () => {
  const [customers, setCustomers] = useState([]);
  const [tiers, setTiers] = useState([]);
  const [form, setForm] = useState(null);
  const [activationModal, setActivationModal] = useState(null);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', text: '' });
  const [isAdmin, setIsAdmin] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [customerData, tierData] = await Promise.all([getCustomers(), getCustomerTiers()]);
      setCustomers(customerData);
      setTiers(tierData.filter((tier) => tier.is_active !== false));
    } catch (error) {
      setFeedback({ type: 'error', text: error.message || 'Unable to load customers.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    getCurrentUser().then((response) => setIsAdmin(response?.data?.role === 'admin')).catch(() => setIsAdmin(false));
  }, []);

  const openCreate = () => {
    setFeedback({ type: '', text: '' });
    setForm({ ...EMPTY_FORM, customerTierId: tiers[0]?.id || '' });
  };

  const openEdit = (customer) => {
    setFeedback({ type: '', text: '' });
    setForm({
      ...EMPTY_FORM,
      ...customer,
      customerCode: customer.customer_code,
      companyName: customer.company_name,
      contactName: customer.contact_name || '',
      customerTierId: customer.customer_tier_id,
      addressLine1: customer.address_line1 || '',
      addressLine2: customer.address_line2 || '',
      postalCode: customer.postal_code || '',
      isActive: customer.is_active,
    });
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setFeedback({ type: '', text: '' });
    try {
      const payload = {
        customerCode: form.customerCode.trim(),
        companyName: form.companyName.trim(),
        contactName: form.contactName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        customerTierId: Number(form.customerTierId),
        addressLine1: form.addressLine1.trim() || null,
        addressLine2: form.addressLine2.trim() || null,
        city: form.city.trim() || null,
        state: form.state.trim() || null,
        country: form.country.trim() || null,
        postalCode: form.postalCode.trim() || null,
        currency: form.currency,
        isActive: form.isActive,
      };
      if (form.id) {
        await updateCustomer(form.id, payload);
        setFeedback({ type: 'success', text: `Customer updated successfully.` });
      } else {
        const result = await createCustomer(payload);
        if (result?.portalAccount?.activationCode) {
          setActivationModal({
            companyName: result.company_name,
            email: result.portalAccount.email || payload.email,
            activationCode: result.portalAccount.activationCode,
            status: result.portalAccount.status || 'pending_activation',
            expiresAt: result.portalAccount.activationExpiresAt,
            isNew: true
          });
        }
        setFeedback({ type: 'success', text: `Customer created successfully.` });
      }
      setForm(null);
      await loadData();
    } catch (error) {
      setFeedback({ type: 'error', text: error.message || 'Unable to save customer.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReissueActivation = async (customer) => {
    setFeedback({ type: '', text: '' });
    try {
      const result = await reissueCustomerActivation(customer.id);
      setActivationModal({
        companyName: customer.company_name,
        email: customer.email,
        activationCode: result.activationCode,
        status: result.status || 'pending_activation',
        expiresAt: result.activationExpiresAt,
        isNew: false
      });
      setFeedback({ type: 'success', text: `New activation code generated for ${customer.company_name}.` });
      await loadData();
    } catch (error) {
      setFeedback({ type: 'error', text: error.response?.data?.message || error.message || 'Unable to reissue activation code.' });
    }
  };

  const copyCodeToClipboard = (code) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const toggleStatus = async (customer) => {
    try {
      if (customer.is_active) await deactivateCustomer(customer.id);
      else await activateCustomer(customer.id);
      setFeedback({ type: 'success', text: `Customer ${customer.is_active ? 'deactivated' : 'activated'} successfully.` });
      await loadData();
    } catch (error) {
      setFeedback({ type: 'error', text: error.message || 'Unable to update customer status.' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardNavbar />
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white shadow-sm"><Users className="h-5 w-5" /></div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Customers</h1>
            </div>
            <p className="mt-2 text-sm text-slate-600">Manage customer master records and Customer Portal activations.</p>
          </div>
          {isAdmin && <Button type="button" onClick={openCreate} className="sm:!w-auto px-4 gap-2"><Plus className="h-4 w-4" /><span>Add Customer</span></Button>}
        </header>

        {feedback.text && <div className={`rounded-md border px-4 py-3 text-sm font-medium ${feedback.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`} role="status">{feedback.text}</div>}

        {isLoading ? <div className="rounded-lg border border-slate-200 bg-white py-16 text-center text-sm text-slate-500">Loading customers...</div> : (
          <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm" aria-label="Customers">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50 text-slate-700"><tr><th className="px-6 py-3 font-semibold">Customer Code</th><th className="px-3 py-3 font-semibold">Company</th><th className="px-3 py-3 font-semibold">Contact</th><th className="px-3 py-3 font-semibold">Email</th><th className="px-3 py-3 font-semibold">Tier</th><th className="px-3 py-3 font-semibold">Portal Access</th><th className="px-3 py-3 font-semibold">Status</th><th className="px-6 py-3 text-right font-semibold">Actions</th></tr></thead>
                <tbody className="divide-y divide-slate-200">
                  {customers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 font-mono text-slate-700">{customer.customer_code}</td>
                      <td className="px-3 py-4 font-medium text-slate-900">{customer.company_name}</td>
                      <td className="px-3 py-4 text-slate-700">{customer.contact_name || '--'}</td>
                      <td className="px-3 py-4 text-slate-600">{customer.email}</td>
                      <td className="px-3 py-4 text-slate-700">{customer.customer_tier_name}</td>
                      <td className="px-3 py-4">
                        {customer.portal_status === 'active' ? (
                          <span className="inline-flex items-center rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                            Active
                          </span>
                        ) : customer.portal_status === 'pending_activation' ? (
                          <span className="inline-flex items-center rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                            Pending Activation
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                            Not Configured
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-4">
                        <span className={`rounded border px-2 py-1 text-xs font-semibold ${customer.is_active ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-100 text-slate-600'}`}>
                          {customer.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {isAdmin && (
                          <div className="flex justify-end gap-1.5 flex-wrap">
                            {customer.portal_status !== 'active' && (
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => handleReissueActivation(customer)}
                                className="sm:!w-auto px-2.5 py-1 text-xs gap-1 text-indigo-700 hover:text-indigo-800 hover:bg-indigo-50 border-indigo-200"
                              >
                                <KeyRound className="h-3.5 w-3.5" />
                                <span>{customer.portal_status === 'pending_activation' ? 'Reissue Code' : 'Enable Portal'}</span>
                              </Button>
                            )}
                            <Button type="button" variant="outline" onClick={() => openEdit(customer)} className="sm:!w-auto px-2.5 py-1 text-xs gap-1">
                              <Edit3 className="h-3.5 w-3.5" />
                              <span>Edit</span>
                            </Button>
                            <Button type="button" variant="outline" onClick={() => toggleStatus(customer)} className={`sm:!w-auto px-2.5 py-1 text-xs ${customer.is_active ? 'text-rose-700' : 'text-emerald-700'}`}>
                              {customer.is_active ? 'Deactivate' : 'Activate'}
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {customers.length === 0 && <tr><td colSpan="8" className="py-12 text-center text-slate-500">No customers found.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>

      {activationModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 px-4 py-6 sm:py-10 flex items-center justify-center" role="dialog" aria-modal="true">
          <div className="mx-auto max-w-md w-full rounded-xl bg-white shadow-2xl overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <KeyRound className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-base">Customer Portal Activation</h3>
                  <p className="text-xs text-slate-300">
                    {activationModal.isNew ? 'Customer Account Created' : 'Activation Code Reissued'}
                  </p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setActivationModal(null)} 
                className="text-slate-400 hover:text-white rounded-md p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Company</span>
                <p className="text-sm font-semibold text-slate-900 mt-0.5">{activationModal.companyName}</p>
              </div>

              <div>
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Portal Login Email</span>
                <p className="text-sm font-mono text-slate-800 mt-0.5 bg-slate-50 px-2.5 py-1.5 rounded border border-slate-200">
                  {activationModal.email}
                </p>
              </div>

              <div>
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Portal Status</span>
                <p className="mt-0.5">
                  <span className="inline-flex items-center rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800">
                    Pending Activation
                  </span>
                </p>
              </div>

              <div>
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Secure Activation Code</span>
                <div className="mt-1 flex items-center gap-2">
                  <div className="flex-1 font-mono text-base font-bold tracking-wider text-indigo-900 bg-indigo-50 border border-indigo-200 px-3.5 py-2.5 rounded-lg text-center select-all">
                    {activationModal.activationCode}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => copyCodeToClipboard(activationModal.activationCode)}
                    className="sm:!w-auto px-3 py-2.5 shrink-0 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                    title="Copy to clipboard"
                  >
                    {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                    <span className="ml-1 text-xs">{copied ? 'Copied' : 'Copy'}</span>
                  </Button>
                </div>
                <p className="mt-1.5 text-xs text-slate-500">
                  Single-use code. Valid for 24 hours. Provide this code to the customer to set their password at <span className="font-mono text-slate-700">/activate</span>.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => setActivationModal(null)}
                  className="sm:!w-auto px-5"
                >
                  Done
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {form && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/45 px-4 py-6 sm:py-10" role="dialog" aria-modal="true" aria-labelledby="customer-form-title">
          <div className="mx-auto max-w-3xl rounded-lg bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <h2 id="customer-form-title" className="text-lg font-bold text-slate-900">{form.id ? 'Customer Details' : 'Add Customer'}</h2>
              <button type="button" onClick={() => setForm(null)} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100" aria-label="Close dialog">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="grid grid-cols-1 gap-4 px-6 py-6 sm:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">Customer Code *
                <input required readOnly={Boolean(form.id)} name="customerCode" value={form.customerCode} onChange={handleChange} className="mt-2 block w-full rounded-md border border-slate-300 px-3 py-2.5 font-normal text-slate-900 read-only:bg-slate-50" />
              </label>
              <label className="text-sm font-medium text-slate-700">Company Name *
                <input required name="companyName" value={form.companyName} onChange={handleChange} className="mt-2 block w-full rounded-md border border-slate-300 px-3 py-2.5 font-normal text-slate-900" />
              </label>
              <label className="text-sm font-medium text-slate-700">Contact Name *
                <input required name="contactName" value={form.contactName} onChange={handleChange} className="mt-2 block w-full rounded-md border border-slate-300 px-3 py-2.5 font-normal text-slate-900" />
              </label>
              <label className="text-sm font-medium text-slate-700">Email *
                <input required type="email" name="email" value={form.email} onChange={handleChange} className="mt-2 block w-full rounded-md border border-slate-300 px-3 py-2.5 font-normal text-slate-900" />
              </label>
              <label className="text-sm font-medium text-slate-700">Phone
                <input name="phone" value={form.phone} onChange={handleChange} className="mt-2 block w-full rounded-md border border-slate-300 px-3 py-2.5 font-normal text-slate-900" />
              </label>
              <label className="text-sm font-medium text-slate-700">Customer Tier *
                <select required name="customerTierId" value={form.customerTierId} onChange={handleChange} className="mt-2 block w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 font-normal text-slate-700">
                  <option value="">Select tier</option>
                  {tiers.map((tier) => <option key={tier.id} value={tier.id}>{tier.name}</option>)}
                </select>
              </label>
              <label className="text-sm font-medium text-slate-700">Currency *
                <select required name="currency" value={form.currency} onChange={handleChange} className="mt-2 block w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 font-normal text-slate-700">
                  <option>USD</option>
                  <option>INR</option>
                  <option>EUR</option>
                </select>
              </label>
              <label className="text-sm font-medium text-slate-700 sm:col-span-2">Address Line 1
                <input name="addressLine1" value={form.addressLine1} onChange={handleChange} className="mt-2 block w-full rounded-md border border-slate-300 px-3 py-2.5 font-normal text-slate-900" />
              </label>
              <label className="text-sm font-medium text-slate-700 sm:col-span-2">Address Line 2
                <input name="addressLine2" value={form.addressLine2} onChange={handleChange} className="mt-2 block w-full rounded-md border border-slate-300 px-3 py-2.5 font-normal text-slate-900" />
              </label>
              <label className="text-sm font-medium text-slate-700">City
                <input name="city" value={form.city} onChange={handleChange} className="mt-2 block w-full rounded-md border border-slate-300 px-3 py-2.5 font-normal text-slate-900" />
              </label>
              <label className="text-sm font-medium text-slate-700">State
                <input name="state" value={form.state} onChange={handleChange} className="mt-2 block w-full rounded-md border border-slate-300 px-3 py-2.5 font-normal text-slate-900" />
              </label>
              <label className="text-sm font-medium text-slate-700">Country
                <input name="country" value={form.country} onChange={handleChange} className="mt-2 block w-full rounded-md border border-slate-300 px-3 py-2.5 font-normal text-slate-900" />
              </label>
              <label className="text-sm font-medium text-slate-700">Postal Code
                <input name="postalCode" value={form.postalCode} onChange={handleChange} className="mt-2 block w-full rounded-md border border-slate-300 px-3 py-2.5 font-normal text-slate-900" />
              </label>
              <div className="flex justify-end gap-3 border-t border-slate-100 pt-5 sm:col-span-2">
                <Button type="button" variant="outline" onClick={() => setForm(null)} className="sm:!w-auto px-4">Cancel</Button>
                <Button type="submit" disabled={isSaving} className="sm:!w-auto px-4">{isSaving ? 'Saving...' : 'Save Customer'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCustomers;

