import React from "react";

export default function PersonalDetails({
  formData,
  setFormData,
  errors,
  countries,
  phoneCode,
  phoneNumber,
  setPhoneCode,
  setPhoneNumber,
}) {
  const handlePhoneChange = (e) => {
    const value = e.target.value;
    setPhoneNumber(value);
    setFormData((prev) => ({ ...prev, phonePrimary: `${phoneCode} ${value}` }));
  };

  return (
    <div className="bg-gray-50 p-6 rounded-2xl shadow-sm">
      <h2 className="text-lg font-semibold mb-4">Personal Details</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Full Name</label>
          <input
            type="text"
            value={formData.fullName}
            onChange={(e) => setFormData((prev) => ({ ...prev, fullName: e.target.value }))}
            className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2 focus:ring-brand-gold focus:border-brand-gold"
          />
          {errors.fullName && <p className="text-red-600 text-sm">{errors.fullName}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Phone Number</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={phoneCode}
              onChange={(e) => setPhoneCode(e.target.value)}
              className="w-20 border border-gray-300 rounded-xl px-3 py-2 text-center"
            />
            <input
              type="text"
              value={phoneNumber}
              onChange={handlePhoneChange}
              placeholder="Enter number"
              className="flex-1 border border-gray-300 rounded-xl px-3 py-2"
            />
          </div>
          {errors.phonePrimary && <p className="text-red-600 text-sm">{errors.phonePrimary}</p>}
        </div>
      </div>
    </div>
  );
}
