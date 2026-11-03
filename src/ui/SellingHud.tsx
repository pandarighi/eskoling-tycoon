import { BAHAN, CUACA, LOKASI } from '../data/game-data';
import type { IngredientId } from '../sim/types';
import { useLive } from '../live';
import { bahanIds, useGame } from '../store';
import { CUACA_EMOJI, jam, rp } from './format';

export function SellingHud() {
  const { hasil, game, plan, speed, setSpeed, selesaiJualan } = useGame();
  const progress = useLive((s) => s.progress);
  const antreVisual = useLive((s) => s.antre);
  // angka mengikuti pembeli yang benar-benar sudah dilayani di layar
  const live = { jual: useLive((s) => s.terjual), habis: useLive((s) => s.habis), kabur: useLive((s) => s.kabur) };
  if (!hasil || !game) return null;
  const { report } = hasil;
  // porsi yang bisa dibuat di awal hari = bahan paling sedikit dibanding resep
  const butuh: Record<IngredientId, number> = { ...plan.resep, cup: 1 };
  const porsiAwal = Math.floor(
    Math.min(...bahanIds.filter((id) => butuh[id] > 0).map((id) => (game.stok[id] + (plan.belanja[id] ?? 0) * BAHAN[id].isiPerPak) / butuh[id])),
  );
  const sisaCup = Math.max(0, porsiAwal - live.jual);

  return (
    <>
      <div className="hud-top">
        <div className="hud-chip">
          <strong>Hari {report.hari}</strong>
          <span>{LOKASI[game.lokasi].nama}</span>
        </div>
        <div className="hud-chip clock">
          <span>
            {CUACA_EMOJI[report.cuaca]} {CUACA[report.cuaca].nama}
            {report.cuaca !== report.prakiraan && <em> · prakiraan meleset!</em>}
            {report.sedangViral && <em> · 🔥 lagi viral</em>}
          </span>
          <strong>{jam(progress)}</strong>
          <div className="bar thin">
            <i style={{ width: `${progress * 100}%` }} />
          </div>
        </div>
      </div>

      <div className="hud-bottom">
        <div className="hud-counters">
          <div>
            <span>Terjual</span>
            <strong>{live.jual}</strong>
          </div>
          <div>
            <span>Omzet</span>
            <strong>{rp(live.jual * plan.harga)}</strong>
          </div>
          <div>
            <span>Sisa porsi</span>
            <strong className={sisaCup <= 5 ? 'neg' : ''}>{sisaCup}</strong>
          </div>
          <div>
            <span>Antre</span>
            <strong className={antreVisual >= 6 ? 'neg' : ''}>{antreVisual}</strong>
          </div>
          {live.kabur > 0 && (
            <div>
              <span>Kabur</span>
              <strong className="neg">{live.kabur}</strong>
            </div>
          )}
          {live.habis > 0 && (
            <div>
              <span>Kecewa</span>
              <strong className="neg">{live.habis}</strong>
            </div>
          )}
        </div>
        <div className="hud-controls">
          {([1, 2, 4] as const).map((s) => (
            <button key={s} className={`btn sm ${speed === s ? 'primary' : 'ghost'}`} onClick={() => setSpeed(s)}>
              {s}×
            </button>
          ))}
          <button className="btn sm ghost" onClick={selesaiJualan}>
            Lewati ⏭
          </button>
        </div>
      </div>
    </>
  );
}
