import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2 } from "lucide-react";
import { getLivePlatform } from "@/lib/platform-auth";
import { PlatformLoginForm } from "@/components/forms/platform-login-form";

export const metadata: Metadata = { title: "Platform sign in" };

export default async function PlatformLoginPage() {
  if (await getLivePlatform()) {
    redirect("/platform");
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 sm:p-8">
        <Link href="/" className="font-serif text-2xl text-ink">
          Inkdesk
        </Link>
        <p className="mt-3 flex items-center gap-2 text-xs uppercase tracking-wide text-muted">
          <Building2 className="h-3.5 w-3.5" />
          Platform operators
        </p>
        <h1 className="mt-2 font-serif text-3xl text-ink">Sign in</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          Console for every parlor on this Inkdesk instance. Shop logins use{" "}
          <Link href="/login" className="text-ink underline underline-offset-4">
            parlor sign in
          </Link>
          .
        </p>
        <p className="mt-2 text-sm leading-6 text-muted">
          Seed operator: <span className="text-ink">platform@inkdesk.app</span> /{" "}
          <span className="text-ink">platform-admin</span>
        </p>
        <div className="mt-6">
          <PlatformLoginForm />
        </div>
      </div>
    </div>
  );
}
