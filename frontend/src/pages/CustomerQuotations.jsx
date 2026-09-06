import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  FileCheck,
  FileText,
  Search,
} from 'lucide-react';
import { CustomerNavbar } from '../components/customer/CustomerNavbar';
import { Button } from '../components/ui/Button';
import { getCustomerQuotes } from '../services/customerPortalService';

export const CustomerQuotations = () => {
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadQuotes = async () => {
    setIsLoading(true);
    try {
      const data = await getCustomerQuotes();
      setQuotes(data || []);
    } catch (err) {
      setError(err.message || 'Unable to load quotations.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadQuotes();
  }, []);

  const filteredQuotes = useMemo(() => {
    return quotes.filter((q) => {
      const matchesSearch = `${q.quoteCode} ${q.status}`
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchesStatus =
        statusFilter === 'ALL' || q.status.toUpperCase() === statusFilter.toUpperCase();
      return matchesSearch && matchesStatus;
    });
  }, [quotes, search, statusFilter]);

  const stats = useMemo(() => {
    const total = quotes.length;
    const approved = quotes.filter((q) => q.status === 'Approved').length;
    const pending = quotes.filter((q) => ['Pending Approval', 'Under Negotiation'].includes(q.status)).length;
    const confirmed = quotes.filter((q) => q.status === 'Confirmed').length;
    return { total, approved, pending, confirmed };
  }, [quotes]);

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Approved':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'Confirmed':
        return 'bg-indigo-50 text-indigo-800 border-indigo-200';
      case 'Pending Approval':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'Under Negotiation':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'Rejected':
        return 'bg-rose-50 text-rose-800 border-rose-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <CustomerNavbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <header className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-md bg-slate-100 text-slate-700">
                <FileText className="h-6 w-6" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                My Quotations
              </h1>
            </div>
            <p className="mt-1 text-sm text-slate-600">
              Review line pricing, submit questions, propose counter-discounts, and confirm approved orders online.
            </p>
          </div>

          {quotes.length > 0 && (
            <Button
              type="button"
              onClick={() => navigate(`/customer/quotes/${quotes[0].quoteCode}`)}
              className="sm:!w-auto px-4 gap-2 bg-slate-900 hover:bg-slate-800 text-white"
            >
              <span>Latest Quote ({quotes[0].quoteCode})</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </header>

        {error && (
          <div className="p-4 rounded-md bg-rose-50 border border-rose-200 text-sm text-rose-800 flex items-center gap-2" role="alert">
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Quotes</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{stats.total}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-emerald-600 uppercase tracking-wide">Ready to Confirm</p>
            <p className="mt-1 text-2xl font-bold text-emerald-700">{stats.approved}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-amber-600 uppercase tracking-wide">In Review</p>
            <p className="mt-1 text-2xl font-bold text-amber-700">{stats.pending}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-indigo-600 uppercase tracking-wide">Confirmed Orders</p>
            <p className="mt-1 text-2xl font-bold text-indigo-700">{stats.confirmed}</p>
          </div>
        </div>

        <section
          aria-label="Filter quotations"
          className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white p-4 rounded-lg border border-slate-200 shadow-sm"
        >
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by quote reference..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="quote-status-filter" className="text-xs font-medium text-slate-600">
              Status:
            </label>
            <select
              id="quote-status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-sm rounded-md border border-slate-300 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="ALL">All Statuses</option>
              <option value="Approved">Ready to Confirm (Approved)</option>
              <option value="Under Negotiation">Under Negotiation</option>
              <option value="Pending Approval">Pending Approval</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Draft">Draft</option>
            </select>
          </div>
        </section>

        <section className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 font-medium">
                <tr>
                  <th scope="col" className="px-6 py-3.5">Quotation Ref</th>
                  <th scope="col" className="px-6 py-3.5">Date</th>
                  <th scope="col" className="px-6 py-3.5 text-center">Items</th>
                  <th scope="col" className="px-6 py-3.5 text-right">Discount</th>
                  <th scope="col" className="px-6 py-3.5 text-right">Total Amount</th>
                  <th scope="col" className="px-6 py-3.5">Status</th>
                  <th scope="col" className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                      Loading your quotations...
                    </td>
                  </tr>
                ) : filteredQuotes.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                      No quotations found for your account.
                    </td>
                  </tr>
                ) : (
                  filteredQuotes.map((q) => (
                    <tr key={q.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-900 whitespace-nowrap">
                        <Link
                          to={`/customer/quotes/${q.quoteCode}`}
                          className="hover:underline text-slate-900 flex items-center gap-1.5"
                        >
                          <FileText className="h-4 w-4 text-slate-400" />
                          <span>{q.quoteCode}</span>
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                        {new Date(q.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-center text-slate-600 whitespace-nowrap">
                        {q.itemCount}
                      </td>
                      <td className="px-6 py-4 text-right text-slate-600 whitespace-nowrap">
                        ${Number(q.totalDiscount || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-slate-900 whitespace-nowrap">
                        ${Number(q.totalAmount || 0).toLocaleString()} {q.currency}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusBadgeClass(
                            q.status
                          )}`}
                        >
                          {q.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <Button
                          type="button"
                          variant={q.status === 'Approved' ? 'primary' : 'outline'}
                          onClick={() => navigate(`/customer/quotes/${q.quoteCode}`)}
                          className="!w-auto text-xs px-3 py-1.5 gap-1"
                        >
                          <span>{q.status === 'Approved' ? 'Confirm' : 'View'}</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
};

export default CustomerQuotations;
