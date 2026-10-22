import { encode, type Codeword } from './math';
import {
  DEFAULT_LINEAR_COMBINATION,
  linearCodewords,
  linearCombination,
  nearestLinearCodeword,
  RLC_DOMAIN,
  RLC_Q,
  type LinearCombinationSettings,
} from './linearCombination';

export function interleave(messages: readonly (readonly number[])[], n: number, q: number) {
  if (!messages.length || messages.some((row) => row.length !== messages[0].length))
    throw new RangeError('Interleaved messages must have the same number of coefficient slots.');
  const rows = messages.map((message) => encode(message, n, q));
  const columns = Array.from({ length: n }, (_, x) => rows.map((row) => row[x]));
  return { rows, columns };
}

export function columnAgreement(
  reference: readonly (readonly number[])[],
  received: readonly (readonly number[])[],
) {
  if (
    !reference.length ||
    reference.length !== received.length ||
    reference.some(
      (row, i) => row.length !== reference[0].length || row.length !== received[i].length,
    )
  )
    throw new RangeError('Compare two matrices of the same dimensions.');
  const rowSupports = reference.map((row, j) =>
    row.flatMap((value, x) => (value === received[j][x] ? [x] : [])),
  );
  const commonSupport = rowSupports[0].filter((x) =>
    rowSupports.every((support) => support.includes(x)),
  );
  return { rowSupports, commonSupport, errors: reference[0].length - commonSupport.length };
}

export const MCA_Q = RLC_Q;
export const MCA_DOMAIN = RLC_DOMAIN;
export const MCA_N = MCA_DOMAIN.length;
export const MCA_K = 2;
export const MCA_RADIUS = 2;
export const MCA_MIN_AGREEMENT = MCA_N - MCA_RADIUS;

export type McaSettings = LinearCombinationSettings;

export const MCA_PRESETS: Record<'article' | 'cancellation' | 'code', McaSettings> = {
  article: {
    f: [0, 0, 0, 0, 0, 0, 7, 14],
    g: [0, 0, 0, 0, 0, 0, 1, 1],
    alpha: 2,
  },
  cancellation: DEFAULT_LINEAR_COMBINATION,
  code: { f: [...MCA_DOMAIN], g: MCA_DOMAIN.map(() => 1), alpha: 2 },
};

export function agreementSupport(a: readonly number[], b: readonly number[]) {
  if (a.length !== b.length) throw new RangeError('Words must have the same length.');
  return a.flatMap((value, x) => (value === b[x] ? [x] : []));
}

export function explanations(
  book: readonly Codeword[],
  word: readonly number[],
  support: readonly number[],
) {
  return book.filter((c) => support.every((x) => c.word[x] === word[x]));
}

/** Exact MCA on the article's RS[F17, D, 2], with delta = 1/4.
 * Minimum distance is 7, so a radius-2 ball contains at most one codeword.
 * Its full agreement set S is sufficient: an explanation on S also explains
 * every subset of S. If no codeword is within radius 2, there is no qualifying S.
 * We search all codewords for input explanations, not just the displayed nearest pair.
 */
export function analyzeMca(f: readonly number[], g: readonly number[]) {
  if (
    [f, g].some(
      (word) =>
        word.length !== MCA_N || word.some((a) => !Number.isInteger(a) || a < 0 || a >= MCA_Q),
    )
  )
    throw new RangeError('Use two eight-entry vectors over F₁₇.');
  const book = linearCodewords;
  const nearestInputs = [nearestLinearCodeword(f), nearestLinearCodeword(g)] as const;
  const challenges = Array.from({ length: MCA_Q }, (_, alpha) => {
    const word = linearCombination(f, g, alpha);
    const nearest = nearestLinearCodeword(word);
    const support = agreementSupport(word, nearest.word);
    const qualifies = nearest.distance <= MCA_RADIUS;
    const inputExplanations = [
      explanations(book, f, support),
      explanations(book, g, support),
    ] as const;
    return {
      alpha,
      word,
      nearest,
      support,
      qualifies,
      explanations: inputExplanations,
      bad: qualifies && inputExplanations.some((items) => items.length === 0),
    };
  });
  return {
    book,
    nearestInputs,
    challenges,
    nearCount: challenges.filter((challenge) => challenge.qualifies).length,
    badCount: challenges.filter((challenge) => challenge.bad).length,
  };
}
