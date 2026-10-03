import { useState } from 'react';
import type { CardNetwork } from '../lib/finance/types';
import { NETWORK_LABEL } from '../lib/format';
import { cx } from './ui';

/**
 * A credit card drawn in CSS. Everything sensitive is masked by design —
 * Tenura only ever knows the issuer, the last four digits and the network.
 * Click (or press Enter/Space) to flip it over.
 */

interface Theme {
  bg: string;
  /** Text colour for the issuer wordmark */
  ink?: string;
}

// Issuer colour themes (approximations of each bank's palette — no logos or artwork)
const THEMES: { match: RegExp; theme: Theme }[] = [
  { match: /hdfc/i, theme: { bg: 'linear-gradient(135deg, #0a1f5c 0%, #123a8c 55%, #1d56c4 100%)' } },
  { match: /sbi/i, theme: { bg: 'linear-gradient(135deg, #1b1550 0%, #3a2580 55%, #5b3db5 100%)' } },
  { match: /icici/i, theme: { bg: 'linear-gradient(135deg, #5c1414 0%, #9a2c1c 55%, #d0601f 100%)' } },
  { match: /axis/i, theme: { bg: 'linear-gradient(135deg, #3d0a22 0%, #6e1238 55%, #a3195b 100%)' } },
  { match: /kotak/i, theme: { bg: 'linear-gradient(135deg, #5e0b13 0%, #a3121f 55%, #d9343f 100%)' } },
  { match: /idfc/i, theme: { bg: 'linear-gradient(135deg, #4a0912 0%, #7d1424 55%, #a8263a 100%)' } },
  { match: /indus/i, theme: { bg: 'linear-gradient(135deg, #22180f 0%, #4d3620 55%, #8a6a3d 100%)' } },
  { match: /rbl/i, theme: { bg: 'linear-gradient(135deg, #0b2347 0%, #164a85 55%, #2b78c2 100%)' } },
  { match: /yes\b|yes bank/i, theme: { bg: 'linear-gradient(135deg, #071f4d 0%, #0d3f8f 55%, #1a73d9 100%)' } },
  { match: /\bau\b|au small/i, theme: { bg: 'linear-gradient(135deg, #3a1356 0%, #6b2a7d 55%, #e0682a 100%)' } },
  { match: /amex|american express/i, theme: { bg: 'linear-gradient(135deg, #1d4652 0%, #2f6f7d 55%, #5aa3ab 100%)' } },
  { match: /bob|baroda/i, theme: { bg: 'linear-gradient(135deg, #5a1d08 0%, #a33a10 55%, #ef7d22 100%)' } },
  { match: /onecard|one card/i, theme: { bg: 'linear-gradient(135deg, #0d0d0d 0%, #262626 55%, #3d3d3d 100%)' } },
];
const DEFAULT_THEME: Theme = { bg: 'linear-gradient(135deg, #141a24 0%, #2a3342 55%, #475569 100%)' };

function cardTheme(provider: string): Theme {
  return THEMES.find((t) => t.match.test(provider))?.theme ?? DEFAULT_THEME;
}


function NetworkMark({ network, className }: { network?: CardNetwork; className?: string }) {
  if (!network) return null;
  switch (network) {
    case 'mastercard':
      return (
        <svg viewBox="0 0 48 30" className={cx('h-7 w-auto', className)} aria-label="Mastercard">
          <circle cx="17" cy="15" r="13" fill="#eb001b" />
          <circle cx="31" cy="15" r="13" fill="#f79e1b" fillOpacity="0.9" />
          <path d="M24 4.2a13 13 0 0 1 0 21.6 13 13 0 0 1 0-21.6z" fill="#ff5f00" />
        </svg>
      );
    case 'visa':
      return <span className={cx('text-[22px] font-black italic leading-none tracking-tight text-white', className)} aria-label="Visa">VISA</span>;
    case 'rupay':
      return (
        <span className={cx('flex items-center text-[17px] font-extrabold italic leading-none text-white', className)} aria-label="RuPay">
          RuPay
          <svg viewBox="0 0 12 14" className="ml-0.5 h-3.5 w-auto" aria-hidden>
            <path d="M1 1l6 6-6 6z" fill="#f37021" />
            <path d="M5 1l6 6-6 6z" fill="#008c45" />
          </svg>
        </span>
      );
    case 'amex':
      return <span className={cx('rounded-sm border border-white/80 px-1 py-0.5 text-[11px] font-bold leading-none tracking-wider text-white', className)} aria-label="American Express">AMEX</span>;
    case 'diners':
      return <span className={cx('text-[12px] font-semibold leading-tight text-white', className)} aria-label="Diners Club">Diners Club</span>;
  }
}

function Chip() {
  return (
    <svg viewBox="0 0 40 30" className="h-7 w-auto drop-shadow-sm" aria-hidden>
      <defs>
        <linearGradient id="chip-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f6e2a0" />
          <stop offset="50%" stopColor="#d4b05a" />
          <stop offset="100%" stopColor="#a9853a" />
        </linearGradient>
      </defs>
      <rect x="0.5" y="0.5" width="39" height="29" rx="5" fill="url(#chip-g)" stroke="#8a6a2a" strokeOpacity="0.5" />
      <path d="M0 10h12M0 20h12M28 10h12M28 20h12M12 0v30M28 0v30M12 15h16" stroke="#8a6a2a" strokeOpacity="0.55" strokeWidth="1" fill="none" />
    </svg>
  );
}

