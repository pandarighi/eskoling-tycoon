import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Color, InstancedMesh, Object3D } from 'three';
import { LOKASI } from '../data/game-data';
import { useLive } from '../live';
import type { CustomerEvent, SegmentId } from '../sim/types';
import { komentarUntuk } from '../ui/komentar';
import { CART_X } from './Cart';
import { JALAN_Z, W } from './Diorama';
import { SEG_WARNA } from './themes';

const MAX = 120;
const SPEED = 1.1; // unit per detik

/**
 * Tata letak jalur (z) dari belakang ke depan, sesuai arah kamera (kamera di sisi +z):
 * gerobak (0.3) → ANTREAN (0.98) → jalur datang/pergi pembeli (1.32) → pejalan kaki (≥1.8).
 * Antrean memanjang ke +x. Pembeli datang dari +x ke ekor antrean, lalu pergi ke −x dari depan gerobak.
 * Pejalan kaki selalu di lajur depan, jadi tidak menutupi badan & kepala yang antre.
 */
const Z_ANTRE = 0.98;
const Z_MENUJU = 1.32;
const Z_LEWAT_MIN = JALAN_Z + 0.3;
const JARAK_ANTRE = 0.34;
const MAX_ANTRE_VISUAL = 16;
/** Kepadatan pejalan kaki per lokasi (Cikapundung sepi → Braga padat). Jumlah pembeli tetap dari simulasi. */
const PEJALAN_PER_HARI = [16, 28, 40, 55, 75, 95, 120];
const PEJALAN_SERENTAK = [3, 5, 7, 9, 11, 13, 16];
const JEDA_AMBIENT: [number, number][] = [[2.6, 2.4], [1.9, 1.8], [1.4, 1.4], [1.1, 1.1], [0.9, 0.9], [0.7, 0.8], [0.5, 0.7]];
const slotX = (i: number) => CART_X + 0.22 + i * JARAK_ANTRE;

type Mode = 'lewat' | 'menuju' | 'kesal' | 'antre' | 'pergi';

interface Npc {
  aktif: boolean;
  mode: Mode;
  x: number;
  z: number;
  dir: 1 | -1;
  v: number;
  tunggu: number;
  ev: CustomerEvent | null;
  phase: number;
  warna: Color;
  hadap: number;
}

interface Bubble {
  id: number;
  x: number;
  z: number;
  teks: string;
  jenis: 'senang' | 'biasa' | 'kesal';
}

const dekati = (dari: number, ke: number, maks: number) => (Math.abs(ke - dari) <= maks ? ke : dari + Math.sign(ke - dari) * maks);

/**
 * Keramaian. Mode "live" memutar event hasil simulasi dengan antrean FIFO yang terlihat;
 * mode "ambient" hanya menampilkan pejalan kaki (layar persiapan).
 */
