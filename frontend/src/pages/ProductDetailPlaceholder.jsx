import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Package, Clock } from 'lucide-react';
import { DashboardNavbar } from '../components/dashboard/DashboardNavbar';

/**
 * ProductDetailPlaceholder - Controlled placeholder for /products/:productId
 * to prevent broken routes when clicking product rows before Page 17 is built.
 */
export const ProductDetailPlaceholder = () => {
  const { productId } = useParams();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* 1. Top Navigation */}
      <DashboardNavbar />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Navigation Breadcrumb / Back Link */}
        <div>
          <Link
            to="/products"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Products</span>
          </Link>
        </div>

        {/* Placeholder Card */}
        <div className="bg-white border border-slate-200 rounded-lg p-10 shadow-sm flex flex-col items-center justify-center text-center max-w-2xl mx-auto space-y-4">
          <div className="h-14 w-14 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shadow-sm">
            <Package className="h-7 w-7" />
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Product Detail: {productId}
            </h1>
            <p className="text-sm text-slate-600">
              Product detail will be implemented next.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold">
            <Clock className="h-3.5 w-3.5 text-amber-600" />
            <span>Screen 17 Placeholder</span>
          </div>

          <div className="pt-2">
            <Link
              to="/products"
              className="inline-flex items-center justify-center rounded-md font-medium text-sm transition-colors bg-slate-900 text-white hover:bg-slate-800 h-10 px-5 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              ← Back to Products
            </Link>
          </div>
        </div>

      </main>
    </div>
  );
};

export default ProductDetailPlaceholder;
