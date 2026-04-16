import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import PublicLayout from './layouts/PublicLayout';
import AdminLayout from './layouts/AdminLayout';
import { useI18n } from './i18n/I18nContext';

const Home = lazy(() => import('./pages/Home'));
const AcademicsPage = lazy(() => import('./pages/AcademicsPage'));
const ResearchPage = lazy(() => import('./pages/ResearchPage'));
const GalleryPage = lazy(() => import('./pages/GalleryPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const ExperiencesPage = lazy(() => import('./pages/ExperiencesPage'));
const ResearchInterestsPage = lazy(() => import('./pages/ResearchInterestsPage'));
const PublicationsPage = lazy(() => import('./pages/PublicationsPage'));
const DynamicPage = lazy(() => import('./pages/DynamicPage'));
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/admin/Dashboard'));

const RouteFallback = () => {
  const { t } = useI18n();

  return (
    <div className="min-h-[40vh] flex items-center justify-center px-4 text-sm font-semibold uppercase tracking-[0.18em] text-[#0b3b75]">
      {t('app.loading')}
    </div>
  );
};

function App() {
  return (
    <Router>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<PublicLayout />}>
            <Route index element={<Home />} />
            <Route path="academics" element={<AcademicsPage />} />
            <Route path="experiences" element={<ExperiencesPage />} />
            <Route path="research-interests" element={<ResearchInterestsPage />} />
            <Route path="publications" element={<PublicationsPage />} />
            <Route path="blog/:slug" element={<DynamicPage />} />
            <Route path="research" element={<ResearchPage />} />
            <Route path="gallery" element={<GalleryPage />} />
            <Route path="contact" element={<ContactPage />} />
          </Route>

          {/* Admin Routes */}
          <Route path="/login" element={<Navigate to="/admin" replace />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Login />} />
            <Route path="dashboard" element={<Dashboard />} />
          </Route>
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
