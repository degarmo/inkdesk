"use client";

import { useActionState, useEffect, useState } from "react";
import { KeyRound, Mail } from "lucide-react";
import { createArtist, updateArtist } from "@/actions/artists";
import { CreatedLoginCredentials } from "@/components/forms/created-login-credentials";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, NativeSelect } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOnceSubmit } from "@/lib/use-once-submit";

export function ArtistForm({
  artistId,
  defaultValues,
  canCreateLogin = false,
  matchingLogins = [],
}: {
  artistId?: string;
  defaultValues?: { name: string; specialty: string; active: boolean };
  canCreateLogin?: boolean;
  matchingLogins?: { email: string; role: string }[];
}) {
  const action = artistId ? updateArtist.bind(null, artistId) : createArtist;
  const [state, formAction, pending] = useActionState(action, null);
  const { onSubmit, unlock } = useOnceSubmit();
  const [createLogin, setCreateLogin] = useState(canCreateLogin && !artistId);
  const formId = artistId ?? "new";

  useEffect(() => {
    if (state?.error || state?.password) unlock();
  }, [state, unlock]);

  return (
    <form action={formAction} className="grid gap-4" autoComplete="off" onSubmit={onSubmit}>
      <FormMessage error={state?.error} success={state?.password ? undefined : state?.success} />
      {state?.password && state.email ? <CreatedLoginCredentials state={state} /> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <Label htmlFor={`name-${formId}`}>Roster name</Label>
          <Input
            id={`name-${formId}`}
            name="name"
            required
            defaultValue={defaultValues?.name}
            autoComplete="off"
          />
          <p className="text-xs leading-5 text-muted">Name on the chair and calendar. Not the login email.</p>
        </Field>
        <Field>
          <Label htmlFor={`specialty-${formId}`}>Specialty</Label>
          <Input
            id={`specialty-${formId}`}
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

      {canCreateLogin ? (
        <div className="grid gap-4 rounded-md border border-line bg-paper px-3 py-3">
          <div>
            <p className="flex items-center gap-2 text-sm font-medium text-ink">
              <KeyRound className="h-4 w-4" />
              Shop login
            </p>
            <p className="mt-1 text-sm leading-6 text-muted">
              Optional account for /login. Roster name and login email are separate. Email must be unique
              across Inkdesk. Manage existing logins in Admin → Users.
            </p>
          </div>
          {matchingLogins.length > 0 ? (
            <p className="text-sm leading-6 text-muted">
              A shop login already uses this roster name:{" "}
              {matchingLogins.map((login) => login.email).join(", ")}. Creating another login is optional.
            </p>
          ) : null}
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              name="createLogin"
              value="on"
              checked={createLogin}
              onChange={(event) => setCreateLogin(event.target.checked)}
              className="h-4 w-4 accent-ink"
            />
            {artistId ? "Also create a shop login for this artist" : "Create a shop login for this artist"}
          </label>
          {createLogin ? (
            <div className="grid gap-4">
              <p className="text-sm text-muted">
                <Mail className="mb-0.5 mr-1 inline h-4 w-4" />
                Invite email is not wired. Leave the password blank to generate one. Copy it from this
                screen — Inkdesk will not send the message.
              </p>
              <Field>
                <Label htmlFor={`login-email-${formId}`}>Login email</Label>
                <Input
                  id={`login-email-${formId}`}
                  name="loginEmail"
                  type="email"
                  required
                  autoComplete="off"
                  placeholder="they@parlor.example"
                />
              </Field>
              <Field>
                <Label htmlFor={`login-password-${formId}`}>Temporary password (optional)</Label>
                <Input
                  id={`login-password-${formId}`}
                  name="loginPassword"
                  type="text"
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="Leave blank to generate one"
                />
              </Field>
              <Field>
                <Label htmlFor={`login-role-${formId}`}>Role</Label>
                <NativeSelect id={`login-role-${formId}`} name="loginRole" defaultValue="staff">
                  <option value="staff">Staff — floor only</option>
                  <option value="admin">Admin — floor plus parlor admin</option>
                </NativeSelect>
              </Field>
            </div>
          ) : null}
        </div>
      ) : null}

      <div>
        <Button type="submit" disabled={pending} aria-busy={pending} variant={artistId ? "outline" : "default"}>
          {pending
            ? "Saving…"
            : artistId
              ? createLogin
                ? "Save artist and create login"
                : "Save artist"
              : createLogin
                ? "Add artist and create login"
                : "Add artist"}
        </Button>
      </div>
    </form>
  );
}
