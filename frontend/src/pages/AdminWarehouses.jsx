import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Edit3,
  Info,
  MapPin,
  Plus,
  Save,
  Warehouse,
  X,
} from 'lucide-react';
import { DashboardNavbar } from '../components/dashboard/DashboardNavbar';
import { Button } from '../components/ui/Button';
import api from '../services/api';
import {
  createWarehouse,
  getWarehouses,
  updateWarehouse,
  upsertInventory,
} from '../services/warehouseService';
import { getProducts } from '../services/productService';

const EMPTY_WAREHOUSE = {
  id: null,
  name: '',
  code: '',
  location: '',
  shippingCostWeight: 20,
  isActive: true,
};

export const AdminWarehouses = () => {
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [warehouseDetail, setWarehouseDetail] = useState(null);
  const [stockEdits, setStockEdits] = useState({});
  const [form, setForm] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingStock, setIsSavingStock] = useState(false);
  const [isSavingWarehouse, setIsSavingWarehouse] = useState(false);

  const loadWarehouses = async () => {
    try {
      const data = await getWarehouses();
      setWarehouses(data);
      if (data.length > 0) {
        setSelectedId((prev) => (prev && data.some((w) => w.id === prev) ? prev : data[0].id));
      }
      return data;
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to load warehouses.' });
      return [];
    }
  };

  const loadWarehouseDetail = async (id) => {
    if (!id) return;
    try {
      const response = await api.get(`/admin/warehouses/${id}`);
      const detail = response.data?.data;
      if (detail) {
        setWarehouseDetail(detail);
        const edits = {};
        if (detail.inventory) {
          detail.inventory.forEach((item) => {
            edits[item.productId] = {
              quantityOnHand: item.quantityOnHand ?? 0,
              reservedQuantity: item.reservedQuantity ?? 0,
            };
          });
        }
        setStockEdits(edits);
      }
    } catch (error) {
      console.error('Error fetching warehouse details:', error);
    }
  };

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      try {
        const [warehouseList, productList] = await Promise.all([
          loadWarehouses(),
          getProducts(),
        ]);
        setProducts(productList || []);
        if (warehouseList.length > 0) {
          const initialId = warehouseList[0].id;
          setSelectedId(initialId);
          await loadWarehouseDetail(initialId);
        }
      } catch (error) {
        setMessage({ type: 'error', text: error.message || 'Initialization error.' });
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (selectedId) {
      loadWarehouseDetail(selectedId);
    }
  }, [selectedId]);

  const selectedWarehouse =
    warehouseDetail?.id === selectedId
      ? warehouseDetail
      : warehouses.find((w) => w.id === selectedId) || warehouses[0] || null;

  const openCreateModal = () => {
    setMessage({ type: '', text: '' });
    setForm({ ...EMPTY_WAREHOUSE });
  };

  const openEditModal = () => {
    if (!selectedWarehouse) return;
    setMessage({ type: '', text: '' });
    setForm({
      id: selectedWarehouse.id,
      name: selectedWarehouse.name || '',
      code: selectedWarehouse.code || '',
      location: selectedWarehouse.location || '',
      shippingCostWeight: selectedWarehouse.shippingCostWeight ?? selectedWarehouse.shipping_cost_weight ?? 20,
      isActive: selectedWarehouse.isActive !== false && selectedWarehouse.is_active !== false,
    });
  };

  const closeModal = () => {
    if (!isSavingWarehouse) {
      setForm(null);
    }
  };

  const handleWarehouseFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSaveWarehouse = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.code.trim()) {
      setMessage({ type: 'error', text: 'Warehouse name and code are required.' });
      return;
    }

    setIsSavingWarehouse(true);
    try {
      const payload = {
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        location: form.location.trim() || null,
        shippingCostWeight: Number(form.shippingCostWeight || 20),
        isActive: form.isActive,
      };

      let saved;
      if (form.id) {
        saved = await updateWarehouse(form.id, payload);
        setMessage({ type: 'success', text: 'Warehouse updated successfully.' });
      } else {
        saved = await createWarehouse(payload);
        setMessage({ type: 'success', text: 'Warehouse created successfully.' });
      }

      setForm(null);
      await loadWarehouses();
      if (saved?.id) {
        setSelectedId(saved.id);
        await loadWarehouseDetail(saved.id);
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to save warehouse.' });
    } finally {
      setIsSavingWarehouse(false);
    }
  };

  const handleStockChange = (productId, field, val) => {
    const parsed = Math.max(0, parseInt(val, 10) || 0);
    setStockEdits((prev) => {
      const current = prev[productId] || {
        quantityOnHand: warehouseDetail?.inventory?.find((i) => i.productId === productId)?.quantityOnHand ?? 0,
        reservedQuantity: warehouseDetail?.inventory?.find((i) => i.productId === productId)?.reservedQuantity ?? 0,
      };
      return {
        ...prev,
        [productId]: {
          ...current,
          [field]: parsed,
        },
      };
    });
  };

  const handleSaveAllStockLevels = async () => {
    if (!selectedId) return;
    setIsSavingStock(true);
    setMessage({ type: '', text: '' });
    try {
      const updates = products.map((product) => {
        const edit = stockEdits[product.id];
        const inv = warehouseDetail?.inventory?.find((i) => i.productId === product.id);
        const quantityOnHand = edit?.quantityOnHand !== undefined ? edit.quantityOnHand : (inv?.quantityOnHand ?? 0);
        const reservedQuantity = edit?.reservedQuantity !== undefined ? edit.reservedQuantity : (inv?.reservedQuantity ?? 0);

        return upsertInventory(selectedId, {
          productId: product.id,
          quantityOnHand,
          reservedQuantity,
        });
      });

      await Promise.all(updates);
      setMessage({ type: 'success', text: 'Stock levels saved successfully.' });
      await Promise.all([loadWarehouses(), loadWarehouseDetail(selectedId)]);
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to save stock levels.' });
    } finally {
      setIsSavingStock(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardNavbar />
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start sm:items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white shadow-sm">
              <Warehouse className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Warehouse &amp; Inventory Management
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Configure distribution facilities, stock replenishment thresholds, and shipping-cost weighting for multi-warehouse order splits.
              </p>
            </div>
          </div>
          <Button
            type="button"
            onClick={openCreateModal}
            className="sm:!w-auto px-4 gap-2 whitespace-nowrap shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>New Warehouse</span>
          </Button>
        </header>

        {message.text && (
          <div
            className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium ${
              message.type === 'error'
                ? 'border-red-200 bg-red-50 text-red-700'
                : 'border-emerald-200 bg-emerald-50 text-emerald-700'
            }`}
            role="status"
          >
            {message.type === 'error' ? (
              <AlertCircle className="h-5 w-5 shrink-0" />
            ) : (
              <CheckCircle2 className="h-5 w-5 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-6 items-start">
          <section className="w-full lg:w-[30%] shrink-0 space-y-3" aria-label="Warehouse list">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              WAREHOUSES ({warehouses.length})
            </h2>

            {isLoading && warehouses.length === 0 ? (
              <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
                Loading warehouses...
              </div>
            ) : warehouses.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
                No warehouses found.
              </div>
            ) : (
              <div className="space-y-3">
                {warehouses.map((wh) => {
                  const isSelected = selectedId === wh.id;
                  const count = wh.inventory ? wh.inventory.length : products.length;

                  return (
                    <div
                      key={wh.id}
                      onClick={() => setSelectedId(wh.id)}
                      className={`group cursor-pointer rounded-lg border bg-white p-4 transition-all ${
                        isSelected
                          ? 'border-blue-600 ring-1 ring-blue-600 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300 hover:shadow-xs'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h3
                          className={`font-semibold text-sm transition-colors ${
                            isSelected ? 'text-blue-900' : 'text-slate-900 group-hover:text-blue-600'
                          }`}
                        >
                          {wh.name}
                        </h3>
                        <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs font-medium text-slate-600 border border-slate-200">
                          {wh.code}
                        </span>
                      </div>

                      <p className="mt-1 text-xs text-slate-500 flex items-center gap-1.5 truncate">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span className="truncate">{wh.location || 'No address specified'}</span>
                      </p>

                      <div className="my-3 border-t border-slate-100" />

                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <div className="flex items-center gap-2">
                          <span>
                            Weight: <span className="font-semibold text-slate-700">{wh.shippingCostWeight ?? wh.shipping_cost_weight ?? 20}</span>
                          </span>
                          <span>·</span>
                          <span>
                            {count} {count === 1 ? 'product' : 'products'}
                          </span>
                        </div>
                        <ChevronRight
                          className={`h-4 w-4 transition-colors ${
                            isSelected ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
                          }`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="w-full lg:w-[70%] space-y-6" aria-label="Warehouse details">
            {selectedWarehouse ? (
              <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-slate-100">
                  <div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h2 className="text-xl font-bold text-slate-900">{selectedWarehouse.name}</h2>
                      <span className="rounded bg-slate-100 px-2.5 py-0.5 font-mono text-xs font-semibold text-slate-700 border border-slate-200">
                        {selectedWarehouse.code}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                          selectedWarehouse.isActive !== false && selectedWarehouse.is_active !== false
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {selectedWarehouse.isActive !== false && selectedWarehouse.is_active !== false ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <p className="mt-2 text-sm text-slate-500 flex items-center gap-1.5">
                      <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
                      <span>{selectedWarehouse.location || 'No location configured'}</span>
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={openEditModal}
                    className="!w-auto px-3.5 gap-1.5 text-xs font-semibold shrink-0"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    <span>Edit Warehouse</span>
                  </Button>
                </div>

                <div className="space-y-3 pb-6 border-b border-slate-100">
                  <h3 className="text-base font-bold text-slate-900">
                    Fulfillment Shipping-Cost Weighting
                  </h3>
                  <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-bold text-slate-900">
                            {selectedWarehouse.shippingCostWeight ?? selectedWarehouse.shipping_cost_weight ?? 20}
                          </span>
                          <span className="text-xs font-medium text-slate-500">
                            shipping weight factor
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500 leading-relaxed max-w-xl">
                          Used by the automated order fulfillment engine to calculate split shipments, prioritizing warehouses with lower shipping factors.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        Product Stock &amp; Replenishment Rules
                      </h3>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Live stock on hand, reserved allocations, and safety reorder points.
                      </p>
                    </div>

                    <Button
                      type="button"
                      onClick={handleSaveAllStockLevels}
                      isLoading={isSavingStock}
                      className="sm:!w-auto px-4 gap-2 whitespace-nowrap text-xs font-semibold"
                    >
                      <Save className="h-4 w-4" />
                      <span>Save Stock Levels</span>
                    </Button>
                  </div>

                  <div className="overflow-x-auto rounded-lg border border-slate-200">
                    <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                      <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                        <tr>
                          <th scope="col" className="px-4 py-3">Product</th>
                          <th scope="col" className="px-4 py-3">Available Stock</th>
                          <th scope="col" className="px-4 py-3">Reserved</th>
                          <th scope="col" className="px-4 py-3">Reorder Point</th>
                          <th scope="col" className="px-4 py-3">Target Stock</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {products.length === 0 ? (
                          <tr>
                            <td colSpan="5" className="px-4 py-8 text-center text-sm text-slate-500">
                              No products found in catalog.
                            </td>
                          </tr>
                        ) : (
                          products.map((product) => {
                            const inv = warehouseDetail?.inventory?.find((i) => i.productId === product.id);
                            const qtyOnHand =
                              stockEdits[product.id]?.quantityOnHand !== undefined
                                ? stockEdits[product.id].quantityOnHand
                                : (inv?.quantityOnHand ?? 0);
                            const reserved =
                              stockEdits[product.id]?.reservedQuantity !== undefined
                                ? stockEdits[product.id].reservedQuantity
                                : (inv?.reservedQuantity ?? 0);

                            return (
                              <tr key={product.id} className="hover:bg-slate-50/60 transition-colors">
                                <td className="px-4 py-3">
                                  <div className="font-semibold text-slate-900">{product.name}</div>
                                  <div className="text-xs text-slate-400 font-mono">{product.sku}</div>
                                </td>
                                <td className="px-4 py-3">
                                  <input
                                    type="number"
                                    min="0"
                                    value={qtyOnHand}
                                    onChange={(e) => handleStockChange(product.id, 'quantityOnHand', e.target.value)}
                                    className="w-24 rounded border border-slate-200 px-2.5 py-1 text-sm font-medium text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 shadow-xs"
                                  />
                                </td>
                                <td className="px-4 py-3">
                                  <input
                                    type="number"
                                    min="0"
                                    value={reserved}
                                    onChange={(e) => handleStockChange(product.id, 'reservedQuantity', e.target.value)}
                                    className="w-24 rounded border border-slate-200 px-2.5 py-1 text-sm font-medium text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 shadow-xs"
                                  />
                                </td>
                                <td className="px-4 py-3 font-mono text-sm text-slate-600">
                                  {product.reorderPoint ?? inv?.reorderPoint ?? '10'}
                                </td>
                                <td className="px-4 py-3 font-mono text-sm text-slate-600">
                                  {product.targetStock ?? inv?.targetStock ?? '50'}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <aside className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900" role="note">
                  <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                  <div className="text-sm">
                    <p className="font-semibold text-amber-900">
                      Multi-Warehouse Fulfillment &amp; Replenishment Notice
                    </p>
                    <p className="mt-1 text-xs text-amber-800 leading-relaxed">
                      Stock allocations and shipping-cost weighting directly determine automatic fulfillment splitting for confirmed quotations. Ensure reorder points and live stock balances are kept up to date to prevent split order delays.
                    </p>
                  </div>
                </aside>
              </div>
            ) : (
              <div className="rounded-lg border border-slate-200 bg-white p-12 text-center text-sm text-slate-500 shadow-sm">
                Select a warehouse from the list to view its configuration and inventory.
              </div>
            )}
          </section>
        </div>
      </main>

      {form && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-lg bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-base font-bold text-slate-900">
                {form.id ? 'Edit Warehouse' : 'New Warehouse'}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                disabled={isSavingWarehouse}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveWarehouse} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Warehouse Name *
                </label>
                <input
                  required
                  name="name"
                  type="text"
                  placeholder="e.g. Central Hub"
                  value={form.name}
                  onChange={handleWarehouseFormChange}
                  className="w-full rounded border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Warehouse Code *
                </label>
                <input
                  required
                  name="code"
                  type="text"
                  placeholder="e.g. WH-CENTRAL"
                  value={form.code}
                  onChange={handleWarehouseFormChange}
                  className="w-full rounded border border-slate-200 px-3 py-2 text-sm font-mono uppercase text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Location / Address
                </label>
                <input
                  name="location"
                  type="text"
                  placeholder="e.g. Chicago, IL - Regional Distribution"
                  value={form.location || ''}
                  onChange={handleWarehouseFormChange}
                  className="w-full rounded border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Shipping Cost Weight
                </label>
                <input
                  name="shippingCostWeight"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="20.00"
                  value={form.shippingCostWeight}
                  onChange={handleWarehouseFormChange}
                  className="w-full rounded border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              {form.id && (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    id="wh-is-active"
                    name="isActive"
                    type="checkbox"
                    checked={Boolean(form.isActive)}
                    onChange={handleWarehouseFormChange}
                    className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                  />
                  <label htmlFor="wh-is-active" className="text-sm font-medium text-slate-700">
                    Active Facility
                  </label>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeModal}
                  disabled={isSavingWarehouse}
                  className="!w-auto px-4"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  isLoading={isSavingWarehouse}
                  className="!w-auto px-4"
                >
                  Save Warehouse
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminWarehouses;
