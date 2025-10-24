import React, { useState } from "react";
import api from "../../utils/axios";
import { User, Mail, Phone, Camera, Save, Star } from "lucide-react";

function PlannerPresence({ user, planner }) {
  const [formData, setFormData] = useState({
    fullName: planner?.fullName || "",
    phonePrimary: planner?.phonePrimary || "",
    companyName: planner?.companyName || "",
    specialization: planner?.specialization || [],
    yearsExperience: planner?.yearsExperience || "",
    shortBio: planner?.shortBio || "",
    profileImage: null,
    profileImagePreview: planner?.profileImage || "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith("image/"))
        return alert("Please select an image file");
      if (file.size > 5 * 1024 * 1024) return alert("Image must be <5MB");

      setFormData((prev) => ({
        ...prev,
        profileImage: file,
        profileImagePreview: URL.createObjectURL(file),
      }));
    }
  };

  const handleSpecializationChange = (e) => {
    const { options } = e.target;
    const selected = [];
    for (let i = 0; i < options.length; i++) {
      if (options[i].selected) selected.push(options[i].value);
    }
    setFormData((prev) => ({ ...prev, specialization: selected }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const data = new FormData();
    Object.keys(formData).forEach((key) => {
      if (key === "specialization" && Array.isArray(formData[key])) {
        formData[key].forEach((spec) => data.append("specialization[]", spec));
      } else if (formData[key] !== null && formData[key] !== undefined) {
        data.append(key, formData[key]);
      }
    });

    try {
      let response;
      if (planner?._id) {
        // Update existing profile
        console.log("📤 Updating planner profile with ID:", planner._id);
        response = await api.put(
          `/planner-profile/update/${planner._id}`,
          data,
          {
            headers: { "Content-Type": "multipart/form-data" },
          }
        );
      } else {
        // Create new profile
        console.log("📤 Creating new planner profile...");
        response = await api.post("/planner-profile/create", data, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }
      console.log("✅ Profile saved successfully:", response.data);
      alert(
        "Profile saved successfully! The page will now reload to reflect changes."
      );
      window.location.reload(); // Reload to show updated data
    } catch (err) {
      console.error(
        "❌ Error saving profile:",
        err.response?.data || err.message
      );
      alert(
        `Error saving profile: ${err.response?.data?.message || err.message}`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2"></h1>
        <p className="text-gray-600">
          Manage your professional information and preferences
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Profile Image & Info */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 sticky top-8">
            <div className="text-center mb-6">
              <div className="relative inline-block">
                <img
                  src={
                    formData.profileImagePreview ||
                    "https://cdn-icons-png.flaticon.com/512/3177/3177440.png"
                  }
                  alt="Profile"
                  className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg mx-auto"
                />
                <label
                  htmlFor="profileImage"
                  className="absolute bottom-2 right-2 w-10 h-10 bg-brand-navy rounded-full border-4 border-white flex items-center justify-center cursor-pointer hover:bg-brand-navy/90 transition-colors shadow-lg"
                >
                  <Camera className="w-4 h-4 text-white" />
                  <input
                    type="file"
                    id="profileImage"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              </div>
              <div className="mt-4">
                <h2 className="text-xl font-semibold text-gray-900 capitalize">
                  {formData.fullName || "Your Name"}
                </h2>
                <p className="text-gray-500 text-sm">@{user?.username}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 text-gray-600">
                <Mail className="w-4 h-4" />
                <span className="text-sm">{user?.email}</span>
              </div>
              {formData.phonePrimary && (
                <div className="flex items-center gap-3 text-gray-600">
                  <Phone className="w-4 h-4" />
                  <span className="text-sm">{formData.phonePrimary}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-brand-navy mb-4 flex items-center gap-2">
                <User className="w-5 h-5" /> Professional Information
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Full Name */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-navy/20 focus:border-brand-navy transition-colors capitalize"
                    required
                  />
                </div>

                {/* Company Name */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Company Name
                  </label>
                  <input
                    type="text"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-navy/20 focus:border-brand-navy transition-colors"
                  />
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    name="phonePrimary"
                    value={formData.phonePrimary}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-navy/20 focus:border-brand-navy transition-colors"
                    required
                  />
                </div>

                {/* Specialization */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Specialization
                  </label>
                  <select
                    multiple
                    name="specialization"
                    value={formData.specialization}
                    onChange={handleSpecializationChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-navy/20 focus:border-brand-navy transition-colors"
                  >
                    <option value="Weddings">Weddings</option>
                    <option value="Corporate Events">Corporate Events</option>
                    <option value="Traditional Ceremonies">
                      Traditional Ceremonies
                    </option>
                    <option value="Product Launches">Product Launches</option>
                    <option value="Logistics Coordination">
                      Logistics Coordination
                    </option>
                    <option value="Entertainment Management">
                      Entertainment Management
                    </option>
                  </select>
                </div>

                {/* Years Experience */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Years Experience
                  </label>
                  <input
                    type="text"
                    name="yearsExperience"
                    value={formData.yearsExperience}
                    onChange={handleChange}
                    placeholder="e.g. 5+ years"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-navy/20 focus:border-brand-navy transition-colors"
                  />
                </div>

                {/* Short Bio */}
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-gray-700">
                    Short Bio
                  </label>
                  <textarea
                    name="shortBio"
                    value={formData.shortBio}
                    onChange={handleChange}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-navy/20 focus:border-brand-navy transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-4 pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-3 bg-brand-navy text-white rounded-xl hover:bg-brand-navy/90 transition-colors font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                {isSubmitting ? "Saving..." : "Save Profile"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default PlannerPresence;
