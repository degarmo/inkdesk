import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getLiveSession } from "@/lib/auth";
import { LoginForm } from "@/components/forms/auth-forms";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  if (await getLiveSession()) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 sm:p-8">
        <Link href="/" className="font-serif text-2xl text-ink">
          Inkdesk
        </Link>
        <h1 className="mt-4 font-serif text-3xl text-ink">Sign in</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          Demo shop: <span className="text-ink">demo@blackbird.ink</span> /{" "}
          <span className="text-ink">parlor-demo</span>
        </p>
        <div className="mt-6">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
