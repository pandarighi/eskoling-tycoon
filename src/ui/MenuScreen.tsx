import { MODE } from '../data/game-data';
import type { DifficultyId } from '../sim/types';
import { useGame } from '../store';
import { LOKASI } from '../data/game-data';

const DESKRIPSI: Record<DifficultyId, string> = {
  easy: 'Modal Rp250 rb, harga bahan stabil, prakiraan cuaca jarang meleset.',
  normal: 'Pengalaman yang dirancang. Modal Rp150 rb, kebijakan absurd sesekali.',
  hard: 'Modal Rp100 rb, PPN 20% mendadak, asap pekat, cuaca sulit ditebak.',
};

export function MenuScreen() {
  const { save, mulaiMode, bukaKustom } = useGame();
  const semuaSelesai = save.completed.easy && save.completed.normal && save.completed.hard;

  return (
    <div className="menu">
      <header className="menu-head">
        <p className="eyebrow">Bandung · Es Kopi Keliling</p>
        <h1 className="logo">
          Eskoling<span>Tycoon</span>
        </h1>
        <p className="tagline">Dari gerobak di bantaran Cikapundung sampai trotoar Braga.</p>
      </header>

      <div className="mode-grid">
        {(Object.keys(MODE) as DifficultyId[]).map((m) => {
          const slot = save.saves[m];
          return (
            <article key={m} className={`mode-card mode-${m}`}>
              <div className="mode-top">
                <h2>{MODE[m].nama}</h2>
                {save.completed[m] && <span className="badge-done">✓ Selesai</span>}
              </div>
              <p>{DESKRIPSI[m]}</p>
              {slot && (
                <p className="slot-info">
                  Hari {slot.game.hari} · {LOKASI[slot.game.lokasi].nama}
                </p>
              )}
              <div className="mode-actions">
                {slot && (
                  <button className="btn primary" onClick={() => mulaiMode(m, false)}>
                    Lanjutkan
                  </button>
                )}
                <button
                  className={`btn ${slot ? 'ghost' : 'primary'}`}
                  onClick={() => {
                    if (!slot || confirmBaru()) mulaiMode(m, true);
                  }}
                >
                  {slot ? 'Main baru' : 'Main'}
                </button>
              </div>
            </article>
          );
        })}

        <article className={`mode-card mode-wni ${semuaSelesai ? '' : 'locked'}`}>
          <div className="mode-top">
            <h2>WNI</h2>
            <span className="badge-lock">{semuaSelesai ? 'Segera hadir' : '🔒 Terkunci'}</span>
          </div>
          <p>Tamatkan Easy, Normal, dan Hard untuk membuka mode WNI: rintangan terberat dari kebijakan-kebijakan absurd.</p>
          <div className="wni-progress">
            {(['easy', 'normal', 'hard'] as DifficultyId[]).map((m) => (
              <span key={m} className={save.completed[m] ? 'on' : ''}>
                {MODE[m].nama}
              </span>
            ))}
          </div>
        </article>
      </div>

      <div className="menu-foot">
        <button className="btn ghost" onClick={bukaKustom}>
          🎨 Kustom gerobak
        </button>
        <p className="disclaimer">Semua tokoh, jabatan, dan kebijakan dalam game ini fiktif dan bersifat satire.</p>
      </div>
    </div>
  );
}

function confirmBaru() {
  // pakai window.confirm sederhana di MVP
  return window.confirm('Mulai baru? Progres mode ini akan ditimpa.');
}
