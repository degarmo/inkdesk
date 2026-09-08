import { EmptyState } from "@/components/ui/field";
import { ImageCard } from "@/components/images/image-card";
import type { ImageRecord } from "@/lib/images";

export function ImageGallery({
  images,
  redirectTo,
  emptyTitle,
  emptyBody,
}: {
  images: ImageRecord[];
  redirectTo: string;
  emptyTitle: string;
  emptyBody: string;
}) {
  if (images.length === 0) {
    return <EmptyState title={emptyTitle} body={emptyBody} />;
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {images.map((image) => (
        <ImageCard key={image.id} image={image} redirectTo={redirectTo} />
      ))}
    </ul>
  );
}
