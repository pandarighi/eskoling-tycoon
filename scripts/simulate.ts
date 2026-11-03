/**
 * Fase 0 — uji balancing tanpa grafis.
 * Bot "pemain wajar" memainkan tiap mode; cetak hari ke berapa tiap lokasi terbuka.
 * Jalankan: npm run sim  (opsional: npm run sim -- 200 42 → jumlah hari, seed)
 */
import { BAHAN, CUACA, LOKASI, SEGMEN } from '../src/data/game-data';
import { beliUpgrade, bisaPindah, cuacaHari, hargaPakHariIni, hargaUpgrade, newGame, pindahLokasi, simulateDay } from '../src/sim/engine';
import type { DayPlan, DifficultyId, GameState, IngredientId, Recipe, SegmentId, UpgradeId } from '../src/sim/types';

const HARI = Number(process.argv[2] ?? 150);
const SEED = Number(process.argv[3] ?? 2026);

function resepBot(state: GameState): Recipe {
  const lok = LOKASI[state.lokasi];
  const r: Recipe = { kopi: 0, susu: 0, gula: 0, es: 0 };
  for (const [seg, w] of Object.entries(lok.segmen) as [SegmentId, number][]) {
    for (const k of Object.keys(r) as (keyof Recipe)[]) r[k] += SEGMEN[seg].ideal[k] * w;
  }
  r.es += CUACA[cuacaHari(state).prakiraan].esIdeal;
  return { kopi: Math.round(r.kopi * 2) / 2, susu: Math.round(r.susu / 10) * 10, gula: Math.round(r.gula * 2) / 2, es: Math.max(1, Math.round(r.es)) };
}

function planBot(state: GameState, perkiraanCup: number): DayPlan {
  const resep = resepBot(state);
  // batasi target cup sesuai budget (sisakan 10%)
  const biayaCup = (Object.keys(BAHAN) as IngredientId[]).reduce((t, id) => t + (({ ...resep, cup: 1 } as Record<IngredientId, number>)[id] * BAHAN[id].hargaPak * 1.3) / BAHAN[id].isiPerPak, 0);
  perkiraanCup = Math.min(perkiraanCup, Math.floor((state.uang * 0.9) / biayaCup));
  const butuh: Record<IngredientId, number> = { ...resep, cup: 1 };
  // kurangi target sampai total pak (dibulatkan ke atas) muat di uang yang ada
  for (let target = perkiraanCup; target >= 1; target--) {
    const belanja: Partial<Record<IngredientId, number>> = {};
    let total = 0;
    for (const id of Object.keys(BAHAN) as IngredientId[]) {
      const kurang = butuh[id] * target - state.stok[id];
      if (kurang > 0) {
        belanja[id] = Math.ceil(kurang / BAHAN[id].isiPerPak);
        total += belanja[id]! * hargaPakHariIni(state, id);
      }
    }
    if (total <= state.uang) return { resep, harga: LOKASI[state.lokasi].hargaWajar, belanja };
  }
  return { resep, harga: LOKASI[state.lokasi].hargaWajar, belanja: {} };
}

function main() {
  console.log(`Simulasi ${HARI} hari, seed ${SEED}\n`);
  for (const mode of ['easy', 'normal', 'hard'] as DifficultyId[]) {
    let state = newGame(mode, SEED);
    let perkiraan = 25;
    const buka: string[] = [`hari 1: ${LOKASI[0].nama}`];
    let bangkrut = 0, kaburTotal = 0;
    const viralHari: number[] = [];
    const beliU: string[] = [];
    for (let d = 0; d < HARI; d++) {
      const { state: s, report } = simulateDay(state, planBot(state, perkiraan));
      state = s;
      perkiraan = Math.max(10, Math.round((perkiraan * 0.6 + (report.terjual + report.gagalStokHabis) * 0.4) * 1.1));
      if (state.uang < 20_000) bangkrut++;
      kaburTotal += report.kaburAntre;
      if (report.viral) viralHari.push(report.hari);
      // bot membeli upgrade bila sisa uang > 3× harga (cadangan untuk pindah lokasi)
      const urutan: UpgradeId[] = report.kaburAntre > 5 ? ['layan', 'coolbox', 'grinder', 'gerobak'] : ['coolbox', 'grinder', 'layan', 'gerobak'];
      for (const u of urutan) {
        const h = hargaUpgrade(state, u);
        if (h !== null && state.uang > h * 3) { state = beliUpgrade(state, u); beliU.push(`${u}@H${report.hari}`); break; }
      }
      if (d < 5 || d % 30 === 0) {
        console.log(
          `[${mode}] H${report.hari} ${report.cuaca.padEnd(7)} lewat=${report.orangLewat} jual=${report.terjual} habis=${report.gagalStokHabis} kabur=${report.kaburAntre} buzz=${state.buzz.toFixed(2)} ` +
            `laba=${report.laba.toLocaleString('id')} puas=${report.kepuasanRata.toFixed(2)} rep=${state.reputasi.toFixed(2)} uang=${state.uang.toLocaleString('id')} ` +
            `keluhan=${JSON.stringify(report.keluhan)}`,
        );
      }
      if (bisaPindah(state)) {
        state = pindahLokasi(state);
        buka.push(`hari ${state.hari}: ${LOKASI[state.lokasi].nama}`);
        perkiraan = Math.round(perkiraan * 1.5);
      }
    }
    console.log(`\n== ${mode.toUpperCase()} == uang akhir Rp${state.uang.toLocaleString('id')}, reputasi ${state.reputasi.toFixed(2)}, hari kritis (uang < 20rb): ${bangkrut}`);
    console.log(`  kabur antre total: ${kaburTotal}, viral di hari: ${viralHari.join(', ') || '-'}\n  upgrade: ${beliU.join(' ')}`);
    console.log(buka.map((b) => '  • ' + b).join('\n') + '\n');
  }
}

main();
