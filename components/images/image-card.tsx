"use client";

import { useActionState, useEffect } from "react";
import { softDeleteImage, updateImageMeta } from "@/actions/images";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, NativeSelect } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { IMAGE_KINDS } from "@/lib/constants";
import { imageKindLabel } from "@/lib/utils";
import { useOnceSubmit } from "@/lib/use-once-submit";
import type { ImageRecord } from "@/lib/images";

export function ImageCard({ image, redirectTo }: { image: ImageRecord; redirectTo: string }) {
  const [metaState, metaAction, metaPending] = useActionState(updateImageMeta, null);
  const [deleteState, deleteAction, deletePending] = useActionState(softDeleteImage, null);
  const metaOnce = useOnceSubmit();
  const deleteOnce = useOnceSubmit();

  useEffect(() => {
    if (metaState?.error) metaOnce.unlock();
  }, [metaState, metaOnce]);
  useEffect(() => {
    if (deleteState?.error) deleteOnce.unlock();
  }, [deleteState, deleteOnce]);

  return (
    <li className="grid gap-3 rounded-lg border border-line bg-paper/60 p-3">
      <div className="overflow-hidden rounded-md border border-line bg-surface">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/images/${image.id}`}
          alt={image.caption || imageKindLabel(image.kind)}
          className="aspect-[3/2] w-full object-cover"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Badge>{imageKindLabel(image.kind)}</Badge>
        {image.prepForVisit ? <Badge tone="olive">Prep</Badge> : null}
      </div>
      {image.caption ? <p className="text-sm text-ink">{image.caption}</p> : null}
      <FormMessage error={metaState?.error || deleteState?.error} />
      <form action={metaAction} className="grid gap-2" onSubmit={metaOnce.onSubmit}>
        <input type="hidden" name="imageId" value={image.id} />
        <input type="hidden" name="redirectTo" value={redirectTo} />
        <div className="grid gap-2 sm:grid-cols-2">
          <Field>
            <Label htmlFor={`kind-${image.id}`} className="sr-only">
              Kind
            </Label>
            <NativeSelect id={`kind-${image.id}`} name="kind" defaultValue={image.kind}>
              {IMAGE_KINDS.map((kind) => (
                <option key={kind.value} value={kind.value}>
                  {kind.label}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field>
            <Label htmlFor={`caption-${image.id}`} className="sr-only">
              Caption
            </Label>
            <Input
              id={`caption-${image.id}`}
              name="caption"
              defaultValue={image.caption}
              autoComplete="off"
              placeholder="Caption"
            />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-xs text-ink">
          <input
            type="checkbox"
            name="prepForVisit"
            defaultChecked={image.prepForVisit}
            className="h-4 w-4 accent-ink"
          />
          Prep for visit
        </label>
        <Button type="submit" size="sm" variant="outline" disabled={metaPending} aria-busy={metaPending}>
          {metaPending ? "Saving…" : "Save"}
        </Button>
      </form>
      <form action={deleteAction} onSubmit={deleteOnce.onSubmit}>
        <input type="hidden" name="imageId" value={image.id} />
        <input type="hidden" name="redirectTo" value={redirectTo} />
        <Button type="submit" size="sm" variant="ghost" disabled={deletePending} aria-busy={deletePending}>
          {deletePending ? "Removing…" : "Remove from gallery"}
        </Button>
      </form>
    </li>
  );
}
