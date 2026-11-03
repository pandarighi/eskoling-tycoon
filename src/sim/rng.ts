/** RNG ber-seed (mulberry32) agar satu hari bisa diputar ulang untuk debugging & balancing. */
export function createRng(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    range: (min: number, max: number) => min + (max - min) * next(),
    int: (min: number, max: number) => Math.floor(min + (max - min + 1) * next()),
    pick<T extends string>(weights: Partial<Record<T, number>>): T {
      const entries = Object.entries(weights) as [T, number][];
      const total = entries.reduce((s, [, w]) => s + w, 0);
      let r = next() * total;
      for (const [k, w] of entries) {
        r -= w;
        if (r <= 0) return k;
      }
      return entries[entries.length - 1][0];
    },
  };
}

export type Rng = ReturnType<typeof createRng>;

/** Seed turunan per hari agar hari ke-N selalu sama untuk seed game yang sama. */
export const daySeed = (seed: number, hari: number) => (seed * 2654435761 + hari * 40503) >>> 0;
