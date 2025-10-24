import React, { useEffect, useState } from "react";
import api from "../../utils/axios";

function ClientAvatar({ userId }) {
  const [profile, setProfile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const fetchProfile = async () => {
      try {
        const res = await api.get(`/client-profile/${userId}`);
        if (res.data.success && res.data.data) {
          const profileData = res.data.data;

          // Safe image preview
          let preview = "";
          if (profileData.imageCover) {
            if (profileData.imageCover.startsWith("http")) {
              preview = profileData.imageCover;
            } else {
              // Dynamically resolve backend URL
              preview = `${window.location.protocol}//${window.location.hostname}:5000/${profileData.imageCover}`;
            }
          }

          setProfile(profileData);
          setImagePreview(preview);
        } else {
          console.warn("Failed to load profile:", res.data.message);
        }
      } catch (error) {
        console.error("Error fetching client profile:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [userId]);

  if (isLoading) {
    return (
      <div className="w-10 h-10 rounded-lg bg-brand-emerald/50 flex items-center justify-center">
        <span className="text-white font-bold text-lg">…</span>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="w-10 h-10 rounded-lg bg-brand-emerald/50 flex items-center justify-center">
        <span className="text-white font-bold text-lg">?</span>
      </div>
    );
  }

  return (
    <div className="w-10 h-10 rounded-lg bg-brand-emerald/90 overflow-hidden flex items-center justify-center">
      {imagePreview ? (
        <img
          src={imagePreview}
          alt={profile.fullName || "profile"}
          className="w-full h-full object-cover"
        />
      ) : (
        <span className="text-white font-bold text-lg">
          {profile.fullName ? profile.fullName.charAt(0).toUpperCase() : "?"}
        </span>
      )}
    </div>
  );
}

export default ClientAvatar;
