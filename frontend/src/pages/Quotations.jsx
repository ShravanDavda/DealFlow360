import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, LayoutGrid, Table as TableIcon, RefreshCw, X } from 'lucide-react';
import { DashboardNavbar } from '../components/dashboard/DashboardNavbar';
import { QuotationBoard } from '../components/quotations/QuotationBoard';
import { QuotationTable } from '../components/quotations/QuotationTable';
import { Button } from '../components/ui/Button';
import { getQuotations, createQuotation } from '../services/quotationService';
import { getCurrentUser } from '../services/authService';
import { getCustomers } from '../services/customerService';
import { getPriceLists } from '../services/priceListService';
import { getProducts } from '../services/productService';
import { getProductVariants } from '../services/productVariantService';

export const Quotations = () => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState('kanban');
  const [quotations, setQuotations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [priceLists, setPriceLists] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedPriceListId, setSelectedPriceListId] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [userRole, setUserRole] = useState('');
  const [managerSearch, setManagerSearch] = useState('');
  const [managerStatus, setManagerStatus] = useState('All');
  const [salesRepSearch, setSalesRepSearch] = useState('');
  const [salesRepStatus, setSalesRepStatus] = useState('All');

  const fetchQuotes = async () => {
    try {
      setIsLoading(true);
      const data = await getQuotations();
      if (data && data.length > 0) {
        setQuotations(data);
      }
    } catch (err) {
      console.error('Error fetching quotations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getCurrentUser().then((response) => {
      const role = response?.data?.role || '';
      setUserRole(role);
      if (role === 'sales_manager' || role === 'sales_rep') setViewMode('table');
    }).catch(() => setUserRole(''));
    fetchQuotes();
    Promise.all([getCustomers(), getPriceLists(), getProducts()]).then(async ([customerData, priceListData, productData]) => {
      setCustomers(customerData.filter((customer) => customer.is_active !== false));
      setPriceLists(priceListData.filter((priceList) => priceList.is_active !== false));
      const activeProducts = productData.filter((product) => product.is_active !== false);
      const productsWithVariants = await Promise.all(activeProducts.map(async (product) => ({
        ...product,
        variants: await getProductVariants(product.id).catch(() => [])
      })));
      setCatalog(productsWithVariants);
    }).catch((err) => console.error('Failed to load quotation context:', err));
  }, []);

  const handleQuotationClick = (quotationId) => {
    if (String(quotationId).startsWith('approval:')) {
      navigate(`/approvals/${String(quotationId).replace('approval:', '')}`);
      return;
    }
    navigate(`/quotations/${quotationId}`);
  };

  const handleToggleView = () => {
    setViewMode((prev) => (prev === 'kanban' ? 'table' : 'kanban'));
  };

  const openCreateQuotation = () => {
    setCreateError('');
    setIsCreateOpen(true);
  };

  const closeCreateQuotation = () => {
    if (!isCreating) setIsCreateOpen(false);
  };

  const handleNewQuotation = async (event) => {
    event.preventDefault();
    setCreateError('');
    try {
      if (!selectedCustomerId || !selectedPriceListId || !selectedProductId) {
        throw new Error('Customer, price list, and starting product are required.');
      }
      setIsCreating(true);
      const newQuote = await createQuotation({
        customerId: Number(selectedCustomerId),
        priceListId: Number(selectedPriceListId),
        items: [
          {
            productId: Number(selectedProductId),
            quantity: 1,
            discountPercent: 0
          }
        ]
      });
      if (newQuote?.id) {
        navigate(`/quotations/${newQuote.id}`);
      } else {
        throw new Error('Quotation created but missing reference ID.');
      }
    } catch (err) {
      setCreateError(err.message || 'Unable to create quotation.');
    } finally {
      setIsCreating(false);
    }
  };

  const isManager = userRole === 'sales_manager';
  const isSalesRep = userRole === 'sales_rep';
  const managerFilteredQuotations = quotations.filter((quotation) => {
    const query = managerSearch.trim().toLowerCase();
    const matchesSearch = !query || [quotation.customerName, quotation.id, quotation.quoteId].some((value) => String(value || '').toLowerCase().includes(query));
    const matchesStatus = managerStatus === 'All' || quotation.status === managerStatus;
    return matchesSearch && matchesStatus;
  });
  const managerStatuses = ['All', 'Draft', 'Pending Approval', 'Under Negotiation', 'Approved', 'Rejected'];
  const salesRepStatuses = ['All', 'Draft', 'Pending Approval', 'Approved', 'Under Negotiation', 'Confirmed', 'Rejected'];
  const salesRepFilteredQuotations = quotations.filter((quotation) => {
    const query = salesRepSearch.trim().toLowerCase();
    const matchesSearch = !query || [quotation.customerName, quotation.id, quotation.quoteId].some((value) => String(value || '').toLowerCase().includes(query));
    return matchesSearch && (salesRepStatus === 'All' || quotation.status === salesRepStatus);
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <DashboardNavbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {isManager || isSalesRep ? 'Quotations' : `Quotations (${quotations.length})`}
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              {isManager ? 'Manage active quotations, track pending discount approvals, and launch quotation builds.' : isSalesRep ? 'Manage your quotations and track their status.' : 'Every quotation in the system, one row per quotation. Click a quotation to open the live builder.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {(isManager || isSalesRep) && <Button
              type="button"
              variant="outline"
              onClick={fetchQuotes}
              className="sm:!w-auto px-3 gap-1 text-slate-600 hover:text-slate-900"
              title="Refresh Quotes"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>}

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
              onClick={openCreateQuotation}
              className="sm:!w-auto px-4 gap-1.5"
            >
              <Plus className="h-4 w-4" />
              <span>New Quotation</span>
            </Button>
          </div>
        </div>

        {isManager && <section aria-label="Quotation search and filters" className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><input value={managerSearch} onChange={(event) => setManagerSearch(event.target.value)} placeholder="Search by customer name, quote reference (e.g. Q-1042)..." className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-900" /><div className="flex flex-wrap gap-2">{managerStatuses.map((status) => <button key={status} type="button" onClick={() => setManagerStatus(status)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${managerStatus === status ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{status} <span className="ml-1 opacity-70">{status === 'All' ? quotations.length : quotations.filter((quotation) => quotation.status === status).length}</span></button>)}</div></div></section>}
        {isSalesRep && <section aria-label="Quotation search and filters" className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><input value={salesRepSearch} onChange={(event) => setSalesRepSearch(event.target.value)} placeholder="Search by customer name or quotation reference" className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-900" /><div className="flex flex-wrap gap-2">{salesRepStatuses.map((status) => <button key={status} type="button" onClick={() => setSalesRepStatus(status)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${salesRepStatus === status ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{status} <span className="ml-1 opacity-70">{status === 'All' ? quotations.length : quotations.filter((quotation) => quotation.status === status).length}</span></button>)}</div></div></section>}

        <section aria-label="Quotations List">
          {isLoading && quotations.length === 0 ? (
            <div className="py-16 text-center text-slate-500 font-medium">
              Loading active quotations from database...
            </div>
          ) : viewMode === 'kanban' ? (
            <QuotationBoard
              quotations={quotations}
              onQuotationClick={handleQuotationClick}
            />
          ) : (
            <QuotationTable
              quotations={isManager ? managerFilteredQuotations : isSalesRep ? salesRepFilteredQuotations : quotations}
              onQuotationClick={handleQuotationClick}
              managerView={isManager}
              salesRepView={isSalesRep}
            />
          )}
        </section>

        <section aria-label="Bottom Actions" className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-slate-200">
          {(isManager || isSalesRep) && <span className="text-sm text-slate-500">Showing {isManager ? managerFilteredQuotations.length : salesRepFilteredQuotations.length} of {quotations.length} total quotations</span>}
          <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            variant="primary"
            onClick={openCreateQuotation}
            className={`sm:!w-auto px-5 gap-1.5 ${isManager ? 'order-2' : ''}`}
          >
            <Plus className="h-4 w-4" />
            <span>New Quotation</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={handleToggleView}
            className={`sm:!w-auto px-5 gap-2 ${isManager ? 'order-1' : ''}`}
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
          </div>
        </section>

      </main>

      {isCreateOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/45 px-4 py-6 sm:py-10" role="dialog" aria-modal="true" aria-labelledby="new-quotation-title">
          <div className="mx-auto max-w-lg rounded-lg bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <h2 id="new-quotation-title" className="text-lg font-bold text-slate-900">New Quotation</h2>
              <button type="button" onClick={closeCreateQuotation} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close dialog">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleNewQuotation} className="space-y-5 px-6 py-6">
              {createError && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700" role="alert">{createError}</p>}
              <label className="block text-sm font-medium text-slate-700">
                Customer *
                <select required value={selectedCustomerId} onChange={(event) => setSelectedCustomerId(event.target.value)} className="mt-2 block w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 font-normal text-slate-700 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-slate-900">
                  <option value="">Select customer</option>
                  {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.company_name || customer.name}{customer.customer_tier_name ? ` (${customer.customer_tier_name})` : ''}</option>)}
                </select>
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Price List *
                <select required value={selectedPriceListId} onChange={(event) => setSelectedPriceListId(event.target.value)} className="mt-2 block w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 font-normal text-slate-700 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-slate-900">
                  <option value="">Select price list</option>
                  {priceLists.map((priceList) => <option key={priceList.id} value={priceList.id}>{priceList.name}{priceList.currency ? ` (${priceList.currency})` : ''}</option>)}
                </select>
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Starting Product *
                <select required value={selectedProductId} onChange={(event) => setSelectedProductId(event.target.value)} className="mt-2 block w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 font-normal text-slate-700 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-slate-900">
                  <option value="">Select starting product</option>
                  {catalog.map((product, index) => <option key={`${product.id}-${index}`} value={product.id}>{product.name}</option>)}
                </select>
              </label>
              <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
                <Button type="button" variant="outline" onClick={closeCreateQuotation} className="sm:!w-auto px-4">Cancel</Button>
                <Button type="submit" variant="primary" disabled={isCreating} className="sm:!w-auto px-4">{isCreating ? 'Creating...' : 'Continue'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Quotations;
