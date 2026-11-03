import { useGame, WARNA } from '../store';

export function CustomizeScreen() {
  const { save, setKustom, go, kustomDari } = useGame();
  const k = save.kustom;
  return (
    <div className="panel-inner">
      <div className="topbar">
        <button className="btn icon" onClick={() => go(kustomDari === 'kustom' ? 'menu' : kustomDari)} aria-label="Kembali">
          ←
        </button>
        <div className="topbar-title">
          <strong>Kustom gerobak</strong>
          <span>Kosmetik saja, gratis</span>
        </div>
        <span />
      </div>

      <section className="card">
        <h3>Nama menu</h3>
        <input className="input" maxLength={24} value={k.namaMenu} onChange={(e) => setKustom({ namaMenu: e.target.value })} placeholder="mis. Kopi Susu Mantap" />
        <small className="muted">{k.namaMenu.length}/24 karakter · tampil di papan gerobak</small>
      </section>


      {(['normal', 'pastel'] as const).map((p) => (
        <section className="card" key={p}>
          <h3>Warna {p === 'normal' ? 'normal' : 'pastel'}</h3>
          <div className="warna-grid">
            {WARNA[p].map((w) => (
              <button key={w.hex} className={`swatch ${k.warna === w.hex ? 'on' : ''}`} style={{ background: w.hex }} onClick={() => setKustom({ warna: w.hex })} title={w.nama} aria-label={w.nama} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
