import { EmptyState } from "@/components/ui/field";
import { ImageCard } from "@/components/images/image-card";
import { formatShopDate } from "@/lib/dates";
import type { ImageRecord } from "@/lib/image-types";

export function ImageGallery({
  images,
  redirectTo,
  emptyTitle,
  emptyBody,
  timezone,
  showBookingLink,
}: {
  images: ImageRecord[];
  redirectTo: string;
  emptyTitle: string;
  emptyBody: string;
  timezone: string;
  showBookingLink?: boolean;
}) {
  if (images.length === 0) {
    return <EmptyState title={emptyTitle} body={emptyBody} />;
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {images.map((image) => (
        <ImageCard
          key={image.id}
          image={image}
          redirectTo={redirectTo}
          savedAt={formatShopDate(image.createdAt, timezone)}
          showBookingLink={showBookingLink}
        />
      ))}
    </ul>
  );
}
