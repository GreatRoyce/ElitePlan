import React from "react";
import { MapPin } from "lucide-react";

export default function LocationSection({ formData, setFormData, countries, states }) {
  const handleCountryChange = (e) => {
    const selectedCountry = e.target.value;
    setFormData((prev) => ({ ...prev, country: selectedCountry, state: "" }));
  };

  return (
    <div className="bg-gray-50 p-6 rounded-2xl shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <MapPin className="text-brand-gold" />
        <h2 className="text-lg font-semibold">Location</h2>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Country</label>
          <select
            value={formData.country}
            onChange={handleCountryChange}
            className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2"
          >
            <option value="">Nigeria</option>
            {countries.map((c) => (
              <option key={c.cca2} value={c.name.common}>
                {c.name.common}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">State</label>
          <select
            value={formData.state}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, state: e.target.value }))
            }
            className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2"
          >
            <option value="">Select State</option>
            {states.map((s, i) => (
              <option key={i} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
