import React, { useEffect, useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, Menu, X, LogOut, UserCircle, ChevronDown } from 'lucide-react';
import { getCurrentUser } from '../../services/authService';
import { getPendingRegistrationCount } from '../../services/userRegistrationService';

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

const ADMIN_NAV_ITEMS = [
  { name: 'Dashboard', path: '/admin-dashboard' },
  { name: 'Products', path: '/admin/products' },
  { name: 'Reports', path: '/reports' },
];

const SALES_REP_NAV_ITEMS = [
  { name: 'Dashboard', path: '/sales-rep-dashboard' },
  { name: 'Quotations', path: '/quotations' },
  { name: 'Pipeline', path: '/pipeline' },
];

const SALES_MANAGER_NAV_ITEMS = [
  { name: 'Dashboard', path: '/sales-manager-dashboard' },
  { name: 'Approval Queue', path: '/approvals' },
  { name: 'Quotations', path: '/quotations' },
  { name: 'Deal Health', path: '/deal-health' },
];

const FINANCE_OPERATIONS_NAV_ITEMS = [
  { name: 'Dashboard', path: '/finance-dashboard' },
  { name: 'Approval Queue', path: '/approvals' },
  { name: 'Fulfillment', path: '/fulfillment' },
  { name: 'Billing', path: '/invoices' },
];

const CONFIGURATION_ITEMS = [
  { name: 'User Registrations', path: '/admin/user-registrations' },
  { name: 'Customers', path: '/admin/customers' },
  { name: 'Price Lists', path: '/admin/price-lists' },
  { name: 'Product Recommendations', path: '/admin/product-pairings' },
  { name: 'Discount Tiers', path: '/admin/discount-rules' },
  { name: 'Approval Chains', path: '/admin/approval-chains' },
  { name: 'Warehouses', path: '/admin/warehouses' },
  { name: 'Subscription Plans', path: '/admin/subscription-plans' },
];

