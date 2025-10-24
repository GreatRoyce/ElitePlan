import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../utils/axios";
import portraitsFlip from "../data/weddingPortraits";
import "../../src/index.css";

function Login({ onLogin }) {
  const navigate = useNavigate();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // 🎞️ Background image rotation
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isHovered) {
        setCurrentImageIndex((prev) =>
          prev === portraitsFlip.length - 1 ? 0 : prev + 1
        );
      }
    }, 3500);
    return () => clearInterval(interval);
  }, [isHovered]);

  const handleChange = (e) =>
    setFormData((p) => ({ ...p, [e.target.name]: e.target.value }));

  // 🚀 Login Logic
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const res = await api.post("/auth/login", formData);
      const { token, user } = res.data;
      if (!token || !user) throw new Error("Invalid login response");

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      if (onLogin) onLogin(user);
      navigate("/lounge");
    } catch (err) {
      console.error("❌ Login failed:", err);
      setMessage(`❌ ${err.response?.data?.message || "Login failed."}`);
    } finally {
      setLoading(false);
    }
  };

  const goToPrevious = () =>
    setCurrentImageIndex((prev) =>
      prev === 0 ? portraitsFlip.length - 1 : prev - 1
    );

  const goToNext = () =>
    setCurrentImageIndex((prev) =>
      prev === portraitsFlip.length - 1 ? 0 : prev + 1
    );

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-black/40 backdrop-blur-md overflow-hidden">
      {/* Slightly blurred background overlay */}
      <div className="absolute inset-0 backdrop-blur-3xl bg-black/40 z-0" />

      {/* Floating background gradients */}
      <div className="absolute -top-20 left-10 w-72 h-72 bg-brand-emerald/20 blur-[120px] rounded-full" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-brand-royal/20 blur-[160px] rounded-full" />

      {/* LOGIN CARD */}
      <div className="relative z-10 w-[90%] lg:w-[85%] max-w-5xl grid lg:grid-cols-[1.1fr_1.4fr] border border-white/10 bg-white/10 backdrop-blur-2xl rounded-2xl shadow-[0_0_60px_-10px_rgba(0,0,0,0.6)] overflow-hidden">
        {/* LEFT PANEL */}
        <div className="flex flex-col justify-center px-6 lg:px-10 py-8">
          <h2 className="text-2xl lg:text-3xl font-extrabold bg-gradient-to-r from-brand-emerald to-brand-ivory bg-clip-text text-transparent mb-2">
            Welcome Back
          </h2>
          <p className="text-gray-400 text-sm mb-6">
            Access your{" "}
            <span className="text-brand-emerald font-medium">ElitePlan</span>{" "}
            dashboard
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Email address"
              className="w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/15 focus:ring-2 focus:ring-brand-emerald/50 outline-none placeholder-gray-400 text-sm"
              required
            />

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Password"
                className="w-full px-4 py-2.5 pr-12 rounded-lg bg-white/10 border border-white/15 focus:ring-2 focus:ring-brand-emerald/50 outline-none placeholder-gray-400 text-sm"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2 text-gray-400 hover:text-brand-emerald transition text-sm"
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>

            <div className="flex items-center justify-between text-gray-400 text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-3.5 h-3.5 rounded bg-white/10 border-white/20 accent-brand-emerald"
                />
                Remember me
              </label>
              <a href="#" className="hover:text-brand-emerald text-xs">
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-brand-emerald/90 text-white rounded-lg font-semibold transition-all duration-300 hover:bg-brand-emerald disabled:opacity-50 text-sm"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>

            {message && (
              <p className="text-center text-gray-300 text-xs">{message}</p>
            )}

            <p className="text-center text-gray-400 text-xs pt-3 border-t border-white/10">
              New here?{" "}
              <Link
                to="/register"
                className="text-brand-emerald hover:underline"
              >
                Create account
              </Link>
            </p>
          </form>
        </div>

        {/* RIGHT PANEL (Phone Mockup) */}
        <div className="hidden lg:flex items-center justify-center p-6 relative">
          <div
            className="relative w-full max-w-sm h-[65vh] bg-black rounded-[2.5rem] border-[8px] border-gray-900 shadow-2xl overflow-hidden"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-5 bg-gray-900 rounded-b-xl z-20 flex justify-center items-center">
              <div className="w-3 h-3 bg-gray-700 rounded-full"></div>
            </div>

            <div className="absolute inset-0 mt-10 bg-gray-900">
              {portraitsFlip.map((item, i) => (
                <div
                  key={item.id}
                  className={`absolute inset-0 transition-opacity duration-700 ${
                    i === currentImageIndex ? "opacity-100" : "opacity-0"
                  }`}
                >
                  <img
                    src={item.image}
                    alt={item.text}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex flex-col justify-end p-6">
                    <h3 className="text-lg font-bold text-white mb-1">
                      ElitePlan
                    </h3>
                    <p className="text-gray-200 text-xs">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-20 h-0.5 bg-white/30 rounded-full"></div>
          </div>

          <span className="absolute top-30 right-4 text-[10px] text-white/20 tracking-[0.2em] rotate-90">
            ELITE PLAN
          </span>
        </div>
      </div>
    </div>
  );
}

export default Login;
