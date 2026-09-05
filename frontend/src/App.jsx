import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Register } from './pages/Register';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Quotations } from './pages/Quotations';
import { QuotationDetail } from './pages/QuotationDetail';

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
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
