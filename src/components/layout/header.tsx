import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { UserNav } from './user-nav';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import { ChevronDown, User, Users, Globe, Search, Activity, FileText } from 'lucide-react';
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
  const [isPresenceExpanded, setIsPresenceExpanded] = useState(false);
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
    if (path === '/teams') {
      return location.pathname.startsWith('/teams');
    }
    return location.pathname === path;
  };

  // Check if any Presence child route is active
  const isPresenceActive = () => {
    return (
      location.pathname.startsWith('/me') ||
      location.pathname.startsWith('/teams') ||
      location.pathname.startsWith('/network')
    );
  };
  return (
    <header className="sticky top-0 z-50 border-b border-gray-200/80 bg-white/80 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Left section: Logo + Navigation */}
          <div className="flex items-end flex-1">
            {/* Logo */}
            <Link to="/" className="flex-shrink-0 mb-1">
              {/* Full logo for desktop */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 1150 100"
                className="hidden md:block"
                style={{ height: "16px", width: "auto" }}
              >
                <rect x="0" y="0" width="180" height="100" fill="#5D259F" />
                <text x="175" y="90" fontFamily="Arial, sans-serif" fontSize="60" fontWeight="bold" fill="white" textAnchor="end">IN</text>
                <text x="185" y="90" fontFamily="Arial, sans-serif" fontSize="120" fill="#333333">CHRONICLE</text>
              </svg>

              {/* Only the "IN" box for mobile */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 120 120"
                className="block md:hidden"
                style={{ height: "16px", width: "auto" }}
              >
                <rect x="0" y="0" width="120" height="120" fill="#5D259F" />
                <text x="115" y="115" fontFamily="Arial, sans-serif" fontSize="60" fontWeight="bold" fill="white" textAnchor="end">IN</text>
              </svg>
            </Link>

            {/* Desktop Navigation - Only show when authenticated */}
            {isAuthenticated && (
              <nav className="ml-8 hidden lg:flex items-center space-x-1">
                {/* Timeline */}
                <Link
                  to="/timeline"
                  className={cn(
                    "relative px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 group",
                    isActiveLink('/timeline')
                      ? "text-primary-600"
                      : "text-gray-700 hover:text-primary-600 hover:bg-primary-50"
                  )}
                >
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
                    "relative px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 group",
                    isActiveLink('/stories')
                      ? "text-primary-600"
                      : "text-gray-700 hover:text-primary-600 hover:bg-primary-50"
                  )}
                >
                  <span>Stories</span>
                  <div className={cn(
                    "absolute inset-x-0 bottom-0 h-0.5 bg-primary-600 transition-transform duration-200",
                    isActiveLink('/stories')
                      ? "scale-x-100"
                      : "scale-x-0 group-hover:scale-x-100"
                  )}></div>
                </Link>

                {/* Presence Dropdown */}
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <button
                      className={cn(
                        "relative flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 group",
                        isPresenceActive()
                          ? "text-primary-600"
                          : "text-gray-700 hover:text-primary-600 hover:bg-primary-50"
                      )}
                    >
                      <span>Presence</span>
                      <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                      <div className={cn(
                        "absolute inset-x-0 bottom-0 h-0.5 bg-primary-600 transition-transform duration-200",
                        isPresenceActive()
                          ? "scale-x-100"
                          : "scale-x-0 group-hover:scale-x-100"
                      )}></div>
                    </button>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Portal>
                    <DropdownMenu.Content
                      className="w-40 rounded-lg border border-gray-200 bg-white p-1 shadow-lg z-50"
                      align="start"
                      sideOffset={8}
                    >
                      <DropdownMenu.Item asChild>
                        <Link
                          to="/me"
                          className={cn(
                            "flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors outline-none cursor-pointer",
                            isActiveLink('/me')
                              ? "bg-primary-50 text-primary-600"
                              : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                          )}
                        >
                          <User className="h-4 w-4" />
                          Profile
                        </Link>
                      </DropdownMenu.Item>
                      <DropdownMenu.Item asChild>
                        <Link
                          to="/teams"
                          className={cn(
                            "flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors outline-none cursor-pointer",
                            isActiveLink('/teams')
                              ? "bg-primary-50 text-primary-600"
                              : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                          )}
                        >
                          <Users className="h-4 w-4" />
                          Teams
                        </Link>
                      </DropdownMenu.Item>
                      <DropdownMenu.Item asChild>
                        <Link
                          to="/network"
                          className={cn(
                            "flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors outline-none cursor-pointer",
                            isActiveLink('/network')
                              ? "bg-primary-50 text-primary-600"
                              : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                          )}
                        >
                          <Globe className="h-4 w-4" />
                          Network
                        </Link>
                      </DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>
              </nav>
            )}
          </div>

          {/* Right section: Actions + User */}
          <div className="flex items-center space-x-3">
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
            
            {/* Sign up button - Only show when not authenticated */}
            {!isAuthenticated && (
              <div className="flex items-center space-x-3">
                <Link to="/login" className="text-gray-600 hover:text-gray-900 font-medium text-sm">
                  Sign in
                </Link>
                <Button size="sm" asChild>
                  <Link to="/register">
                    Sign up
                  </Link>
                </Button>
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
                <Activity className="h-4 w-4 mr-3" />
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
                <FileText className="h-4 w-4 mr-3" />
                Stories
              </Link>

              {/* Presence Accordion */}
              <div className="border-t border-gray-100 mt-2 pt-2">
                <button
                  onClick={() => setIsPresenceExpanded(!isPresenceExpanded)}
                  className={cn(
                    "flex items-center justify-between w-full px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200",
                    isPresenceActive()
                      ? "text-primary-600"
                      : "text-gray-700 hover:text-primary-600 hover:bg-primary-50"
                  )}
                  aria-expanded={isPresenceExpanded}
                  aria-controls="mobile-presence-menu"
                >
                  <div className="flex items-center">
                    <Users className="h-4 w-4 mr-3" />
                    Presence
                  </div>
                  <ChevronDown className={cn(
                    "h-4 w-4 transition-transform duration-200",
                    isPresenceExpanded && "rotate-180"
                  )} />
                </button>

                {/* Presence child links */}
                <div
                  id="mobile-presence-menu"
                  className={cn(
                    "overflow-hidden transition-all duration-150",
                    isPresenceExpanded ? "max-h-40 opacity-100" : "max-h-0 opacity-0"
                  )}
                >
                  <div className="ml-7 mt-1 space-y-1">
                    <Link
                      to="/me"
                      className={cn(
                        "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200",
                        isActiveLink('/me')
                          ? "text-primary-600 bg-primary-50"
                          : "text-gray-600 hover:text-primary-600 hover:bg-primary-50"
                      )}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <User className="h-4 w-4 mr-3" />
                      Profile
                    </Link>
                    <Link
                      to="/teams"
                      className={cn(
                        "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200",
                        isActiveLink('/teams')
                          ? "text-primary-600 bg-primary-50"
                          : "text-gray-600 hover:text-primary-600 hover:bg-primary-50"
                      )}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <Users className="h-4 w-4 mr-3" />
                      Teams
                    </Link>
                    <Link
                      to="/network"
                      className={cn(
                        "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200",
                        isActiveLink('/network')
                          ? "text-primary-600 bg-primary-50"
                          : "text-gray-600 hover:text-primary-600 hover:bg-primary-50"
                      )}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <Globe className="h-4 w-4 mr-3" />
                      Network
                    </Link>
                  </div>
                </div>
              </div>
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