export default function Loading() {
  return (
    <div className="flex-1 w-full max-w-4xl mx-auto px-4 py-8 md:p-10 relative animate-pulse">
      {/* Header Skeleton */}
      <header className="mb-10">
        <div className="h-10 w-48 bg-zinc-800 rounded-lg mb-6"></div>
        
        <div className="flex gap-4 overflow-x-hidden pb-4">
          <div className="min-w-[140px] h-24 bg-zinc-900 border border-zinc-800 rounded-2xl p-4"></div>
          <div className="min-w-[140px] h-24 bg-zinc-900 border border-zinc-800 rounded-2xl p-4"></div>
          <div className="min-w-[140px] h-24 bg-zinc-900 border border-zinc-800 rounded-2xl p-4"></div>
        </div>
      </header>

      {/* Gigs Skeleton list */}
      <div className="flex flex-col gap-4 pb-32">
        <div className="w-full h-32 bg-zinc-900 border border-zinc-800 rounded-xl"></div>
        <div className="w-full h-32 bg-zinc-900 border border-zinc-800 rounded-xl"></div>
        <div className="w-full h-32 bg-zinc-900 border border-zinc-800 rounded-xl opacity-70"></div>
        <div className="w-full h-32 bg-zinc-900 border border-zinc-800 rounded-xl opacity-40"></div>
      </div>
    </div>
  );
}
