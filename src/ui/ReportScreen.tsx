import { BAHAN, CUACA } from '../data/game-data';
import type { IngredientId } from '../sim/types';
import { useGame } from '../store';
import { CUACA_EMOJI, pct, rp } from './format';
import { contohKeluhan } from './komentar';

export function ReportScreen() {
  const { hasil, hariBerikut } = useGame();
  if (!hasil) return null;
  const r = hasil.report;
  const keluhan = Object.entries(r.keluhan).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const terbuang = Object.entries(r.terbuang).filter(([, v]) => (v ?? 0) > 0) as [IngredientId, number][];
  const naik = r.reputasiSesudah >= r.reputasiSebelum;

  return (
    <div className="modal-wrap">
      <div className="modal report">
        <span className="eyebrow">Laporan hari {r.hari}</span>
        <h2 className={r.laba >= 0 ? 'pos' : 'neg'}>
          {r.laba >= 0 ? 'Untung' : 'Rugi'} {rp(Math.abs(r.laba))}
        </h2>
        <p className="muted">
          {CUACA_EMOJI[r.cuaca]} {CUACA[r.cuaca].nama} · {r.orangLewat} orang lewat
        </p>

        <div className="report-grid">
          <div>
            <span>Terjual</span>
            <strong>{r.terjual} cup</strong>
          </div>
          <div>
            <span>Omzet</span>
            <strong>{rp(r.omzet)}</strong>
          </div>
          <div>
            <span>Belanja</span>
            <strong>{rp(r.biayaBelanja)}</strong>
          </div>
          <div>
            <span>Kepuasan</span>
            <strong>{r.terjual ? pct(r.kepuasanRata) : '–'}</strong>
          </div>
          <div>
            <span>Reputasi</span>
            <strong className={naik ? 'pos' : 'neg'}>
              {pct(r.reputasiSebelum)} → {pct(r.reputasiSesudah)}
            </strong>
          </div>
          <div>
            <span>Kecewa (stok habis)</span>
            <strong className={r.gagalStokHabis ? 'neg' : ''}>{r.gagalStokHabis}</strong>
          </div>
          <div>
            <span>Kabur (antre {r.antreMaks} orang)</span>
            <strong className={r.kaburAntre ? 'neg' : ''}>{r.kaburAntre}</strong>
          </div>
          <div>
            <span>Obrolan warga</span>
            <strong className={r.buzzSesudah >= r.buzzSebelum ? 'pos' : 'neg'}>
              {pct(r.buzzSebelum)} → {pct(r.buzzSesudah)}
            </strong>
          </div>
        </div>
        {r.kaburAntre > 0 && <p className="muted">⏳ Pembeli kabur karena antrean terlalu panjang. Upgrade alat saji agar melayani lebih cepat.</p>}
        {r.buzzSesudah >= 0.45 && !r.viral && <p className="muted">🗣️ Gerobakmu mulai jadi omongan. Pertahankan rasa & stok, siapa tahu besok viral!</p>}

        <p className="muted">Belanja dihitung penuh hari ini. Kopi, susu, gula, dan cup yang tersisa tetap bisa dipakai besok; hanya es yang mencair habis.</p>
        {r.biayaTetap > 0 && <p className="muted">Biaya tambahan kebijakan: {rp(r.biayaTetap)}</p>}

        {keluhan.length > 0 && (
          <div className="report-block">
            <span className="eyebrow">Kata pembeli</span>
            <ul>
              {keluhan.map(([k, n], i) => (
                <li key={k}>
                  {contohKeluhan(k, r.hari + i)} <span className="muted">({k.toLowerCase()})</span> <b>×{n}</b>
                </li>
              ))}
            </ul>
          </div>
        )}

        {terbuang.length > 0 && (
          <div className="report-block">
            <span className="eyebrow">Terbuang</span>
            <p className="muted">
              {terbuang.map(([id, v]) => `${Math.floor(v)} ${BAHAN[id].satuan} ${BAHAN[id].nama.toLowerCase()}`).join(', ')}
            </p>
          </div>
        )}

        {r.kebijakanBaru.length > 0 && (
          <div className="report-block alert">
            <span className="eyebrow">📢 Berita malam ini</span>
            {r.kebijakanBaru.map((k) => (
              <p key={k}>
                <b>{k}</b> mulai berlaku besok.
              </p>
            ))}
          </div>
        )}

        {r.viral && <div className="report-block good">🔥 Hari ini gerobakmu viral! Pembeli melonjak 3 hari ke depan.</div>}
        {r.bisaPindah && <div className="report-block good">🎉 Kamu memenuhi syarat pindah ke lokasi berikutnya!</div>}

        <button className="btn primary big" onClick={hariBerikut}>
          Lanjut ke hari {r.hari + 1}
        </button>
      </div>
    </div>
  );
}
