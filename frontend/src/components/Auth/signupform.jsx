import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { X } from "lucide-react";
import { MdBusiness, MdPerson, MdStore } from "react-icons/md";
import api from "../../utils/axios";
import usePlatformAvailability from "../../hooks/usePlatformAvailability";
import AvailabilityNotice from "../Platform/AvailabilityNotice";

function SignUpForm({ layout = "modal", onClose, onSuccess }) {
  const navigate = useNavigate();
  const location = useLocation();
  const modalRef = useRef(null);
  const isPage = layout === "page";
  const availability = usePlatformAvailability();

  const [role, setRole] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    if (!role || isPage) return;

    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) setRole("");
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [role, isPage]);

  useEffect(() => {
    if (!onClose) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

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
      desc: "Showcase your services to planners and clients",
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

  const currentRole = userTypes.find((u) => u.id === role);

  const handleChange = (e) =>
    setFormData((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!role) {
      setMessageType("error");
      return setMessage("Please select a role first.");
    }
    if (!availability.data?.registration[role]) return;
    setIsSubmitting(true);
    try {
      const res = await api.post("/auth/register", { ...formData, role });
      setMessageType("success");
      setMessage(res.data.message || "Registration successful!");
      setTimeout(() => {
        if (onSuccess) onSuccess();
        else navigate("/login");
      }, 2000);
    } catch (err) {
      setMessageType("error");
      setMessage(
        err.response?.data?.message || "Error registering, try again.",
      );
      setIsSubmitting(false);
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
    <section
      className={
        isPage
          ? "min-h-screen bg-gradient-to-br from-brand-ivory via-white to-slate-50 py-8"
          : "min-h-[50vh] bg-gradient-to-br from-white via-slate-50 to-white flex items-center justify-center p-6"
      }
    >
      <div
        className={
          isPage
            ? "relative max-w-7xl mx-auto px-4"
            : "relative max-w-6xl w-full"
        }
      >
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-brand-navy mb-3">
            Join ElitePlan
          </h1>
          <p className="text-slate-600 text-[14px] max-w-2xl mx-auto">
            Connect with trusted professionals and bring your event plans to
            life.
          </p>
          {onClose && (
            <button
              type="button"
              aria-label="Close signup"
              title="Close signup"
              onClick={onClose}
              className="absolute right-0 top-0 p-2 text-slate-500 hover:text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-royal rounded-md"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* === ROLE SELECTION === */}
        {!role && <AvailabilityNotice availability={availability} registration />}
        {!role ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {userTypes.map((u) => (
              <button
                key={u.id}
                type="button"
                disabled={!availability.data?.registration[u.id]}
                className="group w-full cursor-pointer text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-royal/30 rounded-xl"
                onClick={() => setRole(u.id)}
              >
                <div className="bg-white rounded-xl p-6 shadow-sm group-hover:shadow-md border border-slate-200 group-hover:border-brand-navy transition-all duration-300 flex flex-col h-full">
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
                  <span
                    className={`w-full py-2.5 rounded-lg ${roleConfig[u.id].bg} text-white text-center text-[12px] font-bold group-hover:opacity-90`}
                  >
                    {availability.data?.registration[u.id] === false ? "Registration paused" : `Register as ${u.title}`}
                  </span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          /* === COMPACT FORM CARD === */
          <div
            className={
              isPage
                ? "w-full max-w-2xl mx-auto"
                : "fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-3"
            }
          >
            <form
              ref={modalRef}
              onSubmit={handleSubmit}
              className={`relative w-full ${
                isPage
                  ? "max-w-2xl"
                  : "max-w-3xl max-h-[calc(100dvh-1.5rem)] overflow-y-auto overscroll-contain"
              } bg-white rounded-xl shadow-xl border border-slate-200 animate-scaleIn p-4`}
            >
              {onClose && (
                <button
                  type="button"
                  aria-label="Close signup"
                  title="Close signup"
                  onClick={onClose}
                  className="absolute right-6 top-6 z-10 p-1 text-white hover:text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-md"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
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
              <AvailabilityNotice availability={availability} registration role={role} />
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
                      autoComplete="username"
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
                      autoComplete="email"
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
                      autoComplete="tel"
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
                        autoComplete="new-password"
                        minLength={6}
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
                    <p className="mt-1 text-xs text-slate-500">
                      Use at least 6 characters.
                    </p>
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
                  disabled={isSubmitting || !availability.data?.registration[role]}
                  className={`w-full md:w-auto px-6 py-2.5 rounded-md text-white text-[12px] font-medium ${roleConfig[role].bg} hover:opacity-90 disabled:cursor-wait disabled:opacity-60`}
                >
                  {isSubmitting ? "Creating account..." : "Register"}
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
                  role={messageType === "error" ? "alert" : "status"}
                  className={`mt-4 text-center p-2.5 rounded-md text-[13px] font-medium ${
                    messageType === "error"
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
