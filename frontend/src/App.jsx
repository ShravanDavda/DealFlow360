import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Register } from './pages/Register';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Quotations } from './pages/Quotations';
import { QuotationDetail } from './pages/QuotationDetail';
import { Approvals } from './pages/Approvals';
import { ApprovalDetail } from './pages/ApprovalDetail';
import { Fulfillment } from './pages/Fulfillment';
import { FulfillmentDetail } from './pages/FulfillmentDetail';
import { Subscriptions } from './pages/Subscriptions';
import { BillingDetail } from './pages/BillingDetail';
import { CustomerPortal } from './pages/CustomerPortal';
import { Invoices } from './pages/Invoices';
import { InvoiceDetail } from './pages/InvoiceDetail';
import { DealHealth } from './pages/DealHealth';
import { Reports } from './pages/Reports';
import { Products } from './pages/Products';
import { ProductDetail } from './pages/ProductDetail';
import { DiscountApprovalSettings } from './pages/DiscountApprovalSettings';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminProducts } from './pages/AdminProducts';
import { AdminProductDetail } from './pages/AdminProductDetail';
import { AdminPriceLists } from './pages/AdminPriceLists';
import { AdminApprovalChains } from './pages/AdminApprovalChains';
import { AdminWarehouses } from './pages/AdminWarehouses';
import { AdminSubscriptionPlans } from './pages/AdminSubscriptionPlans';
import { AdminUserRegistrations } from './pages/AdminUserRegistrations';
import { AdminCustomers } from './pages/AdminCustomers';
import { AdminProductPairings } from './pages/AdminProductPairings';
import { SalesRepDashboard } from './pages/SalesRepDashboard';
import { Pipeline } from './pages/Pipeline';
import { SalesManagerDashboard } from './pages/SalesManagerDashboard';
import { FinanceOperationsDashboard } from './pages/FinanceOperationsDashboard';
import { CustomerQuotations } from './pages/CustomerQuotations';
import { CustomerActivation } from './pages/CustomerActivation';
import { getCurrentUser } from './services/authService';

const RoleGuard = ({ allowedRoles, children }) => {
  const [state, setState] = React.useState({ loading: true, role: null });
  React.useEffect(() => {
    getCurrentUser().then((response) => setState({ loading: false, role: response?.data?.role })).catch(() => setState({ loading: false, role: null }));
  }, []);
  if (state.loading) return <div className="min-h-screen bg-slate-50" />;
  if (!state.role) return <Navigate to="/login" replace />;
  if (!allowedRoles.includes(state.role)) {
    if (state.role === 'customer') return <Navigate to="/customer/quotes" replace />;
    return <Navigate to={state.role === 'admin' ? '/admin-dashboard' : state.role === 'sales_rep' ? '/sales-rep-dashboard' : state.role === 'sales_manager' ? '/sales-manager-dashboard' : '/dashboard'} replace />;
  }
  return children;
};

