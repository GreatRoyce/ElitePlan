import { Link } from "react-router-dom";
import { useState } from "react";
import { advertUrl, advertImageUrl } from "../../utils/adverts";
import { announcementFocus as focus } from "../../utils/announcements";

export default function AdvertCard({ advert }) {
  const href = advertUrl(advert.destinationUrl), image = advertImageUrl(advert.imageUrl);
  const [failedImage, setFailedImage] = useState(null);
  const external = href?.startsWith("https:");
  return <article className="grid overflow-hidden rounded-2xl border border-brand-navy/10 bg-white text-brand-navy sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
    {image && image !== failedImage ? <img src={image} alt={advert.imageAlt || advert.title} onError={() => setFailedImage(image)} loading="lazy" referrerPolicy="no-referrer" className="h-44 w-full object-cover sm:h-full sm:min-h-48" /> : <div className="flex min-h-24 items-center bg-brand-navy p-6 text-lg font-semibold text-brand-gold sm:min-h-48">{advert.sponsor}</div>}
    <div className="flex min-w-0 flex-col items-start p-5 sm:p-6"><p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Sponsored · {advert.sponsor}</p><h3 className="mt-3 break-words text-xl font-semibold">{advert.title}</h3>{advert.body && <p className="mt-3 whitespace-pre-wrap break-words text-sm text-gray-600">{advert.body}</p>}{href && (external ? <a href={href} target="_blank" rel="sponsored noopener noreferrer" className={`mt-5 inline-block rounded-lg bg-brand-navy px-4 py-2.5 text-sm text-white ${focus}`}>{advert.ctaLabel}<span className="sr-only"> (opens in a new tab)</span></a> : <Link to={href} rel="sponsored" className={`mt-5 inline-block rounded-lg bg-brand-navy px-4 py-2.5 text-sm text-white ${focus}`}>{advert.ctaLabel}</Link>)}</div>
  </article>;
}
