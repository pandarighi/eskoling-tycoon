import { BAHAN, CUACA, KAPASITAS_DASAR, KEBIJAKAN, KEBIJAKAN_KEJUTAN, LOKASI, MODE, PELUANG_CUACA, SEGMEN, UPGRADE, VIRAL_AKUN, VIRAL_CAPTION, VIRAL_KOMENTAR } from '../data/game-data';
import { createRng, daySeed, type Rng } from './rng';
import type { CustomerEvent, DayPlan, DayReport, DifficultyId, GameState, IngredientId, Inventory, Recipe, SegmentId, UpgradeId, ViralPost, WeatherId } from './types';

const BAHAN_IDS = Object.keys(BAHAN) as IngredientId[];
const BOBOT: Recipe = { kopi: 0.3, susu: 0.25, gula: 0.3, es: 0.15 };
const JAM_JUALAN = 8;

const kosong = (): Inventory => ({ kopi: 0, susu: 0, gula: 0, es: 0, cup: 0 });
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function newGame(mode: DifficultyId, seed = Date.now() % 1e9): GameState {
  return {
    seed,
    hari: 1,
    mode,
    uang: MODE[mode].modalAwal,
    reputasi: MODE[mode].reputasiAwal,
    lokasi: 0,
    stok: kosong(),
    umurStok: {},
    kebijakan: [],
    asapSisaHari: 0,
    totalOmzet: 0,
    upgrade: {},
    buzz: 0,
    viralSisaHari: 0,
    viralCooldown: 0,
  };
}

/** Lengkapi save lama yang belum punya field baru. */
export function migrasi(g: GameState): GameState {
  return { ...g, upgrade: g.upgrade ?? {}, buzz: g.buzz ?? 0, viralSisaHari: g.viralSisaHari ?? 0, viralCooldown: g.viralCooldown ?? 0 };
}

// ===== Upgrade =====
export const levelUpgrade = (s: GameState, id: UpgradeId) => s.upgrade?.[id] ?? 0;
const efekUpgrade = (s: GameState, id: UpgradeId, dasar: number) => {
  const lv = levelUpgrade(s, id);
  return lv ? UPGRADE[id].efek[lv - 1] : dasar;
};
/** cup per jam */
export const kapasitasLayan = (s: GameState) => Math.round(KAPASITAS_DASAR * efekUpgrade(s, 'layan', 1));
export const faktorCair = (s: GameState) => efekUpgrade(s, 'coolbox', 1);
export const bonusRasa = (s: GameState) => efekUpgrade(s, 'grinder', 0);
export const minatGerobak = (s: GameState) => efekUpgrade(s, 'gerobak', 1);
export const awetEfektif = (s: GameState, id: IngredientId): number | null => {
  const a = BAHAN[id].awetHari;
  return a;
};

/** Harga level berikutnya; null jika sudah maksimal. */
export function hargaUpgrade(s: GameState, id: UpgradeId): number | null {
  const lv = levelUpgrade(s, id);
  const h = UPGRADE[id].harga[lv];
  return h === undefined ? null : Math.round((h * MODE[s.mode].pengaliSyarat) / 1000) * 1000;
}

export function beliUpgrade(s: GameState, id: UpgradeId): GameState {
  const h = hargaUpgrade(s, id);
  if (h === null || s.uang < h) return s;
  return { ...s, uang: s.uang - h, upgrade: { ...s.upgrade, [id]: levelUpgrade(s, id) + 1 } };
}

/** Pengali minat beli dari obrolan warga, viral & gerobak. */
export const pengaliMinat = (s: GameState) => (1 + 0.4 * s.buzz) * (s.viralSisaHari > 0 ? 1.6 : 1) * minatGerobak(s);

/** Hari 1 = 1 Oktober (penghujan). 30 hari per bulan dalam game. */
export function musim(hari: number): 'kemarau' | 'penghujan' {
  const bulan = (Math.floor((hari - 1) / 30) + 9) % 12; // 0=Jan
  return bulan >= 3 && bulan <= 8 ? 'kemarau' : 'penghujan';
}

