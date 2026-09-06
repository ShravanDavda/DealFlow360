import React, { useEffect, useMemo, useState } from 'react';
import { Edit3, Eye, Layers, PackagePlus, Search, Trash2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DashboardNavbar } from '../components/dashboard/DashboardNavbar';
import { Button } from '../components/ui/Button';
import { createProduct, deactivateProduct, getProducts } from '../services/productService';
import { getCategories } from '../services/categoryService';

const EMPTY_FORM = { name: '', sku: '', categoryId: '', baseCost: '', unit: 'Each', taxPercent: '', description: '' };

const normalizeProduct = (product) => ({
  ...product,
  category: product.category || product.category_name || 'Uncategorized',
  price: Number(product.base_cost ?? product.price ?? 0),
  taxPercent: Number(product.taxPercent ?? product.tax_percent ?? 0),
  variantCount: product.variants && product.variants !== '-' ? product.variants : '0',
});

export const AdminProducts = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [productData, categoryData] = await Promise.all([getProducts(), getCategories()]);
      setProducts(productData.map(normalizeProduct));
      setCategories(categoryData.filter((category) => category.is_active !== false));
    } catch (error) {
      setFeedback({ type: 'error', message: error.message || 'Unable to load products.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const filteredProducts = useMemo(() => products.filter((product) => {
    const matchesSearch = `${product.name} ${product.sku} ${product.description || ''}`.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || String(product.category_id) === categoryFilter;
    const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' ? product.is_active !== false : product.is_active === false);
    return matchesSearch && matchesCategory && matchesStatus;
  }), [products, search, categoryFilter, statusFilter]);

  const handleChange = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const handleCreate = async (event) => {
    event.preventDefault();
    if (!form.name.trim() || !form.sku.trim() || !form.categoryId || form.baseCost === '') {
      setFeedback({ type: 'error', message: 'Name, SKU, category, and base price are required.' });
      return;
    }
    setIsSaving(true);
    try {
      const product = await createProduct({
        categoryId: Number(form.categoryId),
        name: form.name.trim(),
        sku: form.sku.trim(),
        description: form.description.trim(),
        baseCost: Number(form.baseCost),
        unit: form.unit.trim() || 'Each',
        taxPercent: Number(form.taxPercent || 0),
      });
      setIsFormOpen(false);
      setForm(EMPTY_FORM);
      setFeedback({ type: 'success', message: `${product?.name || 'Product'} created successfully.` });
      await loadData();
    } catch (error) {
      setFeedback({ type: 'error', message: error.message || 'Unable to create product.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeactivate = async (product) => {
    if (!window.confirm(`Deactivate ${product.name}?`)) return;
    try {
      await deactivateProduct(product.id);
      setFeedback({ type: 'success', message: 'Product deactivated successfully.' });
      await loadData();
    } catch (error) {
      setFeedback({ type: 'error', message: error.message || 'Unable to deactivate product.' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <DashboardNavbar />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Admin Products</h1>
            <p className="mt-1 text-sm text-slate-600">Manage products, pricing inputs, and variants from the live catalog.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="secondary" onClick={() => navigate('/admin/product-pairings')} className="sm:!w-auto px-4 gap-2">
              <Layers className="h-4 w-4 text-indigo-600" />
              <span>Upsell & Cross-sell</span>
            </Button>
            <Button type="button" onClick={() => setIsFormOpen(true)} className="sm:!w-auto px-4 gap-2">
              <PackagePlus className="h-4 w-4" />
              <span>Add Product</span>
            </Button>
          </div>
        </header>

        {feedback.message && (
          <div className={`rounded-md border px-4 py-3 text-sm font-medium ${feedback.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`} role="status">
            {feedback.message}
          </div>
        )}

        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm" aria-label="Product filters">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <label className="relative block">
              <span className="sr-only">Search products</span>
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search products" className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-slate-900" />
            </label>
            <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-slate-900">
              <option value="all">All categories</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-slate-900">
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </section>

        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm" aria-label="Products list">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-slate-700"><tr>
                {['Product', 'Category', 'Base price', 'Unit', 'Tax', 'Description', 'Variants', 'Status', 'Actions'].map((heading) => <th key={heading} className="whitespace-nowrap px-4 py-3 font-semibold">{heading}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-slate-200">
                {isLoading ? <tr><td colSpan="9" className="px-4 py-10 text-center text-slate-500">Loading products...</td></tr> : filteredProducts.length === 0 ? <tr><td colSpan="9" className="px-4 py-10 text-center text-slate-500">No products match the current filters.</td></tr> : filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-50">
                    <td className="px-4 py-4"><p className="font-semibold text-slate-900">{product.name}</p><p className="text-xs text-slate-500">{product.sku}</p></td>
                    <td className="px-4 py-4 text-slate-700">{product.category}</td>
                    <td className="px-4 py-4 font-medium text-slate-900">{Number(product.price).toLocaleString()}</td>
                    <td className="px-4 py-4 text-slate-700">{product.unit || 'Each'}</td>
                    <td className="px-4 py-4 text-slate-700">{product.taxPercent}%</td>
                    <td className="max-w-xs px-4 py-4 text-slate-600">{product.description || '-'}</td>
                    <td className="px-4 py-4 text-slate-700">{product.variantCount}</td>
                    <td className="px-4 py-4"><span className={`rounded-full border px-2 py-1 text-xs font-semibold ${product.is_active === false ? 'border-slate-200 bg-slate-100 text-slate-600' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>{product.is_active === false ? 'Archived' : 'Active'}</span></td>
                    <td className="px-4 py-4"><div className="flex items-center gap-1">
                      <button type="button" title="View" onClick={() => navigate(`/admin/products/${product.id}`)} className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"><Eye className="h-4 w-4" /></button>
                      <button type="button" title="Edit" onClick={() => navigate(`/admin/products/${product.id}/edit`)} className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"><Edit3 className="h-4 w-4" /></button>
                      {product.is_active !== false && <button type="button" title="Deactivate" onClick={() => handleDeactivate(product)} className="rounded-md p-2 text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>}
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {isFormOpen && <div className="fixed inset-0 z-40 overflow-y-auto bg-slate-900/40 p-4" role="dialog" aria-modal="true" aria-labelledby="add-product-title">
        <div className="mx-auto mt-8 max-w-2xl rounded-lg bg-white p-6 shadow-xl">
          <div className="flex items-center justify-between"><h2 id="add-product-title" className="text-lg font-semibold text-slate-900">Add Product</h2><button type="button" onClick={() => setIsFormOpen(false)} className="rounded-md p-2 text-slate-500 hover:bg-slate-100" aria-label="Close"><X className="h-5 w-5" /></button></div>
          <form onSubmit={handleCreate} className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">Product Name<input name="name" value={form.name} onChange={handleChange} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 font-normal" /></label>
            <label className="text-sm font-medium text-slate-700">SKU<input name="sku" value={form.sku} onChange={handleChange} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 font-normal" /></label>
            <label className="text-sm font-medium text-slate-700">Category<select name="categoryId" value={form.categoryId} onChange={handleChange} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 font-normal"><option value="">Select category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
            <label className="text-sm font-medium text-slate-700">Base Price<input name="baseCost" type="number" min="0" step="0.01" value={form.baseCost} onChange={handleChange} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 font-normal" /></label>
            <label className="text-sm font-medium text-slate-700">Unit<input name="unit" value={form.unit} onChange={handleChange} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 font-normal" /></label>
            <label className="text-sm font-medium text-slate-700">Tax %<input name="taxPercent" type="number" min="0" step="0.01" value={form.taxPercent} onChange={handleChange} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 font-normal" /></label>
            <label className="text-sm font-medium text-slate-700 sm:col-span-2">Description<textarea name="description" rows="3" value={form.description} onChange={handleChange} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 font-normal" /></label>
            <div className="flex justify-end gap-3 sm:col-span-2"><Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button><Button type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : 'Create product'}</Button></div>
          </form>
        </div>
      </div>}
    </div>
  );
};

export default AdminProducts;
