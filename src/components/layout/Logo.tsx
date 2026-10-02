import { href } from '../../lib/router';

export function Logo({ to = '/' }: { to?: string }) {
  return (
    <a href={href(to)} className="flex items-center gap-2 rounded-lg text-ink" aria-label="Tenura home">
      <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden>
        <rect width="32" height="32" rx="8" className="fill-ink" />
        <path d="M9 10.5h14M16 10.5V23" className="stroke-canvas" strokeWidth="2.6" strokeLinecap="round" />
        <circle cx="22.5" cy="21.5" r="2.5" fill="rgb(var(--positive))" />
      </svg>
      <span className="text-[17px] font-semibold tracking-tight">Tenura</span>
    </a>
  );
}
