import React, { useEffect, useState } from 'react';
import { Edit3, Plus, Trash2, X } from 'lucide-react';
import { DashboardNavbar } from '../components/dashboard/DashboardNavbar';
import { Button } from '../components/ui/Button';
import { getProducts } from '../services/productService';
import {
  createPriceList,
  createPriceListItem,
  deactivatePriceListItem,
  deletePriceList,
  deletePriceListItem,
  getPriceListItems,
  getPriceLists,
  updatePriceList,
  updatePriceListItem
} from '../services/priceListService';
import { formatCurrency } from '../utils/currencyFormatter';

const CURRENCIES = [
  { code: 'INR', label: 'INR — Indian Rupee' },
  { code: 'USD', label: 'USD — US Dollar' },
  { code: 'EUR', label: 'EUR — Euro' },
  { code: 'GBP', label: 'GBP — British Pound' },
  { code: 'JPY', label: 'JPY — Japanese Yen' },
  { code: 'AUD', label: 'AUD — Australian Dollar' },
  { code: 'CAD', label: 'CAD — Canadian Dollar' },
  { code: 'SGD', label: 'SGD — Singapore Dollar' },
  { code: 'AED', label: 'AED — UAE Dirham' },
  { code: 'CNY', label: 'CNY — Chinese Yuan' },
  { code: 'CHF', label: 'CHF — Swiss Franc' },
  { code: 'HKD', label: 'HKD — Hong Kong Dollar' },
  { code: 'NZD', label: 'NZD — New Zealand Dollar' },
  { code: 'SEK', label: 'SEK — Swedish Krona' },
  { code: 'NOK', label: 'NOK — Norwegian Krone' },
  { code: 'DKK', label: 'DKK — Danish Krone' },
  { code: 'ZAR', label: 'ZAR — South African Rand' },
  { code: 'BRL', label: 'BRL — Brazilian Real' },
  { code: 'MXN', label: 'MXN — Mexican Peso' },
  { code: 'KRW', label: 'KRW — South Korean Won' },
];

const EMPTY_LIST = { id: null, name: '', description: '', currency: 'INR', isDefault: false };
const EMPTY_ITEM = { id: null, productId: '', productVariantId: '', unitPrice: '', minQuantity: 1, maxQuantity: '' };

