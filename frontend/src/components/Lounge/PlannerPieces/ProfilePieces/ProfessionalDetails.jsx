import React from "react";
import { Award } from "lucide-react";

export default function ProfessionalDetails({ formData, setFormData, errors }) {
  const specializations = [
    "Weddings",
    "Corporate Events",
    "Birthdays",
    "Concerts",
    "Private Parties",
    "Conferences",
    "Product Launches",
    "Festivals",
    "Engagements",
    "Funerals",
  ];

  return (
    <div className="bg-gray-50 p-6 rounded-2xl shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Award className="text-brand-gold" />
        <h2 className="text-lg font-semibold">Professional Details</h2>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Specialization</label>
          <select
            value={formData.specialization}
            onChange={(e) => setFormData((prev) => ({ ...prev, specialization: e.target.value }))}
            className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2"
          >
            <option value="">Select specialization</option>
            {specializations.map((spec) => (
              <option key={spec} value={spec}>{spec}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Years of Experience</label>
          <input
            type="number"
            value={formData.yearsExperience}
            onChange={(e) => setFormData((prev) => ({ ...prev, yearsExperience: e.target.value }))}
            className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Short Bio</label>
          <textarea
            value={formData.shortBio}
            onChange={(e) => setFormData((prev) => ({ ...prev, shortBio: e.target.value }))}
            rows={3}
            className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2"
            placeholder="Tell clients about your style and experience"
          ></textarea>
        </div>
      </div>
    </div>
  );
}
