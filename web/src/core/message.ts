import { evaluate, parseFieldInteger } from './math';
import { interpolate } from './stark';

export const MESSAGE_Q = 257;
export const MESSAGE_K = 5;
// Keep the draggable tape small enough to inspect; F_257 permits up to 257 points.
export const MESSAGE_MAX_N = 24;
export const MESSAGE_POINTS = [0, 1, 2, 3, 4];
export type MessageChannel = {
  mode: 'loss' | 'errors';
  count: number;
  seed: number;
  received?: (number | null)[];
};
export type MessageSettings = {
  values: number[];
  n: number;
  /** Accepted for older shared links; the UI now simulates random channel damage. */
  kept?: number[];
  channel?: MessageChannel;
};
export const DEFAULT_CHANNEL: MessageChannel = { mode: 'loss', count: 3, seed: 1 };
export const DEFAULT_MESSAGE: MessageSettings = {
  values: [72, 101, 108, 108, 111],
  n: 11,
};

export function parseMessageSymbol(raw: string): number | null {
  const integer = parseFieldInteger(raw, MESSAGE_Q);
  if (integer !== null) return integer;
  return raw.length === 1 && raw.charCodeAt(0) <= 127 ? raw.charCodeAt(0) : null;
}

export function asciiSymbol(value: number): string | null {
  if (value === 32) return 'space';
  return value >= 33 && value <= 126 ? String.fromCharCode(value) : null;
}

export function messagePolynomial(values: readonly number[]): number[] {
  if (values.length !== MESSAGE_K) throw new RangeError('The message has five symbols.');
  return interpolate(MESSAGE_POINTS, values, MESSAGE_Q);
}

export function messageCodeword(values: readonly number[], n: number): number[] {
  if (!Number.isInteger(n) || n < MESSAGE_K || n > MESSAGE_Q)
    throw new RangeError('Use 5 to 257 distinct evaluation points.');
  const polynomial = messagePolynomial(values);
  return Array.from({ length: n }, (_, x) => evaluate(polynomial, x, MESSAGE_Q));
}

/** Recover from known, correct positions, without consulting the original message. */
export function recoverMessage(word: readonly number[], kept: readonly number[]): number[] {
  if (
    kept.length !== MESSAGE_K ||
    kept.some((x) => !Number.isInteger(x) || x < 0 || x >= word.length)
  )
    throw new RangeError('Choose five surviving evaluations.');
  const polynomial = interpolate(
    kept,
    kept.map((x) => word[x]),
    MESSAGE_Q,
  );
  return MESSAGE_POINTS.map((x) => evaluate(polynomial, x, MESSAGE_Q));
}
