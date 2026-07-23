import { Zap } from "lucide-react";

/**
 * A single, modestly-sized cover photo for a charger (or a branded placeholder
 * when there is none). Kept intentionally compact so the listing information and
 * the reservation action stay the focus of the page.
 */
export function ChargerGallery({
  photos,
  title,
}: {
  photos: string[];
  title: string;
}) {
  const hero = photos[0];

  if (!hero) {
    return (
      <div className="flex h-44 w-full items-center justify-center rounded-2xl bg-mesh sm:h-52 lg:h-60">
        <Zap className="h-12 w-12 text-brand-400" aria-hidden="true" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={hero}
      alt={title}
      className="h-44 w-full rounded-2xl object-cover shadow-sm sm:h-52 lg:h-60"
    />
  );
}
