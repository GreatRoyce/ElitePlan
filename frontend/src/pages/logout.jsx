import React, { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const NAV_DELAY_MS = 2000; // shorter delay for logout redirect
const PARTICLE_COUNT = 20;

function GlowingTitle() {
  return (
    <div className="text-center mb-16">
      <div className="bg-gradient-to-r from-white/95 to-white/90 text-transparent bg-clip-text">
        <h1 className="text-2xl md:text-3xl font-bold tracking-wider animate-glow mb-12">
          Logging out
        </h1>
      </div>
      <p className="text-white/70 text-lg mt-12 animate-fade-in">
        Redirecting to home
      </p>
    </div>
  );
}

function ParticleField({ count = PARTICLE_COUNT }) {
  const particles = useMemo(
    () =>
      Array.from({ length: count }).map(() => ({
        left: Math.random() * 100,
        top: Math.random() * 100,
        delay: Math.random() * 5,
        duration: 3 + Math.random() * 4,
      })),
    [count]
  );

  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      {particles.map((p, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 bg-white/30 rounded-full animate-float"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  );
}

function Logout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Clear user state immediately
    logout();

    // Redirect to landing page after delay
    const timer = setTimeout(() => {
      navigate("/", { replace: true });
    }, NAV_DELAY_MS);

    return () => clearTimeout(timer);
  }, [logout, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-purple-900 text-white overflow-hidden relative">
      <ParticleField />
      <div className="relative z-20 flex flex-col items-center justify-center min-h-screen">
        <GlowingTitle />
      </div>

      <style jsx>{`
        @keyframes glow {
          0%, 100% { text-shadow: 0 0 20px rgba(255,255,255,0.5); }
          50% { text-shadow: 0 0 30px rgba(255,255,255,0.8), 0 0 40px rgba(255,255,255,0.6); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-glow { animation: glow 3s ease-in-out infinite; }
        .animate-float { animation: float linear infinite; }
        .animate-fade-in { animation: fadeIn 2s ease-out; }
      `}</style>
    </div>
  );
}

export default Logout;
