import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { CanvasTexture, SRGBColorSpace, type Group } from 'three';
import { useLive } from '../live';
import type { UpgradeId } from '../sim/types';

export const CART_X = 0;
export const CART_Z = 0.3;

const NEON = ['#2ef2ff', '#ff5ad1', '#b6ff5a'];

/** Papan nama menu digambar ke tekstur, ditempel di sisi depan gerobak (tidak menutupi tampilan). */
function usePapanMenu(teks: string) {
  const tex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 128;
    const g = c.getContext('2d')!;
    g.fillStyle = '#1b1838';
    g.beginPath();
    g.roundRect(6, 6, 500, 116, 22);
    g.fill();
    g.strokeStyle = '#ffe4a8';
    g.lineWidth = 8;
    g.stroke();
    let size = 64;
    g.font = `800 ${size}px "Bricolage Grotesque", system-ui, sans-serif`;
    while (g.measureText(teks).width > 450 && size > 22) {
      size -= 2;
      g.font = `800 ${size}px "Bricolage Grotesque", system-ui, sans-serif`;
    }
    g.fillStyle = '#ffe4a8';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(teks, 256, 68);
    const t = new CanvasTexture(c);
    t.colorSpace = SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }, [teks]);
  useEffect(() => () => tex.dispose(), [tex]);
  return tex;
}

/** Penjual berdiri di belakang gerobak menghadap pembeli; bajunya sewarna gerobak. */
function Penjual({ warna, live }: { warna: string; live: boolean }) {
  const badan = useRef<Group>(null);
  const tanganKanan = useRef<Group>(null);
  const tanganKiri = useRef<Group>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const sibuk = live && useLive.getState().antre > 0;
    if (badan.current) badan.current.position.y = sibuk ? Math.abs(Math.sin(t * 7)) * 0.03 : Math.sin(t * 1.6) * 0.008;
    // saat melayani: tangan bergantian meracik & menyerahkan cup
    if (tanganKanan.current) tanganKanan.current.rotation.x = sibuk ? -0.9 - Math.sin(t * 7) * 0.5 : -0.15;
    if (tanganKiri.current) tanganKiri.current.rotation.x = sibuk ? -0.9 + Math.sin(t * 7) * 0.5 : -0.15;
  });
  return (
    <group position={[0.02, 0, -0.52]} scale={1.18}>
      <group ref={badan}>
        {/* celana */}
        {[-0.06, 0.06].map((x) => (
          <mesh key={x} position={[x, 0.2, 0]} castShadow>
            <boxGeometry args={[0.1, 0.4, 0.12]} />
            <meshStandardMaterial color="#2d3142" flatShading />
          </mesh>
        ))}
        {/* baju sewarna gerobak + kerah putih */}
        <mesh position={[0, 0.6, 0]} castShadow>
          <boxGeometry args={[0.3, 0.42, 0.18]} />
          <meshStandardMaterial color={warna} flatShading />
        </mesh>
        <mesh position={[0, 0.8, 0.02]}>
          <boxGeometry args={[0.18, 0.04, 0.16]} />
          <meshStandardMaterial color="#f4efe6" />
        </mesh>
        {/* lengan */}
        {[
          { x: -0.19, ref: tanganKiri },
          { x: 0.19, ref: tanganKanan },
        ].map(({ x, ref }) => (
          <group key={x} ref={ref} position={[x, 0.78, 0]}>
            <mesh position={[0, -0.15, 0]} castShadow>
              <boxGeometry args={[0.08, 0.3, 0.1]} />
              <meshStandardMaterial color={warna} flatShading />
            </mesh>
            <mesh position={[0, -0.32, 0]}>
              <boxGeometry args={[0.07, 0.07, 0.07]} />
              <meshStandardMaterial color="#e2b48c" />
            </mesh>
          </group>
        ))}
        {/* kepala, rambut, topi */}
        <mesh position={[0, 0.94, 0]} castShadow>
          <boxGeometry args={[0.22, 0.22, 0.22]} />
          <meshStandardMaterial color="#e2b48c" flatShading />
        </mesh>
        <mesh position={[0, 1.06, -0.01]}>
          <boxGeometry args={[0.24, 0.05, 0.24]} />
          <meshStandardMaterial color="#2a1a10" />
        </mesh>
        <mesh position={[0, 1.08, 0.08]}>
          <boxGeometry args={[0.24, 0.06, 0.2]} />
          <meshStandardMaterial color={warna} flatShading />
        </mesh>
        <mesh position={[0, 1.06, 0.2]}>
          <boxGeometry args={[0.22, 0.02, 0.1]} />
          <meshStandardMaterial color={warna} flatShading />
        </mesh>
        {/* mata & senyum menghadap pembeli */}
        {[-0.05, 0.05].map((x) => (
          <mesh key={x} position={[x, 0.96, 0.111]}>
            <boxGeometry args={[0.03, 0.03, 0.005]} />
            <meshBasicMaterial color="#1b1010" />
          </mesh>
        ))}
        <mesh position={[0, 0.89, 0.111]}>
          <boxGeometry args={[0.08, 0.015, 0.005]} />
          <meshBasicMaterial color="#7a2a1a" />
        </mesh>
      </group>
    </group>
  );
}

