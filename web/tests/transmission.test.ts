import { describe, expect, it } from 'vitest';
import { DEFAULT_MESSAGE, messageCodeword } from '../src/core/message';
import { decodeCorruptions, decodeErasures, transmit } from '../src/core/transmission';

describe('a receiver that only knows its received vector', () => {
  it('recovers arbitrary messages within the unknown-error bound at every demo length', () => {
    for (let n = 5; n <= 24; n++) {
      for (let seed = 1; seed <= 4; seed++) {
        const message = [seed * 11, 256, 0, seed * 39, seed];
        const sent = messageCodeword(message, n);
        for (let count = 0; count <= Math.floor((n - 5) / 2); count++) {
          const received = transmit(sent, { mode: 'errors', count, seed }) as number[];
          const decoded = decodeCorruptions(received);
          expect(decoded?.message).toEqual(message);
          expect(decoded?.word).toEqual(sent);
          expect(decoded?.corrected).toHaveLength(count);
        }
      }
    }
  });
  it('corrects errors at every triple of positions, including the message positions', () => {
    const sent = messageCodeword([13, 42, 256, 1, 39], 11);
    for (let a = 0; a < 9; a++)
      for (let b = a + 1; b < 10; b++)
        for (let c = b + 1; c < 11; c++) {
          const received = [...sent];
          [a, b, c].forEach((index, j) => {
            received[index] = (received[index] + 1 + 80 * j) % 257;
          });
          const decoded = decodeCorruptions(received);
          expect(decoded?.word).toEqual(sent);
          expect(decoded?.corrected).toEqual([a, b, c]);
        }
  });
  it('recovers exactly when at least five evaluations survive, for every erasure pattern', () => {
    const message = [256, 0, 33, 199, 14];
    const sent = messageCodeword(message, 11);
    for (let mask = 0; mask < 2 ** 11; mask++) {
      const received = sent.map((value, i) => (mask & (1 << i) ? null : value));
      const decoded = decodeErasures(received);
      if (received.filter((value) => value !== null).length >= 5)
        expect(decoded?.message).toEqual(message);
      else expect(decoded).toBeNull();
    }
  });
  it('samples distinct damage locations, keeps them stable as the count increases, and replays seeds', () => {
    const sent = messageCodeword(DEFAULT_MESSAGE.values, 11);
    const a = transmit(sent, { mode: 'loss', count: 6, seed: 17 });
    const b = transmit(sent, { mode: 'loss', count: 7, seed: 17 });
    expect(a.filter((value) => value === null)).toHaveLength(6);
    a.forEach((value, i) => {
      if (value === null) expect(b[i]).toBeNull();
    });
    expect(transmit(sent, { mode: 'loss', count: 6, seed: 17 })).toEqual(a);
    expect(transmit(sent, { mode: 'loss', count: 6, seed: 47 })).not.toEqual(a);
    expect(a.slice(0, 5)).toContain(null);
    const errors = transmit(sent, { mode: 'errors', count: 6, seed: 17 });
    expect(errors.filter((value, i) => value !== sent[i])).toHaveLength(6);
    expect(errors).not.toContain(null);
  });
  it('can decode to a different polynomial beyond the bound, so success cannot be promised there', () => {
    const sent = messageCodeword([0, 0, 0, 0, 0], 11);
    const other = messageCodeword([0, 0, 0, 0, 1], 11);
    const received = sent.map((value, i) => (i >= 4 && i <= 7 ? other[i] : value));
    expect(received.filter((value, i) => value !== sent[i])).toHaveLength(4);
    expect(decodeCorruptions(received)?.word).toEqual(other);
  });
  it('decodes mixed missing and incorrect values within 2e+s ≤ n−k without renumbering surviving points', () => {
    const message = [17, 0, 256, 64, 5];
    for (let n = 5; n <= 24; n++) {
      const word = messageCodeword(message, n);
      for (let missing = 0; missing <= n - 5; missing++) {
        const received = transmit(word, { mode: 'loss', count: missing, seed: 42 });
        const known = received.flatMap((value, i) => (value === null ? [] : [i]));
        const errors = Math.floor((n - 5 - missing) / 2);
        known.slice(-errors || n).forEach((i) => {
          received[i] = (received[i]! + 13) % 257;
        });
        expect(decodeCorruptions(received)?.message).toEqual(message);
      }
    }
    expect(decodeCorruptions([null, 3, null, 4, null])).toBeNull();
  });
});
