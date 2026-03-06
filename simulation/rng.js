// Seeded pseudo-random number generator (mulberry32)
// Allows deterministic battle replays when given the same seed

export function createRNG(seed) {
  let state = seed | 0;

  function next() {
    state |= 0;
    state = (state + 0x6D2B79F5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  return {
    // Returns float in [0, 1)
    random: next,
    // Returns integer in [min, max] inclusive
    int(min, max) {
      return Math.floor(next() * (max - min + 1)) + min;
    },
    // Pick random element from array
    pick(arr) {
      return arr[Math.floor(next() * arr.length)];
    },
    seed
  };
}
