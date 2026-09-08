"use client";

import { useActionState, useEffect, useRef } from "react";
import { createArtist, updateArtist } from "@/actions/artists";
import { Button } from "@/components/ui/button";
import { Field, FormMessage } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ArtistForm({
  artistId,
  defaultValues,
}: {
  artistId?: string;
  defaultValues?: { name: string; specialty: string; active: boolean };
}) {
  const action = artistId ? updateArtist.bind(null, artistId) : createArtist;
  const [state, formAction, pending] = useActionState(action, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success && !artistId) {
      formRef.current?.reset();
    }
  }, [state, artistId]);

  return (
    <form ref={formRef} action={formAction} className="grid gap-4">
      <FormMessage error={state?.error} success={state?.success} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <Label htmlFor={`name-${artistId ?? "new"}`}>Name</Label>
          <Input
            id={`name-${artistId ?? "new"}`}
            name="name"
            required
            defaultValue={defaultValues?.name}
          />
        </Field>
        <Field>
          <Label htmlFor={`specialty-${artistId ?? "new"}`}>Specialty</Label>
          <Input
            id={`specialty-${artistId ?? "new"}`}
            name="specialty"
            defaultValue={defaultValues?.specialty}
            placeholder="Fine line, traditional, blackwork…"
          />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          name="active"
          defaultChecked={defaultValues?.active ?? true}
          className="h-4 w-4 accent-ink"
        />
        Active on the roster
      </label>
      <div>
        <Button type="submit" disabled={pending} variant={artistId ? "outline" : "default"}>
          {pending ? "Saving…" : artistId ? "Save artist" : "Add artist"}
        </Button>
      </div>
    </form>
  );
}
