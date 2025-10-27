import React from "react";
import { FaFacebookSquare, FaInstagramSquare, FaTiktok, FaLinkedinIn } from "react-icons/fa";
import { CgWebsite } from "react-icons/cg";

export default function SocialLinksSection({ formData, setFormData }) {
  const icons = {
    facebook: <FaFacebookSquare className="text-blue-600" />,
    instagram: <FaInstagramSquare className="text-pink-500" />,
    tiktok: <FaTiktok className="text-black" />,
    linkedin: <FaLinkedinIn className="text-blue-700" />,
    website: <CgWebsite className="text-gray-600" />,
  };

  return (
    <div className="bg-gray-50 p-6 rounded-2xl shadow-sm">
      <h2 className="text-lg font-semibold mb-4">Social Links</h2>

      <div className="space-y-3">
        {Object.keys(formData.socialLinks).map((key) => (
          <div key={key} className="flex items-center gap-3">
            <span className="text-xl">{icons[key]}</span>
            <input
              type="text"
              placeholder={`Enter your ${key} link`}
              value={formData.socialLinks[key]}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  socialLinks: { ...prev.socialLinks, [key]: e.target.value },
                }))
              }
              className="flex-1 border border-gray-300 rounded-xl px-3 py-2"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
