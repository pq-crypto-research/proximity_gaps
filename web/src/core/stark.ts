import { mod, SUPPORTED_FIELDS } from './math';

function assertField(q: number) {
  if (q !== 257 && !SUPPORTED_FIELDS.includes(q as 5 | 7 | 17))
    throw new RangeError('Unsupported field.');
}

export function power(base: number, exponent: number, q: number): number {
  let result = 1;
  for (let i = 0; i < exponent; i++) result = mod(result * base, q);
  return result;
}

function inverse(value: number, q: number): number {
  if (mod(value, q) === 0) throw new RangeError('Cannot divide by zero.');
  return power(mod(value, q), q - 2, q);
}

export function rootOfUnity(size: number, q: number): number {
  assertField(q);
  if (!Number.isInteger(size) || size < 1 || (size & (size - 1)) !== 0 || (q - 1) % size !== 0)
    throw new RangeError('The field must contain a root of the requested power-of-two order.');
  if (size === 1) return 1;
  for (let root = 2; root < q; root++) {
    if (power(root, size, q) === 1 && power(root, size / 2, q) !== 1) return root;
  }
  throw new RangeError('No root of unity exists.');
}

export function multiplicativeDomain(size: number, q: number): number[] {
  const root = rootOfUnity(size, q);
  return Array.from({ length: size }, (_, i) => power(root, i, q));
}

function transform(values: readonly number[], root: number, q: number): number[] {
  if (values.length === 1) return [mod(values[0], q)];
  const even = transform(
    values.filter((_, i) => i % 2 === 0),
    mod(root * root, q),
    q,
  );
  const odd = transform(
    values.filter((_, i) => i % 2 === 1),
    mod(root * root, q),
    q,
  );
  const result = Array<number>(values.length);
  let weight = 1;
  for (let i = 0; i < values.length / 2; i++) {
    result[i] = mod(even[i] + weight * odd[i], q);
    result[i + values.length / 2] = mod(even[i] - weight * odd[i], q);
    weight = mod(weight * root, q);
  }
  return result;
}

/** Exact radix-2 transforms over the small prime fields used by the UI. */
export function fft(values: readonly number[], q: number, invert = false): number[] {
  const root = rootOfUnity(values.length, q);
  if (values.some((value) => !Number.isInteger(value) || value < 0 || value >= q))
    throw new RangeError('Use canonical field elements.');
  const result = transform(values, invert ? inverse(root, q) : root, q);
  return invert ? result.map((value) => mod(value * inverse(values.length, q), q)) : result;
}

export function lagrangeBasis(points: readonly number[], q: number): number[][] {
  assertField(q);
  if (
    points.length === 0 ||
    new Set(points).size !== points.length ||
    points.some((x) => !Number.isInteger(x) || x < 0 || x >= q)
  )
    throw new RangeError('Interpolation points must be distinct field elements.');
  return points.map((xi, i) => {
    let basis = [1];
    let denominator = 1;
    points.forEach((xj, j) => {
      if (i === j) return;
      const next = Array<number>(basis.length + 1).fill(0);
      basis.forEach((coefficient, power) => {
        next[power] = mod(next[power] - xj * coefficient, q);
        next[power + 1] = mod(next[power + 1] + coefficient, q);
      });
      basis = next;
      denominator = mod(denominator * (xi - xj), q);
    });
    const scale = inverse(denominator, q);
    return basis.map((value) => mod(value * scale, q));
  });
}

export function interpolate(
  points: readonly number[],
  values: readonly number[],
  q: number,
): number[] {
  const basis = lagrangeBasis(points, q);
  if (
    points.length !== values.length ||
    values.some((value) => !Number.isInteger(value) || value < 0 || value >= q)
  )
    throw new RangeError('Each interpolation point needs one field value.');
  return points.map((_, power) =>
    basis.reduce((sum, term, i) => mod(sum + values[i] * term[power], q), 0),
  );
}

export function starkSizes(coefficientCount: number, q: number) {
  assertField(q);
  if (!Number.isInteger(coefficientCount) || coefficientCount < 1 || coefficientCount > q)
    throw new RangeError('Invalid polynomial dimension.');
  const traceLength = 2 ** Math.ceil(Math.log2(coefficientCount));
  const extensions = [2, 4, 8, 16].filter((factor) => (q - 1) % (traceLength * factor) === 0);
  return { traceLength, extensions };
}

export function lowDegreeExtension(coefficients: readonly number[], q: number, extension: number) {
  const { traceLength, extensions } = starkSizes(coefficients.length, q);
  if (!extensions.includes(extension)) throw new RangeError('Unsupported extension domain.');
  const padded = Array.from({ length: traceLength }, (_, i) => coefficients[i] ?? 0);
  const traceDomain = multiplicativeDomain(traceLength, q);
  const trace = fft(padded, q);
  const recovered = fft(trace, q, true);
  const length = traceLength * extension;
  return {
    traceDomain,
    trace,
    recovered,
    domain: multiplicativeDomain(length, q),
    codeword: fft(
      Array.from({ length }, (_, i) => recovered[i] ?? 0),
      q,
    ),
  };
}

/** A verifier can compute this from a pair of opened values; no coefficients are needed. */
export function friFoldPair(
  positive: number,
  negative: number,
  x: number,
  alpha: number,
  q: number,
): number {
  assertField(q);
  if (
    [positive, negative, x, alpha].some(
      (value) => !Number.isInteger(value) || value < 0 || value >= q,
    )
  )
    throw new RangeError('Use canonical field elements.');
  const even = mod((positive + negative) * inverse(2, q), q);
  const odd = mod((positive - negative) * inverse(2 * x, q), q);
  return mod(even + alpha * odd, q);
}
