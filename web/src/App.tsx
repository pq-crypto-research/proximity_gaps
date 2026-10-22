import { Suspense, useEffect, useState, type MouseEvent } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { ArrowRight, Check, Copy, RotateCcw, X } from 'lucide-react';
import { lessons, referencePage } from './lessons/registry';
import { useExperiment } from './state/ExperimentContext';
import { experimentUrl, type LessonId } from './state/model';
import { polynomialTex, SUPPORTED_FIELDS } from './core/math';
import { DEFAULT_MESSAGE } from './core/message';
import { MathText } from './components/Math';

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
  const [copied, setCopied] = useState(false);
  const [copyFallback, setCopyFallback] = useState('');
  const lessonIndex = lessons.findIndex((item) => item.id === lessonId);
  const reference = lessonId === 'further-reading';
  const lesson = reference ? referencePage : lessons[lessonIndex];
  const Lesson = lesson.component;
  const binary = lessonId === 'hamming-ball';
  const proofLesson = lessonId === 'codes-to-proofs';
  const introductoryLesson = lessonId === 'tape-polynomial';
  const message = e.message ?? DEFAULT_MESSAGE;
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
      <Analytics
        mode={import.meta.env.DEV ? 'development' : 'production'}
        debug={false}
        route={`/visuals/${lessonId}`}
        path={`/visuals/${lessonId}`}
      />
      <a className="skip-link" href="#main">
        Skip to experiment
      </a>
      <aside className="sidebar">
        <a
          className="brand"
          aria-label="Reed–Solomon Visual Lab, first experiment"
          href={experimentUrl('message-interpolation', navigationExperiment)}
          onClick={(event) => follow(event, 'message-interpolation')}
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
          <a
            className="text-button reference-nav-link"
            href={experimentUrl('further-reading', navigationExperiment)}
            onClick={(event) => follow(event, 'further-reading')}
            aria-current={reference ? 'page' : undefined}
          >
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
            {[...lessons, referencePage].map((item) => (
              <option key={item.id} value={item.id}>
                {item.number ? `${item.number} · ` : ''}
                {item.shortTitle}
              </option>
            ))}
          </select>
        </div>
        <main id="main" tabIndex={-1} className="main-content">
          <h1 className="sr-only">{lesson.shortTitle}</h1>
          {!reference && (
            <>
              <div className="chapter-line">
                <span className="chapter-tag">EXPERIMENT {lesson.number}</span>
                <span className="chapter-rule" />
                <div className="experiment-actions">
                  <button className="text-button" onClick={reset} title="Reset all experiments">
                    <RotateCcw size={13} /> Reset
                  </button>
                  <button className="text-button" onClick={copy}>
                    {copied ? <Check size={13} /> : <Copy size={13} />}
                    {copied ? 'Copied' : 'Copy link'}
                  </button>
                </div>
              </div>
              <div className="parameter-strip">
                {lesson.parameterMode === 'message' ? (
                  <>
                    <span>
                      <MathText>{'\\mathbb F_{257}'}</MathText>
                      <span className="parameter-percent">arithmetic modulo 257</span>
                    </span>
                    <span>
                      <MathText>k=5</MathText>
                      <span className="parameter-percent">message symbols</span>
                    </span>
                    <span>
                      <MathText>{'\\deg p<5'}</MathText>
                    </span>
                    {lessonId === 'evaluation-codeword' && (
                      <span>
                        <MathText>
                          {'C=\\operatorname{RS}[\\mathbb F_{257},D,5],\\quad n=' + message.n}
                        </MathText>
                      </span>
                    )}
                  </>
                ) : lesson.parameterMode === 'linear-combination' ? (
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
                      <MathText>{'\\mathbb F_{17}'}</MathText>
                      <span className="parameter-percent">arithmetic modulo 17</span>
                    </span>
                    <span>
                      <MathText>{'k=2,\\ n=8'}</MathText>
                    </span>
                    <span>
                      <MathText>{'\\deg p<2'}</MathText>
                    </span>
                    <span>
                      <MathText>{'\\delta=1/4'}</MathText>
                      <span className="parameter-percent">agreement on at least 6 of 8 points</span>
                    </span>
                  </>
                ) : lesson.parameterMode === 'prize' ? (
                  <>
                    <span>
                      <MathText>{'\\mathbb F_5'}</MathText>
                      <span className="parameter-percent">arithmetic modulo 5</span>
                    </span>
                    <span>
                      <MathText>{'k=1,\\ n=4,\\ \\rho=1/4'}</MathText>
                    </span>
                    <span>
                      <MathText>{'D=\\langle2\\rangle,\\ |D|=2^2'}</MathText>
                      <span className="parameter-percent">smooth domain</span>
                    </span>
                    <span>5 codewords</span>
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
            </>
          )}
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
    </div>
  );
}
