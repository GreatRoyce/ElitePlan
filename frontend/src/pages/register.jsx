import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../utils/axios";

function Register() {
  const navigate = useNavigate();
  const location = useLocation();

  const [role, setRole] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    phone: "",
    password: "",
    howheard: "",
    specialization: "",
    companyname: "",
    servicetype: "",
    businessname: "",
  });

  // 🧭 Detect role passed from Connect.jsx
  useEffect(() => {
    if (location.state?.role) setRole(location.state.role);
  }, [location.state]);

  // Reusable role configuration
  const roleConfig = {
    client: [],
    planner: [
      { name: "businessname", label: "Business Name" },
      { name: "specialization", label: "Specialization" },
    ],
    vendor: [
      { name: "companyname", label: "Company Name" },
      { name: "servicetype", label: "Service Type" },
    ],
  };

  const userTypes = [
    { id: "client", title: "Client", desc: "Plan your perfect event" },
    { id: "planner", title: "Planner", desc: "Help people plan unforgettable events" },
    { id: "vendor", title: "Vendor", desc: "Showcase your event services" },
  ];

  const handleChange = (e) =>
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!role) return setMessage("Please select a role before registering.");

    try {
      const res = await api.post("/auth/register", { ...formData, role });
      setMessage(res.data.message || "Registration successful! Redirecting...");

      setTimeout(() => navigate("/login"), 2000);
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          "Error registering, please try again."
      );
    }
  };

  return (
    <section className="bg-gradient-to-br border border-red-900 w-72 from-brand-ivory to-white py-10 min-h-screen">
      <div className="max-w-6xl mx-auto px-4">
        {/* === ROLE SELECTION === */}
        {!role ? (
          <div className="grid grid-cols-1 sm:grid-rows-3 gap-8 justify-center items-center">
            {userTypes.map((u) => (
              <div
                key={u.id}
                className="bg-white/80 backdrop-blur-md border border-gray-200 p-6 rounded-xl shadow-md hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col justify-between"
                onClick={() => setRole(u.id)}
              >
                <h3 className="text-lg font-semibold text-brand-royal mb-1 text-center">
                  {u.title}
                </h3>
                <p className="text-sm text-gray-500 text-center mb-3">
                  {u.desc}
                </p>
                <button className="py-2 text-sm font-medium bg-brand-royal text-white rounded-md hover:bg-brand-charcoal transition">
                  Continue as {u.title}
                </button>
              </div>
            ))}
          </div>
        ) : (
          /* === FORM SECTION === */
          <form
            onSubmit={handleSubmit}
            className="max-w-lg mx-auto bg-white/90 backdrop-blur-md p-8 rounded-2xl shadow border border-gray-200 mt-8"
          >
            <h3 className="text-xl font-semibold text-brand-royal mb-6 capitalize text-center">
              {role} Registration
            </h3>

            {/* Shared fields */}
            {[
              { name: "username", label: "Username", type: "text" },
              { name: "email", label: "Email", type: "email" },
              { name: "phone", label: "Phone", type: "tel" },
            ].map(({ name, label, type }) => (
              <div key={name} className="mb-4">
                <label className="block text-sm mb-1">{label}</label>
                <input
                  type={type}
                  name={name}
                  value={formData[name]}
                  onChange={handleChange}
                  className="w-full border px-3 py-2 rounded focus:ring-2 focus:ring-brand-royal outline-none"
                  required
                />
              </div>
            ))}

            {/* Password */}
            <div className="mb-4 relative">
              <label className="block text-sm mb-1">Password</label>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full border px-3 py-2 rounded pr-10 focus:ring-2 focus:ring-brand-royal outline-none"
                required
              />
              <span
                className="absolute right-3 top-9 text-gray-500 cursor-pointer text-sm select-none"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "🙈 Hide" : "👁 Show"}
              </span>
            </div>

            {/* Role-Specific Fields */}
            {roleConfig[role]?.map(({ name, label }) => (
              <div key={name} className="mb-4">
                <label className="block text-sm mb-1">{label}</label>
                <input
                  type="text"
                  name={name}
                  value={formData[name]}
                  onChange={handleChange}
                  className="w-full border px-3 py-2 rounded focus:ring-2 focus:ring-brand-royal outline-none"
                  required
                />
              </div>
            ))}

            {/* How did you hear about us */}
            <div className="mb-4">
              <label className="block text-sm mb-1">
                How did you hear about us?
              </label>
              <select
                name="howheard"
                value={formData.howheard}
                onChange={handleChange}
                className="w-full border px-3 py-2 rounded focus:ring-2 focus:ring-brand-royal outline-none"
              >
                <option value="">Select</option>
                <option value="familyfriends">Family / Friends</option>
                <option value="socialmedia">Social Media</option>
                <option value="onlinesearch">Online Search</option>
                <option value="marketplace">Marketplace</option>
                <option value="event">Event</option>
                <option value="flyer">Flyer / Signage</option>
                <option value="emailSmsWhatsapp">
                  Email / SMS / WhatsApp
                </option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="w-full py-3 mt-4 bg-brand-royal text-white rounded-lg hover:bg-brand-charcoal transition"
            >
              Register as {role}
            </button>

            {/* Message */}
            {message && (
              <p className="mt-4 text-center text-sm text-gray-600">{message}</p>
            )}

            {/* Back */}
            <p className="text-center mt-4 text-sm text-gray-500">
              Not a {role}?{" "}
              <button
                type="button"
                className="text-brand-royal underline"
                onClick={() => setRole("")}
              >
                Go Back
              </button>
            </p>
          </form>
        )}
      </div>
    </section>
  );
}

export default Register;
