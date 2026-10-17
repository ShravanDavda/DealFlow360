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
  getPriceListItems,
  getPriceLists,
  updatePriceList,
  updatePriceListItem
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
    if (id) setItems(await getPriceListItems(id));
    else setItems([]);
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

  const saveItem = async (event) => {
    event.preventDefault();
    try {
      const payload = {
        priceListId: selectedId,
        productId: Number(itemForm.productId),
        productVariantId: itemForm.productVariantId ? Number(itemForm.productVariantId) : null,
        unitPrice: Number(itemForm.unitPrice),
        minQuantity: Number(itemForm.minQuantity || 1),
        maxQuantity: itemForm.maxQuantity ? Number(itemForm.maxQuantity) : null
      };
      if (editingItem) await updatePriceListItem(itemForm.id, payload);
      else await createPriceListItem(payload);
      setFeedback('Price entry saved.');
      setItemForm(EMPTY_ITEM);
      setEditingItem(false);
      await loadItems(selectedId);
    } catch (error) {
      setFeedback(error.message);
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
                  <h3 className="font-medium text-slate-900">Price list items</h3>
                  <Button
                    type="button"
                    onClick={() => { setItemForm(EMPTY_ITEM); setEditingItem(false); }}
                    className="!w-auto px-3 gap-1"
                  >
                    <Plus className="h-4 w-4" />
                    Add item
                  </Button>
                </div>
                <div className="mt-3 overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead>
                      <tr className="border-b text-slate-500">
                        <th className="py-2">Product</th>
                        <th>Price</th>
                        <th>Quantity</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => (
                        <tr key={item.id} className="border-b">
                          <td className="py-3">{item.product_name}</td>
                          <td>{item.unit_price}</td>
                          <td>{item.min_quantity}-{item.max_quantity || 'open'}</td>
                          <td>
                            <button
                              type="button"
                              onClick={() => { setItemForm(item); setEditingItem(true); }}
                              className="mr-2 text-slate-600"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={async () => { await deactivatePriceListItem(item.id); loadItems(selectedId); }}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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
          <div className="fixed inset-0 z-40 bg-slate-900/40 p-4">
            <form onSubmit={saveItem} className="mx-auto mt-10 max-w-lg space-y-4 rounded-lg bg-white p-6">
              <div className="flex justify-between">
                <h2 className="font-semibold">{editingItem ? 'Edit' : 'Add'} price entry</h2>
                <button type="button" onClick={() => setItemForm(null)}>
                  <X className="h-5 w-5" />
                </button>
              </div>
              <select
                required
                value={itemForm.productId}
                onChange={(e) => setItemForm({ ...itemForm, productId: e.target.value })}
                className="w-full rounded border p-2"
              >
                <option value="">Select product</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>{product.name}</option>
                ))}
              </select>
              <input
                required
                type="number"
                min="0"
                step="0.01"
                placeholder="Unit price"
                value={itemForm.unitPrice}
                onChange={(e) => setItemForm({ ...itemForm, unitPrice: e.target.value })}
                className="w-full rounded border p-2"
              />
              <input
                required
                type="number"
                min="1"
                placeholder="Minimum quantity"
                value={itemForm.minQuantity}
                onChange={(e) => setItemForm({ ...itemForm, minQuantity: e.target.value })}
                className="w-full rounded border p-2"
              />
              <input
                type="number"
                min="1"
                placeholder="Maximum quantity"
                value={itemForm.maxQuantity || ''}
                onChange={(e) => setItemForm({ ...itemForm, maxQuantity: e.target.value })}
                className="w-full rounded border p-2"
              />
              <Button type="submit">Save price entry</Button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminPriceLists;
