import { useState } from 'react';
import { Check, RotateCcw, Shuffle } from 'lucide-react';
import { Definition, Slider } from '../components/Controls';
import { MathText } from '../components/Math';
import { Tape } from '../components/Tape';
import {
  DEFAULT_LINEAR_COMBINATION,
  linearCodewordPolynomial,
  linearCombination,
  nearestLinearCodeword,
  RLC_DOMAIN,
  RLC_Q,
  type LinearCombinationSettings,
} from '../core/linearCombination';
import { polynomialTex } from '../core/math';
import { useExperiment } from '../state/ExperimentContext';
import './RandomLinearCombination.css';

function WordStatus({ valid }: { valid: boolean }) {
  return (
    <span className={`rlc-status ${valid ? 'rlc-status-valid' : ''}`}>
      {valid ? <Check size={12} aria-hidden="true" /> : <span className="rlc-status-dot" />}
      {valid ? 'Valid codeword' : 'Word · not a codeword'}
    </span>
  );
}

export default function RandomLinearCombination() {
  const { experiment, patch } = useExperiment();
  const settings = experiment.linearCombination ?? DEFAULT_LINEAR_COMBINATION;
  const { f, g, alpha } = settings;
  const [selected, setSelected] = useState(4);
  const h = linearCombination(f, g, alpha);
  const hPolynomial = linearCodewordPolynomial(h);
  const nearest = nearestLinearCodeword(h);
  const validAlphas = Array.from({ length: RLC_Q }, (_, a) => a).filter(
    (a) => linearCodewordPolynomial(linearCombination(f, g, a)) !== null,
  );
  const update = (change: Partial<LinearCombinationSettings>) =>
    patch({ linearCombination: { ...settings, ...change } });

  return (
    <div className="rlc-lesson">
      <header className="rlc-heading">
        <h2>Random linear combination</h2>
        <p>
          Multiply <MathText>g</MathText> by <MathText>{'\\alpha'}</MathText>, then add{' '}
          <MathText>f</MathText>. Change α or edit any cell to see what happens.
        </p>
      </header>

      <section className="experiment-panel rlc-workbench" aria-label="Random linear combination">
        <div className="panel-topline">
          <MathText>{'h_\\alpha=f+\\alpha g\\pmod{17}'}</MathText>
          <button
            className="text-button"
            onClick={() => {
              patch({ linearCombination: DEFAULT_LINEAR_COMBINATION });
              setSelected(4);
            }}
          >
            <RotateCcw size={13} aria-hidden="true" /> Reset example
          </button>
        </div>

        <div className="rlc-inputs">
          {(['f', 'g'] as const).map((name) => {
            const row = settings[name];
            const valid = linearCodewordPolynomial(row) !== null;
            return (
              <div className={`rlc-vector ${valid ? 'rlc-codeword' : ''}`} key={name}>
                <div className="rlc-row-heading">
                  <div className="rlc-row-label">
                    <MathText>{name}</MathText>
                    <WordStatus valid={valid} />
                  </div>
                  <button
                    className="text-button"
                    aria-label={`Set ${name} to ${valid ? 'a non-codeword' : 'a codeword'}`}
                    onClick={() =>
                      update({
                        [name]: valid
                          ? [...DEFAULT_LINEAR_COMBINATION[name]]
                          : name === 'f'
                            ? [...RLC_DOMAIN]
                            : RLC_DOMAIN.map(() => 0),
                      })
                    }
                  >
                    {valid ? 'Use non-codeword' : 'Use codeword'}
                  </button>
                </div>
                <Tape
                  values={row}
                  q={RLC_Q}
                  label={`Vector ${name}`}
                  points={RLC_DOMAIN}
                  editable
                  wrapValues
                  active={selected}
                  onActive={(index) => {
                    if (index !== null) setSelected(index);
                  }}
                  onChange={(index, value) =>
                    update({ [name]: row.map((entry, i) => (i === index ? value : entry)) })
                  }
                />
              </div>
            );
          })}
          <p className="rlc-edit-hint">
            Each cell is a value at the point shown above it. Integers wrap modulo 17.
          </p>
        </div>

        <div className="rlc-alpha-control">
          <div className="rlc-alpha-value">
            <MathText>{'\\alpha='}</MathText>
            <Tape
              values={[alpha]}
              q={RLC_Q}
              label="Alpha"
              editable
              wrapValues
              hideIndices
              onChange={(_, value) => update({ alpha: value })}
            />
          </div>
          <Slider
            label="Alpha"
            value={alpha}
            max={RLC_Q - 1}
            onChange={(value) => update({ alpha: value })}
          />
          <button
            className="rlc-sample-button"
            aria-label="Sample random alpha"
            onClick={() => update({ alpha: Math.floor(Math.random() * RLC_Q) })}
          >
            <Shuffle size={14} aria-hidden="true" /> Random α
          </button>
        </div>

        <div
          className={`rlc-result rlc-vector ${hPolynomial ? 'rlc-codeword' : ''}`}
          role="region"
          aria-label="Result h"
        >
          <div className="rlc-row-heading">
            <div className="rlc-row-label">
              <MathText>{`h=f+${alpha}g`}</MathText>
              <WordStatus valid={hPolynomial !== null} />
            </div>
            <span className="rlc-result-caption">THE RESULT</span>
          </div>
          <Tape
            values={h}
            label="Result h"
            points={RLC_DOMAIN}
            active={selected}
            onSelect={setSelected}
          />
          <div className="rlc-result-explanation" aria-live="polite" aria-atomic="true">
            {hPolynomial ? (
              <p>
                Every entry matches <MathText>{`p(X)=${polynomialTex(hPolynomial)}`}</MathText> on
                the domain. <strong>h is a valid codeword.</strong>
              </p>
            ) : (
              <p>
                No polynomial of degree less than 2 matches all eight entries.{' '}
                <strong>h is a word, but not a codeword.</strong>
              </p>
            )}
          </div>
          <div
            className="rlc-distance"
            role="status"
            aria-label="Distance to nearest codeword"
            aria-atomic="true"
          >
            <div>
              <span className="rlc-distance-label">Distance to nearest codeword</span>
              <div className="rlc-distance-value">
                <MathText>{`\\delta(h,C)=\\frac{${nearest.distance}}{${RLC_DOMAIN.length}}=${nearest.delta * 100}\\%`}</MathText>
              </div>
            </div>
            <div className="rlc-nearest-polynomial">
              <p>
                {nearest.distance} of {RLC_DOMAIN.length} entries{' '}
                {nearest.distance === 1 ? 'differs' : 'differ'}.{' '}
                {nearest.count === 1 ? 'Nearest codeword:' : 'One nearest codeword:'}{' '}
                <MathText>{`p(X)=${polynomialTex(nearest.coefficients)}`}</MathText>
              </p>
              <span>
                {nearest.count === 1
                  ? 'δ is the fraction of entries you need to change.'
                  : `${nearest.count} codewords are equally close; δ is the same for all of them.`}
              </span>
            </div>
          </div>
          <div className="rlc-calculation">
            <span>At x = {RLC_DOMAIN[selected]}</span>
            <MathText>{`${f[selected]}+${alpha}\\cdot${g[selected]}=${f[selected] + alpha * g[selected]}\\equiv ${h[selected]}\\pmod{17}`}</MathText>
            <span className="rlc-calculation-hint">Select a result cell to inspect it.</span>
          </div>
        </div>
        <div className="rlc-probability" aria-live="polite" aria-atomic="true">
          <div className="rlc-probability-exact">
            <span className="rlc-probability-count">{validAlphas.length}/17</span>
            <span>For this pair</span>
          </div>
          <p>
            {validAlphas.length === RLC_Q
              ? 'Every α produces a codeword: both input vectors are codewords.'
              : validAlphas.length === 0
                ? 'No α produces a codeword for these input vectors.'
                : `Only α = ${validAlphas[0]} produces a codeword for these input vectors.`}
            <span>
              {validAlphas.length === RLC_Q ? (
                <>A linear combination of two codewords stays in the code: probability 1.</>
              ) : (
                <>
                  With at least one non-codeword, the general bound is{' '}
                  <MathText>
                    {'\\Pr[h_\\alpha\\in C]\\le\\frac{1}{|\\mathbb F|}=\\frac{1}{17}'}
                  </MathText>
                  . The exact probability for this pair is {validAlphas.length === 0 ? '0' : '1/17'}
                  .
                </>
              )}
            </span>
            <span>α is sampled uniformly from 0 to 16.</span>
          </p>
        </div>
      </section>

      <Definition title="Why can two non-codewords make a codeword?">
        <p>
          This code uses <MathText>{'D=\\{1,2,4,8,16,15,13,9\\}'}</MathText> over{' '}
          <MathText>{'\\mathbb F_{17}'}</MathText>. Its codewords are the evaluations of{' '}
          <MathText>{'p(X)=a+bX'}</MathText>, including constant and zero polynomials.
        </p>
        <p>
          In the starting example, f matches p(X) = X except at x = 16, where its value is 1. The
          vector g is zero except at that same point, where its value is 5. Choosing α = 3 repairs
          that entry: 1 + 3 × 5 = 16. Neither input is a codeword, but their combination is.
        </p>
        <p>
          If two distinct choices of α produced codewords, subtracting them would show that g is a
          codeword, and then f would be one too. So if either input is not a codeword, at most one
          of the 17 choices can produce a codeword. If both inputs are codewords, every choice
          works.
        </p>
      </Definition>
    </div>
  );
}
