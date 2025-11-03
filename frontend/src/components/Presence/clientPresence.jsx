import React, { useEffect, useState } from "react";
import {
  User,
  Calendar,
  Camera,
  Mail,
  Phone,
  Save,
  X,
  ZoomIn,
} from "lucide-react";
import api from "../../utils/axios";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";

function ClientPresence({ user, onClose, onProfileSaved }) {
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    alternatePhone: "",
    gender: "",
    dateOfBirth: "",
    imageCover: null,
    imagePreview: "",
    _id: null,
  });

  const [originalData, setOriginalData] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      logout();
      navigate("/");
    }
  };

  const handleLogoutWithDelay = async () => {
    setIsLoggingOut(true);
    setTimeout(async () => {
      await handleLogout();
      setIsLoggingOut(false);
    }, 3000); // 3-second delay as requested
  };

  // Fetch profile on mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get("/client-profile");
        if (res.data.success && res.data.data) {
          const profile = res.data.data;

          // Image preview logic
          let preview = "";
          if (profile.imageCover) {
            if (profile.imageCover.startsWith("http")) {
              preview = profile.imageCover;
            } else {
              // Serve from backend port
              preview = `${window.location.protocol}//${window.location.hostname}:5000/${profile.imageCover}`;
            }
          }

          console.log("Fetched profile:", profile);
          console.log("Resolved image preview:", preview);

          const loadedData = {
            fullName: profile.fullName || "",
            phone: profile.phone || user?.phone || "",
            alternatePhone: profile.alternatePhone || "",
            gender: profile.gender || "",
            dateOfBirth: profile.dateOfBirth
              ? profile.dateOfBirth.split("T")[0]
              : "",
            imagePreview: preview,
            _id: profile._id,
          };
          setFormData(loadedData);
          setOriginalData(loadedData);
        }
      } catch (err) {
        console.warn("No existing client profile found", err);
        setEditMode(true); // Enable edit mode if new profile
      }
    };
    fetchProfile();
  }, [user]);

  // Detect changes
  useEffect(() => {
    setHasChanges(JSON.stringify(formData) !== JSON.stringify(originalData));
  }, [formData, originalData]);

  // Handle input changes
  const handleChange = (e) => {
    if (!editMode) return;
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle image file selection
  const handleImageChange = (e) => {
    if (!editMode) return;

    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/"))
      return alert("Please select an image file");
    if (file.size > 5 * 1024 * 1024)
      return alert("Image must be smaller than 5MB");

    if (formData.imagePreview && formData.imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(formData.imagePreview);
    }

    setFormData((prev) => ({
      ...prev,
      imageCover: file,
      imagePreview: URL.createObjectURL(file),
    }));
  };

  // Submit / save profile
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!hasChanges && editMode) return;

    if (!editMode) {
      setEditMode(true);
      return;
    }

    setIsSubmitting(true);

    try {
      const data = new FormData();
      data.append("fullName", formData.fullName);
      data.append("phone", formData.phone);
      data.append("alternatePhone", formData.alternatePhone);
      data.append("gender", formData.gender);
      data.append("dateOfBirth", formData.dateOfBirth);
      if (formData.imageCover) data.append("imageCover", formData.imageCover);

      let res;
      if (formData._id) {
        res = await api.put(`/client-profile/update/${formData._id}`, data, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        res = await api.post("/client-profile/create", data, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      if (res.data.success) {
        alert("Profile saved successfully!");
        const profile = res.data.data;

        // Correct preview after saving
        let preview = "";
        if (profile.imageCover) {
          if (profile.imageCover.startsWith("http")) {
            preview = profile.imageCover;
          } else {
            preview = `${window.location.protocol}//${window.location.hostname}:5000/${profile.imageCover}`;
          }
        }

        const updatedData = {
          ...formData,
          _id: profile._id,
          imagePreview: preview,
          imageCover: null,
        };

        setFormData(updatedData);
        setOriginalData(updatedData);
        setEditMode(false);
        onProfileSaved?.(); // ✅ Notify the parent component to refresh its data
      }
    } catch (err) {
      console.error("Error saving profile:", err);
      alert("Error saving profile");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cancel / reset
  const handleCancel = () => {
    if (editMode && hasChanges) {
      const confirmCancel = window.confirm(
        "You have unsaved changes. Discard them?"
      );
      if (!confirmCancel) return;
    }

    if (editMode) {
      setFormData(originalData);
      if (
        formData.imagePreview &&
        formData.imagePreview.startsWith("blob:") &&
        formData.imagePreview !== originalData.imagePreview
      ) {
        URL.revokeObjectURL(formData.imagePreview);
      }
      setEditMode(false);
    } else {
      onClose?.();
    }
  };

  const toggleEditMode = () => {
    if (editMode && hasChanges) {
      const confirmToggle = window.confirm(
        "You have unsaved changes. Discard them and continue editing?"
      );
      if (!confirmToggle) return;
      setFormData(originalData);
    }
    setEditMode(!editMode);
  };

  const calculateAge = (dateString) => {
    if (!dateString) return null;
    const today = new Date();
    const birthDate = new Date(dateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    )
      age--;
    return age;
  };

  const getInputClasses = () => {
    const baseClasses =
      "w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-brand-emerald focus:border-transparent outline-none transition-all duration-200";
    return editMode
      ? `${baseClasses} border-gray-300 bg-white`
      : `${baseClasses} border-transparent bg-gray-50 text-gray-700`;
  };

  return (
    <>
      {/* Image Modal */}
      {showImageModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="relative max-w-4xl max-h-full">
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors"
            >
              <X size={24} />
            </button>
            <img
              src={
                formData.imagePreview ||
                "https://cdn-icons-png.flaticon.com/512/3177/3177440.png"
              }
              alt="Profile Preview"
              className="max-w-full max-h-[80vh] object-contain rounded-lg"
            />
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-2">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Profile</h1>
          <p className="text-gray-600">
            {editMode
              ? "Edit your personal information"
              : "View your profile details"}
          </p>
          <div className="flex justify-center gap-4 mt-4">
            {!editMode ? (
              <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-brand-navy rounded-full text-sm font-medium">
                <User size={14} />
                View Mode
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
                <User size={14} />
                Edit Mode
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 sticky top-8">
              <div className="text-center mb-6">
                <div className="relative inline-block group">
                  <div
                    className="relative cursor-pointer transform transition-transform duration-200 hover:scale-105"
                    onClick={() => setShowImageModal(true)}
                  >
                    <img
                      src={
                        formData.imagePreview ||
                        "https://cdn-icons-png.flaticon.com/512/3177/3177440.png"
                      }
                      alt="Profile"
                      className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg mx-auto"
                    />
                    <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                      <ZoomIn className="w-6 h-6 text-white" />
                    </div>
                  </div>

                  {editMode && (
                    <label
                      htmlFor="imageCover"
                      className="absolute bottom-2 right-2 w-10 h-10 bg-brand-navy rounded-full border-4 border-white flex items-center justify-center cursor-pointer hover:bg-brand-navy/90 transition-colors shadow-lg"
                    >
                      <Camera className="w-4 h-4 text-white" />
                      <input
                        type="file"
                        id="imageCover"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                        disabled={isSubmitting}
                      />
                    </label>
                  )}
                </div>

                <div className="mt-4">
                  <h2 className="text-xl font-semibold text-gray-900 capitalize">
                    {formData.fullName || "Your Name"}
                  </h2>
                  <p className="text-gray-500 text-sm">@{user?.username}</p>
                </div>
              </div>

              <div className="space-y-4 text-gray-600 text-sm">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  {user?.email}
                </div>
                {formData.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    {formData.phone}
                  </div>
                )}
                {formData.dateOfBirth && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {formData.dateOfBirth} ({calculateAge(formData.dateOfBirth)}{" "}
                    yrs)
                  </div>
                )}
              </div>

              {/* Edit Toggle Button */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={toggleEditMode}
                  className="w-full px-4 py-2 border border-brand-navy text-brand-navy rounded-xl font-semibold hover:bg-brand-navy hover:text-white transition-colors"
                >
                  {editMode ? "Cancel Editing" : "Edit Profile"}
                </button>
              </div>
            </div>
          </div>

          {/* Form Section */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-brand-navy mb-4 flex items-center gap-2">
                  <User className="w-5 h-5" /> Personal Information
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleChange}
                      className={getInputClasses()}
                      required
                      readOnly={!editMode}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className={getInputClasses()}
                      required
                      readOnly={!editMode}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Alternate Phone
                    </label>
                    <input
                      type="tel"
                      name="alternatePhone"
                      value={formData.alternatePhone}
                      onChange={handleChange}
                      className={getInputClasses()}
                      readOnly={!editMode}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Gender
                    </label>
                    <select
                      name="gender"
                      value={formData.gender}
                      onChange={handleChange}
                      className={getInputClasses()}
                      disabled={!editMode}
                    >
                      <option value="">Select</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      name="dateOfBirth"
                      value={formData.dateOfBirth}
                      onChange={handleChange}
                      className={getInputClasses()}
                      readOnly={!editMode}
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between items-center pt-4">
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
                    {editMode ? "Cancel" : "Close"}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || (editMode && !hasChanges)}
                    className="px-6 py-3 bg-brand-navy text-white rounded-xl hover:bg-brand-navy/90 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    {isSubmitting
                      ? "Saving..."
                      : editMode
                      ? "Save Profile"
                      : "Edit Profile"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}

export default ClientPresence;
