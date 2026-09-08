"use client";

import { useActionState, useEffect } from "react";
import { createAppointment, updateAppointment } from "@/actions/appointments";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, NativeSelect } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { APPOINTMENT_STATUSES, DURATIONS, SERVICE_TYPES } from "@/lib/constants";
import { centsToDollarsInput } from "@/lib/utils";
import { useOnceSubmit } from "@/lib/use-once-submit";

type Option = { id: string; name: string; hint?: string };

export function AppointmentForm({
  appointmentId,
  clients,
  artists,
  defaultValues,
  idempotencyKey,
}: {
  appointmentId?: string;
  clients: Option[];
  artists: Option[];
  idempotencyKey?: string;
  defaultValues?: {
    clientId: string;
    artistId: string;
    date: string;
    time: string;
    durationMin: number;
    serviceType: string;
    status: string;
    depositCents: number;
    depositPaid: boolean;
  };
}) {
  const action = appointmentId
    ? updateAppointment.bind(null, appointmentId)
    : createAppointment;
  const [state, formAction, pending] = useActionState(action, null);
  const { onSubmit, unlock } = useOnceSubmit();

  useEffect(() => {
    if (state?.error) unlock();
  }, [state, unlock]);

  return (
    <form action={formAction} className="grid gap-4" autoComplete="off" onSubmit={onSubmit}>
      <FormMessage error={state?.error} success={state?.success} />
      {idempotencyKey ? <input type="hidden" name="idempotencyKey" value={idempotencyKey} /> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <Label htmlFor="clientId">Client</Label>
          <NativeSelect id="clientId" name="clientId" required defaultValue={defaultValues?.clientId}>
            <option value="">Select client</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field>
          <Label htmlFor="artistId">Artist</Label>
          <NativeSelect id="artistId" name="artistId" required defaultValue={defaultValues?.artistId}>
            <option value="">Select artist</option>
            {artists.map((artist) => (
              <option key={artist.id} value={artist.id}>
                {artist.name}
                {artist.hint ? ` — ${artist.hint}` : ""}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field>
          <Label htmlFor="date">Date</Label>
          <Input id="date" name="date" type="date" required defaultValue={defaultValues?.date} />
        </Field>
        <Field>
          <Label htmlFor="time">Start time</Label>
          <Input id="time" name="time" type="time" required defaultValue={defaultValues?.time ?? "12:00"} />
        </Field>
        <Field>
          <Label htmlFor="durationMin">Duration</Label>
          <NativeSelect
            id="durationMin"
            name="durationMin"
            defaultValue={String(defaultValues?.durationMin ?? 60)}
          >
            {DURATIONS.map((minutes) => (
              <option key={minutes} value={minutes}>
                {minutes < 60 ? `${minutes} min` : `${minutes / 60} hr`}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <Label htmlFor="serviceType">Service</Label>
          <NativeSelect
            id="serviceType"
            name="serviceType"
            defaultValue={defaultValues?.serviceType ?? "tattoo"}
          >
            {SERVICE_TYPES.map((service) => (
              <option key={service.value} value={service.value}>
                {service.label}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field>
          <Label htmlFor="status">Status</Label>
          <NativeSelect id="status" name="status" defaultValue={defaultValues?.status ?? "scheduled"}>
            {APPOINTMENT_STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <Label htmlFor="depositAmount">Deposit amount</Label>
          <Input
            id="depositAmount"
            name="depositAmount"
            type="number"
            min="0"
            step="0.01"
            defaultValue={centsToDollarsInput(defaultValues?.depositCents ?? 0)}
          />
        </Field>
        <label className="flex items-end gap-2 pb-2 text-sm text-ink">
          <input
            type="checkbox"
            name="depositPaid"
            defaultChecked={defaultValues?.depositPaid}
            className="h-4 w-4 accent-ink"
          />
          Deposit paid
        </label>
      </div>
      <div>
        <Button type="submit" disabled={pending} aria-busy={pending}>
          {pending ? "Saving…" : appointmentId ? "Save appointment" : "Book appointment"}
        </Button>
      </div>
    </form>
  );
}