/** Cuaca & prakiraan hari ini; deterministik per (seed, hari). */
export function cuacaHari(state: GameState): { cuaca: WeatherId; prakiraan: WeatherId } {
  const rng = createRng(daySeed(state.seed, state.hari) ^ 0x9e37);
  // Hari 1–3 (tutorial) selalu bersahabat
  const peluang = state.hari <= 3 ? { cerah: 0.5, berawan: 0.5 } : PELUANG_CUACA[musim(state.hari)];
  const cuaca = rng.pick(peluang);
  const prakiraan = state.hari <= 3 || rng.next() < MODE[state.mode].akurasiCuaca ? cuaca : rng.pick(PELUANG_CUACA[musim(state.hari)]);
  return { cuaca, prakiraan };
}

/** Harga satu pak bahan hari ini, termasuk fluktuasi & kebijakan aktif. */
export function hargaPakHariIni(state: GameState, id: IngredientId): number {
  const rng = createRng(daySeed(state.seed, state.hari) ^ (BAHAN_IDS.indexOf(id) + 1) * 7919);
  const f = MODE[state.mode].fluktuasiHarga;
  let harga = BAHAN[id].hargaPak * (1 + rng.range(-f, f));
  for (const ap of state.kebijakan) {
    const p = KEBIJAKAN.find((k) => k.id === ap.id);
    if (!p) continue;
    harga *= p.pengaliHarga?.[id] ?? 1;
    harga *= p.pengaliSemua ?? 1;
  }
  return Math.round(harga / 100) * 100;
}

export function hppPerCup(state: GameState, resep: Recipe): number {
  let total = hargaPakHariIni(state, 'cup') / BAHAN.cup.isiPerPak;
  for (const id of ['kopi', 'susu', 'gula', 'es'] as const) {
    total += (resep[id] * hargaPakHariIni(state, id)) / BAHAN[id].isiPerPak;
  }
  return Math.round(total);
}

export function syaratLokasi(state: GameState, idx: number) {
  const l = LOKASI[idx];
  if (!l) return null;
  return { modal: Math.round(l.syarat.modal * MODE[state.mode].pengaliSyarat), reputasi: l.syarat.reputasi };
}

export function bisaPindah(state: GameState): boolean {
  const s = syaratLokasi(state, state.lokasi + 1);
  return !!s && state.uang >= s.modal && state.reputasi >= s.reputasi;
}

/** Pindah ke lokasi berikutnya. Modal tidak dipotong (syarat = bukti kemampuan), kecuali biaya pindah 20%. */
export function pindahLokasi(state: GameState): GameState {
  if (!bisaPindah(state)) return state;
  const s = syaratLokasi(state, state.lokasi + 1)!;
  const next: GameState = { ...state, lokasi: state.lokasi + 1, uang: state.uang - Math.round(s.modal * 0.2), reputasi: state.reputasi * 0.7, buzz: state.buzz * 0.5 };
  if (next.lokasi === 1 && !next.kebijakan.some((k) => k.id === KEBIJAKAN_KEJUTAN)) {
    const p = KEBIJAKAN.find((k) => k.id === KEBIJAKAN_KEJUTAN)!;
    next.kebijakan = [...next.kebijakan, { id: p.id, sisaHari: p.durasi }];
  }
  return next;
}

/** Kepuasan satu pembeli 0..1 terhadap resep & harga. */
export function kepuasan(seg: SegmentId, resep: Recipe, harga: number, hargaWajar: number, cuaca: WeatherId): { skor: number; keluhan: string | null } {
  const s = SEGMEN[seg];
  const ideal = { ...s.ideal, es: s.ideal.es + CUACA[cuaca].esIdeal };
  let jarak = 0;
  let terburuk: { id: keyof Recipe; d: number } | null = null;
  for (const id of ['kopi', 'susu', 'gula', 'es'] as const) {
    const d = (resep[id] - ideal[id]) / s.toleransi[id];
    jarak += BOBOT[id] * Math.abs(d);
    if (!terburuk || Math.abs(d) > Math.abs(terburuk.d)) terburuk = { id, d };
  }
  const wajar = hargaWajar * s.toleransiHarga;
  const penaltiHarga = Math.max(0, harga / wajar - 1) * 0.6;
  const skor = clamp(1 - jarak - penaltiHarga, 0, 1);
  let keluhan: string | null = null;
  if (penaltiHarga > 0.15) keluhan = 'Kemahalan';
  else if (terburuk && Math.abs(terburuk.d) > 0.6) {
    const label: Record<keyof Recipe, [string, string]> = {
      kopi: ['Kurang nendang', 'Kepahitan'],
      susu: ['Kurang creamy', 'Eneg susunya'],
      gula: ['Kurang manis', 'Kemanisan'],
      es: ['Kurang dingin', 'Kebanyakan es'],
    };
    keluhan = label[terburuk.id][terburuk.d < 0 ? 0 : 1];
  }
  return { skor, keluhan };
}

