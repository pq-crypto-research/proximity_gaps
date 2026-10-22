import { useMemo, useState } from 'react';
import { Shuffle, Sparkles } from 'lucide-react';
import {
  codebook,
  corrupt,
  distance,
  isDefaultExample,
  parameters,
  polynomialTex,
  wordText,
} from '../core/math';
import { listWithoutEnumeration } from '../core/search';
import { useExperiment } from '../state/ExperimentContext';
import { MathText } from '../components/Math';
import { Tape } from '../components/Tape';
import { Definition, Slider, Toggle } from '../components/Controls';
import { WordComparison } from '../components/WordComparison';
import { ListDecodingExplainer } from '../components/ListDecodingExplainer';
import { defaultExperiment } from '../state/model';
import { BallScene } from '../visuals/BallScene';

export default function DecodingRadius() {
  const {
    experiment: e,
    sent,
    errors,
    setErrors,
    patch,
    loadDefault,
    loadPreset,
  } = useExperiment();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(4);
  const k = e.coefficients.length;
  const { t } = parameters(k, e.n);
  const radius = e.linked ? errors : e.radius;
  const book = useMemo(() => codebook(e.q, k, e.n), [e.q, k, e.n]);
  const distances = useMemo(
    () => book?.map((entry) => ({ ...entry, distance: distance(entry.word, e.received) })) ?? null,
    [book, e.received],
  );
  const list = useMemo(
    () =>
      distances
        ? distances
            .filter((entry) => entry.distance <= radius)
            .sort((a, b) => a.distance - b.distance || a.id.localeCompare(b.id))
        : listWithoutEnumeration(e.coefficients, e.received, e.q, radius),
    [distances, radius, e.coefficients, e.received, e.q],
  );
  const reference = {
    id: e.coefficients.join(','),
    coefficients: e.coefficients,
    word: sent,
    distance: errors,
  };
  const closest = useMemo(
    () =>
      distances
        ? [...distances]
            .sort((a, b) => a.distance - b.distance || a.id.localeCompare(b.id))
            .slice(0, 24)
        : [],
    [distances],
  );
  const displayEntries = [
    ...new Map(
      [
        reference,
        ...(list?.slice(0, 24) ?? []),
        ...closest,
        ...(distances
          ?.filter((_, i) => i % Math.max(1, Math.floor(distances.length / 12)) === 0)
          .slice(0, 12) ?? []),
        ...(list?.filter((entry) => entry.id === selectedId) ?? []),
      ].map((entry) => [entry.id, entry]),
    ).values(),
  ];
  const selected =
    displayEntries.find((entry) => entry.id === selectedId) ?? list?.[0] ?? reference;

  return (
    <>
      <ListDecodingExplainer
        k={k}
        n={e.n}
        radius={radius}
        onExample={(count) => {
          const preset = defaultExperiment();
          loadPreset({
            ...preset,
            received: corrupt(preset.received, count, preset.q, 1, true),
            radius: count,
            linked: false,
          });
          setSelectedId(null);
        }}
      />
      <section className="experiment-panel nearby-experiment">
        <div className="panel-topline">
          <span className="micro-label">A TABLE, A RADIUS, A LIST</span>
          <button className="text-button" onClick={() => loadDefault(true)}>
            <Sparkles size={14} /> Three-error example
          </button>
        </div>
        <div className="nearby-received">
          <div className="object-label">
            <MathText>w</MathText>
            <span>Received table</span>
            <span className="muted">Edit a value</span>
          </div>
          <Tape
            values={e.received}
            q={e.q}
            label="Received table"
            editable
            compact
            onChange={(index, value) =>
              patch({ received: e.received.map((a, i) => (i === index ? value : a)) })
            }
          />
        </div>
        <div className="nearby-layout">
          <div className="nearby-visual">
            <BallScene
              label="Reed–Solomon codewords at their exact distances from the received word"
              maxDistance={e.n}
              radius={radius}
              guarantee={t}
              coincidentLabel={errors === 0 ? 'w = c' : undefined}
              points={displayEntries.map((entry, index) => ({
                id: entry.id,
                label: entry.id === reference.id ? 'c' : 'p' + index,
                distance: entry.distance,
                codeword: true,
                emphasis: entry.id === reference.id,
                selected: entry.id === selected.id,
                description:
                  (entry.id === reference.id ? 'Reference codeword, ' : '') +
                  wordText(entry.word) +
                  ', distance ' +
                  entry.distance +
                  (entry.distance <= radius ? ', inside ball' : ', outside ball'),
                onSelect: () => setSelectedId(entry.id),
              }))}
            />
            <div className="legend">
              <span>
                <i className="legend-diamond" /> Codeword
              </span>
              <span>
                <i className="legend-dashed" /> Uniqueness radius t = {t}
              </span>
            </div>
            <p className="diagram-caption">
              {book
                ? displayEntries.length +
                  ' of ' +
                  book.length.toLocaleString() +
                  ' codewords drawn. The count searches all of them.'
                : 'The known reference stays visible. Only established codewords are plotted.'}
            </p>
          </div>
          <div className="nearby-controls">
            <Slider
              label="Search radius"
              value={radius}
              max={e.n}
              onChange={(value) => patch({ radius: value, linked: false })}
              markers={[{ value: t, label: 't = ' + t }]}
            />
            <div className="nearby-count" aria-live="polite">
              <span>Codewords within E = {radius}</span>
              <strong
                data-testid="candidate-count"
                className={list === null ? 'count-unavailable' : ''}
              >
                {list === null ? 'Count unavailable' : list.length.toLocaleString()}
              </strong>
              <MathText>{'\\Lambda(C,w,E)=B(w,E)\\cap C'}</MathText>
            </div>
            {list !== null && list.length > 0 && (
              <p className="list-result-explanation">
                {list.length === 1
                  ? 'Exactly one codeword fits this word and radius.'
                  : 'Each of these codewords fits the budget. The list does not choose one.'}
              </p>
            )}
            {list === null ? (
              <div className="nearby-limit">
                <p>Full search exceeds this demo's limit. This is not an empty list.</p>
                <button className="secondary-button" onClick={() => loadDefault()}>
                  Load a small exact example
                </button>
              </div>
            ) : list.length === 0 ? (
              <p className="nearby-empty">
                No codeword lies within this radius. Increase E to explore.
              </p>
            ) : (
              <div
                className="nearby-candidates"
                role="group"
                aria-label="Nearby candidate polynomials"
              >
                {list.slice(0, visibleCount).map((entry) => (
                  <button
                    key={entry.id}
                    className={
                      'nearby-candidate' + (entry.id === selected.id ? ' is-selected' : '')
                    }
                    onClick={() => setSelectedId(entry.id)}
                    aria-pressed={entry.id === selected.id}
                    aria-label={
                      'Inspect codeword with coefficients ' +
                      entry.coefficients.join(', ') +
                      ', distance ' +
                      entry.distance
                    }
                  >
                    <MathText>{'p(X)=' + polynomialTex(entry.coefficients)}</MathText>
                    <span>
                      Δ = {entry.distance}
                      {entry.id === reference.id ? ' · reference' : ''}
                    </span>
                  </button>
                ))}
                {list.length > visibleCount && (
                  <button
                    className="text-button"
                    onClick={() => setVisibleCount((count) => count + 8)}
                  >
                    Show more · {visibleCount} of {list.length.toLocaleString()}
                  </button>
                )}
              </div>
            )}
            <p className="uniqueness-note">
              {radius <= t
                ? 'E ≤ t: at most one codeword can fit.'
                : 'E > t: several codewords may fit.'}
            </p>
          </div>
        </div>
        <div className="nearby-selected">
          <div className="object-label">
            <span>Selected polynomial</span>
            <MathText>{'p(X)=' + polynomialTex(selected.coefficients)}</MathText>
            <span className="muted">
              Δ = {selected.distance} · {selected.distance <= radius ? 'inside' : 'outside'} the
              ball
            </span>
          </div>
          <Tape
            values={selected.word}
            label="Selected candidate"
            compact
            mismatches={selected.word.flatMap((a, i) => (a !== e.received[i] ? [i] : []))}
          />
        </div>
      </section>
      <Definition title="Change the received table">
        <div className="nearby-change-controls">
          <Slider
            label="Introduced errors"
            value={errors}
            max={e.n}
            onChange={(value) => setErrors(value)}
          />
          <div className="button-row">
            <button
              className="text-button"
              onClick={() => setErrors(errors, (e.seed % 0xfffffffe) + 1)}
            >
              <Shuffle size={14} /> New error pattern
            </button>
            <span className="micro-label">
              {e.pattern === 'ambiguity' && isDefaultExample(e.coefficients, e.n, e.q)
                ? 'Guided ambiguity'
                : 'Seed ' + e.seed}
            </span>
            <Toggle
              label="Search radius follows errors"
              checked={e.linked}
              onChange={(linked) => patch({ linked, radius: errors })}
            />
          </div>
        </div>
        <WordComparison reference={sent} received={e.received} q={e.q} />
        <p>
          The reference c lets you see how changing a table affects its neighbors. A STARK verifier
          is not given a trusted reference polynomial.
        </p>
      </Definition>
    </>
  );
}
