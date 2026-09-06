import React, { useEffect, useState } from 'react';
import { ArrowLeft, Edit3, Layers, Plus, Save, Trash2, X } from 'lucide-react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { DashboardNavbar } from '../components/dashboard/DashboardNavbar';
import { Button } from '../components/ui/Button';
import { getCategories } from '../services/categoryService';
import { getProduct, updateProduct } from '../services/productService';
import { createProductVariant, deactivateProductVariant, getProductVariants, updateProductVariant } from '../services/productVariantService';

const EMPTY_VARIANT = { id: null, attribute: '', value: '', extraPrice: '', sku: '' };

const getVariantFields = (variant) => {
  const attributes = variant.attributes || {};
  const attribute = Object.keys(attributes)[0] || variant.variant_name || variant.variantName || '';
  return {
    id: variant.id || null,
    attribute,
    value: attributes[attribute] || Object.values(attributes)[0] || '',
    extraPrice: variant.additional_cost ?? variant.extraPrice ?? '',
    sku: variant.sku || '',
  };
};

export const AdminProductDetail = () => {
  const { productId, mode } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const isEditing = mode === 'edit' || location.pathname.endsWith('/edit');
  const [product, setProduct] = useState(null);
  const [categories, setCategories] = useState([]);
  const [variants, setVariants] = useState([]);
  const [form, setForm] = useState(null);
  const [variantForm, setVariantForm] = useState(EMPTY_VARIANT);
  const [isVariantFormOpen, setIsVariantFormOpen] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [productData, categoryData, variantData] = await Promise.all([
        getProduct(productId),
        getCategories(),
        getProductVariants(productId),
      ]);
      if (!productData) throw new Error('Product not found.');
      setProduct(productData);
      setCategories(categoryData.filter((category) => category.is_active !== false));
      setVariants(variantData.filter((variant) => variant.is_active !== false).map(getVariantFields));
      setForm({
        name: productData.name || '',
        sku: productData.sku || '',
        categoryId: productData.category_id || '',
        baseCost: productData.base_cost ?? '',
        unit: productData.unit || 'Each',
        cgstPercent: productData.cgstPercent ?? 0,
        sgstPercent: productData.sgstPercent ?? 0,
        description: productData.description || '',
      });
    } catch (error) {
      setFeedback({ type: 'error', message: error.message || 'Unable to load product.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [productId]);

  const handleProductChange = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const handleVariantChange = (event) => setVariantForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const handleSaveProduct = async (event) => {
    event.preventDefault();
    if (!form.name.trim() || !form.categoryId || form.baseCost === '') {
      setFeedback({ type: 'error', message: 'Name, category, and base price are required.' });
      return;
    }
    setIsSaving(true);
    try {
      await updateProduct(productId, {
        categoryId: Number(form.categoryId),
        name: form.name.trim(),
        description: form.description.trim(),
        baseCost: Number(form.baseCost),
        unit: form.unit.trim() || 'Each',
        cgstPercent: Number(form.cgstPercent || 0),
        sgstPercent: Number(form.sgstPercent || 0),
      });
      setFeedback({ type: 'success', message: 'Product updated successfully.' });
      navigate(`/admin/products/${productId}`, { replace: true });
      await loadData();
    } catch (error) {
      setFeedback({ type: 'error', message: error.message || 'Unable to update product.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveVariant = async (event) => {
    event.preventDefault();
    if (!variantForm.attribute.trim() || !variantForm.value.trim()) {
      setFeedback({ type: 'error', message: 'Variant attribute and value are required.' });
      return;
    }
    const sku = variantForm.sku.trim() || `${product.sku}-${variantForm.attribute}-${variantForm.value}`.toUpperCase().replace(/[^A-Z0-9]+/g, '-');
    setIsSaving(true);
    try {
      const payload = {
        productId: Number(productId),
        variantName: variantForm.attribute.trim(),
        sku,
        attributes: { [variantForm.attribute.trim()]: variantForm.value.trim() },
        additionalCost: Number(variantForm.extraPrice || 0),
      };
      if (variantForm.id) await updateProductVariant(variantForm.id, payload);
      else await createProductVariant(payload);
      setIsVariantFormOpen(false);
      setVariantForm(EMPTY_VARIANT);
      setFeedback({ type: 'success', message: 'Variant saved successfully.' });
      await loadData();
    } catch (error) {
      setFeedback({ type: 'error', message: error.message || 'Unable to save variant.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeactivateVariant = async (variant) => {
    if (!window.confirm(`Delete the ${variant.attribute} variant ${variant.value}?`)) return;
    try {
      await deactivateProductVariant(variant.id);
      setFeedback({ type: 'success', message: 'Variant deleted successfully.' });
      await loadData();
    } catch (error) {
      setFeedback({ type: 'error', message: error.message || 'Unable to delete variant.' });
    }
  };

  if (isLoading) return <div className="min-h-screen bg-slate-50"><DashboardNavbar /><main className="mx-auto max-w-7xl px-4 py-16 text-center text-slate-600">Loading product...</main></div>;
  if (!product || !form) return <div className="min-h-screen bg-slate-50"><DashboardNavbar /><main className="mx-auto max-w-7xl px-4 py-16 text-center text-slate-600">Product not found.</main></div>;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <DashboardNavbar />
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <Link to="/admin/products" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"><ArrowLeft className="h-4 w-4" />Back to products</Link>
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><h1 className="text-2xl font-bold tracking-tight text-slate-900">{isEditing ? 'Edit Product' : product.name}</h1><p className="mt-1 text-sm text-slate-600">{isEditing ? 'Update product information.' : 'Product information and variants.'}</p></div>
          {!isEditing && <Button type="button" variant="outline" onClick={() => navigate(`/admin/products/${productId}/edit`)} className="sm:!w-auto px-4 gap-2"><Edit3 className="h-4 w-4" />Edit product</Button>}
        </header>
        {feedback.message && <div className={`rounded-md border px-4 py-3 text-sm font-medium ${feedback.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`} role="status">{feedback.message}</div>}

        {isEditing ? <form onSubmit={handleSaveProduct} className="grid grid-cols-1 gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">Product Name<input name="name" value={form.name} onChange={handleProductChange} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 font-normal" /></label>
          <label className="text-sm font-medium text-slate-700">SKU<input readOnly name="sku" value={form.sku} className="mt-1 block w-full rounded-md border border-slate-300 bg-slate-100 px-3 py-2 font-normal text-slate-600" /></label>
          <label className="text-sm font-medium text-slate-700">Category<select name="categoryId" value={form.categoryId} onChange={handleProductChange} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 font-normal"><option value="">Select category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
          <label className="text-sm font-medium text-slate-700">Base Price<input name="baseCost" type="number" min="0" step="0.01" value={form.baseCost} onChange={handleProductChange} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 font-normal" /></label>
          <label className="text-sm font-medium text-slate-700">Unit<input name="unit" value={form.unit} onChange={handleProductChange} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 font-normal" /></label>
          <label className="text-sm font-medium text-slate-700">CGST %<input name="cgstPercent" type="number" min="0" max="100" step="0.01" value={form.cgstPercent} onChange={handleProductChange} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 font-normal" /></label>
          <label className="text-sm font-medium text-slate-700">SGST %<input name="sgstPercent" type="number" min="0" max="100" step="0.01" value={form.sgstPercent} onChange={handleProductChange} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 font-normal" /></label>
          <label className="text-sm font-medium text-slate-700 sm:col-span-2">Description<textarea name="description" rows="3" value={form.description} onChange={handleProductChange} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 font-normal" /></label>
          <div className="flex justify-end gap-3 sm:col-span-2"><Button type="button" variant="outline" onClick={() => navigate(`/admin/products/${productId}`)}>Cancel</Button><Button type="submit" disabled={isSaving}><Save className="h-4 w-4" />{isSaving ? 'Saving...' : 'Save product'}</Button></div>
        </form> : <section className="grid grid-cols-1 gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:grid-cols-2">
          {[['Category', product.category_name || product.category], ['Base price', Number(product.base_cost || 0).toLocaleString()], ['Unit', product.unit || 'Each'], ['CGST', `${product.cgstPercent ?? 0}%`], ['SGST', `${product.sgstPercent ?? 0}%`], ['SKU', product.sku], ['Description', product.description || '-']].map(([label, value]) => <div key={label}><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-sm text-slate-900">{value}</p></div>)}
        </section>}

        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 p-6"><div className="flex items-center gap-2"><Layers className="h-5 w-5 text-slate-700" /><div><h2 className="text-lg font-semibold text-slate-900">Variants</h2><p className="text-sm text-slate-500">Extra price is added to the product base price.</p></div></div><Button type="button" onClick={() => { setVariantForm(EMPTY_VARIANT); setIsVariantFormOpen(true); }} className="sm:!w-auto px-3 gap-2"><Plus className="h-4 w-4" />Add Variant</Button></div>
          <div className="overflow-x-auto"><table className="min-w-full divide-y divide-slate-200 text-left text-sm"><thead className="bg-slate-50"><tr>{['Attribute', 'Value', 'Extra Price', 'Actions'].map((heading) => <th key={heading} className="px-6 py-3 font-semibold text-slate-700">{heading}</th>)}</tr></thead><tbody className="divide-y divide-slate-200">{variants.length === 0 ? <tr><td colSpan="4" className="px-6 py-8 text-center text-slate-500">No variants configured.</td></tr> : variants.map((variant) => <tr key={variant.id}><td className="px-6 py-4 font-semibold text-slate-900">{variant.attribute}</td><td className="px-6 py-4 text-slate-700">{variant.value}</td><td className="px-6 py-4 text-slate-700">+{Number(variant.extraPrice || 0).toLocaleString()}</td><td className="px-6 py-4"><div className="flex gap-1"><button type="button" title="Edit variant" onClick={() => { setVariantForm(variant); setIsVariantFormOpen(true); }} className="rounded-md p-2 text-slate-500 hover:bg-slate-100"><Edit3 className="h-4 w-4" /></button><button type="button" title="Delete variant" onClick={() => handleDeactivateVariant(variant)} className="rounded-md p-2 text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button></div></td></tr>)}</tbody></table></div>
        </section>

        {isVariantFormOpen && <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-center justify-between"><h2 className="font-semibold text-slate-900">{variantForm.id ? 'Edit Variant' : 'Add Variant'}</h2><button type="button" onClick={() => setIsVariantFormOpen(false)} className="rounded-md p-2 text-slate-500 hover:bg-slate-100" aria-label="Close"><X className="h-5 w-5" /></button></div><form onSubmit={handleSaveVariant} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3"><label className="text-sm font-medium text-slate-700">Attribute<input name="attribute" value={variantForm.attribute} onChange={handleVariantChange} placeholder="RAM" className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 font-normal" /></label><label className="text-sm font-medium text-slate-700">Value<input name="value" value={variantForm.value} onChange={handleVariantChange} placeholder="16GB" className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 font-normal" /></label><label className="text-sm font-medium text-slate-700">Extra Price<input name="extraPrice" type="number" min="0" step="0.01" value={variantForm.extraPrice} onChange={handleVariantChange} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 font-normal" /></label><label className="text-sm font-medium text-slate-700 sm:col-span-3">Variant SKU (optional)<input name="sku" value={variantForm.sku} onChange={handleVariantChange} placeholder="Generated automatically when blank" className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 font-normal" /></label><div className="flex justify-end gap-3 sm:col-span-3"><Button type="button" variant="outline" onClick={() => setIsVariantFormOpen(false)}>Cancel</Button><Button type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save variant'}</Button></div></form></div>}
      </main>
    </div>
  );
};

export default AdminProductDetail;
