import { encode, SUPPORTED_FIELDS } from '../core/math';
import { MCA_PRESETS, type McaSettings } from '../core/agreement';
import { RLC_DOMAIN, RLC_Q, type LinearCombinationSettings } from '../core/linearCombination';

export const LESSON_IDS = [
  'tape-polynomial',
  'evaluation-codeword',
  'hamming-distance',
  'hamming-ball',
  'decoding-radius',
  'interleaved-rs',
  'random-linear-combination',
  'mutual-correlated-agreement',
  'codes-to-proofs',
] as const;
export type LessonId = (typeof LESSON_IDS)[number];

export type ProofSettings = {
  stage: number;
  extension: number;
  alpha: number;
  query: number;
  tamper: boolean;
};

export const DEFAULT_PROOF: ProofSettings = {
  stage: 0,
  extension: 2,
  alpha: 3,
  query: 0,
  tamper: false,
};

export type Experiment = {
  q: number;
  coefficients: number[];
  n: number;
  received: number[];
  radius: number;
  linked: boolean;
  seed: number;
  pattern: 'ambiguity' | 'seeded';
  distanceRadius: number;
  ballCenter: number;
  ballRadius: number;
  selectedBinary: number;
  repetition: boolean;
  showZero: boolean;
  proof?: ProofSettings;
  interleaving?: {
    messages: number[][];
    errors: number[][];
    column: number;
    corrupt: boolean;
  };
  mca?: McaSettings;
  linearCombination?: LinearCombinationSettings;
};

export function defaultExperiment(q = 17): Experiment {
  const coefficients = [3, 2, 1];
  const n = Math.min(8, q);
  return {
    q,
    coefficients,
    n,
    received: encode(coefficients, n, q),
    radius: 0,
    linked: true,
    seed: 1,
    pattern: 'ambiguity',
    distanceRadius: 2,
    ballCenter: 0,
    ballRadius: 2,
    selectedBinary: 3,
    repetition: false,
    showZero: false,
  };
}

function integer(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
}

export function validExperiment(value: unknown): value is Experiment {
  if (!value || typeof value !== 'object') return false;
  const s = value as Record<string, unknown>;
  if (!SUPPORTED_FIELDS.includes(s.q as 5 | 7 | 17)) return false;
  const q = s.q as number;
  if (s.linearCombination !== undefined) {
    if (!s.linearCombination || typeof s.linearCombination !== 'object') return false;
    const settings = s.linearCombination as Record<string, unknown>;
    if (
      ![settings.f, settings.g].every(
        (row) =>
          Array.isArray(row) &&
          row.length === RLC_DOMAIN.length &&
          row.every((a) => integer(a, 0, RLC_Q - 1)),
      ) ||
      !integer(settings.alpha, 0, RLC_Q - 1)
    )
      return false;
  }
  if (s.interleaving !== undefined) {
    if (!s.interleaving || typeof s.interleaving !== 'object') return false;
    const interleaving = s.interleaving as Record<string, unknown>;
    if (
      !Array.isArray(interleaving.messages) ||
      !integer(interleaving.messages.length, 1, 3) ||
      !interleaving.messages.every(
        (row) =>
          Array.isArray(row) &&
          integer(row.length, 1, 17) &&
          row.every((a) => integer(a, 0, q - 1)),
      ) ||
      !Array.isArray(interleaving.errors) ||
      interleaving.errors.length !== interleaving.messages.length + 1 ||
      !interleaving.errors.every(
        (row) =>
          Array.isArray(row) &&
          row.length <= 17 &&
          new Set(row).size === row.length &&
          row.every((x) => integer(x, 0, 16)),
      ) ||
      !integer(interleaving.column, 0, 16) ||
      typeof interleaving.corrupt !== 'boolean'
    )
      return false;
  }
  if (s.mca !== undefined) {
    if (!s.mca || typeof s.mca !== 'object') return false;
    const mca = s.mca as Record<string, unknown>;
    if (
      ![mca.f, mca.g].every(
        (row) =>
          Array.isArray(row) &&
          row.length === RLC_DOMAIN.length &&
          row.every((a) => integer(a, 0, RLC_Q - 1)),
      ) ||
      !integer(mca.alpha, 0, RLC_Q - 1)
    )
      return false;
  }
  if (s.proof !== undefined) {
    if (!s.proof || typeof s.proof !== 'object') return false;
    const proof = s.proof as Record<string, unknown>;
    if (
      !integer(proof.stage, 0, 3) ||
      ![2, 4, 8, 16].includes(proof.extension as number) ||
      !integer(proof.alpha, 0, q - 1) ||
      !integer(proof.query, 0, 7) ||
      typeof proof.tamper !== 'boolean'
    )
      return false;
  }
  if (
    !Array.isArray(s.coefficients) ||
    !integer(s.coefficients.length, 1, q) ||
    !s.coefficients.every((a) => integer(a, 0, q - 1)) ||
    !integer(s.n, s.coefficients.length, q)
  )
    return false;
  return (
    Array.isArray(s.received) &&
    s.received.length === s.n &&
    s.received.every((a) => integer(a, 0, q - 1)) &&
    integer(s.radius, 0, s.n) &&
    integer(s.distanceRadius, 0, s.n) &&
    integer(s.seed, 1, 0xffffffff) &&
    ['ambiguity', 'seeded'].includes(s.pattern as string) &&
    integer(s.ballCenter, 0, 31) &&
    integer(s.ballRadius, 0, 5) &&
    integer(s.selectedBinary, 0, 31) &&
    typeof s.linked === 'boolean' &&
    typeof s.repetition === 'boolean' &&
    typeof s.showZero === 'boolean'
  );
}

