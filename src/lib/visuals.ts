import {
  Car,
  Film,
  GraduationCap,
  HeartPulse,
  Home,
  type LucideIcon,
  MoreHorizontal,
  ShoppingBag,
  ShoppingCart,
  UtensilsCrossed,
  Zap,
} from 'lucide-react';
import type { ExpenseCategory } from './finance/types';

/**
 * Brand-ish colour themes for Indian banks and insurers. Approximations of each
 * institution's palette for visual recognition — no logos or artwork.
 */
const ISSUERS: { match: RegExp; from: string; to: string }[] = [
  { match: /lic\b|life insurance corp/i, from: '#0b3a7a', to: '#f2b705' },
  { match: /hdfc life/i, from: '#0a2f6b', to: '#e2231a' },
  { match: /hdfc/i, from: '#0a1f5c', to: '#1d56c4' },
  { match: /sbi life/i, from: '#1b1550', to: '#c2185b' },
  { match: /sbi|state bank/i, from: '#1b1550', to: '#5b3db5' },
  { match: /icici/i, from: '#5c1414', to: '#d0601f' },
  { match: /axis/i, from: '#3d0a22', to: '#a3195b' },
  { match: /kotak/i, from: '#5e0b13', to: '#d9343f' },
  { match: /idfc/i, from: '#4a0912', to: '#a8263a' },
  { match: /indus/i, from: '#22180f', to: '#8a6a3d' },
  { match: /rbl/i, from: '#0b2347', to: '#2b78c2' },
  { match: /yes\b|yes bank/i, from: '#071f4d', to: '#1a73d9' },
  { match: /\bau\b|au small/i, from: '#3a1356', to: '#e0682a' },
  { match: /amex|american express/i, from: '#1d4652', to: '#5aa3ab' },
  { match: /bob|baroda/i, from: '#5a1d08', to: '#ef7d22' },
  { match: /bajaj/i, from: '#003a70', to: '#0a7cc2' },
  { match: /tata/i, from: '#0b2f6b', to: '#3b82c4' },
  { match: /max life/i, from: '#5b2a86', to: '#e5006d' },
  { match: /star health/i, from: '#0b5d3b', to: '#f2a900' },
  { match: /niva|bupa/i, from: '#0c4a8a', to: '#00a3a1' },
  { match: /care health/i, from: '#0f6b3a', to: '#7cc242' },
  { match: /amazon/i, from: '#131921', to: '#ff9900' },
  { match: /simpl/i, from: '#1a1a2e', to: '#4c3fff' },
  { match: /lazypay/i, from: '#1b1b1b', to: '#e2136e' },
  { match: /apple|macbook|iphone/i, from: '#1f1f1f', to: '#6b6b6b' },
];
const DEFAULT_ISSUER = { from: '#141a24', to: '#475569' };

export function issuerGradient(name: string, angle = 135): string {
  const t = ISSUERS.find((i) => i.match.test(name)) ?? DEFAULT_ISSUER;
  return `linear-gradient(${angle}deg, ${t.from} 0%, ${t.to} 100%)`;
}

/** Two-letter mark for a lender/insurer, e.g. "HDFC Bank" → "HB", "SBI Card" → "SB". */
export function issuerInitials(name: string): string {
  const words = name.replace(/[^A-Za-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words[0].length <= 4 && words[0] === words[0].toUpperCase()) return words[0].slice(0, 3);
  return (words[0][0] + (words[1]?.[0] ?? words[0][1] ?? '')).toUpperCase();
}

export const CATEGORY_STYLE: Record<ExpenseCategory, { icon: LucideIcon; color: string }> = {
  housing: { icon: Home, color: '#2a78d6' },
  utilities: { icon: Zap, color: '#eda100' },
  groceries: { icon: ShoppingCart, color: '#1baf7a' },
  dining: { icon: UtensilsCrossed, color: '#eb6834' },
  shopping: { icon: ShoppingBag, color: '#e87ba4' },
  transport: { icon: Car, color: '#4a3aa7' },
  health: { icon: HeartPulse, color: '#e34948' },
  education: { icon: GraduationCap, color: '#008300' },
  entertainment: { icon: Film, color: '#9085e9' },
  other: { icon: MoreHorizontal, color: '#898781' },
};

export const MEMBER_HEX: Record<string, string> = {
  blue: '#2a78d6',
  teal: '#13917a',
  violet: '#6a5acd',
  amber: '#c98500',
  rose: '#d4507a',
  slate: '#5f6b7a',
};
