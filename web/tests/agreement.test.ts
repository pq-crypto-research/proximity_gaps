import { describe, expect, it } from 'vitest';
import {
  analyzeMca,
  columnAgreement,
  interleave,
  MCA_PRESETS,
  MCA_DOMAIN,
  MCA_MIN_AGREEMENT,
} from '../src/core/agreement';
import { mod } from '../src/core/math';
import {
  defaultExperiment,
  experimentUrl,
  readLocation,
  validExperiment,
} from '../src/state/model';

describe('interleaved column metric', () => {
  it('encodes independent rows and counts unequal columns once', () => {
    const { rows, columns } = interleave(
      [
        [1, 1],
        [2, 0],
        [0, 2],
      ],
      5,
      5,
    );
    expect(rows).toEqual([
      [1, 2, 3, 4, 0],
      [2, 2, 2, 2, 2],
      [0, 2, 4, 1, 3],
    ]);
    expect(columns[2]).toEqual([3, 2, 4]);
    const same = rows.map((row) => row.map((a, x) => (x === 0 ? mod(a + 1, 5) : a)));
    const different = rows.map((row, j) => row.map((a, x) => (x === j ? mod(a + 1, 5) : a)));
    expect(columnAgreement(rows, same)).toMatchObject({ errors: 1, commonSupport: [1, 2, 3, 4] });
    expect(columnAgreement(rows, different)).toMatchObject({ errors: 3, commonSupport: [3, 4] });
    expect(columnAgreement(rows, different).rowSupports.map((s) => s.length)).toEqual([4, 4, 4]);
  });
  it('requires aligned message lengths and matrix dimensions', () => {
    expect(() => interleave([[1], [1, 2]], 5, 5)).toThrow(RangeError);
    expect(() => columnAgreement([[1]], [[1, 2]])).toThrow(RangeError);
  });
});

describe('MCA example over F17', () => {
  it('has exactly two failures, at alpha 3 and 10, with different agreement sets', () => {
    const { f, g } = MCA_PRESETS.article;
    const result = analyzeMca(f, g);
    expect(result.book).toHaveLength(289);
    expect(result).toMatchObject({ nearCount: 17, badCount: 2 });
    expect(result.challenges.filter((c) => c.bad).map((c) => c.alpha)).toEqual([3, 10]);
    expect(result.challenges[1]).toMatchObject({
      word: [0, 0, 0, 0, 0, 0, 8, 15],
      support: [0, 1, 2, 3, 4, 5],
      bad: false,
    });
    expect(result.challenges[10]).toMatchObject({
      word: [0, 0, 0, 0, 0, 0, 0, 7],
      support: [0, 1, 2, 3, 4, 5, 6],
      bad: true,
      explanations: [[], []],
    });
    expect(result.challenges[3]).toMatchObject({
      word: [0, 0, 0, 0, 0, 0, 10, 0],
      support: [0, 1, 2, 3, 4, 5, 7],
      bad: true,
      explanations: [[], []],
    });
    for (const c of result.challenges) {
      expect(c.nearest.coefficients).toEqual([0, 0]);
      expect(c.nearest.count).toBe(1);
      expect(c.nearest.distance).toBe(c.bad ? 1 : 2);
    }
  });

  it('handles valid inputs, perfect cancellation, and no qualifying agreement separately', () => {
    const good = analyzeMca(MCA_PRESETS.code.f, MCA_PRESETS.code.g);
    expect(good).toMatchObject({ nearCount: 17, badCount: 0 });
    expect(good.challenges.every((c) => c.nearest.distance === 0 && c.support.length === 8)).toBe(
      true,
    );
    const cancelled = analyzeMca(MCA_PRESETS.cancellation.f, MCA_PRESETS.cancellation.g);
    expect(cancelled.badCount).toBe(1);
    expect(cancelled.challenges[3]).toMatchObject({
      bad: true,
      nearest: { distance: 0 },
      support: [0, 1, 2, 3, 4, 5, 6, 7],
    });
    const far = analyzeMca(
      MCA_DOMAIN.map((x) => mod(x * x, 17)),
      Array(8).fill(0),
    );
    expect(far).toMatchObject({ nearCount: 0, badCount: 0 });
    expect(
      far.challenges.every(
        (c) => !c.qualifies && c.nearest.distance === 6 && c.nearest.count === 28,
      ),
    ).toBe(true);
  });

  it('matches an independent exhaustive check of every sufficiently large subset', () => {
    const domain = [1, 2, 4, 8, 16, 15, 13, 9];
    const book = Array.from({ length: 289 }, (_, i) =>
      domain.map((x) => ((i % 17) + Math.floor(i / 17) * x) % 17),
    );
    const supports = Array.from({ length: 256 }, (_, mask) =>
      domain.flatMap((_, i) => (mask & (1 << i) ? [i] : [])),
    ).filter((s) => s.length >= MCA_MIN_AGREEMENT);
    const fits = (word: number[], support: number[]) =>
      book.some((c) => support.every((i) => word[i] === c[i]));
    const examples = [
      ...Object.values(MCA_PRESETS),
      { f: [0, 0, 0, 0, 0, 0, 0, 0], g: MCA_PRESETS.article.g },
      { f: [1, 4, 16, 13, 1, 4, 16, 13], g: Array(8).fill(0) },
      { f: [1, 4, 0, 8, 12, 5, 3, 2], g: [5, 6, 8, 15, 2, 0, 1, 4] },
    ];
    for (const { f, g } of examples) {
      const result = analyzeMca(f, g);
      for (const challenge of result.challenges) {
        const h = f.map((a, i) => (a + challenge.alpha * g[i]) % 17);
        const qualifying = supports.filter((s) => fits(h, s));
        expect(challenge.qualifies).toBe(qualifying.length > 0);
        expect(challenge.bad).toBe(qualifying.some((s) => !fits(f, s) || !fits(g, s)));
        // For this radius, any input explanation must be its unique global nearest codeword.
        if (challenge.qualifies)
          challenge.explanations.forEach((items, j) => {
            if (items.length) expect(items[0].word).toEqual(result.nearestInputs[j].word);
          });
      }
    }
  });

  it('requires eight field elements per input', () => {
    expect(() => analyzeMca([0], Array(8).fill(0))).toThrow(RangeError);
    expect(() => analyzeMca(Array(8).fill(17), Array(8).fill(0))).toThrow(RangeError);
  });
});

