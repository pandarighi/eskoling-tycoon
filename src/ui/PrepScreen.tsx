import { BAHAN, CUACA, KEBIJAKAN, LOKASI, MODE } from '../data/game-data';
import { UPGRADE } from '../data/game-data';
import { bisaPindah, cuacaHari, hargaPakHariIni, hargaUpgrade, hppPerCup, kapasitasLayan, levelUpgrade, syaratLokasi } from '../sim/engine';
import type { IngredientId, Recipe, UpgradeId } from '../sim/types';
import { bahanIds, useGame } from '../store';
import { CUACA_EMOJI, pct, rp, rpSingkat } from './format';

const RESEP_UI: { k: keyof Recipe; label: string; max: number; step: number; unit: string }[] = [
  { k: 'kopi', label: 'Kopi', max: 3, step: 0.5, unit: 'shot' },
  { k: 'susu', label: 'Susu', max: 150, step: 10, unit: 'ml' },
  { k: 'gula', label: 'Gula aren', max: 4, step: 0.5, unit: 'sdm' },
  { k: 'es', label: 'Es batu', max: 8, step: 1, unit: 'butir' },
];

const TIPS = [
  'Hari pertama! Belanja secukupnya dulu. Es batu selalu mencair di akhir hari, jadi beli es setiap pagi.',
  'Perhatikan gelembung reaksi pembeli: "Kemanisan" atau "Kurang nendang" adalah petunjuk untuk meracik ulang.',
  'Warga kampung sangat sensitif harga. Naikkan harga sedikit demi sedikit dan lihat apakah pembeli masih datang.',
  'Pembeli yang puas akan cerita ke tetangga (obrolan warga). Kalau obrolan tinggi, gerobakmu bisa viral di medsos!',
  'Antrean terlalu panjang bikin pembeli kabur. Upgrade alat saji supaya pelayanan lebih cepat.',
];

