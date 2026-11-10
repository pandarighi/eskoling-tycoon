import { Html, useGLTF } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AnimationAction,
  AnimationMixer,
  CanvasTexture,
  Material,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  PMREMGenerator,
  Quaternion,
  SRGBColorSpace,
  Vector3,
} from 'three';
import type { GLTF } from 'three-stdlib';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { LOKASI } from '../data/game-data';
import { useLive } from '../live';
import type { CustomerEvent, SegmentId } from '../sim/types';
import { komentarUntuk } from '../ui/komentar';

/**
 * Dunia 3D berbasis GLB (dibuat di Blender). Untuk sementara dipakai di Lokasi 1 & 2;
 * lokasi lain masih memakai Diorama/Cart/Crowd lama.
 *
 * Isi tiap lokasi.glb:
 *  - mesh statis + (opsional) mesh "lokasi1_water"
 *  - empty WP_* : graf jalur pejalan kaki. extras.kind = E (pintu masuk) | N (simpul) | Q (slot antre, extras.order) | SPOT
 *  - empty NPC_* : NPC diam. extras.model = nama model, extras.anim = animasi
 */
const BASE = import.meta.env.BASE_URL;
const DRACO = `${BASE}draco/`;
const M = (f: string) => `${BASE}models/${f}`;

export const LOKASI_GLB: Record<number, string> = { 0: M('lokasi1.glb'), 1: M('lokasi2.glb'), 2: M('lokasi3.glb'), 3: M('lokasi4.glb'), 4: M('lokasi5.glb') };
export const pakaiGlb = (lokasi: number) => lokasi in LOKASI_GLB;

const MODEL: Record<string, string> = {
  gerobak: M('gerobak-t1-v2.glb'),
  penjual: M('npc-penjual-v2.glb'),
  penjualP: M('npc-penjual-perempuan-v2.glb'),
  ibu: M('npc-ibu-v2.glb'),
  anakmuda: M('npc-anakmuda-v2.glb'),
  bapak: M('npc-bapak-v2.glb'),
  pedagang: M('npc-pedagang-pasar.glb'),
  sopir: M('npc-sopir-angkot.glb'),
  ojol: M('npc-ojol.glb'),
  ibuBelanja: M('npc-ibu-belanja.glb'),
  pelajarL: M('npc-pelajar-putra.glb'),
  pelajarP: M('npc-pelajar-putri.glb'),
  satpam: M('npc-satpam.glb'),
  kucing: M('npc-kucing-oren.glb'),
  kantoranL: M('npc-kantoran-putra.glb'),
  kantoranP: M('npc-kantoran-putri.glb'),
};

/** Model pembeli per segmen & lokasi. */
const PEMBELI: Record<number, Partial<Record<SegmentId, string[]>>> = {
  0: { warga: ['ibu', 'bapak', 'ibu', 'bapak'], pelajar: ['pelajarL', 'pelajarP'], ojol: ['ojol'] },
  1: { warga: ['ibu', 'ibuBelanja'], pelajar: ['pelajarL', 'pelajarP'], ojol: ['ojol'] },
  2: { warga: ['ibu', 'bapak'], pelajar: ['pelajarL', 'pelajarP'], ojol: ['ojol'] },
  3: { anakmuda: ['anakmuda'], pelajar: ['pelajarL', 'pelajarP'], ojol: ['ojol'] },
  4: { kantoran: ['kantoranL', 'kantoranP'], anakmuda: ['anakmuda'], warga: ['ibu', 'bapak'] },
};
const MODEL_LEWAT: Record<number, string[]> = { 0: ['ibu', 'bapak', 'anakmuda'], 1: ['ibu', 'ibuBelanja', 'anakmuda', 'ojol'], 2: ['pelajarL', 'pelajarP', 'pelajarL', 'pelajarP', 'ibu', 'ojol'], 3: ['anakmuda', 'anakmuda', 'anakmuda', 'pelajarL', 'pelajarP', 'ojol', 'ibu'], 4: ['kantoranL', 'kantoranP', 'kantoranL', 'kantoranP', 'anakmuda', 'ibu', 'bapak', 'pelajarP'] };
const PEJALAN_SERENTAK = [4, 6, 7, 8, 9];
const JEDA_AMBIENT: [number, number][] = [[2.2, 2.0], [1.6, 1.6], [1.4, 1.4], [1.2, 1.2], [1.0, 1.0]];
const MAX_AKTOR = 18;
const SPEED = 1.1;

