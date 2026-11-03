import { create } from 'zustand';

/** State yang berubah cepat saat jualan, dipisah dari store utama agar UI lain tidak ikut re-render. */
interface Live {
  progress: number;
  /** panjang antrean visual saat ini (dibaca penjual untuk animasi melayani) */
  antre: number;
  /** dihitung saat pembeli benar-benar dilayani / pergi di layar, bukan saat event simulasi muncul */
  terjual: number;
  habis: number;
  kabur: number;
  setProgress: (p: number) => void;
  catat: (tipe: 'beli' | 'habis' | 'kabur' | 'lewat') => void;
  reset: () => void;
}

export const useLive = create<Live>((set) => ({
  progress: 0,
  antre: 0,
  terjual: 0,
  habis: 0,
  kabur: 0,
  setProgress: (progress) => set({ progress }),
  catat: (tipe) =>
    set((s) => (tipe === 'beli' ? { terjual: s.terjual + 1 } : tipe === 'habis' ? { habis: s.habis + 1 } : tipe === 'kabur' ? { kabur: s.kabur + 1 } : {})),
  reset: () => set({ progress: 0, antre: 0, terjual: 0, habis: 0, kabur: 0 }),
}));
