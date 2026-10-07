import { ShieldCheck } from "lucide-react";
import { verificationLabels } from "../../utils/profileVerification";

export default function VerificationStatus({ profile }) {
  if (!profile) return null;
  const status = profile.verified ? "verified" : profile.verification?.status || "unverified";
  return <section className="my-5 rounded-xl border border-brand-navy/10 bg-brand-ivory p-4 text-brand-navy" aria-label="Profile verification"><p className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck size={18} aria-hidden="true" />{verificationLabels[status] || verificationLabels.unverified}</p>{profile.verification?.reason && <p className="mt-2 whitespace-pre-wrap break-words text-sm">{profile.verification.reason}</p>}<p className="mt-2 text-xs leading-relaxed text-gray-500">{status === "verified" ? "Changes to business identity or contact details will require another admin review." : "Keep your business identity, contact details, and location complete so an admin can review your profile."}</p></section>;
}
