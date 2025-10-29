// src/components/PlannerPieces/ProfilePieces/ActionButtons.jsx
import React from "react";
import { Loader2, Save } from "lucide-react";

export default function ActionButtons({ isLoading = false, compact = false, onSave }) {
  return (
    <div className={`flex justify-end ${compact ? "gap-2" : "gap-4"}`}>
      <button
        type="button"
        onClick={onSave}
        disabled={isLoading}
        className={`flex items-center justify-center px-4 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-all font-medium ${
          isLoading ? "cursor-not-allowed opacity-70" : ""
        }`}
      >
        {isLoading ? (
          <>
            <Loader2 className="animate-spin mr-2" size={16} /> Saving...
          </>
        ) : (
          <>
            <Save size={16} className="mr-2" /> Save
          </>
        )}
      </button>
    </div>
  );
}
