"use client";

import { useActionState } from "react";
import { createSessionNote } from "@/actions/notes";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, NativeSelect } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function NoteForm({
  clientId,
  appointmentId,
  appointments,
}: {
  clientId: string;
  appointmentId?: string;
  appointments?: { id: string; label: string }[];
}) {
  const [state, action, pending] = useActionState(createSessionNote, null);

  return (
    <form action={action} className="grid gap-4">
      <FormMessage error={state?.error} success={state?.success} />
      <input type="hidden" name="clientId" value={clientId} />
      {appointmentId ? (
        <input type="hidden" name="appointmentId" value={appointmentId} />
      ) : appointments && appointments.length > 0 ? (
        <Field>
          <Label htmlFor="appointmentId">Linked appointment</Label>
          <NativeSelect id="appointmentId" name="appointmentId" defaultValue="">
            <option value="">Client note (not tied to a booking)</option>
            {appointments.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </NativeSelect>
        </Field>
      ) : null}
      <Field>
        <Label htmlFor="designNotes">Design notes</Label>
        <Textarea
          id="designNotes"
          name="designNotes"
          placeholder="Motif, references, size, stencil notes…"
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <Label htmlFor="placement">Placement</Label>
          <Input id="placement" name="placement" placeholder="Left inner forearm" />
        </Field>
        <Field>
          <Label htmlFor="inkColors">Ink / colors</Label>
          <Input id="inkColors" name="inkColors" placeholder="Black, rust, muted green" />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm text-ink">
        <input type="checkbox" name="aftercareGiven" className="h-4 w-4 accent-ink" />
        Aftercare given
      </label>
      <div>
        <Button type="submit" disabled={pending} variant="outline">
          {pending ? "Saving…" : "Add session note"}
        </Button>
      </div>
    </form>
  );
}
