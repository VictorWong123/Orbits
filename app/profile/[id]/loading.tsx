/**
 * Instant loading skeleton streamed by Next.js while the Server Component
 * fetches profile data. Matches the ProfileSkeleton layout to prevent
 * layout shift when the real content replaces it.
 */
export default function ProfileLoading() {
  return (
    <main className="max-w-md mx-auto bg-[#FDFBF7] min-h-screen">
      <header className="flex items-center gap-3 px-6 py-6">
        <div className="w-9 h-9 rounded-full bg-[var(--color-primary-light)] shrink-0 animate-pulse" />
        <div className="flex-1 h-8 bg-[var(--color-primary-light)] rounded-full animate-pulse" />
        <div className="w-9 h-9 rounded-full bg-[var(--color-primary-light)] shrink-0 animate-pulse" />
        <div className="w-9 h-9 rounded-full bg-[var(--color-primary-light)] shrink-0 animate-pulse" />
      </header>
      <div className="px-6 pb-8 space-y-4">
        <div className="h-12 bg-[var(--color-primary-light)] rounded-full animate-pulse" />
        <div className="h-24 bg-[var(--color-primary-light)] rounded-3xl animate-pulse" />
        <div className="h-16 bg-[var(--color-primary-light)] rounded-3xl animate-pulse" />
      </div>
    </main>
  );
}
