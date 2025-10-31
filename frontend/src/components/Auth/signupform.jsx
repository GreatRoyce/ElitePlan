import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../../utils/axios";

function SignUpForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const modalRef = useRef(null);

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

  // 🧭 Detect role from Connect.jsx
  useEffect(() => {
    if (location.state?.role) setRole(location.state.role);
  }, [location.state]);

  // 🖱️ Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) setRole("");
    };
    if (role) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [role]);

  const roleConfig = {
    client: { icon: "💍", color: "from-brand-navy to-brand-royal", bg: "bg-brand-navy" },
    planner: { icon: "📋", color: "from-brand-royal to-brand-navy", bg: "bg-brand-royal" },
    vendor: { icon: "🏢", color: "from-brand-navy to-brand-royal", bg: "bg-brand-navy" },
  };

  const userTypes = [
    {
      id: "client",
      title: "Client",
      desc: "Plan your event with trusted professionals",
      fields: [],
    },
    {
      id: "planner",
      title: "Planner",
      desc: "Organize unforgettable experiences",
      fields: [
        { 
          name: "businessname", 
          label: "Business Name",
          type: "text"
        },
        { 
          name: "specialization", 
          label: "Specialization",
          type: "select",
          options: specializationOptions
        },
      ],
    },
    {
      id: "vendor",
      title: "Vendor",
      desc: "Showcase your services to planners and clients",
      fields: [
        { 
          name: "companyname", 
          label: "Company Name",
          type: "text"
        },
        { 
          name: "servicetype", 
          label: "Service Type",
          type: "select",
          options: serviceTypeOptions
        },
        { 
          name: "category", 
          label: "Category Type",
          type: "select",
          options: categoryOptions
        },
      ],
    },
  ];

  const currentRole = userTypes.find((u) => u.id === role);

  const handleChange = (e) =>
    setFormData((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!role) return setMessage("Please select a role first.");
    try {
      const res = await api.post("/auth/register", { ...formData, role });
      setMessage(res.data.message || "Registration successful!");
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setMessage(err.response?.data?.message || "Error registering, try again.");
    }
  };

  const renderField = (field) => {
    if (field.type === "select") {
      return (
        <select
          name={field.name}
          value={formData[field.name]}
          onChange={handleChange}
          className="w-full border border-slate-300 rounded-md p-2.5 focus:ring-2 focus:ring-brand-royal outline-none"
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
          className="w-full border border-slate-300 rounded-md p-2.5 focus:ring-2 focus:ring-brand-royal outline-none"
          required
        />
      );
    }
  };

  return (
    <section className="min-h-[50vh] bg-gradient-to-br from-white via-slate-50 to-white flex items-center justify-center p-6">
      <div className="max-w-6xl w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-brand-navy mb-3">
            Join Our Network
          </h1>
          <p className="text-slate-600 text-[14px] max-w-2xl mx-auto">
            Connect with clients, planners, and vendors to create seamless events.
          </p>
        </div>

        {/* === ROLE SELECTION === */}
        {!role ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {userTypes.map((u) => (
              <div
                key={u.id}
                className="group cursor-pointer"
                onClick={() => setRole(u.id)}
              >
                <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md border border-slate-200 hover:border-brand-navy transition-all duration-300 flex flex-col h-full">
                  <div
                    className={`w-12 h-12 rounded-lg ${roleConfig[u.id].bg} flex items-center justify-center text-white text-xl mb-4`}
                  >
                    {roleConfig[u.id].icon}
                  </div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-2">
                    {u.title}
                  </h3>
                  <p className="text-slate-600 text-[14px] mb-4 flex-grow leading-snug">
                    {u.desc}
                  </p>
                  <button
                    className={`w-full py-2.5 rounded-lg ${roleConfig[u.id].bg} text-white text-[12px] font-bold hover:opacity-90`}
                  >
                    Register as {u.title}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* === COMPACT FORM CARD === */
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-3">
            <form
              ref={modalRef}
              onSubmit={handleSubmit}
              className="w-full max-w-3xl bg-white rounded-xl shadow-xl border border-slate-200 animate-scaleIn p-4"
            >
              {/* Header */}
              <div
                className={`bg-gradient-to-r ${roleConfig[role].color} text-white rounded-lg p-4 mb-4`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-white/20 rounded-md flex items-center justify-center">
                    {roleConfig[role].icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">
                      {currentRole?.title} Registration
                    </h3>
                    <p className="text-white/80 text-[13px]">
                      Fill in your account details below
                    </p>
                  </div>
                </div>
              </div>

              {/* Form grid layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[14px]">
                {/* Left Column */}
                <div className="space-y-3">
                  <div>
                    <label className="font-medium text-slate-700 mb-1 block">
                      Username
                    </label>
                    <input
                      name="username"
                      type="text"
                      value={formData.username}
                      onChange={handleChange}
                      className="w-full border border-slate-300 rounded-md p-2.5 focus:ring-2 focus:ring-brand-royal outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="font-medium text-slate-700 mb-1 block">
                      Email
                    </label>
                    <input
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full border border-slate-300 rounded-md p-2.5 focus:ring-2 focus:ring-brand-royal outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="font-medium text-slate-700 mb-1 block">
                      Phone
                    </label>
                    <input
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full border border-slate-300 rounded-md p-2.5 focus:ring-2 focus:ring-brand-royal outline-none"
                      required
                    />
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-3">
                  <div>
                    <label className="font-medium text-slate-700 mb-1 block">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        className="w-full border border-slate-300 rounded-md p-2.5 pr-16 focus:ring-2 focus:ring-brand-royal outline-none"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-[13px] text-slate-600"
                      >
                        {showPassword ? "Hide" : "Show"}
                      </button>
                    </div>
                  </div>

                  {currentRole?.fields.map((field) => (
                    <div key={field.name}>
                      <label className="font-medium text-slate-700 mb-1 block">
                        {field.label}
                      </label>
                      {renderField(field)}
                    </div>
                  ))}

                  <div>
                    <label className="font-medium text-slate-700 mb-1 block">
                      How did you hear about us?
                    </label>
                    <select
                      name="howheard"
                      value={formData.howheard}
                      onChange={handleChange}
                      className="w-full border border-slate-300 rounded-md p-2.5 focus:ring-2 focus:ring-brand-royal outline-none"
                    >
                      <option value="">Select</option>
                      <option value="socialmedia">Social Media</option>
                      <option value="familyfriends">Family / Friends</option>
                      <option value="event">Event</option>
                      <option value="flyer">Flyer</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-4 flex flex-col md:flex-row items-center justify-between gap-3">
                <button
                  type="submit"
                  className={`w-full md:w-auto px-6 py-2.5 rounded-md text-white text-[12px] font-medium ${roleConfig[role].bg} hover:opacity-90`}
                >
                  Register
                </button>
                <button
                  type="button"
                  className="text-slate-600 text-[13px] hover:text-brand-royal"
                  onClick={() => setRole("")}
                >
                  ← Back to roles
                </button>
              </div>

              {message && (
                <div
                  className={`mt-4 text-center p-2.5 rounded-md text-[13px] font-medium ${
                    message.includes("Error")
                      ? "bg-red-50 text-red-600"
                      : "bg-green-50 text-green-600"
                  }`}
                >
                  {message}
                </div>
              )}
            </form>
          </div>
        )}
      </div>
    </section>
  );
}

export default SignUpForm;