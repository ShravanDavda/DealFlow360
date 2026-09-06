import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { DashboardNavbar } from '../components/dashboard/DashboardNavbar';
import { ProductGeneralInfo } from '../components/products/ProductGeneralInfo';
import { ProductVariantsTable } from '../components/products/ProductVariantsTable';
import { ProductPricelistTable } from '../components/products/ProductPricelistTable';
import { getProduct, toProductDetail } from '../services/productService';

export const ProductDetail = () => {
  const { productId } = useParams();
  const [apiProduct, setApiProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setApiProduct(null);
    setIsLoading(true);

    getProduct(productId)
      .then((result) => {
        if (isMounted && result) setApiProduct(toProductDetail(result));
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [productId]);

  const product = apiProduct;

  if (isLoading && !product) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <DashboardNavbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center text-slate-600">
          Loading product details...
        </main>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <DashboardNavbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-16 flex flex-col items-center justify-center text-center">
          <div className="h-14 w-14 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-4 shadow-sm">
            <AlertCircle className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Product not found
          </h1>
          <p className="text-sm text-slate-600 mb-6 max-w-md">
            The requested product could not be found in the current catalog.
          </p>
          <Link
            to="/products"
            className="inline-flex items-center justify-center rounded-md font-medium text-sm transition-colors bg-slate-900 text-white hover:bg-slate-800 h-10 px-5 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
          >
            Back to Products
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <DashboardNavbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        <div>
          <Link
            to="/products"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Products</span>
          </Link>
        </div>

        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Product Details: {product.name}
          </h1>
          <p className="text-sm text-slate-600">
            Opened by clicking a row on the Product Catalog
          </p>
        </div>

        <section aria-label="General Product Specifications">
          <ProductGeneralInfo product={product} />
        </section>

        <section aria-label="Product Variants">
          <ProductVariantsTable variants={product.variants} />
        </section>

        <section aria-label="Pricelists and Tiers">
          <ProductPricelistTable pricelists={product.pricelists} />
        </section>

        <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-800 font-medium leading-relaxed">
            Product details should be filled. Recurring order with this product will be invoiced at the beginning of the period.
          </p>
        </div>

      </main>
    </div>
  );
};

export default ProductDetail;
