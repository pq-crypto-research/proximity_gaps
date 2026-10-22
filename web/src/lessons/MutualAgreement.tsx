import { useMemo, useState, type ReactNode } from 'react';
import { RotateCcw, Shuffle } from 'lucide-react';
import { MathText } from '../components/Math';
import { NumberCell, Tape } from '../components/Tape';
import { Definition, Slider, Toggle } from '../components/Controls';
import {
  analyzeMca,
  MCA_DOMAIN,
  MCA_MIN_AGREEMENT,
  MCA_N,
  MCA_PRESETS,
  MCA_Q,
  type McaSettings,
} from '../core/agreement';
import { linearCodewordPolynomial } from '../core/linearCombination';
import { polynomialTex } from '../core/math';
import { useExperiment } from '../state/ExperimentContext';
import './MutualAgreement.css';

export default function MutualAgreement() {
  const { experiment, patch } = useExperiment();
  const settings = experiment.mca ?? MCA_PRESETS.article;
  const [onlySupport, setOnlySupport] = useState(false);
  const analysis = useMemo(() => analyzeMca(settings.f, settings.g), [settings.f, settings.g]);
  const selected = analysis.challenges[settings.alpha];
  const { support, nearest: c } = selected;
  const [u0, u1] = analysis.nearestInputs;
  const indices = MCA_DOMAIN.flatMap((_, i) => (!onlySupport || support.includes(i) ? [i] : []));
  const update = (change: Partial<McaSettings>) => patch({ mca: { ...settings, ...change } });
  const restrict = (name: string) => `${name}${onlySupport ? '|_S' : ''}`;
  const broken = support.filter(
    (i) => settings.f[i] !== u0.word[i] || settings.g[i] !== u1.word[i],
  );
  const verdict = selected.bad
    ? 'MCA error'
    : selected.qualifies
      ? 'MCA agreement'
      : 'No qualifying agreement';

  function row(
    name: string,
    label: string,
    values: readonly number[],
    comparison: readonly number[],
    meta: ReactNode,
    editable?: 'f' | 'g',
  ) {
    return (
      <tr aria-label={label}>
        <th scope="row">
          <MathText>{`${restrict(name)}=`}</MathText>
        </th>
        {indices.map((i) => {
          const inside = support.includes(i);
          const differs = values[i] !== comparison[i];
          return (
            <td
              key={i}
              data-coordinate={MCA_DOMAIN[i]}
              data-in-support={inside}
              className={`${inside ? (differs ? 'mca-in-mismatch' : 'mca-in-match') : 'mca-out'} ${differs ? 'mca-different' : ''}`}
              title={`x = ${MCA_DOMAIN[i]} · ${inside ? 'in S' : 'outside S'} · ${differs ? 'different values' : 'matching values'}`}
            >
              <div className="tape-cell mca-cell">
                {editable ? (
                  <NumberCell
                    value={values[i]}
                    q={MCA_Q}
                    label={`MCA ${editable}, position ${i + 1}, x = ${MCA_DOMAIN[i]}`}
                    wrapValues
                    onChange={(value) =>
                      update({ [editable]: values.map((entry, j) => (j === i ? value : entry)) })
                    }
                  />
                ) : (
                  <span>{values[i]}</span>
                )}
              </div>
            </td>
          );
        })}
        <td className="mca-row-meta">{meta}</td>
      </tr>
    );
  }

  function inputMeta(values: number[]) {
    return (
      <span>{linearCodewordPolynomial(values) ? 'Valid codeword' : 'Word · not a codeword'}</span>
    );
  }

  function nearestMeta(name: 'f' | 'g', codeword: typeof u0, subscript: number) {
    const agrees = support.every((i) => settings[name][i] === codeword.word[i]);
    return (
      <>
        <span>
          {codeword.count > 1 ? 'A nearest codeword' : 'Nearest codeword'}:{' '}
          <MathText>{`p_${subscript}(X)=${polynomialTex(codeword.coefficients)}`}</MathText>
        </span>
        <small className={agrees ? 'mca-text-match' : selected.qualifies ? 'mca-text-error' : ''}>
          <MathText>{`${name}|_S ${agrees ? '=' : '\\ne'} u_${subscript}|_S`}</MathText>
          {codeword.count > 1 && ` · ${codeword.count} equally near`}
        </small>
      </>
    );
  }

  return (
    <div className="mca-lesson">
      <header className="mca-heading">
        <h2>Mutual correlated agreement</h2>
        <p>Find where h and c agree. Do f and g agree with codewords on those same positions?</p>
      </header>
      <section className="experiment-panel mca-workbench" aria-label="MCA experiment">
        <div className="panel-topline">
          <MathText>{'h_\\alpha=f+\\alpha g\\pmod{17}'}</MathText>
          <div className="mca-actions">
            <button className="text-button" onClick={() => patch({ mca: MCA_PRESETS.code })}>
              Both codewords
            </button>
            <button
              className="text-button"
              onClick={() => {
                patch({ mca: MCA_PRESETS.article });
                setOnlySupport(false);
              }}
            >
              <RotateCcw size={13} aria-hidden="true" /> Reset example
            </button>
          </div>
        </div>
        <div className="mca-board-toolbar">
          <div className="mca-legend">
            <span>
              <i className="mca-swatch-match" />
              Agrees on S
            </span>
            <span>
              <i className="mca-swatch-error" />
              Mismatch inside S
            </span>
            <span>
              <i className="mca-swatch-out" />
              Outside S
            </span>
          </div>
          <Toggle label="Only show S" checked={onlySupport} onChange={setOnlySupport} />
        </div>
        <div
          className="mca-tape-scroll"
          tabIndex={0}
          role="region"
          aria-label="Aligned vectors and nearest codewords"
        >
          <table className="mca-tape-table">
            <colgroup>
              <col className="mca-label-column" />
              {indices.map((i) => (
                <col key={i} />
              ))}
              <col className="mca-meta-column" />
            </colgroup>
            <thead>
              <tr>
                <th scope="col">{onlySupport ? 'On S' : 'On D'}</th>
                {indices.map((i) => (
                  <th scope="col" key={i} className={support.includes(i) ? 'mca-domain-in' : ''}>
                    <MathText>{`x=${MCA_DOMAIN[i]}`}</MathText>
                  </th>
                ))}
                <th scope="col">Compare on the same set S</th>
              </tr>
            </thead>
            <tbody className="mca-pair">
              {row('f', 'Vector f', settings.f, u0.word, inputMeta(settings.f), 'f')}
              {row('u_0', 'Nearest codeword u0', u0.word, settings.f, nearestMeta('f', u0, 0))}
            </tbody>
            <tbody className="mca-pair">
              {row('g', 'Vector g', settings.g, u1.word, inputMeta(settings.g), 'g')}
              {row('u_1', 'Nearest codeword u1', u1.word, settings.g, nearestMeta('g', u1, 1))}
            </tbody>
            <tbody>
              <tr>
                <td colSpan={indices.length + 2} className="mca-alpha-cell">
                  <div className="mca-alpha-control">
                    <div className="mca-alpha-value">
                      <MathText>{'\\alpha='}</MathText>
                      <Tape
                        values={[settings.alpha]}
                        label="MCA alpha"
                        editable
                        wrapValues
                        hideIndices
                        onChange={(_, alpha) => update({ alpha })}
                      />
                    </div>
                    <Slider
                      label="Alpha"
                      value={settings.alpha}
                      max={MCA_Q - 1}
                      onChange={(alpha) => update({ alpha })}
                    />
                    <button
                      className="mca-random"
                      aria-label="Sample random alpha"
                      onClick={() => update({ alpha: Math.floor(Math.random() * MCA_Q) })}
                    >
                      <Shuffle size={13} aria-hidden="true" />
                      Random α
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
            <tbody className="mca-pair mca-output-pair">
              {row(
                'h',
                'Combination h',
                selected.word,
                c.word,
                <>
                  <span>
                    <MathText>{`h=f+${settings.alpha}g`}</MathText>
                  </span>
                  <small>
                    <MathText>{`\\delta(h,C)=\\frac{${c.distance}}{${MCA_N}}`}</MathText>
                  </small>
                </>,
              )}
              {row(
                'c',
                'Nearest codeword c',
                c.word,
                selected.word,
                <>
                  <span>
                    {c.count > 1 ? 'A nearest codeword' : 'Nearest codeword'}:{' '}
                    <MathText>{`p(X)=${polynomialTex(c.coefficients)}`}</MathText>
                  </span>
                  <small className="mca-text-match">
                    <MathText>{'h|_S=c|_S'}</MathText>
                    {c.count > 1 && ` · ${c.count} equally near`}
                  </small>
                </>,
              )}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">
                  <MathText>S</MathText>
                </th>
                {indices.map((i) => (
                  <td
                    key={i}
                    className={support.includes(i) ? 'mca-text-match' : ''}
                    aria-label={`x = ${MCA_DOMAIN[i]} ${support.includes(i) ? 'in S' : 'outside S'}`}
                  >
                    {support.includes(i) ? '✓' : '—'}
                  </td>
                ))}
                <td className="mca-row-meta">
                  {support.length} of 8 points · need at least {MCA_MIN_AGREEMENT}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="mca-support-summary">
          <div className="mca-domain-sets">
            <MathText>{`D=\\{${MCA_DOMAIN.join(',')}\\}`}</MathText>
            <div>
              <MathText>{`S=\\{${support.map((i) => MCA_DOMAIN[i]).join(',')}\\}`}</MathText>
              <MathText>{'S\\subseteq D'}</MathText>
            </div>
          </div>
        </div>
        <div
          className={`mca-verdict ${selected.bad ? 'mca-verdict-error' : selected.qualifies ? 'mca-verdict-agreement' : ''}`}
          role="status"
          aria-label="MCA result"
          aria-atomic="true"
        >
          <strong>{verdict}</strong>
          <p>
            {selected.bad ? (
              <>
                h and c agree on S, but the input pairs disagree at{' '}
                {broken.length === 1 ? 'x' : 'points'} ={' '}
                {broken.map((i) => MCA_DOMAIN[i]).join(', ')} inside S. No codewords can make both
                input pairs agree on all of S.
              </>
            ) : selected.qualifies ? (
              <>
                <MathText>{'f|_S=u_0|_S'}</MathText> and <MathText>{'g|_S=u_1|_S'}</MathText>. Both
                inputs agree with codewords everywhere in S. Differences outside S are allowed.
              </>
            ) : (
              <>
                <MathText>{'|S|\\ge(1-\\delta)n=(1-\\tfrac14)\\cdot8=6'}</MathText>
                <br />h matches its nearest codeword on only {support.length} points; at least{' '}
                {MCA_MIN_AGREEMENT} are required. S is too small, so this α is not an MCA failure.
              </>
            )}
          </p>
        </div>
        <div className="mca-challenges">
          <div className="mca-challenge-heading">
            <span>Try every α</span>
            <span>
              <strong data-testid="mca-bad-count">{analysis.badCount}/17</strong> MCA failure
              probability for this pair
            </span>
          </div>
          <div className="mca-challenge-buttons" role="group" aria-label="All 17 alpha values">
            {analysis.challenges.map((challenge) => (
              <button
                key={challenge.alpha}
                className={
                  challenge.bad
                    ? 'mca-alpha-error'
                    : challenge.qualifies
                      ? 'mca-alpha-agreement'
                      : 'mca-alpha-outside'
                }
                aria-pressed={settings.alpha === challenge.alpha}
                aria-label={`Alpha ${challenge.alpha}: ${challenge.bad ? 'MCA error' : challenge.qualifies ? 'MCA agreement' : 'no qualifying agreement'}`}
                onClick={() => update({ alpha: challenge.alpha })}
              >
                {challenge.alpha}
              </button>
            ))}
          </div>
          <p>
            Uniform α from 0 to 16. Red choices fail; green choices agree; yellow choices have no
            qualifying set.
          </p>
        </div>
      </section>
      <Definition title="Why this is an MCA error">
        <p>
          The code evaluates polynomials of degree less than 2 on{' '}
          <MathText>{'D=\\{1,2,4,8,16,15,13,9\\}'}</MathText> in{' '}
          <MathText>{'\\mathbb F_{17}'}</MathText>. We fix δ = 1/4, so a qualifying agreement set
          contains at least six points.
        </p>
        <p>
          For the starting vectors, c, u₀, and u₁ are all the zero codeword. At α = 10, the
          combination becomes zero at x = 13, but neither input is zero there. At α = 3, the same
          thing happens at x = 9. These are the only two failing challenges.
        </p>
        <p>
          The test asks whether <em>any</em> codewords fit f and g throughout S. It does not require
          their agreement sets to equal S: extra agreement outside S is fine. We check all 289
          codewords for possible explanations.
        </p>
        <p>
          The minimum codeword distance is 7, so two distinct codewords cannot both be within two
          errors of h. At this threshold, a qualifying c is therefore the unique nearest codeword.
          Likewise, if a codeword explains an input on S, it is that input’s unique nearest
          codeword. If h is further than two errors from the code, there is no qualifying set. Any
          tied nearest codeword can be displayed in that case.
        </p>
        <p>
          Checking the full agreement set S also checks every sufficiently large subset: a codeword
          matching all of S matches each subset too. The probability shown is exact for the current
          vectors, not a worst-case bound over all vectors.
        </p>
        <p>
          Example:{' '}
          <a
            href="https://hackmd.io/@-urCr-W9R8mS-UktGXSzbQ/S1_dP1Z3Mg"
            target="_blank"
            rel="noreferrer"
          >
            Mutual Correlated Agreement (MCA) for Dummies
          </a>
          .
        </p>
      </Definition>
    </div>
  );
}
