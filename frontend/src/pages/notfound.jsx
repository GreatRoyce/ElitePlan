import React from "react";
import { useNavigate } from "react-router-dom";
import { Home, ArrowLeft, AlertCircle } from "lucide-react";

function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-royal via-purple-900 to-brand-royal flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full text-center">
        
        {/* Icon Container */}
        <div className="relative mb-8">
          <div className="w-32 h-32 mx-auto bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/20 animate-pulse">
            <AlertCircle className="w-16 h-16 text-brand-gold" />
          </div>
        </div>

        {/* Error Content */}
        <div className="space-y-4 mb-8">
          <h1 className="text-8xl font-black text-white bg-gradient-to-r from-brand-gold to-yellow-300 bg-clip-text text-transparent">
            404
          </h1>
          <h2 className="text-2xl font-bold text-white">Page Not Found</h2>
          <p className="text-brand-ivory/80 text-lg">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center gap-3 px-6 py-3 bg-white/10 text-white rounded-xl border border-white/20 hover:bg-white/20 transition-all duration-200 font-medium group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            Go Back
          </button>
          
          <button
            onClick={() => navigate("/")}
            className="flex items-center justify-center gap-3 px-6 py-3 bg-brand-gold text-brand-royal rounded-xl hover:bg-yellow-400 transition-all duration-200 font-medium shadow-lg group"
          >
            <Home className="w-5 h-5 group-hover:scale-110 transition-transform" />
            Go Home
          </button>
        </div>

        {/* Support Link */}
        <div className="mt-12 pt-8 border-t border-white/10">
          <p className="text-brand-ivory/60 text-sm">
            Need help?{" "}
            <button
              onClick={() => navigate("/contact")}
              className="text-brand-gold hover:text-yellow-400 underline transition-colors"
            >
              Contact support
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default NotFound;