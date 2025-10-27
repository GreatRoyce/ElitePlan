import React from "react";
import { Camera } from "lucide-react";

export default function ProfileImageSection({ formData, setFormData, errors, profileInputRef }) {
  const handleProfileImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setFormData(prev => ({ ...prev, profileImage: reader.result }));
    reader.readAsDataURL(file);
  };

  return (
    <div className="bg-gray-50 rounded-2xl p-6">
      <div className="flex items-start space-x-6">
        <div className="relative">
          <div className="w-32 h-32 rounded-2xl overflow-hidden border-4 border-white shadow-xl bg-gradient-to-br from-gray-200 to-gray-300">
            {formData.profileImage ? (
              <img src={formData.profileImage} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-500">
                <Camera size={48} />
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => profileInputRef.current.click()}
            className="absolute -bottom-2 -right-2 bg-brand-gold text-brand-navy p-2 rounded-full shadow-lg"
          >
            <Camera size={20} />
          </button>
          <input
            ref={profileInputRef}
            type="file"
            accept="image/*"
            onChange={handleProfileImageChange}
            className="hidden"
          />
        </div>

        <div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Profile Photo</h3>
          <p className="text-gray-600">Upload a professional photo (400x400px recommended).</p>
          {errors.profileImage && <p className="text-red-600 text-sm mt-2">{errors.profileImage}</p>}
        </div>
      </div>
    </div>
  );
}
