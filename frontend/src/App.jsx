import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import "./App.css";

// Pages
import Connect from "./pages/connect"; // Landing page
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
import NotFound from "./pages/NotFound";
import Nav from "./pages/nav";

// Routes wrappers
import ProtectedRoute from "./routes/protectedRoute";
import PublicRoute from "./routes/publicRoute";

import { useAuth } from "./context/authContext";

/* -----------------------------
   Layout Wrapper
----------------------------- */
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
    // "/logout" is intentionally omitted to hide the nav during logout
  ];
  const showNav = publicPaths.includes(location.pathname);

  return (
    <>
      {showNav && <Nav handleLogout={logout} />}
      {children}
    </>
  );
}

/* -----------------------------
   Main Routes
----------------------------- */
function AppContent() {
  const { login } = useAuth();

  return (
    <Routes>
      {/* 🌟 Public Pages */}
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

      {/* 🌟 Auth Pages (Guests only) */}
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

      {/* 🌟 Protected Pages (Logged-in users only) */}
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

      {/* 🌟 Logout (Public route, always accessible) */}
      <Route path="/logout" element={<Logout />} />

      {/* 🌟 404 Not Found */}
      <Route
        path="*"
        element={
          <Layout>
            <NotFound />
          </Layout>
        }
      />
    </Routes>
  );
}

/* -----------------------------
   Root App Component
----------------------------- */
export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
