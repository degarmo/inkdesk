"use client";

import { useActionState, useEffect } from "react";
import { attachClientImage } from "@/actions/images";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { imageKindLabel } from "@/lib/utils";
import { useOnceSubmit } from "@/lib/use-once-submit";
import type { ImageRecord } from "@/lib/images";

export function ImageLibraryPicker({
  appointmentId,
  redirectTo,
  images,
}: {
  appointmentId: string;
  redirectTo: string;
  images: ImageRecord[];
}) {
  if (images.length === 0) {
    return <p className="text-sm text-muted">No other client references to attach.</p>;
  }

  return (
    <div className="grid gap-3">
      <p className="text-sm text-muted">Attach from this client’s library (same file, not a copy).</p>
      <ul className="grid gap-3 sm:grid-cols-2">
        {images.map((image) => (
          <LibraryRow
            key={image.id}
            image={image}
            appointmentId={appointmentId}
            redirectTo={redirectTo}
          />
        ))}
      </ul>
    </div>
  );
}

function LibraryRow({
  image,
  appointmentId,
  redirectTo,
}: {
  image: ImageRecord;
  appointmentId: string;
  redirectTo: string;
}) {
  const [state, action, pending] = useActionState(attachClientImage, null);
  const { onSubmit, unlock } = useOnceSubmit();

  useEffect(() => {
    if (state?.error) unlock();
  }, [state, unlock]);

  return (
    <li className="flex items-center gap-3 rounded-lg border border-line bg-paper/60 p-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/images/${image.id}`}
        alt={image.caption || imageKindLabel(image.kind)}
        className="h-14 w-20 shrink-0 rounded object-cover"
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1">
          <Badge>{imageKindLabel(image.kind)}</Badge>
          {image.prepForVisit ? <Badge tone="olive">Prep</Badge> : null}
        </div>
        <p className="truncate text-xs text-muted">{image.caption || "No caption"}</p>
        <FormMessage error={state?.error} />
      </div>
      <form action={action} onSubmit={onSubmit}>
        <input type="hidden" name="imageId" value={image.id} />
        <input type="hidden" name="appointmentId" value={appointmentId} />
        <input type="hidden" name="redirectTo" value={redirectTo} />
        <Button type="submit" size="sm" variant="outline" disabled={pending} aria-busy={pending}>
          {pending ? "Adding…" : "Attach"}
        </Button>
      </form>
    </li>
  );
}
