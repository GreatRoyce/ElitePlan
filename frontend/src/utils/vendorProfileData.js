// The mounted vendor editor uses name/phone; the API uses businessName/phonePrimary.
export const vendorProfileForEditor = (profile) => ({ ...profile, name: profile.businessName || "", phone: profile.phonePrimary || "" });
export const vendorVerificationFields = (draft) => ({ businessName: draft.name, contactPerson: draft.contactPerson, email: draft.email, phonePrimary: draft.phone });
