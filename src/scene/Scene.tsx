import { OrbitControls, OrthographicCamera } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Suspense, useEffect, useMemo, useRef } from 'react';
import { Color, DirectionalLight, Fog, InstancedMesh, MOUSE, Object3D, TOUCH, type OrthographicCamera as OrthographicCameraImpl } from 'three';
import { useLive } from '../live';
import type { CustomerEvent, UpgradeId, WeatherId } from '../sim/types';
import { Cart } from './Cart';
import { Crowd } from './Crowd';
import { D, Diorama, W } from './Diorama';
import { GlbWorld, pakaiGlb } from './GlbWorld';
import { THEMES } from './themes';

const ZOOM_MIN = 0.75;
const ZOOM_MAKS = 3.2;

const LANGIT_CUACA: Record<WeatherId, string | null> = { terik: '#ffd27a', cerah: null, berawan: '#c7cfd8', gerimis: '#8e9aa8', hujan: '#5f6b7a' };

function Hujan({ deras }: { deras: boolean }) {
  const n = deras ? 900 : 350;
  const ref = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const drops = useMemo(() => Array.from({ length: n }, () => ({ x: (Math.random() - 0.5) * W, y: Math.random() * 6, z: (Math.random() - 0.5) * D, v: 7 + Math.random() * 3 })), [n]);
  useFrame((_, dt) => {
    const m = ref.current;
    if (!m) return;
    drops.forEach((d, i) => {
      d.y -= d.v * Math.min(dt, 0.1);
      if (d.y < 0) d.y += 6;
      dummy.position.set(d.x, d.y, d.z);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, n]} frustumCulled={false}>
      <boxGeometry args={[0.012, 0.22, 0.012]} />
      <meshBasicMaterial color="#cfe3ff" transparent opacity={0.6} />
    </instancedMesh>
  );
}

/** Kamera ortografis isometrik + zoom/geser: pinch dua jari di HP, scroll mouse & tombol +/− di laptop. */
function KameraIso({ besar }: { besar: boolean }) {
  const { size } = useThree();
  const portrait = size.height > size.width;
  // portrait (HP berdiri): lebih dekat & berpusat ke gerobak + antrean; landscape: seluruh diorama.
  // Diorama GLB (16×16 m) lebih luas dari diorama lama, jadi kamera dibuat lebih jauh.
  const zoom = besar
    ? portrait ? Math.min(size.width / 17, size.height / 22) : Math.min(size.width / 34, size.height / 21.5)
    : portrait ? Math.min(size.width / 13, size.height / 10) : Math.min(size.width / 17, size.height / 10.5);
  const t = useMemo<[number, number, number]>(() => (besar ? (portrait ? [3.5, 1.2, 2.5] : [0, 1.2, 0]) : portrait ? [1.1, 0.6, 0.8] : [0, 0.6, 0.4]), [portrait, besar]);
  const batas = besar ? 7 : 5;
  const controls = useRef<OrbitControlsImpl>(null);
  const cam = useRef<OrthographicCameraImpl>(null);

  useEffect(() => {
    const reset = () => {
      const c = cam.current;
      const o = controls.current;
      if (!c || !o) return;
      c.zoom = zoom;
      c.position.set(t[0] + 11, t[1] + 10, t[2] + 13);
      o.target.set(...t);
      c.updateProjectionMatrix();
      o.update();
    };
    const onZoom = (e: Event) => {
      const arah = (e as CustomEvent<'in' | 'out' | 'reset'>).detail;
      const c = cam.current;
      const o = controls.current;
      if (!c || !o) return;
      if (arah === 'reset') return reset();
      c.zoom = Math.min(zoom * ZOOM_MAKS, Math.max(zoom * ZOOM_MIN, c.zoom * (arah === 'in' ? 1.3 : 1 / 1.3)));
      c.updateProjectionMatrix();
      o.update();
    };
    window.addEventListener('eskoling-zoom', onZoom);
    return () => window.removeEventListener('eskoling-zoom', onZoom);
  }, [zoom, t]);

  return (
    <>
      <OrthographicCamera ref={cam} key={`${portrait ? 'p' : 'l'}${besar ? 'b' : ''}`} makeDefault position={[t[0] + 11, t[1] + 10, t[2] + 13]} zoom={zoom} near={-50} far={100} />
      <OrbitControls
        ref={controls}
        key={`ctl-${portrait ? 'p' : 'l'}${besar ? 'b' : ''}`}
        target={t}
        enableRotate={false}
        enableDamping
        dampingFactor={0.12}
        screenSpacePanning
        minZoom={zoom * ZOOM_MIN}
        maxZoom={zoom * ZOOM_MAKS}
        zoomSpeed={0.9}
        mouseButtons={{ LEFT: MOUSE.PAN, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.PAN }}
        touches={{ ONE: TOUCH.PAN, TWO: TOUCH.DOLLY_PAN }}
        onChange={() => {
          // jaga agar pandangan tidak keluar jauh dari diorama
          const o = controls.current;
          if (!o) return;
          const tg = o.target;
          const cx = Math.max(-batas, Math.min(batas, tg.x));
          const cz = Math.max(besar ? -batas : -3, Math.min(besar ? batas : 3.5, tg.z));
          const cy = Math.max(-1, Math.min(2, tg.y));
          if (cx !== tg.x || cy !== tg.y || cz !== tg.z) {
            const dx = cx - tg.x, dy = cy - tg.y, dz = cz - tg.z;
            tg.set(cx, cy, cz);
            o.object.position.x += dx;
            o.object.position.y += dy;
            o.object.position.z += dz;
          }
        }}
      />
    </>
  );
}

/** Matahari bergerak dari pagi ke sore mengikuti progres hari jualan. */
function Pencahayaan({ cuaca, live, neon, besar }: { cuaca: WeatherId; live: boolean; neon: number; besar: boolean }) {
  const sun = useRef<DirectionalLight>(null);
  const { scene } = useThree();
  const gelap = cuaca === 'hujan' ? 0.45 : cuaca === 'gerimis' ? 0.65 : cuaca === 'berawan' ? 0.8 : 1;
  useFrame(() => {
    const p = live ? useLive.getState().progress : 0.35;
    const sudut = -0.9 + p * 1.8;
    if (sun.current) {
      sun.current.position.set(Math.sin(sudut) * 12, 9 - Math.abs(sudut) * 2.5, 6);
      const sore = Math.max(0, p - 0.6) / 0.4;
      sun.current.color.setRGB(1, 0.95 - sore * 0.25, 0.85 - sore * 0.45);
      sun.current.intensity = (2.2 - sore * 0.9) * gelap;
    }
    if (scene.fog instanceof Fog) scene.fog.far = cuaca === 'hujan' ? 30 : 60;
  });
  return (
    <>
      <hemisphereLight args={['#dfe8ff', '#6b5a48', 0.9 * gelap + neon * 0.1]} />
      <directionalLight ref={sun} castShadow position={[6, 9, 6]} shadow-mapSize={besar ? [2048, 2048] : [1024, 1024]} shadow-camera-left={besar ? -13 : -9} shadow-camera-right={besar ? 13 : 9} shadow-camera-top={besar ? 13 : 9} shadow-camera-bottom={besar ? -13 : -9} shadow-camera-far={besar ? 60 : 50} shadow-bias={-0.0004} shadow-normalBias={0.02} />
    </>
  );
}

function Background({ warna }: { warna: string }) {
  const { scene } = useThree();
  useEffect(() => {
    scene.background = new Color(warna);
    scene.fog = new Fog(warna, 20, 60);
  }, [scene, warna]);
  return null;
}

export interface SceneProps {
  lokasi: number;
  cuaca: WeatherId;
  asap: boolean;
  events: CustomerEvent[] | null;
  live: boolean;
  speed: number;
  warna: string;
  namaMenu: string;
  upgrade: Partial<Record<UpgradeId, number>>;
  penjual: 'L' | 'P';
  onSelesai?: () => void;
}

export function Scene(p: SceneProps) {
  const theme = THEMES[p.lokasi] ?? THEMES[0];
  const langit = p.asap ? '#8c8478' : LANGIT_CUACA[p.cuaca] ?? theme.langit;
  const ramai = p.live;
  const glb = pakaiGlb(p.lokasi);
  return (
    <Canvas shadows dpr={[1, 1.75]} gl={{ antialias: true, powerPreference: 'high-performance' }}>
      <Background warna={langit} />
      <KameraIso besar={glb} />
      <Pencahayaan cuaca={p.cuaca} live={p.live} neon={theme.neon} besar={glb} />
      {glb ? (
        <Suspense fallback={null}>
          <GlbWorld lokasi={p.lokasi} warna={p.warna} namaMenu={p.namaMenu} penjual={p.penjual} events={p.events} live={p.live} speed={p.speed} durasi={40} onSelesai={p.onSelesai} />
        </Suspense>
      ) : (
        <>
          <Diorama theme={theme} lokasi={p.lokasi} />
          <Cart warna={p.warna} namaMenu={p.namaMenu} ramai={ramai} upgrade={p.upgrade} />
          <Crowd events={p.events} lokasi={p.lokasi} live={p.live} speed={p.speed} durasi={40} onSelesai={p.onSelesai} />
        </>
      )}
      {(p.cuaca === 'hujan' || p.cuaca === 'gerimis') && <Hujan deras={p.cuaca === 'hujan'} />}
    </Canvas>
  );
}
