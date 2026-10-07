export default function ContentNotice({ profile }) {
  if (!profile?.contentModeration?.hidden && profile?.active !== false) return null;
  return <section role="status" className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><h2 className="font-semibold">Your listing is hidden</h2><p className="mt-2">Clients cannot find or bookmark this listing or send it new consultation requests. You can edit the content here; staff must review it before restoring visibility.</p>{profile.contentModeration?.reason && <p className="mt-2 whitespace-pre-wrap break-words">Reason: {profile.contentModeration.reason}</p>}</section>;
}
