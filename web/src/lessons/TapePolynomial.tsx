import { useState } from 'react';
import { ArrowDown } from 'lucide-react';
import { degree, polynomialTex, termTex } from '../core/math';
import { useExperiment } from '../state/ExperimentContext';
import { MathText } from '../components/Math';
import { Tape } from '../components/Tape';
import { Toggle } from '../components/Controls';

export default function TapePolynomial() {
  const { experiment: e, setExample, patch } = useExperiment();
  const [active, setActive] = useState<number | null>(null);
  const k = e.coefficients.length;
  const actualDegree = degree(e.coefficients);
  const change = (index: number, value: number) =>
    setExample(
      e.coefficients.map((a, i) => (i === index ? value : a)),
      e.n,
    );
  return (
    <>
      <header className="coefficient-heading">
        <h2>Coefficients to polynomial</h2>
        <p>An alternative encoding: place each vector entry in front of a power of X.</p>
        <p className="coefficient-context">
          In a typical STARK, trace entries are polynomial <strong>evaluations</strong>, and
          interpolation finds the coefficients. This page shows direct coefficient encoding, another
          valid way to encode a message with Reed–Solomon codes.
        </p>
      </header>
      <section className="experiment-panel coefficient-experiment">
        <div className="panel-topline">
          <div className="object-label">
            <span>Coefficient vector</span>
            <span className="muted">{k} coefficients</span>
          </div>
          <span className="micro-label">Each position supplies a power of X</span>
        </div>
        <div className="coefficient-mapping">
          <Tape
            label="Message"
            values={e.coefficients}
            q={e.q}
            editable
            wrapValues
            coefficientLabels
            onChange={change}
            active={active}
            onActive={setActive}
            onAdd={k < e.q ? () => setExample([...e.coefficients, 0], e.n) : undefined}
            onRemove={k > 1 ? () => setExample(e.coefficients.slice(0, -1), e.n) : undefined}
            onRemoveAt={(index) =>
              setExample(
                e.coefficients.filter((_, i) => i !== index),
                e.n,
              )
            }
            renderBelow={(value, index) => (
              <>
                <div className="coefficient-connector" aria-hidden="true">
                  <span />
                  <MathText>
                    {index === 0
                      ? '\\times 1'
                      : '\\times X' + (index === 1 ? '' : '^{' + index + '}')}
                  </MathText>
                  <ArrowDown size={13} />
                </div>
                <button
                  className={'coefficient-term' + (value === 0 ? ' is-zero' : '')}
                  aria-label={'Polynomial term for coefficient ' + index}
                  onFocus={() => setActive(index)}
                  onClick={() => setActive(index)}
                >
                  <MathText>{termTex(value, index, true)}</MathText>
                </button>
              </>
            )}
          />
          <p className="stage-helper">
            Enter an integer. Press Enter or leave the cell to wrap it modulo {e.q}. Delete or
            Backspace on an empty cell removes it.
          </p>
        </div>
        <div className="coefficient-result">
          <span className="micro-label">ADD THE TERMS</span>
          <div
            className="polynomial-display"
            aria-label={'Polynomial: ' + polynomialTex(e.coefficients, e.showZero)}
          >
            <MathText>{'p(X)='}</MathText>
            <div className="polynomial-terms">
              {e.coefficients.every((a) => a === 0) && !e.showZero ? (
                <MathText>0</MathText>
              ) : (
                e.coefficients
                  .map((value, index) => ({ value, index, tex: termTex(value, index, e.showZero) }))
                  .filter((term) => term.tex)
                  .map((term, i) => (
                    <button
                      key={term.index}
                      className={
                        'polynomial-term term-button' +
                        (active === term.index ? ' term-active' : '')
                      }
                      aria-label={'Highlight coefficient ' + term.index}
                      onMouseEnter={() => setActive(term.index)}
                      onMouseLeave={() => setActive(null)}
                      onFocus={() => setActive(term.index)}
                      onClick={() => setActive(term.index)}
                    >
                      {i > 0 && <span className="term-plus">+</span>}
                      <MathText>{term.tex}</MathText>
                    </button>
                  ))
              )}
            </div>
          </div>
        </div>
        <div className="panel-bottomline">
          <span>
            <MathText>{'\\deg(p)<' + k}</MathText> ·{' '}
            {actualDegree === null ? 'zero polynomial' : 'actual degree ' + actualDegree}
          </span>
          <Toggle
            label="Show zero terms"
            checked={e.showZero}
            onChange={(showZero) => patch({ showZero })}
          />
        </div>
      </section>
    </>
  );
}
