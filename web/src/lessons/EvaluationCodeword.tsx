import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { fraction } from '../core/math';
import { useExperiment } from '../state/ExperimentContext';
import { MathText } from '../components/Math';
import { Tape } from '../components/Tape';
import { Definition, Slider } from '../components/Controls';

export default function EvaluationCodeword() {
  const { experiment: e, sent, setExample } = useExperiment();
  const [selected, setSelected] = useState(3);
  const x = Math.min(selected, e.n - 1);
  const k = e.coefficients.length;
  // Reduce powers and products before summing: never use large floating-point powers.
  let power = 1;
  const terms = e.coefficients.map((coefficient) => {
    const result = (coefficient * power) % e.q;
    power = (power * x) % e.q;
    return result;
  });
  const total = terms.reduce((sum, value) => sum + value, 0);
  let acc = 0;
  const steps = [...e.coefficients].reverse().map((a) => {
    const input = acc;
    const raw = acc * x + a;
    acc = raw % e.q;
    return { input, coefficient: a, raw, result: acc };
  });
  return (
    <>
      <section className="experiment-panel evaluation-experiment">
        <div className="panel-topline">
          <div className="object-label">
            <MathText>c</MathText>
            <span>Reed–Solomon codeword</span>
          </div>
          <span className="small muted">
            {k} coefficients → {e.n} evaluations
          </span>
        </div>
        <div className="evaluation-output">
          <Tape values={sent} label="Codeword" active={x} onSelect={setSelected} compact />
          <p className="stage-helper">Select a symbol to inspect its evaluation.</p>
        </div>
        <div className="evaluation-workbench">
          <div className="evaluation-table-wrap">
            <table className="math-table evaluation-table">
              <thead>
                <tr>
                  <th>Point</th>
                  <th>Evaluate</th>
                  <th>Symbol</th>
                </tr>
              </thead>
              <tbody>
                {sent.map((value, i) => (
                  <tr key={i} className={i === x ? 'row-active' : ''}>
                    <td>
                      <MathText>{'x_{' + (i + 1) + '}=' + i}</MathText>
                    </td>
                    <td>
                      <button
                        className="evaluation-button"
                        aria-label={'Inspect evaluation at ' + i}
                        aria-pressed={x === i}
                        onClick={() => setSelected(i)}
                      >
                        <MathText>{'p(' + i + ')'}</MathText>
                        <ChevronRight size={14} />
                      </button>
                    </td>
                    <td>
                      <span className="output-symbol">{value}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="evaluation-controls">
            <label className="select-label" htmlFor="rate-select">
              Code rate <MathText>{'\\rho=k/n'}</MathText>
            </label>
            <select
              id="rate-select"
              aria-label="Code rate"
              aria-describedby="rate-description"
              className="select-input"
              value={e.n}
              onChange={(event) => setExample(e.coefficients, Number(event.target.value))}
            >
              {Array.from({ length: e.q - k + 1 }, (_, i) => k + i).map((n) => (
                <option key={n} value={n}>
                  {fraction(k, n)} · {n} evaluations
                </option>
              ))}
            </select>
            <p id="rate-description" className="control-hint">
              Rate is the ratio of useful data to the total number of symbols.
            </p>
            <Slider
              label="Evaluation points"
              min={k}
              max={e.q}
              value={e.n}
              onChange={(n) => setExample(e.coefficients, n)}
            />
            <p className="evaluation-redundancy">
              {e.n - k} redundant symbols · the polynomial stays fixed.
            </p>
            <div className="evaluation-calculation" aria-live="polite">
              <span className="micro-label">
                SUBSTITUTE X = {x} · MODULO {e.q}
              </span>
              <div className="evaluation-term-sum">
                <MathText>{'p(' + x + ')\\equiv ' + terms.join('+')}</MathText>
              </div>
              <MathText block>
                {total + '\\equiv \\boxed{' + sent[x] + '}\\pmod{' + e.q + '}'}
              </MathText>
              <span className="small muted">Each term is reduced modulo {e.q}, then added.</span>
              <details>
                <summary>Show every multiplication</summary>
                <p className="small">Horner’s method, starting at the highest coefficient:</p>
                {steps.map((step, i) => (
                  <div className="arithmetic-step" key={i}>
                    <MathText>
                      {'(' +
                        step.input +
                        '\\cdot' +
                        x +
                        '+' +
                        step.coefficient +
                        ')=' +
                        step.raw +
                        '\\equiv' +
                        step.result +
                        '\\pmod{' +
                        e.q +
                        '}'}
                    </MathText>
                  </div>
                ))}
              </details>
            </div>
          </div>
        </div>
      </section>
      <Definition>
        <MathText block>
          {'\\operatorname{Enc}(a_0,\\ldots,a_{k-1})=(p(x_1),\\ldots,p(x_n))'}
        </MathText>
        <p>
          The evaluation points must be distinct field elements. This experiment uses{' '}
          <MathText>{'0,1,\\ldots,' + (e.n - 1)}</MathText>. Every output is a polynomial
          evaluation; the first k output symbols are not necessarily the original coefficients.
        </p>
      </Definition>
    </>
  );
}
