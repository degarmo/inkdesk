"use client";

import { useActionState, useEffect } from "react";
import { uploadClientImage } from "@/actions/images";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, NativeSelect } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IMAGE_KINDS } from "@/lib/constants";
import { useOnceSubmit } from "@/lib/use-once-submit";

export function ImageUploadForm({
  clientId,
  appointmentId,
  redirectTo,
}: {
  clientId: string;
  appointmentId?: string;
  redirectTo: string;
}) {
  const [state, action, pending] = useActionState(uploadClientImage, null);
  const { onSubmit, unlock } = useOnceSubmit();

  useEffect(() => {
    if (state?.error) unlock();
  }, [state, unlock]);

  return (
    <form action={action} className="grid gap-3" onSubmit={onSubmit} encType="multipart/form-data">
      <FormMessage error={state?.error} />
      <input type="hidden" name="clientId" value={clientId} />
      <input type="hidden" name="redirectTo" value={redirectTo} />
      {appointmentId ? <input type="hidden" name="appointmentId" value={appointmentId} /> : null}
      <Field>
        <Label htmlFor={`image-file-${appointmentId ?? clientId}`}>Image</Label>
        <Input
          id={`image-file-${appointmentId ?? clientId}`}
          name="file"
          type="file"
          accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
          required
        />
        <p className="text-xs text-muted">JPEG, PNG, or WebP. 10 MB max. HEIC is not accepted.</p>
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field>
          <Label htmlFor={`image-kind-${appointmentId ?? clientId}`}>Kind</Label>
          <NativeSelect id={`image-kind-${appointmentId ?? clientId}`} name="kind" defaultValue="reference">
            {IMAGE_KINDS.map((kind) => (
              <option key={kind.value} value={kind.value}>
                {kind.label}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field>
          <Label htmlFor={`image-caption-${appointmentId ?? clientId}`}>Caption</Label>
          <Input
            id={`image-caption-${appointmentId ?? clientId}`}
            name="caption"
            autoComplete="off"
            placeholder="Shoulder botanical, client’s ref…"
          />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm text-ink">
        <input type="checkbox" name="prepForVisit" className="h-4 w-4 accent-ink" />
        Prep for visit — show on today’s board
      </label>
      <div>
        <Button type="submit" disabled={pending} aria-busy={pending} variant="outline">
          {pending ? "Uploading…" : appointmentId ? "Add to this booking" : "Upload reference"}
        </Button>
      </div>
    </form>
  );
}
