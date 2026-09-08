"use client";

import { useActionState } from "react";
import { createClient, updateClient } from "@/actions/clients";
import { Button } from "@/components/ui/button";
import { Field, FormMessage } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CLIENT_TAGS } from "@/lib/constants";

type ClientValues = {
  name: string;
  phone: string;
  email: string;
  notes: string;
  tags: string[];
};

export function ClientForm({
  clientId,
  defaultValues,
}: {
  clientId?: string;
  defaultValues?: ClientValues;
}) {
  const action = clientId
    ? updateClient.bind(null, clientId)
    : createClient;
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <form action={formAction} className="grid gap-4">
      <FormMessage error={state?.error} success={state?.success} />
      <Field>
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" required defaultValue={defaultValues?.name} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" defaultValue={defaultValues?.phone} placeholder="555-0100" />
        </Field>
        <Field>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" defaultValue={defaultValues?.email} />
        </Field>
      </div>
      <Field>
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          name="notes"
          defaultValue={defaultValues?.notes}
          placeholder="Allergies, preferences, how they found the shop…"
        />
      </Field>
      <Field>
        <p className="text-sm font-medium text-ink">Tags</p>
        <div className="flex flex-wrap gap-3">
          {CLIENT_TAGS.map((tag) => (
            <label key={tag.value} className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                name="tags"
                value={tag.value}
                defaultChecked={defaultValues?.tags.includes(tag.value)}
                className="h-4 w-4 accent-ink"
              />
              {tag.label}
            </label>
          ))}
        </div>
      </Field>
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : clientId ? "Save client" : "Add client"}
        </Button>
      </div>
    </form>
  );
}
