export default function Loading() {
  return (
    <div className="flex-1 w-full max-w-4xl mx-auto px-4 py-8 md:p-10 relative pb-32 animate-pulse">
      {/* Top Header Skeleton */}
      <header className="mb-8">
        <div className="h-5 w-32 bg-zinc-800 rounded mb-6"></div>
        
        <div className="flex flex-col gap-4">
          <div className="h-6 w-24 bg-zinc-800 rounded-md"></div>
          <div className="h-12 w-3/4 md:w-1/2 bg-zinc-800 rounded-lg"></div>
          
          <div className="flex flex-col md:flex-row gap-3 mt-2">
            <div className="h-5 w-40 bg-zinc-900 rounded"></div>
            <div className="h-5 w-40 bg-zinc-900 rounded"></div>
          </div>
        </div>
      </header>

      {/* Financial Summary Skeleton */}
      <section className="mb-10">
        <div className="h-4 w-32 bg-zinc-800 rounded mb-4"></div>
        <div className="w-full h-32 md:h-24 bg-zinc-900 border border-zinc-800 rounded-xl"></div>
      </section>

      {/* Lineup Section Skeleton */}
      <section>
        <div className="flex items-end justify-between mb-4">
          <div className="h-4 w-40 bg-zinc-800 rounded"></div>
          <div className="h-6 w-20 bg-zinc-800 rounded-lg"></div>
        </div>
        
        <div className="flex flex-col gap-3">
          <div className="h-20 w-full bg-zinc-900 border border-zinc-800 rounded-xl"></div>
          <div className="h-20 w-full bg-zinc-900 border border-zinc-800 rounded-xl opacity-70"></div>
          <div className="h-20 w-full bg-zinc-900 border border-zinc-800 rounded-xl opacity-40"></div>
        </div>
      </section>
    </div>
  );
}
