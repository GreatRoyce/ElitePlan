import React from "react";
import { Save } from "lucide-react";

export default function ActionButtons({ isLoading }) {
  return (
    <div className="flex justify-end mt-8">
      <button
        type="submit"
        disabled={isLoading}
        className="flex items-center gap-2 bg-brand-gold text-brand-navy px-6 py-3 rounded-xl font-semibold shadow-md hover:bg-yellow-400 transition disabled:opacity-50"
      >
        <Save size={18} />
        {isLoading ? "Saving..." : "Save Profile"}
      </button>
    </div>
  );
}