function tambahKeluhan(map: Record<string, number>, k: string | null) {
  if (k) map[k] = (map[k] ?? 0) + 1;
}

/** Simulasi satu hari penuh. Fungsi murni: tidak mengubah state input. */
export function simulateDay(input: GameState, plan: DayPlan): { state: GameState; report: DayReport } {
  const state: GameState = structuredClone(input);
  const mode = MODE[state.mode];
  const lok = LOKASI[state.lokasi];
  const rng: Rng = createRng(daySeed(state.seed, state.hari));
  const { cuaca, prakiraan } = cuacaHari(state);
  const keluhan: Record<string, number> = {};
  const kebijakanBaru: string[] = [];

  // 1. Belanja
  let biayaBelanja = 0;
  for (const id of BAHAN_IDS) {
    const pak = Math.max(0, Math.floor(plan.belanja[id] ?? 0));
    if (!pak) continue;
    const harga = hargaPakHariIni(state, id);
    const beli = Math.min(pak, Math.floor(state.uang / harga));
    if (beli <= 0) continue;
    state.uang -= beli * harga;
    biayaBelanja += beli * harga;
    state.stok[id] += beli * BAHAN[id].isiPerPak;
    state.umurStok[id] = 0;
  }

  // 2. Jualan
  const cuacaInfo = CUACA[cuaca];
  const asap = state.asapSisaHari > 0 ? 0.6 : 1;
  const orangLewat = Math.round(rng.int(lok.lalulintas[0], lok.lalulintas[1]) * cuacaInfo.lalulintas * asap);
  const harga = Math.max(500, plan.harga);
  let terjual = 0, gagal = 0, kabur = 0, omzet = 0, totalSkor = 0, senang = 0, kecewaRasa = 0;
  const kebutuhan = plan.resep;
  const events: CustomerEvent[] = [];
  const sedangViral = state.viralSisaHari > 0;
  const minat = pengaliMinat(state);
  const kap = kapasitasLayan(state);
  const dtJam = JAM_JUALAN / Math.max(1, orangLewat);
  const cair = cuacaInfo.mencairPerJam * faktorCair(state);
  const bonus = bonusRasa(state);
  let antre = 0, antreMaks = 0;

  for (let i = 0; i < orangLewat; i++) {
    // es mencair seiring jam jualan
    const jam = (i / orangLewat) * JAM_JUALAN;
    if (i > 0 && Math.floor(jam) !== Math.floor(((i - 1) / orangLewat) * JAM_JUALAN)) {
      state.stok.es = Math.floor(state.stok.es * (1 - cair));
    }
    antre = Math.max(0, antre - kap * dtJam);
    const q = Math.round(antre);
    const seg = rng.pick(lok.segmen);
    const sibuk = jam < 1.5 || (jam >= 5.5 && jam < 7) ? 1.45 : 0.8;
    const wajar = lok.hargaWajar * SEGMEN[seg].toleransiHarga;
    const pBeli = clamp(lok.minatDasar * mode.pengaliPembeli * cuacaInfo.permintaan * (1 - mode.bobotReputasi + mode.bobotReputasi * state.reputasi) * minat * sibuk * Math.pow(wajar / harga, lok.elastisitas), 0, 0.95);
    if (rng.next() >= pBeli) {
      const mahal = harga > wajar * 1.3 && rng.next() < 0.1;
      if (mahal) tambahKeluhan(keluhan, 'Kemahalan');
      events.push({ t: i / orangLewat, seg, tipe: 'lewat', keluhan: mahal ? 'Kemahalan' : null, skor: 0, antre: q });
      continue;
    }
    if (antre >= SEGMEN[seg].sabar) {
      kabur++;
      tambahKeluhan(keluhan, 'Antrean kelamaan');
      events.push({ t: i / orangLewat, seg, tipe: 'kabur', keluhan: 'Antrean kelamaan', skor: 0, antre: q });
      continue;
    }
    const cukup = state.stok.cup >= 1 && (['kopi', 'susu', 'gula', 'es'] as const).every((id) => state.stok[id] >= kebutuhan[id]);
    if (!cukup) {
      gagal++;
      events.push({ t: i / orangLewat, seg, tipe: 'habis', keluhan: 'Stok habis', skor: 0, antre: q });
      continue;
    }
    for (const id of ['kopi', 'susu', 'gula', 'es'] as const) state.stok[id] -= kebutuhan[id];
    state.stok.cup -= 1;
    const k = kepuasan(seg, kebutuhan, harga, lok.hargaWajar, cuaca);
    k.skor = clamp(k.skor + bonus, 0, 1);
    antre += 1;
    antreMaks = Math.max(antreMaks, Math.round(antre));
    if (k.keluhan) kecewaRasa++;
    else if (k.skor >= 0.8) senang++;
    tambahKeluhan(keluhan, k.keluhan);
    events.push({ t: i / orangLewat, seg, tipe: 'beli', keluhan: k.keluhan, skor: k.skor, antre: q });
    totalSkor += k.skor;
    terjual++;
    omzet += harga;
  }
  state.uang += omzet;
  state.totalOmzet += omzet;

  // 3. Akhir hari: es sisa mencair habis (satu-satunya bahan yang terbuang)
  const terbuang: Partial<Record<IngredientId, number>> = {};
  if (state.stok.es > 0) terbuang.es = state.stok.es;
  state.stok.es = 0;
  for (const id of BAHAN_IDS) {
    const awet = awetEfektif(state, id);
    if (awet === null || state.stok[id] <= 0) continue;
    state.umurStok[id] = (state.umurStok[id] ?? 0) + 1;
    if (state.umurStok[id]! >= awet) {
      terbuang[id] = state.stok[id];
      state.stok[id] = 0;
    }
  }

  // 4. Biaya tetap kebijakan
  let biayaTetap = 0;
  for (const ap of state.kebijakan) biayaTetap += KEBIJAKAN.find((k) => k.id === ap.id)?.biayaHarian ?? 0;
  state.uang -= biayaTetap;

  // 5. Reputasi: geser 15% ke kepuasan hari ini; pembeli kecewa stok habis menekan reputasi
  const kepuasanRata = terjual ? totalSkor / terjual : 0;
  const reputasiSebelum = state.reputasi;
  if (terjual > 0) {
    const target = kepuasanRata - ((gagal + kabur * 0.5) / (terjual + gagal + kabur)) * 0.3 * mode.penaltiReputasi;
    const laju = target < state.reputasi ? 0.15 * mode.penaltiReputasi : 0.15;
    state.reputasi = clamp(state.reputasi + (target - state.reputasi) * laju, 0, 1);
  } else {
    state.reputasi = clamp(state.reputasi - 0.02 * mode.penaltiReputasi, 0, 1);
  }

  // 5b. Mulut ke mulut: pembeli puas bercerita, yang kecewa bercerita lebih keras
  const buzzSebelum = state.buzz;
  const wom = (senang - 1.2 * kecewaRasa - 0.6 * (gagal + kabur)) / Math.max(25, terjual + gagal + kabur);
  state.buzz = clamp(state.buzz * 0.65 + Math.max(-0.3, wom) * 0.45, 0, 1);

  // 5c. Viral di medsos
  if (state.viralSisaHari > 0) state.viralSisaHari--;
  if (state.viralCooldown > 0) state.viralCooldown--;
  let viral: ViralPost | null = null;
  if (state.viralCooldown === 0 && state.buzz >= 0.6 && state.reputasi >= 0.5 && terjual >= 20 && rng.next() < 0.4) {
    state.viralSisaHari = 3;
    state.viralCooldown = 12;
    state.reputasi = clamp(state.reputasi + 0.03, 0, 1);
    viral = buatPostViral(rng, terjual, state.lokasi);
  }

  // 6. Kebijakan: kurangi durasi, mungkin muncul baru
  state.kebijakan = state.kebijakan
    .map((k) => ({ ...k, sisaHari: k.sisaHari === null ? null : k.sisaHari - 1 }))
    .filter((k) => k.sisaHari === null || k.sisaHari > 0);
  if (lok.kebijakanAbsurd && rng.next() < mode.peluangKebijakan) {
    const kandidat = KEBIJAKAN.filter((k) => !state.kebijakan.some((a) => a.id === k.id) && (!k.hanyaMode || k.hanyaMode.includes(state.mode)));
    if (kandidat.length) {
      const p = kandidat[rng.int(0, kandidat.length - 1)];
      state.kebijakan.push({ id: p.id, sisaHari: p.durasi });
      kebijakanBaru.push(p.nama);
    }
  }

  // 7. Rintangan Hard: asap pekat
  if (state.asapSisaHari > 0) state.asapSisaHari--;
  else if (state.mode === 'hard' && state.lokasi >= 2 && rng.next() < 0.05) {
    state.asapSisaHari = rng.int(3, 5);
    kebijakanBaru.push('Asap pekat pembakaran hutan');
  }

  const report: DayReport = {
    hari: state.hari,
    cuaca,
    prakiraan,
    orangLewat,
    terjual,
    gagalStokHabis: gagal,
    kaburAntre: kabur,
    antreMaks,
    omzet,
    biayaBelanja,
    biayaTetap,
    laba: omzet - biayaBelanja - biayaTetap,
    kepuasanRata,
    reputasiSebelum,
    reputasiSesudah: state.reputasi,
    buzzSebelum,
    buzzSesudah: state.buzz,
    viral,
    sedangViral,
    keluhan,
    terbuang,
    kebijakanBaru,
    bisaPindah: false,
    events,
  };
  state.hari++;
  report.bisaPindah = bisaPindah(state);
  return { state, report };
}