export const AdminPriceLists = () => {
  const [lists, setLists] = useState([]);
  const [products, setProducts] = useState([]);
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [listForm, setListForm] = useState(null);
  const [itemForm, setItemForm] = useState(null);
  const [editingItem, setEditingItem] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [formError, setFormError] = useState('');
  const [isSavingList, setIsSavingList] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeletingList, setIsDeletingList] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Item-level management state
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [isSavingItem, setIsSavingItem] = useState(false);
  const [itemFormError, setItemFormError] = useState('');
  const [itemToDelete, setItemToDelete] = useState(null);
  const [isDeletingItem, setIsDeletingItem] = useState(false);
  const [itemDeleteError, setItemDeleteError] = useState('');

  const loadLists = async () => {
    try {
      const data = await getPriceLists();
      setLists(data);
      if (!selectedId && data[0]) setSelectedId(data[0].id);
    } catch (error) {
      setFeedback(error.message);
    }
  };

  const loadItems = async (id) => {
    if (!id) {
      setItems([]);
      return;
    }
    setIsLoadingItems(true);
    try {
      const data = await getPriceListItems(id);
      setItems(data || []);
    } catch (error) {
      setFeedback(error.message || 'Failed to load price list items.');
    } finally {
      setIsLoadingItems(false);
    }
  };

  useEffect(() => {
    Promise.all([loadLists(), getProducts().then(setProducts)]).catch((error) => setFeedback(error.message));
  }, []);

  useEffect(() => {
    loadItems(selectedId).catch((error) => setFeedback(error.message));
  }, [selectedId]);

  const saveList = async (event) => {
    event.preventDefault();
    if (isSavingList) return;
    setIsSavingList(true);
    setFormError('');
    try {
      const saved = listForm.id ? await updatePriceList(listForm.id, listForm) : await createPriceList(listForm);
      setFeedback(listForm.id ? 'Price list updated.' : 'Price list created.');
      setListForm(null);
      const data = await getPriceLists();
      setLists(data);
      if (saved?.id) setSelectedId(saved.id);
      else if (!selectedId && data[0]?.id) setSelectedId(data[0].id);
    } catch (error) {
      setFormError(error.message || 'Failed to save price list.');
      setFeedback(error.message || 'Failed to save price list.');
    } finally {
      setIsSavingList(false);
    }
  };

  const handleDeletePriceList = async () => {
    if (!listForm?.id || isDeletingList) return;
    setIsDeletingList(true);
    setDeleteError('');
    try {
      await deletePriceList(listForm.id);
      const remainingLists = lists.filter((list) => list.id !== listForm.id);
      setLists(remainingLists);
      if (selectedId === listForm.id) {
        setSelectedId(remainingLists[0]?.id || null);
      }
      setShowDeleteConfirm(false);
      setListForm(null);
      setFeedback('Price list deleted successfully.');
      const data = await getPriceLists();
      setLists(data);
      if (selectedId === listForm.id) {
        setSelectedId(data[0]?.id || null);
      }
    } catch (error) {
      setDeleteError(error.message || 'Failed to delete price list.');
    } finally {
      setIsDeletingList(false);
    }
  };

  const handleEditItem = (item) => {
    setItemForm({
      id: item.id,
      productId: item.productId || item.product_id || '',
      productVariantId: item.productVariantId || item.product_variant_id || '',
      unitPrice: item.unitPrice !== undefined ? item.unitPrice : (item.unit_price !== undefined ? item.unit_price : ''),
      minQuantity: item.minQuantity !== undefined ? item.minQuantity : (item.min_quantity !== undefined ? item.min_quantity : 1),
      maxQuantity: item.maxQuantity !== undefined ? (item.maxQuantity || '') : (item.max_quantity !== undefined ? (item.max_quantity || '') : ''),
      productName: item.productName || item.product_name || '',
      productSku: item.productSku || item.product_sku || '',
      variantName: item.variantName || item.variant_name || '',
    });
    setEditingItem(true);
    setItemFormError('');
  };

  const handleOpenAddItem = () => {
    setItemForm({ ...EMPTY_ITEM });
    setEditingItem(false);
    setItemFormError('');
  };

  const handleCancelItemEdit = () => {
    setItemForm(null);
    setEditingItem(false);
    setItemFormError('');
  };

  const saveItem = async (event) => {
    event.preventDefault();
    if (isSavingItem) return;
    setItemFormError('');

    try {
      const prodId = Number(itemForm.productId);
      if (!prodId || isNaN(prodId)) {
        throw new Error('Please select a valid product.');
      }

      const priceNum = Number(itemForm.unitPrice);
      if (itemForm.unitPrice === '' || isNaN(priceNum) || priceNum < 0) {
        throw new Error('Unit price must be a non-negative number.');
      }

      const minQty = Number(itemForm.minQuantity || 1);
      if (isNaN(minQty) || minQty < 1) {
        throw new Error('Minimum quantity must be at least 1.');
      }

      const maxQty = itemForm.maxQuantity ? Number(itemForm.maxQuantity) : null;
      if (maxQty !== null && (isNaN(maxQty) || maxQty < minQty)) {
        throw new Error('Maximum quantity cannot be less than minimum quantity.');
      }

      setIsSavingItem(true);
      const payload = {
        priceListId: selectedId,
        productId: prodId,
        productVariantId: itemForm.productVariantId ? Number(itemForm.productVariantId) : null,
        unitPrice: priceNum,
        minQuantity: minQty,
        maxQuantity: maxQty
      };

      if (editingItem) {
        await updatePriceListItem(itemForm.id, payload);
        setFeedback(`Price entry for "${itemForm.productName || 'product'}" updated successfully.`);
      } else {
        await createPriceListItem(payload);
        setFeedback('New price entry created successfully.');
      }

      setItemForm(null);
      setEditingItem(false);
      await loadItems(selectedId);
    } catch (error) {
      setItemFormError(error.message || 'Failed to save price list item.');
    } finally {
      setIsSavingItem(false);
    }
  };

  const handleDeleteItem = async () => {
    if (!itemToDelete || isDeletingItem) return;
    setIsDeletingItem(true);
    setItemDeleteError('');
    try {
      await deletePriceListItem(itemToDelete.id, selectedId);
      const prodName = itemToDelete.product_name || itemToDelete.productName || 'Product';
      setFeedback(`Removed "${prodName}" from price list.`);
      setItemToDelete(null);
      await loadItems(selectedId);
    } catch (error) {
      setItemDeleteError(error.message || 'Failed to remove price list item.');
    } finally {
      setIsDeletingItem(false);
    }
  };

  const selectedList = lists.find((list) => list.id === selectedId);

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardNavbar />
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <header>
          <h1 className="text-2xl font-bold text-slate-900">Price Lists</h1>
          <p className="mt-1 text-sm text-slate-600">Configure real product prices by currency and quantity range.</p>
        </header>

        {feedback && (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700" role="status">
            {feedback}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">Price lists</h2>
              <Button
                type="button"
                onClick={() => { setListForm({ ...EMPTY_LIST }); setFormError(''); }}
                className="!w-auto px-3"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="mt-4 space-y-2">
              {lists.map((list) => (
                <button
                  key={list.id}
                  type="button"
                  onClick={() => setSelectedId(list.id)}
                  className={`w-full rounded-md border p-3 text-left ${selectedId === list.id ? 'border-slate-900 bg-slate-50' : 'border-slate-200'}`}
                >
                  <p className="font-medium text-slate-900">{list.name}</p>
                  <p className="text-xs text-slate-500">{list.currency} {list.is_default ? '· Default' : ''}</p>
                </button>
              ))}
            </div>
          </section>

          <section className="lg:col-span-2 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-slate-900">{selectedList?.name || 'Select a price list'}</h2>
                <p className="text-sm text-slate-500">{selectedList?.description || 'Create or select a price list.'}</p>
              </div>
              {selectedList && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setListForm({ ...selectedList, isDefault: selectedList.is_default }); setFormError(''); }}
                  className="!w-auto px-3"
                >
                  <Edit3 className="h-4 w-4" />
                </Button>
              )}
            </div>

            {selectedList && (
              <>
                <div className="mt-6 flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-slate-900">Price list items</h3>
                    <p className="text-xs text-slate-500">Configure real product prices and quantity tiers for this price list.</p>
                  </div>
                  <Button
                    type="button"
                    onClick={handleOpenAddItem}
                    className="!w-auto px-3 gap-1"
                  >
                    <Plus className="h-4 w-4" />
                    Add item
                  </Button>
                </div>

                {isLoadingItems ? (
                  <div className="py-8 text-center text-sm text-slate-500">
                    Loading price list items...
                  </div>
                ) : items.length === 0 ? (
                  <div className="mt-4 rounded-md border border-dashed border-slate-300 p-8 text-center">
                    <p className="text-sm font-medium text-slate-600">No items configured in this price list yet.</p>
                    <p className="mt-1 text-xs text-slate-400">Click &quot;Add item&quot; above to configure a product&apos;s price.</p>
                  </div>
                ) : (
                  <div className="mt-3 overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead>
                        <tr className="border-b text-slate-500 font-semibold">
                          <th className="py-2.5">Product</th>
                          <th className="py-2.5">Price</th>
                          <th className="py-2.5">Quantity Tier</th>
                          <th className="py-2.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {items.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50/80">
                            <td className="py-3">
                              <p className="font-medium text-slate-900">{item.product_name || item.productName}</p>
                              <p className="text-xs text-slate-500">
                                {item.product_sku || item.productSku}
                                {(item.variant_name || item.variantName) ? ` · ${item.variant_name || item.variantName}` : ''}
                              </p>
                            </td>
                            <td className="py-3 font-semibold text-slate-900">
                              {formatCurrency(item.unit_price !== undefined ? item.unit_price : item.unitPrice)}
                            </td>
                            <td className="py-3 text-slate-600">
                              {(item.min_quantity ?? item.minQuantity ?? 1)} - {(item.max_quantity || item.maxQuantity || 'Open')}
                            </td>
                            <td className="py-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleEditItem(item)}
                                  title="Edit item price"
                                  className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                                >
                                  <Edit3 className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => { setItemToDelete(item); setItemDeleteError(''); }}
                                  title="Remove item from price list"
                                  className="rounded p-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </section>
        </div>

        {listForm && (
          <div className="fixed inset-0 z-40 bg-slate-900/40 p-4">
            <form onSubmit={saveList} className="mx-auto mt-10 max-w-lg space-y-4 rounded-lg bg-white p-6">
              <div className="flex justify-between">
                <h2 className="font-semibold">{listForm.id ? 'Edit' : 'Create'} price list</h2>
                <button
                  type="button"
                  onClick={() => { setListForm(null); setFormError(''); }}
                  disabled={isSavingList || isDeletingList}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {formError && (
                <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">
                  {formError}
                </div>
              )}

              <input
                required
                placeholder="Name"
                value={listForm.name}
                onChange={(e) => setListForm({ ...listForm, name: e.target.value })}
                className="w-full rounded border p-2"
                disabled={isSavingList}
              />
              <input
                placeholder="Description"
                value={listForm.description || ''}
                onChange={(e) => setListForm({ ...listForm, description: e.target.value })}
                className="w-full rounded border p-2"
                disabled={isSavingList}
              />
              <select
                required
                value={listForm.currency || 'INR'}
                onChange={(e) => setListForm({ ...listForm, currency: e.target.value })}
                className="w-full rounded border p-2 bg-white text-slate-900"
                disabled={isSavingList}
              >
                {CURRENCIES.map((curr) => (
                  <option key={curr.code} value={curr.code}>
                    {curr.label}
                  </option>
                ))}
                {listForm.currency && !CURRENCIES.some((c) => c.code === listForm.currency) && (
                  <option value={listForm.currency}>{listForm.currency}</option>
                )}
              </select>
              <label className="flex gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={Boolean(listForm.isDefault)}
                  onChange={(e) => setListForm({ ...listForm, isDefault: e.target.checked })}
                  disabled={isSavingList}
                />
                Default price list
              </label>

              <div className={listForm.id ? "flex items-center justify-between gap-3 pt-2" : "flex items-center justify-end gap-2 pt-2"}>
                {listForm.id && (
                  <button
                    type="button"
                    onClick={() => { setShowDeleteConfirm(true); setDeleteError(''); }}
                    disabled={isSavingList || isDeletingList}
                    className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Delete</span>
                  </button>
                )}
                <Button
                  type="submit"
                  isLoading={isSavingList}
                  disabled={isSavingList || isDeletingList}
                  className={listForm.id ? "!w-auto px-5" : "w-full"}
                >
                  Save price list
                </Button>
              </div>
            </form>
          </div>
        )}

        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">Delete Price List</h3>
                <button
                  type="button"
                  onClick={() => { setShowDeleteConfirm(false); setDeleteError(''); }}
                  disabled={isDeletingList}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="text-sm text-slate-600">
                Are you sure you want to delete this price list?
              </p>
              {deleteError && (
                <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">
                  {deleteError}
                </div>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setShowDeleteConfirm(false); setDeleteError(''); }}
                  disabled={isDeletingList}
                  className="!w-auto px-4"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleDeletePriceList}
                  isLoading={isDeletingList}
                  disabled={isDeletingList}
                  className="!w-auto px-4 bg-rose-600 hover:bg-rose-700 text-white"
                >
                  Delete
                </Button>
              </div>
            </div>
          </div>
        )}

        {itemForm && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
            <form onSubmit={saveItem} className="w-full max-w-lg space-y-4 rounded-lg bg-white p-6 shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    {editingItem ? 'Edit Price Entry' : 'Add Price Entry'}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {editingItem ? `Update pricing for ${itemForm.productName} in ${selectedList?.name}` : `Add product pricing to ${selectedList?.name}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCancelItemEdit}
                  disabled={isSavingItem}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {itemFormError && (
                <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">
                  {itemFormError}
                </div>
              )}

              {editingItem ? (
                <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Product</p>
                  <p className="font-semibold text-slate-900 mt-0.5">{itemForm.productName}</p>
                  <p className="text-xs text-slate-500">{itemForm.productSku} {itemForm.variantName ? `· ${itemForm.variantName}` : ''}</p>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Product *</label>
                  <select
                    required
                    value={itemForm.productId}
                    onChange={(e) => setItemForm({ ...itemForm, productId: e.target.value })}
                    className="w-full rounded border border-slate-300 p-2 text-sm bg-white text-slate-900"
                    disabled={isSavingItem}
                  >
                    <option value="">Select product</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} ({product.sku})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Unit Price ($) *</label>
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={itemForm.unitPrice}
                  onChange={(e) => setItemForm({ ...itemForm, unitPrice: e.target.value })}
                  className="w-full rounded border border-slate-300 p-2 text-sm text-slate-900"
                  disabled={isSavingItem}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Minimum Quantity *</label>
                  <input
                    required
                    type="number"
                    min="1"
                    placeholder="1"
                    value={itemForm.minQuantity}
                    onChange={(e) => setItemForm({ ...itemForm, minQuantity: e.target.value })}
                    className="w-full rounded border border-slate-300 p-2 text-sm text-slate-900"
                    disabled={isSavingItem}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Maximum Quantity (optional)</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Open"
                    value={itemForm.maxQuantity || ''}
                    onChange={(e) => setItemForm({ ...itemForm, maxQuantity: e.target.value })}
                    className="w-full rounded border border-slate-300 p-2 text-sm text-slate-900"
                    disabled={isSavingItem}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancelItemEdit}
                  disabled={isSavingItem}
                  className="!w-auto px-4"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  isLoading={isSavingItem}
                  disabled={isSavingItem}
                  className="!w-auto px-5"
                >
                  {editingItem ? 'Save Changes' : 'Add Price Entry'}
                </Button>
              </div>
            </form>
          </div>
        )}

        {itemToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">Remove Item from Price List</h3>
                <button
                  type="button"
                  onClick={() => { setItemToDelete(null); setItemDeleteError(''); }}
                  disabled={isDeletingItem}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="text-sm text-slate-600">
                Are you sure you want to remove <strong className="text-slate-900">{itemToDelete.product_name || itemToDelete.productName}</strong> ({itemToDelete.product_sku || itemToDelete.productSku}) from <strong className="text-slate-900">{selectedList?.name}</strong>?
              </p>
              <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded border border-slate-200">
                This will only remove the pricing entry from this price list. The underlying product will remain completely intact in your catalog.
              </p>
              {itemDeleteError && (
                <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">
                  {itemDeleteError}
                </div>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setItemToDelete(null); setItemDeleteError(''); }}
                  disabled={isDeletingItem}
                  className="!w-auto px-4"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleDeleteItem}
                  isLoading={isDeletingItem}
                  disabled={isDeletingItem}
                  className="!w-auto px-4 bg-rose-600 hover:bg-rose-700 text-white"
                >
                  Remove Item
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminPriceLists;
