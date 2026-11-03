import type { Difficulty, DifficultyId, Ingredient, IngredientId, Location, Policy, Segment, SegmentId, Upgrade, UpgradeId, WeatherId } from '../sim/types';

export const BAHAN: Record<IngredientId, Ingredient> = {
  kopi: { id: 'kopi', nama: 'Kopi bubuk', satuan: 'shot', isiPerPak: 20, hargaPak: 20000, awetHari: null },
  susu: { id: 'susu', nama: 'Susu (literan)', satuan: 'ml', isiPerPak: 1000, hargaPak: 18000, awetHari: null },
  gula: { id: 'gula', nama: 'Gula aren cair', satuan: 'sdm', isiPerPak: 33, hargaPak: 15000, awetHari: null },
  es: { id: 'es', nama: 'Es batu', satuan: 'butir', isiPerPak: 150, hargaPak: 5000, awetHari: null },
  cup: { id: 'cup', nama: 'Cup + sedotan', satuan: 'set', isiPerPak: 50, hargaPak: 25000, awetHari: null },
};

export const SEGMEN: Record<SegmentId, Segment> = {
  warga: { id: 'warga', nama: 'Warga & ibu-ibu', ideal: { kopi: 1, susu: 60, gula: 2.5, es: 5 }, toleransi: { kopi: 0.8, susu: 40, gula: 1.2, es: 3 }, toleransiHarga: 1.0, sabar: 6 },
  ojol: { id: 'ojol', nama: 'Buruh & ojol', ideal: { kopi: 2, susu: 40, gula: 2, es: 5 }, toleransi: { kopi: 0.8, susu: 35, gula: 1.2, es: 3 }, toleransiHarga: 1.05, sabar: 4 },
  pelajar: { id: 'pelajar', nama: 'Pelajar', ideal: { kopi: 1, susu: 70, gula: 3, es: 6 }, toleransi: { kopi: 0.7, susu: 40, gula: 1.2, es: 3 }, toleransiHarga: 0.95, sabar: 5 },
  kantoran: { id: 'kantoran', nama: 'Pekerja kantoran', ideal: { kopi: 2, susu: 30, gula: 0.8, es: 5 }, toleransi: { kopi: 0.7, susu: 30, gula: 0.8, es: 3 }, toleransiHarga: 1.25, sabar: 3 },
  anakmuda: { id: 'anakmuda', nama: 'Anak muda', ideal: { kopi: 1.5, susu: 60, gula: 1.5, es: 6 }, toleransi: { kopi: 0.8, susu: 35, gula: 1, es: 3 }, toleransiHarga: 1.15, sabar: 5 },
};

export const LOKASI: Location[] = [
  { id: 'cikapundung', nama: 'Kampung Bantaran Cikapundung', lalulintas: [150, 220], minatDasar: 0.3, hargaWajar: 5000, elastisitas: 2.0, segmen: { warga: 0.7, pelajar: 0.2, ojol: 0.1 }, syarat: { modal: 0, reputasi: 0 }, kebijakanAbsurd: false },
  { id: 'kosambi', nama: 'Pasar Kosambi & Pangkalan Ojol', lalulintas: [260, 380], minatDasar: 0.3, hargaWajar: 6000, elastisitas: 1.8, segmen: { warga: 0.4, ojol: 0.5, pelajar: 0.1 }, syarat: { modal: 1_000_000, reputasi: 0.45 }, kebijakanAbsurd: true },
  { id: 'belitung', nama: 'Depan SMA Jl. Belitung', lalulintas: [360, 520], minatDasar: 0.3, hargaWajar: 7000, elastisitas: 1.7, segmen: { pelajar: 0.7, warga: 0.15, ojol: 0.15 }, syarat: { modal: 3_000_000, reputasi: 0.55 }, kebijakanAbsurd: true },
  { id: 'dipatiukur', nama: 'Kawasan Kampus Dipatiukur', lalulintas: [520, 760], minatDasar: 0.3, hargaWajar: 10000, elastisitas: 1.5, segmen: { anakmuda: 0.6, pelajar: 0.2, ojol: 0.2 }, syarat: { modal: 7_000_000, reputasi: 0.65 }, kebijakanAbsurd: true },
  { id: 'stasiun', nama: 'Stasiun Bandung', lalulintas: [850, 1300], minatDasar: 0.3, hargaWajar: 12000, elastisitas: 1.3, segmen: { kantoran: 0.5, anakmuda: 0.3, warga: 0.2 }, syarat: { modal: 15_000_000, reputasi: 0.72 }, kebijakanAbsurd: true },
  { id: 'cfd', nama: 'CFD Dago & Alun-alun', lalulintas: [1200, 1900], minatDasar: 0.3, hargaWajar: 15000, elastisitas: 1.0, segmen: { anakmuda: 0.5, warga: 0.3, kantoran: 0.2 }, syarat: { modal: 30_000_000, reputasi: 0.78 }, kebijakanAbsurd: true },
  { id: 'braga', nama: 'Trotoar Braga', lalulintas: [2000, 3200], minatDasar: 0.3, hargaWajar: 18000, elastisitas: 0.8, segmen: { kantoran: 0.4, anakmuda: 0.5, warga: 0.1 }, syarat: { modal: 60_000_000, reputasi: 0.85 }, kebijakanAbsurd: true },
];