export function experimentUrl(lesson: LessonId, experiment: Experiment): string {
  const query = new URLSearchParams({ s: JSON.stringify({ v: 1, ...experiment }) });
  return `/visuals/${lesson}?${query}`;
}

export function readLocation(
  pathname: string,
  search: string,
): { lesson: LessonId; experiment: Experiment; notice: string } {
  const slug = pathname.split('/').filter(Boolean).at(-1);
  const known = LESSON_IDS.includes(slug as LessonId);
  const lesson = known ? (slug as LessonId) : LESSON_IDS[0];
  const raw = new URLSearchParams(search).get('s');
  let notice =
    !known && pathname !== '/'
      ? 'That lesson was not found. Starting with the first experiment.'
      : '';
  if (raw) {
    try {
      if (raw.length > 10_000) throw new Error('Oversized state');
      const parsed: unknown = JSON.parse(raw);
      // Old links used a different F₅ toy model. Preserve the other lessons' settings,
      // but explicitly load the new article example instead of reinterpreting those vectors.
      if (parsed && typeof parsed === 'object' && 'mca' in parsed) {
        const old = parsed.mca as Record<string, unknown> | null;
        if (
          old &&
          [old.u0, old.u1].every(
            (row) => Array.isArray(row) && row.length === 5 && row.every((a) => integer(a, 0, 4)),
          ) &&
          integer(old.radius, 0, 5) &&
          integer(old.gamma, 0, 4) &&
          integer(old.codeword, 0, 24)
        ) {
          parsed.mca = MCA_PRESETS.article;
          if (lesson === 'mutual-correlated-agreement')
            notice = 'MCA now uses the article’s F₁₇ example. Loaded its starting vectors.';
        }
      }
      if (!validExperiment(parsed) || (parsed as Experiment & { v?: number }).v !== 1)
        throw new Error('Unsupported state');
      return { lesson, experiment: parsed, notice };
    } catch {
      notice =
        'This experiment link has unsupported settings. The default example has been loaded.';
    }
  }
  return { lesson, experiment: defaultExperiment(), notice };
}
