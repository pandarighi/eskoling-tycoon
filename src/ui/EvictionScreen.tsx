import { MODE } from '../data/game-data';
import { useGame } from '../store';
import { rp } from './format';

/** Cutscene akhir putaran: penggusuran di trotoar Braga oleh tokoh fiktif. */
export function EvictionScreen() {
  const { game, save, selesaiGusur } = useGame();
  if (!game) return null;
  const ke = save.gusurCount[game.mode] + 1;
  return (
    <div className="modal-wrap">
      <div className="modal gusur">
        <div className="gubernur" aria-hidden>
          <div className="g-head">
            <div className="g-iket" />
            <div className="g-face">
              <i className="g-eye l" />
              <i className="g-eye r" />
              <i className="g-smile" />
            </div>
          </div>
          <div className="g-shirt" />
        </div>
        <span className="eyebrow">Gubernur Suriname</span>
        <h2>Kang Maman Darmaji</h2>
        <blockquote>“Mohon maaf, trotoar ini untuk pejalan kaki. Antrean es kopinya sudah sampai menutup jalan. Gerobaknya kami tertibkan dulu, ya.”</blockquote>
        <p className="muted">
          Mode {MODE[game.mode].nama} selesai pada hari {game.hari - 1}. Total omzet {rp(game.totalOmzet)}.
        </p>
        <div className="report-block good">
          <b>Bonus penggusuran ke-{ke}:</b> reputasi awal +{5 * ke}% di putaran berikutnya. Badge <b>Selesai</b> untuk mode {MODE[game.mode].nama}.
        </div>
        <button className="btn primary big" onClick={selesaiGusur}>
          Mulai lagi dari Cikapundung
        </button>
      </div>
    </div>
  );
}