export const CUACA: Record<WeatherId, { nama: string; suhu: [number, number]; permintaan: number; lalulintas: number; mencairPerJam: number; esIdeal: number }> = {
  terik: { nama: 'Terik', suhu: [33, 36], permintaan: 1.6, lalulintas: 1.0, mencairPerJam: 0.1, esIdeal: 2 },
  cerah: { nama: 'Cerah', suhu: [29, 32], permintaan: 1.2, lalulintas: 1.0, mencairPerJam: 0.07, esIdeal: 1 },
  berawan: { nama: 'Berawan', suhu: [27, 29], permintaan: 1.0, lalulintas: 1.0, mencairPerJam: 0.05, esIdeal: 0 },
  gerimis: { nama: 'Gerimis', suhu: [25, 27], permintaan: 0.7, lalulintas: 0.85, mencairPerJam: 0.03, esIdeal: -1 },
  hujan: { nama: 'Hujan deras', suhu: [23, 25], permintaan: 0.4, lalulintas: 0.6, mencairPerJam: 0.02, esIdeal: -2 },
};

/** Peluang cuaca per musim; kemarau Apr–Sep */
export const PELUANG_CUACA: Record<'kemarau' | 'penghujan', Record<WeatherId, number>> = {
  kemarau: { terik: 0.3, cerah: 0.35, berawan: 0.2, gerimis: 0.1, hujan: 0.05 },
  penghujan: { terik: 0.1, cerah: 0.2, berawan: 0.25, gerimis: 0.25, hujan: 0.2 },
};

export const MODE: Record<DifficultyId, Difficulty> = {
  easy: { id: 'easy', nama: 'Easy', modalAwal: 250_000, pengaliSyarat: 0.7, fluktuasiHarga: 0.08, akurasiCuaca: 0.9, peluangKebijakan: 0.04, penaltiReputasi: 0.8, pengaliPembeli: 1.3, bisaSkip: true },
  normal: { id: 'normal', nama: 'Normal', modalAwal: 150_000, pengaliSyarat: 1.0, fluktuasiHarga: 0.15, akurasiCuaca: 0.75, peluangKebijakan: 0.08, penaltiReputasi: 1.0, pengaliPembeli: 1.0, bisaSkip: true },
  hard: { id: 'hard', nama: 'Hard', modalAwal: 100_000, pengaliSyarat: 1.5, fluktuasiHarga: 0.25, akurasiCuaca: 0.6, peluangKebijakan: 0.14, penaltiReputasi: 1.4, pengaliPembeli: 1.0, bisaSkip: true },
};

/** Kebijakan fiktif (satire). Muncul mulai lokasi 2. */
export const KEBIJAKAN: Policy[] = [
  { id: 'pajak-es', nama: 'Pajak Es Batu Daerah', deskripsi: 'Es batu dianggap barang mewah musiman.', durasi: 7, pengaliHarga: { es: 1.4 } },
  { id: 'sedotan', nama: 'Wajib Sertifikasi Sedotan Ramah Lingkungan', deskripsi: 'Sedotan wajib bersertifikat, sertifikatnya dari plastik.', durasi: null, pengaliHarga: { cup: 1.3 } },
  { id: 'aren', nama: 'Impor Gula Dibatasi, Ekspor Aren Digenjot', deskripsi: 'Gula aren lebih laku di luar negeri.', durasi: 10, pengaliHarga: { gula: 1.5 } },
  { id: 'susu-gratis', nama: 'Program Susu Gratis Nasional', deskripsi: 'Susu diborong program, warung kehabisan.', durasi: 5, pengaliHarga: { susu: 1.35 } },
  { id: 'bbm', nama: 'Subsidi BBM Dicabut', deskripsi: 'Ongkos belanja naik.', durasi: null, biayaHarian: 5000 },
  { id: 'ppn20', nama: 'PPN 20% Bahan Pokok', deskripsi: 'Mendadak, tanpa sosialisasi.', durasi: 14, pengaliSemua: 1.2, hanyaMode: ['hard'] },
];

/** Kebijakan pertama yang otomatis muncul saat tiba di lokasi 2 */
export const KEBIJAKAN_KEJUTAN = 'aren';

