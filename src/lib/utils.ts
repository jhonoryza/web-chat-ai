import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(...inputs));
}

export function uid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'id-' + Date.now() + '-' + Math.random().toString(36).slice(2);
}

export function trunc(s: unknown, max = 6000): string {
  const str = String(s == null ? '' : s);
  return str.length > max
    ? str.slice(0, max) + '\n…[truncated, ' + str.length + ' chars total]'
    : str;
}

export function fmtMs(ms: number): string {
  return ms < 1000 ? Math.round(ms) + ' ms' : (ms / 1000).toFixed(1) + ' s';
}

export function fmtClock(ts: number): string {
  const d = new Date(ts);
  return (
    String(d.getHours()).padStart(2, '0') +
    ':' +
    String(d.getMinutes()).padStart(2, '0') +
    ':' +
    String(d.getSeconds()).padStart(2, '0')
  );
}

export function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function timeGreeting(): 'morning' | 'afternoon' | 'evening' {
  const hr = new Date().getHours();
  return hr < 12 ? 'morning' : hr < 18 ? 'afternoon' : 'evening';
}
