import { describe, expect, it } from 'vitest';
import { LOKASI, SEGMEN } from '../data/game-data';
import { lewatiHari, beliUpgrade, cuacaHari, hargaPakHariIni, hargaUpgrade, kapasitasLayan, kepuasan, migrasi, newGame, pindahLokasi, simulateDay } from './engine';
import type { DayPlan } from './types';

const plan: DayPlan = { resep: { kopi: 1, susu: 60, gula: 2.5, es: 5 }, harga: 5000, belanja: { kopi: 2, susu: 2, gula: 1, es: 1, cup: 1 } };

describe('engine', () => {
  it('deterministik untuk seed yang sama', () => {
    const a = simulateDay(newGame('normal', 42), plan);
    const b = simulateDay(newGame('normal', 42), plan);
    expect(a.report).toEqual(b.report);
  });

  it('tidak mengubah state input (fungsi murni)', () => {
    const s = newGame('normal', 1);
    const copy = structuredClone(s);
    simulateDay(s, plan);
    expect(s).toEqual(copy);
  });

  it('resep ideal + harga wajar memberi kepuasan tinggi', () => {
    const k = kepuasan('warga', SEGMEN.warga.ideal, 5000, 5000, 'berawan');
    expect(k.skor).toBeGreaterThan(0.95);
    expect(k.keluhan).toBeNull();
  });

  it('kemanisan & kemahalan terdeteksi', () => {
    expect(kepuasan('warga', { ...SEGMEN.warga.ideal, gula: 5 }, 5000, 5000, 'berawan').keluhan).toBe('Kemanisan');
    expect(kepuasan('warga', SEGMEN.warga.ideal, 9000, 5000, 'berawan').keluhan).toBe('Kemahalan');
  });

  it('hari 1–3 tidak pernah hujan dan prakiraannya akurat', () => {
    for (let seed = 0; seed < 50; seed++) {
      for (let hari = 1; hari <= 3; hari++) {
        const c = cuacaHari({ ...newGame('hard', seed), hari });
        expect(['cerah', 'berawan']).toContain(c.cuaca);
        expect(c.prakiraan).toBe(c.cuaca);
      }
    }
  });

  it('tidak bisa belanja melebihi uang, stok tanpa cup tidak terjual', () => {
    const { state, report } = simulateDay(newGame('hard', 3), { ...plan, belanja: { kopi: 99 } });
    expect(state.uang).toBeGreaterThanOrEqual(0);
    expect(report.terjual).toBe(0);
  });

  it('pindah ke lokasi 2 memicu kebijakan kejutan', () => {
    const s = { ...newGame('normal', 5), uang: 2_000_000, reputasi: 0.6 };
    const next = pindahLokasi(s);
    expect(LOKASI[next.lokasi].id).toBe('kosambi');
    expect(next.kebijakan.map((k) => k.id)).toContain('aren');
    expect(hargaPakHariIni(next, 'gula')).toBeGreaterThan(hargaPakHariIni(s, 'gula'));
  });

  it('syarat belum terpenuhi → tidak pindah', () => {
    const s = newGame('normal', 5);
    expect(pindahLokasi(s)).toBe(s);
  });

  it('antrean panjang membuat pembeli kabur; upgrade layan menguranginya', () => {
    const banyak: DayPlan = { resep: SEGMEN.pelajar.ideal, harga: 6000, belanja: { kopi: 40, susu: 40, gula: 30, es: 10, cup: 16 } };
    const base = { ...newGame('normal', 11), lokasi: 4, uang: 50_000_000, reputasi: 0.9, hari: 10 };
    const a = simulateDay(base, banyak).report;
    const cepat = { ...base, upgrade: { layan: 3 } };
    const b = simulateDay(cepat, banyak).report;
    expect(a.kaburAntre).toBeGreaterThan(0);
    expect(b.kaburAntre).toBeLessThan(a.kaburAntre);
    expect(kapasitasLayan(cepat)).toBeGreaterThan(kapasitasLayan(base));
  });

  it('beli upgrade memotong uang dan naik level, berhenti di level maksimal', () => {
    let s = { ...newGame('normal', 1), uang: 10_000_000 };
    const h = hargaUpgrade(s, 'coolbox')!;
    s = beliUpgrade(s, 'coolbox');
    expect(s.upgrade.coolbox).toBe(1);
    expect(s.uang).toBe(10_000_000 - h);
    s = beliUpgrade(s, 'coolbox');
    expect(hargaUpgrade(s, 'coolbox')).toBeNull();
    expect(beliUpgrade(s, 'coolbox')).toBe(s);
  });

  it('save lama tanpa field baru tetap bisa dimainkan', () => {
    const lama = newGame('easy', 3) as Partial<ReturnType<typeof newGame>>;
    delete lama.upgrade;
    delete lama.buzz;
    const g = migrasi(lama as ReturnType<typeof newGame>);
    expect(() => simulateDay(g, plan)).not.toThrow();
  });

  it('pembeli puas menaikkan obrolan warga sampai akhirnya viral', () => {
    let s = { ...newGame('easy', 7), uang: 5_000_000, reputasi: 0.8, hari: 10 };
    const p: DayPlan = { resep: SEGMEN.warga.ideal, harga: 4500, belanja: { kopi: 10, susu: 10, gula: 8, es: 4, cup: 4 } };
    let viral = false;
    for (let d = 0; d < 30 && !viral; d++) {
      const r = simulateDay(s, p);
      s = r.state;
      if (r.report.viral) viral = true;
    }
    expect(s.buzz).toBeGreaterThan(0.3);
    expect(viral).toBe(true);
  });

  it('skip hari: hari maju, uang & reputasi tetap, kebijakan berkurang', () => {
    const s = { ...newGame('normal', 4), kebijakan: [{ id: 'pajak-es', sisaHari: 2 }] };
    const n = lewatiHari(s);
    expect(n.hari).toBe(s.hari + 1);
    expect(n.uang).toBe(s.uang);
    expect(n.reputasi).toBe(s.reputasi);
    expect(n.kebijakan[0].sisaHari).toBe(1);
  });

  it('mode Easy menarik lebih banyak pembeli dari Normal pada kondisi sama', () => {
    const p: DayPlan = { resep: SEGMEN.warga.ideal, harga: 5000, belanja: { kopi: 10, susu: 10, gula: 8, es: 4, cup: 4 } };
    let easy = 0, normal = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const base = { ...newGame('normal', seed), uang: 1_000_000, hari: 5 };
      normal += simulateDay(base, p).report.terjual;
      easy += simulateDay({ ...base, mode: 'easy' as const }, p).report.terjual;
    }
    expect(easy).toBeGreaterThan(normal * 1.15);
  });
});
