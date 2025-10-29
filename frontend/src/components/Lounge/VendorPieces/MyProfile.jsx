// src/components/VendorPieces/MyProfile.jsx
import React from "react";
import VendorProfile from "./VendorProfile";

export default function MyProfile({ profileData, onProfileUpdate }) {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-gray-600">
          Manage your vendor profile and business information
        </p>
      </div>

      <VendorProfile
        initialProfileData={profileData}
        onProfileUpdate={onProfileUpdate}
      />
    </div>
  );
}
