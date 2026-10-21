import React, { useState, useEffect } from 'react';
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import { ShieldCheck, Menu, X, MessageSquare, User, FileText, LogOut } from 'lucide-react';
import { getCurrentUser } from '../../services/authService';

export const CustomerNavbar = ({ quoteId }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    getCurrentUser()
      .then((res) => {
        if (res?.data) setCurrentUser(res.data);
      })
      .catch(() => {});
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login', { replace: true });
  };

  const isQuotesActive = location.pathname.startsWith('/customer/quotes') || location.pathname === '/customer';

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          <div className="flex items-center gap-3">
            <Link 
              to="/customer/quotes" 
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

          <nav className="hidden md:flex items-center space-x-2" aria-label="Customer Navigation">
            <NavLink
              to="/customer/quotes"
              className={() =>
                `flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
                  isQuotesActive
                    ? 'bg-slate-900 text-white font-medium shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium'
                }`
              }
            >
              <FileText className="h-4 w-4" />
              <span>My Quotations</span>
            </NavLink>

            {currentUser && (
              <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-500 border-l border-slate-200 ml-2">
                <User className="h-3.5 w-3.5 text-slate-400" />
                <span className="font-semibold text-slate-700">{currentUser.companyName || currentUser.email}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-slate-600 hover:text-rose-600 hover:bg-rose-50 font-medium transition-colors cursor-pointer"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign out</span>
            </button>
          </nav>

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

      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-2 pb-3 space-y-1">
          <NavLink
            to="/customer/quotes"
            onClick={() => setIsMobileMenuOpen(false)}
            className={() =>
              `flex items-center gap-2 px-3 py-2 rounded-md text-base transition-colors ${
                isQuotesActive
                  ? 'bg-slate-900 text-white font-medium'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium'
              }`
            }
          >
            <FileText className="h-5 w-5" />
            <span>My Quotations</span>
          </NavLink>

          {currentUser && (
            <div className="px-3 py-2 text-xs font-semibold text-slate-500">
              Signed in as: {currentUser.companyName || currentUser.email}
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              setIsMobileMenuOpen(false);
              handleLogout();
            }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-base text-rose-600 hover:bg-rose-50 font-medium transition-colors text-left"
          >
            <LogOut className="h-5 w-5" />
            <span>Sign out</span>
          </button>
        </div>
      )}
    </header>
  );
};

export default CustomerNavbar;
