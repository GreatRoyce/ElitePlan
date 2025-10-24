import React, { useState, useEffect } from "react";
import api from "../../utils/axios";
import { Camera, Save, X, Upload, Edit, Edit3 } from "lucide-react";

function ProfileForm({ user, onClose, onUpdate }) {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    phone: "",
    bio: "",
    location: "",
    website: "",
    instagram: "",
    facebook: "",
    twitter: ""
  });
  
  const [profileImage, setProfileImage] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [originalData, setOriginalData] = useState({});
  const [hasChanges, setHasChanges] = useState(false);

  // Load user data
  useEffect(() => {
    const loadUserData = async () => {
      setLoading(true);
      try {
        const { data } = await api.get("/auth/me");
        const userData = data.data;
        
        const userFormData = {
          username: userData.username || "",
          email: userData.email || "",
          phone: userData.phone || "",
          bio: userData.bio || "",
          location: userData.location || "",
          website: userData.website || "",
          instagram: userData.instagram || "",
          facebook: userData.facebook || "",
          twitter: userData.twitter || ""
        };
        
        setFormData(userFormData);
        setOriginalData(userFormData);
        
        if (userData.profileImage) {
          const baseUrl = api.defaults.baseURL.replace("/api/v1", "");
          setProfileImage(`${baseUrl}/${userData.profileImage.replace(/\\/g, "/")}`);
        }
        
        if (userData.coverImage) {
          const baseUrl = api.defaults.baseURL.replace("/api/v1", "");
          setCoverImage(`${baseUrl}/${userData.coverImage.replace(/\\/g, "/")}`);
        }
      } catch (error) {
        console.error("Error loading user data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [user]);

  // Check for changes
  useEffect(() => {
    const hasFormChanges = JSON.stringify(formData) !== JSON.stringify(originalData);
    setHasChanges(hasFormChanges);
  }, [formData, originalData]);

  const handleInputChange = (e) => {
    if (!editMode) return;
    
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageUpload = async (e, type) => {
    if (!editMode) return;
    
    const file = e.target.files[0];
    if (!file) return;

    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      alert("Please upload a valid image file (JPEG, PNG, or WebP)");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Image size must be less than 5MB");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const { data } = await api.post("/upload/single", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      if (data.success) {
        if (type === "profile") {
          setProfileImage(data.fileUrl);
        } else {
          setCoverImage(data.fileUrl);
        }
        setHasChanges(true);
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!editMode) {
      setEditMode(true);
      return;
    }

    setSaving(true);
    try {
      const updateData = {
        ...formData,
        profileImage: profileImage ? profileImage.split("/").pop() : undefined,
        coverImage: coverImage ? coverImage.split("/").pop() : undefined
      };

      const { data } = await api.put("/auth/profile", updateData);
      
      if (data.success) {
        setOriginalData(formData);
        setHasChanges(false);
        setEditMode(false);
        onUpdate?.(data.data);
        // Don't close automatically - let user see the saved state
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (editMode && hasChanges) {
      const confirmCancel = window.confirm(
        "You have unsaved changes. Are you sure you want to cancel?"
      );
      if (!confirmCancel) return;
    }
    
    if (editMode) {
      setFormData(originalData);
      setEditMode(false);
      setHasChanges(false);
    } else {
      onClose();
    }
  };

  const handleEditToggle = () => {
    setEditMode(!editMode);
  };

  const getInputClasses = (isDisabled = false) => {
    const baseClasses = "w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-brand-emerald focus:border-transparent outline-none transition-all duration-200";
    
    if (isDisabled) {
      return `${baseClasses} bg-gray-100 text-gray-500 cursor-not-allowed`;
    }
    
    return editMode 
      ? `${baseClasses} border-gray-300 bg-white`
      : `${baseClasses} border-transparent bg-gray-50 text-gray-700`;
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-emerald mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gradient-to-r from-brand-ivory to-white">
          <div className="flex items-center gap-3">
            <div>
              <h2 className="text-2xl font-bold text-brand-navy">Profile Information</h2>
              <p className="text-gray-600 mt-1">
                {editMode ? "Edit your personal information" : "View your profile details"}
              </p>
            </div>
            {!editMode && (
              <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                <Edit3 size={14} />
                View Mode
              </div>
            )}
            {editMode && (
              <div className="flex items-center gap-2 px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
                <Edit3 size={14} />
                Edit Mode
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!editMode && (
              <button
                onClick={handleEditToggle}
                className="flex items-center gap-2 px-4 py-2 bg-brand-emerald text-white rounded-xl font-semibold hover:bg-emerald-600 transition-colors"
              >
                <Edit size={16} />
                Edit Profile
              </button>
            )}
            <button
              onClick={handleCancel}
              className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
            >
              <X size={20} className="text-gray-600" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[70vh]">
          {/* Cover & Profile Images */}
          <div className="mb-8">
            {/* Cover Image */}
            <div className="relative h-32 bg-gradient-to-r from-brand-royal to-brand-emerald rounded-xl mb-16">
              {coverImage && (
                <img
                  src={coverImage}
                  alt="Cover"
                  className="w-full h-full object-cover rounded-xl"
                />
              )}
              {editMode && (
                <label className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg p-2 cursor-pointer hover:bg-white transition-colors shadow-lg">
                  <Upload size={16} className="text-gray-600" />
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, "cover")}
                    disabled={uploading || !editMode}
                  />
                </label>
              )}

              {/* Profile Image */}
              <div className="absolute -bottom-8 left-6">
                <div className="relative">
                  <div className="w-24 h-24 rounded-2xl border-4 border-white bg-gray-200 shadow-lg overflow-hidden">
                    {profileImage ? (
                      <img
                        src={profileImage}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-brand-gold to-yellow-400 flex items-center justify-center text-white font-bold text-2xl">
                        {user?.username?.charAt(0)?.toUpperCase() || "U"}
                      </div>
                    )}
                  </div>
                  {/* Camera icon only appears in edit mode */}
                  {editMode && (
                    <label className="absolute -bottom-2 -right-2 bg-brand-emerald text-white p-1.5 rounded-full cursor-pointer hover:bg-emerald-600 transition-colors shadow-lg">
                      <Camera size={14} />
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, "profile")}
                        disabled={uploading || !editMode}
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Form Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-brand-navy border-b pb-2">Basic Information</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  className={getInputClasses()}
                  placeholder="Enter your username"
                  readOnly={!editMode}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={getInputClasses(true)}
                  disabled
                />
                <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className={getInputClasses()}
                  placeholder="Your phone number"
                  readOnly={!editMode}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  className={getInputClasses()}
                  placeholder="City, Country"
                  readOnly={!editMode}
                />
              </div>
            </div>

            {/* Additional Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-brand-navy border-b pb-2">Additional Information</h3>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleInputChange}
                  rows={4}
                  className={getInputClasses()}
                  placeholder="Tell us about yourself..."
                  readOnly={!editMode}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Website</label>
                <input
                  type="url"
                  name="website"
                  value={formData.website}
                  onChange={handleInputChange}
                  className={getInputClasses()}
                  placeholder="https://example.com"
                  readOnly={!editMode}
                />
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Instagram</label>
                  <input
                    type="text"
                    name="instagram"
                    value={formData.instagram}
                    onChange={handleInputChange}
                    className={getInputClasses()}
                    placeholder="@username"
                    readOnly={!editMode}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Facebook</label>
                  <input
                    type="text"
                    name="facebook"
                    value={formData.facebook}
                    onChange={handleInputChange}
                    className={getInputClasses()}
                    placeholder="username"
                    readOnly={!editMode}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Twitter</label>
                  <input
                    type="text"
                    name="twitter"
                    value={formData.twitter}
                    onChange={handleInputChange}
                    className={getInputClasses()}
                    placeholder="@username"
                    readOnly={!editMode}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-between items-center pt-6 mt-8 border-t border-gray-100">
            <div className="text-sm text-gray-500">
              {hasChanges && editMode && (
                <span className="flex items-center gap-2 text-orange-600">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  You have unsaved changes
                </span>
              )}
            </div>
            
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleCancel}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
              >
                {editMode ? 'Cancel' : 'Close'}
              </button>
              
              <button
                type="submit"
                disabled={saving || uploading || (editMode && !hasChanges)}
                className="flex items-center gap-2 px-6 py-3 bg-brand-emerald text-white rounded-xl font-semibold hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Saving...
                  </>
                ) : editMode ? (
                  <>
                    <Save size={16} />
                    Save Changes
                  </>
                ) : (
                  <>
                    <Edit size={16} />
                    Edit Profile
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ProfileForm;