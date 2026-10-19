import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LINEAR_COMBINATION,
  linearCodewordPolynomial,
  linearCombination,
  nearestLinearCodeword,
  RLC_DOMAIN,
  RLC_Q,
} from '../src/core/linearCombination';
import { evaluate, mod } from '../src/core/math';
import {
  defaultExperiment,
  experimentUrl,
  readLocation,
  validExperiment,
} from '../src/state/model';

describe('linear combinations on the article’s RS domain', () => {
  it('recognizes every linear polynomial, including constants, and rejects a changed entry', () => {
    for (let a = 0; a < RLC_Q; a++) {
      for (let b = 0; b < RLC_Q; b++) {
        const word = RLC_DOMAIN.map((x) => evaluate([a, b], x, RLC_Q));
        expect(linearCodewordPolynomial(word)).toEqual([a, b]);
        word[4] = mod(word[4] + 1, RLC_Q);
        expect(linearCodewordPolynomial(word)).toBeNull();
      }
    }
  });

  it('reproduces the article, with alpha = 3 as the only valid combination', () => {
    const { f, g } = DEFAULT_LINEAR_COMBINATION;
    expect(linearCodewordPolynomial(f)).toBeNull();
    expect(linearCodewordPolynomial(g)).toBeNull();
    expect(linearCombination(f, g, 3)).toEqual(RLC_DOMAIN);
    for (let alpha = 0; alpha < RLC_Q; alpha++) {
      expect(linearCodewordPolynomial(linearCombination(f, g, alpha))).toEqual(
        alpha === 3 ? [0, 1] : null,
      );
    }
  });

  it('handles both the zero-probability and all-codeword cases, including wraparound', () => {
    const zero = RLC_DOMAIN.map(() => 0);
    const codeword = RLC_DOMAIN.map((x) => mod(16 + 9 * x, RLC_Q));
    for (let alpha = 0; alpha < RLC_Q; alpha++) {
      expect(
        linearCodewordPolynomial(linearCombination(DEFAULT_LINEAR_COMBINATION.f, zero, alpha)),
      ).toBeNull();
      const h = linearCombination(RLC_DOMAIN, codeword, alpha);
      expect(h).toEqual(RLC_DOMAIN.map((x) => mod(x + alpha * (16 + 9 * x), RLC_Q)));
      expect(linearCodewordPolynomial(h)).not.toBeNull();
    }
  });

  it('finds the exact nearest codeword and relative distance, including ties', () => {
    const { f, g } = DEFAULT_LINEAR_COMBINATION;
    for (let alpha = 0; alpha < RLC_Q; alpha++) {
      expect(nearestLinearCodeword(linearCombination(f, g, alpha))).toMatchObject({
        coefficients: [0, 1],
        word: RLC_DOMAIN,
        distance: alpha === 3 ? 0 : 1,
        delta: alpha === 3 ? 0 : 1 / 8,
        count: 1,
      });
    }
    const constant = RLC_DOMAIN.map(() => 7);
    constant[0] = 9;
    constant[1] = 3;
    expect(nearestLinearCodeword(constant)).toMatchObject({
      coefficients: [7, 0],
      distance: 2,
      delta: 1 / 4,
      count: 1,
    });

    // A line meets X² in at most two points. Each pair defines a different nearest line.
    const quadratic = RLC_DOMAIN.map((x) => mod(x * x, RLC_Q));
    const nearest = nearestLinearCodeword(quadratic);
    expect(nearest).toMatchObject({ distance: 6, delta: 3 / 4, count: 28 });
    expect(linearCodewordPolynomial(nearest.word)).toEqual(nearest.coefficients);
    expect(nearest.word.filter((value, i) => value !== quadratic[i])).toHaveLength(6);
  });

  it('preserves editable inputs in links and validates them independently of other lessons’ fields', () => {
    const experiment = {
      ...defaultExperiment(5),
      linearCombination: { f: [...RLC_DOMAIN], g: RLC_DOMAIN.map(() => 16), alpha: 12 },
    };
    const url = new URL(
      experimentUrl('random-linear-combination', experiment),
      'https://example.test',
    );
    expect(readLocation(url.pathname, url.search)).toMatchObject({
      lesson: 'random-linear-combination',
      experiment,
      notice: '',
    });
    for (const linearCombination of [
      null,
      { ...experiment.linearCombination, alpha: 17 },
      { ...experiment.linearCombination, alpha: -1 },
      { ...experiment.linearCombination, f: [1] },
      { ...experiment.linearCombination, g: RLC_DOMAIN.map(() => 0.5) },
      { ...experiment.linearCombination, g: RLC_DOMAIN.map(() => 17) },
    ]) {
      expect(validExperiment({ ...experiment, linearCombination })).toBe(false);
    }
  });
});
