import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { UserNav } from './user-nav';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import { Bell, Heart, MessageSquare, Users, FileText, UserPlus, Upload, CheckCircle2, Search } from 'lucide-react';
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
    if (path === '/workspaces/discovery') {
      return location.pathname.startsWith('/workspaces');
    }
    return location.pathname === path;
  };
  return (
    <header className="sticky top-0 z-50 border-b border-gray-200/80 bg-white/80 backdrop-blur-md">
      <div className="mx-auto max-w-7xl">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Left section: Logo + Navigation */}
          <div className="flex items-center flex-1">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2 flex-shrink-0">
              <style>
                {`
                  @media screen and (min-width: 769px) {
                    #mobile-logo { display: none; }
                    #desktop-logo { display: inline-block; }
                  }
                  
                  @media screen and (max-width: 768px) {
                    #desktop-logo { display: none; }
                    #mobile-logo { display: inline-block; }
                  }
                `}
              </style>
              
              {/* Full logo for desktop */}
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 1200 150" 
                id="desktop-logo"
                style={{ height: "32px", width: "auto" }}
              >
                {/* Left purple box with "IN" */}
                  <rect x="50" y="50" width="180" height="100" stroke="#5D259F" strokeWidth="3" fill="#5D259F" />
                
                {/* "IN" text inside the box - aligned to the right */}
                <text x="225" y="140" fontFamily="Arial, sans-serif" fontSize="60" fontWeight="bold" fill="white" textAnchor="end">IN</text>
                
                {/* "CHRONICLE" text */}
                <text x="235" y="140" fontFamily="Arial, sans-serif" fontSize="120"  fill="#333333">CHRONICLE</text>
              </svg>

              
              {/* Only the "IN" box for mobile */}
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 130 150" 
                id="mobile-logo"
                style={{ height: "32px", width: "auto" }}
              >
               {/* Left purple box with "IN" */}
                  <rect x="10" y="25" width="120" height="120" stroke="#5D259F" strokeWidth="3" fill="#5D259F" />
                
                {/* "IN" text inside the box - aligned to the right */}
                <text x="125" y="140" fontFamily="Arial, sans-serif" fontSize="60" fontWeight="bold" fill="white" textAnchor="end">IN</text>
              </svg>
            </Link>

            {/* Desktop Navigation - Only show when authenticated */}
            {isAuthenticated && (
              <nav className="ml-8 hidden lg:flex space-x-1">
                <Link
                  to="/workspaces/discovery"
                  className={cn(
                    "relative px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 group",
                    isActiveLink('/workspaces/discovery')
                      ? "text-primary-600"
                      : "text-gray-700 hover:text-primary-600 hover:bg-primary-50"
                  )}
                >
                  <span>Workspaces</span>
                  <div className={cn(
                    "absolute inset-x-0 bottom-0 h-0.5 bg-primary-600 transition-transform duration-200",
                    isActiveLink('/workspaces/discovery')
                      ? "scale-x-100"
                      : "scale-x-0 group-hover:scale-x-100"
                  )}></div>
                </Link>
                <Link
                  to="/journal"
                  className={cn(
                    "relative px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 group",
                    isActiveLink('/journal')
                      ? "text-primary-600"
                      : "text-gray-700 hover:text-primary-600 hover:bg-primary-50"
                  )}
                >
                  <span>Journal</span>
                  <div className={cn(
                    "absolute inset-x-0 bottom-0 h-0.5 bg-primary-600 transition-transform duration-200",
                    isActiveLink('/journal')
                      ? "scale-x-100"
                      : "scale-x-0 group-hover:scale-x-100"
                  )}></div>
                </Link>
                <Link
                  to="/network"
                  className={cn(
                    "relative px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 group",
                    isActiveLink('/network')
                      ? "text-primary-600"
                      : "text-gray-700 hover:text-primary-600 hover:bg-primary-50"
                  )}
                >
                  <span>Network</span>
                  <div className={cn(
                    "absolute inset-x-0 bottom-0 h-0.5 bg-primary-600 transition-transform duration-200",
                    isActiveLink('/network')
                      ? "scale-x-100"
                      : "scale-x-0 group-hover:scale-x-100"
                  )}></div>
                </Link>
                <Link
                  to="/profile"
                  className={cn(
                    "relative px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 group",
                    isActiveLink('/profile')
                      ? "text-primary-600"
                      : "text-gray-700 hover:text-primary-600 hover:bg-primary-50"
                  )}
                >
                  <span>Profile</span>
                  <div className={cn(
                    "absolute inset-x-0 bottom-0 h-0.5 bg-primary-600 transition-transform duration-200",
                    isActiveLink('/profile')
                      ? "scale-x-100"
                      : "scale-x-0 group-hover:scale-x-100"
                  )}></div>
                </Link>
                <Link
                  to="/career-stories"
                  className={cn(
                    "relative px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 group",
                    isActiveLink('/career-stories')
                      ? "text-primary-600"
                      : "text-gray-700 hover:text-primary-600 hover:bg-primary-50"
                  )}
                >
                  <span>Stories</span>
                  <div className={cn(
                    "absolute inset-x-0 bottom-0 h-0.5 bg-primary-600 transition-transform duration-200",
                    isActiveLink('/career-stories')
                      ? "scale-x-100"
                      : "scale-x-0 group-hover:scale-x-100"
                  )}></div>
                </Link>
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
              <Link
                to="/workspaces/discovery"
                className={cn(
                  "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200",
                  isActiveLink('/workspaces/discovery')
                    ? "text-primary-600"
                    : "text-gray-700 hover:text-primary-600 hover:bg-primary-50"
                )}
                onClick={() => setIsMenuOpen(false)}
              >
                <svg className="h-4 w-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                Workspaces
              </Link>
              <Link
                to="/journal"
                className={cn(
                  "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200",
                  isActiveLink('/journal')
                    ? "text-primary-600"
                    : "text-gray-700 hover:text-primary-600 hover:bg-primary-50"
                )}
                onClick={() => setIsMenuOpen(false)}
              >
                <svg className="h-4 w-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                Journal
              </Link>
              <Link
                to="/network"
                className={cn(
                  "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200",
                  isActiveLink('/network')
                    ? "text-primary-600"
                    : "text-gray-700 hover:text-primary-600 hover:bg-primary-50"
                )}
                onClick={() => setIsMenuOpen(false)}
              >
                <svg className="h-4 w-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 715.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Network
              </Link>
              <Link
                to="/profile"
                className={cn(
                  "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200",
                  isActiveLink('/profile')
                    ? "text-primary-600"
                    : "text-gray-700 hover:text-primary-600 hover:bg-primary-50"
                )}
                onClick={() => setIsMenuOpen(false)}
              >
                <svg className="h-4 w-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Profile
              </Link>
              <Link
                to="/career-stories"
                className={cn(
                  "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200",
                  isActiveLink('/career-stories')
                    ? "text-primary-600"
                    : "text-gray-700 hover:text-primary-600 hover:bg-primary-50"
                )}
                onClick={() => setIsMenuOpen(false)}
              >
                <svg className="h-4 w-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Stories
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