function buatPostViral(rng: Rng, terjual: number, lokasi: number): ViralPost {
  const likes = Math.round(terjual * rng.range(40, 120) * (1 + lokasi * 0.6));
  const sisa = [...VIRAL_KOMENTAR];
  const akun = VIRAL_AKUN[rng.int(0, VIRAL_AKUN.length - 1)];
  const lain = VIRAL_AKUN.filter((a) => a !== akun);
  const komentar = Array.from({ length: 3 }, () => ({
    akun: lain.splice(rng.int(0, lain.length - 1), 1)[0],
    teks: sisa.splice(rng.int(0, sisa.length - 1), 1)[0],
  }));
  return {
    akun,
    caption: rng.int(0, VIRAL_CAPTION.length - 1),
    likes,
    views: Math.round(likes * rng.range(8, 15)),
    komentar,
  };
}

/**
 * Lewati satu hari tanpa berjualan (mis. saat hujan deras). Tidak ada belanja & pemasukan,
 * reputasi tetap; obrolan warga sedikit mereda, kebijakan & efek berjalan satu hari.
 */
export function lewatiHari(input: GameState): GameState {
  if (!MODE[input.mode].bisaSkip) return input;
  const state: GameState = structuredClone(input);
  state.stok.es = 0;
  state.buzz = clamp(state.buzz * 0.85, 0, 1);
  if (state.viralSisaHari > 0) state.viralSisaHari--;
  if (state.viralCooldown > 0) state.viralCooldown--;
  state.kebijakan = state.kebijakan
    .map((k) => ({ ...k, sisaHari: k.sisaHari === null ? null : k.sisaHari - 1 }))
    .filter((k) => k.sisaHari === null || k.sisaHari > 0);
  if (state.asapSisaHari > 0) state.asapSisaHari--;
  state.hari++;
  return state;
}
