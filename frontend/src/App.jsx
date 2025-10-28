import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import "./App.css";
import Login from "./pages/login";
import Nav from "./pages/nav";
import Lounge from "./components/Lounge/lounge";
import Register from "./pages/register";
import Logout from "./pages/logout";
import Presence from "./components/Presence/presence";
import NotFound from "./pages/NotFound";
import Consultform from "./pages/consultform";
import Suite from "./components/Suite/suite";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAuth } from "./context/AuthContext";
import ClientPresence from "./components/Presence/clientPresence";
import Connect from "./pages/connect"; // Landing page
import FeaturesSection from "./pages/featuresSection";
import WhyChooseSection from "./pages/WhyChooseSection";
import HowItWorks from "./pages/howItWorks";

/* -----------------------------
   Layout Wrapper
----------------------------- */
function Layout({ children }) {
  const { logout } = useAuth();
  const location = useLocation();

  // Only show Nav on the landing page
  const showNav =
    location.pathname === "/" ||
    location.pathname === "/features-section" ||
    location.pathname === "/why-choose-section" ||
    location.pathname === "/how-it-works";

  return (
    <>
      {showNav && <Nav handleLogout={logout} />}
      {children}
    </>
  );
}

/* -----------------------------
   Main Route Setup
----------------------------- */
function AppContent() {
  const { login } = useAuth();

  return (
    <Routes>
      {/* 🌟 Landing Page */}
      <Route
        path="/"
        element={
          <Layout>
            <Connect />
          </Layout>
        }
      />

      <Route
        path="/features-section"
        element={
          <Layout>
            <FeaturesSection />
          </Layout>
        }
      />

      <Route
        path="/why-choose-section"
        element={
          <Layout>
            <WhyChooseSection />
          </Layout>
        }
      />

      <Route
        path="/how-it-works"
        element={
          <Layout>
            <HowItWorks />
          </Layout>
        }
      />

      {/* Public Auth Routes */}
      <Route
        path="/login"
        element={
          <Layout>
            <Login onLogin={login} />
          </Layout>
        }
      />
      <Route
        path="/register"
        element={
          <Layout>
            <Register />
          </Layout>
        }
      />

      {/* Protected Routes */}
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
      {/* <Route
        path="/presence"
        element={
          <ProtectedRoute>
            <Layout>
              <Presence />
            </Layout>
          </ProtectedRoute>
        }
      /> */}
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
      <Route
        path="/logout"
        element={
          <ProtectedRoute>
            <Logout />
          </ProtectedRoute>
        }
      />

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
  );
}

/* -----------------------------
   Root App Component
----------------------------- */
function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
