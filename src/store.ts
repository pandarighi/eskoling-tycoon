import { create } from 'zustand';
import { BAHAN, CUACA, LOKASI, SEGMEN } from './data/game-data';
import { beliUpgrade, cuacaHari, lewatiHari, migrasi, newGame, pindahLokasi, simulateDay } from './sim/engine';
import type { DayPlan, DayReport, DifficultyId, GameState, IngredientId, Recipe, UpgradeId } from './sim/types';

export type Screen = 'menu' | 'prep' | 'jualan' | 'viral' | 'laporan' | 'kustom' | 'gusur';

export const WARNA = {
  normal: [
    { nama: 'Merah cabai', hex: '#d63b2f' },
    { nama: 'Biru laut', hex: '#1f6fb2' },
    { nama: 'Hijau daun', hex: '#3f9a48' },
    { nama: 'Kuning kunyit', hex: '#e9a917' },
    { nama: 'Hitam doff', hex: '#2b2b30' },
    { nama: 'Putih susu', hex: '#f1ece2' },
  ],
  pastel: [
    { nama: 'Pink sakura', hex: '#f6b8c8' },
    { nama: 'Lilac', hex: '#c8b6ec' },
    { nama: 'Mint', hex: '#a8e6cf' },
    { nama: 'Baby blue', hex: '#a9d6f5' },
    { nama: 'Peach', hex: '#ffcfa8' },
    { nama: 'Krem vanila', hex: '#f6e7b8' },
  ],
} as const;

export interface Kustom {
  namaMenu: string;
  /** @deprecated fitur maskot dihapus; dibiarkan agar save lama tetap terbaca */
  maskot?: string;
  warna: string;
}

interface SaveSlot {
  game: GameState;
  plan: DayPlan;
}

interface SaveFile {
  version: 1;
  completed: Record<DifficultyId, boolean>;
  gusurCount: Record<DifficultyId, number>;
  saves: Partial<Record<DifficultyId, SaveSlot>>;
  kustom: Kustom;
}

const KEY = 'eskoling-tycoon-save-v1';
const DEFAULT_KUSTOM: Kustom = { namaMenu: 'Es Kopi Susu Aren', warna: '#e9a917' };

function loadSave(): SaveFile {
  const blank: SaveFile = {
    version: 1,
    completed: { easy: false, normal: false, hard: false },
    gusurCount: { easy: 0, normal: 0, hard: 0 },
    saves: {},
    kustom: DEFAULT_KUSTOM,
  };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return blank;
    const data = JSON.parse(raw) as SaveFile;
    return { ...blank, ...data, kustom: { ...DEFAULT_KUSTOM, ...data.kustom } };
  } catch {
    return blank;
  }
}

function writeSave(s: SaveFile) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage penuh / mode privat: game tetap jalan tanpa save */
  }
}

/** Resep awal yang cukup masuk akal untuk segmen dominan lokasi. */
export function resepDefault(lokasi: number): Recipe {
  const lok = LOKASI[lokasi];
  const r: Recipe = { kopi: 0, susu: 0, gula: 0, es: 0 };
  for (const [seg, w] of Object.entries(lok.segmen)) {
    const ideal = SEGMEN[seg as keyof typeof SEGMEN].ideal;
    for (const k of Object.keys(r) as (keyof Recipe)[]) r[k] += ideal[k] * (w ?? 0);
  }
  // sengaja sedikit meleset agar pemain belajar meracik dari keluhan
  return { kopi: Math.max(0.5, Math.round(r.kopi * 2) / 2 - 0.5), susu: Math.round(r.susu / 10) * 10, gula: Math.round(r.gula * 2) / 2 + 0.5, es: Math.round(r.es) };
}

function planDefault(game: GameState): DayPlan {
  return { resep: resepDefault(game.lokasi), harga: LOKASI[game.lokasi].hargaWajar, belanja: { kopi: 2, susu: 2, gula: 2, es: 1, cup: 1 } };
}

interface Store {
  screen: Screen;
  save: SaveFile;
  game: GameState | null;
  plan: DayPlan;
  /** hasil hari yang sedang dianimasikan / baru selesai */
  hasil: { state: GameState; report: DayReport } | null;
  speed: 1 | 2 | 4;
  kustomDari: Screen;

