"use client";

import { useActionState, useEffect } from "react";
import { createShopUser } from "@/actions/users";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, NativeSelect } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { USER_ROLES } from "@/lib/constants";
import { useOnceSubmit } from "@/lib/use-once-submit";

export function CreateShopUserForm() {
  const [state, action, pending] = useActionState(createShopUser, null);
  const { onSubmit, unlock } = useOnceSubmit();

  useEffect(() => {
    if (state?.error) unlock();
  }, [state, unlock]);

  return (
    <form action={action} className="grid gap-4" autoComplete="off" onSubmit={onSubmit}>
      <FormMessage error={state?.error} success={state?.success} />
      <Field>
        <Label htmlFor="user-name">Name</Label>
        <Input id="user-name" name="name" required autoComplete="off" />
      </Field>
      <Field>
        <Label htmlFor="user-email">Email</Label>
        <Input id="user-email" name="email" type="email" required autoComplete="off" />
      </Field>
      <Field>
        <Label htmlFor="user-password">Temporary password</Label>
        <Input id="user-password" name="password" type="password" required minLength={8} autoComplete="new-password" />
      </Field>
      <Field>
        <Label htmlFor="user-role">Role</Label>
        <NativeSelect id="user-role" name="role" defaultValue="staff">
          {USER_ROLES.map((role) => (
            <option key={role.value} value={role.value}>
              {role.label}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <p className="text-sm text-muted">
        Owner and admin can open Admin. Staff see the shop floor only — clients, chairs, and notes.
      </p>
      <div>
        <Button type="submit" disabled={pending} aria-busy={pending}>
          {pending ? "Adding…" : "Add login"}
        </Button>
      </div>
    </form>
  );
}
