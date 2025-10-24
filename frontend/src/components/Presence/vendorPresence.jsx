import React from "react";
import {
  Building2,
  MapPin,
  Clock,
  Globe,
  Star,
  ShieldCheck,
  Camera,
  Mail,
  Phone,
  Calendar,
} from "lucide-react";

function VendorPresence({ user }) {
  // Mock vendor data — replace later with API call or props
  const vendor = {
    businessName: "Royce Events & Decor",
    contactPerson: "Okoh Chukwudi Emmanuel",
    email: "royceevents@gmail.com",
    phonePrimary: "+2348123456789",
    category: "Decor & Ambience",
    subcategory: "Luxury Floral Design",
    description:
      "We specialize in crafting breathtaking event decor experiences with vibrant colors, ambient lighting, and custom floral artistry.",
    yearsExperience: 6,
    address: "14b Admiralty Way, Lekki Phase 1",
    city: "Lagos",
    state: "Lagos",
    country: "Nigeria",
    operatingHours: {
      startTime: "09:00 AM",
      endTime: "08:00 PM",
      daysAvailable: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    },
    priceRange: { min: 200000, max: 1000000 },
    paymentMethods: ["Transfer", "POS", "Cash"],
    socialLinks: {
      facebook: "https://facebook.com/royceevents",
      instagram: "https://instagram.com/royceevents",
      linkedin: "",
    },
    website: "https://royceevents.ng",
    rating: 4.8,
    jobsCompleted: 42,
    verified: true,
    profileImage: "https://cdn-icons-png.flaticon.com/512/3177/3177440.png",
    portfolioImages: [
      "https://images.unsplash.com/photo-1522204501959-6cc64b100d8b",
      "https://images.unsplash.com/photo-1556761175-4b46a572b786",
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c",
    ],
  };

  // Helper function to format currency
  const formatCurrency = (amount) => {
    return `₦${amount.toLocaleString()}`;
  };

  // Status badge component
  const StatusBadge = ({ children, variant = "default" }) => {
    const variants = {
      default: "bg-gray-100 text-gray-700",
      success: "bg-green-50 text-green-700 border border-green-200",
      premium: "bg-blue-50 text-blue-700 border border-blue-200",
    };

    return (
      <span
        className={`px-3 py-1 rounded-full text-sm font-medium ${variants[variant]}`}
      >
        {children}
      </span>
    );
  };

  // Info card component
  const InfoCard = ({ children, className = "" }) => (
    <div
      className={`bg-gray-50/60 p-4 rounded-xl border border-gray-100 ${className}`}
    >
      {children}
    </div>
  );

  // Section header component
  const SectionHeader = ({ icon: Icon, title, subtitle }) => (
    <div className="mb-4">
      <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
        <Icon className="w-5 h-5 text-brand-navy" />
        {title}
      </h3>
      {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );

  // Social link component
  const SocialLink = ({ href, icon: Icon, label, color }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-2 p-3 rounded-lg border transition-all hover:shadow-sm ${
        color || "text-gray-700 border-gray-200 hover:border-gray-300"
      }`}
    >
      <Icon className="w-4 h-4" />
      <span className="text-sm font-medium">{label}</span>
    </a>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 mb-20">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row items-start gap-6 pb-8 mb-8 border-b border-gray-200">
        <div className="relative">
          <img
            src={vendor.profileImage}
            alt="Vendor"
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover border-2 border-white shadow-lg"
          />
          {vendor.verified && (
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
              <ShieldCheck className="w-3 h-3 text-white" />
            </div>
          )}
        </div>

        <div className="flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-3">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
              {vendor.businessName}
            </h2>
            <div className="flex flex-wrap gap-2">
              <StatusBadge variant="success">{vendor.category}</StatusBadge>
              <StatusBadge>
                {vendor.yearsExperience} years experience
              </StatusBadge>
            </div>
          </div>

          <p className="text-gray-600 mb-4">{vendor.description}</p>

          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <Mail className="w-4 h-4" />
              <span>{vendor.email}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Phone className="w-4 h-4" />
              <span>{vendor.phonePrimary}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Building2 className="w-4 h-4" />
              <span>{vendor.contactPerson}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Left Column - Business Details */}
        <div className="xl:col-span-2 space-y-6">
          {/* Business Details */}
          <section>
            <SectionHeader
              icon={Building2}
              title="Business Details"
              subtitle="Specialization and expertise"
            />
            <InfoCard>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="font-medium text-gray-600 text-xs uppercase tracking-wide">
                    Subcategory
                  </label>
                  <p className="text-gray-900 mt-1">{vendor.subcategory}</p>
                </div>
                <div>
                  <label className="font-medium text-gray-600 text-xs uppercase tracking-wide">
                    Experience
                  </label>
                  <p className="text-gray-900 mt-1">
                    {vendor.yearsExperience} years
                  </p>
                </div>
              </div>
            </InfoCard>
          </section>

          {/* Address & Operations */}
          <section>
            <SectionHeader
              icon={MapPin}
              title="Location & Operations"
              subtitle="Business location and working hours"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoCard>
                <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Address
                </h4>
                <div className="space-y-2 text-sm">
                  <p className="text-gray-900">{vendor.address}</p>
                  <p className="text-gray-600">
                    {vendor.city}, {vendor.state}
                  </p>
                  <p className="text-gray-600">{vendor.country}</p>
                </div>
              </InfoCard>

              <InfoCard>
                <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Operating Hours
                </h4>
                <div className="space-y-2 text-sm">
                  <p className="text-gray-900">
                    {vendor.operatingHours.startTime} -{" "}
                    {vendor.operatingHours.endTime}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {vendor.operatingHours.daysAvailable.map((day) => (
                      <span
                        key={day}
                        className="px-2 py-1 bg-white rounded text-xs font-medium text-gray-700 border"
                      >
                        {day}
                      </span>
                    ))}
                  </div>
                </div>
              </InfoCard>
            </div>
          </section>

          {/* Pricing & Payments */}
          <section>
            <SectionHeader
              icon={Calendar}
              title="Pricing & Payments"
              subtitle="Service costs and payment options"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoCard>
                <h4 className="font-medium text-gray-800 mb-3">Price Range</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600">Starting from</span>
                    <span className="font-semibold text-green-600">
                      {formatCurrency(vendor.priceRange.min)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-600">Up to</span>
                    <span className="font-semibold text-gray-900">
                      {formatCurrency(vendor.priceRange.max)}
                    </span>
                  </div>
                </div>
              </InfoCard>

              <InfoCard>
                <h4 className="font-medium text-gray-800 mb-3">
                  Payment Methods
                </h4>
                <div className="flex flex-wrap gap-2">
                  {vendor.paymentMethods.map((method) => (
                    <StatusBadge key={method} variant="default">
                      {method}
                    </StatusBadge>
                  ))}
                </div>
              </InfoCard>
            </div>
          </section>

          {/* Portfolio Gallery */}
          <section>
            <SectionHeader
              icon={Camera}
              title="Portfolio Gallery"
              subtitle="Recent work and projects"
            />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {vendor.portfolioImages.map((img, index) => (
                <div
                  key={index}
                  className="group relative aspect-square rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                >
                  <img
                    src={img}
                    alt={`Portfolio ${index + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right Column - Stats & Social */}
        <div className="space-y-6">
          {/* Platform Stats */}
          <section>
            <SectionHeader
              icon={Star}
              title="Platform Stats"
              subtitle="Performance and ratings"
            />
            <InfoCard>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Rating</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {vendor.rating}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-amber-500">
                    <Star className="w-5 h-5 fill-current" />
                    <Star className="w-5 h-5 fill-current" />
                    <Star className="w-5 h-5 fill-current" />
                    <Star className="w-5 h-5 fill-current" />
                    <Star className="w-5 h-5 fill-current" />
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Jobs Completed
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {vendor.jobsCompleted}
                    </p>
                  </div>
                  <Calendar className="w-8 h-8 text-brand-navy/30" />
                </div>

                <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Status</p>
                    <p className="text-lg font-semibold text-green-600">
                      Verified
                    </p>
                  </div>
                  <ShieldCheck className="w-8 h-8 text-green-500" />
                </div>
              </div>
            </InfoCard>
          </section>

          {/* Online Presence */}
          <section>
            <SectionHeader
              icon={Globe}
              title="Online Presence"
              subtitle="Connect on social media"
            />
            <InfoCard>
              <div className="space-y-3">
                {vendor.website && (
                  <SocialLink
                    href={vendor.website}
                    icon={Globe}
                    label="Visit Website"
                    color="text-blue-600 border-blue-200 hover:border-blue-300"
                  />
                )}
                {vendor.socialLinks.facebook && (
                  <SocialLink
                    href={vendor.socialLinks.facebook}
                    icon={Building2}
                    label="Facebook"
                    color="text-blue-600 border-blue-200 hover:border-blue-300"
                  />
                )}
                {vendor.socialLinks.instagram && (
                  <SocialLink
                    href={vendor.socialLinks.instagram}
                    icon={Camera}
                    label="Instagram"
                    color="text-pink-600 border-pink-200 hover:border-pink-300"
                  />
                )}
              </div>
            </InfoCard>
          </section>
        </div>
      </div>
    </div>
  );
}

export default VendorPresence;
