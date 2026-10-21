import React, { useEffect, useState } from 'react';
import { Edit3, Plus, Trash2, X, AlertCircle, CheckCircle2, Package } from 'lucide-react';
import { DashboardNavbar } from '../components/dashboard/DashboardNavbar';
import { Button } from '../components/ui/Button';
import { formatCurrency } from '../utils/currencyFormatter';
import { getProducts } from '../services/productService';
import {
  createPriceList,
  createPriceListItem,
  deletePriceList,
  deletePriceListItem,
  getPriceListItems,
  getPriceLists,
  updatePriceList,
  updatePriceListItem,
} from '../services/priceListService';

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

const EMPTY_LIST = { id: null, name: '', description: '', currency: 'USD', isDefault: false };
const EMPTY_ITEM = { id: null, productId: '', productVariantId: '', unitPrice: '', minQuantity: 1, maxQuantity: '' };

export const AdminPriceLists = () => {
  const [lists, setLists] = useState([]);
  const [products, setProducts] = useState([]);
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [isLoadingLists, setIsLoadingLists] = useState(true);
  const [isLoadingItems, setIsLoadingItems] = useState(false);

  // Price List form & delete states
  const [listForm, setListForm] = useState(null);
  const [isSavingList, setIsSavingList] = useState(false);
  const [listFormError, setListFormError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeletingList, setIsDeletingList] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Item form & delete states
  const [itemForm, setItemForm] = useState(null);
  const [editingItem, setEditingItem] = useState(false);
  const [isSavingItem, setIsSavingItem] = useState(false);
  const [itemFormError, setItemFormError] = useState('');
  const [itemToDelete, setItemToDelete] = useState(null);
  const [isDeletingItem, setIsDeletingItem] = useState(false);
  const [deleteItemError, setDeleteItemError] = useState('');

  // Global feedback alert
  const [feedback, setFeedback] = useState('');

  const loadLists = async () => {
    setIsLoadingLists(true);
    try {
      const data = await getPriceLists();
      setLists(data);
      if (!selectedId && data[0]) {
        setSelectedId(data[0].id);
      }
    } catch (error) {
      setFeedback(error?.response?.data?.message || error.message || 'Failed to load price lists.');
    } finally {
      setIsLoadingLists(false);
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
      setItems(data);
    } catch (error) {
      setFeedback(error?.response?.data?.message || error.message || 'Failed to load price list items.');
      setItems([]);
    } finally {
      setIsLoadingItems(false);
    }
  };

  useEffect(() => {
    Promise.all([loadLists(), getProducts().then(setProducts)]).catch((error) => {
      setFeedback(error?.response?.data?.message || error.message);
    });
  }, []);

  useEffect(() => {
    if (selectedId) {
      loadItems(selectedId);
    } else {
      setItems([]);
    }
  }, [selectedId]);

  const saveList = async (event) => {
    event.preventDefault();
    if (isSavingList) return;
    setIsSavingList(true);
    setListFormError('');
    try {
      const saved = listForm.id ? await updatePriceList(listForm.id, listForm) : await createPriceList(listForm);
      setFeedback(listForm.id ? 'Price list updated.' : 'Price list created.');
      setListForm(null);
      const data = await getPriceLists();
      setLists(data);
      if (saved?.id) setSelectedId(saved.id);
    } catch (error) {
      setListFormError(error?.response?.data?.message || error.message || 'Failed to save price list.');
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
      setDeleteError(error?.response?.data?.message || error.message || 'Failed to delete price list.');
    } finally {
      setIsDeletingList(false);
    }
  };

  const openAddItem = () => {
    setItemForm({ ...EMPTY_ITEM });
    setEditingItem(false);
    setItemFormError('');
  };

  const openEditItem = (item) => {
    setItemForm({
      id: item.id,
      productId: item.product_id ?? item.productId ?? '',
      productVariantId: item.product_variant_id ?? item.productVariantId ?? '',
      unitPrice: item.unit_price ?? item.unitPrice ?? '',
      minQuantity: item.min_quantity ?? item.minQuantity ?? 1,
      maxQuantity: item.max_quantity ?? item.maxQuantity ?? '',
      productName: item.product_name ?? item.productName ?? '',
      productSku: item.product_sku ?? item.productSku ?? '',
      variantName: item.variant_name ?? item.variantName ?? '',
    });
    setEditingItem(true);
    setItemFormError('');
  };

  const cancelEditItem = () => {
    setItemForm(null);
    setEditingItem(false);
    setItemFormError('');
  };

  const saveItem = async (event) => {
    event.preventDefault();
    if (isSavingItem) return;
    setItemFormError('');

    const unitPriceNum = Number(itemForm.unitPrice);
    if (isNaN(unitPriceNum) || unitPriceNum < 0) {
      setItemFormError('Unit price must be a valid non-negative number.');
      return;
    }

    const minQtyNum = Number(itemForm.minQuantity || 1);
    if (isNaN(minQtyNum) || minQtyNum < 1) {
      setItemFormError('Minimum quantity must be 1 or greater.');
      return;
    }

    const maxQtyNum = itemForm.maxQuantity ? Number(itemForm.maxQuantity) : null;
    if (maxQtyNum !== null && (isNaN(maxQtyNum) || maxQtyNum < minQtyNum)) {
      setItemFormError('Maximum quantity cannot be less than minimum quantity.');
      return;
    }

    setIsSavingItem(true);
    try {
      const payload = {
        priceListId: selectedId,
        productId: Number(itemForm.productId),
        productVariantId: itemForm.productVariantId ? Number(itemForm.productVariantId) : null,
        unitPrice: unitPriceNum,
        minQuantity: minQtyNum,
        maxQuantity: maxQtyNum,
      };

      if (editingItem && itemForm.id) {
        await updatePriceListItem(itemForm.id, payload);
        setFeedback('Price list item updated successfully.');
      } else {
        await createPriceListItem(payload);
        setFeedback('Price list item added successfully.');
      }

      setItemForm(null);
      setEditingItem(false);
      await loadItems(selectedId);
    } catch (error) {
      setItemFormError(error?.response?.data?.message || error.message || 'Failed to save price list item.');
    } finally {
      setIsSavingItem(false);
    }
  };

  const confirmDeleteItem = (item) => {
    setItemToDelete(item);
    setDeleteItemError('');
  };

  const handleDeleteItem = async () => {
    if (!itemToDelete || isDeletingItem) return;
    setIsDeletingItem(true);
    setDeleteItemError('');
    try {
      await deletePriceListItem(itemToDelete.id, selectedId);
      const deletedName = itemToDelete.product_name || itemToDelete.productName || 'Item';
      setItemToDelete(null);
      setFeedback(`Removed "${deletedName}" from price list.`);
      await loadItems(selectedId);
    } catch (error) {
      setDeleteItemError(error?.response?.data?.message || error.message || 'Failed to remove item.');
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
          <div className="flex items-center justify-between rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700" role="status">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>{feedback}</span>
            </div>
            <button type="button" onClick={() => setFeedback('')} className="text-emerald-500 hover:text-emerald-700">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Price Lists Sidebar */}
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">Price lists</h2>
              <Button
                type="button"
                onClick={() => { setListForm({ ...EMPTY_LIST }); setListFormError(''); }}
                className="!w-auto px-3"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {isLoadingLists ? (
              <p className="mt-4 text-xs text-slate-400">Loading price lists...</p>
            ) : lists.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">No price lists created yet.</p>
            ) : (
              <div className="mt-4 space-y-2">
                {lists.map((list) => (
                  <button
                    key={list.id}
                    type="button"
                    onClick={() => setSelectedId(list.id)}
                    className={`w-full rounded-md border p-3 text-left transition-colors ${
                      selectedId === list.id ? 'border-slate-900 bg-slate-50' : 'border-slate-200 hover:bg-slate-50/50'
                    }`}
                  >
                    <p className="font-medium text-slate-900">{list.name}</p>
                    <p className="text-xs text-slate-500">{list.currency} {list.is_default ? '· Default' : ''}</p>
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* Price List Details and Items */}
          <section className="lg:col-span-2 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="font-semibold text-slate-900">{selectedList?.name || 'Select a price list'}</h2>
                <p className="text-sm text-slate-500">{selectedList?.description || 'Create or select a price list.'}</p>
              </div>
              {selectedList && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setListForm({ ...selectedList, isDefault: selectedList.is_default }); setListFormError(''); }}
                  className="!w-auto px-3 gap-1.5"
                >
                  <Edit3 className="h-4 w-4" />
                  <span>Edit List</span>
                </Button>
              )}
            </div>

            {selectedList && (
              <>
                <div className="mt-6 flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-slate-900">Price List Items</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Manage product pricing and tier thresholds.</p>
                  </div>
                  <Button
                    type="button"
                    onClick={openAddItem}
                    className="!w-auto px-3 gap-1 text-sm"
                  >
                    <Plus className="h-4 w-4" />
                    Add item
                  </Button>
                </div>

                {isLoadingItems ? (
                  <div className="py-8 text-center text-sm text-slate-500">Loading items...</div>
                ) : items.length === 0 ? (
                  <div className="mt-4 rounded-md border border-dashed border-slate-200 py-10 text-center">
                    <Package className="mx-auto h-8 w-8 text-slate-400" />
                    <p className="mt-2 text-sm font-medium text-slate-900">No items in this price list</p>
                    <p className="mt-1 text-xs text-slate-500">Configure prices for products in this price list.</p>
                    <Button
                      type="button"
                      onClick={openAddItem}
                      className="!w-auto mt-3 px-3 gap-1 text-xs mx-auto"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add first item
                    </Button>
                  </div>
                ) : (
                  <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full text-left text-sm divide-y divide-slate-200">
                      <thead>
                        <tr className="text-xs uppercase font-semibold text-slate-500 bg-slate-50/50">
                          <th className="py-2.5 px-3">Product & SKU</th>
                          <th className="py-2.5 px-3">Configured Price</th>
                          <th className="py-2.5 px-3">Quantity Range</th>
                          <th className="py-2.5 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {items.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-3 px-3">
                              <p className="font-medium text-slate-900">{item.product_name}</p>
                              <p className="text-xs text-slate-500">
                                SKU: {item.product_sku || 'N/A'}
                                {item.variant_name && ` · Variant: ${item.variant_name}`}
                              </p>
                            </td>
                            <td className="py-3 px-3 font-semibold text-slate-900">
                              {formatCurrency(item.unit_price)}
                            </td>
                            <td className="py-3 px-3 text-slate-600 text-xs">
                              {item.min_quantity} – {item.max_quantity ? item.max_quantity : 'Open'}
                            </td>
                            <td className="py-3 px-3 text-right whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => openEditItem(item)}
                                className="mr-3 inline-flex items-center text-slate-600 hover:text-slate-900 transition-colors"
                                title="Edit item values"
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => confirmDeleteItem(item)}
                                className="inline-flex items-center text-rose-600 hover:text-rose-700 transition-colors"
                                title="Remove item from price list"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
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

        {/* Price List Create/Edit Modal */}
        {listForm && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
            <form onSubmit={saveList} className="w-full max-w-lg space-y-4 rounded-lg bg-white p-6 shadow-xl">
              <div className="flex justify-between items-center">
                <h2 className="font-semibold text-slate-900">{listForm.id ? 'Edit' : 'Create'} price list</h2>
                <button
                  type="button"
                  onClick={() => { setListForm(null); setListFormError(''); }}
                  disabled={isSavingList || isDeletingList}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {listFormError && (
                <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">
                  {listFormError}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Name</label>
                <input
                  required
                  placeholder="Price list name"
                  value={listForm.name}
                  onChange={(e) => setListForm({ ...listForm, name: e.target.value })}
                  className="w-full rounded border border-slate-300 p-2 text-sm"
                  disabled={isSavingList}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
                <input
                  placeholder="Description (optional)"
                  value={listForm.description || ''}
                  onChange={(e) => setListForm({ ...listForm, description: e.target.value })}
                  className="w-full rounded border border-slate-300 p-2 text-sm"
                  disabled={isSavingList}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Currency</label>
                <select
                  required
                  value={listForm.currency || 'USD'}
                  onChange={(e) => setListForm({ ...listForm, currency: e.target.value })}
                  className="w-full rounded border border-slate-300 p-2 text-sm bg-white text-slate-900"
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
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(listForm.isDefault)}
                  onChange={(e) => setListForm({ ...listForm, isDefault: e.target.checked })}
                  disabled={isSavingList}
                  className="rounded border-slate-300"
                />
                <span>Set as default price list</span>
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
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => { setListForm(null); setListFormError(''); }}
                    disabled={isSavingList || isDeletingList}
                    className="!w-auto px-4"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    isLoading={isSavingList}
                    disabled={isSavingList || isDeletingList}
                    className="!w-auto px-5"
                  >
                    Save price list
                  </Button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Delete Price List Confirmation Modal */}
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
                Are you sure you want to delete this price list? All configured price entries will be removed.
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

        {/* Item Create / Edit Modal */}
        {itemForm && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
            <form onSubmit={saveItem} className="w-full max-w-lg space-y-4 rounded-lg bg-white p-6 shadow-xl">
              <div className="flex justify-between items-center">
                <h2 className="font-semibold text-slate-900">{editingItem ? 'Edit' : 'Add'} Price List Item</h2>
                <button
                  type="button"
                  onClick={cancelEditItem}
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
                <div className="rounded-md bg-slate-50 border border-slate-200 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Product</p>
                  <p className="text-sm font-medium text-slate-900 mt-0.5">{itemForm.productName}</p>
                  <p className="text-xs text-slate-500">
                    SKU: {itemForm.productSku || 'N/A'}
                    {itemForm.variantName && ` · Variant: ${itemForm.variantName}`}
                  </p>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Select Product</label>
                  <select
                    required
                    value={itemForm.productId}
                    onChange={(e) => setItemForm({ ...itemForm, productId: e.target.value })}
                    className="w-full rounded border border-slate-300 p-2 text-sm bg-white"
                    disabled={isSavingItem}
                  >
                    <option value="">Select product</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} ({product.sku || 'No SKU'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Unit Price ($)</label>
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={itemForm.unitPrice}
                  onChange={(e) => setItemForm({ ...itemForm, unitPrice: e.target.value })}
                  className="w-full rounded border border-slate-300 p-2 text-sm"
                  disabled={isSavingItem}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Minimum Quantity</label>
                  <input
                    required
                    type="number"
                    min="1"
                    placeholder="1"
                    value={itemForm.minQuantity}
                    onChange={(e) => setItemForm({ ...itemForm, minQuantity: e.target.value })}
                    className="w-full rounded border border-slate-300 p-2 text-sm"
                    disabled={isSavingItem}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Maximum Quantity</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Open / No upper limit"
                    value={itemForm.maxQuantity || ''}
                    onChange={(e) => setItemForm({ ...itemForm, maxQuantity: e.target.value })}
                    className="w-full rounded border border-slate-300 p-2 text-sm"
                    disabled={isSavingItem}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={cancelEditItem}
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
                  Save item
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Delete Item Confirmation Modal */}
        {itemToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">Remove Item from Price List</h3>
                <button
                  type="button"
                  onClick={() => { setItemToDelete(null); setDeleteItemError(''); }}
                  disabled={isDeletingItem}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="text-sm text-slate-600">
                Are you sure you want to remove <strong className="text-slate-900">{itemToDelete.product_name}</strong> (SKU: {itemToDelete.product_sku || 'N/A'}) from this price list?
              </p>
              <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
                The underlying product in the catalog will remain intact. Historical quotations and invoices will not be affected.
              </div>
              {deleteItemError && (
                <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">
                  {deleteItemError}
                </div>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setItemToDelete(null); setDeleteItemError(''); }}
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
                  Remove item
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
