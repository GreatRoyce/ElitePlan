import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../utils/axios";
import { MdCategory, MdPerson, MdBusiness, MdStore } from "react-icons/md";

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
    category: "",
    servicetype: "",
    businessname: "",
  });

  // 🧭 Detect role passed from Connect.jsx
  useEffect(() => {
    if (location.state?.role) setRole(location.state.role);
  }, [location.state]);

  // Specialization options for planners
  const specializationOptions = [
    "Wedding Planning",
    "Corporate Events",
    "Social Gatherings",
    "Luxury Events",
    "Destination Planning",
    "Cultural Ceremonies",
    "Non-Profit Events",
    "Other",
  ];

  // Category options for vendors
  const categoryOptions = [
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

  // Service type options for vendors
  const serviceTypeOptions = [
    "Catering",
    "Photography",
    "Videography",
    "Decoration",
    "Entertainment",
    "Venue Rental",
    "Logistics",
    "Security",
    "Makeup & Styling",
    "Rentals",
    "Transportation",
    "Printing",
    "Technology",
    "Planning",
    "Other",
  ];

  const roleConfig = {
    client: {
      icon: <MdPerson className="text-2xl" />,
      color: "from-brand-navy to-brand-royal",
      bg: "bg-gradient-to-r from-brand-navy to-brand-royal",
    },
    planner: {
      icon: <MdBusiness className="text-2xl" />,
      color: "from-brand-royal to-brand-navy",
      bg: "bg-gradient-to-r from-brand-royal to-brand-navy",
    },
    vendor: {
      icon: <MdStore className="text-2xl" />,
      color: "from-brand-navy to-brand-royal",
      bg: "bg-gradient-to-r from-brand-navy to-brand-royal",
    },
  };

  const userTypes = [
    {
      id: "client",
      title: "Client",
      desc: "Plan your perfect event with trusted professionals",
      fields: [],
    },
    {
      id: "planner",
      title: "Planner",
      desc: "Help people plan unforgettable events and experiences",
      fields: [
        {
          name: "businessname",
          label: "Business Name",
          type: "text",
        },
        {
          name: "specialization",
          label: "Specialization",
          type: "select",
          options: specializationOptions,
        },
      ],
    },
    {
      id: "vendor",
      title: "Vendor",
      desc: "Showcase your event services to planners and clients",
      fields: [
        {
          name: "companyname",
          label: "Company Name",
          type: "text",
        },
        {
          name: "servicetype",
          label: "Service Type",
          type: "select",
          options: serviceTypeOptions,
        },
        {
          name: "category",
          label: "Category Type",
          type: "select",
          options: categoryOptions,
        },
      ],
    },
  ];

  const handleChange = (e) =>
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!role) return setMessage("Please select a role before registering.");

    try {
      const res = await api.post("/auth/register", { ...formData, role });
      setMessage("Registration successful! Redirecting to login page...");

      setTimeout(() => {
        navigate("/login", {
          state: {
            message:
              "Registration successful! Please enter your login credentials.",
          },
        });
      }, 3000);
    } catch (error) {
      setMessage(
        error.response?.data?.message || "Error registering, please try again."
      );
    }
  };

  const renderField = (field) => {
    if (field.type === "select") {
      return (
        <select
          name={field.name}
          value={formData[field.name]}
          onChange={handleChange}
          className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-brand-royal focus:border-transparent outline-none transition-all duration-200"
          required
        >
          <option value="">Select {field.label}</option>
          {field.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    } else {
      return (
        <input
          type="text"
          name={field.name}
          value={formData[field.name]}
          onChange={handleChange}
          className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-brand-royal focus:border-transparent outline-none transition-all duration-200"
          required
        />
      );
    }
  };

  const currentRole = userTypes.find((u) => u.id === role);

  return (
    <section className="min-h-screen bg-gradient-to-br from-brand-ivory via-white to-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-brand-navy mb-4">
            Join ElitePlan
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Connect with the perfect professionals to bring your event vision to
            life
          </p>
        </div>

        {/* === ROLE SELECTION === */}
        {!role ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {userTypes.map((u) => (
              <div
                key={u.id}
                className="group cursor-pointer transform hover:scale-105 transition-all duration-300"
                onClick={() => setRole(u.id)}
              >
                <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-xl hover:border-brand-royal/20 transition-all duration-300 h-full flex flex-col">
                  <div
                    className={`w-16 h-16 rounded-xl ${
                      roleConfig[u.id].bg
                    } flex items-center justify-center text-white mb-6 mx-auto`}
                  >
                    {roleConfig[u.id].icon}
                  </div>

                  <h3 className="text-2xl font-bold text-brand-navy mb-3 text-center">
                    {u.title}
                  </h3>
                  <p className="text-gray-600 text-center mb-6 leading-relaxed flex-grow">
                    {u.desc}
                  </p>

                  <button
                    className={`w-full py-4 rounded-xl ${
                      roleConfig[u.id].bg
                    } text-white font-semibold hover:shadow-lg transition-all duration-200 group-hover:scale-105`}
                  >
                    Continue as {u.title}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* === FORM SECTION === */
          <div className="max-w-2xl mx-auto">
            <form
              onSubmit={handleSubmit}
              className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
            >
              {/* Form Header */}
              <div className={`bg-gradient-to-r ${roleConfig[role].color} p-6`}>
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                    {roleConfig[role].icon}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      {role.charAt(0).toUpperCase() + role.slice(1)}{" "}
                      Registration
                    </h2>
                    <p className="text-white/90 text-sm">
                      Create your {role} account in just a few steps
                    </p>
                  </div>
                </div>
              </div>

              {/* Form Content */}
              <div className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Username *
                      </label>
                      <input
                        type="text"
                        name="username"
                        value={formData.username}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-brand-royal focus:border-transparent outline-none transition-all duration-200"
                        placeholder="Enter your username"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Email *
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-brand-royal focus:border-transparent outline-none transition-all duration-200"
                        placeholder="Enter your email"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Phone *
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-brand-royal focus:border-transparent outline-none transition-all duration-200"
                        placeholder="Enter your phone number"
                        required
                      />
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Password *
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          name="password"
                          value={formData.password}
                          onChange={handleChange}
                          className="w-full border border-gray-300 rounded-lg px-4 py-3 pr-12 focus:ring-2 focus:ring-brand-royal focus:border-transparent outline-none transition-all duration-200"
                          placeholder="Create a password"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-brand-royal transition-colors"
                        >
                          {showPassword ? "🙈 Hide" : "👁 Show"}
                        </button>
                      </div>
                    </div>

                    {/* Role-Specific Fields */}
                    {currentRole?.fields.map((field) => (
                      <div key={field.name}>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          {field.label} *
                        </label>
                        {renderField(field)}
                      </div>
                    ))}

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        How did you hear about us?
                      </label>
                      <select
                        name="howheard"
                        value={formData.howheard}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-brand-royal focus:border-transparent outline-none transition-all duration-200"
                      >
                        <option value="">Select an option</option>
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
                  </div>
                </div>

                {/* Submit Button */}
                <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <button
                    type="submit"
                    className={`w-full sm:w-auto px-8 py-4 ${roleConfig[role].bg} text-white font-semibold rounded-lg hover:shadow-lg transition-all duration-200 transform hover:scale-105`}
                  >
                    Register as {role.charAt(0).toUpperCase() + role.slice(1)}
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole("")}
                    className="text-gray-600 hover:text-brand-royal font-medium transition-colors duration-200"
                  >
                    ← Choose different role
                  </button>
                </div>

                {/* Message */}
                {message && (
                  <div
                    className={`mt-6 p-4 rounded-lg text-center font-medium ${
                      message.includes("Error") || message.includes("error")
                        ? "bg-red-50 text-red-600 border border-red-200"
                        : "bg-green-50 text-green-600 border border-green-200"
                    }`}
                  >
                    {message}
                  </div>
                )}
              </div>
            </form>
          </div>
        )}
      </div>
    </section>
  );
}

export default Register;
