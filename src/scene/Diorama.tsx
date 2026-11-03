import { useMemo } from 'react';
import { createRng } from '../sim/rng';
import type { Theme } from './themes';

export const W = 13; // lebar diorama (x)
export const D = 9; // kedalaman (z)
export const JALAN_Z = 1.5;

interface House {
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  warna: string;
  atap: string;
  neon: string | null;
}

function Rumah({ r, kampung }: { r: House; kampung: boolean }) {
  return (
    <group position={[r.x, 0, r.z]}>
      <mesh position={[0, r.h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[r.w, r.h, r.d]} />
        <meshStandardMaterial color={r.warna} flatShading />
      </mesh>
      {/* atap seng miring (kampung) atau datar (kota) */}
      {kampung ? (
        <mesh position={[0, r.h + 0.12, 0.05]} rotation={[0.28, 0, 0]} castShadow>
          <boxGeometry args={[r.w + 0.18, 0.06, r.d + 0.25]} />
          <meshStandardMaterial color={r.atap} metalness={0.4} roughness={0.6} flatShading />
        </mesh>
      ) : (
        <mesh position={[0, r.h + 0.05, 0]} castShadow>
          <boxGeometry args={[r.w + 0.06, 0.1, r.d + 0.06]} />
          <meshStandardMaterial color={r.atap} flatShading />
        </mesh>
      )}
      {/* jendela */}
      {Array.from({ length: Math.max(1, Math.floor(r.h / 0.8)) }).map((_, i) => (
        <mesh key={i} position={[0, 0.45 + i * 0.75, r.d / 2 + 0.01]}>
          <planeGeometry args={[r.w * 0.5, 0.28]} />
          <meshStandardMaterial color={r.neon ? '#ffe9a8' : '#3b4a5a'} emissive={r.neon ? '#ffcf70' : '#000'} emissiveIntensity={r.neon ? 0.5 : 0} />
        </mesh>
      ))}
      {r.neon && (
        <mesh position={[0, r.h - 0.15, r.d / 2 + 0.03]}>
          <boxGeometry args={[r.w * 0.8, 0.08, 0.04]} />
          <meshStandardMaterial color={r.neon} emissive={r.neon} emissiveIntensity={2.2} toneMapped={false} />
        </mesh>
      )}
    </group>
  );
}

function Pohon({ x, z, s }: { x: number; z: number; s: number }) {
  return (
    <group position={[x, 0, z]} scale={s}>
      <mesh position={[0, 0.3, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.08, 0.6, 6]} />
        <meshStandardMaterial color="#6b4a2f" flatShading />
      </mesh>
      <mesh position={[0, 0.8, 0]} castShadow>
        <icosahedronGeometry args={[0.38, 0]} />
        <meshStandardMaterial color="#4f8f45" flatShading />
      </mesh>
    </group>
  );
}

function Jemuran({ x, z }: { x: number; z: number }) {
  const baju = ['#e86a6a', '#6ab0e8', '#f2d16b', '#ffffff', '#9be08a'];
  return (
    <group position={[x, 0, z]}>
      {[-0.6, 0.6].map((dx) => (
        <mesh key={dx} position={[dx, 0.45, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 0.9, 4]} />
          <meshStandardMaterial color="#7a6a55" />
        </mesh>
      ))}
      <mesh position={[0, 0.88, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.008, 0.008, 1.2, 3]} />
        <meshStandardMaterial color="#333" />
      </mesh>
      {baju.map((c, i) => (
        <mesh key={i} position={[-0.45 + i * 0.22, 0.74, 0]} castShadow>
          <boxGeometry args={[0.15, 0.24, 0.02]} />
          <meshStandardMaterial color={c} />
        </mesh>
      ))}
    </group>
  );
}

function Tenda({ x, z, warna }: { x: number; z: number; warna: string }) {
  return (
    <group position={[x, 0, z]}>
      {[[-0.45, -0.3], [0.45, -0.3], [-0.45, 0.3], [0.45, 0.3]].map(([dx, dz], i) => (
        <mesh key={i} position={[dx, 0.4, dz]}>
          <cylinderGeometry args={[0.02, 0.02, 0.8, 4]} />
          <meshStandardMaterial color="#888" />
        </mesh>
      ))}
      <mesh position={[0, 0.85, 0]} castShadow>
        <boxGeometry args={[1.05, 0.06, 0.75]} />
        <meshStandardMaterial color={warna} flatShading />
      </mesh>
      <mesh position={[0, 0.3, 0]} castShadow>
        <boxGeometry args={[0.9, 0.08, 0.55]} />
        <meshStandardMaterial color="#9a7550" />
      </mesh>
      {[-0.25, 0, 0.25].map((dx, i) => (
        <mesh key={i} position={[dx, 0.4, 0]}>
          <boxGeometry args={[0.18, 0.1, 0.18]} />
          <meshStandardMaterial color={['#6abf4b', '#e8743b', '#e8d24b'][i]} flatShading />
        </mesh>
      ))}
    </group>
  );
}

export function Diorama({ theme, lokasi }: { theme: Theme; lokasi: number }) {
  const kampung = lokasi === 0;
  const layout = useMemo(() => {
    const rng = createRng(1000 + lokasi);
    const rumah: House[] = [];
    // baris belakang (z negatif)
    let x = -W / 2 + 0.4;
    while (x < W / 2 - 0.6) {
      const w = rng.range(kampung ? 0.8 : 1.1, kampung ? 1.3 : 1.9);
      if (x + w > W / 2 - 0.3) break;
      const neonOn = rng.next() < theme.neon;
      rumah.push({
        x: x + w / 2,
        z: kampung ? rng.range(-2.3, -1.9) : -2.4,
        w,
        d: rng.range(1.0, 1.5),
        h: rng.range(theme.tinggi[0], theme.tinggi[1]),
        warna: theme.bangunan[rng.int(0, theme.bangunan.length - 1)],
        atap: theme.atap[rng.int(0, theme.atap.length - 1)],
        neon: neonOn ? ['#ff3df2', '#2ef2ff', '#ffb02e', '#7cff5a'][rng.int(0, 3)] : null,
      });
      x += w + (kampung ? rng.range(0.02, 0.12) : rng.range(0.15, 0.4));
    }
    const pohon = Array.from({ length: theme.pohon }, () => ({ x: rng.range(-W / 2 + 0.6, W / 2 - 0.6), z: rng.range(3.0, 3.9), s: rng.range(0.8, 1.3) }));
    return { rumah, pohon };
  }, [lokasi, theme, kampung]);

  return (
    <group>
      {/* alas diorama: tanah + sisi bata seperti potongan blok */}
      <mesh position={[0, -0.35, 0]} receiveShadow>
        <boxGeometry args={[W, 0.7, D]} />
        <meshStandardMaterial color="#9c5a3c" flatShading />
      </mesh>
      <mesh position={[0, 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial color={theme.tanah} />
      </mesh>

      {/* jalan / gang */}
      <mesh position={[0, 0.01, JALAN_Z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[W, kampung ? 1.4 : 2.0]} />
        <meshStandardMaterial color={theme.jalan} />
      </mesh>
      {theme.garisJalan &&
        Array.from({ length: 12 }).map((_, i) => (
          <mesh key={i} position={[-W / 2 + 0.6 + i * 1.08, 0.015, JALAN_Z + 0.35]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.5, 0.06]} />
            <meshStandardMaterial color="#f2f2e8" />
          </mesh>
        ))}
      {/* trotoar depan */}
      {!kampung && (
        <mesh position={[0, 0.05, 2.9]} receiveShadow>
          <boxGeometry args={[W, 0.1, 0.8]} />
          <meshStandardMaterial color="#a9a6a0" />
        </mesh>
      )}

      {/* sungai Cikapundung + jembatan bambu */}
      {theme.sungai && (
        <group>
          <mesh position={[0, 0.02, -3.6]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[W, 1.4]} />
            <meshStandardMaterial color="#5f8f8a" roughness={0.2} metalness={0.1} />
          </mesh>
          <mesh position={[3.5, 0.12, -3.6]} castShadow>
            <boxGeometry args={[0.6, 0.06, 1.6]} />
            <meshStandardMaterial color="#c2a25a" flatShading />
          </mesh>
          <Jemuran x={-4.2} z={-0.9} />
          <Jemuran x={2.2} z={-1.0} />
          {/* pos ronda */}
          <group position={[-1.9, 0, -0.8]}>
            <mesh position={[0, 0.25, 0]} castShadow>
              <boxGeometry args={[0.8, 0.08, 0.6]} />
              <meshStandardMaterial color="#b08a55" />
            </mesh>
            <mesh position={[0, 0.85, 0]} rotation={[0.2, 0, 0]} castShadow>
              <boxGeometry args={[0.95, 0.05, 0.8]} />
              <meshStandardMaterial color="#8a8f96" metalness={0.4} />
            </mesh>
            {[[-0.35, -0.25], [0.35, -0.25], [-0.35, 0.25], [0.35, 0.25]].map(([dx, dz], i) => (
              <mesh key={i} position={[dx, 0.4, dz]}>
                <boxGeometry args={[0.05, 0.8, 0.05]} />
                <meshStandardMaterial color="#6b4a2f" />
              </mesh>
            ))}
          </group>
          {/* tiang & kabel semrawut */}
          {[-5.5, 0.8, 5.6].map((px, i) => (
            <mesh key={i} position={[px, 1.2, 0.55]}>
              <cylinderGeometry args={[0.04, 0.05, 2.4, 5]} />
              <meshStandardMaterial color="#5a5a5a" />
            </mesh>
          ))}
          {[0, 1, 2].map((k) => (
            <mesh key={k} position={[0, 2.25 - k * 0.12, 0.55]} rotation={[0, 0, Math.PI / 2 + (k - 1) * 0.01]}>
              <cylinderGeometry args={[0.008, 0.008, 11.1, 3]} />
              <meshStandardMaterial color="#111" />
            </mesh>
          ))}
        </group>
      )}

      {theme.tenda && [-4.5, -2.8, 3.0, 4.7].map((tx, i) => <Tenda key={i} x={tx} z={-0.8} warna={i % 2 ? '#2b6fd6' : '#3d8be0'} />)}

      {layout.rumah.map((r, i) => (
        <Rumah key={i} r={r} kampung={kampung} />
      ))}
      {layout.pohon.map((p, i) => (
        <Pohon key={i} {...p} />
      ))}
    </group>
  );
}