export const DashboardNavbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isConfigurationOpen, setIsConfigurationOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [pendingRegistrationCount, setPendingRegistrationCount] = useState(0);
  const navigate = useNavigate();
  const navItems = user?.role === 'admin' ? ADMIN_NAV_ITEMS : user?.role === 'sales_rep' ? SALES_REP_NAV_ITEMS : user?.role === 'sales_manager' ? SALES_MANAGER_NAV_ITEMS : ['finance', 'operations'].includes(user?.role) ? FINANCE_OPERATIONS_NAV_ITEMS : NAV_ITEMS;
  const isFinanceOperations = ['finance', 'operations'].includes(user?.role);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const response = await getCurrentUser();
        const currentUser = response?.data || null;
        setUser(currentUser);
        if (currentUser?.role === 'admin') loadPendingCount();
        else setPendingRegistrationCount(0);
      } catch {
        setUser(null);
        setPendingRegistrationCount(0);
      }
    };

    const loadPendingCount = async () => {
      try {
        setPendingRegistrationCount(await getPendingRegistrationCount());
      } catch {
        setPendingRegistrationCount(0);
      }
    };

    loadUser();
    window.addEventListener('user-registration-count-changed', loadPendingCount);
    return () => window.removeEventListener('user-registration-count-changed', loadPendingCount);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login', { replace: true });
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
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

          <nav className="hidden lg:flex items-center space-x-1" aria-label="Main Navigation">
            {navItems.slice(0, 2).map((item) => (
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
            {user?.role === 'admin' && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsConfigurationOpen((prev) => !prev)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm transition-colors font-medium ${isConfigurationOpen ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}
                  aria-expanded={isConfigurationOpen}
                >
                  <span className="inline-flex items-center gap-1.5">Configuration{pendingRegistrationCount > 0 && <span className="h-2 w-2 rounded-full bg-rose-500" aria-label={`${pendingRegistrationCount} pending user registration requests`} />}</span>
                  <ChevronDown className="h-4 w-4" />
                </button>
                {isConfigurationOpen && (
                  <div className="absolute left-0 top-10 z-40 w-56 rounded-md border border-slate-200 bg-white p-1 shadow-lg">
                    {CONFIGURATION_ITEMS.map((item) => (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={() => setIsConfigurationOpen(false)}
                        className={({ isActive }) => `block rounded-md px-3 py-2 text-sm font-medium ${isActive ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                      >
                        {item.name}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            )}
            {navItems.slice(2).map((item) => (
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

          <div className="hidden lg:flex items-center gap-1 relative">
            <button
              type="button"
              onClick={() => setIsProfileOpen((prev) => !prev)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-slate-900"
              aria-expanded={isProfileOpen}
              aria-label="Open profile"
            >
              <UserCircle className="h-5 w-5" />
              <span>Profile</span>
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm text-red-700 hover:text-red-800 hover:bg-red-50 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-red-300"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>
            {isProfileOpen && (
              <div className="absolute right-0 top-11 w-64 rounded-md border border-slate-200 bg-white p-4 shadow-lg">
                <p className="text-sm font-semibold text-slate-900">
                  {user?.first_name || user?.username || 'Profile'} {user?.last_name || ''}
                </p>
                <p className="mt-1 text-sm text-slate-500">{user?.email || 'Account details unavailable'}</p>
                {user?.role && <p className="mt-3 text-xs font-medium uppercase tracking-wide text-slate-500">{user.role.replace('_', ' ')}</p>}
                {isFinanceOperations && <p className="mt-2 text-xs text-slate-500">Account status: {user?.is_active ? 'Active' : 'Inactive'}</p>}
              </div>
            )}
          </div>

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

      {isMobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 pt-2 pb-3 space-y-1">
          {navItems.slice(0, 2).map((item) => (
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
          {user?.role === 'admin' && (
            <div>
              <button type="button" onClick={() => setIsConfigurationOpen((prev) => !prev)} className="w-full flex items-center justify-between px-3 py-2 rounded-md text-base text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium text-left" aria-expanded={isConfigurationOpen}>
                <span>Configuration</span><ChevronDown className="h-5 w-5" />
              </button>
              {isConfigurationOpen && <div className="ml-3 border-l border-slate-200 pl-2">{CONFIGURATION_ITEMS.map((item) => <NavLink key={item.path} to={item.path} onClick={() => { setIsConfigurationOpen(false); setIsMobileMenuOpen(false); }} className={({ isActive }) => `block rounded-md px-3 py-2 text-sm ${isActive ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50'}`}>{item.name}</NavLink>)}</div>}
            </div>
          )}
          {navItems.slice(2).map((item) => (
            <NavLink key={item.name} to={item.path} onClick={() => setIsMobileMenuOpen(false)} className={({ isActive }) => `block px-3 py-2 rounded-md text-base transition-colors ${isActive ? 'bg-slate-900 text-white font-medium' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium'}`}>{item.name}</NavLink>
          ))}
          <button
            type="button"
            onClick={() => setIsProfileOpen((prev) => !prev)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-base text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium transition-colors text-left focus:outline-none focus:ring-2 focus:ring-slate-900"
            aria-expanded={isProfileOpen}
          >
            <UserCircle className="h-5 w-5" />
            <span>Profile</span>
          </button>
          {isProfileOpen && (
            <div className="mx-3 rounded-md border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">
                {user?.first_name || user?.username || 'Profile'} {user?.last_name || ''}
              </p>
              <p className="mt-1 text-sm text-slate-500">{user?.email || 'Account details unavailable'}</p>
              {user?.role && <p className="mt-3 text-xs font-medium uppercase tracking-wide text-slate-500">{user.role.replace('_', ' ')}</p>}
              {isFinanceOperations && <p className="mt-2 text-xs text-slate-500">Account status: {user?.is_active ? 'Active' : 'Inactive'}</p>}
            </div>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-base text-red-700 hover:text-red-800 hover:bg-red-50 font-medium transition-colors text-left focus:outline-none focus:ring-2 focus:ring-red-300"
          >
            <LogOut className="h-5 w-5" />
            <span>Logout</span>
          </button>
        </div>
      )}
    </header>
  );
};

export default DashboardNavbar;
