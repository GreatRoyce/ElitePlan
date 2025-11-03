import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  MessageCircle, 
  CheckCircle2,
  ArrowLeft,
  Loader2
} from "lucide-react";
import api from "../utils/axios";
import { useAuth } from "../../src/context/AuthContext";

export default function ConsultForm() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { targetUserId, targetType, profileName } = location.state || {};

  const [formData, setFormData] = useState({
    fullName: user?.fullName || "",
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
    contactMethod: "email",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [messageType, setMessageType] = useState("info");
  const [countdown, setCountdown] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Location states
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [loadingLocation, setLoadingLocation] = useState(false);

  // Static data
  const eventTypes = [
    "Weddings", "Corporate Events", "Birthdays", "Concerts", 
    "Private Parties", "Conferences", "Product Launches", 
    "Festivals", "Engagements", "Funerals"
  ];

  const vendorOptions = [
    "Venue & Accommodation", "Food & Beverage", "Entertainment & Hosting",
    "Decor & Ambience", "Guest Experience", "Security & Logistics",
    "Media & Documentation", "Fashion & Beauty", "Transport & Rentals",
    "Print & Branding", "Tech & Digital", "Health & Safety",
    "Traditional Engagement", "Kids Entertainment", "Cleaning Services"
  ];

  const contactMethods = [
    { value: "email", label: "Email", icon: "✉️" },
    { value: "phone", label: "Phone", icon: "📞" },
    { value: "whatsapp", label: "WhatsApp", icon: "💬" }
  ];

  // Fetch countries
  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const res = await fetch(
          "https://restcountries.com/v3.1/all?fields=name,flags,cca2"
        );
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

  // Fetch states
  useEffect(() => {
    const fetchStates = async () => {
      if (!formData.country) return;
      setLoadingLocation(true);
      try {
        const res = await fetch(
          "https://countriesnow.space/api/v0.1/countries/states",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ country: formData.country }),
          }
        );
        const data = await res.json();
        if (data?.data?.states) {
          setStates(data.data.states.map((s) => s.name));
        } else setStates([]);
        setCities([]);
      } catch (err) {
        console.error("Error fetching states:", err);
        setStates([]);
      } finally {
        setLoadingLocation(false);
      }
    };
    fetchStates();
  }, [formData.country]);

  // Fetch cities
  useEffect(() => {
    const fetchCities = async () => {
      if (!formData.state || !formData.country) return;
      setLoadingLocation(true);
      try {
        const res = await fetch(
          "https://countriesnow.space/api/v0.1/countries/state/cities",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              country: formData.country,
              state: formData.state,
            }),
          }
        );
        const data = await res.json();
        setCities(data?.data || []);
      } catch (err) {
        console.error("Error fetching cities:", err);
        setCities([]);
      } finally {
        setLoadingLocation(false);
      }
    };
    fetchCities();
  }, [formData.country, formData.state]);

  const handleChange = (e) => {
    const { name, value, type, checked, options } = e.target;

    if (type === "checkbox" && name === "services") {
      setFormData((prev) => {
        const updated = checked
          ? [...prev.services, value]
          : prev.services.filter((s) => s !== value);
        return { ...prev, services: updated };
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
      window.scrollTo(0, 0);
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    if (!user) {
      setMessage("You must be logged in to submit a consultation.");
      setMessageType("error");
      setIsSubmitting(false);
      return;
    }

    if (!targetUserId || !targetType) {
      setMessage("Missing vendor or planner information.");
      setMessageType("error");
      setIsSubmitting(false);
      return;
    }

    const payload = {
      user: user?.id,
      targetUser: targetUserId,
      targetType: targetType === "Vendor" ? "VendorProfile" : "PlannerProfile",
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
        min: formData.minGuests ? Number(formData.minGuests) : undefined,
        max: formData.maxGuests ? Number(formData.maxGuests) : undefined,
      },
      services: formData.services,
      vendorType: formData.vendorType,
      notes: formData.notes,
      consent: formData.consent,
      contactMethod: formData.contactMethod,
    };

    try {
      await api.post("/consultation", payload);
      setMessageType("success");
      setMessage("Consultation request sent successfully!");

      // Countdown for redirect
      setCountdown(3);
      const intervalId = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(intervalId);
            navigate("/lounge");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

    } catch (err) {
      setMessageType("error");
      setMessage(
        err.response?.data?.message ||
          "An error occurred while submitting your request."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { number: 1, title: "Event Details", icon: Calendar },
    { number: 2, title: "Location & Guests", icon: MapPin },
    { number: 3, title: "Services & Notes", icon: MessageCircle },
  ];

  if (!targetUserId || !targetType) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-sm p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Missing Information
          </h2>
          <p className="text-gray-600 mb-6">
            Vendor or planner information is missing. Please go back and try again.
          </p>
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-2 bg-brand-navy text-white rounded-lg hover:bg-brand-dark transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Request Consultation
          </h1>
          <p className="text-gray-600">
            {profileName && `Consulting with ${profileName}`}
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-center mb-12">
          <div className="flex items-center space-x-8">
            {steps.map((step, index) => {
              const StepIcon = step.icon;
              const isCompleted = currentStep > step.number;
              const isCurrent = currentStep === step.number;
              
              return (
                <div key={step.number} className="flex items-center">
                  <div className={`flex flex-col items-center ${isCurrent ? 'scale-110' : ''} transition-transform`}>
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${
                      isCompleted 
                        ? 'bg-green-500 border-green-500 text-white' 
                        : isCurrent
                        ? 'border-brand-navy bg-white text-brand-navy'
                        : 'border-gray-300 bg-white text-gray-400'
                    } transition-all duration-300`}>
                      {isCompleted ? (
                        <CheckCircle2 className="w-6 h-6" />
                      ) : (
                        <StepIcon className="w-5 h-5" />
                      )}
                    </div>
                    <span className={`text-sm font-medium mt-2 ${
                      isCurrent ? 'text-brand-navy' : 'text-gray-500'
                    }`}>
                      {step.title}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-16 h-0.5 mx-4 ${
                      currentStep > step.number ? 'bg-green-500' : 'bg-gray-300'
                    } transition-colors duration-300`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          {/* Step 1: Event Details */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent transition-all"
                    required
                    placeholder="Enter your full name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Event Type *
                  </label>
                  <select
                    name="eventType"
                    value={formData.eventType}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent transition-all"
                    required
                  >
                    <option value="">Select Event Type</option>
                    {eventTypes.map((et, i) => (
                      <option key={i} value={et}>{et}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="w-4 h-4 inline mr-2" />
                    Event Date *
                  </label>
                  <input
                    type="date"
                    name="eventDate"
                    value={formData.eventDate}
                    onChange={handleChange}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Clock className="w-4 h-4 inline mr-2" />
                    Event Time
                  </label>
                  <input
                    type="time"
                    name="eventTime"
                    value={formData.eventTime}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent transition-all"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Location & Guests */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Country *
                  </label>
                  <select
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent transition-all"
                    required
                  >
                    <option value="">Select Country</option>
                    {countries.map((c) => (
                      <option key={c.name} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State *
                  </label>
                  <select
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    disabled={!formData.country || loadingLocation}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent transition-all disabled:bg-gray-50"
                    required
                  >
                    <option value="">Select State</option>
                    {states.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City *
                  </label>
                  <select
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    disabled={!formData.state || loadingLocation}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent transition-all disabled:bg-gray-50"
                    required
                  >
                    <option value="">Select City</option>
                    {cities.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Users className="w-4 h-4 inline mr-2" />
                    Minimum Guests
                  </label>
                  <input
                    type="number"
                    name="minGuests"
                    value={formData.minGuests}
                    onChange={handleChange}
                    min="1"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent transition-all"
                    placeholder="e.g., 50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Users className="w-4 h-4 inline mr-2" />
                    Maximum Guests
                  </label>
                  <input
                    type="number"
                    name="maxGuests"
                    value={formData.maxGuests}
                    onChange={handleChange}
                    min="1"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent transition-all"
                    placeholder="e.g., 200"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Services & Notes */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-4">
                  Services Needed
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {vendorOptions.map((opt, i) => (
                    <label key={i} className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        name="services"
                        value={opt}
                        checked={formData.services.includes(opt)}
                        onChange={handleChange}
                        className="rounded border-gray-300 text-brand-navy focus:ring-brand-navy mr-3"
                      />
                      <span className="text-sm text-gray-700">{opt}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preferred Contact Method
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {contactMethods.map((method) => (
                    <label key={method.value} className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors has-[:checked]:border-brand-navy has-[:checked]:bg-blue-50">
                      <input
                        type="radio"
                        name="contactMethod"
                        value={method.value}
                        checked={formData.contactMethod === method.value}
                        onChange={handleChange}
                        className="sr-only"
                      />
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{method.icon}</span>
                        <span className="text-sm font-medium">{method.label}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Notes
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows="4"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent transition-all"
                  placeholder="Tell us more about your event requirements, special requests, or any other details..."
                />
              </div>

              <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <input
                  type="checkbox"
                  name="consent"
                  checked={formData.consent}
                  onChange={handleChange}
                  className="rounded border-gray-300 text-brand-navy focus:ring-brand-navy mt-1"
                  required
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Consent to Contact
                  </label>
                  <p className="text-sm text-gray-600">
                    I consent to be contacted regarding this event and understand that my information will be shared with the selected professional.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between items-center pt-8 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setCurrentStep(currentStep - 1)}
              disabled={currentStep === 1}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>

            <button
              type="submit"
              disabled={isSubmitting || (currentStep === 3 && !formData.consent)}
              className="px-8 py-3 bg-brand-navy text-white rounded-lg hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting...
                </>
              ) : currentStep === 3 ? (
                "Submit Request"
              ) : (
                "Continue"
              )}
            </button>
          </div>

          {/* Success Message */}
          {message && (
            <div className={`mt-6 p-4 rounded-lg ${
              messageType === "success" 
                ? "bg-green-50 border border-green-200 text-green-800" 
                : "bg-red-50 border border-red-200 text-red-800"
            }`}>
              <div className="flex items-center gap-3">
                {messageType === "success" ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                ) : (
                  <MessageCircle className="w-5 h-5 text-red-600" />
                )}
                <div>
                  <p className="font-medium">{message}</p>
                  {messageType === "success" && countdown !== null && (
                    <p className="text-sm mt-1 opacity-75">
                      Redirecting to lounge in {countdown} seconds...
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}