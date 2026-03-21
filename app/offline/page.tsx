export default function OfflinePage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="text-5xl">🎾</div>
      <h1 className="text-xl font-semibold">You're offline</h1>
      <p className="text-sm text-zinc-400 max-w-xs">
        No connection right now. Previously viewed matches are still available — go back and check your history.
      </p>
    </div>
  )
}
