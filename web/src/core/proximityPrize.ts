import { distance, mod } from './math';

export const PRIZE_Q = 5;
export const PRIZE_DOMAIN = [1, 2, 4, 3] as const;
export const PRIZE_N = PRIZE_DOMAIN.length;
export const PRIZE_K = 1;
export const PRIZE_TARGET_COUNT = 2;
export type PrizeSettings = {
  f: number[];
  g: number[];
  alpha: number;
  radius: number;
  followWorst?: boolean;
};
export const DEFAULT_PRIZE: PrizeSettings = {
  f: [0, 1, 0, 0],
  g: [0, 2, 1, 0],
  alpha: 2,
  radius: 1,
  followWorst: true,
};
export const prizeCodewords = Array.from({ length: PRIZE_Q }, (_, c) => ({
  coefficients: [c],
  word: Array<number>(PRIZE_N).fill(c),
}));
const words = Array.from({ length: PRIZE_Q ** PRIZE_N }, (_, id) =>
  PRIZE_DOMAIN.map((_, i) => Math.floor(id / PRIZE_Q ** i) % PRIZE_Q),
);
const wordId = (word: readonly number[]) => word.reduce((id, v, i) => id + v * PRIZE_Q ** i, 0);
const maskSize = Array.from(
  { length: 1 << PRIZE_N },
  (_, mask) => PRIZE_DOMAIN.filter((_, i) => mask & (1 << i)).length,
);
const supportMasks = words.map((word) =>
  prizeCodewords.map((c) => word.reduce((mask, v, i) => mask | (v === c.word[i] ? 1 << i : 0), 0)),
);
// Bit s is set exactly when some codeword agrees with this word on support mask s.
const fittingSupports = words.map((_, id) =>
  maskSize.reduce(
    (bits, _, s) => bits | (supportMasks[id].some((mask) => (mask & s) === s) ? 1 << s : 0),
    0,
  ),
);

function validateWord(word: readonly number[]) {
  if (word.length !== PRIZE_N || word.some((v) => !Number.isInteger(v) || v < 0 || v >= PRIZE_Q))
    throw new RangeError('Use four field elements in F₅.');
}

function rankedCodewords(word: readonly number[], support: readonly number[]) {
  return prizeCodewords
    .map((c) => ({
      ...c,
      distance: distance(word, c.word),
      supportErrors: support.filter((i) => word[i] !== c.word[i]).length,
    }))
    .sort((a, b) => a.supportErrors - b.supportErrors || a.distance - b.distance);
}

/** Every codeword's full agreement set is checked. Checking just a nearest c
 * is insufficient once multiple codewords qualify. Full sets also cover all
 * their subsets: an explanation on a full set explains every subset of it.
 */
export function analyzePrize(f: readonly number[], g: readonly number[], radius: number) {
  validateWord(f);
  validateWord(g);
  if (!Number.isInteger(radius) || radius < 0 || radius > PRIZE_N)
    throw new RangeError('Use an integer radius from 0 to 4.');
  const indices = PRIZE_DOMAIN.map((_, i) => i);
  const nearestInputs = [rankedCodewords(f, indices)[0], rankedCodewords(g, indices)[0]] as const;
  const challenges = Array.from({ length: PRIZE_Q }, (_, alpha) => {
    const word = f.map((v, i) => mod(v + alpha * g[i], PRIZE_Q));
    const candidates = prizeCodewords
      .map((c, codewordIndex) => {
        const support = indices.filter((i) => c.word[i] === word[i]);
        const inputs = [rankedCodewords(f, support)[0], rankedCodewords(g, support)[0]] as const;
        return {
          c: { ...c, distance: PRIZE_N - support.length },
          codewordIndex,
          support,
          inputs,
          qualifies: support.length >= PRIZE_N - radius,
          bad: support.length >= PRIZE_N - radius && inputs.some((u) => u.supportErrors > 0),
        };
      })
      .sort((a, b) => a.c.distance - b.c.distance || a.codewordIndex - b.codewordIndex);
    const nearest = candidates[0].c;
    // Display a failing witness if there is one, even if a closer c succeeds.
    const selected = candidates.find((c) => c.bad) ?? candidates[0];
    return {
      alpha,
      word,
      nearest,
      candidates,
      ...selected,
      qualifyingCount: candidates.filter((c) => c.qualifies).length,
    };
  });
  return { nearestInputs, challenges, badCount: challenges.filter((c) => c.bad).length };
}

export type PrizeWorstCase = {
  counts: number[];
  witnesses: { f: number[]; g: number[] }[];
  pairsChecked: number;
};
let worstCache: PrizeWorstCase | undefined;
/** Exhaustively enumerate ALL 625² pairs, all 5 alphas, and all 5 codewords.
 * Precomputed support-fit tables avoid repeating the same tiny searches.
 * No sampling, symmetry assumptions, or hard-coded probability values.
 */
export function bruteForcePrizeWorstCase(): PrizeWorstCase {
  if (worstCache) return worstCache;
  const counts = Array<number>(PRIZE_N + 1).fill(0);
  const witnesses = counts.map(() => ({ f: [...words[0]], g: [...words[0]] }));
  for (let fi = 0; fi < words.length; fi++) {
    for (let gi = 0; gi < words.length; gi++) {
      const failures = Array<number>(PRIZE_N + 1).fill(0);
      const unexplainable = ~(fittingSupports[fi] & fittingSupports[gi]);
      for (let alpha = 0; alpha < PRIZE_Q; alpha++) {
        let hi = 0;
        for (let i = 0; i < PRIZE_N; i++)
          hi += ((words[fi][i] + alpha * words[gi][i]) % PRIZE_Q) * PRIZE_Q ** i;
        let firstFailure = PRIZE_N + 1;
        for (const support of supportMasks[hi])
          if (unexplainable & (1 << support))
            firstFailure = Math.min(firstFailure, PRIZE_N - maskSize[support]);
        for (let radius = firstFailure; radius <= PRIZE_N; radius++) failures[radius]++;
      }
      failures.forEach((value, radius) => {
        if (value > counts[radius]) {
          counts[radius] = value;
          witnesses[radius] = { f: [...words[fi]], g: [...words[gi]] };
        }
      });
    }
  }
  worstCache = { counts, witnesses, pairsChecked: words.length ** 2 };
  return worstCache;
}

export function prizePairProfile(f: readonly number[], g: readonly number[]) {
  validateWord(f);
  validateWord(g);
  const counts = Array<number>(PRIZE_N + 1).fill(0);
  const unexplainable = ~(fittingSupports[wordId(f)] & fittingSupports[wordId(g)]);
  for (let alpha = 0; alpha < PRIZE_Q; alpha++) {
    const h = f.map((v, i) => mod(v + alpha * g[i], PRIZE_Q));
    let firstFailure = PRIZE_N + 1;
    for (const s of supportMasks[wordId(h)])
      if (unexplainable & (1 << s)) firstFailure = Math.min(firstFailure, PRIZE_N - maskSize[s]);
    for (let radius = firstFailure; radius <= PRIZE_N; radius++) counts[radius]++;
  }
  return counts;
}