export function Crowd({ events, lokasi, live, speed, durasi, onSelesai }: { events: CustomerEvent[] | null; lokasi: number; live: boolean; speed: number; durasi: number; onSelesai?: () => void }) {
  const bodyRef = useRef<InstancedMesh>(null);
  const headRef = useRef<InstancedMesh>(null);
  const npcs = useRef<Npc[]>(Array.from({ length: MAX }, () => ({ aktif: false, mode: 'lewat', x: 0, z: 0, dir: 1, v: SPEED, tunggu: 0, ev: null, phase: 0, warna: new Color(), hadap: 0 })));
  const antrean = useRef<Npc[]>([]);
  const targetAntre = useRef(0);
  const layanTimer = useRef(0);
  const idx = useRef(0);
  const progress = useRef(0);
  const selesai = useRef(false);
  const ambientTimer = useRef(0);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const bubbleId = useRef(0);
  const dummy = useMemo(() => new Object3D(), []);
  const kulit = useMemo(() => new Color('#e2b48c'), []);
  const setProgress = useLive((s) => s.setProgress);
  const lastPush = useRef(0);

  // pembeli (beli/habis/kabur) selalu tampil; pejalan kaki biasa disampel agar tidak terlalu padat
  const visual = useMemo(() => {
    if (!events) return [];
    const lewat = events.filter((e) => e.tipe === 'lewat' && !e.keluhan);
    const keep = Math.min(1, (PEJALAN_PER_HARI[lokasi] ?? 70) / Math.max(1, lewat.length));
    let acc = 0;
    return events.filter((e) => {
      if (e.tipe !== 'lewat' || e.keluhan) return true;
      acc += keep;
      if (acc >= 1) {
        acc -= 1;
        return true;
      }
      return false;
    });
  }, [events, lokasi]);

  useEffect(() => {
    idx.current = 0;
    progress.current = 0;
    selesai.current = false;
    antrean.current = [];
    targetAntre.current = 0;
    layanTimer.current = 0;
    npcs.current.forEach((n) => (n.aktif = false));
    setBubbles([]);
    setProgress(0);
    useLive.getState().reset();
  }, [events, live, setProgress]);

  useLayoutEffect(() => {
    for (const ref of [bodyRef, headRef]) {
      const m = ref.current;
      if (!m) continue;
      dummy.scale.setScalar(0);
      dummy.updateMatrix();
      for (let i = 0; i < MAX; i++) m.setMatrixAt(i, dummy.matrix);
      m.instanceMatrix.needsUpdate = true;
    }
  }, [dummy]);

  const pop = (n: Npc, b: Pick<Bubble, 'teks' | 'jenis'> | null) => {
    if (!b) return;
    const id = ++bubbleId.current;
    setBubbles((bs) => [...bs.slice(-8), { id, x: n.x, z: n.z, ...b }]);
    setTimeout(() => setBubbles((bs) => bs.filter((x) => x.id !== id)), 1800 / Math.max(1, speed / 1.5));
  };

  const spawn = (seg: SegmentId, ev: CustomerEvent | null) => {
    const pembeli = !!ev && ev.tipe !== 'lewat';
    if (!pembeli && npcs.current.filter((p) => p.aktif && p.mode === 'lewat').length >= (PEJALAN_SERENTAK[lokasi] ?? 14) && !ev?.keluhan) return;
    const n = npcs.current.find((p) => !p.aktif);
    // antrean visual penuh / tidak ada slot: transaksi tetap dihitung agar angka = hasil simulasi
    if (!n || (pembeli && antrean.current.length >= MAX_ANTRE_VISUAL && ev!.tipe !== 'kabur')) {
      if (ev) useLive.getState().catat(ev.tipe);
      return;
    }
    // pembeli selalu datang dari sisi ekor antrean (+x) dan pergi lewat sisi gerobak (−x),
    // jadi arus datang & pergi tidak pernah melintas di depan orang yang sedang antre
    const dir: 1 | -1 = pembeli ? -1 : Math.random() < 0.5 ? 1 : -1;
    n.aktif = true;
    n.dir = dir;
    n.x = -dir * (W / 2 + 0.3);
    n.v = SPEED * (0.85 + Math.random() * 0.3);
    n.ev = ev;
    n.phase = Math.random() * 6;
    n.tunggu = 0;
    n.hadap = dir;
    n.mode = pembeli ? 'menuju' : 'lewat';
    n.z = pembeli ? Z_MENUJU : Z_LEWAT_MIN + Math.random() * 0.35;
    if (pembeli) targetAntre.current = Math.min(MAX_ANTRE_VISUAL, ev!.antre ?? 0);
    n.warna.set(SEG_WARNA[seg] ?? '#888');
  };

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.1) * (live ? speed : 1);

    if (live && events) {
      progress.current = Math.min(1, progress.current + delta / durasi);
      while (idx.current < visual.length && visual[idx.current].t <= progress.current) {
        const ev = visual[idx.current++];
        spawn(ev.seg, ev);
      }
      const now = performance.now();
      if (now - lastPush.current > 120 || progress.current >= 1) {
        lastPush.current = now;
        setProgress(progress.current);
        useLive.setState({ antre: antrean.current.length });
      }
      const masihMenuju = npcs.current.some((n) => n.aktif && (n.mode === 'menuju' || n.mode === 'kesal'));
      if (progress.current >= 1 && !selesai.current && antrean.current.length === 0 && !masihMenuju) {
        selesai.current = true;
        setTimeout(() => onSelesai?.(), 700);
      }
    } else {
      ambientTimer.current -= delta;
      if (ambientTimer.current <= 0) {
        const [a, b] = JEDA_AMBIENT[lokasi] ?? [0.7, 1.3];
        ambientTimer.current = a + Math.random() * b;
        const segs = Object.keys(LOKASI[lokasi].segmen) as SegmentId[];
        spawn(segs[Math.floor(Math.random() * segs.length)], null);
      }
    }

    // ===== layani pembeli terdepan =====
    const q = antrean.current;
    const depan = q[0];
    if (depan && Math.abs(depan.x - slotX(0)) < 0.04 && Math.abs(depan.z - Z_ANTRE) < 0.04) {
      layanTimer.current += delta;
      // kecepatan layan menyesuaikan panjang antrean di simulasi, agar yang terlihat mirip hasil hitungan
      const lebih = q.length - targetAntre.current;
      const durasiLayan = progress.current >= 1 ? 0.3 : lebih > 2 ? 0.2 : lebih > 0 ? 0.45 : lebih < 0 ? 1.2 : 0.8;
      if (layanTimer.current >= durasiLayan) {
        layanTimer.current = 0;
        q.shift();
        if (depan.ev) useLive.getState().catat(depan.ev.tipe);
        pop(depan, depan.ev ? komentarUntuk(depan.ev) : null);
        depan.mode = 'pergi';
        depan.dir = -1;
      }
    } else layanTimer.current = 0;

    // ===== gerak tiap NPC =====
    for (const n of npcs.current) {
      if (!n.aktif) continue;
      const langkah = n.v * delta;
      switch (n.mode) {
        case 'lewat': {
          n.x += n.dir * langkah;
          n.hadap = n.dir;
          if (n.ev?.keluhan && Math.abs(n.x - CART_X) < 0.12) {
            pop(n, komentarUntuk(n.ev));
            n.ev = null;
          }
          break;
        }
        case 'menuju': {
          const kabur = n.ev?.tipe === 'kabur';
          const tx = slotX(q.length) + (kabur ? 0.25 : 0);
          n.hadap = Math.sign(tx - n.x) || n.hadap;
          n.x = dekati(n.x, tx, langkah);
          if (Math.abs(n.x - tx) < 0.02) {
            if (kabur) {
              n.mode = 'kesal';
              n.tunggu = 0;
            } else {
              q.push(n);
              n.mode = 'antre';
            }
          }
          break;
        }
        case 'kesal': {
          n.hadap = -1;
          n.tunggu += delta;
          if (n.tunggu > 0.8) {
            pop(n, n.ev ? komentarUntuk(n.ev) : null);
            useLive.getState().catat('kabur');
            n.mode = 'pergi';
            n.dir = 1;
          }
          break;
        }
        case 'antre': {
          const i = q.indexOf(n);
          const maju = langkah * 1.6; // merapat ke depan sedikit lebih cepat
          const tx = slotX(i);
          // masuk ke lajur antrean dulu (z), lalu maju mengikuti slot (x)
          n.z = dekati(n.z, Z_ANTRE, maju);
          if (Math.abs(n.z - Z_ANTRE) < 0.01) n.x = dekati(n.x, tx, maju);
          n.hadap = -1; // menghadap gerobak
          break;
        }
        case 'pergi': {
          // menyingkir ke lajur pejalan kaki dulu, baru berjalan menjauh
          const zPergi = Z_LEWAT_MIN + 0.1;
          n.z = dekati(n.z, zPergi, langkah);
          n.x += n.dir * langkah * (Math.abs(n.z - zPergi) < 0.01 ? 1 : 0.35);
          n.hadap = n.dir;
          break;
        }
      }
      if (Math.abs(n.x) > W / 2 + 0.6) n.aktif = false;
    }

    // ===== tulis ke instanced mesh =====
    const body = bodyRef.current;
    const head = headRef.current;
    if (!body || !head) return;
    npcs.current.forEach((n, i) => {
      const diam = n.mode === 'antre' || n.mode === 'kesal';
      const bob = n.aktif && !diam ? Math.abs(Math.sin((n.x + n.phase) * 9)) * 0.05 : 0;
      dummy.scale.setScalar(n.aktif ? 1 : 0);
      dummy.position.set(n.x, 0.28 + bob, n.z);
      dummy.rotation.set(0, n.hadap === 1 ? Math.PI / 2 : -Math.PI / 2, 0);
      dummy.updateMatrix();
      body.setMatrixAt(i, dummy.matrix);
      body.setColorAt(i, n.warna);
      dummy.position.y = 0.66 + bob;
      dummy.updateMatrix();
      head.setMatrixAt(i, dummy.matrix);
      head.setColorAt(i, kulit);
    });
    body.instanceMatrix.needsUpdate = true;
    head.instanceMatrix.needsUpdate = true;
    if (body.instanceColor) body.instanceColor.needsUpdate = true;
    if (head.instanceColor) head.instanceColor.needsUpdate = true;
  });

  return (
    <group>
      <instancedMesh ref={bodyRef} args={[undefined, undefined, MAX]} castShadow frustumCulled={false}>
        <boxGeometry args={[0.22, 0.48, 0.16]} />
        <meshStandardMaterial flatShading />
      </instancedMesh>
      <instancedMesh ref={headRef} args={[undefined, undefined, MAX]} castShadow frustumCulled={false}>
        <boxGeometry args={[0.2, 0.2, 0.2]} />
        <meshStandardMaterial flatShading />
      </instancedMesh>
      {/* garis antrean di tanah */}
      {live && (
        <mesh position={[slotX(0) + (JARAK_ANTRE * 9) / 2, 0.02, Z_ANTRE + 0.16]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[JARAK_ANTRE * 10, 0.03]} />
          <meshBasicMaterial color="#ffe4a8" transparent opacity={0.55} />
        </mesh>
      )}
      {bubbles.map((b) => (
        <Html key={b.id} position={[b.x, 1.15, b.z]} center zIndexRange={[20, 10]} pointerEvents="none">
          <div className={`bubble ${b.jenis}`}>{b.teks}</div>
        </Html>
      ))}
    </group>
  );
}
