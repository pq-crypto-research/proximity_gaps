import { describe, expect, it } from 'vitest';
import {
  DEFAULT_MESSAGE,
  messageCodeword,
  messagePolynomial,
  parseMessageSymbol,
  recoverMessage,
} from '../src/core/message';
import {
  defaultExperiment,
  experimentUrl,
  readLocation,
  validExperiment,
} from '../src/state/model';

describe('message interpolation over F257', () => {
  it('reproduces the article polynomial and systematic codeword', () => {
    expect(messagePolynomial(DEFAULT_MESSAGE.values)).toEqual([72, 239, 97, 68, 139]);
    expect(messageCodeword(DEFAULT_MESSAGE.values, 11)).toEqual([
      72, 101, 108, 108, 111, 122, 141, 163, 178, 171, 122,
    ]);
    expect(messageCodeword([0, 256, 1, 0, 256], 257).slice(0, 5)).toEqual([0, 256, 1, 0, 256]);
    expect(messagePolynomial([0, 0, 0, 0, 0])).toEqual([0, 0, 0, 0, 0]);
  });
  it('recovers Hello from every five-position subset, ignoring all missing values', () => {
    const word = messageCodeword(DEFAULT_MESSAGE.values, 11);
    let checked = 0;
    for (let a = 0; a < 7; a++)
      for (let b = a + 1; b < 8; b++)
        for (let c = b + 1; c < 9; c++)
          for (let d = c + 1; d < 10; d++)
            for (let e = d + 1; e < 11; e++) {
              const kept = [a, b, c, d, e];
              const erased = word.map((value, i) => (kept.includes(i) ? value : NaN));
              expect(recoverMessage(erased, kept)).toEqual(DEFAULT_MESSAGE.values);
              checked++;
            }
    expect(checked).toBe(462);
    expect(() => recoverMessage(word, [0, 0, 1, 2, 3])).toThrow();
    expect(() => recoverMessage(word, [0, 1, 2, 3])).toThrow();
  });
  it('accepts ASCII and reduces integer strings without rounding', () => {
    expect(parseMessageSymbol('H')).toBe(72);
    expect(parseMessageSymbol(' ')).toBe(32);
    expect(parseMessageSymbol('!')).toBe(33);
    expect(parseMessageSymbol('7')).toBe(7);
    expect(parseMessageSymbol('-1')).toBe(256);
    expect(parseMessageSymbol('514')).toBe(0);
    expect(parseMessageSymbol('9007199254740993')).toBe(Number(9007199254740993n % 257n));
    for (const raw of ['', 'Hello', 'é', '💚', '1.5']) expect(parseMessageSymbol(raw)).toBeNull();
  });
  it('preserves the five-symbol message, output length and survivors in shared links', () => {
    const experiment = {
      ...defaultExperiment(),
      message: {
        values: [65, 256, 0, 4, 9],
        n: 16,
        kept: [2, 5, 7, 9, 15],
        channel: {
          mode: 'errors' as const,
          count: 4,
          seed: 72,
          received: Array.from({ length: 16 }, (_, i) => (i % 3 === 0 ? null : i)),
        },
      },
    };
    const url = new URL(experimentUrl('message-interpolation', experiment), 'https://example.test');
    expect(readLocation(url.pathname, url.search)).toMatchObject({ experiment, notice: '' });
    for (const change of [
      { values: [1] },
      { values: [0, 0, 0, 0, 257] },
      { n: 4 },
      { n: 25 },
      { kept: [0, 1, 2, 3, 16] },
      { kept: [0, 0, 1, 2, 3] },
      { channel: { mode: 'errors', count: 17, seed: 1 } },
      { channel: { mode: 'loss', count: 1, seed: 0 } },
      { channel: { mode: 'unknown', count: 1, seed: 1 } },
      { channel: { mode: 'errors', count: 1, seed: 1, received: [1, 2] } },
      { channel: { mode: 'errors', count: 1, seed: 1, received: Array(16).fill(257) } },
    ])
      expect(
        validExperiment({ ...experiment, message: { ...experiment.message, ...change } }),
      ).toBe(false);
    expect(readLocation('/', '').lesson).toBe('message-interpolation');
  });
});
