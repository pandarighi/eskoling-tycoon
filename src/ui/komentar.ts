import { KOMENTAR, KOMENTAR_SENANG } from '../data/game-data';
import type { CustomerEvent } from '../sim/types';

/** Pilih variasi ucapan secara deterministik dari event agar stabil antar render. */
const pilih = <T,>(arr: T[], ev: CustomerEvent) => arr[Math.floor((ev.t * 997 + ev.skor * 31 + ev.seg.length) * 13) % arr.length];

export function komentarUntuk(ev: CustomerEvent): { teks: string; jenis: 'senang' | 'biasa' | 'kesal' } | null {
  if (ev.tipe === 'lewat' && !ev.keluhan) return null;
  if (ev.keluhan) {
    const k = KOMENTAR[ev.keluhan];
    const teks = k ? `${k.emoji} ${pilih(k.teks, ev)}` : ev.keluhan;
    return { teks, jenis: ev.tipe === 'beli' ? 'biasa' : 'kesal' };
  }
  const k = ev.skor > 0.85 ? KOMENTAR_SENANG.mantap : KOMENTAR_SENANG.enak;
  return { teks: `${k.emoji} ${pilih(k.teks, ev)}`, jenis: 'senang' };
}

/** Contoh ucapan untuk satu jenis keluhan (laporan). */
export function contohKeluhan(label: string, i = 0): string {
  const k = KOMENTAR[label];
  return k ? `${k.emoji} “${k.teks[i % k.teks.length]}”` : `“${label}”`;
}
