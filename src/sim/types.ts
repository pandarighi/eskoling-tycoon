export type IngredientId = 'kopi' | 'susu' | 'gula' | 'es' | 'cup';
export type WeatherId = 'terik' | 'cerah' | 'berawan' | 'gerimis' | 'hujan';
export type DifficultyId = 'easy' | 'normal' | 'hard';
export type SegmentId = 'warga' | 'ojol' | 'pelajar' | 'kantoran' | 'anakmuda';
export type UpgradeId = 'layan' | 'coolbox' | 'grinder' | 'gerobak';

/** Takaran per cup. kopi=shot, susu=ml, gula=sdm, es=butir */
export interface Recipe {
  kopi: number;
  susu: number;
  gula: number;
  es: number;
}

export type Inventory = Record<IngredientId, number>;

export interface Ingredient {
  id: IngredientId;
  nama: string;
  satuan: string;
  isiPerPak: number;
  hargaPak: number;
  /** hari sebelum basi; null = tidak basi */
  awetHari: number | null;
}

export interface Segment {
  id: SegmentId;
  nama: string;
  ideal: Recipe;
  toleransi: Recipe;
  /** pengali harga wajar lokasi untuk segmen ini */
  toleransiHarga: number;
  /** panjang antrean maksimal yang masih ditoleransi */
  sabar: number;
}

export interface Upgrade {
  id: UpgradeId;
  nama: string;
  ikon: string;
  /** nama tiap level */
  level: string[];
  harga: number[];
  /** nilai efek tiap level (arti tergantung upgrade) */
  efek: number[];
  ket: string;
}

export interface ViralPost {
  akun: string;
  caption: number;
  likes: number;
  views: number;
  komentar: { akun: string; teks: string }[];
}

export interface Location {
  id: string;
  nama: string;
  /** jumlah orang lewat per hari [min, max] */
  lalulintas: [number, number];
  minatDasar: number;
  hargaWajar: number;
  elastisitas: number;
  segmen: Partial<Record<SegmentId, number>>;
  syarat: { modal: number; reputasi: number };
  kebijakanAbsurd: boolean;
}

export interface Difficulty {
  id: DifficultyId;
  nama: string;
  modalAwal: number;
  pengaliSyarat: number;
  fluktuasiHarga: number;
  akurasiCuaca: number;
  peluangKebijakan: number;
  penaltiReputasi: number;
  /** pengali peluang orang lewat mau membeli */
  pengaliPembeli: number;
  /** boleh melewati hari tanpa jualan (mis. saat hujan) */
  bisaSkip: boolean;
  /** reputasi saat mulai main */
  reputasiAwal: number;
  /** seberapa kuat reputasi menentukan minat beli: faktor = (1 - bobot) + bobot × reputasi */
  bobotReputasi: number;
}

export interface Policy {
  id: string;
  nama: string;
  deskripsi: string;
  durasi: number | null;
  pengaliHarga?: Partial<Record<IngredientId, number>>;
  /** biaya tetap per hari (mis. ongkos belanja) */
  biayaHarian?: number;
  /** pengali harga semua bahan, mis. PPN */
  pengaliSemua?: number;
  hanyaMode?: DifficultyId[];
}

export interface ActivePolicy {
  id: string;
  sisaHari: number | null;
}

export interface GameState {
  seed: number;
  hari: number;
  mode: DifficultyId;
  uang: number;
  reputasi: number;
  lokasi: number;
  stok: Inventory;
  /** umur stok basi-able, disederhanakan: hari sejak terakhir beli */
  umurStok: Partial<Record<IngredientId, number>>;
  kebijakan: ActivePolicy[];
  asapSisaHari: number;
  totalOmzet: number;
  upgrade: Partial<Record<UpgradeId, number>>;
  /** obrolan dari mulut ke mulut 0..1, menaikkan minat beli */
  buzz: number;
  viralSisaHari: number;
  viralCooldown: number;
}

export interface DayPlan {
  resep: Recipe;
  harga: number;
  belanja: Partial<Record<IngredientId, number>>; // jumlah pak
}

export interface DayReport {
  hari: number;
  cuaca: WeatherId;
  prakiraan: WeatherId;
  orangLewat: number;
  terjual: number;
  gagalStokHabis: number;
  kaburAntre: number;
  antreMaks: number;
  omzet: number;
  biayaBelanja: number;
  biayaTetap: number;
  laba: number;
  kepuasanRata: number;
  reputasiSebelum: number;
  reputasiSesudah: number;
  buzzSebelum: number;
  buzzSesudah: number;
  /** postingan medsos jika hari ini gerobak viral */
  viral: ViralPost | null;
  /** hari ini masih dalam efek viral */
  sedangViral: boolean;
  keluhan: Record<string, number>;
  terbuang: Partial<Record<IngredientId, number>>;
  kebijakanBaru: string[];
  bisaPindah: boolean;
  /** urutan pembeli untuk animasi; t = 0..1 sepanjang hari jualan */
  events: CustomerEvent[];
}

export interface CustomerEvent {
  t: number;
  seg: SegmentId;
  tipe: 'beli' | 'lewat' | 'habis' | 'kabur';
  keluhan: string | null;
  skor: number;
  /** panjang antrean saat pembeli ini datang */
  antre: number;
}
