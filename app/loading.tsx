export default function Loading() {
  return (
    <div className="flex-1 w-full flex items-center justify-center p-10 h-screen">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-4 border-zinc-800 border-t-zinc-400 rounded-full animate-spin" />
        <p className="text-zinc-500 font-medium tracking-wide text-sm animate-pulse">
          Carregando Gigs...
        </p>
      </div>
    </div>
  );
}
