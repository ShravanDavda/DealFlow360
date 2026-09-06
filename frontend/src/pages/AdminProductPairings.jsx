import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Edit3,
  Layers,
  Plus,
  Search,
  Tag,
  ToggleLeft,
  ToggleRight,
  Trash2,
  X,
} from 'lucide-react';
import { DashboardNavbar } from '../components/dashboard/DashboardNavbar';
import { Button } from '../components/ui/Button';
import { getProducts } from '../services/productService';
import {
  createProductPairing,
  deactivateProductPairing,
  deleteProductPairing,
  getProductPairings,
  updateProductPairing,
} from '../services/productPairingService';

const EMPTY_FORM = {
  sourceProductId: '',
  recommendedProductId: '',
  relationshipType: 'CROSS_SELL',
  priority: 1,
  isActive: true,
  tag: '',
};

export const AdminProductPairings = () => {
  const [pairings, setPairings] = useState([]);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPairing, setEditingPairing] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [pairingsData, productsData] = await Promise.all([
        getProductPairings(),
        getProducts(),
      ]);
      setPairings(pairingsData);
      setProducts(productsData || []);
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || 'Unable to load recommendation data.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const activeProducts = useMemo(
    () => products.filter((p) => p.is_active !== false),
    [products]
  );

  const filteredPairings = useMemo(() => {
    return pairings.filter((item) => {
      const matchesSearch =
        `${item.sourceProductName} ${item.sourceProductSku} ${item.recommendedProductName} ${item.recommendedProductSku} ${item.tag || ''}`
          .toLowerCase()
          .includes(search.toLowerCase());

      const itemType = (item.type || item.relationshipType || '').toUpperCase();
      const matchesType = typeFilter === 'ALL' || itemType === typeFilter;

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' ? item.isActive === true : item.isActive === false);

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [pairings, search, typeFilter, statusFilter]);

  const stats = useMemo(() => {
    const total = pairings.length;
    const upsells = pairings.filter(
      (p) => (p.type || p.relationshipType || '').toUpperCase() === 'UPSELL'
    ).length;
    const crossSells = pairings.filter(
      (p) => (p.type || p.relationshipType || '').toUpperCase() === 'CROSS_SELL'
    ).length;
    const active = pairings.filter((p) => p.isActive === true).length;
    return { total, upsells, crossSells, active };
  }, [pairings]);

  const handleOpenCreateModal = () => {
    setEditingPairing(null);
    setFormData({
      ...EMPTY_FORM,
      sourceProductId: activeProducts[0]?.id ? String(activeProducts[0].id) : '',
      recommendedProductId: activeProducts[1]?.id ? String(activeProducts[1].id) : '',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (pairing) => {
    setEditingPairing(pairing);
    setFormData({
      sourceProductId: String(pairing.sourceProductId),
      recommendedProductId: String(pairing.recommendedProductId),
      relationshipType: (pairing.type || pairing.relationshipType || 'CROSS_SELL').toUpperCase(),
      priority: pairing.priority ?? 1,
      isActive: Boolean(pairing.isActive),
      tag: pairing.tag || '',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingPairing(null);
    setFormData(EMPTY_FORM);
    setFormError('');
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (formError) setFormError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const sourceId = Number(formData.sourceProductId);
    const recommendedId = Number(formData.recommendedProductId);
    const priority = parseInt(formData.priority, 10);

    if (!sourceId) {
      setFormError('Source product is required.');
      return;
    }
    if (!recommendedId) {
      setFormError('Recommended product is required.');
      return;
    }
    if (sourceId === recommendedId) {
      setFormError('Source product and recommended product cannot be the same.');
      return;
    }
    if (isNaN(priority) || priority < 1) {
      setFormError('Priority must be an integer of 1 or greater.');
      return;
    }

    if (formData.isActive) {
      const isDuplicate = pairings.some((p) => {
        if (editingPairing && p.id === editingPairing.id) return false;
        return (
          Number(p.sourceProductId) === sourceId &&
          Number(p.recommendedProductId) === recommendedId &&
          (p.type || p.relationshipType || '').toUpperCase() === formData.relationshipType &&
          p.isActive === true
        );
      });
      if (isDuplicate) {
        setFormError(
          `An active ${formData.relationshipType} relationship already exists between these products.`
        );
        return;
      }
    }

    setIsSaving(true);
    try {
      const payload = {
        sourceProductId: sourceId,
        recommendedProductId: recommendedId,
        relationshipType: formData.relationshipType,
        type: formData.relationshipType,
        priority: priority,
        isActive: formData.isActive,
        tag: formData.tag.trim() || undefined,
      };

      if (editingPairing) {
        await updateProductPairing(editingPairing.id, payload);
        setFeedback({
          type: 'success',
          message: 'Product relationship updated successfully.',
        });
      } else {
        await createProductPairing(payload);
        setFeedback({
          type: 'success',
          message: 'Product relationship created successfully.',
        });
      }

      handleCloseModal();
      await loadData();
    } catch (error) {
      setFormError(error.message || 'Failed to save product relationship.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (pairing) => {
    const actionLabel = pairing.isActive ? 'deactivate' : 'activate';
    if (!window.confirm(`Are you sure you want to ${actionLabel} this recommendation?`)) return;

    try {
      if (pairing.isActive) {
        await deactivateProductPairing(pairing.id);
        setFeedback({
          type: 'success',
          message: 'Product recommendation deactivated.',
        });
      } else {
        await updateProductPairing(pairing.id, { isActive: true });
        setFeedback({
          type: 'success',
          message: 'Product recommendation activated.',
        });
      }
      await loadData();
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || `Unable to ${actionLabel} recommendation.`,
      });
    }
  };

  const handleDelete = async (pairing) => {
    if (
      !window.confirm(
        `Remove recommendation: ${pairing.sourceProductName} → ${pairing.recommendedProductName}?`
      )
    )
      return;

    try {
      await deleteProductPairing(pairing.id, { hard: true });
      setFeedback({
        type: 'success',
        message: 'Product recommendation deleted.',
      });
      await loadData();
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || 'Unable to delete recommendation.',
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <DashboardNavbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-md bg-white text-slate-900 shadow-sm border border-slate-200">
                <Layers className="h-6 w-6 text-indigo-600" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Product Recommendations / Upsell & Cross-sell
              </h1>
            </div>
            <p className="mt-1 text-sm text-slate-600">
              Configure Upsell (higher/better tier alternative) and Cross-sell (complementary add-on) rules for quotations.
            </p>
          </div>

          <Button
            type="button"
            onClick={handleOpenCreateModal}
            className="sm:!w-auto px-4 gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <Plus className="h-4 w-4" />
            <span>Add Recommendation</span>
          </Button>
        </header>

        {feedback.message && (
          <div
            className={`rounded-md p-4 text-sm flex items-center justify-between border ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
            role="status"
          >
            <div className="flex items-center gap-2">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-rose-600" />
              )}
              <span>{feedback.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedback({ type: '', message: '' })}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Total Rules
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{stats.total}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-purple-600 uppercase tracking-wide">
              Upsell Rules
            </p>
            <p className="mt-1 text-2xl font-bold text-purple-700">{stats.upsells}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">
              Cross-sell Rules
            </p>
            <p className="mt-1 text-2xl font-bold text-blue-700">{stats.crossSells}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-emerald-600 uppercase tracking-wide">
              Active Rules
            </p>
            <p className="mt-1 text-2xl font-bold text-emerald-700">{stats.active}</p>
          </div>
        </div>

        <section
          aria-label="Filter recommendations"
          className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white p-4 rounded-lg border border-slate-200 shadow-sm"
        >
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by product name or SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <label htmlFor="type-filter" className="text-xs font-medium text-slate-600">
                Type:
              </label>
              <select
                id="type-filter"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="text-sm rounded-md border border-slate-300 px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Types</option>
                <option value="UPSELL">Upsell</option>
                <option value="CROSS_SELL">Cross-sell</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="status-filter" className="text-xs font-medium text-slate-600">
                Status:
              </label>
              <select
                id="status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-sm rounded-md border border-slate-300 px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 font-medium">
                <tr>
                  <th scope="col" className="px-6 py-3.5">
                    Source Product
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    Type
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    Recommended Product
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-center">
                    Priority
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      Loading recommendation rules...
                    </td>
                  </tr>
                ) : filteredPairings.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      No product relationships match the criteria.
                    </td>
                  </tr>
                ) : (
                  filteredPairings.map((item) => {
                    const isUpsell =
                      (item.type || item.relationshipType || '').toUpperCase() === 'UPSELL';
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/75 transition-colors">
                        <td className="px-6 py-4 font-medium text-slate-900 whitespace-nowrap">
                          <div>
                            <p className="font-semibold text-slate-900">
                              {item.sourceProductName}
                            </p>
                            <p className="text-xs text-slate-500">{item.sourceProductSku}</p>
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              isUpsell
                                ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                : 'bg-blue-100 text-blue-800 border border-blue-200'
                            }`}
                          >
                            {isUpsell ? 'Upsell' : 'Cross-sell'}
                          </span>
                        </td>

                        <td className="px-6 py-4 font-medium text-slate-900 whitespace-nowrap">
                          <div>
                            <p className="font-semibold text-slate-900">
                              {item.recommendedProductName}
                            </p>
                            <p className="text-xs text-slate-500">
                              {item.recommendedProductSku}
                              {item.tag && ` · ${item.tag}`}
                            </p>
                          </div>
                        </td>

                        <td className="px-6 py-4 text-center whitespace-nowrap">
                          <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
                            {item.priority}
                          </span>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              item.isActive
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {item.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-right whitespace-nowrap space-x-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(item)}
                            className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 hover:text-slate-900 p-1 rounded hover:bg-slate-100"
                            title="Edit relationship"
                          >
                            <Edit3 className="h-4 w-4" />
                            <span>Edit</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleActive(item)}
                            className={`inline-flex items-center gap-1 text-xs font-medium p-1 rounded hover:bg-slate-100 ${
                              item.isActive
                                ? 'text-amber-700 hover:text-amber-800'
                                : 'text-emerald-700 hover:text-emerald-800'
                            }`}
                            title={item.isActive ? 'Deactivate' : 'Activate'}
                          >
                            {item.isActive ? (
                              <>
                                <ToggleRight className="h-4 w-4 text-emerald-600" />
                                <span>Active</span>
                              </>
                            ) : (
                              <>
                                <ToggleLeft className="h-4 w-4 text-slate-400" />
                                <span>Inactive</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(item)}
                            className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 hover:text-rose-800 p-1 rounded hover:bg-rose-50"
                            title="Delete relationship"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span>Delete</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-lg bg-white shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50">
              <h2 className="text-lg font-bold text-slate-900">
                {editingPairing ? 'Edit Product Relationship' : 'Add Product Recommendation'}
              </h2>
              <button
                type="button"
                onClick={handleCloseModal}
                className="text-slate-400 hover:text-slate-600 p-1 rounded"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && (
                <div
                  className="rounded-md bg-rose-50 border border-rose-200 p-3 text-sm text-rose-800 flex items-center gap-2"
                  role="alert"
                >
                  <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label
                  htmlFor="sourceProductId"
                  className="block text-sm font-medium text-slate-700"
                >
                  Source Product <span className="text-rose-500">*</span>
                </label>
                <select
                  id="sourceProductId"
                  name="sourceProductId"
                  required
                  disabled={Boolean(editingPairing)}
                  value={formData.sourceProductId}
                  onChange={handleFormChange}
                  className={`mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 ${
                    editingPairing ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white'
                  }`}
                >
                  <option value="">Select source product</option>
                  {activeProducts.map((prod) => (
                    <option key={prod.id} value={prod.id}>
                      {prod.name} ({prod.sku})
                    </option>
                  ))}
                </select>
                {editingPairing && (
                  <p className="mt-1 text-xs text-slate-500">
                    Source product cannot be changed for an existing rule.
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="relationshipType"
                  className="block text-sm font-medium text-slate-700"
                >
                  Relationship Type <span className="text-rose-500">*</span>
                </label>
                <select
                  id="relationshipType"
                  name="relationshipType"
                  required
                  value={formData.relationshipType}
                  onChange={handleFormChange}
                  className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                >
                  <option value="UPSELL">Upsell (Higher / Better tier alternative)</option>
                  <option value="CROSS_SELL">Cross-sell (Complementary product or service)</option>
                </select>
                <p className="mt-1 text-xs text-slate-500">
                  {formData.relationshipType === 'UPSELL'
                    ? 'Suggests higher spec/capacity to maximize deal value (e.g. Laptop Pro 14 → Laptop Pro 16).'
                    : 'Suggests related attachments or accessories (e.g. Laptop Pro 14 → Docking Station or Mouse).'}
                </p>
              </div>

              <div>
                <label
                  htmlFor="recommendedProductId"
                  className="block text-sm font-medium text-slate-700"
                >
                  Recommended Product <span className="text-rose-500">*</span>
                </label>
                <select
                  id="recommendedProductId"
                  name="recommendedProductId"
                  required
                  value={formData.recommendedProductId}
                  onChange={handleFormChange}
                  className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                >
                  <option value="">Select recommended product</option>
                  {activeProducts
                    .filter((prod) => String(prod.id) !== String(formData.sourceProductId))
                    .map((prod) => (
                      <option key={prod.id} value={prod.id}>
                        {prod.name} ({prod.sku})
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="priority"
                    className="block text-sm font-medium text-slate-700"
                  >
                    Priority <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    id="priority"
                    name="priority"
                    min="1"
                    step="1"
                    required
                    value={formData.priority}
                    onChange={handleFormChange}
                    className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Lower numbers display first (1 = highest priority).
                  </p>
                </div>

                <div>
                  <label htmlFor="tag" className="block text-sm font-medium text-slate-700">
                    Badge / Tag (Optional)
                  </label>
                  <input
                    type="text"
                    id="tag"
                    name="tag"
                    placeholder={
                      formData.relationshipType === 'UPSELL'
                        ? 'e.g. Recommended Upgrade'
                        : 'e.g. Frequently Bought Together'
                    }
                    value={formData.tag}
                    onChange={handleFormChange}
                    className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleFormChange}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Active relationship (available for quotation recommendations)</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseModal}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {isSaving
                    ? 'Saving...'
                    : editingPairing
                    ? 'Update Relationship'
                    : 'Create Relationship'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProductPairings;
