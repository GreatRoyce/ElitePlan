import React, { useState, useRef, useEffect } from "react";
import {
  Camera,
  Plus,
  Save,
  Users,
  Edit3,
  XCircle,
  Trash2,
  Eye,
  EyeOff,
} from "lucide-react";
import { FaLocationDot } from "react-icons/fa6";
import {
  FaFacebookSquare,
  FaInstagramSquare,
  FaTiktok,
  FaLinkedinIn,
} from "react-icons/fa";
import { CgWebsite } from "react-icons/cg";
import api from "../../../utils/axios";

// Import Subcomponents
import ProfileHeader from "./ProfilePieces/ProfileHeader";
import ProfileImageSection from "./ProfilePieces/ProfileImageSection";
import PersonalDetails from "./ProfilePieces/PersonalDetails";
import ProfessionalDetails from "./ProfilePieces/ProfessionalDetails";
import GallerySection from "./ProfilePieces/GallerySection";
import LocationSection from "./ProfilePieces/LocationSection";
import SocialLinksSection from "./ProfilePieces/SocialLinksSection";
import ActionButtons from "./ProfilePieces/ActionButtons";

export default function Profile({ planner = {} }) {
  const initialForm = {
    fullName: planner.fullName || "",
    phonePrimary: planner.phonePrimary || "",
    profileImage: planner.profileImage || "",
    gallery: planner.gallery || [],
    specialization: planner.specialization || "",
    yearsExperience: planner.yearsExperience || "",
    shortBio: planner.shortBio || "",
    plannerType: planner.plannerType || "other",
    country: planner.country || "Nigeria",
    state: planner.state || "",
    serviceRegions: planner.serviceRegions || [],
    socialLinks: planner.socialLinks || {
      facebook: "",
      instagram: "",
      tiktok: "",
      linkedin: "",
      website: "",
    },
  };

  const [formData, setFormData] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [phoneCode, setPhoneCode] = useState("+234");
  const [phoneNumber, setPhoneNumber] = useState(
    planner.phonePrimary?.replace(/^\+\d+\s?/, "") || ""
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [isEditing, setIsEditing] = useState(true);
  const [activeTab, setActiveTab] = useState("basic"); // Tab state for compact view

  const profileInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  // Tab configuration
  const tabs = [
    { id: "basic", label: "Basic Info", icon: <Users size={16} /> },
    { id: "professional", label: "Professional", icon: <Camera size={16} /> },
    { id: "gallery", label: "Gallery", icon: <Plus size={16} /> },
    { id: "location", label: "Location", icon: <FaLocationDot size={16} /> },
    { id: "social", label: "Social", icon: <CgWebsite size={16} /> },
  ];

  // ✅ Fetch countries
  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const res = await fetch("https://restcountries.com/v3.1/all");
        const data = await res.json();
        const validCountries = data.filter((c) => c.name?.common && c.idd);
        const sorted = validCountries.sort((a, b) =>
          a.name.common.localeCompare(b.name.common)
        );
        setCountries(sorted);

        const nigeria = sorted.find((c) => c.name.common === "Nigeria");
        if (nigeria) {
          setPhoneCode(
            nigeria.idd.root + (nigeria.idd.suffixes?.[0] || "")
          );
        }
      } catch (err) {
        console.error("Error fetching countries:", err);
      }
    };
    fetchCountries();
  }, []);

  // ✅ Fetch states when country changes
  useEffect(() => {
    const fetchStates = async () => {
      if (!formData.country) return;
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
        if (data?.data?.states) setStates(data.data.states);

        // Update phone code
        const selectedCountry = countries.find(
          (c) => c.name.common === formData.country
        );
        if (selectedCountry?.idd?.root) {
          setPhoneCode(
            selectedCountry.idd.root +
              (selectedCountry.idd.suffixes?.[0] || "")
          );
          setFormData((prev) => ({
            ...prev,
            phonePrimary: `${selectedCountry.idd.root}${
              selectedCountry.idd.suffixes?.[0] || ""
            } ${phoneNumber}`,
          }));
        }
      } catch (err) {
        console.error("Error fetching states:", err);
      }
    };

    fetchStates();
  }, [formData.country, countries]);

  // ✅ Update phone dynamically
  const handlePhoneChange = (e) => {
    const value = e.target.value;
    setPhoneNumber(value);
    setFormData((prev) => ({
      ...prev,
      phonePrimary: `${phoneCode} ${value}`,
    }));
  };

  // ✅ Clear all form fields
  const handleClearForm = () => {
    setFormData(initialForm);
    setPhoneNumber("");
    setErrors({});
    setSuccessMessage("");
    setIsEditing(true);
  };

  // ✅ Toggle edit mode
  const handleToggleEdit = () => {
    setIsEditing((prev) => !prev);
  };

  // ✅ Submit Profile
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});
    setSuccessMessage("");

    try {
      const data = new FormData();
      for (const key in formData) {
        if (key === "socialLinks") {
          data.append(key, JSON.stringify(formData[key]));
        } else if (key === "gallery" && Array.isArray(formData.gallery)) {
          formData.gallery.forEach((file) => data.append("gallery", file));
        } else if (key === "profileImage" && formData.profileImage instanceof File) {
          data.append("profileImage", formData.profileImage);
        } else {
          data.append(key, formData[key]);
        }
      }

      const res = await api.post("/planner-profile/create", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setSuccessMessage("✅ Planner profile saved successfully!");
      console.log("✅ Created planner profile:", res.data);
      setIsEditing(false);
    } catch (err) {
      console.error("❌ Error creating planner profile:", err.response?.data || err);
      setErrors({ submit: err.response?.data?.message || "Failed to create profile." });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render active tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case "basic":
        return (
          <div className="space-y-6">
            <ProfileImageSection
              formData={formData}
              setFormData={setFormData}
              errors={errors}
              profileInputRef={profileInputRef}
              disabled={!isEditing}
              compact={true}
            />
            <PersonalDetails
              formData={formData}
              setFormData={setFormData}
              errors={errors}
              countries={countries}
              phoneCode={phoneCode}
              phoneNumber={phoneNumber}
              setPhoneCode={setPhoneCode}
              setPhoneNumber={setPhoneNumber}
              handlePhoneChange={handlePhoneChange}
              disabled={!isEditing}
              compact={true}
            />
          </div>
        );
      case "professional":
        return (
          <ProfessionalDetails
            formData={formData}
            setFormData={setFormData}
            errors={errors}
            disabled={!isEditing}
            compact={true}
          />
        );
      case "gallery":
        return (
          <GallerySection
            formData={formData}
            setFormData={setFormData}
            galleryInputRef={galleryInputRef}
            disabled={!isEditing}
            compact={true}
          />
        );
      case "location":
        return (
          <LocationSection
            formData={formData}
            setFormData={setFormData}
            countries={countries}
            states={states}
            disabled={!isEditing}
            compact={true}
          />
        );
      case "social":
        return (
          <SocialLinksSection
            formData={formData}
            setFormData={setFormData}
            disabled={!isEditing}
            compact={true}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Compact Header */}
      <div className="bg-gradient-to-r from-brand-navy to-brand-charcoal px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Profile Setup</h1>
            <p className="text-brand-gold/80 text-sm mt-1">
              {isEditing ? "Edit your profile information" : "Profile view mode"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-brand-ivory/80 bg-brand-charcoal/50 px-2 py-1 rounded">
              {formData.gallery.length}/10 photos
            </span>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          {isEditing ? (
            <Edit3 size={16} className="text-blue-600" />
          ) : (
            <Eye size={16} className="text-green-600" />
          )}
          <span>{isEditing ? "Editing Mode" : "View Mode"}</span>
        </div>
        
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleToggleEdit}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              isEditing 
                ? "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300" 
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            {isEditing ? <XCircle size={16} /> : <Edit3 size={16} />}
            {isEditing ? "Cancel" : "Edit"}
          </button>

          {isEditing && (
            <button
              type="button"
              onClick={handleClearForm}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 text-sm font-medium transition-all"
            >
              <Trash2 size={16} /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 bg-white">
        <div className="flex overflow-x-auto px-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-brand-gold text-brand-navy bg-brand-gold/5"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        <form onSubmit={handleSubmit}>
          {/* Tab Content */}
          <div className="min-h-[400px]">
            {renderTabContent()}
          </div>

          {/* Messages */}
          <div className="mt-6 space-y-2">
            {errors.submit && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm">{errors.submit}</p>
              </div>
            )}
            {successMessage && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-700 text-sm">{successMessage}</p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {isEditing && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <ActionButtons 
                isLoading={isSubmitting} 
                compact={true}
                onSave={() => handleSubmit({ preventDefault: () => {} })}
              />
            </div>
          )}
        </form>
      </div>

      {/* Quick Stats Footer */}
      <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
        <div className="flex justify-between items-center text-xs text-gray-500">
          <div className="flex gap-4">
            <span>📸 {formData.gallery.length} photos</span>
            <span>📍 {formData.country || "No country"}</span>
            <span>🎯 {formData.specialization || "No specialization"}</span>
          </div>
          <div>
            {isEditing ? (
              <span className="text-orange-600">• Editing</span>
            ) : (
              <span className="text-green-600">• Saved</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}