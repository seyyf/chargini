import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getPublicProfile, getReviewsAbout } from "@/lib/profiles/queries";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ReviewList } from "@/components/charger/ReviewList";

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const profile = await getPublicProfile(id);

  if (!profile) {
    notFound();
  }

  const reviews = await getReviewsAbout(id);

  // ReviewList already renders its own "Avis" heading — pass reviews directly.
  return (
    <section className="mx-auto max-w-2xl px-6 py-8 space-y-8">
      <ProfileHeader profile={profile} />
      <ReviewList reviews={reviews} />
    </section>
  );
}
