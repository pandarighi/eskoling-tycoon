import type { WeatherId } from '../sim/types';

export const rp = (n: number) => 'Rp' + Math.round(n).toLocaleString('id-ID');
export const rpSingkat = (n: number) => {
  const a = Math.abs(n);
  const s = n < 0 ? '-' : '';
  if (a >= 1e9) return `${s}Rp${(a / 1e9).toFixed(1).replace('.', ',')} M`;
  if (a >= 1e6) return `${s}Rp${(a / 1e6).toFixed(1).replace('.', ',')} jt`;
  if (a >= 1e4) return `${s}Rp${Math.round(a / 1e3)} rb`;
  return s + rp(a);
};
export const pct = (n: number) => `${Math.round(n * 100)}%`;

export const CUACA_EMOJI: Record<WeatherId, string> = { terik: '🔥', cerah: '☀️', berawan: '⛅', gerimis: '🌦️', hujan: '🌧️' };

/** Jam jualan 06.00–14.00 dari progres 0..1 */
export const jam = (p: number) => {
  const menit = 6 * 60 + Math.floor(p * 8 * 60);
  return `${String(Math.floor(menit / 60)).padStart(2, '0')}.${String(menit % 60).padStart(2, '0')}`;
};
