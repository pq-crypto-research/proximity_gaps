import { lazy, Suspense, useEffect, useState, type MouseEvent } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, Copy, RotateCcw, X } from 'lucide-react';
import { lessons } from './lessons/registry';
import { useExperiment } from './state/ExperimentContext';
import { experimentUrl, type LessonId } from './state/model';
import { polynomialTex, SUPPORTED_FIELDS } from './core/math';
import { MathText } from './components/Math';
import { FurtherReading } from './components/FurtherReading';

const NotesDialog = lazy(() => import('./components/NotesDialog'));

export default function App() {
  const {
    lesson: lessonId,
    experiment: e,
    navigationExperiment,
    notice,
    navigate,
    reset,
    setField,
    notify,
  } = useExperiment();
  const [notesOpen, setNotesOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyFallback, setCopyFallback] = useState('');
  const lessonIndex = lessons.findIndex((item) => item.id === lessonId);
  const lesson = lessons[lessonIndex];
  const Lesson = lesson.component;
  const binary = lessonId === 'hamming-ball';
  const proofLesson = lessonId === 'codes-to-proofs';
  const introductoryLesson = lessonIndex < 2;
  const next = lessons[lessonIndex + 1];
  const previous = lessons[lessonIndex - 1];
  useEffect(() => {
    document.title = `${lesson.shortTitle} · Reed–Solomon Visual Lab`;
  }, [lesson]);
  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2500);
    return () => window.clearTimeout(timer);
  }, [copied]);
  const follow = (event: MouseEvent<HTMLAnchorElement>, id: LessonId) => {
    if (
      event.button === 0 &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.shiftKey &&
      !event.altKey
    ) {
      event.preventDefault();
      navigate(id);
    }
  };
  const copy = async () => {
    const url = new URL(experimentUrl(lessonId, e), window.location.origin).href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopyFallback(url);
    }
  };
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to experiment
      </a>
      <aside className="sidebar">
        <a
          className="brand"
          aria-label="Reed–Solomon Visual Lab, first experiment"
          href={experimentUrl('tape-polynomial', navigationExperiment)}
          onClick={(event) => follow(event, 'tape-polynomial')}
        >
          <div className="brand-symbol">
            <MathText>{'p(X)'}</MathText>
          </div>
          <div>
            <span className="brand-title">Reed–Solomon</span>
            <span className="brand-subtitle">VISUAL LAB</span>
          </div>
        </a>
        <div className="sidebar-intro">Reed Solomon codes visualized</div>
        <nav aria-label="Experiments">
          {[...new Set(lessons.map((item) => item.group))].map((group) => (
            <div className="nav-group" key={group}>
              <span className="nav-group-title">{group}</span>
              {lessons
                .filter((item) => item.group === group)
                .map((item) => (
                  <a
                    key={item.id}
                    className={`nav-item ${lessonId === item.id ? 'active' : ''}`}
                    aria-label={`${item.number} ${item.shortTitle}`}
                    aria-current={lessonId === item.id ? 'page' : undefined}
                    href={experimentUrl(item.id, item.id === lessonId ? e : navigationExperiment)}
                    onClick={(event) => follow(event, item.id)}
                  >
                    <span className="nav-number">{item.number}</span>
                    <span>{item.shortTitle}</span>
                    {lessonId === item.id && <span className="nav-active-dot" />}
                  </a>
                ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-rule" />
          <a className="text-button" href="#further-reading">
            Further reading <ArrowRight size={13} aria-hidden="true" />
          </a>
          <span className="version-label">AN INTERACTIVE NOTEBOOK · 0.1</span>
        </div>
      </aside>
      <div className="main-column">
        <div className="mobile-navigation">
          <label htmlFor="mobile-lesson">Experiment</label>
          <select
            id="mobile-lesson"
            value={lessonId}
            onChange={(event) => navigate(event.target.value as LessonId)}
          >
            {lessons.map((item) => (
              <option key={item.id} value={item.id}>
                {item.number} · {item.shortTitle}
              </option>
            ))}
          </select>
        </div>
        <main id="main" tabIndex={-1} className="main-content">
          <h1 className="sr-only">{lesson.shortTitle}</h1>
          <div className="chapter-line">
            <span className="chapter-tag">EXPERIMENT {lesson.number}</span>
            <span className="chapter-rule" />
          </div>
          <div className="parameter-strip">
            {lesson.parameterMode === 'linear-combination' ? (
              <>
                <span>
                  <MathText>{'\\mathbb F_{17}'}</MathText>
                  <span className="parameter-percent">arithmetic modulo 17</span>
                </span>
                <span>
                  <MathText>{'k=2,\\ n=8'}</MathText>
                </span>
                <span>
                  <MathText>{'\\deg p < 2'}</MathText>
                  <span className="parameter-percent">linear polynomials</span>
                </span>
              </>
            ) : lesson.parameterMode === 'mca' ? (
              <>
                <span>
                  <MathText>{'\\mathbb F_5^5'}</MathText>
                  <span className="parameter-percent">exact toy model</span>
                </span>
                <span>
                  <MathText>{'k=2,\\ n=5'}</MathText>
                </span>
                <span>25 codewords</span>
                <span>
                  <MathText>{'\\gamma \\in \\mathbb F_5'}</MathText>
                  <span className="parameter-percent">5 equally likely choices</span>
                </span>
              </>
            ) : binary ? (
              <>
                <span className="parameter-field">
                  <MathText>{'\\{0,1\\}^5'}</MathText>
                  <span>binary words</span>
                </span>
                <span>
                  <MathText>n=5</MathText>
                </span>
                <span>32 possible words</span>
              </>
            ) : (
              <>
                <label className="parameter-field">
                  <span className="muted">Field</span>
                  <select
                    aria-label="Load field preset"
                    value={e.q}
                    onChange={(event) => setField(Number(event.target.value))}
                  >
                    {SUPPORTED_FIELDS.map((q) => (
                      <option value={q} key={q}>
                        F{q === 17 ? '₁₇' : q === 7 ? '₇' : '₅'}
                      </option>
                    ))}
                  </select>
                </label>
                {!proofLesson && (
                  <>
                    <span className={introductoryLesson ? 'parameter-definition' : undefined}>
                      <MathText>{`k=${e.coefficients.length}`}</MathText>
                      {introductoryLesson && (
                        <span className="parameter-meaning">message length</span>
                      )}
                    </span>
                    <span className={introductoryLesson ? 'parameter-definition' : undefined}>
                      <MathText>{`n=${e.n}`}</MathText>
                      {introductoryLesson && (
                        <span className="parameter-meaning">evaluation points</span>
                      )}
                    </span>
                    {lessonId !== 'tape-polynomial' && (
                      <span>
                        <MathText>{`\\rho=\\frac{${e.coefficients.length}}{${e.n}}`}</MathText>
                        <span className="parameter-percent">
                          {((e.coefficients.length / e.n) * 100).toFixed(1)}%
                        </span>
                      </span>
                    )}
                  </>
                )}
                {lessonId === 'tape-polynomial' ? (
                  <span className="parameter-note">Arithmetic modulo {e.q}</span>
                ) : (
                  <span className="parameter-polynomial">
                    <span className="muted">
                      {lessonId === 'interleaved-rs'
                        ? 'First row'
                        : proofLesson
                          ? "Prover's polynomial"
                          : lessonId === 'decoding-radius' || lessonId === 'hamming-distance'
                            ? 'Reference polynomial'
                            : 'Polynomial'}
                    </span>
                    <MathText>{'p(X)=' + polynomialTex(e.coefficients)}</MathText>
                  </span>
                )}
              </>
            )}
          </div>
          <div className="lesson-body">
            <Suspense
              fallback={
                <div className="lesson-loading" role="status">
                  Preparing the experiment…
                </div>
              }
            >
              <Lesson />
            </Suspense>
          </div>
          <div className="lesson-source">
            <span>{lesson.question}</span>
            <button className="text-button" onClick={() => setNotesOpen(true)}>
              Explore the definition <ArrowUpRight size={14} />
            </button>
          </div>
          <footer className={`lesson-footer${previous ? '' : ' lesson-footer-first'}`}>
            {previous && (
              <a
                className="previous-link"
                href={experimentUrl(previous.id, navigationExperiment)}
                onClick={(event) => follow(event, previous.id)}
              >
                <ArrowLeft size={16} />
                <span>
                  Previous<span>{previous.shortTitle}</span>
                </span>
              </a>
            )}
            <div className="footer-actions">
              <button className="text-button" onClick={reset} title="Reset all experiments">
                <RotateCcw size={14} /> Reset
              </button>
              <button className="text-button" onClick={copy}>
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Copied' : 'Copy link'}
              </button>
            </div>
            {next ? (
              <a
                className="next-link"
                href={experimentUrl(next.id, navigationExperiment)}
                onClick={(event) => follow(event, next.id)}
              >
                <span>
                  Next experiment<strong>{next.shortTitle}</strong>
                </span>
                <ArrowRight size={18} />
              </a>
            ) : (
              <div className="sequence-complete">
                <Check size={16} />
                <span>
                  {lessons.length} ideas explored.
                  <br />
                  <strong>Keep experimenting.</strong>
                </span>
              </div>
            )}
          </footer>
          {copyFallback && (
            <div className="copy-fallback">
              <label htmlFor="share-url">Copy this experiment URL</label>
              <input
                id="share-url"
                readOnly
                value={copyFallback}
                onFocus={(event) => event.currentTarget.select()}
              />
              <button
                className="icon-button"
                aria-label="Close copy link"
                onClick={() => setCopyFallback('')}
              >
                <X size={16} />
              </button>
            </div>
          )}
          <FurtherReading />
        </main>
      </div>
      {notice && (
        <div className="toast" role="status">
          <span>{notice}</span>
          <button
            className="icon-button"
            aria-label="Dismiss notification"
            onClick={() => notify('')}
          >
            <X size={14} />
          </button>
        </div>
      )}
      {notesOpen && (
        <Suspense
          fallback={
            <div className="toast" role="status">
              Opening the definition…
            </div>
          }
        >
          <NotesDialog
            section={lesson.noteSection}
            source={lesson.noteSource}
            onClose={() => setNotesOpen(false)}
          />
        </Suspense>
      )}
    </div>
  );
}
