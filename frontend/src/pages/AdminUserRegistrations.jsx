import React, { useEffect, useState } from 'react';
import { CheckCircle2, ShieldCheck, UserPlus, UserX, X } from 'lucide-react';
import { DashboardNavbar } from '../components/dashboard/DashboardNavbar';
import { Button } from '../components/ui/Button';
import {
  approveRegistration,
  createAdminUser,
  getPendingRegistrations,
  rejectRegistration,
} from '../services/userRegistrationService';

const ROLE_LABELS = {
  sales_rep: 'Sales Representative',
  sales_manager: 'Sales Manager',
  finance: 'Finance / Operations',
  operations: 'Finance / Operations',
};

export const AdminUserRegistrations = () => {
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [adminForm, setAdminForm] = useState({ fullName: '', email: '', password: '', confirmPassword: '' });

  const loadRequests = async () => {
    setIsLoading(true);
    try {
      setRequests(await getPendingRegistrations());
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Unable to load registration requests.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const reviewRequest = async (request, action) => {
    if (!window.confirm(`${action === 'approve' ? 'Approve' : 'Reject'} registration for ${request.email}?`)) return;
    setProcessingId(request.id);
    setMessage({ type: '', text: '' });
    try {
      if (action === 'approve') await approveRegistration(request.id);
      else await rejectRegistration(request.id);
      setMessage({ type: 'success', text: `Registration ${action}d successfully.` });
      window.dispatchEvent(new Event('user-registration-count-changed'));
      await loadRequests();
    } catch (error) {
      setMessage({ type: 'error', text: error.message || `Unable to ${action} registration.` });
    } finally {
      setProcessingId(null);
    }
  };

  const handleAdminChange = (event) => {
    const { name, value } = event.target;
    setAdminForm((current) => ({ ...current, [name]: value }));
  };

  const handleCreateAdmin = async (event) => {
    event.preventDefault();
    setMessage({ type: '', text: '' });
    if (adminForm.password !== adminForm.confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }
    setIsCreating(true);
    try {
      await createAdminUser(adminForm);
      setAdminForm({ fullName: '', email: '', password: '', confirmPassword: '' });
      setIsCreateOpen(false);
      setMessage({ type: 'success', text: 'Admin user created successfully.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Unable to create admin user.' });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardNavbar />
      <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white shadow-sm">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">User Registration Requests</h1>
          </div>
          <p className="mt-2 text-sm text-slate-600">Review requested roles before granting workspace access.</p>
          <Button type="button" variant="primary" onClick={() => setIsCreateOpen(true)} className="sm:!w-auto px-4 gap-2">
            <UserPlus className="h-4 w-4" />
            <span>Add Admin User</span>
          </Button>
        </header>

        {message.text && (
          <div className={`rounded-md border px-4 py-3 text-sm font-medium ${message.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`} role="status">
            {message.text}
          </div>
        )}

        {isLoading ? (
          <div className="rounded-lg border border-slate-200 bg-white py-16 text-center text-sm font-medium text-slate-500">Loading registration requests...</div>
        ) : requests.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white py-16 text-center text-sm text-slate-500">No pending registration requests.</div>
        ) : (
          <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm" aria-label="Pending registration requests">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th className="px-6 py-3 font-semibold">User</th>
                    <th className="px-3 py-3 font-semibold">Requested role</th>
                    <th className="px-3 py-3 font-semibold">Submitted</th>
                    <th className="px-6 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {requests.map((request) => (
                    <tr key={request.id}>
                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-900">{request.firstName || request.lastName ? `${request.firstName || ''} ${request.lastName || ''}`.trim() : request.username}</p>
                        <p className="mt-1 text-slate-500">{request.email}</p>
                      </td>
                      <td className="px-3 py-4 font-medium text-slate-700">{ROLE_LABELS[request.requestedRole] || request.requestedRole}</td>
                      <td className="px-3 py-4 text-slate-600">{new Date(request.createdAt).toLocaleDateString()}</td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="outline" disabled={processingId === request.id} onClick={() => reviewRequest(request, 'reject')} className="sm:!w-auto px-3 gap-1.5 text-rose-700">
                            <UserX className="h-4 w-4" />
                            <span>Reject</span>
                          </Button>
                          <Button type="button" variant="primary" disabled={processingId === request.id} onClick={() => reviewRequest(request, 'approve')} className="sm:!w-auto px-3 gap-1.5">
                            <CheckCircle2 className="h-4 w-4" />
                            <span>Approve</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/45 px-4 py-6 sm:py-10" role="dialog" aria-modal="true" aria-labelledby="create-admin-title">
          <div className="mx-auto max-w-lg rounded-lg bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <h2 id="create-admin-title" className="text-lg font-bold text-slate-900">Add Admin User</h2>
              <button type="button" onClick={() => setIsCreateOpen(false)} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close dialog"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleCreateAdmin} className="space-y-5 px-6 py-6">
              <label className="block text-sm font-medium text-slate-700">Full Name *<input required name="fullName" value={adminForm.fullName} onChange={handleAdminChange} className="mt-2 block w-full rounded-md border border-slate-300 px-3.5 py-2.5 font-normal text-slate-900" /></label>
              <label className="block text-sm font-medium text-slate-700">Email *<input required type="email" name="email" value={adminForm.email} onChange={handleAdminChange} className="mt-2 block w-full rounded-md border border-slate-300 px-3.5 py-2.5 font-normal text-slate-900" /></label>
              <label className="block text-sm font-medium text-slate-700">Password *<input required minLength="6" type="password" name="password" value={adminForm.password} onChange={handleAdminChange} className="mt-2 block w-full rounded-md border border-slate-300 px-3.5 py-2.5 font-normal text-slate-900" /></label>
              <label className="block text-sm font-medium text-slate-700">Confirm Password *<input required minLength="6" type="password" name="confirmPassword" value={adminForm.confirmPassword} onChange={handleAdminChange} className="mt-2 block w-full rounded-md border border-slate-300 px-3.5 py-2.5 font-normal text-slate-900" /></label>
              <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} className="sm:!w-auto px-4">Cancel</Button>
                <Button type="submit" variant="primary" disabled={isCreating} className="sm:!w-auto px-4">{isCreating ? 'Creating...' : 'Create Admin'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUserRegistrations;
