import React, { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { ShieldCheck, Menu, X } from 'lucide-react';

const NAV_ITEMS = [
  { name: 'Dashboard', path: '/dashboard' },
  { name: 'Quotations', path: '/quotations' },
  { name: 'Approvals', path: '/approvals' },
  { name: 'Fulfillment', path: '/fulfillment' },
  { name: 'Subscriptions', path: '/subscriptions' },
  { name: 'Invoices', path: '/invoices' },
  { name: 'Deal Health', path: '/deal-health' },
  { name: 'Reports', path: '/reports' },
  { name: 'Product', path: '/products' },
];

export const DashboardNavbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="flex items-center gap-2.5 focus:outline-none focus:ring-2 focus:ring-slate-900 rounded-md p-1">
              <div className="h-9 w-9 rounded-lg bg-slate-900 flex items-center justify-center text-white shadow-sm">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <span className="text-lg font-bold tracking-tight text-slate-900">
                DealFlow360
              </span>
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center space-x-1" aria-label="Main Navigation">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.name}
                to={item.path}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-md text-sm transition-colors ${
                    isActive
                      ? 'bg-slate-900 text-white font-medium shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium'
                  }`
                }
              >
                {item.name}
              </NavLink>
            ))}
          </nav>

          {/* Mobile Menu Button */}
          <div className="lg:hidden flex items-center">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              className="p-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900"
              aria-expanded={isMobileMenuOpen}
              aria-label="Toggle navigation menu"
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

      {/* Mobile Navigation Dropdown */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 pt-2 pb-3 space-y-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-md text-base transition-colors ${
                  isActive
                    ? 'bg-slate-900 text-white font-medium'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium'
                }`
              }
            >
              {item.name}
            </NavLink>
          ))}
        </div>
      )}
    </header>
  );
};

export default DashboardNavbar;
