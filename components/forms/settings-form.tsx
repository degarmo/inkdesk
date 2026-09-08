"use client";

import { useActionState, useEffect } from "react";
import { updateSettings } from "@/actions/settings";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, NativeSelect } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TIMEZONES } from "@/lib/constants";
import { useOnceSubmit } from "@/lib/use-once-submit";

export function SettingsForm({
  defaultValues,
  redirectTo,
}: {
  defaultValues: {
    name: string;
    timezone: string;
    hoursOpen: string;
    hoursClose: string;
  };
  redirectTo?: string;
}) {
  const [state, action, pending] = useActionState(updateSettings, null);
  const { onSubmit, unlock } = useOnceSubmit();

  useEffect(() => {
    if (state?.error) unlock();
  }, [state, unlock]);

  return (
    <form action={action} className="grid gap-4" onSubmit={onSubmit}>
      {redirectTo ? <input type="hidden" name="redirectTo" value={redirectTo} /> : null}
      <FormMessage error={state?.error} success={state?.success} />
      <Field>
        <Label htmlFor="name">Shop name</Label>
        <Input id="name" name="name" required defaultValue={defaultValues.name} />
      </Field>
      <Field>
        <Label htmlFor="timezone">Timezone</Label>
        <NativeSelect id="timezone" name="timezone" defaultValue={defaultValues.timezone}>
          {TIMEZONES.map((zone) => (
            <option key={zone} value={zone}>
              {zone.replace(/_/g, " ")}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <Label htmlFor="hoursOpen">Opens</Label>
          <Input id="hoursOpen" name="hoursOpen" type="time" defaultValue={defaultValues.hoursOpen} />
        </Field>
        <Field>
          <Label htmlFor="hoursClose">Closes</Label>
          <Input id="hoursClose" name="hoursClose" type="time" defaultValue={defaultValues.hoursClose} />
        </Field>
      </div>
      <p className="text-sm text-muted">
        Hours are a shop-floor reminder for now. Day-by-day schedules and online booking come later.
      </p>
      <div>
        <Button type="submit" disabled={pending} aria-busy={pending}>
          {pending ? "Saving…" : "Save settings"}
        </Button>
      </div>
    </form>
  );
}
