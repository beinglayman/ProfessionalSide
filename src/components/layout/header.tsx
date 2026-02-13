import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { UserNav } from './user-nav';
import { cn } from '../../lib/utils';
import { User, Search, GitCommitVertical, BookOpen } from 'lucide-react';
import type { NetworkType } from '../../App';
import { NotificationsDropdown } from '../notifications/notifications-dropdown';
import { SearchModal } from '../search/search-modal';
import { useAuth } from '../../contexts/AuthContext';
import { CreditBadge } from '../billing/CreditBadge';

interface HeaderProps {
  networkType: NetworkType;
  onNetworkTypeChange: (type: NetworkType) => void;
}


export function Header({ networkType, onNetworkTypeChange }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  // Global keyboard shortcut listener
  React.useEffect(() => {
    const handleOpenSearch = () => {
      setIsSearchOpen(true);
    };

    window.addEventListener('openSearch', handleOpenSearch);
    return () => window.removeEventListener('openSearch', handleOpenSearch);
  }, []);

  // Helper function to check if a link is active
  const isActiveLink = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };
  return (
    <header className="sticky top-0 z-50 border-b border-gray-200/80 bg-white/80 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Left section: Logo + Navigation */}
          <div className="flex items-center flex-1">
            {/* Logo */}
            <Link to="/" className="flex-shrink-0 flex items-center gap-0">
              {/* Full logo for desktop — compact purple box + CHRONICLE */}
              <div className="hidden md:flex items-end group/logo">
                <div
                  className="flex items-end justify-end bg-[#5D259F] rounded-[2px] select-none transition-colors duration-150 group-hover/logo:bg-[#4A1D80]"
                  style={{ width: '33px', height: '21px', padding: '0 2px 2px 0' }}
                >
                  <span className="text-white font-bold leading-none" style={{ fontSize: '10.5px', letterSpacing: '0.02em' }}>
                    IN
                  </span>
                </div>
                <span
                  className="leading-none select-none"
                  style={{ fontSize: '20px', fontWeight: 600, letterSpacing: '0.01em', color: '#333', marginLeft: '2px' }}
                >
                  CHRONICLE
                </span>
              </div>

              {/* Mobile — just the purple box */}
              <div
                className="md:hidden flex items-end justify-end bg-[#5D259F] rounded-[2px] select-none"
                style={{ width: '33px', height: '21px', padding: '0 2px 2px 0' }}
              >
                <span className="text-white font-bold leading-none" style={{ fontSize: '10.5px', letterSpacing: '0.02em' }}>
                  IN
                </span>
              </div>
            </Link>

            {/* Desktop Navigation - Only show when authenticated */}
            {isAuthenticated && (
              <nav className="ml-8 hidden lg:flex items-center space-x-1 border-l border-gray-200/60 pl-8">
                {/* Timeline */}
                <Link
                  to="/timeline"
                  className={cn(
                    "relative flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 group",
                    isActiveLink('/timeline')
                      ? "text-primary-600"
                      : "text-gray-700 hover:text-primary-600 hover:bg-primary-50"
                  )}
                >
                  <GitCommitVertical className="h-3.5 w-3.5" />
                  <span>Timeline</span>
                  <div className={cn(
                    "absolute inset-x-0 bottom-0 h-0.5 bg-primary-600 transition-transform duration-200",
                    isActiveLink('/timeline')
                      ? "scale-x-100"
                      : "scale-x-0 group-hover:scale-x-100"
                  )}></div>
                </Link>

                {/* Stories */}
                <Link
                  to="/stories"
                  className={cn(
                    "relative flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 group",
                    isActiveLink('/stories')
                      ? "text-primary-600"
                      : "text-gray-700 hover:text-primary-600 hover:bg-primary-50"
                  )}
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  <span>Stories</span>
                  <div className={cn(
                    "absolute inset-x-0 bottom-0 h-0.5 bg-primary-600 transition-transform duration-200",
                    isActiveLink('/stories')
                      ? "scale-x-100"
                      : "scale-x-0 group-hover:scale-x-100"
                  )}></div>
                </Link>

                {/* Profile */}
                <Link
                  to="/me"
                  className={cn(
                    "relative flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 group",
                    isActiveLink('/me')
                      ? "text-primary-600"
                      : "text-gray-700 hover:text-primary-600 hover:bg-primary-50"
                  )}
                >
                  <User className="h-3.5 w-3.5" />
                  <span>Profile</span>
                  <div className={cn(
                    "absolute inset-x-0 bottom-0 h-0.5 bg-primary-600 transition-transform duration-200",
                    isActiveLink('/me')
                      ? "scale-x-100"
                      : "scale-x-0 group-hover:scale-x-100"
                  )}></div>
                </Link>
              </nav>
            )}
          </div>

          {/* Right section: Actions + User */}
          <div className="flex items-center space-x-2">
            {/* Mobile Menu Button - Only show when authenticated */}
            {isAuthenticated && (
              <button
                className="lg:hidden p-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                aria-label={isMenuOpen ? "Close menu" : "Open menu"}
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                <div className="relative w-5 h-5">
                  <span className={cn(
                    "absolute block w-5 h-0.5 bg-current transition-all duration-300",
                    isMenuOpen ? "top-2 rotate-45" : "top-1"
                  )} />
                  <span className={cn(
                    "absolute block w-5 h-0.5 bg-current transition-all duration-300 top-2",
                    isMenuOpen ? "opacity-0" : "opacity-100"
                  )} />
                  <span className={cn(
                    "absolute block w-5 h-0.5 bg-current transition-all duration-300",
                    isMenuOpen ? "top-2 -rotate-45" : "top-3"
                  )} />
                </div>
              </button>
            )}

            {/* Search - Only show when authenticated */}
            {isAuthenticated && (
              <button
                onClick={() => setIsSearchOpen(true)}
                className="p-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                aria-label="Search"
                title="Search (⌘K)"
              >
                <Search className="h-5 w-5" />
              </button>
            )}

            {/* Credit Balance - Only show when authenticated */}
            {isAuthenticated && <CreditBadge />}

            {/* Notifications - Only show when authenticated */}
            {isAuthenticated && <NotificationsDropdown />}

            {/* User Nav - Only show when authenticated */}
            {isAuthenticated && <UserNav />}
            
            {/* Auth buttons - Only show when not authenticated */}
            {!isAuthenticated && (
              <div className="flex items-center space-x-1">
                <Link
                  to="/login"
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150",
                    isActiveLink('/login')
                      ? "bg-primary-50 text-primary-700"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  )}
                >
                  Sign in
                </Link>
                <Link
                  to="/register"
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150",
                    isActiveLink('/register')
                      ? "bg-primary-600 text-white shadow-sm"
                      : "bg-gray-900 text-white hover:bg-gray-800"
                  )}
                >
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Enhanced Mobile Menu - Only show when authenticated */}
        {isAuthenticated && isMenuOpen && (
          <div className="lg:hidden border-t border-gray-100">
            <nav className="px-4 py-4 space-y-1">
              {/* Timeline */}
              <Link
                to="/timeline"
                className={cn(
                  "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200",
                  isActiveLink('/timeline')
                    ? "text-primary-600"
                    : "text-gray-700 hover:text-primary-600 hover:bg-primary-50"
                )}
                onClick={() => setIsMenuOpen(false)}
              >
                <GitCommitVertical className="h-4 w-4 mr-3" />
                Timeline
              </Link>

              {/* Stories */}
              <Link
                to="/stories"
                className={cn(
                  "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200",
                  isActiveLink('/stories')
                    ? "text-primary-600"
                    : "text-gray-700 hover:text-primary-600 hover:bg-primary-50"
                )}
                onClick={() => setIsMenuOpen(false)}
              >
                <BookOpen className="h-4 w-4 mr-3" />
                Stories
              </Link>

              {/* Profile */}
              <Link
                to="/me"
                className={cn(
                  "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200",
                  isActiveLink('/me')
                    ? "text-primary-600"
                    : "text-gray-700 hover:text-primary-600 hover:bg-primary-50"
                )}
                onClick={() => setIsMenuOpen(false)}
              >
                <User className="h-4 w-4 mr-3" />
                Profile
              </Link>
            </nav>
          </div>
        )}

        {/* Search Modal */}
        <SearchModal 
          isOpen={isSearchOpen} 
          onClose={() => setIsSearchOpen(false)} 
        />
      </div>
    </header>
  );
}