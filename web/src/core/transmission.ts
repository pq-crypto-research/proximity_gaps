import { corrupt, evaluate, mod } from './math';
import { interpolate, power } from './stark';
import { MESSAGE_K, MESSAGE_POINTS, MESSAGE_Q, type MessageChannel } from './message';

export type ReceivedSymbol = number | null;
export type DecodedMessage = {
  coefficients: number[];
  message: number[];
  word: number[];
  corrected: number[];
};

/** Seeded sampling keeps shared links reproducible. Every damaged position changes. */
export function transmit(word: readonly number[], channel: MessageChannel): ReceivedSymbol[] {
  const damaged = corrupt(word, channel.count, MESSAGE_Q, channel.seed);
  return damaged.map((value, i) => (channel.mode === 'loss' && value !== word[i] ? null : value));
}

function result(coefficients: number[], received: readonly ReceivedSymbol[]): DecodedMessage {
  const padded = Array.from({ length: MESSAGE_K }, (_, i) => coefficients[i] ?? 0);
  const word = received.map((_, x) => evaluate(padded, x, MESSAGE_Q));
  return {
    coefficients: padded,
    word,
    message: MESSAGE_POINTS.map((x) => evaluate(padded, x, MESSAGE_Q)),
    corrected: received.flatMap((value, i) => (value !== word[i] ? [i] : [])),
  };
}

/** The receiver sees only the received vector, with null marking known erasures. */
export function decodeErasures(received: readonly ReceivedSymbol[]): DecodedMessage | null {
  const known = received.flatMap((value, i) => (value === null ? [] : [i]));
  if (known.length < MESSAGE_K) return null;
  const points = known.slice(0, MESSAGE_K);
  const coefficients = interpolate(
    points,
    points.map((x) => received[x]!),
    MESSAGE_Q,
  );
  if (known.some((x) => evaluate(coefficients, x, MESSAGE_Q) !== received[x])) return null;
  return result(coefficients, received);
}

/** Solve an augmented linear system over F257; choose zero for free variables. */
function solve(matrix: number[][], variables: number): number[] | null {
  const a = matrix.map((row) => row.map((value) => mod(value, MESSAGE_Q)));
  const pivots: number[] = [];
  for (let column = 0; column < variables && pivots.length < a.length; column++) {
    const row = pivots.length;
    const found = a.findIndex((entry, i) => i >= row && entry[column] !== 0);
    if (found === -1) continue;
    [a[row], a[found]] = [a[found], a[row]];
    const scale = power(a[row][column], MESSAGE_Q - 2, MESSAGE_Q);
    a[row] = a[row].map((value) => mod(value * scale, MESSAGE_Q));
    a.forEach((entry, i) => {
      if (i === row) return;
      const factor = entry[column];
      if (factor === 0) return;
      for (let j = column; j <= variables; j++)
        entry[j] = mod(entry[j] - factor * a[row][j], MESSAGE_Q);
    });
    pivots.push(column);
  }
  if (
    a.some((row) => row.slice(0, variables).every((value) => value === 0) && row[variables] !== 0)
  )
    return null;
  const solution = Array<number>(variables).fill(0);
  pivots.forEach((column, row) => {
    solution[column] = a[row][variables];
  });
  return solution;
}

/**
 * Berlekamp–Welch unique decoding, without the sent word or error locations.
 * Solve Q(x_i) = received_i E(x_i), with E monic of degree t, deg Q < k+t.
 * Reference: https://cse.buffalo.edu/faculty/atri/courses/coding-theory/lectures/lect37.pdf
 * Beyond t errors this may fail or return another codeword; it never certifies the sender.
 */
export function decodeCorruptions(received: readonly ReceivedSymbol[]): DecodedMessage | null {
  if (
    received.length < MESSAGE_K ||
    received.length > MESSAGE_Q ||
    received.some(
      (value) => value !== null && (!Number.isInteger(value) || value < 0 || value >= MESSAGE_Q),
    )
  )
    throw new RangeError('Use field elements at distinct evaluation points.');
  // Puncture known erasures, preserving each surviving value's original x coordinate.
  const known = received.flatMap((value, x) => (value === null ? [] : [{ value, x }]));
  if (known.length < MESSAGE_K) return null;
  const t = Math.floor((known.length - MESSAGE_K) / 2);
  const qLength = MESSAGE_K + t;
  const variables = MESSAGE_K + 2 * t;
  const equations = known.map(({ value, x }) => {
    const powers = Array.from({ length: qLength }, (_, i) => power(x, i, MESSAGE_Q));
    return [
      ...powers,
      ...powers.slice(0, t).map((weight) => mod(-value * weight, MESSAGE_Q)),
      mod(value * powers[t], MESSAGE_Q),
    ];
  });
  const solution = solve(equations, variables);
  if (!solution) return null;
  const remainder = solution.slice(0, qLength);
  const locator = [...solution.slice(qLength), 1];
  const coefficients = Array<number>(MESSAGE_K).fill(0);
  for (let degree = qLength - 1; degree >= t; degree--) {
    const value = remainder[degree];
    coefficients[degree - t] = value;
    for (let j = 0; j <= t; j++)
      remainder[degree - t + j] = mod(remainder[degree - t + j] - value * locator[j], MESSAGE_Q);
  }
  if (remainder.some((value) => value !== 0)) return null;
  const decoded = result(coefficients, received);
  return known.filter(({ value, x }) => decoded.word[x] !== value).length <= t ? decoded : null;
}
