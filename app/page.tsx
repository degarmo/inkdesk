import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { Button } from "@/components/ui/button";

export default async function HomePage() {
  const session = await getSession();
  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-paper">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
        <p className="font-serif text-2xl text-ink">Inkdesk</p>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild>
            <Link href="/signup">Open a shop</Link>
          </Button>
        </div>
      </header>
      <main className="mx-auto grid w-full max-w-5xl gap-10 px-6 py-16 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted">Tattoo studio CRM</p>
          <h1 className="mt-3 max-w-xl font-serif text-5xl leading-tight text-ink">
            The shop book, without the binder.
          </h1>
          <p className="mt-4 max-w-lg text-base leading-7 text-muted">
            Keep clients, artist rosters, appointments, deposits, and session notes in one place.
            Built for the front desk and the back room — not a marketing site.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/signup">Start a shop account</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/login">Try the demo shop</Link>
            </Button>
          </div>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-6">
          <p className="font-serif text-xl text-ink">What ships in this trial</p>
          <ul className="mt-4 grid gap-3 text-sm leading-6 text-muted">
            <li>Client cards with tags, notes, and last visit</li>
            <li>Artist roster — active and inactive</li>
            <li>Day list for consults, sessions, and touch-ups</li>
            <li>Deposit tracking (paid / unpaid, no card processing)</li>
            <li>Session notes: placement, ink, aftercare</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
