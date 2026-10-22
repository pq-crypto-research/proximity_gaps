import { describe, expect, it } from 'vitest';
import {
  defaultExperiment,
  DEFAULT_PROOF,
  experimentUrl,
  readLocation,
  validExperiment,
} from '../src/state/model';
import { corrupt } from '../src/core/math';

describe('reproducible experiment links', () => {
  it('preserves the STARK view and accepts older links without proof settings', () => {
    const experiment = {
      ...defaultExperiment(),
      proof: { ...DEFAULT_PROOF, stage: 3, alpha: 9, query: 2, tamper: true },
    };
    const url = new URL(experimentUrl('codes-to-proofs', experiment), 'https://example.test');
    expect(readLocation(url.pathname, url.search)).toMatchObject({
      lesson: 'codes-to-proofs',
      experiment,
      notice: '',
    });
    expect(validExperiment(defaultExperiment())).toBe(true);
    for (const proof of [
      null,
      { ...DEFAULT_PROOF, stage: 4 },
      { ...DEFAULT_PROOF, extension: 3 },
      { ...DEFAULT_PROOF, alpha: 17 },
      { ...DEFAULT_PROOF, tamper: 'yes' },
    ]) {
      expect(validExperiment({ ...defaultExperiment(), proof })).toBe(false);
    }
  });
  it('round trips the full experiment, including the received word and binary center', () => {
    const experiment = defaultExperiment();
    experiment.seed = 28;
    experiment.received = corrupt(experiment.received, 3, 17, experiment.seed);
    experiment.linked = false;
    experiment.radius = 4;
    experiment.ballCenter = 7;
    const url = new URL(experimentUrl('decoding-radius', experiment), 'https://example.test');
    const result = readLocation(url.pathname, url.search);
    expect(result.lesson).toBe('decoding-radius');
    expect(result.experiment).toMatchObject(experiment);
    expect(result.notice).toBe('');
  });
  it.each(['?s=nope', '?s=%7B%22v%22%3A99%7D', `?s=${'x'.repeat(10_001)}`])(
    'handles invalid shared data',
    (search) => {
      const result = readLocation('/visuals/hamming-ball', search);
      expect(result.lesson).toBe('hamming-ball');
      expect(result.experiment).toEqual(defaultExperiment());
      expect(result.notice).toContain('unsupported');
    },
  );
  it('rejects states that violate the math model', () => {
    const e = defaultExperiment();
    expect(validExperiment({ ...e, q: 6 })).toBe(false);
    expect(validExperiment({ ...e, n: 2 })).toBe(false);
    expect(validExperiment({ ...e, received: [1] })).toBe(false);
    expect(validExperiment({ ...e, coefficients: [3.5] })).toBe(false);
    expect(validExperiment({ ...e, radius: 9 })).toBe(false);
    expect(validExperiment({ ...e, ballCenter: 32 })).toBe(false);
  });
  it('recovers unknown routes without losing valid experiment data', () => {
    const result = readLocation('/visuals/missing', '');
    expect(result.lesson).toBe('message-interpolation');
    expect(result.notice).toContain('not found');
  });
});
