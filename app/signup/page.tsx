import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getLiveSession } from "@/lib/auth";
import { parlorEntryPath } from "@/lib/onboarding";
import { SignupForm } from "@/components/forms/auth-forms";

export const metadata: Metadata = { title: "Create a shop" };

export default async function SignupPage() {
  const session = await getLiveSession();
  if (session) {
    redirect(await parlorEntryPath(session));
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 sm:p-8">
        <Link href="/" className="font-serif text-2xl text-ink">
          Inkdesk
        </Link>
        <h1 className="mt-4 font-serif text-3xl text-ink">Open a shop</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          One account, one shop. After you create it, a short setup guide walks through hours, artists,
          and optional team or Stripe keys.
        </p>
        <div className="mt-6">
          <SignupForm />
        </div>
      </div>
    </div>
  );
}
