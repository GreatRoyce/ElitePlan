import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import "./App.css";

// Pages
import Connect from "./pages/connect";
import FeaturesSection from "./pages/featuresSection";
import WhyChooseSection from "./pages/WhyChooseSection";
import HowItWorks from "./pages/howItWorks";
import Login from "./pages/login";
import Register from "./pages/register";
import Lounge from "./components/Lounge/lounge";
import ClientPresence from "./components/Presence/clientPresence";
import Suite from "./components/Suite/suite";
import Consultform from "./pages/consultform";
import Logout from "./pages/logout";
import NotFound from "./pages/notFound";
import Nav from "./pages/nav";

// Routes wrappers
import ProtectedRoute from "./routes/protectedRoute";
import PublicRoute from "./routes/publicRoute";
import AdminRoute from "./routes/adminRoute";
import StaffRoute from "./routes/staffRoute";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminUserDetails from "./pages/admin/AdminUserDetails";
import SiteVisitTracker from "./components/Analytics/SiteVisitTracker";
import AccountNotice from "./components/Moderation/AccountNotice";
import ReportsPage from "./pages/reports/ReportsPage";
import ReportDetails from "./pages/reports/ReportDetails";
import NewReport from "./pages/reports/NewReport";
import ProfileVerification from "./pages/admin/ProfileVerification";
import ProfileVerificationDetails from "./pages/admin/ProfileVerificationDetails";
import ContentModeration from "./pages/admin/ContentModeration";
import ContentDetails from "./pages/admin/ContentDetails";

import { useAuth } from "./context/authStore";

function Layout({ children }) {
  const { logout } = useAuth();
  const location = useLocation();

  // Show Nav only on public pages
  const publicPaths = [
    "/",
    "/features-section",
    "/why-choose-section",
    "/how-it-works",
    "/login",
    "/register",
  ];
  const showNav = publicPaths.includes(location.pathname);

  return (
    <>
      {showNav && <Nav handleLogout={logout} />}
      {children}
    </>
  );
}

function AppContent() {
  const { login } = useAuth();

  return (
    <>
    <SiteVisitTracker />
    <AccountNotice />
    <Routes>
      <Route
        path="/admin"
        element={<AdminRoute><AdminDashboard /></AdminRoute>}
      />
      <Route
        path="/admin/analytics"
        element={<AdminRoute><AdminAnalytics /></AdminRoute>}
      />
      <Route
        path="/admin/users"
        element={<AdminRoute><AdminUsers /></AdminRoute>}
      />
      <Route
        path="/admin/users/:userId"
        element={<AdminRoute><AdminUserDetails /></AdminRoute>}
      />
      <Route path="/admin/archive" element={<AdminRoute><AdminUsers key="archive" archived /></AdminRoute>} />
      <Route path="/admin/archive/:userId" element={<AdminRoute><AdminUserDetails /></AdminRoute>} />
      <Route path="/admin/moderators" element={<AdminRoute><AdminUsers key="moderators" moderators /></AdminRoute>} />
      <Route path="/moderator" element={<StaffRoute permission="users.read"><AdminUsers key="moderator-users" /></StaffRoute>} />
      <Route path="/moderator/users/:userId" element={<StaffRoute permission="users.read"><AdminUserDetails /></StaffRoute>} />
      <Route path="/moderator/analytics" element={<StaffRoute permission="analytics.read"><AdminAnalytics /></StaffRoute>} />
      {/* Public Pages */}
      <Route path="/admin/reports" element={<AdminRoute><ReportsPage key="admin-reports" staff /></AdminRoute>} />
      <Route path="/admin/verification" element={<AdminRoute><ProfileVerification /></AdminRoute>} />
      <Route path="/admin/content" element={<AdminRoute><ContentModeration /></AdminRoute>} />
      <Route path="/admin/content/:type/:profileId" element={<AdminRoute><ContentDetails /></AdminRoute>} />
      <Route path="/moderator/content" element={<StaffRoute permission="content.read"><ContentModeration /></StaffRoute>} />
      <Route path="/moderator/content/:type/:profileId" element={<StaffRoute permission="content.read"><ContentDetails /></StaffRoute>} />
      <Route path="/admin/verification/:type/:profileId" element={<AdminRoute><ProfileVerificationDetails /></AdminRoute>} />
      <Route path="/admin/reports/:reportId" element={<AdminRoute><ReportDetails key="admin-report" staff /></AdminRoute>} />
      <Route path="/moderator/reports" element={<StaffRoute permission="reports.read"><ReportsPage key="moderator-reports" staff /></StaffRoute>} />
      <Route path="/moderator/reports/:reportId" element={<StaffRoute permission="reports.read"><ReportDetails key="moderator-report" staff /></StaffRoute>} />
      <Route path="/reports" element={<ProtectedRoute><ReportsPage key="member-reports" /></ProtectedRoute>} />
      <Route path="/reports/new" element={<ProtectedRoute><NewReport /></ProtectedRoute>} />
      <Route path="/reports/:reportId" element={<ProtectedRoute><ReportDetails key="member-report" /></ProtectedRoute>} />
      <Route
        path="/"
        element={
          <PublicRoute>
            <Layout>
              <Connect />
            </Layout>
          </PublicRoute>
        }
      />
      <Route
        path="/features-section"
        element={
          <PublicRoute>
            <Layout>
              <FeaturesSection />
            </Layout>
          </PublicRoute>
        }
      />
      <Route
        path="/why-choose-section"
        element={
          <PublicRoute>
            <Layout>
              <WhyChooseSection />
            </Layout>
          </PublicRoute>
        }
      />
      <Route
        path="/how-it-works"
        element={
          <PublicRoute>
            <Layout>
              <HowItWorks />
            </Layout>
          </PublicRoute>
        }
      />

      {/* Auth Pages (Guests only) */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Layout>
              <Login onLogin={login} />
            </Layout>
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <Layout>
              <Register />
            </Layout>
          </PublicRoute>
        }
      />

      {/* Protected Pages (Logged-in users only) */}
      <Route
        path="/lounge"
        element={
          <ProtectedRoute>
            <Layout>
              <Lounge />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/clientpresence"
        element={
          <ProtectedRoute>
            <Layout>
              <ClientPresence />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/suite"
        element={
          <ProtectedRoute>
            <Layout>
              <Suite />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/consult"
        element={
          <ProtectedRoute>
            <Layout>
              <Consultform />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Logout (Public route, always accessible) */}
      <Route path="/logout" element={<Logout />} />

      {/* 404 Not Found */}
      <Route
        path="*"
        element={
          <Layout>
            <NotFound />
          </Layout>
        }
      />
    </Routes>
    </>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