for (const u of [...Object.values(LOKASI_GLB), ...Object.values(MODEL)]) useGLTF.preload(u, DRACO);

// ---------- util ----------
const nn = (s: string) => s.replace(/\.?\d{3}$/, '');
const rnd = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

interface Wp {
  p: Vector3;
  links: Set<string>;
  kind: string;
  order: number;
}

function bacaGraf(root: Object3D) {
  const WP: Record<string, Wp> = {};
  root.updateMatrixWorld(true);
  root.traverse((o) => {
    if (!o.name.startsWith('WP_')) return;
    const name = nn(o.name);
    const p = new Vector3();
    o.getWorldPosition(p);
    const ud = o.userData as { links?: string; kind?: string; order?: number };
    WP[name] = { p, links: new Set((ud.links ?? '').split(',').filter(Boolean).map(nn)), kind: ud.kind ?? 'N', order: ud.order ?? 0 };
  });
  for (const [n, w] of Object.entries(WP)) for (const l of w.links) WP[l]?.links.add(n);
  const QP = Object.keys(WP)
    .filter((n) => WP[n].kind === 'Q')
    .sort((a, b) => WP[a].order - WP[b].order)
    .map((n) => WP[n].p);
  const ENTRIES = Object.keys(WP).filter((n) => WP[n].kind === 'E');
  const NN = Object.keys(WP).filter((n) => WP[n].kind === 'N');
  const P = (n: string) => WP[`WP_${n}`].p;
  const route = (a: string, b: string): Vector3[] => {
    const prev: Record<string, string | null> = { [a]: null };
    const q = [a];
    while (q.length) {
      const n = q.shift()!;
      if (n === b) break;
      for (const l of WP[n]?.links ?? []) {
        if (l in prev || WP[l]?.kind === 'SPOT') continue;
        prev[l] = n;
        q.push(l);
      }
    }
    if (!(b in prev)) return [];
    const out: string[] = [];
    for (let n: string | null = b; n; n = prev[n]) out.unshift(n);
    return out.map((n) => WP[n].p);
  };
  const nearest = (p: Vector3) => NN.reduce((a, n) => (WP[n].p.distanceTo(p) < WP[a].p.distanceTo(p) ? n : a), NN[0]);
  return { WP, QP, ENTRIES, P, route, nearest };
}
type Graf = ReturnType<typeof bacaGraf>;

/** Geser titik jalur ke samping sedikit agar NPC tidak menempel di satu garis. */
function lajur(pts: Vector3[], off: number) {
  return pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const d = new Vector3().subVectors(b, a).setY(0);
    if (d.lengthSq() < 1e-6) return p.clone();
    d.normalize();
    return p.clone().add(new Vector3(-d.z, 0, d.x).multiplyScalar(off));
  });
}

function bersiapkan(root: Object3D) {
  root.traverse((o) => {
    const m = o as Mesh;
    if (!m.isMesh) return;
    m.castShadow = m.receiveShadow = true;
    for (const mat of (Array.isArray(m.material) ? m.material : [m.material]) as Material[]) if (mat.transparent) mat.depthWrite = false;
  });
}

interface Aktor {
  model: string;
  g: Object3D;
  mixer: AnimationMixer;
  acts: Record<string, AnimationAction>;
  cur: AnimationAction | null;
}