const DashboardLanding = () => {
  const [state, setState] = React.useState({ loading: true, role: null });
  React.useEffect(() => {
    getCurrentUser().then((response) => setState({ loading: false, role: response?.data?.role })).catch(() => setState({ loading: false, role: null }));
  }, []);
  if (state.loading) return <div className="min-h-screen bg-slate-50" />;
  if (state.role === 'customer') return <Navigate to="/customer/quotes" replace />;
  if (state.role === 'admin') return <Navigate to="/admin-dashboard" replace />;
  if (state.role === 'sales_rep') return <Navigate to="/sales-rep-dashboard" replace />;
  if (state.role === 'sales_manager') return <Navigate to="/sales-manager-dashboard" replace />;
  if (['finance', 'operations'].includes(state.role)) return <Navigate to="/finance-dashboard" replace />;
  return <Dashboard />;
};

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/activate" element={<CustomerActivation />} />
        <Route path="/customer/activate" element={<CustomerActivation />} />
        <Route path="/dashboard" element={<DashboardLanding />} />
        <Route path="/admin-dashboard" element={<RoleGuard allowedRoles={['admin']}><AdminDashboard /></RoleGuard>} />
        <Route path="/admin/products" element={<RoleGuard allowedRoles={['admin']}><AdminProducts /></RoleGuard>} />
        <Route path="/admin/products/:productId" element={<RoleGuard allowedRoles={['admin']}><AdminProductDetail /></RoleGuard>} />
        <Route path="/admin/products/:productId/edit" element={<RoleGuard allowedRoles={['admin']}><AdminProductDetail /></RoleGuard>} />
        <Route path="/admin/price-lists" element={<RoleGuard allowedRoles={['admin']}><AdminPriceLists /></RoleGuard>} />
        <Route path="/admin/discount-rules" element={<RoleGuard allowedRoles={['admin']}><DiscountApprovalSettings /></RoleGuard>} />
        <Route path="/admin/approval-chains" element={<RoleGuard allowedRoles={['admin']}><AdminApprovalChains /></RoleGuard>} />
        <Route path="/admin/warehouses" element={<RoleGuard allowedRoles={['admin']}><AdminWarehouses /></RoleGuard>} />
        <Route path="/admin/subscription-plans" element={<RoleGuard allowedRoles={['admin']}><AdminSubscriptionPlans /></RoleGuard>} />
        <Route path="/admin/user-registrations" element={<RoleGuard allowedRoles={['admin']}><AdminUserRegistrations /></RoleGuard>} />
        <Route path="/admin/customers" element={<RoleGuard allowedRoles={['admin']}><AdminCustomers /></RoleGuard>} />
        <Route path="/admin/product-pairings" element={<RoleGuard allowedRoles={['admin']}><AdminProductPairings /></RoleGuard>} />
        <Route path="/admin/recommendations" element={<RoleGuard allowedRoles={['admin']}><AdminProductPairings /></RoleGuard>} />
        <Route path="/sales-rep-dashboard" element={<RoleGuard allowedRoles={['sales_rep']}><SalesRepDashboard /></RoleGuard>} />
        <Route path="/sales-manager-dashboard" element={<RoleGuard allowedRoles={['sales_manager']}><SalesManagerDashboard /></RoleGuard>} />
        <Route path="/finance-dashboard" element={<RoleGuard allowedRoles={['finance', 'operations']}><FinanceOperationsDashboard /></RoleGuard>} />
        <Route path="/pipeline" element={<RoleGuard allowedRoles={['sales_rep']}><Pipeline /></RoleGuard>} />
        <Route path="/quotations" element={<Quotations />} />
        <Route path="/quotations/:quotationId" element={<QuotationDetail />} />
        <Route path="/approvals" element={<Approvals />} />
        <Route path="/approvals/:approvalId" element={<ApprovalDetail />} />
        <Route path="/fulfillment" element={<RoleGuard allowedRoles={['admin', 'finance', 'operations']}><Fulfillment /></RoleGuard>} />
        <Route path="/fulfillment/:orderId" element={<RoleGuard allowedRoles={['admin', 'finance', 'operations']}><FulfillmentDetail /></RoleGuard>} />
        <Route path="/subscriptions" element={<RoleGuard allowedRoles={['admin', 'finance', 'operations']}><Subscriptions /></RoleGuard>} />
        <Route path="/subscriptions/:subscriptionId" element={<RoleGuard allowedRoles={['admin', 'finance', 'operations']}><BillingDetail /></RoleGuard>} />
        <Route path="/customer" element={<Navigate to="/customer/quotes" replace />} />
        <Route path="/customer/quotes" element={<RoleGuard allowedRoles={['customer', 'admin']}><CustomerQuotations /></RoleGuard>} />
        <Route path="/customer/quotes/:quoteId" element={<RoleGuard allowedRoles={['customer', 'admin']}><CustomerPortal /></RoleGuard>} />
        <Route path="/invoices" element={<RoleGuard allowedRoles={['admin', 'finance', 'operations']}><Invoices /></RoleGuard>} />
        <Route path="/invoices/:invoiceId" element={<RoleGuard allowedRoles={['admin', 'finance', 'operations']}><InvoiceDetail /></RoleGuard>} />
        <Route path="/deal-health" element={<RoleGuard allowedRoles={['sales_manager']}><DealHealth /></RoleGuard>} />
        <Route path="/reports" element={<RoleGuard allowedRoles={['admin', 'sales_manager']}><Reports /></RoleGuard>} />
        <Route path="/products" element={<Products />} />
        <Route path="/products/:productId" element={<ProductDetail />} />
        <Route path="/settings/discount-approval" element={<RoleGuard allowedRoles={['admin']}><DiscountApprovalSettings /></RoleGuard>} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
