import React, { useState, useEffect } from "react";
import api from "../utils/axios";

function Consultform() {
  const [formData, setFormData] = useState({
    fullName: "",
    eventType: "",
    eventDate: "",
    eventTime: "",
    country: "",
    state: "",
    city: "",
    minGuests: "",
    maxGuests: "",
    services: [],
    vendorType: [],
    notes: "",
    consent: false,
    contactMethod: "",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // ======== LOCATION STATES ========
  const [countries, setCountries] = useState([]);
  const [flagUrl, setFlagUrl] = useState("");
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);

  // ======== STATIC DATA ========
  const eventTypes = [
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

  const vendorOptions = [
    "Venue & Accommodation",
    "Food & Beverage",
    "Entertainment & Hosting",
    "Decor & Ambience",
    "Guest Experience",
    "Security & Logistics",
    "Media & Documentation",
    "Fashion & Beauty",
    "Transport & Rentals",
    "Print & Branding",
    "Tech & Digital",
    "Health & Safety",
    "Traditional Engagement",
    "Kids Entertainment",
    "Cleaning Services",
  ];

  const isVendorSelected =
    formData.services.includes("Vendor") ||
    formData.services.includes("Both");

  // ======== FETCH COUNTRIES =========
  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const res = await fetch("https://restcountries.com/v3.1/all?fields=name,flags,cca2");
        const data = await res.json();
        const formatted = data
          .map((c) => ({
            name: c.name.common,
            flag: c.flags?.png || "",
            code: c.cca2,
          }))
          .sort((a, b) => a.name.localeCompare(b.name));
        setCountries(formatted);
      } catch (err) {
        console.error("Error fetching countries:", err);
      }
    };
    fetchCountries();
  }, []);

  // ======== FETCH STATES =========
  useEffect(() => {
    const fetchStates = async () => {
      if (!formData.country) return;
      try {
        const res = await fetch("https://countriesnow.space/api/v0.1/countries/states", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ country: formData.country }),
        });
        const data = await res.json();
        if (data?.data?.states) {
          setStates(data.data.states.map((s) => s.name));
        } else {
          setStates([]);
        }
        setCities([]);
        const selected = countries.find((c) => c.name === formData.country);
        if (selected?.code)
          setFlagUrl(`https://flagcdn.com/w40/${selected.code.toLowerCase()}.png`);
      } catch (err) {
        console.error("Error fetching states:", err);
        setStates([]);
      }
    };
    fetchStates();
  }, [formData.country, countries]);

  // ======== FETCH CITIES =========
  useEffect(() => {
    const fetchCities = async () => {
      if (!formData.state || !formData.country) return;
      try {
        const res = await fetch("https://countriesnow.space/api/v0.1/countries/state/cities", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            country: formData.country,
            state: formData.state,
          }),
        });
        const data = await res.json();
        if (data?.data) {
          setCities(data.data);
        } else {
          setCities([]);
        }
      } catch (err) {
        console.error("Error fetching cities:", err);
        setCities([]);
      }
    };
    fetchCities();
  }, [formData.state, formData.country]);

  // ======== HANDLE CHANGES =========
  const handleChange = (e) => {
    const { name, value, type, checked, options } = e.target;

    if (type === "checkbox" && name === "services") {
      setFormData((prev) => {
        const updatedServices = checked
          ? [...prev.services, value]
          : prev.services.filter((s) => s !== value);
        return {
          ...prev,
          services: updatedServices,
          vendorType:
            updatedServices.includes("Vendor") ||
            updatedServices.includes("Both")
              ? prev.vendorType
              : [],
        };
      });
    } else if (type === "checkbox" && name === "consent") {
      setFormData((prev) => ({ ...prev, consent: checked }));
    } else if (name === "vendorType") {
      const selected = Array.from(options)
        .filter((opt) => opt.selected)
        .map((opt) => opt.value);
      setFormData((prev) => ({ ...prev, vendorType: selected }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  // ======== SUBMIT HANDLER =========
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const user = JSON.parse(localStorage.getItem("user"));
      if (!user || !user.username || !user.email || !user.phone) {
        setMessage("⚠️ You must be logged in to submit a consultation.");
        setLoading(false);
        return;
      }

      const payload = {
        // TODO: Replace these with the actual target user ID and type from your app's state or props.
        targetUser: "60d21b4667d0d8992e610c85", // Example Planner/Vendor User ID
        targetType: "Planner", // "Planner" or "Vendor"

        username: user.username,
        phone: user.phone,
        email: user.email,
        fullName: formData.fullName,
        eventType: formData.eventType,
        eventDate: formData.eventDate,
        eventTime: formData.eventTime,
        eventLocation: {
          country: formData.country,
          state: formData.state,
          city: formData.city,
        },
        guests: {
          min: formData.minGuests,
          max: formData.maxGuests,
        },
        services: formData.services,
        vendorType: formData.vendorType,
        notes: formData.notes,
        consent: formData.consent,
        contactMethod: formData.contactMethod,
      };

      const res = await api.post("/consultation", payload);
      setMessage(res.data.message || "Consultation submitted successfully!");
      setFormData({
        fullName: "",
        eventType: "",
        eventDate: "",
        eventTime: "",
        country: "",
        state: "",
        city: "",
        minGuests: "",
        maxGuests: "",
        services: [],
        vendorType: [],
        notes: "",
        consent: false,
        contactMethod: "",
      });
      setFlagUrl("");
    } catch (error) {
      console.error(error);
      setMessage(
        error.response?.data?.message ||
          "An error occurred while submitting the form."
      );
    } finally {
      setLoading(false);
    }
  };

  // ======== RENDER =========
  return (
    <div className="max-w-2xl mx-auto px-3 py-8">
      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
        <p className="text-[16px] text-center font-semibold text-gray-800 mb-3">
          Let's check your event date
        </p>

        {message && (
          <div
            className={`text-center mb-3 text-xs font-medium px-3 py-2 rounded ${
              message.includes("successfully")
                ? "text-green-600 bg-green-50"
                : "text-red-600 bg-red-50"
            }`}
          >
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* === PERSONAL INFO === */}
          <section>
            <p className="text-center text-[13px] font-medium text-gray-700 mb-3">
              Your Information
            </p>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-2 max-w-md mx-auto text-[11px]">
              <label className="font-medium text-gray-700 flex items-center">
                Full Name:
              </label>
              <input
                name="fullName"
                type="text"
                placeholder="John Doe"
                required
                value={formData.fullName}
                onChange={handleChange}
                className="px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none text-[11px]"
              />
            </div>
          </section>

          {/* === EVENT DETAILS === */}
          <section className="border-t pt-4">
            <p className="text-center text-[13px] font-medium text-gray-700 mb-3">
              Event Summary
            </p>

            <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-2 max-w-md mx-auto text-[11px]">
              {/* Event Type */}
              <label className="font-medium text-gray-700 flex items-center">
                Event Type:
              </label>
              <select
                name="eventType"
                required
                value={formData.eventType}
                onChange={handleChange}
                className="px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none text-[11px]"
              >
                <option value="">Select Event Type</option>
                {eventTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>

              {/* Date & Time */}
              <label className="font-medium text-gray-700 flex items-center">
                Event Date:
              </label>
              <input
                name="eventDate"
                type="date"
                required
                value={formData.eventDate}
                onChange={handleChange}
                className="px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none text-[11px]"
              />

              <label className="font-medium text-gray-700 flex items-center">
                Event Time:
              </label>
              <input
                name="eventTime"
                type="time"
                value={formData.eventTime}
                onChange={handleChange}
                className="px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none text-[11px]"
              />

              {/* Location */}
              <label className="font-medium text-gray-700 flex items-center">
                Location:
              </label>
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <select
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    className="flex-1 px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none text-[11px]"
                  >
                    <option value="">Select Country</option>
                    {countries.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  {flagUrl && (
                    <img
                      src={flagUrl}
                      alt="flag"
                      className="w-5 h-3 object-cover rounded border"
                    />
                  )}
                </div>

                <select
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none text-[11px]"
                  disabled={!states.length}
                >
                  <option value="">Select State</option>
                  {states.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>

                <select
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none text-[11px]"
                  disabled={!cities.length}
                >
                  <option value="">Select City</option>
                  {cities.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Guests */}
              <label className="font-medium text-gray-700 flex items-center">
                Guests:
              </label>
              <div className="flex items-center gap-1">
                <input
                  name="minGuests"
                  type="number"
                  placeholder="Min"
                  min={10}
                  value={formData.minGuests}
                  onChange={handleChange}
                  className="flex-1 px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none text-[11px]"
                />
                <span className="text-gray-500">-</span>
                <input
                  name="maxGuests"
                  type="number"
                  placeholder="Max"
                  min={10}
                  value={formData.maxGuests}
                  onChange={handleChange}
                  className="flex-1 px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none text-[11px]"
                />
              </div>
            </div>
          </section>

          {/* === SERVICES === */}
          <section className="border-t pt-4">
            <p className="text-center text-[14px] font-semibold text-gray-800 mb-3">
              Quick Details
            </p>

            <div className="max-w-md mx-auto space-y-3 text-[11px]">
              <div>
                <p className="font-medium text-gray-700 mb-1">
                  Service needed:
                </p>
                <div className="flex flex-wrap gap-3 ml-1">
                  {["Event Planner", "Vendor", "Both"].map((service) => (
                    <label
                      key={service}
                      className="flex items-center gap-1 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        name="services"
                        value={service}
                        checked={formData.services.includes(service)}
                        onChange={handleChange}
                        className="w-3 h-3 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-gray-700 whitespace-nowrap">{service}</span>
                    </label>
                  ))}
                </div>
              </div>

              {isVendorSelected && (
                <div>
                  <label className="font-medium text-gray-700 block mb-1">
                    Vendor Type(s):
                  </label>
                  <select
                    name="vendorType"
                    multiple
                    value={formData.vendorType}
                    onChange={handleChange}
                    className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none text-[11px]"
                    size={4}
                  >
                    {vendorOptions.map((vendor) => (
                      <option key={vendor} value={vendor}>
                        {vendor}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-gray-400 mt-1">
                    Hold Ctrl to select multiple
                  </p>
                </div>
              )}

              <div>
                <label className="font-medium text-gray-700 mb-1 block">
                  Notes [optional]:
                </label>
                <textarea
                  name="notes"
                  rows={2}
                  maxLength={150}
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="Tell us about your event..."
                  className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none resize-none text-[11px]"
                ></textarea>
              </div>
            </div>
          </section>

          {/* === CONSENT & SUBMIT === */}
          <section className="border-t pt-4">
            <p className="text-center text-[14px] font-semibold text-gray-800 mb-3">
              Consent and Follow-up
            </p>

            <div className="max-w-md mx-auto space-y-2 text-[11px]">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="consent"
                  checked={formData.consent}
                  onChange={handleChange}
                  className="w-3 h-3 text-blue-600 rounded focus:ring-blue-500 mt-0.5 flex-shrink-0"
                />
                <span className="text-gray-600 leading-tight">
                  I understand this form is only to check availability. A detailed form will follow if available.
                </span>
              </label>

              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-700 whitespace-nowrap">
                  Contact method:
                </span>
                <select
                  name="contactMethod"
                  value={formData.contactMethod}
                  onChange={handleChange}
                  className="flex-1 px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none text-[11px]"
                >
                  <option value="">Select method</option>
                  <option>Phone Call</option>
                  <option>WhatsApp</option>
                  <option>Email</option>
                </select>
              </div>
            </div>
          </section>

          <div className="text-center pt-4">
            <button
              type="submit"
              disabled={
                !formData.fullName ||
                !formData.eventDate ||
                !formData.consent ||
                loading
              }
              className={`relative px-6 py-2 rounded text-xs font-medium transition-all duration-300 ${
                !formData.fullName || !formData.eventDate || !formData.consent
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-brand-navy text-white hover:bg-brand-gold hover:shadow-lg"
              }`}
            >
              {loading ? "Submitting..." : "Check Availability"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Consultform;
