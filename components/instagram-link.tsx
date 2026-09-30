export const INSTAGRAM_URL = 'https://instagram.com/gigueirosapp';

export function InstagramLink({ className = '', iconClassName = 'h-5 w-5' }: { className?: string; iconClassName?: string }) {
  return (
    <a
      href={INSTAGRAM_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Instagram do Gigueiros (@gigueirosapp)"
      title="@gigueirosapp"
      className={className}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconClassName} aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" />
      </svg>
    </a>
  );
}
