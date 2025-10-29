// src/components/VendorPieces/VendorProfile.jsx
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
  Phone,
  Mail,
  Building,
} from "lucide-react";
import api from "../../../utils/axios";

// ✅ Helper to construct full image URL
const getImageUrl = (path) => {
  if (!path) return null;
  if (path.startsWith("http") || path.startsWith("blob:")) return path;
  return `${api.defaults.baseURL.replace("/api/v1", "")}/${path}`;
};

export default function VendorProfile({ initialProfileData, onProfileUpdate }) {
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
    { id: "location", label: "Location", icon: <MapPin size={16} /> },
    { id: "social", label: "Social", icon: <LinkIcon size={16} /> },
  ];

  // ✅ Vendor categories
  const vendorCategories = [
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

  // ✅ Service regions in Nigeria
  const nigerianStates = [
    "Lagos",
    "Abuja",
    "Rivers",
    "Delta",
    "Oyo",
    "Kano",
    "Kaduna",
    "Edo",
    "Plateau",
    "Ogun",
    "Ondo",
    "Enugu",
    "Anambra",
    "Imo",
    "Abia",
    "Cross River",
    "Akwa Ibom",
    "Bayelsa",
    "Niger",
    "Benue",
    "Bornu",
    "Adamawa",
    "Taraba",
    "Kwara",
    "Kogi",
    "Ekiti",
    "Osun",
    "Gombe",
    "Sokoto",
    "Kebbi",
    "Zamfara",
    "Katsina",
    "Jigawa",
    "Yobe",
    "Bauchi",
    "Nasarawa",
    "Ebonyi",
    "Bayelsa",
  ];

  // ✅ Fetch vendor profile
  useEffect(() => {
    if (initialProfileData) {
      setFormData(initialProfileData);
      setDraftData(initialProfileData);
    } else {
      // Initialize empty profile if no initial data is provided
      setDraftData({
        businessName: "",
        contactEmail: "",
        phoneNumber: "",
        businessAddress: "",
        profileImage: null,
        gallery: [],
        vendorCategory: "",
        yearsInBusiness: "",
        description: "",
        serviceAreas: [],
        pricingTier: "",
        socialLinks: { facebook: "", instagram: "", twitter: "", website: "" },
        certifications: [],
        isVerified: false,
      });
      setIsEditing(true); // Start in edit mode for new profiles
    }
    setLoading(false);
  }, [initialProfileData]);

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

  // ✅ Handle array fields
  const handleArrayFieldChange = (fieldName, value) => {
    setDraftData((prev) => ({
      ...prev,
      [fieldName]: value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    }));
  };

  // ✅ Handle multi-select for service areas
  const handleServiceAreaChange = (area, isChecked) => {
    setDraftData((prev) => {
      const currentAreas = prev.serviceAreas || [];
      const updatedAreas = isChecked
        ? [...currentAreas, area]
        : currentAreas.filter((a) => a !== area);
      return { ...prev, serviceAreas: updatedAreas };
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
      const res = await api.post("/upload-vendor/profile-image", formData, {
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
      const res = await api.post("/upload-vendor/gallery", formData, {
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
      const res = await api.put("/vendor-profile/update/me", draftData);
      setFormData(res.data.data);
      setDraftData(res.data.data);
      setIsEditing(false);
      onProfileUpdate(res.data.data); // Update parent state
      setSuccessMessage("✅ Profile saved successfully!");
    } catch (err) {
      setErrors({
        submit: err.response?.data?.message || "Failed to save profile",
      });
    }
  };

  // ✅ Delete Profile
  const handleDeleteProfile = async () => {
    if (
      window.confirm(
        "Are you sure you want to delete your profile? This action cannot be undone."
      )
    ) {
      try {
        await api.delete("/vendor-profile/delete/me");
        setSuccessMessage("✅ Profile deleted successfully!");
        // Redirect to home or login
        setTimeout(() => (window.location.href = "/"), 2000);
      } catch (err) {
        setErrors({
          submit: err.response?.data?.message || "Failed to delete profile",
        });
      }
    }
  };

  const hasUnsavedChanges =
    isEditing && JSON.stringify(draftData) !== JSON.stringify(formData);

  if (loading)
    return <p className="text-charcoal">Loading vendor profile...</p>;
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
    <div className="max-w-6xl mx-auto p-6 bg-ivory rounded-xl shadow-lg border border-gold">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-navy/20">
        <div>
          <h2 className="text-2xl font-bold text-navy">Vendor Profile</h2>
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
          {isEditing && (
            <button
              onClick={handleDeleteProfile}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-ivory bg-royal rounded-lg hover:bg-royal/80 transition-colors"
            >
              <Trash2 size={16} />
              Delete Profile
            </button>
          )}

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
      <div className="flex gap-1 mb-6 border-b border-navy/20 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap ${
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
                Business Logo/Image
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
                      {uploading ? "Uploading..." : "Upload Business Image"}
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
              <label className="font-medium text-navy">Business Name *</label>
              <input
                type="text"
                name="businessName"
                value={activeData.businessName || ""}
                readOnly={!isEditing}
                onChange={handleInputChange}
                className={getInputClasses(isEditing)}
                required
              />
            </div>

            <div>
              <label className="font-medium text-navy">Contact Email *</label>
              <input
                type="email"
                name="contactEmail"
                value={activeData.contactEmail || ""}
                readOnly={!isEditing}
                onChange={handleInputChange}
                className={getInputClasses(isEditing)}
                required
              />
            </div>

            <div>
              <label className="font-medium text-navy">Phone Number *</label>
              <input
                type="text"
                name="phoneNumber"
                value={activeData.phoneNumber || ""}
                readOnly={!isEditing}
                onChange={handleInputChange}
                className={getInputClasses(isEditing)}
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="font-medium text-navy">Business Address</label>
              <textarea
                name="businessAddress"
                value={activeData.businessAddress || ""}
                readOnly={!isEditing}
                onChange={handleInputChange}
                className={getInputClasses(isEditing)}
                rows={3}
              />
            </div>
          </div>
        )}

        {/* Professional */}
        {activeTab === "professional" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="font-medium text-navy">
                  Vendor Category *
                </label>
                <select
                  name="vendorCategory"
                  value={activeData.vendorCategory || ""}
                  readOnly={!isEditing}
                  onChange={handleInputChange}
                  className={getInputClasses(isEditing)}
                  required
                >
                  <option value="">Select category</option>
                  {vendorCategories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-medium text-navy">
                  Years in Business
                </label>
                <input
                  type="number"
                  name="yearsInBusiness"
                  value={activeData.yearsInBusiness || ""}
                  readOnly={!isEditing}
                  onChange={handleInputChange}
                  min="0"
                  className={getInputClasses(isEditing)}
                />
              </div>

              <div>
                <label className="font-medium text-navy">Pricing Tier</label>
                <select
                  name="pricingTier"
                  value={activeData.pricingTier || ""}
                  readOnly={!isEditing}
                  onChange={handleInputChange}
                  className={getInputClasses(isEditing)}
                >
                  <option value="">Select tier</option>
                  <option value="budget">Budget</option>
                  <option value="standard">Standard</option>
                  <option value="premium">Premium</option>
                  <option value="luxury">Luxury</option>
                </select>
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

              <div className="md:col-span-2">
                <label className="font-medium text-navy">
                  Business Description
                </label>
                <textarea
                  name="description"
                  value={activeData.description || ""}
                  readOnly={!isEditing}
                  onChange={handleInputChange}
                  className={getInputClasses(isEditing)}
                  rows={4}
                  placeholder="Describe your business, services, and what makes you unique..."
                />
              </div>
            </div>
          </div>
        )}

        {/* Services */}
        {activeTab === "services" && (
          <div className="space-y-6">
            <div>
              <label className="font-medium text-navy mb-3 block">
                Service Areas
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto p-2">
                {nigerianStates.map((state) => {
                  const isChecked = activeData.serviceAreas?.includes(state);
                  return (
                    <label
                      key={state}
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
                          handleServiceAreaChange(state, e.target.checked)
                        }
                        disabled={!isEditing}
                        className="mr-2"
                      />
                      <span className="text-sm text-charcoal">{state}</span>
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
                Portfolio Images ({activeData.gallery?.length || 0})
              </h3>
              {!activeData.gallery?.length ? (
                <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                  <ImageIcon
                    size={48}
                    className="mx-auto text-charcoal/30 mb-3"
                  />
                  <p className="text-charcoal">No portfolio images yet</p>
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
                          alt={`Portfolio ${index + 1}`}
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
            <div className="md:col-span-2">
              <label className="font-medium text-navy">
                Primary Service State
              </label>
              <select
                name="state"
                value={activeData.state || ""}
                readOnly={!isEditing}
                onChange={handleInputChange}
                className={getInputClasses(isEditing)}
              >
                <option value="">Select state</option>
                {nigerianStates.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <h4 className="font-medium text-navy mb-3">Service Coverage</h4>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-charcoal mb-2">
                  Selected service areas: {activeData.serviceAreas?.length || 0}{" "}
                  states
                </p>
                {activeData.serviceAreas?.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {activeData.serviceAreas.map((area) => (
                      <span
                        key={area}
                        className="px-3 py-1 bg-emerald/20 text-emerald rounded-full text-sm"
                      >
                        {area}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Social */}
        {activeTab === "social" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="font-medium text-navy">Website</label>
              <input
                type="url"
                name="socialLinks.website"
                value={activeData.socialLinks?.website || ""}
                readOnly={!isEditing}
                onChange={handleInputChange}
                className={getInputClasses(isEditing)}
                placeholder="https://example.com"
              />
            </div>

            <div>
              <label className="font-medium text-navy">Facebook</label>
              <input
                type="url"
                name="socialLinks.facebook"
                value={activeData.socialLinks?.facebook || ""}
                readOnly={!isEditing}
                onChange={handleInputChange}
                className={getInputClasses(isEditing)}
                placeholder="https://facebook.com/yourpage"
              />
            </div>

            <div>
              <label className="font-medium text-navy">Instagram</label>
              <input
                type="url"
                name="socialLinks.instagram"
                value={activeData.socialLinks?.instagram || ""}
                readOnly={!isEditing}
                onChange={handleInputChange}
                className={getInputClasses(isEditing)}
                placeholder="https://instagram.com/yourprofile"
              />
            </div>

            <div>
              <label className="font-medium text-navy">Twitter</label>
              <input
                type="url"
                name="socialLinks.twitter"
                value={activeData.socialLinks?.twitter || ""}
                readOnly={!isEditing}
                onChange={handleInputChange}
                className={getInputClasses(isEditing)}
                placeholder="https://twitter.com/yourprofile"
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
