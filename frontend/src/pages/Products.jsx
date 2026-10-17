import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, SlidersHorizontal, AlertCircle, CheckCircle2, PackageCheck } from 'lucide-react';
import { DashboardNavbar } from '../components/dashboard/DashboardNavbar';
import { ProductSummary } from '../components/products/ProductSummary';
import { ProductTable } from '../components/products/ProductTable';
import { Button } from '../components/ui/Button';
import { getProducts, toProductRow } from '../services/productService';

const INITIAL_SUMMARY = {
  totalProducts: 0,
  archivedProducts: 0,
  priceLists: 0,
  currencies: 0,
  variants: 0,
};

export const Products = () => {
  const navigate = useNavigate();
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [products, setProducts] = useState([]);
  const [summary, setSummary] = useState(INITIAL_SUMMARY);

  useEffect(() => {
    let isMounted = true;

    getProducts()
      .then((items) => {
        if (!isMounted) return;

        const mappedProducts = (items || []).map(toProductRow);
        const activeProducts = mappedProducts.filter((product) => product.is_active !== false);
        setProducts(mappedProducts);
        setSummary({
          totalProducts: activeProducts.length,
          archivedProducts: mappedProducts.length - activeProducts.length,
          priceLists: 2,
          currencies: 2,
          variants: mappedProducts.filter((p) => p.variants && p.variants !== '-').length,
        });
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  const handleProductClick = (productId) => {
    navigate(`/products/${productId}`);
  };

  const handleNewProduct = () => {
    setFeedbackMessage('New product creation selected.');
    setTimeout(() => setFeedbackMessage(''), 4500);
  };

  const handleManagePriceFields = () => {
    setFeedbackMessage('Price field management selected.');
    setTimeout(() => setFeedbackMessage(''), 4500);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <DashboardNavbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        <div className="space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-md bg-slate-900 text-white shadow-sm">
              <PackageCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Product Catalog
              </h1>
              <p className="mt-0.5 text-sm text-slate-600">
                Every product, variant and price list in one place.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Button
              type="button"
              variant="primary"
              onClick={handleNewProduct}
              className="sm:!w-auto px-4 gap-1.5 bg-slate-900 hover:bg-slate-800 text-white shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>+ New Product</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={handleManagePriceFields}
              className="sm:!w-auto px-4 gap-2 border-slate-300 text-slate-700 hover:bg-slate-100"
            >
              <SlidersHorizontal className="h-4 w-4 text-slate-600" />
              <span>Manage Price fields</span>
            </Button>
          </div>
        </div>

        {feedbackMessage && (
          <div 
            className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-3 shadow-sm transition-all animate-in fade-in"
            role="status"
            aria-live="polite"
          >
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span className="text-sm font-semibold text-emerald-900">
              {feedbackMessage}
            </span>
          </div>
        )}

        <section aria-label="Product Summary Metrics">
          <ProductSummary summary={summary} />
        </section>

        <section aria-label="Product Catalog List" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">
              Products
            </h2>
            <span className="text-xs text-slate-500 font-medium">
              Showing {products.length} catalog items
            </span>
          </div>

          <ProductTable
            products={products}
            onRowClick={handleProductClick}
          />

          <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-800 font-medium">
              Click a product row to open general info, variants and tier/currency price lists.
            </p>
          </div>
        </section>

      </main>
    </div>
  );
};

export default Products;
