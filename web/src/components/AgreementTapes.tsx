import { type ReactNode } from 'react';
import { Shuffle } from 'lucide-react';
import { MathText } from './Math';
import { NumberCell, Tape } from './Tape';
import { Slider, Toggle } from './Controls';
import { polynomialTex } from '../core/math';
import '../lessons/MutualAgreement.css';

type DisplayCodeword = { word: number[]; coefficients: number[]; count?: number };
export function AgreementTapes({
  domain,
  q,
  settings,
  update,
  support,
  c,
  u0,
  u1,
  word,
  nearestDistance,
  inputValid,
  minAgreement,
  qualifies,
  onlySupport,
  setOnlySupport,
  prefix = 'MCA',
  alphaChoices,
  codewordLabels = ['Nearest codeword', 'Nearest codeword', 'Nearest codeword'],
}: {
  domain: readonly number[];
  q: number;
  settings: { f: number[]; g: number[]; alpha: number };
  update: (change: Partial<{ f: number[]; g: number[]; alpha: number }>) => void;
  support: readonly number[];
  c: DisplayCodeword;
  u0: DisplayCodeword;
  u1: DisplayCodeword;
  word: number[];
  nearestDistance: number;
  inputValid: readonly [boolean, boolean];
  minAgreement: number;
  qualifies: boolean;
  onlySupport: boolean;
  setOnlySupport: (value: boolean) => void;
  prefix?: string;
  alphaChoices?: ReactNode;
  codewordLabels?: [string, string, string];
}) {
  const indices = domain.flatMap((_, i) => (!onlySupport || support.includes(i) ? [i] : []));
  const restrict = (name: string) => `${name}${onlySupport ? '|_S' : ''}`;
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
              data-coordinate={domain[i]}
              data-in-support={inside}
              className={`${inside ? (differs ? 'mca-in-mismatch' : 'mca-in-match') : 'mca-out'} ${differs ? 'mca-different' : ''}`}
              title={`x = ${domain[i]} · ${inside ? 'in S' : 'outside S'} · ${differs ? 'different values' : 'matching values'}`}
            >
              <div className="tape-cell mca-cell">
                {editable ? (
                  <NumberCell
                    value={values[i]}
                    q={q}
                    label={`${prefix} ${editable}, position ${i + 1}, x = ${domain[i]}`}
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

  function inputMeta(valid: boolean) {
    return <span>{valid ? 'Valid codeword' : 'Word · not a codeword'}</span>;
  }

  function nearestMeta(name: 'f' | 'g', codeword: typeof u0, subscript: number) {
    const agrees = support.every((i) => settings[name][i] === codeword.word[i]);
    return (
      <>
        <span>
          {codewordLabels[subscript]}:{' '}
          <MathText>{`p_${subscript}(X)=${polynomialTex(codeword.coefficients)}`}</MathText>
        </span>
        <small className={agrees ? 'mca-text-match' : qualifies ? 'mca-text-error' : ''}>
          <MathText>{`${name}|_S ${agrees ? '=' : '\\ne'} u_${subscript}|_S`}</MathText>
          {(codeword.count ?? 1) > 1 && ` · ${codeword.count} equally near`}
        </small>
      </>
    );
  }

  return (
    <>
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
        aria-label="Aligned vectors and codewords"
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
                  <MathText>{`x=${domain[i]}`}</MathText>
                </th>
              ))}
              <th scope="col">Compare on the same set S</th>
            </tr>
          </thead>
          <tbody className="mca-pair">
            {row('f', 'Vector f', settings.f, u0.word, inputMeta(inputValid[0]), 'f')}
            {row('u_0', `${codewordLabels[0]} u0`, u0.word, settings.f, nearestMeta('f', u0, 0))}
          </tbody>
          <tbody className="mca-pair">
            {row('g', 'Vector g', settings.g, u1.word, inputMeta(inputValid[1]), 'g')}
            {row('u_1', `${codewordLabels[1]} u1`, u1.word, settings.g, nearestMeta('g', u1, 1))}
          </tbody>
          <tbody>
            <tr>
              <td colSpan={indices.length + 2} className="mca-alpha-cell">
                <div className="mca-alpha-control">
                  <div className="mca-alpha-value">
                    <MathText>{'\\alpha='}</MathText>
                    <Tape
                      values={[settings.alpha]}
                      q={q}
                      label={`${prefix} alpha`}
                      editable
                      wrapValues
                      hideIndices
                      onChange={(_, alpha) => update({ alpha })}
                    />
                  </div>
                  {alphaChoices ?? (
                    <Slider
                      label="Alpha"
                      value={settings.alpha}
                      max={q - 1}
                      onChange={(alpha) => update({ alpha })}
                    />
                  )}
                  <button
                    className="mca-random"
                    aria-label="Sample random alpha"
                    onClick={() => update({ alpha: Math.floor(Math.random() * q) })}
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
              word,
              c.word,
              <>
                <span>
                  <MathText>{`h=f+${settings.alpha}g`}</MathText>
                </span>
                <small>
                  <MathText>{`\\delta(h,C)=\\frac{${nearestDistance}}{${domain.length}}`}</MathText>
                </small>
              </>,
            )}
            {row(
              'c',
              `${codewordLabels[2]} c`,
              c.word,
              word,
              <>
                <span>
                  {codewordLabels[2]}:{' '}
                  <MathText>{`p(X)=${polynomialTex(c.coefficients)}`}</MathText>
                </span>
                <small className="mca-text-match">
                  <MathText>{'h|_S=c|_S'}</MathText>
                  {(c.count ?? 1) > 1 && ` · ${c.count} equally near`}
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
                  aria-label={`x = ${domain[i]} ${support.includes(i) ? 'in S' : 'outside S'}`}
                >
                  {support.includes(i) ? '✓' : '—'}
                </td>
              ))}
              <td className="mca-row-meta">
                {support.length} of {domain.length} points · need at least {minAgreement}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="mca-support-summary">
        <div className="mca-domain-sets">
          <MathText>{`D=\\{${domain.join(',')}\\}`}</MathText>
          <div>
            <MathText>{`S=\\{${support.map((i) => domain[i]).join(',')}\\}`}</MathText>
            <MathText>{'S\\subseteq D'}</MathText>
          </div>
        </div>
      </div>
    </>
  );
}