describe('agreement lesson links', () => {
  it('round trips both lessons and rejects invalid finite-field settings', () => {
    const e = {
      ...defaultExperiment(5),
      interleaving: {
        messages: [
          [1, 2],
          [0, 1],
        ],
        errors: [[0], [1], []],
        column: 2,
        corrupt: true,
      },
      mca: { ...MCA_PRESETS.article, alpha: 3 },
    };
    for (const id of ['interleaved-rs', 'mutual-correlated-agreement'] as const) {
      const url = new URL(experimentUrl(id, e), 'https://example.test');
      expect(readLocation(url.pathname, url.search)).toEqual({
        lesson: id,
        experiment: { v: 1, ...e },
        notice: '',
      });
    }
    for (const mca of [
      null,
      { ...e.mca, f: [0] },
      { ...e.mca, alpha: 17 },
      { ...e.mca, alpha: -1 },
      { ...e.mca, g: Array(8).fill(17) },
    ])
      expect(validExperiment({ ...e, mca })).toBe(false);
    for (const interleaving of [
      null,
      { ...e.interleaving, messages: [] },
      { ...e.interleaving, errors: [[0, 0], [], []] },
      { ...e.interleaving, errors: [[]] },
    ])
      expect(validExperiment({ ...e, interleaving })).toBe(false);
    expect(validExperiment(defaultExperiment())).toBe(true);
  });
  it('migrates old F5 links explicitly without changing other experiment settings', () => {
    const e = {
      ...defaultExperiment(7),
      mca: { u0: [3, 4, 2, 2, 1], u1: [1, 0, 2, 4, 3], radius: 1, gamma: 1, codeword: 0 },
    };
    const query = new URLSearchParams({ s: JSON.stringify({ v: 1, ...e }) });
    const result = readLocation('/visuals/mutual-correlated-agreement', `?${query}`);
    expect(result.experiment).toMatchObject({
      q: 7,
      coefficients: e.coefficients,
      mca: MCA_PRESETS.article,
    });
    expect(result.notice).toContain('F₁₇');
  });
});
