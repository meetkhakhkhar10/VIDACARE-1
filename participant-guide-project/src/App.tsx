/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { VidaCareProvider } from './context/VidaCareContext';
import { Layout } from './components/Layout';
import { ScrollToTop } from './components/ScrollToTop';
import { HomePage } from './pages/HomePage';
import { CampaignsPage } from './pages/CampaignsPage';
import { CampaignDetailsPage } from './pages/CampaignDetailsPage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { AboutPage } from './pages/AboutPage';
import { ContactPage } from './pages/ContactPage';
import { DashboardPage } from './pages/DashboardPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { DonatePage } from './pages/DonatePage';
import { FaqPage } from './pages/FaqPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { StartFundraiserPage } from './pages/StartFundraiserPage';

export default function App() {
  return (
    <AuthProvider>
      <VidaCareProvider>
        <BrowserRouter>
          <ScrollToTop />
          <Layout>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/campaigns" element={<CampaignsPage />} />
              <Route path="/campaigns/:id" element={<CampaignDetailsPage />} />
              <Route path="/donate" element={<DonatePage />} />
              <Route path="/donate/:id" element={<DonatePage />} />
              <Route path="/start-fundraiser" element={<StartFundraiserPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/forgot-password" element={<LoginPage initialMode="forgot" />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/faq" element={<FaqPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route
                path="/dashboard/campaigner"
                element={<DashboardPage portalMode="campaigner" />}
              />
              <Route
                path="/dashboard/donor"
                element={<DashboardPage portalMode="donor" />}
              />
              <Route path="/admin" element={<AdminDashboardPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </VidaCareProvider>
    </AuthProvider>
  );
}
