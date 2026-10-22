import { ArrowDown, ArrowRight, Plus, Minus } from 'lucide-react';
import { MathText } from '../components/Math';
import { Tape } from '../components/Tape';
import { Stat } from '../components/Controls';
import { columnAgreement, interleave } from '../core/agreement';
import { mod, polynomialTex } from '../core/math';
import { useExperiment } from '../state/ExperimentContext';
import './ResearchLessons.css';

export default function InterleavedRS() {
  const { experiment: e, patch, setExample } = useExperiment();
  const settings = e.interleaving ?? {
    messages: [
      [1, 1],
      [2, 0, 1],
    ],
    errors: [[], [], []],
    column: 2,
    corrupt: false,
  };
  const update = (change: Partial<typeof settings>) =>
    patch({ interleaving: { ...settings, ...change } });
  const messages = [
    e.coefficients,
    ...settings.messages.map((row) =>
      Array.from({ length: e.coefficients.length }, (_, j) => row[j] ?? 0),
    ),
  ];
  const { rows, columns } = interleave(messages, e.n, e.q);
  const received = rows.map((row, j) =>
    row.map((value, x) =>
      settings.corrupt && settings.errors[j]?.includes(x) ? mod(value + 1, e.q) : value,
    ),
  );
  const agreement = columnAgreement(rows, received);
  const selected = Math.min(settings.column, e.n - 1);
  const symbolErrors = rows.reduce(
    (count, row, j) => count + row.filter((value, x) => value !== received[j][x]).length,
    0,
  );
  const editMessage = (j: number, index: number, value: number) => {
    const message = messages[j].map((a, i) => (i === index ? value : a));
    if (j === 0) setExample(message, e.n);
    else update({ messages: settings.messages.map((row, i) => (i === j - 1 ? message : row)) });
  };
  const tuple = (values: number[]) => `\\begin{pmatrix}${values.join('\\\\')}\\end{pmatrix}`;
  return (
    <div className="research-lesson">
      <div className="research-heading">
        <h2>Encode across. Read down.</h2>
        <p>
          Each message becomes an RS row on the same evaluation points. Read a column as one symbol:
          the whole matrix is one interleaved codeword.
        </p>
      </div>
      <section className="research-panel" aria-label="Interleaved encoder">
        <div className="research-toolbar">
          <div className="view-switch" role="group" aria-label="Matrix view">
            <button aria-pressed={!settings.corrupt} onClick={() => update({ corrupt: false })}>
              Encode
            </button>
            <button aria-pressed={settings.corrupt} onClick={() => update({ corrupt: true })}>
              Compare errors
            </button>
          </div>
          <div className="row-count">
            <span>{messages.length} rows</span>
            <button
              className="icon-button"
              aria-label="Remove message row"
              disabled={messages.length <= 2}
              onClick={() =>
                update({
                  messages: settings.messages.slice(0, -1),
                  errors: settings.errors.slice(0, -1),
                })
              }
            >
              <Minus size={16} />
            </button>
            <button
              className="icon-button"
              aria-label="Add message row"
              disabled={messages.length >= 4}
              onClick={() =>
                update({
                  messages: [...settings.messages, [messages.length]],
                  errors: [...settings.errors, []],
                })
              }
            >
              <Plus size={16} />
            </button>
          </div>
        </div>
        <div
          className="research-scroll"
          tabIndex={0}
          role="region"
          aria-label="Messages, polynomials and evaluation matrix"
        >
          <table className="interleave-table">
            <thead>
              <tr>
                <th scope="col">Message · {e.coefficients.length} coefficients</th>
                <th scope="col">Polynomial</th>
                <th scope="col">
                  <span className="sr-only">Evaluate</span>
                </th>
                {columns.map((_, x) => (
                  <th scope="col" key={x} className={selected === x ? 'column-selected' : ''}>
                    <button
                      aria-label={`Inspect column ${x + 1}`}
                      aria-pressed={selected === x}
                      onClick={() => update({ column: x })}
                    >
                      <MathText>{`x=${x}`}</MathText>
                    </button>
                  </th>
                ))}
                {settings.corrupt && <th scope="col">Agrees</th>}
              </tr>
            </thead>
            <tbody>
              {messages.map((message, j) => (
                <tr key={j}>
                  <td>
                    <Tape
                      values={message}
                      q={e.q}
                      label={`Message row ${j + 1}`}
                      editable
                      coefficientLabels
                      compact
                      onChange={(i, value) => editMessage(j, i, value)}
                    />
                  </td>
                  <td className="interleave-polynomial">
                    <MathText>{`p_{${j}}(X)=${polynomialTex(message)}`}</MathText>
                  </td>
                  <td className="interleave-arrow">
                    <ArrowRight size={17} />
                  </td>
                  {columns.map((_, x) => {
                    const changed = received[j][x] !== rows[j][x];
                    return (
                      <td key={x} className={selected === x ? 'column-selected' : ''}>
                        <button
                          className={`matrix-cell ${changed ? 'cell-error' : ''}`}
                          aria-label={`${settings.corrupt ? 'Toggle error' : 'Inspect'} row ${j + 1}, column ${x + 1}, value ${received[j][x]}${changed ? ', changed from ' + rows[j][x] : ''}`}
                          aria-pressed={settings.corrupt ? changed : selected === x}
                          onClick={() =>
                            update({
                              column: x,
                              ...(settings.corrupt
                                ? {
                                    errors: settings.errors.map((row, i) =>
                                      i !== j
                                        ? row
                                        : row.includes(x)
                                          ? row.filter((a) => a !== x)
                                          : [...row, x],
                                    ),
                                  }
                                : {}),
                            })
                          }
                        >
                          {changed && <del>{rows[j][x]}</del>}
                          <span>{received[j][x]}</span>
                        </button>
                      </td>
                    );
                  })}
                  {settings.corrupt && (
                    <td className="row-agreement">
                      {agreement.rowSupports[j].length}/{e.n}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th colSpan={3} scope="row">
                  {settings.corrupt ? 'Every row agrees here' : 'Read each column as one symbol'}
                </th>
                {columns.map((_, x) => (
                  <td
                    key={x}
                    className={`${selected === x ? 'column-selected' : ''} ${agreement.commonSupport.includes(x) ? 'column-agrees' : 'column-disagrees'}`}
                  >
                    {settings.corrupt ? (
                      <span
                        aria-label={`Column ${x + 1} ${agreement.commonSupport.includes(x) ? 'agrees' : 'differs'}`}
                      >
                        {agreement.commonSupport.includes(x) ? '✓' : '≠'}
                      </span>
                    ) : (
                      <ArrowDown size={15} />
                    )}
                  </td>
                ))}
                {settings.corrupt && (
                  <td>
                    {agreement.commonSupport.length}/{e.n}
                  </td>
                )}
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="table-scroll-hint">Swipe across the table to see the evaluation columns →</p>
        <div className="interleave-output">
          <div>
            <span className="eyebrow">
              Column {selected + 1} · x = {selected}
            </span>
            <div className="column-tuples">
              <MathText>{`c_{${selected}}=${tuple(columns[selected])}`}</MathText>
              {settings.corrupt && (
                <>
                  <span>{agreement.commonSupport.includes(selected) ? '=' : '≠'}</span>
                  <MathText>{`w_{${selected}}=${tuple(received.map((row) => row[selected]))}`}</MathText>
                </>
              )}
            </div>
          </div>
          <div className="column-explanation">
            <strong>
              {settings.corrupt
                ? agreement.commonSupport.includes(selected)
                  ? 'This column contributes 0 errors.'
                  : 'This column contributes 1 error.'
                : `${e.n} symbols, each with ${messages.length} entries.`}
            </strong>
            <p>
              {settings.corrupt ? (
                'One changed entry or several: an unequal column counts once.'
              ) : (
                <>
                  The alphabet is <MathText>{`\\mathbb F_{${e.q}}^{${messages.length}}`}</MathText>.
                  Stacking rows changes what a symbol contains; the word still has length {e.n}.
                </>
              )}
            </p>
          </div>
        </div>
      </section>
      {settings.corrupt ? (
        <>
          <div className="research-toolbar error-presets">
            <span>One changed entry per row:</span>
            <button
              className="subtle-button"
              onClick={() => update({ errors: messages.map(() => [0]), column: 0 })}
            >
              Same column
            </button>
            <button
              className="subtle-button"
              onClick={() => update({ errors: messages.map((_, j) => [j % e.n]), column: 0 })}
            >
              Different columns
            </button>
            <button
              className="text-button"
              onClick={() => update({ errors: messages.map(() => []) })}
            >
              Restore
            </button>
          </div>
          <div className="research-stats" aria-live="polite">
            <Stat
              label="Changed entries"
              value={<span data-testid="entry-errors">{symbolErrors}</span>}
            />
            <Stat
              label="Column distance"
              value={<span data-testid="column-errors">{agreement.errors}</span>}
              detail="Count unequal tuples"
            />
            <Stat
              label="Common agreement"
              value={
                <span>
                  {agreement.commonSupport.length}/{e.n}
                </span>
              }
              detail="Positions where every row agrees"
            />
          </div>
        </>
      ) : (
        <p className="research-caption">
          Edit any message above. The first row shares the polynomial from the earlier steps. Switch
          to “Compare errors” to see why shared positions matter.
        </p>
      )}
    </div>
  );
}
