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

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/quotations" element={<Quotations />} />
        <Route path="/quotations/:quotationId" element={<QuotationDetail />} />
        <Route path="/approvals" element={<Approvals />} />
        <Route path="/approvals/:approvalId" element={<ApprovalDetail />} />
        <Route path="/fulfillment" element={<Fulfillment />} />
        <Route path="/fulfillment/:orderId" element={<FulfillmentDetail />} />
        <Route path="/subscriptions" element={<Subscriptions />} />
        <Route path="/subscriptions/:subscriptionId" element={<BillingDetail />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
