import React, { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { DashboardNavbar } from '../components/dashboard/DashboardNavbar';
import { Button } from '../components/ui/Button';
import { createApprovalChain, deleteApprovalChain, getApprovalChains, updateApprovalChain } from '../services/approvalChainService';

const EMPTY = { id: null, name: '', minDiscountPercent: 0, maxDiscountPercent: '', minRisk: '', steps: [{ stepOrder: 1, approverRole: 'Sales Manager' }] };

export const AdminApprovalChains = () => {
  const [chains, setChains] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [message, setMessage] = useState('');

  const load = async () => setChains(await getApprovalChains());

  useEffect(() => {
    load().catch((error) => setMessage(error.message));
  }, []);

  const save = async (event) => {
    event.preventDefault();
    try {
      await (form.id ? updateApprovalChain(form.id, form) : createApprovalChain(form));
      setMessage('Approval chain saved.');
      setForm(EMPTY);
      await load();
    } catch (error) {
      setMessage(error.message);
    }
  };

  const toggleActive = async (chain) => {
    try {
      await updateApprovalChain(chain.id, { isActive: !chain.isActive });
      setMessage(`Approval chain ${chain.isActive ? 'deactivated' : 'activated'}.`);
      await load();
    } catch (error) {
      setMessage(error.message);
    }
  };

  const remove = async (chain) => {
    if (!window.confirm(`Delete approval chain "${chain.name}"?`)) return;
    try {
      await deleteApprovalChain(chain.id);
      setMessage('Approval chain deleted.');
      await load();
    } catch (error) {
      setMessage(error.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardNavbar />
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <header>
          <h1 className="text-2xl font-bold text-slate-900">Approval Chains</h1>
          <p className="mt-1 text-sm text-slate-600">Configure discount and risk approval steps.</p>
        </header>
        {message && <div className="rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</div>}
        <div className="grid gap-6 lg:grid-cols-2">
          <form onSubmit={save} className="space-y-4 rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="font-semibold">{form.id ? 'Edit' : 'Create'} chain</h2>
            <input required placeholder="Chain name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="w-full rounded border p-2" />
            <div className="grid grid-cols-2 gap-3">
              <input type="number" min="0" max="100" placeholder="Minimum discount %" value={form.minDiscountPercent} onChange={(event) => setForm({ ...form, minDiscountPercent: event.target.value })} className="rounded border p-2" />
              <input type="number" min="0" max="100" placeholder="Maximum discount %" value={form.maxDiscountPercent} onChange={(event) => setForm({ ...form, maxDiscountPercent: event.target.value })} className="rounded border p-2" />
            </div>
            <select value={form.minRisk || ''} onChange={(event) => setForm({ ...form, minRisk: event.target.value })} className="w-full rounded border p-2">
              <option value="">Any risk</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
            <div>
              <div className="mb-2 flex justify-between"><h3 className="font-medium">Steps</h3><Button type="button" variant="outline" onClick={() => setForm({ ...form, steps: [...form.steps, { stepOrder: form.steps.length + 1, approverRole: 'Finance' }] })} className="!w-auto px-2"><Plus className="h-4 w-4" /></Button></div>
              {form.steps.map((step, index) => <div key={index} className="mb-2 flex gap-2"><span className="rounded bg-slate-100 px-3 py-2 text-sm">{index + 1}</span><select value={step.approverRole} onChange={(event) => setForm({ ...form, steps: form.steps.map((current, stepIndex) => stepIndex === index ? { ...current, approverRole: event.target.value } : current) })} className="flex-1 rounded border p-2"><option>Sales Manager</option><option>Finance</option></select><button type="button" onClick={() => setForm({ ...form, steps: form.steps.filter((_, stepIndex) => stepIndex !== index) })} className="text-red-600"><Trash2 className="h-4 w-4" /></button></div>)}
            </div>
            <Button type="submit">Save chain</Button>
          </form>
          <section className="space-y-3 rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="font-semibold">Configured chains</h2>
            {chains.map((chain) => <div key={chain.id} className="rounded border p-4"><div className="flex justify-between"><div><p className="font-medium">{chain.name}</p><p className="text-sm text-slate-500">{chain.minDiscountPercent}% to {chain.maxDiscountPercent ?? 'above'} · {chain.steps.map((step) => step.approverRole).join(' → ') || 'No approval'}</p><p className="text-xs font-semibold uppercase text-slate-500">{chain.isActive ? 'Active' : 'Inactive'}</p></div><div className="flex gap-2"><button type="button" onClick={() => setForm(chain)} className="text-slate-600">Edit</button><button type="button" onClick={() => toggleActive(chain)} className="text-red-600">{chain.isActive ? 'Deactivate' : 'Activate'}</button><button type="button" onClick={() => remove(chain)} className="text-red-600">Delete</button></div></div></div>)}
          </section>
        </div>
      </main>
    </div>
  );
};

export default AdminApprovalChains;