export function PrepScreen() {
  const { game, plan, save, setResep, setHarga, setBelanja, mulaiJualan, skipHari, info, pindah, digusur, go, bukaKustom, beli } = useGame();
  if (!game) return null;
  const lok = LOKASI[game.lokasi];
  const { prakiraan } = cuacaHari(game);
  const c = CUACA[prakiraan];
  const hpp = hppPerCup(game, plan.resep);
  const butuh: Record<IngredientId, number> = { ...plan.resep, cup: 1 };
  const totalBelanja = bahanIds.reduce((t, id) => t + (plan.belanja[id] ?? 0) * hargaPakHariIni(game, id), 0);
  const kapasitas = Math.floor(
    Math.min(...bahanIds.filter((id) => butuh[id] > 0).map((id) => (game.stok[id] + (plan.belanja[id] ?? 0) * BAHAN[id].isiPerPak) / butuh[id])),
  );
  const syarat = syaratLokasi(game, game.lokasi + 1);
  const bisa = bisaPindah(game);
  const margin = plan.harga - hpp;
  const kurangUang = totalBelanja > game.uang;

  return (
    <div className="panel-inner">
      <div className="topbar">
        <button className="btn icon" onClick={() => go('menu')} aria-label="Menu">
          ☰
        </button>
        <div className="topbar-title">
          <strong>Hari {game.hari}</strong>
          <span>
            {lok.nama} · {MODE[game.mode].nama}
          </span>
        </div>
        <button className="btn icon" onClick={bukaKustom} aria-label="Kustom gerobak">
          🎨
        </button>
      </div>

      <div className="stats">
        <div className="stat">
          <span>Uang</span>
          <strong>{rp(game.uang)}</strong>
        </div>
        <div className="stat">
          <span>Obrolan warga {game.viralSisaHari > 0 ? '🔥' : '🗣️'}</span>
          <div className="bar buzz">
            <i style={{ width: pct(game.buzz) }} />
          </div>
          <small>{game.viralSisaHari > 0 ? `Viral! ${game.viralSisaHari} hari lagi` : pct(game.buzz)}</small>
        </div>
        <div className="stat">
          <span>Reputasi</span>
          <div className="bar">
            <i style={{ width: pct(game.reputasi) }} />
          </div>
          <small>{pct(game.reputasi)}</small>
        </div>
      </div>

      <section className="card cuaca">
        <div className="cuaca-emoji">{CUACA_EMOJI[prakiraan]}</div>
        <div>
          <span className="eyebrow">Prakiraan hari ini</span>
          <strong>
            {c.nama} · {c.suhu[0]}–{c.suhu[1]}°C
          </strong>
          <small>Permintaan ×{c.permintaan.toString().replace('.', ',')} · prakiraan akurat ±{pct(MODE[game.mode].akurasiCuaca)}</small>
        </div>
      </section>

      {(game.kebijakan.length > 0 || game.asapSisaHari > 0) && (
        <section className="card kebijakan">
          <span className="eyebrow">📜 Kebijakan berlaku</span>
          {game.kebijakan.map((k) => {
            const p = KEBIJAKAN.find((x) => x.id === k.id);
            return p ? (
              <div key={k.id} className="kebijakan-item">
                <strong>{p.nama}</strong>
                <small>
                  {p.deskripsi} {k.sisaHari ? `· ${k.sisaHari} hari lagi` : '· permanen'}
                </small>
              </div>
            ) : null;
          })}
          {game.asapSisaHari > 0 && (
            <div className="kebijakan-item">
              <strong>🌫️ Asap pekat</strong>
              <small>Pembakaran hutan oleh oknum untuk kebun beringin pesugihan. Pembeli berkurang · {game.asapSisaHari} hari lagi</small>
            </div>
          )}
        </section>
      )}

      {game.hari <= TIPS.length && <div className="tip">💡 {TIPS[game.hari - 1]}</div>}

      <section className="card">
        <h3>
          Racikan <em>{save.kustom.namaMenu}</em>
        </h3>
        {RESEP_UI.map((r) => (
          <label key={r.k} className="slider">
            <span>
              {r.label}
              <b>
                {String(plan.resep[r.k]).replace('.', ',')} {r.unit}
              </b>
            </span>
            <input type="range" min={0} max={r.max} step={r.step} value={plan.resep[r.k]} onChange={(e) => setResep(r.k, Number(e.target.value))} />
          </label>
        ))}
        <div className="row-between muted">
          <span>Modal per cup (HPP)</span>
          <b>{rp(hpp)}</b>
        </div>
      </section>

      <section className="card">
        <h3>Harga jual</h3>
        <div className="stepper big">
          <button className="btn" onClick={() => setHarga(plan.harga - 500)}>
            −
          </button>
          <strong>{rp(plan.harga)}</strong>
          <button className="btn" onClick={() => setHarga(plan.harga + 500)}>
            +
          </button>
        </div>
        <div className="row-between muted">
          <span>Untung per cup</span>
          <b className={margin < 0 ? 'neg' : 'pos'}>{rp(margin)}</b>
        </div>
      </section>

      <section className="card">
        <h3>Belanja hari ini</h3>
        <div className="belanja">
          {bahanIds.map((id) => {
            const b = BAHAN[id];
            const h = hargaPakHariIni(game, id);
            const naik = h > b.hargaPak * 1.2;
            return (
              <div key={id} className="belanja-row">
                <div>
                  <strong>{b.nama}</strong>
                  <small>
                    {rp(h)}/pak{naik ? ' 📈' : ''} · isi {b.isiPerPak} {b.satuan} · stok {Math.floor(game.stok[id])}
                  </small>
                </div>
                <div className="stepper">
                  <button className="btn sm" onClick={() => setBelanja(id, (plan.belanja[id] ?? 0) - 1)}>
                    −
                  </button>
                  <b>{plan.belanja[id] ?? 0}</b>
                  <button className="btn sm" onClick={() => setBelanja(id, (plan.belanja[id] ?? 0) + 1)}>
                    +
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        <div className="row-between">
          <span>Total belanja</span>
          <b className={kurangUang ? 'neg' : ''}>{rp(totalBelanja)}</b>
        </div>
        <div className="row-between muted">
          <span>Cukup untuk</span>
          <b>{isFinite(kapasitas) ? kapasitas : 0} cup</b>
        </div>
        {kurangUang && <p className="warn">Uang tidak cukup. Sebagian belanja akan dibatalkan.</p>}
      </section>

      <section className="card">
        <h3>Upgrade alat</h3>
        <small className="muted">Kecepatan layan: {kapasitasLayan(game)} cup/jam</small>
        <div className="upgrade-list">
          {(Object.keys(UPGRADE) as UpgradeId[]).map((id) => {
            const u = UPGRADE[id];
            const lv = levelUpgrade(game, id);
            const h = hargaUpgrade(game, id);
            return (
              <div key={id} className="upgrade-row">
                <span className="upgrade-ikon">{u.ikon}</span>
                <div>
                  <strong>
                    {lv ? u.level[lv - 1] : u.nama}
                    <span className="lv">
                      {u.level.map((_, i) => (
                        <i key={i} className={i < lv ? 'on' : ''} />
                      ))}
                    </span>
                  </strong>
                  <small>{h !== null ? `Berikutnya: ${u.level[lv]} · ${u.ket}` : 'Level maksimal'}</small>
                </div>
                {h !== null && (
                  <button className="btn sm" disabled={game.uang < h} onClick={() => beli(id)}>
                    {rpSingkat(h)}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {syarat ? (
        <section className="card next-loc">
          <span className="eyebrow">Lokasi berikutnya</span>
          <strong>{LOKASI[game.lokasi + 1].nama}</strong>
          <div className="syarat">
            <span>Modal {rpSingkat(syarat.modal)}</span>
            <div className="bar">
              <i style={{ width: pct(Math.min(1, game.uang / syarat.modal)) }} />
            </div>
            <span>Reputasi {pct(syarat.reputasi)}</span>
            <div className="bar">
              <i style={{ width: pct(Math.min(1, game.reputasi / syarat.reputasi)) }} />
            </div>
          </div>
          <button className="btn primary" disabled={!bisa} onClick={pindah}>
            {bisa ? `Pindah ke ${LOKASI[game.lokasi + 1].nama}` : 'Belum memenuhi syarat'}
          </button>
          {bisa && <small className="muted">Biaya pindah {rpSingkat(syarat.modal * 0.2)}; reputasi di tempat baru mulai dari 70%.</small>}
        </section>
      ) : (
        <section className="card next-loc">
          <span className="eyebrow">Puncak karier</span>
          <strong>Trotoar Braga</strong>
          <p className="muted">Gerobakmu makin laris, tapi trotoar makin sesak oleh antrean. Kapan pun siap, akhiri putaran ini.</p>
          <button className="btn danger" onClick={digusur}>
            Akhiri: digusur Gubernur
          </button>
        </section>
      )}

      <div className="sticky-cta">
        {info && <div className="toast">{info}</div>}
        <div className="cta-row">
          {MODE[game.mode].bisaSkip && (
            <button className="btn ghost big skip" onClick={skipHari} title="Libur hari ini (mis. saat hujan)">
              Skip hari ⏭
            </button>
          )}
          <button className="btn primary big" onClick={mulaiJualan}>
            Mulai jualan {CUACA_EMOJI[prakiraan]}
          </button>
        </div>
      </div>
    </div>
  );
}
