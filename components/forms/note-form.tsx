"use client";

import { useActionState, useEffect } from "react";
import { createSessionNote } from "@/actions/notes";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, NativeSelect } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useOnceSubmit } from "@/lib/use-once-submit";

export function NoteForm({
  clientId,
  appointmentId,
  appointments,
  idempotencyKey,
}: {
  clientId: string;
  appointmentId?: string;
  appointments?: { id: string; label: string }[];
  idempotencyKey: string;
}) {
  const formKey = `session-note-${clientId}-${appointmentId ?? "client"}-${idempotencyKey}`;
  const fieldPrefix = `session-note-${clientId}-${appointmentId ?? "none"}`;
  const [state, action, pending] = useActionState(createSessionNote, null);
  const { onSubmit, unlock } = useOnceSubmit();

  useEffect(() => {
    if (state?.error) unlock();
  }, [state, unlock]);

  return (
    <form
      key={formKey}
      action={action}
      className="grid gap-4"
      autoComplete="off"
      onSubmit={onSubmit}
    >
      <FormMessage error={state?.error} success={state?.success} />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <input type="hidden" name="clientId" value={clientId} />
      <input
        type="text"
        tabIndex={-1}
        aria-hidden="true"
        autoComplete="username"
        className="sr-only"
        defaultValue=""
      />
      {appointmentId ? (
        <input type="hidden" name="appointmentId" value={appointmentId} />
      ) : appointments && appointments.length > 0 ? (
        <Field>
          <Label htmlFor={`${fieldPrefix}-appointment`}>Linked appointment</Label>
          <NativeSelect id={`${fieldPrefix}-appointment`} name="appointmentId" defaultValue="">
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
        <Label htmlFor={`${fieldPrefix}-design`}>Design notes</Label>
        <Textarea
          id={`${fieldPrefix}-design`}
          name="sessionDesignNotes"
          autoComplete="off"
          defaultValue=""
          placeholder="Motif, references, size, stencil notes…"
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <Label htmlFor={`${fieldPrefix}-placement`}>Placement</Label>
          <Input
            id={`${fieldPrefix}-placement`}
            name="sessionPlacement"
            autoComplete="off"
            defaultValue=""
            placeholder="Where on the body"
          />
        </Field>
        <Field>
          <Label htmlFor={`${fieldPrefix}-ink`}>Ink / colors</Label>
          <Input
            id={`${fieldPrefix}-ink`}
            name="sessionInk"
            autoComplete="off"
            defaultValue=""
            placeholder="Pigments used"
          />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm text-ink">
        <input type="checkbox" name="aftercareGiven" className="h-4 w-4 accent-ink" />
        Aftercare given
      </label>
      <div>
        <Button type="submit" disabled={pending} aria-busy={pending} variant="outline">
          {pending ? "Saving…" : "Add session note"}
        </Button>
      </div>
    </form>
  );
}
