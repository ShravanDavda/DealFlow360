import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { DashboardNavbar } from '../components/dashboard/DashboardNavbar';
import { ProductGeneralInfo } from '../components/products/ProductGeneralInfo';
import { ProductVariantsTable } from '../components/products/ProductVariantsTable';
import { ProductPricelistTable } from '../components/products/ProductPricelistTable';

// ============================================================================
// FRONTEND MOCK DATA & FUTURE BACKEND API CONTRACT
// ============================================================================
// API 1: GET /api/products/:productId
//   Returns { product: { id, name, category, price, unit, taxPercent, description, isSubscription, recurringCycle, quantityOnHand, variants, pricelists } }
// API 2: POST /api/products
// API 3: PATCH /api/products/:productId
// API 4: PATCH /api/products/:productId/variants
// API 5: PATCH /api/products/:productId/pricelists
// ============================================================================
const MOCK_PRODUCT_DETAILS = {
  'PROD-001': {
    id: 'PROD-001',
    name: 'Laptop Pro 14',
    category: 'Hardware',
    price: 1200,
    priceFormatted: '$1,200',
    unit: 'Each',
    tax: '15%',
    taxPercent: 15,
    description: 'Professional 14-inch business laptop',
    isSubscription: false,
    recurring: '-',
    recurringCycle: null,
    quantityOnHand: 40,
    variants: [
      {
        attribute: 'Color',
        values: ['Blue', 'Black'],
        extraPrice: 0,
      },
      {
        attribute: 'RAM',
        values: ['4GB', '8GB'],
        extraPrice: 30,
      },
      {
        attribute: 'Manufacturer',
        values: ['Dell', 'HP'],
        extraPrice: '+$10 / +$30',
      },
    ],
    pricelists: [
      {
        tier: 'Bronze',
        currency: ['USD'],
        priceRule: 'Price, no adjustment',
      },
      {
        tier: 'Gold',
        currency: ['USD', 'EUR'],
        priceRule: 'Price minus 10 percent base',
      },
    ],
  },
  'PROD-002': {
    id: 'PROD-002',
    name: 'Onsite Setup Service',
    category: 'Services',
    price: 450,
    priceFormatted: '$450',
    unit: 'Each',
    tax: '10%',
    taxPercent: 10,
    description: 'Comprehensive on-premises enterprise setup and hardware configuration.',
    isSubscription: false,
    recurring: '-',
    recurringCycle: null,
    quantityOnHand: 0,
    variants: [],
    pricelists: [
      {
        tier: 'Bronze',
        currency: ['USD'],
        priceRule: 'Price, no adjustment',
      },
      {
        tier: 'Standard',
        currency: ['USD'],
        priceRule: 'Standard service catalog rate',
      },
    ],
  },
  'PROD-003': {
    id: 'PROD-003',
    name: 'Docking Station',
    category: 'Hardware',
    price: 180,
    priceFormatted: '$180',
    unit: 'Each',
    tax: '15%',
    taxPercent: 15,
    description: 'Universal multi-display USB-C docking station with power delivery.',
    isSubscription: false,
    recurring: '-',
    recurringCycle: null,
    quantityOnHand: 65,
    variants: [
      {
        attribute: 'Color',
        values: ['Black', 'Silver', 'Gray'],
        extraPrice: 0,
      },
    ],
    pricelists: [
      {
        tier: 'Bronze',
        currency: ['USD'],
        priceRule: 'Price, no adjustment',
      },
      {
        tier: 'Gold',
        currency: ['USD', 'EUR'],
        priceRule: 'Price minus 5 percent',
      },
    ],
  },
  'PROD-004': {
    id: 'PROD-004',
    name: 'Care Plan 3 years',
    category: 'Subscription',
    price: 40,
    priceFormatted: '$40/month',
    unit: 'Recurring',
    tax: '0%',
    taxPercent: 0,
    description: 'Enterprise 3-year extended warranty, priority hardware swap, and remote support.',
    isSubscription: true,
    recurring: 'Monthly',
    recurringCycle: 'Monthly',
    quantityOnHand: '-',
    variants: [],
    pricelists: [
      {
        tier: 'Bronze',
        currency: ['USD'],
        priceRule: 'Price, no adjustment',
      },
      {
        tier: 'Enterprise',
        currency: ['USD', 'EUR'],
        priceRule: '15 percent discount on annual commitment',
      },
    ],
  },
};

export const ProductDetail = () => {
  const { productId } = useParams();

  const product = MOCK_PRODUCT_DETAILS[productId];

  // 404 / Not Found State
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
      {/* 1. Top Navigation */}
      <DashboardNavbar />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
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

        {/* 2. Page Header */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Product Details: {product.name}
          </h1>
          <p className="text-sm text-slate-600">
            Opened by clicking a row on the Product Catalog
          </p>
        </div>

        {/* 3. Section 1 — Product and pricelist (General Info) */}
        <section aria-label="General Product Specifications">
          <ProductGeneralInfo product={product} />
        </section>

        {/* 4. Section 2 — Product Variants */}
        <section aria-label="Product Variants">
          <ProductVariantsTable variants={product.variants} />
        </section>

        {/* 5. Section 3 — Pricelists */}
        <section aria-label="Pricelists and Tiers">
          <ProductPricelistTable pricelists={product.pricelists} />
        </section>

        {/* 6. Informational Warning / Guidance Notice */}
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
