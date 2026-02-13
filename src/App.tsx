import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from './lib/queryClient';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { ErrorConsoleProvider } from './contexts/ErrorConsoleContext';
import { ErrorConsole } from './components/dev/ErrorConsole';
import { OnboardingProvider } from './components/onboarding';
import { Header } from './components/layout/header';
import { HomePage } from './pages/home';
import { PrivacyPolicyPage } from './pages/privacy';
import { TermsOfServicePage } from './pages/terms';
import { LoginPage } from './pages/auth/login';
import { RegisterPage } from './pages/auth/register';
import { OnboardingPage } from './pages/onboarding';
import JournalListPage  from './pages/journal/list';
import { ActivityFeedPage } from './pages/activity/feed';
import { ProfileViewPage } from './pages/profile/view';
import { PublicProfilePage } from './pages/profile/public-view';
import { DashboardPage } from './pages/dashboard';
import WorkspaceDiscoveryPage from './pages/workspaces/discovery';
import WorkspaceDetailPage from './pages/workspaces/[workspaceId]';
import NetworkPage from './pages/network';
import SettingsPage from './pages/settings';
import NotificationsPage from './pages/notifications';
import ServiceStatusPageStandalone from './pages/services/status-standalone';
import { MCPCallbackPage } from './pages/mcp/callback';
import Format7DesignShowcase from './pages/format7-design-showcase';
import { CareerStoriesPage } from './components/career-stories';
import { DashboardPrototypePage } from './pages/dashboard/prototype';
import { WidgetVariationsPage } from './pages/dashboard/widget-variations';
import { TimelinePrototypesPage } from './pages/prototypes/timeline-prototypes';
import { StoriesPrototypesPage } from './pages/prototypes/stories-prototypes';
import { ProfilePrototypesPage } from './pages/prototypes/profile-prototypes';

const PublishedStoryPage = React.lazy(() => import('./pages/stories/published-story'));

export type NetworkType = 'organization' | 'global';

// Protected Route component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Main App Routes component
const AppRoutes: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [networkType, setNetworkType] = useState<NetworkType>('organization');
  const location = useLocation();

  // Special handling for services pages and legal pages - no header
  if (location.pathname === '/services' || location.pathname === '/privacy' || location.pathname === '/terms') {
    return (
      <Routes>
        <Route path="/services" element={<ServiceStatusPageStandalone />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/terms" element={<TermsOfServicePage />} />
      </Routes>
    );
  }

  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  return (
    <div className="min-h-screen bg-gray-50">
      {!isAuthPage && <Header networkType={networkType} onNetworkTypeChange={setNetworkType} />}
      <Routes>
        <Route
          path="/"
          element={
            isAuthenticated ? (
              <Navigate to="/timeline" replace />
            ) : (
              <HomePage />
            )
          }
        />
        <Route
          path="/login"
          element={
            isAuthenticated ? <Navigate to="/timeline" replace /> : <LoginPage />
          }
        />
        <Route
          path="/register"
          element={
            isAuthenticated ? <Navigate to="/timeline" replace /> : <RegisterPage />
          }
        />
        <Route 
          path="/onboarding" 
          element={
            <ProtectedRoute>
              <OnboardingPage />
            </ProtectedRoute>
          } 
        />
        
        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/prototype"
          element={
            <ProtectedRoute>
              <DashboardPrototypePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/widget-variations"
          element={
            <ProtectedRoute>
              <WidgetVariationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/prototypes/timeline"
          element={
            <ProtectedRoute>
              <TimelinePrototypesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/prototypes/stories"
          element={
            <ProtectedRoute>
              <StoriesPrototypesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/prototypes/profile"
          element={
            <ProtectedRoute>
              <ProfilePrototypesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/timeline"
          element={
            <ProtectedRoute>
              <JournalListPage />
            </ProtectedRoute>
          }
        />
        {/* Legacy redirect */}
        <Route path="/journal" element={<Navigate to="/timeline" replace />} />
        <Route 
          path="/network" 
          element={
            <ProtectedRoute>
              <NetworkPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/feed" 
          element={
            <ProtectedRoute>
              <ActivityFeedPage />
            </ProtectedRoute>
          } 
        />
        <Route
          path="/me"
          element={
            <ProtectedRoute>
              <ProfileViewPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/me/edit"
          element={
            <ProtectedRoute>
              <OnboardingPage />
            </ProtectedRoute>
          }
        />
        {/* Legacy redirects */}
        <Route path="/profile" element={<Navigate to="/me" replace />} />
        <Route path="/profile/edit" element={<Navigate to="/me/edit" replace />} />
        <Route 
          path="/profile/:userId" 
          element={
            <ProtectedRoute>
              <PublicProfilePage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/settings" 
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          } 
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <NotificationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/mcp/callback"
          element={<MCPCallbackPage />}
        />
        <Route
          path="/format7-showcase"
          element={<Format7DesignShowcase />}
        />
        <Route
          path="/stories"
          element={
            <ProtectedRoute>
              <CareerStoriesPage />
            </ProtectedRoute>
          }
        />
        {/* Public story permalink */}
        <Route
          path="/s/:storyId"
          element={
            <React.Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>}>
              <PublishedStoryPage />
            </React.Suspense>
          }
        />
        {/* Legacy redirects */}
        <Route path="/career-stories" element={<Navigate to="/stories" replace />} />
        <Route path="/workspaces/discovery" element={<Navigate to="/teams" replace />} />
        {/* Keep old /workspaces/:id route working (redirect can't forward params) */}
        <Route path="/workspaces/:workspaceId" element={<ProtectedRoute><WorkspaceDetailPage /></ProtectedRoute>} />
        <Route
          path="/teams"
          element={
            <ProtectedRoute>
              <WorkspaceDiscoveryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teams/:workspaceId"
          element={
            <ProtectedRoute>
              <WorkspaceDetailPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorConsoleProvider>
        <AuthProvider>
          <OnboardingProvider>
            <ToastProvider>
              <Router>
                <AppRoutes />
              </Router>
            </ToastProvider>
          </OnboardingProvider>
          <ReactQueryDevtools initialIsOpen={false} />
        </AuthProvider>
        <ErrorConsole />
      </ErrorConsoleProvider>
    </QueryClientProvider>
  );
}

export default App;