import { describe, expect, it } from 'vitest';
import {
  analyzePrize,
  bruteForcePrizeWorstCase,
  DEFAULT_PRIZE,
  PRIZE_DOMAIN,
  prizeCodewords,
  prizePairProfile,
} from '../src/core/proximityPrize';
import {
  defaultExperiment,
  experimentUrl,
  readLocation,
  validExperiment,
} from '../src/state/model';

function directFailure(f: number[], g: number[], alpha: number, radius: number) {
  const h = f.map((v, i) => (v + alpha * g[i]) % 5);
  // Independent definition: try every subset, and check that the restricted
  // vectors are constant (exactly membership in this k=1 RS code).
  for (let mask = 0; mask < 16; mask++) {
    const s = [0, 1, 2, 3].filter((i) => mask & (1 << i));
    const constant = (v: number[]) => s.every((i) => v[i] === v[s[0]]);
    if (s.length >= 4 - radius && constant(h) && (!constant(f) || !constant(g))) return true;
  }
  return false;
}

describe('tiny smooth-domain Proximity Prize', () => {
  it('uses a power-of-two multiplicative subgroup and its five constant codewords', () => {
    expect(Array.from({ length: 4 }, (_, i) => 2 ** i % 5)).toEqual(PRIZE_DOMAIN);
    expect(2 ** 4 % 5).toBe(1);
    expect(prizeCodewords.map((c) => c.word)).toEqual([0, 1, 2, 3, 4].map((v) => [v, v, v, v]));
  });
  it('enumerates every pair and supplies witnesses for the exact worst-case profile', () => {
    const result = bruteForcePrizeWorstCase();
    expect(result.pairsChecked).toBe(390625);
    expect(result.counts).toEqual([1, 2, 5, 5, 5]);
    result.witnesses.forEach(({ f, g }, radius) => {
      const direct = [0, 1, 2, 3, 4].filter((a) => directFailure(f, g, a, radius));
      expect(direct.length).toBe(result.counts[radius]);
      expect(analyzePrize(f, g, radius).badCount).toBe(direct.length);
    });
    expect(prizePairProfile(DEFAULT_PRIZE.f, DEFAULT_PRIZE.g)).toEqual([0, 2, 3, 3, 3]);
  });
  it('agrees with all-subset checks for every pair modulo constant shifts', () => {
    // Adding separate constant codewords to f and g does not change any
    // support-wise explanation or failure. These cover all 625² pairs.
    const representatives = Array.from({ length: 125 }, (_, id) => [
      0,
      id % 5,
      Math.floor(id / 5) % 5,
      Math.floor(id / 25) % 5,
    ]);
    const worst = [0, 0, 0, 0, 0];
    for (const f of representatives)
      for (const g of representatives) {
        const profile = prizePairProfile(f, g);
        for (let r = 0; r <= 4; r++) {
          const direct = [0, 1, 2, 3, 4].filter((a) => directFailure(f, g, a, r)).length;
          expect(profile[r]).toBe(direct);
          worst[r] = Math.max(worst[r], direct);
        }
      }
    expect(worst).toEqual(bruteForcePrizeWorstCase().counts);
  });
  it('finds a failing codeword even when another equally nearest codeword succeeds', () => {
    const result = analyzePrize([0, 0, 0, 1], [0, 0, 1, 0], 2).challenges[1];
    expect(result.candidates[0]).toMatchObject({ c: { coefficients: [0] }, bad: false });
    expect(result).toMatchObject({
      bad: true,
      c: { coefficients: [1] },
      support: [2, 3],
      qualifyingCount: 2,
    });
    expect(result.inputs.some((u) => u.supportErrors > 0)).toBe(true);
  });
  it('keeps exact membership, missing proximity, and success distinct at the endpoints', () => {
    const { f, g } = DEFAULT_PRIZE;
    expect(analyzePrize(f, g, 0).challenges.every((c) => !c.qualifies && !c.bad)).toBe(true);
    for (let radius = 0; radius <= 4; radius++) {
      const valid = analyzePrize([1, 1, 1, 1], [2, 2, 2, 2], radius);
      expect(valid.badCount).toBe(0);
      expect(valid.challenges.every((c) => c.qualifies)).toBe(true);
    }
    expect(() => analyzePrize([0], g, 1)).toThrow(RangeError);
    expect(() => analyzePrize([5, 0, 0, 0], g, 1)).toThrow(RangeError);
    expect(() => analyzePrize(f, g, 1.5)).toThrow(RangeError);
  });
  it('shares prize settings independently of the other experiments', () => {
    const e = { ...defaultExperiment(), prize: { ...DEFAULT_PRIZE, radius: 3, alpha: 4 } };
    const url = new URL(experimentUrl('proximity-prize', e), 'https://example.test');
    expect(readLocation(url.pathname, url.search)).toMatchObject({
      lesson: 'proximity-prize',
      experiment: e,
      notice: '',
    });
    for (const prize of [
      null,
      { ...e.prize, f: [0] },
      { ...e.prize, g: [0, 0, 0, 5] },
      { ...e.prize, alpha: 5 },
      { ...e.prize, radius: 5 },
      { ...e.prize, radius: -1 },
    ])
      expect(validExperiment({ ...e, prize })).toBe(false);
  });
});