function buatAktor(gltf: GLTF, model: string): Aktor {
  const g = gltf.scene.clone(true);
  bersiapkan(g);
  const mixer = new AnimationMixer(g);
  const acts: Record<string, AnimationAction> = {};
  for (const a of gltf.animations) acts[a.name] = mixer.clipAction(a);
  return { model, g, mixer, acts, cur: null };
}
function mainkan(a: Aktor, nama: string) {
  const x = a.acts[nama] ?? a.acts.Idle;
  if (!x || a.cur === x) return;
  x.reset().fadeIn(0.2).play();
  a.cur?.fadeOut(0.2);
  a.cur = x;
}


/** Ganti material bernama `nama` dengan salinannya (agar bisa diwarnai ulang tanpa memengaruhi model lain). */
function salinMaterial(root: Object3D, nama: string) {
  root.traverse((o) => {
    const m = o as Mesh;
    if (!m.isMesh) return;
    if (Array.isArray(m.material)) m.material = m.material.map((x) => (x.name === nama ? x.clone() : x));
    else if (m.material.name === nama) m.material = m.material.clone();
  });
}

function cariMaterial(root: Object3D, nama: string): MeshStandardMaterial[] {
  const out = new Set<MeshStandardMaterial>();
  root.traverse((o) => {
    const m = o as Mesh;
    if (!m.isMesh) return;
    for (const mat of (Array.isArray(m.material) ? m.material : [m.material]) as MeshStandardMaterial[]) if (mat.name === nama) out.add(mat);
  });
  return [...out];
}

/** Papan nama menu (tekstur kanvas) untuk ditempel di papan krem gerobak. */
function usePapanMenu(teks: string) {
  const tex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 150;
    const g = c.getContext('2d')!;
    g.fillStyle = '#f6e7c8';
    g.fillRect(0, 0, 512, 150);
    let size = 70;
    g.font = `800 ${size}px "Bricolage Grotesque", system-ui, sans-serif`;
    while (g.measureText(teks).width > 460 && size > 24) {
      size -= 2;
      g.font = `800 ${size}px "Bricolage Grotesque", system-ui, sans-serif`;
    }
    g.fillStyle = '#b5381f';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(teks, 256, 78);
    const t = new CanvasTexture(c);
    t.colorSpace = SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }, [teks]);
  useEffect(() => () => tex.dispose(), [tex]);
  return tex;
}

// ---------- NPC berjalan (pembeli & pejalan kaki) ----------
type State = 'off' | 'lewat' | 'menuju' | 'antre' | 'keLayan' | 'dilayani' | 'kesal' | 'pergi';
interface Npc {
  a: Aktor;
  state: State;
  path: Vector3[];
  ev: CustomerEvent | null;
  /** posisi di rel antrean: jarak (m) dari slot terdepan, mengikuti garis ular */
  s: number;
  lane: number;
  t: number;
  keluhanDone: boolean;
  /** pengaman: jarak ke target terakhir & lama tidak ada kemajuan */
  watchD: number;
  watchT: number;
}

interface Bubble {
  id: number;
  pos: [number, number, number];
  teks: string;
  jenis: 'senang' | 'biasa' | 'kesal';
}

export interface GlbWorldProps {
  lokasi: number;
  warna: string;
  namaMenu: string;
  penjual: 'L' | 'P';
  events: CustomerEvent[] | null;
  live: boolean;
  speed: number;
  durasi: number;
  onSelesai?: () => void;
}

