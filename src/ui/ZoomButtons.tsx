const zoom = (detail: 'in' | 'out' | 'reset') => window.dispatchEvent(new CustomEvent('eskoling-zoom', { detail }));

/** Tombol zoom untuk laptop/PC (di HP juga bisa pinch dua jari, di laptop juga bisa scroll). */
export function ZoomButtons() {
  return (
    <div className="zoom-ctl" aria-label="Kontrol zoom">
      <button className="btn icon" onClick={() => zoom('in')} aria-label="Perbesar" title="Perbesar (scroll ke atas)">
        +
      </button>
      <button className="btn icon" onClick={() => zoom('out')} aria-label="Perkecil" title="Perkecil (scroll ke bawah)">
        −
      </button>
      <button className="btn icon" onClick={() => zoom('reset')} aria-label="Reset tampilan" title="Kembalikan tampilan">
        ⟲
      </button>
    </div>
  );
}