/** Gerobak. Warna & nama menu dari kustomisasi; tampilan berubah mengikuti upgrade alat. */
export function Cart({ warna, namaMenu, ramai, upgrade }: { warna: string; namaMenu: string; ramai: boolean; upgrade: Partial<Record<UpgradeId, number>> }) {
  const papan = usePapanMenu(namaMenu);
  const lvGerobak = upgrade.gerobak ?? 0;
  const lvLayan = upgrade.layan ?? 0;
  const lvCool = upgrade.coolbox ?? 0;
  const lvGrinder = upgrade.grinder ?? 0;
  const skala = 1 + lvGerobak * 0.08;

  return (
    <group position={[CART_X, 0, CART_Z]} scale={skala}>
      {/* list neon (gerobak listrik ke atas) */}
      {lvGerobak >= 2 && (
        <mesh position={[0, 0.31, 0.28]}>
          <boxGeometry args={[1.02, 0.04, 0.02]} />
          <meshBasicMaterial color={NEON[(lvGerobak - 2) % NEON.length]} toneMapped={false} />
        </mesh>
      )}
      {lvGerobak >= 3 && (
        <mesh position={[0, 2.05, 0]}>
          <torusGeometry args={[0.55, 0.025, 6, 24]} />
          <meshBasicMaterial color="#ff5ad1" toneMapped={false} />
        </mesh>
      )}
      {/* motor di depan (gerobak motor) */}
      {lvGerobak >= 1 && (
        <mesh position={[0.82, 0.38, 0]} castShadow>
          <boxGeometry args={[0.32, 0.18, 0.2]} />
          <meshStandardMaterial color={lvGerobak >= 2 ? '#2b2b30' : '#666'} flatShading />
        </mesh>
      )}
      {/* cool box / freezer */}
      {lvCool >= 1 && (
        <mesh position={[-0.68, 0.32, 0]} castShadow>
          <boxGeometry args={[0.32, 0.3, 0.36]} />
          <meshStandardMaterial color={lvCool >= 2 ? '#dfe8f2' : '#f4f6f8'} flatShading />
        </mesh>
      )}
      {/* grinder */}
      {lvGrinder >= 1 && (
        <mesh position={[0.36, 1.12, -0.1]} castShadow>
          <cylinderGeometry args={[0.07, 0.09, lvGrinder >= 2 ? 0.26 : 0.18, 10]} />
          <meshStandardMaterial color={lvGrinder >= 2 ? '#c0c4cc' : '#8a5a34'} metalness={lvGrinder >= 2 ? 0.6 : 0} />
        </mesh>
      )}
      {/* dispenser / mesin espresso */}
      {lvLayan >= 2 && (
        <mesh position={[-0.32, 1.14, -0.08]} castShadow>
          <boxGeometry args={[0.22, lvLayan >= 3 ? 0.3 : 0.24, 0.2]} />
          <meshStandardMaterial color={lvLayan >= 3 ? '#b8bcc6' : '#e9eef3'} metalness={lvLayan >= 3 ? 0.6 : 0.1} />
        </mesh>
      )}
      {/* papan QRIS di sisi kanan gerobak */}
      {lvLayan >= 1 && (
        <mesh position={[0.506, 0.62, 0.05]} rotation={[0, Math.PI / 2, 0]}>
          <boxGeometry args={[0.16, 0.2, 0.01]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      )}
      {/* badan gerobak */}
      <mesh position={[0, 0.55, 0]} castShadow>
        <boxGeometry args={[1.0, 0.5, 0.55]} />
        <meshStandardMaterial color={warna} flatShading />
      </mesh>
      {/* etalase kaca + cup */}
      <mesh position={[0, 0.92, 0]} castShadow>
        <boxGeometry args={[0.9, 0.24, 0.45]} />
        <meshPhysicalMaterial color="#cfefff" transmission={0.6} transparent opacity={0.5} roughness={0.1} />
      </mesh>
      {[-0.25, 0, 0.25].map((x) => (
        <mesh key={x} position={[x, 0.9, 0.05]}>
          <cylinderGeometry args={[0.06, 0.045, 0.16, 8]} />
          <meshStandardMaterial color="#a8703e" />
        </mesh>
      ))}
      {/* roda */}
      {[-0.35, 0.35].map((x) => (
        <mesh key={x} position={[x, 0.18, 0.3]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <torusGeometry args={[0.16, 0.035, 6, 14]} />
          <meshStandardMaterial color="#222" />
        </mesh>
      ))}
      {/* sepeda depan */}
      <mesh position={[0.8, 0.22, 0]} rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[0.2, 0.03, 6, 14]} />
        <meshStandardMaterial color="#222" />
      </mesh>
      <mesh position={[0.65, 0.42, 0]} rotation={[0, 0, -0.6]}>
        <cylinderGeometry args={[0.025, 0.025, 0.6, 5]} />
        <meshStandardMaterial color="#555" />
      </mesh>
      {/* payung */}
      <mesh position={[-0.2, 1.3, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 1.0, 5]} />
        <meshStandardMaterial color="#666" />
      </mesh>
      <mesh position={[-0.2, 1.82, 0]} castShadow>
        <coneGeometry args={[0.8, 0.3, 8]} />
        <meshStandardMaterial color={warna} flatShading />
      </mesh>
      <mesh position={[-0.2, 1.7, 0]}>
        <cylinderGeometry args={[0.8, 0.8, 0.05, 8]} />
        <meshStandardMaterial color="#ffffff" flatShading />
      </mesh>
      {/* papan nama menu menempel di depan gerobak */}
      <mesh position={[0, 0.56, 0.278]}>
        <planeGeometry args={[0.92, 0.23]} />
        <meshBasicMaterial map={papan} toneMapped={false} />
      </mesh>
      <Penjual warna={warna} live={ramai} />
    </group>
  );
}
