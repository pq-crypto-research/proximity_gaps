import { distance, evaluate, mod } from './math';

export const RLC_Q = 17;
export const RLC_DOMAIN = [1, 2, 4, 8, 16, 15, 13, 9] as const;

export type LinearCombinationSettings = {
  f: number[];
  g: number[];
  alpha: number;
};

export const DEFAULT_LINEAR_COMBINATION: LinearCombinationSettings = {
  f: [1, 2, 4, 8, 1, 15, 13, 9],
  g: [0, 0, 0, 0, 5, 0, 0, 0],
  alpha: 3,
};

export function linearCombination(f: readonly number[], g: readonly number[], alpha: number) {
  return f.map((value, index) => mod(value + alpha * g[index], RLC_Q));
}

/** Recover the only possible degree < 2 polynomial from x = 1 and x = 2. */
export function linearCodewordPolynomial(word: readonly number[]): number[] | null {
  if (word.length !== RLC_DOMAIN.length) return null;
  const slope = mod(word[1] - word[0], RLC_Q);
  const coefficients = [mod(word[0] - slope, RLC_Q), slope];
  return RLC_DOMAIN.every((x, i) => evaluate(coefficients, x, RLC_Q) === word[i])
    ? coefficients
    : null;
}

// This lesson's domain differs from the consecutive points used by the shared codebook.
const linearCodewords = Array.from({ length: RLC_Q ** 2 }, (_, index) => {
  const coefficients = [index % RLC_Q, Math.floor(index / RLC_Q)];
  return {
    coefficients,
    word: RLC_DOMAIN.map((x) => evaluate(coefficients, x, RLC_Q)),
  };
});

/** Exact nearest codeword, with deterministic selection when several are equally close. */
export function nearestLinearCodeword(word: readonly number[]) {
  let nearest = linearCodewords[0];
  let minimum = distance(word, nearest.word);
  let count = 1;
  for (const candidate of linearCodewords.slice(1)) {
    const errors = distance(word, candidate.word);
    if (errors < minimum) {
      nearest = candidate;
      minimum = errors;
      count = 1;
    } else if (errors === minimum) {
      count++;
    }
  }
  return { ...nearest, distance: minimum, delta: minimum / RLC_DOMAIN.length, count };
}
