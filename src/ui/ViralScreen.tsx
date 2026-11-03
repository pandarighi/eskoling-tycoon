import { LOKASI, MEDSOS_NAMA, VIRAL_CAPTION } from '../data/game-data';
import { useGame } from '../store';
import { rp } from './format';

const angka = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1).replace('.', ',')} jt` : n >= 1e3 ? `${(n / 1e3).toFixed(1).replace('.', ',')} rb` : String(n));

/** Tampilan medsos fiktif saat es kopi pemain viral. */
export function ViralScreen() {
  const { hasil, game, plan, save, go } = useGame();
  const v = hasil?.report.viral;
  if (!v || !game) return null;
  const menu = save.kustom.namaMenu || 'Es Kopi';
  const lok = LOKASI[hasil.state.lokasi].nama;
  const caption = VIRAL_CAPTION[v.caption].replace('{menu}', menu).replace('{lok}', lok).replace('{harga}', rp(plan.harga));

  return (
    <div className="modal-wrap viral-wrap">
      <div className="viral-head">
        <span className="eyebrow">🔥 Kamu viral!</span>
        <h2>Gerobakmu masuk FYP</h2>
      </div>
      <div className="hp">
        <div className="hp-bar">
          <b>{MEDSOS_NAMA}</b>
          <span>Untukmu</span>
        </div>
        <div className="post">
          <div className="post-user">
            <i>{v.akun[0].toUpperCase()}</i>
            <div>
              <strong>@{v.akun}</strong>
              <small>{lok}</small>
            </div>
          </div>
          <div className="post-media" style={{ ['--gerobak' as string]: save.kustom.warna }}>
            <div className="post-cart">
              <span className="post-maskot">☕</span>
              <div className="post-papan">{menu}</div>
            </div>
            <span className="post-views">▶ {angka(v.views)}</span>
          </div>
          <div className="post-aksi">
            <span>❤️ {angka(v.likes)}</span>
            <span>💬 {angka(Math.round(v.likes / 18))}</span>
            <span>↗ {angka(Math.round(v.likes / 9))}</span>
          </div>
          <p className="post-cap">
            <b>@{v.akun}</b> {caption}
          </p>
          <ul className="post-komen">
            {v.komentar.map((k, i) => (
              <li key={i}>
                <b>@{k.akun}</b> {k.teks}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="viral-efek">
        <p>Pembeli <b>+60%</b> selama 3 hari ke depan dan reputasi naik. Siapkan stok lebih banyak dan antisipasi antrean!</p>
        <button className="btn primary big" onClick={() => go('laporan')}>
          Lihat laporan hari ini
        </button>
      </div>
    </div>
  );
}
