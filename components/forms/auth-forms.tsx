"use client";

import { useActionState } from "react";
import Link from "next/link";
import { logIn, signUp } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, NativeSelect } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TIMEZONES } from "@/lib/constants";

export function LoginForm() {
  const [state, action, pending] = useActionState(logIn, null);

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
      <p className="text-sm text-muted">
        New shop?{" "}
        <Link href="/signup" className="text-ink underline underline-offset-4">
          Create an account
        </Link>
      </p>
    </form>
  );
}

export function SignupForm() {
  const [state, action, pending] = useActionState(signUp, null);

  return (
    <form action={action} className="grid gap-4">
      <FormMessage error={state?.error} />
      <Field>
        <Label htmlFor="shopName">Shop name</Label>
        <Input id="shopName" name="shopName" required placeholder="Blackbird Ink" />
      </Field>
      <Field>
        <Label htmlFor="name">Your name</Label>
        <Input id="name" name="name" required placeholder="Shop owner" />
      </Field>
      <Field>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Field>
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
      </Field>
      <Field>
        <Label htmlFor="timezone">Shop timezone</Label>
        <NativeSelect id="timezone" name="timezone" defaultValue="America/Los_Angeles">
          {TIMEZONES.map((zone) => (
            <option key={zone} value={zone}>
              {zone.replace(/_/g, " ")}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? "Creating shop…" : "Create shop"}
      </Button>
      <p className="text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="text-ink underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </form>
  );
}
