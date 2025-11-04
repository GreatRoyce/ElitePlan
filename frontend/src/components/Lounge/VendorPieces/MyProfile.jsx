// src/components/VendorPieces/Profile.jsx
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
  Video,
} from "lucide-react";
import { FaLocationDot } from "react-icons/fa6";
import api from "../../../utils/axios";

// ✅ Helper to construct full image URL
const getImageUrl = (path) => {
  if (!path) return null;
  if (path.startsWith("http") || path.startsWith("blob:")) return path;
  return `${api.defaults.baseURL.replace("/api/v1", "")}/${path}`;
};

export default function VendorProfile() {
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
  const portfolioInputRef = useRef(null);
  const introVideoInputRef = useRef(null);

  const tabs = [
    { id: "basic", label: "Basic Info", icon: <Users size={16} /> },
    {
      id: "professional",
      label: "Professional",
      icon: <Briefcase size={16} />,
    },
    { id: "services", label: "Services", icon: <ImageIcon size={16} /> },
    { id: "gallery", label: "Gallery", icon: <ImageIcon size={16} /> },
    { id: "portfolio", label: "Portfolio", icon: <ImageIcon size={16} /> },
    { id: "media", label: "Media", icon: <Video size={16} /> },
    { id: "location", label: "Location", icon: <FaLocationDot size={16} /> },
    { id: "social", label: "Social", icon: <LinkIcon size={16} /> },
  ];

  // ✅ Vendor category options
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

  // ✅ Fetch vendor profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = await api.get("/vendor-profile/me");
        console.log("Fetched profile:", res.data);
        
        if (res.data) {
          setFormData(res.data);
          setDraftData(res.data);
        } else {
          // Initialize with empty state if no profile exists
          const emptyProfile = {
            name: "",
            description: "",
            category: "",
            profileImage: null,
            gallery: [],
            portfolioImages: [],
            introVideo: null,
            // Additional fields for enhanced profile
            email: "",
            phone: "",
            companyName: "",
            yearsExperience: "",
            shortBio: "",
            vendorType: "",
            country: "Nigeria",
            state: "",
            tagline: "",
            serviceRegions: [],
            eventTypesServed: [],
            languagesSpoken: [],
            serviceTypes: [],
            certifications: [],
            socialLinks: {
              facebook: "",
              instagram: "",
              tiktok: "",
              linkedin: "",
              twitter: "",
            },
            pricingTier: "",
            teamSize: "",
          };
          setDraftData(emptyProfile);
          setIsEditing(true);
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
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
    if (isEditing && formData) {
      // Cancel editing - revert to original data
      setDraftData(formData);
    }
    setIsEditing(!isEditing);
    setSuccessMessage("");
    setErrors({});
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const keys = name.split(".");
    
    setDraftData((prev) => {
      if (!prev) return prev;
      
      if (keys.length === 1) {
        return { ...prev, [name]: value };
      }
      
      // Handle nested objects (like socialLinks.facebook)
      const newDraft = { ...prev };
      let current = newDraft;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {};
        }
        current[keys[i]] = { ...current[keys[i]] };
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      return newDraft;
    });
  };

  // ✅ Handle array field changes
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
      const uploadData = new FormData();
      uploadData.append("profileImage", file);
      
      const res = await api.put("/vendor-profile/update/me", uploadData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      
      setDraftData((prev) => ({
        ...prev,
        profileImage: res.data.profileImage,
      }));
      setFormData((prev) => ({
        ...prev,
        profileImage: res.data.profileImage,
      }));
      setSuccessMessage("✅ Profile image uploaded successfully!");
    } catch (err) {
      console.error("Error uploading profile image:", err);
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
    if (validImages.length === 0) {
      setErrors({ gallery: "Please select valid image files" });
      return;
    }
    
    if (validImages.some((f) => f.size > 5 * 1024 * 1024)) {
      setErrors({ gallery: "Some images exceed 5MB limit" });
      return;
    }

    setUploading(true);
    try {
      const uploadData = new FormData();
      validImages.forEach((file) => uploadData.append("gallery", file));
      
      const res = await api.put("/vendor-profile/update/me", uploadData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      
      // Merge new images with existing gallery
      const updatedGallery = [...(draftData.gallery || []), ...(res.data.gallery || [])];
      
      setDraftData((prev) => ({
        ...prev,
        gallery: updatedGallery,
      }));
      setFormData((prev) => ({
        ...prev,
        gallery: updatedGallery,
      }));
      
      setSuccessMessage(`✅ ${validImages.length} image(s) added to gallery!`);
      galleryInputRef.current.value = "";
    } catch (err) {
      console.error("Error uploading gallery images:", err);
      setErrors({
        gallery: err.response?.data?.message || "Failed to upload images",
      });
    } finally {
      setUploading(false);
    }
  };

  // ✅ Upload Portfolio Images
  const handlePortfolioUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    
    const validImages = files.filter((f) => f.type.startsWith("image/"));
    if (validImages.length === 0) {
      setErrors({ portfolio: "Please select valid image files" });
      return;
    }
    
    if (validImages.some((f) => f.size > 5 * 1024 * 1024)) {
      setErrors({ portfolio: "Some images exceed 5MB limit" });
      return;
    }

    setUploading(true);
    try {
      const uploadData = new FormData();
      validImages.forEach((file) => uploadData.append("portfolioImages", file));
      
      const res = await api.put("/vendor-profile/update/me", uploadData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      
      // Merge new images with existing portfolio
      const updatedPortfolio = [...(draftData.portfolioImages || []), ...(res.data.portfolioImages || [])];
      
      setDraftData((prev) => ({
        ...prev,
        portfolioImages: updatedPortfolio,
      }));
      setFormData((prev) => ({
        ...prev,
        portfolioImages: updatedPortfolio,
      }));
      
      setSuccessMessage(`✅ ${validImages.length} image(s) added to portfolio!`);
      portfolioInputRef.current.value = "";
    } catch (err) {
      console.error("Error uploading portfolio images:", err);
      setErrors({
        portfolio: err.response?.data?.message || "Failed to upload images",
      });
    } finally {
      setUploading(false);
    }
  };

  // ✅ Upload Intro Video
  const handleIntroVideoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith("video/")) {
      setErrors({ video: "Please upload a video file" });
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setErrors({ video: "Video must be less than 50MB" });
      return;
    }

    setUploading(true);
    try {
      const uploadData = new FormData();
      uploadData.append("introVideo", file);
      
      const res = await api.put("/vendor-profile/update/me", uploadData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      
      setDraftData((prev) => ({
        ...prev,
        introVideo: res.data.introVideo,
      }));
      setFormData((prev) => ({
        ...prev,
        introVideo: res.data.introVideo,
      }));
      setSuccessMessage("✅ Intro video uploaded successfully!");
    } catch (err) {
      console.error("Error uploading intro video:", err);
      setErrors({
        video: err.response?.data?.message || "Failed to upload video",
      });
    } finally {
      setUploading(false);
    }
  };

  // ✅ Remove gallery image
  const removeGalleryImage = async (index) => {
    try {
      // Create new gallery array without the removed image
      const updatedGallery = draftData.gallery.filter((_, i) => i !== index);
      
      // Update locally first for immediate UI feedback
      setDraftData((prev) => ({
        ...prev,
        gallery: updatedGallery,
      }));
      
      // Send update to server
      const res = await api.put("/vendor-profile/update/me", {
        gallery: updatedGallery
      });
      
      setFormData((prev) => ({
        ...prev,
        gallery: updatedGallery,
      }));
      
      setSuccessMessage("✅ Image removed from gallery!");
    } catch (err) {
      console.error("Error removing gallery image:", err);
      setErrors({
        gallery: "Failed to remove image from gallery",
      });
      // Revert local change if server update fails
      setDraftData((prev) => ({
        ...prev,
        gallery: formData.gallery,
      }));
    }
  };

  // ✅ Remove portfolio image
  const removePortfolioImage = async (index) => {
    try {
      // Create new portfolio array without the removed image
      const updatedPortfolio = draftData.portfolioImages.filter((_, i) => i !== index);
      
      // Update locally first for immediate UI feedback
      setDraftData((prev) => ({
        ...prev,
        portfolioImages: updatedPortfolio,
      }));
      
      // Send update to server
      const res = await api.put("/vendor-profile/update/me", {
        portfolioImages: updatedPortfolio
      });
      
      setFormData((prev) => ({
        ...prev,
        portfolioImages: updatedPortfolio,
      }));
      
      setSuccessMessage("✅ Image removed from portfolio!");
    } catch (err) {
      console.error("Error removing portfolio image:", err);
      setErrors({
        portfolio: "Failed to remove image from portfolio",
      });
      // Revert local change if server update fails
      setDraftData((prev) => ({
        ...prev,
        portfolioImages: formData.portfolioImages,
      }));
    }
  };

  // ✅ Save Profile (text data only)
  const handleSave = async () => {
    try {
      setUploading(true);
      
      // Prepare data for API - only send text fields
      const profileData = {
        name: draftData.name,
        description: draftData.description,
        category: draftData.category,
        // Include additional fields if they exist
        ...(draftData.email && { email: draftData.email }),
        ...(draftData.phone && { phone: draftData.phone }),
        ...(draftData.companyName && { companyName: draftData.companyName }),
        ...(draftData.yearsExperience && { yearsExperience: draftData.yearsExperience }),
        ...(draftData.shortBio && { shortBio: draftData.shortBio }),
        ...(draftData.vendorType && { vendorType: draftData.vendorType }),
        ...(draftData.country && { country: draftData.country }),
        ...(draftData.state && { state: draftData.state }),
        ...(draftData.tagline && { tagline: draftData.tagline }),
        ...(draftData.serviceRegions && { serviceRegions: draftData.serviceRegions }),
        ...(draftData.eventTypesServed && { eventTypesServed: draftData.eventTypesServed }),
        ...(draftData.languagesSpoken && { languagesSpoken: draftData.languagesSpoken }),
        ...(draftData.serviceTypes && { serviceTypes: draftData.serviceTypes }),
        ...(draftData.certifications && { certifications: draftData.certifications }),
        ...(draftData.socialLinks && { socialLinks: draftData.socialLinks }),
        ...(draftData.pricingTier && { pricingTier: draftData.pricingTier }),
        ...(draftData.teamSize && { teamSize: draftData.teamSize }),
      };

      console.log("Saving profile data:", profileData);
      
      const res = await api.put("/vendor-profile/update/me", profileData);
      console.log("Profile saved successfully:", res.data);

      setFormData(res.data);
      setDraftData(res.data);
      setIsEditing(false);
      setSuccessMessage("✅ Profile saved successfully!");
    } catch (err) {
      console.error("Error saving profile:", err);
      setErrors({
        submit: err.response?.data?.message || "Failed to save profile",
      });
    } finally {
      setUploading(false);
    }
  };

  const hasUnsavedChanges = isEditing && formData && 
    JSON.stringify(draftData) !== JSON.stringify(formData);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy"></div>
        <span className="ml-2 text-charcoal">Loading vendor profile...</span>
      </div>
    );
  }

  if (errors.fetch) {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-ivory rounded-xl shadow-lg border border-gold">
        <div className="text-center py-8">
          <div className="text-royal text-lg font-semibold mb-2">
            Error Loading Profile
          </div>
          <div className="text-charcoal">{errors.fetch}</div>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-navy text-ivory rounded-lg hover:bg-emerald"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!draftData) {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-ivory rounded-xl shadow-lg border border-gold">
        <div className="text-center py-8 text-charcoal">
          Unable to load profile data
        </div>
      </div>
    );
  }

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
          {isEditing && formData && (
            <button
              onClick={handleToggleEdit}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-charcoal bg-gray-100 rounded-lg hover:bg-gray-200 border border-charcoal/20 transition-colors"
            >
              <XCircle size={16} />
              Cancel
            </button>
          )}
          <button
            onClick={isEditing ? handleSave : handleToggleEdit}
            disabled={(isEditing && !hasUnsavedChanges) || uploading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-ivory bg-navy rounded-lg hover:bg-emerald disabled:bg-charcoal/30 disabled:cursor-not-allowed transition-colors"
          >
            {isEditing ? (
              uploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Save Profile
                </>
              )
            ) : (
              <>
                <Edit3 size={16} />
                Edit Profile
              </>
            )}
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
                Profile Image
              </label>
              <div className="flex items-center gap-4">
                <div className="w-24 h-24 rounded-full border-2 border-gold bg-gray-100 flex items-center justify-center overflow-hidden">
                  {activeData.profileImage ? (
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
              <label className="font-medium text-navy">Business Name *</label>
              <input
                type="text"
                name="name"
                value={activeData.name || ""}
                readOnly={!isEditing}
                onChange={handleInputChange}
                className={getInputClasses(isEditing)}
                required
              />
            </div>

            <div>
              <label className="font-medium text-navy">Category *</label>
              <select
                name="category"
                value={activeData.category || ""}
                readOnly={!isEditing}
                onChange={handleInputChange}
                className={getInputClasses(isEditing)}
                required
              >
                <option value="">Select category</option>
                {vendorCategoryOptions.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="font-medium text-navy">Description *</label>
              <textarea
                name="description"
                value={activeData.description || ""}
                readOnly={!isEditing}
                onChange={handleInputChange}
                className={getInputClasses(isEditing)}
                rows={4}
                placeholder="Describe your services and expertise"
                required
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
                <label className="font-medium text-navy">Vendor Type</label>
                <select
                  name="vendorType"
                  value={activeData.vendorType || ""}
                  readOnly={!isEditing}
                  onChange={handleInputChange}
                  className={getInputClasses(isEditing)}
                >
                  <option value="">Select type</option>
                  <option value="individual">Individual</option>
                  <option value="company">Company</option>
                  <option value="freelancer">Freelancer</option>
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

        {/* Portfolio */}
        {activeTab === "portfolio" && (
          <div className="space-y-6">
            {isEditing && (
              <div className="border-2 border-dashed border-gold rounded-lg p-6 text-center">
                <input
                  type="file"
                  ref={portfolioInputRef}
                  onChange={handlePortfolioUpload}
                  accept="image/*"
                  multiple
                  className="hidden"
                />
                <button
                  onClick={() => portfolioInputRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-2 px-6 py-3 mx-auto text-lg font-semibold text-navy bg-gold rounded-lg hover:bg-gold/80 disabled:bg-charcoal/30 disabled:cursor-not-allowed transition-colors"
                >
                  <Upload size={20} />
                  {uploading ? "Uploading..." : "Upload Portfolio Images"}
                </button>
                <p className="text-charcoal mt-2">
                  Select multiple images (JPG, PNG, max 5MB each)
                </p>
                {errors.portfolio && (
                  <p className="text-royal text-sm mt-2">{errors.portfolio}</p>
                )}
              </div>
            )}

            <div>
              <h3 className="font-medium text-navy mb-4">
                Portfolio Images ({activeData.portfolioImages?.length || 0})
              </h3>
              {!activeData.portfolioImages?.length ? (
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
                  {activeData.portfolioImages.map((image, index) => (
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
                              onClick={() => removePortfolioImage(index)}
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

        {/* Media */}
        {activeTab === "media" && (
          <div className="space-y-6">
            <div>
              <label className="font-medium text-navy mb-2 block">
                Intro Video
              </label>
              {activeData.introVideo ? (
                <div className="mb-4">
                  <video
                    controls
                    src={getImageUrl(activeData.introVideo)}
                    className="w-full max-w-md rounded-md border"
                  />
                </div>
              ) : (
                <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg mb-4">
                  <Video size={48} className="mx-auto text-charcoal/30 mb-3" />
                  <p className="text-charcoal">No intro video uploaded</p>
                </div>
              )}

              {isEditing && (
                <div>
                  <input
                    type="file"
                    ref={introVideoInputRef}
                    onChange={handleIntroVideoUpload}
                    accept="video/*"
                    className="hidden"
                  />
                  <button
                    onClick={() => introVideoInputRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-navy bg-gold rounded-lg hover:bg-gold/80 disabled:bg-charcoal/30 disabled:cursor-not-allowed transition-colors"
                  >
                    <Upload size={16} />
                    {uploading ? "Uploading..." : "Upload Intro Video"}
                  </button>
                  <p className="text-sm text-charcoal mt-1">
                    MP4, MOV, max 50MB
                  </p>
                  {errors.video && (
                    <p className="text-royal text-sm mt-1">{errors.video}</p>
                  )}
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
          </div>
        )}
      </div>

      {/* Feedback */}
      <div className="mt-6 space-y-2">
        {errors.submit && (
          <div className="p-3 bg-royal/10 border border-royal rounded-lg">
            <p className="text-royal text-sm">{errors.submit}</p>
          </div>
        )}
        {successMessage && (
          <div className="p-3 bg-emerald/10 border border-emerald rounded-lg">
            <p className="text-emerald text-sm">{successMessage}</p>
          </div>
        )}
      </div>
    </div>
  );
} 