import React, { useState } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { ShieldCheck, Menu, X, MessageSquare, User, FileText } from 'lucide-react';

/**
 * CustomerNavbar - Dedicated customer-facing navigation bar.
 * Strict customer privacy rule: Excludes all internal employee navigation
 * (Dashboard, Approvals, Fulfillment, Invoices, Deal Health, Reports, etc.).
 * Exposes only: My Quotation, Messages, and Profile.
 */
export const CustomerNavbar = ({ quoteId = 'Q-1042' }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  const isQuoteActive = location.pathname.startsWith('/customer/quotes') || location.pathname.startsWith('/customer');

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Customer Portal Brand & Logo */}
          <div className="flex items-center gap-3">
            <Link 
              to={`/customer/quotes/${quoteId}`} 
              className="flex items-center gap-2.5 focus:outline-none focus:ring-2 focus:ring-slate-900 rounded-md p-1"
              aria-label="DealFlow360 Customer Portal Home"
            >
              <div className="h-9 w-9 rounded-lg bg-slate-900 flex items-center justify-center text-white shadow-sm">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold tracking-tight text-slate-900 leading-none">
                  DealFlow360
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 mt-0.5">
                  Customer Portal
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1" aria-label="Customer Navigation">
            <NavLink
              to={`/customer/quotes/${quoteId}`}
              className={() =>
                `flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
                  isQuoteActive
                    ? 'bg-slate-900 text-white font-medium shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium'
                }`
              }
            >
              <FileText className="h-4 w-4" />
              <span>My Quotation</span>
            </NavLink>

            <button
              type="button"
              className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium transition-colors cursor-pointer"
              title="Customer messages (future)"
            >
              <MessageSquare className="h-4 w-4" />
              <span>Messages</span>
            </button>

            <button
              type="button"
              className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium transition-colors cursor-pointer"
              title="Customer profile (future)"
            >
              <User className="h-4 w-4" />
              <span>Profile</span>
            </button>
          </nav>

          {/* Mobile Menu Toggle Button */}
          <div className="md:hidden flex items-center">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              className="p-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900"
              aria-expanded={isMobileMenuOpen}
              aria-label="Toggle customer portal menu"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-2 pb-3 space-y-1">
          <NavLink
            to={`/customer/quotes/${quoteId}`}
            onClick={() => setIsMobileMenuOpen(false)}
            className={() =>
              `flex items-center gap-2 px-3 py-2 rounded-md text-base transition-colors ${
                isQuoteActive
                  ? 'bg-slate-900 text-white font-medium'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium'
              }`
            }
          >
            <FileText className="h-5 w-5" />
            <span>My Quotation</span>
          </NavLink>

          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(false)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-base text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium transition-colors text-left"
          >
            <MessageSquare className="h-5 w-5" />
            <span>Messages</span>
          </button>

          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(false)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-base text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium transition-colors text-left"
          >
            <User className="h-5 w-5" />
            <span>Profile</span>
          </button>
        </div>
      )}
    </header>
  );
};

export default CustomerNavbar;
