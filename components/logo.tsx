import Image from 'next/image';

/** Gigueiros wordmark. Black ink in the light theme, white ink in the dark one (see .logo-* in globals.css). */
export function Logo({ className = '', priority = false }: { className?: string; priority?: boolean }) {
  return (
    <>
      <Image src="/logo-horizontal-light.png" alt="Gigueiros" width={720} height={270} priority={priority} className={`logo-light ${className}`} />
      <Image src="/logo-horizontal-dark.png" alt="" aria-hidden width={720} height={270} priority={priority} className={`logo-dark ${className}`} />
    </>
  );
}