export function GlbWorld(p: GlbWorldProps) {
  const { gl, scene } = useThree();
  // cahaya lingkungan lembut (sama seperti halaman preview) agar warna aset tidak gelap
  useEffect(() => {
    const pm = new PMREMGenerator(gl);
    const tex = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    pm.dispose();
    scene.environment = tex;
    (scene as unknown as { environmentIntensity: number }).environmentIntensity = 0.55;
    return () => {
      scene.environment = null;
      tex.dispose();
    };
  }, [gl, scene]);
  const lok = useGLTF(LOKASI_GLB[p.lokasi], DRACO) as unknown as GLTF;
  const models = {} as Record<string, GLTF>;
  for (const [k, u] of Object.entries(MODEL)) models[k] = useGLTF(u, DRACO) as unknown as GLTF; // jumlah & urutan tetap → aman untuk hooks

  const world = useMemo(() => {
    const s = lok.scene.clone(true);
    bersiapkan(s);
    return s;
  }, [lok]);
  const graf = useMemo(() => bacaGraf(world), [world]);
  const water = useMemo(() => world.getObjectByName('lokasi1_water') ?? null, [world]);
  const waterY = water?.position.y ?? 0;

  // ---- gerobak ----
  const cart = useMemo(() => {
    const g = models.gerobak.scene.clone(true);
    bersiapkan(g);
    // badan gerobak boleh diwarnai ulang → material sendiri
    salinMaterial(g, 'v2_Body');
    return g;
  }, [models.gerobak]);
  useEffect(() => {
    for (const m of cariMaterial(cart, 'v2_Body')) m.color.set(p.warna);
  }, [cart, p.warna]);
  const papan = usePapanMenu(p.namaMenu);

  // ---- penjual (L/P), kaos & topi ikut warna gerobak ----
  const sellers = useMemo(() => {
    const L = buatAktor(models.penjual, 'penjual');
    const P = buatAktor(models.penjualP, 'penjualP');
    for (const a of [L, P]) {
      a.g.position.copy(graf.P('SPOT_penjual'));
      a.g.lookAt(graf.P('SPOT_layan').clone().setY(a.g.position.y));
      salinMaterial(a.g, 'Shirt_Recolor');
      salinMaterial(a.g, 'Cap_Recolor');
      mainkan(a, 'Idle');
    }
    return { L, P };
  }, [models.penjual, models.penjualP, graf]);
  useEffect(() => {
    for (const a of [sellers.L, sellers.P]) for (const m of [...cariMaterial(a.g, 'Shirt_Recolor'), ...cariMaterial(a.g, 'Cap_Recolor')]) m.color.set(p.warna);
  }, [sellers, p.warna]);
  const seller = p.penjual === 'P' ? sellers.P : sellers.L;

  // ---- NPC diam dari empty NPC_* ----
  const diam = useMemo(() => {
    const out: Aktor[] = [];
    world.traverse((o) => {
      if (!o.name.startsWith('NPC_')) return;
      const ud = o.userData as { model?: string; anim?: string };
      const g = ud.model ? models[ud.model] : undefined;
      if (!g) return;
      const a = buatAktor(g, ud.model!);
      o.getWorldPosition(a.g.position);
      const q = new Quaternion();
      o.getWorldQuaternion(q);
      a.g.quaternion.copy(q);
      mainkan(a, ud.anim ?? 'Idle');
      if (a.cur) a.cur.time = Math.random() * a.cur.getClip().duration;
      out.push(a);
    });
    return out;
  }, [world, models]);

  // ---- NPC berjalan: pool ----
  const pool = useRef<Npc[]>([]);
  const queue = useRef<Npc[]>([]);
  const server = useRef<Npc | null>(null);
  const datang = useRef(0); // pembeli yang sedang menuju antrean
  const targetAntre = useRef(0);
  const idx = useRef(0);
  const progress = useRef(0);
  const selesai = useRef(false);
  const ambient = useRef(0);
  const lastPush = useRef(0);
  const lewatTutup = useRef(0); // detik sejak jam tutup (pengaman agar hari pasti berakhir)
  const grupRef = useRef<Object3D>(null);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const bubbleId = useRef(0);
  const setProgress = useLive((s) => s.setProgress);

  const visual = useMemo(() => {
    if (!p.events) return [];
    const lewat = p.events.filter((e) => e.tipe === 'lewat' && !e.keluhan);
    const keep = Math.min(1, ([18, 30, 40, 48, 56][p.lokasi] ?? 30) / Math.max(1, lewat.length));
    let acc = 0;
    return p.events.filter((e) => {
      if (e.tipe !== 'lewat' || e.keluhan) return true;
      acc += keep;
      if (acc >= 1) {
        acc -= 1;
        return true;
      }
      return false;
    });
  }, [p.events, p.lokasi]);

  useEffect(() => {
    idx.current = 0;
    progress.current = 0;
    selesai.current = false;
    queue.current = [];
    server.current = null;
    datang.current = 0;
    lewatTutup.current = 0;
    targetAntre.current = 0;
    for (const n of pool.current) {
      n.state = 'off';
      n.a.g.visible = false;
    }
    setBubbles([]);
    setProgress(0);
    useLive.getState().reset();
  }, [p.events, p.live, setProgress]);

  // bersihkan pool saat lokasi berganti
  useEffect(() => {
    const grup = grupRef.current;
    return () => {
      for (const n of pool.current) grup?.remove(n.a.g);
      pool.current = [];
    };
  }, [world]);

  const pop = (n: Npc, b: { teks: string; jenis: Bubble['jenis'] } | null) => {
    if (!b) return;
    const id = ++bubbleId.current;
    const q = n.a.g.position;
    setBubbles((bs) => [...bs.slice(-8), { id, pos: [q.x, q.y + 2.1, q.z], ...b }]);
    setTimeout(() => setBubbles((bs) => bs.filter((x) => x.id !== id)), 1800 / Math.max(1, p.speed / 1.5));
  };

  const ambilAktor = (model: string): Npc | null => {
    let n: Npc | undefined = pool.current.find((x) => x.state === 'off' && x.a.model === model);
    if (!n && pool.current.length < MAX_AKTOR) {
      const a = buatAktor(models[model], model);
      a.g.visible = false;
      grupRef.current?.add(a.g);
      n = { a, state: 'off', path: [], ev: null, s: 0, lane: (Math.random() - 0.5) * 0.6, t: 0, keluhanDone: false, watchD: Infinity, watchT: 0 };
      pool.current.push(n);
    }
    if (!n) n = pool.current.find((x) => x.state === 'off'); // pakai model lain bila pool penuh
    return n ?? null;
  };

  const keluar = (n: Npc, dari: Vector3[]) => {
    const g = graf;
    const start = dari.length ? dari[dari.length - 1] : n.a.g.position;
    const ex = rnd(g.ENTRIES);
    n.path = [...dari, ...lajur(g.route(g.nearest(start), ex), n.lane)];
    n.state = 'pergi';
  };

  const spawn = (seg: SegmentId, ev: CustomerEvent | null) => {
    const g = graf;
    const pembeli = !!ev && ev.tipe !== 'lewat';
    const lewatAktif = pool.current.filter((x) => x.state === 'lewat').length;
    if (!pembeli && lewatAktif >= (PEJALAN_SERENTAK[p.lokasi] ?? 5) && !ev?.keluhan) return;
    // antrean visual penuh: transaksi tetap dihitung agar angka sama dengan hasil simulasi
    if (pembeli && ev!.tipe !== 'kabur' && queue.current.length + datang.current + (server.current ? 1 : 0) >= g.QP.length + 1) {
      useLive.getState().catat(ev!.tipe);
      return;
    }
    const pilihan = (pembeli || ev ? PEMBELI[p.lokasi]?.[seg] : null) ?? MODEL_LEWAT[p.lokasi] ?? ['ibu'];
    const n = ambilAktor(rnd(pilihan));
    if (!n) {
      if (ev && pembeli) useLive.getState().catat(ev.tipe);
      return;
    }
    const e = rnd(g.ENTRIES);
    n.a.g.position.copy(g.WP[e].p);
    n.a.g.visible = true;
    n.ev = ev;
    n.keluhanDone = false;
    n.watchD = Infinity;
    n.watchT = 0;
    if (pembeli) {
      n.state = 'menuju';
      datang.current++;
      n.path = [...lajur(g.route(e, 'WP_N_antre'), n.lane), g.QP[g.QP.length - 1]];
      targetAntre.current = Math.min(g.QP.length, ev!.antre ?? 0);
    } else {
      let x = e;
      while (x === e && g.ENTRIES.length > 1) x = rnd(g.ENTRIES);
      n.state = 'lewat';
      n.path = lajur(g.route(e, x), n.lane);
    }
    mainkan(n.a, 'Walk');
  };

  // ===== REL ANTREAN =====
  // Antrean = satu garis (polyline slot Q_0..Q_n). Posisi tiap pengantre hanya satu angka `s`
  // (jarak dari slot terdepan). Aturan tunggal: s >= s orang di depannya + JARAK. Yang paling depan
  // tidak punya penghalang → selalu maju. Satu dimensi = tidak mungkin menyalip / saling kunci.
  const rel = useMemo(() => {
    const pts = graf.QP;
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + pts[i].distanceTo(pts[i - 1]));
    const L = cum[cum.length - 1];
    const titik = (s: number, out: Vector3) => {
      if (s <= 0) return out.copy(pts[0]);
      if (s >= L) {
        const a = pts[pts.length - 2], b = pts[pts.length - 1];
        return out.copy(b).addScaledVector(new Vector3().subVectors(b, a).normalize(), s - L);
      }
      let i = 1;
      while (cum[i] < s) i++;
      const t0 = (s - cum[i - 1]) / (cum[i] - cum[i - 1]);
      return out.copy(pts[i - 1]).lerp(pts[i], t0);
    };
    return { cum, L, titik };
  }, [graf]);
  const JARAK = 0.8;

  const arah = useMemo(() => new Vector3(), []);
  const tmp = useMemo(() => new Vector3(), []);
  const hadapArah = (n: Npc, dx: number, dz: number, dt: number) => {
    if (Math.abs(dx) + Math.abs(dz) < 1e-5) return;
    let dy = Math.atan2(dx, dz) - n.a.g.rotation.y;
    dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    n.a.g.rotation.y += dy * Math.min(1, dt * 10);
  };
  const hadap = (n: Npc, q: Vector3, dt: number) => hadapArah(n, q.x - n.a.g.position.x, q.z - n.a.g.position.z, dt);

  /** Jalan lurus ke target (boleh tembus NPC lain). true jika sudah sampai. Dilengkapi pengaman anti-macet. */
  const langkah = (n: Npc, target: Vector3, dt: number) => {
    arah.subVectors(target, n.a.g.position).setY(0);
    const d = arah.length();
    if (d < 0.04) {
      n.watchD = Infinity;
      n.watchT = 0;
      return true;
    }
    // pengaman: bila 4 detik tidak ada kemajuan menuju target, langsung tempatkan di target
    if (d < n.watchD - 0.05) {
      n.watchD = d;
      n.watchT = 0;
    } else if ((n.watchT += dt) > 4) {
      n.a.g.position.copy(target);
      n.watchD = Infinity;
      n.watchT = 0;
      return true;
    }
    arah.normalize();
    hadapArah(n, arah.x, arah.z, dt);
    mainkan(n.a, 'Walk');
    n.a.g.position.addScaledVector(arah, Math.min(d, SPEED * dt));
    n.a.g.position.y = target.y;
    return false;
  };

  /** Gerakkan semua pengantre di rel (dipanggil sekali per sub-langkah). */
  const majukanAntrean = (dt: number) => {
    const q = queue.current;
    for (let i = 0; i < q.length; i++) {
      const n = q[i];
      const target = rel.cum[Math.min(i, rel.cum.length - 1)];
      const batas = i > 0 ? q[i - 1].s + JARAK : 0;
      const sBaru = Math.max(target, batas, n.s - SPEED * dt);
      const bergerak = sBaru < n.s - 1e-4;
      const sebelum = tmp.copy(n.a.g.position);
      const bx = sebelum.x, bz = sebelum.z;
      n.s = Math.min(n.s, sBaru);
      rel.titik(n.s, n.a.g.position);
      if (bergerak) {
        hadapArah(n, n.a.g.position.x - bx, n.a.g.position.z - bz, dt);
        mainkan(n.a, 'Walk');
      } else {
        mainkan(n.a, 'Idle');
        hadap(n, i === 0 ? graf.P('SPOT_layan') : q[i - 1].a.g.position, dt);
      }
    }
  };

  const update = (n: Npc, dt: number) => {
    const g = graf;
    switch (n.state) {
      case 'off':
      case 'antre': // digerakkan oleh majukanAntrean
        return;
      case 'lewat':
      case 'pergi': {
        if (!n.path.length) {
          n.state = 'off';
          n.a.g.visible = false;
          return;
        }
        if (langkah(n, n.path[0], dt)) n.path.shift();
        if (n.state === 'lewat' && n.ev?.keluhan && !n.keluhanDone && n.a.g.position.distanceTo(g.P('SPOT_gerobak')) < 2.2) {
          n.keluhanDone = true;
          pop(n, komentarUntuk(n.ev));
        }
        return;
      }
      case 'menuju': {
        if (n.ev?.tipe === 'kabur' && n.path.length === 1) {
          // pembeli yang batal: berhenti di mulut antrean, mengeluh, lalu pergi
          datang.current = Math.max(0, datang.current - 1);
          n.state = 'kesal';
          n.t = 0.9;
          mainkan(n.a, 'Idle');
          return;
        }
        if (n.path.length) {
          if (langkah(n, n.path[0], dt)) n.path.shift();
          return;
        }
        datang.current = Math.max(0, datang.current - 1);
        const ekor = queue.current[queue.current.length - 1];
        n.s = Math.max(rel.L, ekor ? ekor.s + JARAK : 0);
        queue.current.push(n);
        n.state = 'antre';
        return;
      }
      case 'kesal': {
        hadap(n, g.P('SPOT_gerobak'), dt);
        n.t -= dt;
        if (n.t <= 0) {
          pop(n, n.ev ? komentarUntuk(n.ev) : { teks: 'Kelamaan!', jenis: 'kesal' });
          useLive.getState().catat('kabur');
          keluar(n, []);
        }
        return;
      }
      case 'keLayan': {
        n.t += dt;
        if (langkah(n, g.P('SPOT_layan'), dt) || n.t > 3) {
          n.a.g.position.copy(g.P('SPOT_layan'));
          mainkan(n.a, 'Idle');
          n.state = 'dilayani';
          n.t = 0;
          mainkan(seller, 'Serve');
        }
        return;
      }
      case 'dilayani': {
        hadap(n, g.P('SPOT_gerobak'), dt);
        n.t += dt;
        const lebih = queue.current.length + 1 - targetAntre.current;
        const durasiLayan = progress.current >= 1 ? 0.5 : lebih > 2 ? 0.6 : lebih > 0 ? 1.0 : lebih < 0 ? 2.2 : 1.6;
        if (n.t >= durasiLayan) {
          if (n.ev) useLive.getState().catat(n.ev.tipe);
          pop(n, n.ev ? komentarUntuk(n.ev) : null);
          server.current = null;
          mainkan(seller, 'Idle');
          keluar(n, [g.P('N_selesai')]);
        }
        return;
      }
    }
  };

  /** Pembeli terdepan yang sudah tiba di slot pertama dipanggil ke gerobak (keluar dari rel). */
  const dispatch = () => {
    const s = server.current;
    if (s && s.state !== 'keLayan' && s.state !== 'dilayani') server.current = null;
    if (server.current) return;
    const f = queue.current[0];
    if (f && f.s <= 0.05) {
      queue.current.shift();
      server.current = f;
      f.state = 'keLayan';
      f.t = 0;
      f.watchD = Infinity;
      f.watchT = 0;
    }
  };

  useFrame(({ clock }, raw) => {
    const delta = Math.min(raw, 0.1) * (p.live ? p.speed : 1);
    if (water) water.position.y = waterY + Math.sin(clock.elapsedTime * 1.3) * 0.025;

    if (p.live && p.events) {
      progress.current = Math.min(1, progress.current + delta / p.durasi);
      while (idx.current < visual.length && visual[idx.current].t <= progress.current) {
        const ev = visual[idx.current++];
        spawn(ev.seg, ev);
      }
      const now = performance.now();
      if (now - lastPush.current > 120 || progress.current >= 1) {
        lastPush.current = now;
        setProgress(progress.current);
        useLive.setState({ antre: queue.current.length + (server.current ? 1 : 0) });
      }
      const masihMenuju = pool.current.some((n) => n.state === 'menuju' || n.state === 'kesal');
      if (progress.current >= 1) lewatTutup.current += Math.min(raw, 0.1);
      const macet = progress.current >= 1 && lewatTutup.current > 12;
      if (progress.current >= 1 && !selesai.current && ((queue.current.length === 0 && !server.current && !masihMenuju) || macet)) {
        if (macet) {
          // sisa pembeli tetap dihitung sesuai hasil simulasi, lalu hari ditutup
          for (const n of pool.current) {
            if (n.ev && (n.state === 'antre' || n.state === 'keLayan' || n.state === 'dilayani' || n.state === 'menuju')) useLive.getState().catat(n.ev.tipe);
            else if (n.ev && n.state === 'kesal') useLive.getState().catat('kabur');
            n.state = 'off';
            n.a.g.visible = false;
          }
          queue.current = [];
          server.current = null;
        }
        selesai.current = true;
        setTimeout(() => p.onSelesai?.(), 700);
      }
    } else {
      ambient.current -= delta;
      if (ambient.current <= 0) {
        const [a, b] = JEDA_AMBIENT[p.lokasi] ?? [2, 2];
        ambient.current = a + Math.random() * b;
        const segs = Object.keys(LOKASI[p.lokasi].segmen) as SegmentId[];
        spawn(rnd(segs), null);
      }
    }

    const sub = Math.max(1, Math.ceil(delta / 0.05));
    for (let k = 0; k < sub; k++) {
      for (const n of pool.current) update(n, delta / sub);
      majukanAntrean(delta / sub);
      dispatch();
    }
    for (const n of pool.current) if (n.state !== 'off') n.a.mixer.update(delta);
    for (const a of diam) a.mixer.update(delta);
    seller.mixer.update(delta);
  });

  const cartPos = graf.P('SPOT_gerobak');
  return (
    <group>
      <primitive object={world} />
      <group position={cartPos} rotation={[0, Math.PI / 2, 0]}>
        <primitive object={cart} />
        <mesh position={[0, 0.72, 0.356]}>
          <planeGeometry args={[1.0, 0.28]} />
          <meshStandardMaterial map={papan} roughness={0.6} />
        </mesh>
      </group>
      <primitive object={sellers.L.g} visible={p.penjual !== 'P'} />
      <primitive object={sellers.P.g} visible={p.penjual === 'P'} />
      {diam.map((a, i) => (
        <primitive key={i} object={a.g} />
      ))}
      <group ref={grupRef as never} />
      {bubbles.map((b) => (
        <Html key={b.id} position={b.pos} center zIndexRange={[20, 10]} pointerEvents="none">
          <div className={`bubble ${b.jenis}`}>{b.teks}</div>
        </Html>
      ))}
    </group>
  );
}

