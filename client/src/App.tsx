import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';
import { HelmetProvider } from 'react-helmet-async';
import PublicLayout from './layouts/PublicLayout';
import AdminLayout from './layouts/AdminLayout';
import ErrorFallback from './components/ErrorFallback';
import RouteFallback from './components/RouteFallback';

const Home = lazy(() => import('./pages/Home'));
const AcademicsPage = lazy(() => import('./pages/AcademicsPage'));
const GalleryPage = lazy(() => import('./pages/GalleryPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const ExperiencesPage = lazy(() => import('./pages/ExperiencesPage'));
const ResearchInterestsPage = lazy(() => import('./pages/ResearchInterestsPage'));
const PublicationsPage = lazy(() => import('./pages/PublicationsPage'));
const ConferencesPage = lazy(() => import('./pages/ConferencesPage'));
const NewspaperPage = lazy(() => import('./pages/NewspaperPage'));
const DynamicPage = lazy(() => import('./pages/DynamicPage'));
const AnonymousMessagePage = lazy(() => import('./pages/AnonymousMessagePage'));
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/admin/Dashboard'));
const NotFound = lazy(() => import('./pages/NotFound'));

function App() {
  return (
    <HelmetProvider>
      <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<PublicLayout />}>
            <Route index element={<Home />} />
            <Route path="academics" element={<AcademicsPage />} />
            <Route path="experiences" element={<ExperiencesPage />} />
            <Route path="research-interests" element={<ResearchInterestsPage />} />
            <Route path="publications" element={<PublicationsPage />} />
            <Route path="conferences" element={<ConferencesPage />} />
            <Route path="newspaper" element={<NewspaperPage />} />
            <Route path="anonymous-message" element={<AnonymousMessagePage />} />
            <Route path="blog/:slug" element={<DynamicPage />} />
            <Route path="gallery" element={<GalleryPage />} />
            <Route path="contact" element={<ContactPage />} />
            <Route path="*" element={<NotFound />} />
          </Route>

          {/* Admin Routes */}
          <Route path="/login" element={<Navigate to="/admin" replace />} />
          <Route path="/admin" element={
            <Suspense fallback={<RouteFallback />}>
              <AdminLayout />
            </Suspense>
          }>
            <Route index element={<Login />} />
            <Route path="dashboard" element={<Dashboard />} />
          </Route>
        </Routes>
      </Router>
      </ErrorBoundary>
    </HelmetProvider>
  );
}

export default App;