/** Upgrade alat. Harga dikali pengaliSyarat mode. */
export const UPGRADE: Record<UpgradeId, Upgrade> = {
  layan: { id: 'layan', nama: 'Alat saji & bayar', ikon: '⚡', level: ['Shaker + bayar QR', 'Dispenser es kopi', 'Mesin espresso mini'], harga: [300_000, 1_200_000, 4_000_000], efek: [1.4, 1.9, 2.6], ket: 'Melayani lebih cepat, antrean lebih pendek' },
  coolbox: { id: 'coolbox', nama: 'Pendingin', ikon: '🧊', level: ['Cool box styrofoam', 'Freezer mini aki'], harga: [150_000, 800_000], efek: [0.6, 0.3], ket: 'Es lebih lambat mencair' },
  grinder: { id: 'grinder', nama: 'Penggiling kopi', ikon: '⚙️', level: ['Grinder manual', 'Grinder listrik'], harga: [400_000, 2_500_000], efek: [0.04, 0.08], ket: 'Kopi digiling segar, kepuasan pembeli naik' },
  gerobak: { id: 'gerobak', nama: 'Gerobak', ikon: '🛺', level: ['Gerobak motor', 'Gerobak listrik neon', 'Booth futuristik'], harga: [1_500_000, 6_000_000, 20_000_000], efek: [1.1, 1.2, 1.35], ket: 'Lebih mencolok, lebih banyak yang mampir' },
};

/** Kecepatan layan dasar (cup per jam) tanpa upgrade */
export const KAPASITAS_DASAR = 30;

/** Ucapan pembeli per keluhan (bahasa Indonesia). Kunci = label keluhan di engine. */
export const KOMENTAR: Record<string, { emoji: string; teks: string[] }> = {
  'Kurang nendang': { emoji: '😐', teks: ['Kopinya nggak kerasa', 'Ini kopi apa susu, Bang?', 'Kurang nendang'] },
  Kepahitan: { emoji: '😖', teks: ['Pahit banget, kayak hidup', 'Waduh, pahit banget', 'Kepahitan, Bang!'] },
  'Kurang creamy': { emoji: '🥛', teks: ['Susunya sedikit banget', 'Kurang creamy nih', 'Encer banget'] },
  'Eneg susunya': { emoji: '🤢', teks: ['Eneg sama susunya', 'Susunya kebanyakan', 'Ini susu rasa kopi'] },
  'Kurang manis': { emoji: '😕', teks: ['Hambar, Bang', 'Kurang manis', 'Gulanya pelit amat'] },
  Kemanisan: { emoji: '🍬', teks: ['Kemanisan, Bang!', 'Manis banget, gigi ngilu', 'Kemanisan'] },
  'Kurang dingin': { emoji: '🥵', teks: ['Kok anget gini?', 'Kurang dingin, Bang!', 'Esnya ke mana?'] },
  'Kebanyakan es': { emoji: '🧊', teks: ['Isinya es doang', 'Ini es rasa kopi', 'Kebanyakan es'] },
  Kemahalan: { emoji: '💸', teks: ['Mahal banget, Bang!', 'Duh, mahal', 'Tanggal tua, Bang...'] },
  'Stok habis': { emoji: '😤', teks: ['Habis? Aduh!', 'Yah, udah habis...', 'Kok habis jam segini?'] },
  'Antrean kelamaan': { emoji: '⏳', teks: ['Lama banget ngantrinya', 'Antreannya panjang amat', 'Keburu telat, ah'] },
};

export const KOMENTAR_SENANG = {
  mantap: { emoji: '😍', teks: ['Mantap!', 'Enak banget, Bang!', 'Juara banget!', 'Enak parah!', 'Bikin nagih'] },
  enak: { emoji: '🙂', teks: ['Lumayan', 'Enak', 'Seger', 'Cocok'] },
};

/** Aplikasi medsos fiktif */
export const MEDSOS_NAMA = 'Viralin';
export const VIRAL_AKUN = ['kopikeliling.bdg', 'ujang_ngopi', 'kulinerbandung.kw', 'mahasiswakere_', 'anakkos.jajan', 'ojol.kuat', 'ngopi.santuy'];
/** {menu}, {lok}, {harga} diisi UI */
export const VIRAL_CAPTION = [
  '{menu} di {lok} enak banget! Cuma {harga} 🔥 wajib cobain',
  'Nemu es kopi keliling paling enak se-Bandung?? {menu}, {harga} doang 😭☕',
  'POV: ngantri es kopi gerobak di {lok} demi {menu} 🤌',
  'Hidden gem {lok}! {menu} mantul, abangnya ramah banget ✨',
];
export const VIRAL_KOMENTAR = [
  'Ini di mana? Otw!', 'Kemarin ke sana udah habis 😭', 'Fix besok jajan', 'Harganya masuk akal',
  'Lebih enak dari kafe', 'Tag temen yang suka kopi', 'Rela ngantri demi ini', 'Spill jam bukanya, Bang',
  'Gerobaknya lucu banget 😍', 'Antreannya ngalahin antrean sembako', 'Rasa bintang lima, harga kaki lima',
];
