/** Tema visual per lokasi: dari kampung hangat menuju kota neon. */
export interface Theme {
  tanah: string;
  jalan: string;
  garisJalan: boolean;
  bangunan: string[];
  atap: string[];
  tinggi: [number, number];
  langit: string;
  neon: number; // 0..1 intensitas aksen neon
  sungai: boolean;
  pohon: number;
  tenda: boolean;
}

export const THEMES: Theme[] = [
  // 1 Kampung Bantaran Cikapundung
  { tanah: '#7a6a4f', jalan: '#8d8577', garisJalan: false, bangunan: ['#c9b79c', '#d9c7a1', '#a7b5a0', '#c7a9a0', '#b9c4c9', '#e0d2b4'], atap: ['#8a8f96', '#9a7b5a', '#6f7a83', '#a65a3a'], tinggi: [0.9, 1.6], langit: '#f2b880', neon: 0, sungai: true, pohon: 4, tenda: false },
  // 2 Pasar Kosambi
  { tanah: '#6d6a5e', jalan: '#5f5f63', garisJalan: true, bangunan: ['#d8cfc0', '#c6b8a5', '#bfcbd0', '#e3d6b8'], atap: ['#7d858c', '#a3643f', '#5c6870'], tinggi: [1.1, 2.0], langit: '#f5c58f', neon: 0.1, sungai: false, pohon: 3, tenda: true },
  // 3 SMA Jl. Belitung
  { tanah: '#5f7a52', jalan: '#55575c', garisJalan: true, bangunan: ['#e8e2d4', '#d4dbe0', '#efe3c9'], atap: ['#b5543c', '#8b5a3c'], tinggi: [1.4, 2.4], langit: '#bfe0f0', neon: 0.15, sungai: false, pohon: 7, tenda: false },
  // 4 Kampus Dipatiukur
  { tanah: '#5a7350', jalan: '#4d4f55', garisJalan: true, bangunan: ['#dcdfe6', '#c9d3dc', '#e6dccb'], atap: ['#4a5560', '#7a4a3a'], tinggi: [1.6, 3.0], langit: '#a9cfe8', neon: 0.3, sungai: false, pohon: 6, tenda: false },
  // 5 Stasiun Bandung
  { tanah: '#5c5a66', jalan: '#45464d', garisJalan: true, bangunan: ['#e9e4dc', '#c9c2d6', '#b6c2d0'], atap: ['#4b3f87', '#3d4a66'], tinggi: [1.8, 3.4], langit: '#9db8e6', neon: 0.5, sungai: false, pohon: 3, tenda: false },
  // 6 CFD Dago & Alun-alun
  { tanah: '#4f6b4a', jalan: '#3f4048', garisJalan: true, bangunan: ['#cfd6e6', '#b9a9d9', '#a6c6e0'], atap: ['#2e2a5a', '#3a2e6a'], tinggi: [2.2, 4.2], langit: '#8aa3e0', neon: 0.75, sungai: false, pohon: 8, tenda: true },
  // 7 Trotoar Braga
  { tanah: '#3f3d52', jalan: '#2f3040', garisJalan: true, bangunan: ['#e6dccb', '#d9cbb4', '#c9bfa8', '#b8a990'], atap: ['#3a2f58', '#2a2448'], tinggi: [2.0, 3.6], langit: '#6f6fc4', neon: 1, sungai: false, pohon: 2, tenda: false },
];

export const SEG_WARNA: Record<string, string> = {
  warga: '#e98a5c',
  ojol: '#2fae5a',
  pelajar: '#f4f4f4',
  kantoran: '#3a5d9c',
  anakmuda: '#c45ad6',
};
