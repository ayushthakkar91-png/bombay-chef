export default function PanelLoading() {
  return (
    <div className="animate-pulse" aria-busy aria-label="Loading">
      <div className="mb-6">
        <div className="h-8 w-56 rounded bg-sand" />
        <div className="mt-2 h-4 w-80 rounded bg-sand/70" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-lg border border-sand bg-surface" />
        ))}
      </div>
      <div className="mt-8 space-y-2 rounded-lg border border-sand bg-surface p-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-10 rounded bg-sand/60" />
        ))}
      </div>
    </div>
  );
}