  go: (s: Screen) => void;
  mulaiMode: (mode: DifficultyId, baru: boolean) => void;
  setResep: (k: keyof Recipe, v: number) => void;
  setHarga: (v: number) => void;
  setBelanja: (id: IngredientId, pak: number) => void;
  mulaiJualan: () => void;
  skipHari: () => void;
  /** pesan singkat setelah skip hari */
  info: string | null;
  selesaiJualan: () => void;
  hariBerikut: () => void;
  pindah: () => void;
  beli: (id: UpgradeId) => void;
  digusur: () => void;
  selesaiGusur: () => void;
  setSpeed: (s: 1 | 2 | 4) => void;
  setKustom: (k: Partial<Kustom>) => void;
  bukaKustom: () => void;
  hapusSemua: () => void;
}

export const useGame = create<Store>((set, get) => {
  const persist = (patch: Partial<SaveFile>) => {
    const save = { ...get().save, ...patch };
    writeSave(save);
    set({ save });
  };
  const persistSlot = () => {
    const { game, plan, save } = get();
    if (!game) return;
    persist({ saves: { ...save.saves, [game.mode]: { game, plan } } });
  };

  return {
    screen: 'menu',
    save: loadSave(),
    game: null,
    plan: { resep: { kopi: 1, susu: 60, gula: 2.5, es: 5 }, harga: 5000, belanja: {} },
    hasil: null,
    speed: 1,
    kustomDari: 'menu',

    go: (screen) => set({ screen }),

    mulaiMode: (mode, baru) => {
      const slot = get().save.saves[mode];
      if (slot && !baru) {
        set({ game: migrasi(slot.game), plan: slot.plan, screen: 'prep', hasil: null });
        return;
      }
      const game = newGame(mode);
      game.reputasi = Math.min(0.6, game.reputasi + 0.05 * get().save.gusurCount[mode]);
      set({ game, plan: planDefault(game), screen: 'prep', hasil: null });
      persistSlot();
    },

    setResep: (k, v) => set((s) => ({ plan: { ...s.plan, resep: { ...s.plan.resep, [k]: v } } })),
    setHarga: (v) => set((s) => ({ plan: { ...s.plan, harga: Math.max(500, v) } })),
    setBelanja: (id, pak) => set((s) => ({ plan: { ...s.plan, belanja: { ...s.plan.belanja, [id]: Math.max(0, pak) } } })),

    info: null,

    skipHari: () => {
      const { game } = get();
      if (!game) return;
      const next = lewatiHari(game);
      if (next === game) return;
      set({ game: next, hasil: null, info: `Hari ${game.hari} dilewati. Gerobak libur, tidak ada belanja & pemasukan.` });
      persistSlot();
      setTimeout(() => set({ info: null }), 3500);
    },

    mulaiJualan: () => {
      const { game, plan } = get();
      if (!game) return;
      set({ hasil: simulateDay(game, plan), screen: 'jualan' });
    },

    selesaiJualan: () => {
      const { hasil } = get();
      if (!hasil) return;
      // daftar belanja kemarin dipertahankan sebagai default; pemain tinggal menyesuaikan
      set({ game: hasil.state, screen: hasil.report.viral ? 'viral' : 'laporan' });
      persistSlot();
    },

    hariBerikut: () => set({ screen: 'prep', hasil: null }),

    pindah: () => {
      const { game } = get();
      if (!game) return;
      const next = pindahLokasi(game);
      if (next === game) return;
      set((s) => ({ game: next, plan: { ...planDefault(next), belanja: s.plan.belanja }, screen: 'prep', hasil: null }));
      persistSlot();
    },

    beli: (id) => {
      const { game } = get();
      if (!game) return;
      const next = beliUpgrade(game, id);
      if (next === game) return;
      set({ game: next });
      persistSlot();
    },

    digusur: () => set({ screen: 'gusur' }),

    selesaiGusur: () => {
      const { game, save } = get();
      if (!game) return;
      const mode = game.mode;
      const saves = { ...save.saves };
      delete saves[mode];
      persist({
        completed: { ...save.completed, [mode]: true },
        gusurCount: { ...save.gusurCount, [mode]: save.gusurCount[mode] + 1 },
        saves,
      });
      set({ game: null, screen: 'menu', hasil: null });
    },

    setSpeed: (speed) => set({ speed }),
    setKustom: (k) => persist({ kustom: { ...get().save.kustom, ...k } }),
    bukaKustom: () => set((s) => ({ kustomDari: s.screen, screen: 'kustom' })),
    hapusSemua: () => {
      try {
        localStorage.removeItem(KEY);
      } catch {
        /* abaikan */
      }
      set({ save: loadSave(), game: null, screen: 'menu' });
    },
  };
});

// ===== helper turunan untuk UI =====
export const bahanIds = Object.keys(BAHAN) as IngredientId[];
export const prakiraan = (g: GameState) => CUACA[cuacaHari(g).prakiraan];
