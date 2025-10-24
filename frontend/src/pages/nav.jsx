import React, { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { Link } from "react-router-dom";
import SignUpForm from "../components/Auth/signupform"; 

function Nav({ user, handleLogout }) {
  const [loggingOut, setLogout] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [showSignup, setShowSignup] = useState(false); // 👈 modal state

  const onLogoutClick = () => {
    setLogout(true);
    setTimeout(() => {
      handleLogout();
      setLogout(false);
      setIsMobileMenuOpen(false);
    }, 2000);
  };

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  const navItems = [
    { label: "How it works", path: "/lounge" },
    { label: "Features", path: "/presence" },
    { label: "Why Choose Us", path: "/suite" },
    
  ];

  // 👇 Scroll-based visibility
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 80) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      setLastScrollY(currentScrollY);
    };
    const handleMouseMove = () => setIsVisible(true);

    window.addEventListener("scroll", handleScroll);
    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [lastScrollY]);

  return (
    <>
      {/* Main Nav */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 h-16 flex justify-center items-center bg-brand-royal border-b border-brand-gold/10 px-4 sm:px-6 transition-transform duration-500 ease-in-out ${
          isVisible ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <div className="flex items-center justify-between w-full max-w-6xl">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link to="/lounge" onClick={closeMobileMenu}>
              <img
                src="/logo/elite.png"
                alt="ElitePlan Logo"
                className="h-12 sm:h-14 object-contain drop-shadow-lg"
              />
            </Link>
          </div>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center justify-center flex-1 max-w-2xl mx-4">
            <div className="flex items-center pl-96 gap-6">
              {navItems.map((item) => (
                <NavItem key={item.path} label={item.label} path={item.path} />
              ))}
            </div>
          </div>

          {/* Desktop Buttons */}
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <button
                onClick={onLogoutClick}
                disabled={loggingOut}
                className="px-4 py-1.5 text-brand-ivory text-sm font-medium rounded-lg border border-brand-gold/50 hover:bg-brand-gold/10 transition-all duration-200 disabled:opacity-50"
              >
                {loggingOut ? (
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 border border-brand-ivory border-t-transparent rounded-full animate-spin"></div>
                    Logging out...
                  </div>
                ) : (
                  "Logout"
                )}
              </button>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-1.5 text-brand-ivory text-sm font-medium rounded-lg border border-brand-gold/50 hover:bg-brand-gold/10 transition-all duration-200"
                >
                  Login
                </Link>

                <button
                  onClick={() => setShowSignup(true)} // 👈 open modal
                  className="px-4 py-1.5 text-brand-navy bg-brand-gold text-sm font-semibold rounded-lg hover:bg-brand-gold/80 transition-all duration-200"
                >
                  Sign Up
                </button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              onClick={toggleMobileMenu}
              className="p-2 text-brand-ivory hover:text-brand-gold transition-colors duration-200"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Overlay Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-brand-royal/95 backdrop-blur-sm pt-20">
          <div className="flex flex-col items-center space-y-8 px-6 py-8">
            <div className="flex flex-col items-center space-y-6 w-full max-w-sm">
              {navItems.map((item) => (
                <MobileNavItem
                  key={item.path}
                  label={item.label}
                  path={item.path}
                  onClick={closeMobileMenu}
                />
              ))}
            </div>

            {/* Mobile Auth Buttons */}
            <div className="w-full max-w-sm border-t border-brand-ivory/20 pt-8 flex flex-col gap-4">
              {user ? (
                <button
                  onClick={onLogoutClick}
                  disabled={loggingOut}
                  className="w-full px-4 py-3 text-brand-ivory text-lg font-medium rounded-lg border border-brand-gold/50 hover:bg-brand-gold/10 transition-all duration-200"
                >
                  {loggingOut ? "Logging out..." : "Logout"}
                </button>
              ) : (
                <>
                  <MobileNavItem label="Login" path="/login" onClick={closeMobileMenu} />
                  <button
                    onClick={() => {
                      closeMobileMenu();
                      setShowSignup(true);
                    }}
                    className="w-full text-center py-4 text-brand-ivory text-xl font-medium hover:text-brand-gold transition-colors duration-200 border-b border-brand-ivory/10"
                  >
                    Sign Up
                  </button>
                </>
              )}
            </div>

            <div className="text-brand-ivory/60 text-sm mt-8">
              Tap anywhere outside to close
            </div>
          </div>
          <div className="absolute inset-0 -z-10" onClick={closeMobileMenu} />
        </div>
      )}

      {/* 🌟 SignUp Modal */}
      {showSignup && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex justify-center items-center p-4">
          <div className="relative bg-white/10 border border-white/20 rounded-2xl p-6 w-full max-w-2xl backdrop-blur-xl shadow-2xl">
            <button
              onClick={() => setShowSignup(false)}
              className="absolute top-3 right-3 text-white hover:text-brand-gold transition"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Your SignUpForm appears here */}
            <SignUpForm onSuccess={() => setShowSignup(false)} />
          </div>
        </div>
      )}
    </>
  );
}

/* -----------------------------
   Subcomponents
----------------------------- */
const NavItem = ({ label, path }) => (
  <Link to={path} className="relative group cursor-pointer">
    <span className="text-brand-ivory font-medium text-sm hover:text-brand-gold transition-colors duration-200">
      {label}
    </span>
    <div className="absolute -bottom-1 left-0 w-0 h-0.5 bg-brand-gold group-hover:w-full transition-all duration-200"></div>
  </Link>
);

const MobileNavItem = ({ label, path, onClick }) => (
  <Link
    to={path}
    onClick={onClick}
    className="w-full text-center py-4 text-brand-ivory text-xl font-medium hover:text-brand-gold transition-colors duration-200 border-b border-brand-ivory/10 last:border-b-0"
  >
    {label}
  </Link>
);

export default Nav;
