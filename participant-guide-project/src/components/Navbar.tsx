import React, { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useVidaCare } from '../context/VidaCareContext';
import { BrandMark, VidaButton } from './ui/DesignPrimitives';

const NAV_LINKS = [
  { label: 'Home', to: '/' },
  { label: 'Campaigns', to: '/campaigns' },
  { label: 'How It Works', to: '/#how-it-works', isHash: true },
  { label: 'About', to: '/about' },
  { label: 'FAQ', to: '/faq' },
  { label: 'Contact', to: '/contact' },
];

export const Navbar: React.FC = () => {
  const { user, getDashboardPathForRole } = useVidaCare();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const dashboardTarget = user ? getDashboardPathForRole(user.role) : '/login';

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname, location.hash]);

  return (
    <header className="sticky top-0 z-40 border-b border-[#123C35]/10 bg-[#F8FAF7]/95 backdrop-blur-md">
      <div className="mx-auto flex h-[72px] max-w-[1200px] items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
        {/* Zone 1: VidaCare Brand Logo */}
        <Link
          to="/"
          className="inline-flex items-center gap-2.5 rounded-xl font-display text-xl font-bold tracking-tight text-[#123C35] whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#159B79]"
        >
          <BrandMark className="h-7 w-7 shrink-0" />
          <span>VidaCare</span>
        </Link>

        {/* Zone 2: Navigation Links */}
        <nav
          aria-label="Primary navigation"
          className="hidden items-center gap-6 lg:flex"
        >
          {NAV_LINKS.map((item) => {
            if (item.isHash) {
              const isHashActive =
                location.pathname === '/' && location.hash === '#how-it-works';
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`relative rounded py-1 text-sm whitespace-nowrap shrink-0 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#159B79] ${
                    isHashActive
                      ? 'font-semibold text-[#123C35]'
                      : 'font-medium text-[#414846] hover:text-[#123C35]'
                  }`}
                >
                  <span>{item.label}</span>
                  <span
                    aria-hidden="true"
                    className={`absolute inset-x-0 -bottom-0.5 h-0.5 rounded-full bg-[#159B79] transition-opacity duration-150 ${
                      isHashActive ? 'opacity-100' : 'opacity-0'
                    }`}
                  />
                </Link>
              );
            }

            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) => {
                  const active =
                    item.to === '/'
                      ? isActive && location.hash !== '#how-it-works'
                      : isActive;
                  return `relative rounded py-1 text-sm whitespace-nowrap shrink-0 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#159B79] ${
                    active ? 'font-semibold text-[#123C35]' : 'font-medium text-[#414846] hover:text-[#123C35]'
                  }`;
                }}
              >
                {({ isActive }) => {
                  const active =
                    item.to === '/'
                      ? isActive && location.hash !== '#how-it-works'
                      : isActive;
                  return (
                    <>
                      <span>{item.label}</span>
                      <span
                        aria-hidden="true"
                        className={`absolute inset-x-0 -bottom-0.5 h-0.5 rounded-full bg-[#159B79] transition-opacity duration-150 ${
                          active ? 'opacity-100' : 'opacity-0'
                        }`}
                      />
                    </>
                  );
                }}
              </NavLink>
            );
          })}

          <NavLink
            to={user ? dashboardTarget : '/login'}
            className={({ isActive }) => {
              const isDashActive =
                isActive || (user && location.pathname.startsWith('/dashboard'));
              return `relative rounded py-1 text-sm whitespace-nowrap shrink-0 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#159B79] ${
                isDashActive ? 'font-semibold text-[#123C35]' : 'font-medium text-[#414846] hover:text-[#123C35]'
              }`;
            }}
          >
            {({ isActive }) => {
              const isDashActive =
                isActive || (user && location.pathname.startsWith('/dashboard'));
              return (
                <>
                  <span>
                    {user
                      ? user.role === 'Admin'
                        ? 'Admin'
                        : 'Dashboard'
                      : 'Login'}
                  </span>
                  <span
                    aria-hidden="true"
                    className={`absolute inset-x-0 -bottom-0.5 h-0.5 rounded-full bg-[#159B79] transition-opacity duration-150 ${
                      isDashActive ? 'opacity-100' : 'opacity-0'
                    }`}
                  />
                </>
              );
            }}
          </NavLink>
        </nav>

        {/* Zone 3: Single Primary Action + Mobile Menu Trigger */}
        <div className="flex shrink-0 items-center gap-3">
          <div className="hidden lg:block">
            <VidaButton
              to={user ? dashboardTarget : '/start-fundraiser'}
              variant="primary"
              className="min-h-[40px] px-4 py-2 text-xs font-semibold"
            >
              {user
                ? user.role === 'Admin'
                  ? 'Clinical Console'
                  : 'My Portal'
                : 'Start a Fundraiser'}
            </VidaButton>
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav-drawer"
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#123C35]/20 bg-white text-[#123C35] transition-colors hover:bg-[#DDF3E9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#159B79] lg:hidden"
          >
            {mobileOpen ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile & Tablet Drawer */}
      {mobileOpen && (
        <div
          id="mobile-nav-drawer"
          className="border-t border-[#123C35]/10 bg-white px-4 py-5 shadow-lg lg:hidden"
        >
          <nav aria-label="Mobile navigation" className="flex flex-col gap-1.5">
            {NAV_LINKS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="flex min-h-[44px] items-center rounded-xl px-3 text-sm font-medium text-[#131E1C] transition-colors hover:bg-[#DDF3E9] hover:text-[#123C35]"
              >
                {item.label}
              </Link>
            ))}
            <Link
              to={user ? dashboardTarget : '/login'}
              className="flex min-h-[44px] items-center rounded-xl px-3 text-sm font-medium text-[#131E1C] transition-colors hover:bg-[#DDF3E9] hover:text-[#123C35]"
            >
              {user
                ? user.role === 'Admin'
                  ? 'Admin Portal'
                  : 'Dashboard'
                : 'Login'}
            </Link>
          </nav>

          <div className="mt-4 flex flex-col gap-2 border-t border-[#123C35]/10 pt-4">
            <VidaButton
              to={user ? dashboardTarget : '/start-fundraiser'}
              variant="primary"
              className="w-full"
            >
              {user
                ? user.role === 'Admin'
                  ? 'Go to Clinical Console'
                  : 'Go to My Portal'
                : 'Start a Fundraiser'}
            </VidaButton>
          </div>
        </div>
      )}
    </header>
  );
};
