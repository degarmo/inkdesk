"use client";

import { useActionState } from "react";
import { platformLogIn } from "@/actions/platform-auth";
import { Button } from "@/components/ui/button";
import { Field, FormMessage } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PlatformLoginForm() {
  const [state, action, pending] = useActionState(platformLogIn, null);

  return (
    <form action={action} className="grid gap-4">
      <FormMessage error={state?.error} />
      <Field>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="username" required />
      </Field>
      <Field>
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
