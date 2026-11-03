# Eskoling Tycoon

Game tycoon es kopi keliling 3D berbasis web. Lokasi: Kampung Bantaran Cikapundung → Trotoar Braga, Bandung.

## Status: Fase 1 — MVP 3D bisa dimainkan

```bash
npm install
npm run dev              # buka http://localhost:5173 (juga bisa dari HP di Wi-Fi yang sama, lihat alamat "Network")
npm run build            # build produksi ke folder dist/
npm run sim              # bot memainkan Easy/Normal/Hard 150 hari
npm run sim -- 200 42    # 200 hari, seed 42
npm test                 # unit test mesin simulasi
npm run typecheck
```

## Struktur

| Path | Isi |
| --- | --- |
| `src/sim/types.ts` | Tipe data game |
| `src/sim/rng.ts` | RNG ber-seed (hari bisa diputar ulang) |
| `src/sim/engine.ts` | Mesin simulasi murni: cuaca, harga, belanja, permintaan, kepuasan, reputasi, kebijakan, asap (Hard), pindah lokasi |
| `src/data/game-data.ts` | Semua angka balancing: bahan, segmen, 7 lokasi, cuaca, mode, kebijakan absurd |
| `scripts/simulate.ts` | Bot "pemain wajar" untuk uji balancing |
| `src/store.ts` | State game (Zustand), save localStorage, badge Selesai, kustomisasi |
| `src/scene/` | Diorama 3D prosedural (7 tema lokasi), gerobak, kerumunan NPC, hujan, kamera isometrik responsif |
| `src/ui/` | Menu mode, persiapan, HUD jualan, laporan harian, kustom gerobak, cutscene penggusuran |

## Deploy ke Vercel

1. Push folder ini ke GitHub.
2. Di Vercel: Add New → Project → pilih repo. Framework terdeteksi otomatis sebagai **Vite** (build `npm run build`, output `dist`).
3. Deploy. Setiap push ke `main` otomatis ter-deploy ulang.

## Hasil balancing awal (bot, 3 seed, 200 hari)

| Mode | Buka lokasi 2 | Lokasi 3 | Lokasi 4 | Lokasi 5 |
| --- | --- | --- | --- | --- |
| Easy | hari ~18 | ~40 | ~57 | ~87 |
| Normal | ~27 | ~63 | ~89 | ~124 |
| Hard | ~46 | ~109 | ~160 | – |

Bot belum memakai upgrade, harga dinamis, atau strategi cuaca, jadi pemain sungguhan seharusnya lebih cepat.

## Keputusan teknis

- Orientasi dinamis (HP portrait/landscape, tablet, PC): layout HUD responsif, kamera isometrik menyesuaikan aspect ratio.
- Bahasa: Indonesia saja dulu.
- Aset 3D: generator AI (Meshy/Tripo) diutamakan, cadangan Kenney/Quaternius; format glTF + Draco.
- Hosting: Vercel (free tier).

## Berikutnya

- Ganti model prosedural dengan aset AI 3D (Meshy/Tripo) dalam format glTF.
- Upgrade gerobak, karyawan, event lokasi, audio.
- Brainstorm mode WNI setelah playtest.
