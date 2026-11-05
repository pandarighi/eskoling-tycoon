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


      <section className="card">
        <h3>Penjual</h3>
        <div className="row-btn" role="group" aria-label="Pilih penjual">
          {([['L', 'Laki-laki'], ['P', 'Perempuan']] as const).map(([v, label]) => (
            <button key={v} className={`btn ${(k.penjual ?? 'L') === v ? 'primary' : ''}`} aria-pressed={(k.penjual ?? 'L') === v} onClick={() => setKustom({ penjual: v })}>
              {label}
            </button>
          ))}
        </div>
        <small className="muted">Kaos & topi/hijab penjual ikut warna gerobak</small>
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
