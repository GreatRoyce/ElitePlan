// src/components/PlannerPieces/Profile.jsx
import React, { useEffect, useState, useRef } from "react";
import {
  Users,
  Camera,
  XCircle,
  Edit3,
  Save,
  Eye,
  Link as LinkIcon,
  Briefcase,
  Upload,
  Trash2,
  Image as ImageIcon,
  MapPin,
  Award,
  Globe,
  Mic,
} from "lucide-react";
import { FaLocationDot } from "react-icons/fa6";
import api from "../../../utils/axios";

// ✅ Helper to construct full image URL
const getImageUrl = (path) => {
  if (!path) return null;
  if (path.startsWith("http") || path.startsWith("blob:")) return path;
  return `${api.defaults.baseURL.replace("/api/v1", "")}/${path}`;
};

export default function Profile() {
  const [formData, setFormData] = useState(null);
  const [draftData, setDraftData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");
  const [successMessage, setSuccessMessage] = useState("");
  const [uploading, setUploading] = useState(false);

  const profileInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  const tabs = [
    { id: "basic", label: "Basic Info", icon: <Users size={16} /> },
    {
      id: "professional",
      label: "Professional",
      icon: <Briefcase size={16} />,
    },
    { id: "services", label: "Services", icon: <Award size={16} /> },
    { id: "gallery", label: "Gallery", icon: <ImageIcon size={16} /> },
    { id: "location", label: "Location", icon: <FaLocationDot size={16} /> },
    { id: "social", label: "Social", icon: <LinkIcon size={16} /> },
  ];

  // ✅ Specialization options from schema
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

  // ✅ Planner type options from schema
  const plannerTypeOptions = [
    { value: "corporate", label: "Corporate" },
    { value: "wedding", label: "Wedding" },
    { value: "social", label: "Social" },
    { value: "non-profit", label: "Non-Profit" },
    { value: "other", label: "Other" },
  ];

  // ✅ Event types from schema
  const eventTypeOptions = [
    "Conferences",
    "Concerts",
    "Product Launches",
    "Weddings",
    "Festivals",
    "Workshops",
    "Private Parties",
    "Award Ceremonies",
    "Other",
  ];

  // ✅ Language options from schema
  const languageOptions = [
    "English",
    "French",
    "Spanish",
    "Arabic",
    "Yoruba",
    "Igbo",
    "Hausa",
    "Swahili",
    "Other",
  ];

  // ✅ Vendor category options from schema
  const vendorCategoryOptions = [
    "Catering",
    "Photography",
    "Decoration",
    "Entertainment",
    "Logistics",
    "Venue",
    "Security",
    "Rentals",
    "Makeup",
    "Fashion",
    "Other",
  ];

  // ✅ Fetch planner profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get("/planner-profile/me");
        if (res.data.data) {
          setFormData(res.data.data);
          setDraftData(res.data.data);
        } else {
          // Initialize with schema-compliant empty state
          setDraftData({
            fullName: "",
            email: "",
            phonePrimary: "",
            companyName: "",
            profileImage: null,
            gallery: [],
            specialization: [],
            yearsExperience: "",
            shortBio: "",
            plannerType: "",
            country: "Nigeria",
            state: "",
            tagline: "",
            serviceRegions: [],
            eventTypesHandled: [],
            languagesSpoken: [],
            preferredVendorCategories: [],
            certifications: [],
            socialLinks: {
              facebook: "",
              instagram: "",
              tiktok: "",
              linkedin: "",
              twitter: "",
            },
            ongoingProjects: 0,
          });
          setIsEditing(true);
        }
      } catch (err) {
        setErrors({
          fetch: err.response?.data?.message || "Failed to fetch profile",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleToggleEdit = () => {
    setDraftData(formData || draftData);
    setIsEditing(!isEditing);
    setSuccessMessage("");
    setErrors({});
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const keys = name.split(".");
    setDraftData((prev) => {
      if (keys.length === 1) return { ...prev, [name]: value };
      const newDraft = { ...prev };
      let current = newDraft;
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] };
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      return newDraft;
    });
  };

  // ✅ Handle array field changes (specialization, eventTypesHandled, etc.)
  const handleArrayFieldChange = (fieldName, value) => {
    setDraftData((prev) => ({
      ...prev,
      [fieldName]: value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    }));
  };

  // ✅ Handle multi-select changes
  const handleMultiSelectChange = (fieldName, option, isChecked) => {
    setDraftData((prev) => {
      const currentArray = prev[fieldName] || [];
      const updatedArray = isChecked
        ? [...currentArray, option]
        : currentArray.filter((item) => item !== option);
      return { ...prev, [fieldName]: updatedArray };
    });
  };

  // ✅ Upload Profile Image
  const handleProfileImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErrors({ image: "Please upload an image file" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrors({ image: "Image must be less than 5MB" });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("profileImage", file);
      const res = await api.post("/upload/profile-image", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setDraftData((prev) => ({
        ...prev,
        profileImage: res.data.data.profileImage,
      }));
      setSuccessMessage("✅ Profile image uploaded successfully!");
    } catch (err) {
      setErrors({
        image: err.response?.data?.message || "Failed to upload image",
      });
    } finally {
      setUploading(false);
    }
  };

  // ✅ Upload Gallery Images
  const handleGalleryUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    const validImages = files.filter((f) => f.type.startsWith("image/"));
    if (validImages.some((f) => f.size > 5 * 1024 * 1024)) {
      setErrors({ gallery: "Some images exceed 5MB limit" });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      validImages.forEach((file) => formData.append("gallery", file));
      const res = await api.post("/upload/gallery", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const newImages = res.data.data.gallery;
      setDraftData((prev) => ({
        ...prev,
        gallery: [...(prev.gallery || []), ...newImages],
      }));
      setSuccessMessage(`✅ ${newImages.length} image(s) added to gallery!`);
      galleryInputRef.current.value = "";
    } catch (err) {
      setErrors({
        gallery: err.response?.data?.message || "Failed to upload images",
      });
    } finally {
      setUploading(false);
    }
  };

  // ✅ Remove gallery image
  const removeGalleryImage = (index) => {
    setDraftData((prev) => ({
      ...prev,
      gallery: prev.gallery.filter((_, i) => i !== index),
    }));
  };

  // ✅ Save Profile
  const handleSave = async () => {
    try {
      const res = await api.put("/planner-profile/update/me", draftData);
      setFormData(res.data.data);
      setDraftData(res.data.data);
      setIsEditing(false);
      setSuccessMessage("✅ Profile saved successfully!");
    } catch (err) {
      setErrors({
        submit: err.response?.data?.message || "Failed to save profile",
      });
    }
  };

  const hasUnsavedChanges =
    isEditing && JSON.stringify(draftData) !== JSON.stringify(formData);

  if (loading)
    return <p className="text-charcoal">Loading planner profile...</p>;
  if (errors.fetch) return <p className="text-royal">Error: {errors.fetch}</p>;
  if (!draftData) return <p className="text-charcoal">Loading draft...</p>;

  const activeData = draftData;

  const getInputClasses = (editable) => {
    const base = "border p-2 w-full rounded-md transition-colors";
    return editable
      ? `${base} bg-ivory border-gold focus:ring-2 focus:ring-emerald focus:border-emerald`
      : `${base} bg-gray-50 border-gray-200 text-charcoal cursor-default`;
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-ivory rounded-xl shadow-lg border border-gold">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-navy/20">
        <div>
          <h2 className="text-2xl font-bold text-navy">Planner Profile</h2>
          <div
            className={`flex items-center gap-2 mt-1 text-sm font-medium ${
              isEditing ? "text-emerald" : "text-gold"
            }`}
          >
            {isEditing ? <Edit3 size={16} /> : <Eye size={16} />}
            <span>{isEditing ? "Editing Mode" : "View Mode"}</span>
            {hasUnsavedChanges && (
              <span className="text-royal">• Unsaved Changes</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isEditing && formData && (
            <button
              onClick={handleToggleEdit}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-charcoal bg-gray-100 rounded-lg hover:bg-gray-200 border border-charcoal/20"
            >
              <XCircle size={16} />
              Cancel
            </button>
          )}
          <button
            onClick={isEditing ? handleSave : handleToggleEdit}
            disabled={isEditing && !hasUnsavedChanges}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-ivory bg-navy rounded-lg hover:bg-emerald disabled:bg-charcoal/30 disabled:cursor-not-allowed"
          >
            {isEditing ? <Save size={16} /> : <Edit3 size={16} />}
            {isEditing ? "Save Profile" : "Edit Profile"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-navy/20">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === tab.id
                ? "bg-navy text-gold"
                : "text-charcoal hover:bg-navy/10"
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div>
        {/* Basic Info */}
        {activeTab === "basic" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Profile Image Upload */}
            <div className="md:col-span-2">
              <label className="font-medium text-navy mb-2 block">
                Profile Image
              </label>
              <div className="flex items-center gap-4">
                <div className="w-24 h-24 rounded-full border-2 border-gold bg-gray-100 flex items-center justify-center overflow-hidden">
                  {activeData.profileImage &&
                  !activeData.profileImage.startsWith("blob:") ? (
                    <img
                      src={getImageUrl(activeData.profileImage)}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Camera size={32} className="text-charcoal/40" />
                  )}
                </div>

                {isEditing && (
                  <div className="flex-1">
                    <input
                      type="file"
                      ref={profileInputRef}
                      onChange={handleProfileImageUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    <button
                      onClick={() => profileInputRef.current?.click()}
                      disabled={uploading}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-navy bg-gold rounded-lg hover:bg-gold/80 disabled:bg-charcoal/30 disabled:cursor-not-allowed transition-colors"
                    >
                      <Upload size={16} />
                      {uploading ? "Uploading..." : "Upload Profile Image"}
                    </button>
                    <p className="text-sm text-charcoal mt-1">
                      JPG, PNG, max 5MB
                    </p>
                  </div>
                )}
              </div>
              {errors.image && (
                <p className="text-royal text-sm mt-1">{errors.image}</p>
              )}
            </div>

            <div>
              <label className="font-medium text-navy">Full Name *</label>
              <input
                type="text"
                name="fullName"
                value={activeData.fullName || ""}
                readOnly={!isEditing}
                onChange={handleInputChange}
                className={getInputClasses(isEditing)}
                required
              />
            </div>

            <div>
              <label className="font-medium text-navy">Email *</label>
              <input
                type="email"
                name="email"
                value={activeData.email || ""}
                readOnly
                className={getInputClasses(false)}
              />
            </div>

            <div>
              <label className="font-medium text-navy">Phone</label>
              <input
                type="text"
                name="phonePrimary"
                value={activeData.phonePrimary || ""}
                readOnly={!isEditing}
                onChange={handleInputChange}
                className={getInputClasses(isEditing)}
              />
            </div>

            <div>
              <label className="font-medium text-navy">Company Name *</label>
              <input
                type="text"
                name="companyName"
                value={activeData.companyName || ""}
                readOnly={!isEditing}
                onChange={handleInputChange}
                className={getInputClasses(isEditing)}
                required
              />
            </div>

            <div>
              <label className="font-medium text-navy">
                Tagline <span className="text-red-900 text-md">*</span> -{" "}
                <span className="italic text-black/50">
                  (50 characters max)
                </span>
              </label>
              <textarea
                type="text"
                name="tagline"
                maxLength={50}
                value={activeData.tagline || ""}
                readOnly={!isEditing}
                onChange={handleInputChange}
                className={getInputClasses(isEditing)}
                placeholder="Brief description of your business"
                required
              />
              <div className="flex justify-between text-sm mt-1">
                <span className="text-charcoal/60">
                  {activeData.tagline?.length || 0}/50 characters
                </span>
                {isEditing && (activeData.tagline?.length || 0) > 100 && (
                  <span
                    className={`text-${
                      (activeData.tagline?.length || 0) >= 50 ? "royal" : "gold"
                    }`}
                  >
                    {(activeData.tagline?.length || 0) >= 50
                      ? "Character limit reached"
                      : "Approaching limit"}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Professional */}
        {activeTab === "professional" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="font-medium text-navy">
                  Years of Experience
                </label>
                <input
                  type="number"
                  name="yearsExperience"
                  value={activeData.yearsExperience || ""}
                  readOnly={!isEditing}
                  onChange={handleInputChange}
                  min="0"
                  className={getInputClasses(isEditing)}
                />
              </div>

              <div>
                <label className="font-medium text-navy">Planner Type</label>
                <select
                  name="plannerType"
                  value={activeData.plannerType || ""}
                  readOnly={!isEditing}
                  onChange={handleInputChange}
                  className={getInputClasses(isEditing)}
                >
                  <option value="">Select type</option>
                  {plannerTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="font-medium text-navy">Short Bio</label>
                <textarea
                  name="shortBio"
                  value={activeData.shortBio || ""}
                  readOnly={!isEditing}
                  onChange={handleInputChange}
                  className={getInputClasses(isEditing)}
                  rows={4}
                  maxLength={250}
                  placeholder="Brief description of your expertise (max 250 characters)"
                />
                <p className="text-sm text-charcoal mt-1">
                  {activeData.shortBio?.length || 0}/250 characters
                </p>
              </div>

              <div className="md:col-span-2">
                <label className="font-medium text-navy">Certifications</label>
                <input
                  type="text"
                  value={activeData.certifications?.join(", ") || ""}
                  readOnly={!isEditing}
                  onChange={(e) =>
                    handleArrayFieldChange("certifications", e.target.value)
                  }
                  className={getInputClasses(isEditing)}
                  placeholder="Enter certifications separated by commas"
                />
              </div>
            </div>

            {/* Specialization */}
            <div>
              <label className="font-medium text-navy mb-3 block">
                Specialization
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {specializationOptions.map((specialization) => {
                  const isChecked =
                    activeData.specialization?.includes(specialization);
                  return (
                    <label
                      key={specialization}
                      className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                        isChecked
                          ? "bg-emerald/10 border-emerald"
                          : "bg-gray-50 border-gray-200"
                      } ${!isEditing && "cursor-default"}`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) =>
                          handleMultiSelectChange(
                            "specialization",
                            specialization,
                            e.target.checked
                          )
                        }
                        disabled={!isEditing}
                        className="mr-2"
                      />
                      <span className="text-sm text-charcoal">
                        {specialization}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Services */}
        {activeTab === "services" && (
          <div className="space-y-6">
            {/* Event Types Handled */}
            <div>
              <label className="font-medium text-navy mb-3 block">
                Event Types Handled
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {eventTypeOptions.map((eventType) => {
                  const isChecked =
                    activeData.eventTypesHandled?.includes(eventType);
                  return (
                    <label
                      key={eventType}
                      className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                        isChecked
                          ? "bg-emerald/10 border-emerald"
                          : "bg-gray-50 border-gray-200"
                      } ${!isEditing && "cursor-default"}`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) =>
                          handleMultiSelectChange(
                            "eventTypesHandled",
                            eventType,
                            e.target.checked
                          )
                        }
                        disabled={!isEditing}
                        className="mr-2"
                      />
                      <span className="text-sm text-charcoal">{eventType}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Languages Spoken */}
            <div>
              <label className="font-medium text-navy mb-3 block">
                Languages Spoken
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {languageOptions.map((language) => {
                  const isChecked =
                    activeData.languagesSpoken?.includes(language);
                  return (
                    <label
                      key={language}
                      className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                        isChecked
                          ? "bg-emerald/10 border-emerald"
                          : "bg-gray-50 border-gray-200"
                      } ${!isEditing && "cursor-default"}`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) =>
                          handleMultiSelectChange(
                            "languagesSpoken",
                            language,
                            e.target.checked
                          )
                        }
                        disabled={!isEditing}
                        className="mr-2"
                      />
                      <span className="text-sm text-charcoal">{language}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Preferred Vendor Categories */}
            <div>
              <label className="font-medium text-navy mb-3 block">
                Preferred Vendor Categories
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {vendorCategoryOptions.map((category) => {
                  const isChecked =
                    activeData.preferredVendorCategories?.includes(category);
                  return (
                    <label
                      key={category}
                      className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                        isChecked
                          ? "bg-emerald/10 border-emerald"
                          : "bg-gray-50 border-gray-200"
                      } ${!isEditing && "cursor-default"}`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) =>
                          handleMultiSelectChange(
                            "preferredVendorCategories",
                            category,
                            e.target.checked
                          )
                        }
                        disabled={!isEditing}
                        className="mr-2"
                      />
                      <span className="text-sm text-charcoal">{category}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Gallery */}
        {activeTab === "gallery" && (
          <div className="space-y-6">
            {isEditing && (
              <div className="border-2 border-dashed border-gold rounded-lg p-6 text-center">
                <input
                  type="file"
                  ref={galleryInputRef}
                  onChange={handleGalleryUpload}
                  accept="image/*"
                  multiple
                  className="hidden"
                />
                <button
                  onClick={() => galleryInputRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-2 px-6 py-3 mx-auto text-lg font-semibold text-navy bg-gold rounded-lg hover:bg-gold/80 disabled:bg-charcoal/30 disabled:cursor-not-allowed transition-colors"
                >
                  <Upload size={20} />
                  {uploading ? "Uploading..." : "Upload Gallery Images"}
                </button>
                <p className="text-charcoal mt-2">
                  Select multiple images (JPG, PNG, max 5MB each)
                </p>
                {errors.gallery && (
                  <p className="text-royal text-sm mt-2">{errors.gallery}</p>
                )}
              </div>
            )}

            <div>
              <h3 className="font-medium text-navy mb-4">
                Gallery Images ({activeData.gallery?.length || 0})
              </h3>
              {!activeData.gallery?.length ? (
                <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                  <ImageIcon
                    size={48}
                    className="mx-auto text-charcoal/30 mb-3"
                  />
                  <p className="text-charcoal">No gallery images yet</p>
                  {!isEditing && (
                    <p className="text-sm text-charcoal/60 mt-1">
                      Switch to edit mode to upload images
                    </p>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeData.gallery.map((image, index) => (
                    <div
                      key={index}
                      className="border border-gold rounded-lg overflow-hidden bg-white"
                    >
                      <div className="aspect-square bg-gray-100 relative group">
                        <img
                          src={getImageUrl(image)}
                          alt={`Gallery ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        {isEditing && (
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button
                              onClick={() => removeGalleryImage(index)}
                              className="p-2 bg-royal text-ivory rounded-full hover:bg-royal/80 transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Location */}
        {activeTab === "location" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="font-medium text-navy">Country</label>
              <input
                type="text"
                name="country"
                value={activeData.country || "Nigeria"}
                readOnly={!isEditing}
                onChange={handleInputChange}
                className={getInputClasses(isEditing)}
              />
            </div>

            <div>
              <label className="font-medium text-navy">State</label>
              <input
                type="text"
                name="state"
                value={activeData.state || ""}
                readOnly={!isEditing}
                onChange={handleInputChange}
                className={getInputClasses(isEditing)}
              />
            </div>

            <div className="md:col-span-2">
              <label className="font-medium text-navy">Service Regions</label>
              <input
                type="text"
                value={activeData.serviceRegions?.join(", ") || ""}
                readOnly={!isEditing}
                onChange={(e) =>
                  handleArrayFieldChange("serviceRegions", e.target.value)
                }
                className={getInputClasses(isEditing)}
                placeholder="Enter regions separated by commas"
              />
            </div>
          </div>
        )}

        {/* Social */}
        {activeTab === "social" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="font-medium text-navy">Facebook</label>
              <input
                type="text"
                name="socialLinks.facebook"
                value={activeData.socialLinks?.facebook || ""}
                readOnly={!isEditing}
                onChange={handleInputChange}
                className={getInputClasses(isEditing)}
              />
            </div>

            <div>
              <label className="font-medium text-navy">Instagram</label>
              <input
                type="text"
                name="socialLinks.instagram"
                value={activeData.socialLinks?.instagram || ""}
                readOnly={!isEditing}
                onChange={handleInputChange}
                className={getInputClasses(isEditing)}
              />
            </div>

            <div>
              <label className="font-medium text-navy">TikTok</label>
              <input
                type="text"
                name="socialLinks.tiktok"
                value={activeData.socialLinks?.tiktok || ""}
                readOnly={!isEditing}
                onChange={handleInputChange}
                className={getInputClasses(isEditing)}
              />
            </div>

            <div>
              <label className="font-medium text-navy">LinkedIn</label>
              <input
                type="text"
                name="socialLinks.linkedin"
                value={activeData.socialLinks?.linkedin || ""}
                readOnly={!isEditing}
                onChange={handleInputChange}
                className={getInputClasses(isEditing)}
              />
            </div>

            <div>
              <label className="font-medium text-navy">Twitter</label>
              <input
                type="text"
                name="socialLinks.twitter"
                value={activeData.socialLinks?.twitter || ""}
                readOnly={!isEditing}
                onChange={handleInputChange}
                className={getInputClasses(isEditing)}
              />
            </div>

            <div>
              <label className="font-medium text-navy">Ongoing Projects</label>
              <input
                type="number"
                name="ongoingProjects"
                value={activeData.ongoingProjects || 0}
                readOnly={!isEditing}
                onChange={handleInputChange}
                min="0"
                className={getInputClasses(isEditing)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Feedback */}
      <div className="mt-6 space-y-2">
        {errors.submit && (
          <div className="p-3 bg-royal/10 border border-royal rounded-lg animate-fade-in">
            <p className="text-royal text-sm">{errors.submit}</p>
          </div>
        )}
        {successMessage && (
          <div className="p-3 bg-emerald/10 border border-emerald rounded-lg animate-fade-in">
            <p className="text-emerald text-sm">{successMessage}</p>
          </div>
        )}
      </div>
    </div>
  );
}
