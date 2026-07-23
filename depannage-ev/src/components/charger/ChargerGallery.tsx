import { Zap, ImageIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

/**
 * Responsive charger photo gallery.
 * - No photos → branded placeholder.
 * - Mobile: a big hero + a horizontal thumbnail strip.
 * - Desktop: the hero beside a 2×2 grid of thumbnails.
 */
export async function ChargerGallery({
  photos,
  title,
}: {
  photos: string[];
  title: string;
}) {
  const t = await getTranslations("charger");
  const [hero, ...rest] = photos;

  if (!hero) {
    return (
      <div className="flex aspect-[16/10] w-full items-center justify-center rounded-2xl bg-mesh">
        <Zap className="h-16 w-16 text-brand-400" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div>
      <div className="grid gap-2 lg:grid-cols-3">
        {/* Hero */}
        <div className="relative lg:col-span-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={hero}
            alt={title}
            className="aspect-[4/3] w-full rounded-2xl object-cover shadow-sm lg:aspect-[16/10]"
          />
          {photos.length > 1 && (
            <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-ink/70 px-2.5 py-1 text-xs font-medium text-white backdrop-blur">
              <ImageIcon className="h-3.5 w-3.5" />
              {t("photoCount", { n: photos.length })}
            </span>
          )}
        </div>

        {/* Desktop thumbnail grid — adapts to how many extra photos there are */}
        {rest.length > 0 && (
          <div
            className={`hidden gap-2 lg:grid ${
              rest.length === 1 ? "grid-rows-1" : "grid-rows-2"
            } ${rest.length <= 2 ? "grid-cols-1" : "grid-cols-2"}`}
          >
            {rest.slice(0, 4).map((photo, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={photo}
                alt={`${title} — ${i + 2}`}
                loading="lazy"
                className="h-full w-full rounded-xl object-cover"
              />
            ))}
          </div>
        )}
      </div>

      {/* Mobile thumbnail strip */}
      {rest.length > 0 && (
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1 lg:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {rest.map((photo, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={photo}
              alt={`${title} — ${i + 2}`}
              loading="lazy"
              className="h-20 w-28 shrink-0 rounded-xl object-cover"
            />
          ))}
        </div>
      )}
    </div>
  );
}
