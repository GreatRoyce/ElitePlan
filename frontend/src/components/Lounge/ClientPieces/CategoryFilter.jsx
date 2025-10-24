import React from "react";

export default function CategoryFilter({ selectedCategory, setSelectedCategory }) {
  const categories = ["All", "Vendors", "Planners"];
  
  return (
    <div className="flex mb-8">
      {/* iPhone 13 Glass Container */}
      <div className="p-1 bg-gradient-to-br from-white/30 to-white/10 backdrop-blur-2xl rounded-full shadow-2xl border border-white/40 border-b-white/20 border-r-white/20">
        <div className="flex bg-gradient-to-br from-brand-navy/5 to-transparent rounded-full p-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`relative px-4 space-x-3 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${
                selectedCategory === cat
                  ? "text-brand-navy"
                  : "text-brand-charcoal/60 hover:text-brand-navy/80"
              }`}
            >
              {/* Background Layers */}
              {selectedCategory === cat ? (
                <>
                  {/* Frosted Glass Base */}
                  <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/50 to-white/30 backdrop-blur-lg border border-white/50 shadow-inner" />
                  
                  {/* Color Tint */}
                  <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-brand-gold/15 to-brand-emerald/10" />
                  
                  {/* Top Highlight */}
                  <div className="absolute top-0 left-0 right-0 h-px bg-white/60 rounded-t-lg" />
                </>
              ) : (
                <div className="absolute inset-0 rounded-full opacity-0 hover:opacity-100 transition-opacity duration-200 bg-white/30 backdrop-blur-sm border border-white/40" />
              )}
              
              <span className="relative z-10">
                {cat}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}