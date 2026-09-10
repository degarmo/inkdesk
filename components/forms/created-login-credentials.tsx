"use client";

import { useState, type ReactNode } from "react";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { roleLabel } from "@/lib/utils";
import type { CredentialActionState } from "@/lib/validations";

export function CreatedLoginCredentials({
  state,
  footer,
}: {
  state: NonNullable<CredentialActionState>;
  footer?: ReactNode;
}) {
  const [copied, setCopied] = useState(false);
  if (!state.email || !state.password) return null;
  const blob = `${state.email}\n${state.password}`;

  return (
    <div className="rounded-md border border-olive/30 bg-olive/8 px-3 py-3">
      {state.success ? <p className="text-sm font-medium text-olive">{state.success}</p> : null}
      <dl className="mt-3 grid gap-1 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-muted">Name</dt>
          <dd className="text-ink">{state.name}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted">Login email</dt>
          <dd className="font-mono text-ink">{state.email}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted">Temporary password</dt>
          <dd className="font-mono text-ink">{state.password}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted">Role</dt>
          <dd className="text-ink">{state.role ? roleLabel(state.role) : ""}</dd>
        </div>
      </dl>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(blob);
              setCopied(true);
            } catch {
              setCopied(false);
            }
          }}
        >
          <Copy className="h-4 w-4" />
          {copied ? "Copied" : "Copy credentials"}
        </Button>
        {footer}
      </div>
    </div>
  );
}
