import Link from "next/link";

/**
 * Marketing landing for `/` — name, tagline, and entry points to the app or account creation.
 */
export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[var(--color-primary-light)] px-6 py-16">
      <div className="w-full max-w-md text-center space-y-10">
        <header className="space-y-3">
          <h1 className="text-4xl font-bold tracking-tight text-[var(--color-primary)]">
            Orbit
          </h1>
          <p className="text-base sm:text-lg text-[#1A3021]/90 leading-relaxed">
            Your personal relationship manager
          </p>
        </header>

        <nav
          className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:justify-center"
          aria-label="Get started"
        >
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-full bg-[var(--color-primary)] px-8 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 hover:brightness-105 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 focus:ring-offset-[var(--color-primary-light)]"
          >
            Try now
          </Link>
          <Link
            href="/account?mode=signup"
            className="inline-flex items-center justify-center rounded-full bg-white px-8 py-3 text-sm font-semibold text-[#1A3021] shadow-sm border border-[var(--color-primary)]/20 transition hover:bg-[#FDFBF7] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 focus:ring-offset-[var(--color-primary-light)]"
          >
            Sign up
          </Link>
        </nav>
      </div>
    </main>
  );
}
