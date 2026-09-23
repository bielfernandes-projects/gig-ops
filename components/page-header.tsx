/** Same title + short description on every page, full width; content follows right below. */
export function PageHeader({ title, description, className = '' }: { title: string; description: string; className?: string }) {
  return (
    <header className={`w-full mb-6 ${className}`}>
      <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-50">{title}</h1>
      <p className="mt-1 text-sm md:text-base text-zinc-400">{description}</p>
    </header>
  );
}