function Contactless() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 rotate-90 text-white/80" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M8.5 15.5a5 5 0 0 0 0-7M12 18.5a9 9 0 0 0 0-13M15.5 21.5a13 13 0 0 0 0-19" />
    </svg>
  );
}

export function CreditCardVisual({
  provider,
  last4,
  network,
  holder,
  className,
  size = 'md',
  flippable = true,
}: {
  provider: string;
  last4?: string;
  network?: CardNetwork;
  holder?: string;
  className?: string;
  size?: 'sm' | 'md';
  flippable?: boolean;
}) {
  const [flipped, setFlipped] = useState(false);
  const theme = cardTheme(provider);
  const small = size === 'sm';
  const face =
    'absolute inset-0 overflow-hidden rounded-[14px] text-white shadow-lg ring-1 ring-black/10 [backface-visibility:hidden] [-webkit-backface-visibility:hidden]';
  const sheen = (
    <>
      {/* soft light + pattern so the card doesn't look flat */}
      <span className="pointer-events-none absolute -right-16 -top-24 h-56 w-56 rounded-full bg-white/10 blur-sm" aria-hidden />
      <span className="pointer-events-none absolute -bottom-28 -left-10 h-56 w-56 rounded-full bg-black/15" aria-hidden />
      <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent_35%,rgba(255,255,255,0.12)_50%,transparent_65%)]" aria-hidden />
    </>
  );

  const label = `${provider} card${last4 ? ` ending ${last4}` : ''}${network ? `, ${NETWORK_LABEL[network]}` : ''}`;

  return (
    <div className={cx('[perspective:1200px]', className)}>
      <button
        type="button"
        onClick={() => flippable && setFlipped((f) => !f)}
        disabled={!flippable}
        aria-pressed={flippable ? flipped : undefined}
        aria-label={flippable ? `${label}. ${flipped ? 'Showing back' : 'Showing front'} — press to flip` : label}
        className={cx(
          'group relative block aspect-[1.586] w-full rounded-[14px] text-left transition-transform duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)] [transform-style:preserve-3d] motion-reduce:transition-none',
          flippable && 'cursor-pointer hover:-translate-y-0.5',
          flipped && '[transform:rotateY(180deg)]',
        )}
      >
        {/* Front */}
        <span className={face} style={{ background: theme.bg }}>
          {sheen}
          <span className={cx('relative flex h-full flex-col justify-between', small ? 'p-3.5' : 'p-5')}>
            <span className="flex items-start justify-between gap-2">
              <span className={cx('truncate font-semibold tracking-tight', small ? 'text-[13px]' : 'text-[15px]')}>{provider || 'Your card'}</span>
              <Contactless />
            </span>
            <span className="flex items-center gap-3">
              <Chip />
            </span>
            <span className={cx('num font-mono tracking-[0.18em] text-white/95', small ? 'text-[13px]' : 'text-[17px]')}>
              •••• •••• •••• {last4 || '••••'}
            </span>
            <span className="flex items-end justify-between gap-3">
              <span className="min-w-0">
                <span className="block text-[8px] font-medium uppercase tracking-widest text-white/60">Card holder</span>
                <span className={cx('block truncate font-medium uppercase tracking-wide', small ? 'text-[11px]' : 'text-[13px]')}>{holder || '—'}</span>
              </span>
              <span className="shrink-0">
                <span className="block text-[8px] font-medium uppercase tracking-widest text-white/60">Valid thru</span>
                <span className={cx('num block font-mono', small ? 'text-[11px]' : 'text-[13px]')}>••/••</span>
              </span>
              <span className="ml-auto shrink-0"><NetworkMark network={network} /></span>
            </span>
          </span>
        </span>

        {/* Back */}
        <span className={cx(face, '[transform:rotateY(180deg)]')} style={{ background: theme.bg }}>
          {sheen}
          <span className="relative flex h-full flex-col">
            <span className={cx('block w-full bg-black/80', small ? 'mt-4 h-7' : 'mt-6 h-10')} aria-hidden />
            <span className={cx('flex items-center gap-3', small ? 'mt-3 px-3.5' : 'mt-5 px-5')}>
              <span className="h-8 flex-1 rounded-sm bg-[repeating-linear-gradient(135deg,#f4f1e8_0_6px,#e7e2d3_6px_12px)]" aria-hidden />
              <span className="rounded bg-white px-2 py-1 text-right">
                <span className="block text-[7px] font-semibold uppercase tracking-widest text-neutral-500">CVV</span>
                <span className="num block font-mono text-sm font-semibold tracking-widest text-neutral-900">•••</span>
              </span>
            </span>
            <span className={cx('mt-auto flex items-end justify-between gap-3 text-white/70', small ? 'p-3.5 text-[9px]' : 'p-5 text-[11px]')}>
              <span className="max-w-[70%] leading-snug">Tenura never stores card numbers, expiry dates or CVVs.</span>
              <NetworkMark network={network} className="opacity-90" />
            </span>
          </span>
        </span>
      </button>
    </div>
  );
}
