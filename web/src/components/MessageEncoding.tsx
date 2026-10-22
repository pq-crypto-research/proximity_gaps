import { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowRight,
  Check,
  GripVertical,
  Minus,
  Plus,
  RotateCcw,
  Shuffle,
} from 'lucide-react';
import {
  asciiSymbol,
  DEFAULT_MESSAGE,
  MESSAGE_K,
  MESSAGE_MAX_N,
  MESSAGE_POINTS,
  MESSAGE_Q,
  messageCodeword,
  messagePolynomial,
  parseMessageSymbol,
  type MessageSettings,
} from '../core/message';
import { evaluate, polynomialTex } from '../core/math';
import { useExperiment } from '../state/ExperimentContext';
import { MathText } from './Math';
import { MessageTransmission } from './MessageTransmission';
import './MessageEncoding.css';

function MessageCell({
  value,
  index,
  onChange,
  onText,
  inputRef,
}: {
  value: number;
  index: number;
  onChange: (value: number) => void;
  onText: (text: string) => void;
  inputRef: (input: HTMLInputElement | null) => void;
}) {
  const [draft, setDraft] = useState(String(value));
  const source = useRef(value);
  useEffect(() => {
    if (value !== source.current) setDraft(String(value));
    source.current = value;
  }, [value]);
  const finish = () => setDraft(String(parseMessageSymbol(draft) ?? value));
  const symbol = asciiSymbol(value);
  return (
    <div className="message-symbol">
      <label htmlFor={'message-symbol-' + index}>
        <MathText>{'x=' + index}</MathText>
      </label>
      <input
        ref={inputRef}
        id={'message-symbol-' + index}
        aria-label={'Message, position ' + (index + 1)}
        aria-describedby="message-input-help"
        aria-invalid={parseMessageSymbol(draft) === null}
        type="text"
        autoComplete="off"
        spellCheck={false}
        value={draft}
        onFocus={(event) => event.currentTarget.select()}
        onPaste={(event) => {
          const text = event.clipboardData.getData('text');
          if (text.length > 1 && /[^\d\s+-]/.test(text) && /^[\x20-\x7e]+$/.test(text)) {
            event.preventDefault();
            onText(text);
          }
        }}
        onChange={(event) => {
          const raw = event.target.value;
          const inserted = (event.nativeEvent as InputEvent).data;
          const text = inserted && /^[a-zA-Z]+$/.test(inserted) ? inserted : raw;
          if (/^[a-zA-Z]+$/.test(text)) {
            setDraft(String(text.charCodeAt(0)));
            onText(text);
            return;
          }
          setDraft(raw);
          const parsed = parseMessageSymbol(raw);
          if (parsed !== null) {
            source.current = parsed;
            onChange(parsed);
          }
        }}
        onBlur={finish}
        onKeyDown={(event) => {
          if (
            /^[a-zA-Z]$/.test(event.key) &&
            !event.ctrlKey &&
            !event.metaKey &&
            !event.altKey &&
            !event.nativeEvent.isComposing
          ) {
            event.preventDefault();
            setDraft(String(event.key.charCodeAt(0)));
            onText(event.key);
            return;
          }
          if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
            event.preventDefault();
            finish();
          }
        }}
      />
      <span className="message-ascii">
        {symbol ? (
          <>
            <b>{symbol}</b> · ASCII {value}
          </>
        ) : value < 128 ? (
          'ASCII control ' + value
        ) : (
          'Field element'
        )}
      </span>
    </div>
  );
}

export function MessageEncoding({ withCodeword = false }: { withCodeword?: boolean }) {
  const { experiment, patch, navigate } = useExperiment();
  const settings = experiment.message ?? DEFAULT_MESSAGE;
  const { values, n } = settings;
  const polynomial = messagePolynomial(values);
  const word = messageCodeword(values, n);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const viewport = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; n: number; scroll: number } | null>(null);
  const update = (change: Partial<MessageSettings>) =>
    patch({
      message: {
        ...settings,
        ...change,
        ...(change.values && settings.channel
          ? { channel: { ...settings.channel, received: undefined } }
          : {}),
      },
    });
  const enterText = (index: number, text: string) => {
    const characters = [...text].slice(0, MESSAGE_K - index);
    const next = [...values];
    characters.forEach((character, offset) => {
      next[index + offset] = character.charCodeAt(0);
    });
    update({ values: next });
    const destination = Math.min(index + characters.length, MESSAGE_K - 1);
    inputs.current[destination]?.focus();
    inputs.current[destination]?.select();
  };
  const resize = (length: number) => {
    const next = Math.max(MESSAGE_K, Math.min(MESSAGE_MAX_N, length));
    const { kept: _legacy, ...current } = settings;
    patch({
      message: {
        ...current,
        n: next,
        ...(current.channel
          ? {
              channel: {
                ...current.channel,
                count: Math.min(current.channel.count, next),
                received: undefined,
              },
            }
          : {}),
      },
    });
  };

  return (
    <div className={'message-lesson' + (withCodeword ? ' message-encoding-lesson' : '')}>
      <header className="message-heading">
        <h2>{withCodeword ? 'Message to codeword' : 'Message interpolation'}</h2>
        <p>
          {withCodeword
            ? 'Same message. Same polynomial. More evaluations to protect your data.'
            : 'Five values determine one polynomial of degree less than five. Change a value and watch it update.'}
        </p>
      </header>
      <section
        className="experiment-panel message-workbench"
        aria-label={withCodeword ? 'Message to codeword' : 'Message interpolation'}
      >
        <div className="message-stage">
          <div className="message-stage-heading">
            <h3>
              <span className="message-step">1</span> Message <MathText>m</MathText>
            </h3>
            <div className="message-actions">
              <button
                className="text-button"
                onClick={() =>
                  update({
                    values: Array.from({ length: MESSAGE_K }, () =>
                      Math.floor(Math.random() * MESSAGE_Q),
                    ),
                  })
                }
              >
                <Shuffle size={13} /> Random message
              </button>
              <button
                className="text-button"
                onClick={() => update({ values: [...DEFAULT_MESSAGE.values] })}
              >
                <RotateCcw size={13} /> Use Hello
              </button>
            </div>
          </div>
          <div className="message-input-tape" role="group" aria-label="Message values">
            <span className="message-vector-label">
              <MathText>{'m='}</MathText>
            </span>
            {values.map((value, index) => (
              <MessageCell
                key={index}
                value={value}
                index={index}
                inputRef={(input) => {
                  inputs.current[index] = input;
                }}
                onText={(text) => enterText(index, text)}
                onChange={(next) =>
                  update({ values: values.map((old, i) => (i === index ? next : old)) })
                }
              />
            ))}
          </div>
          <p className="message-help" id="message-input-help">
            Type letters to fill the next boxes, or paste a word. H → ASCII 72. Numbers wrap modulo
            257. Always 5 symbols.
          </p>
        </div>
        <div className="message-transition">
          <ArrowDown size={14} /> Lagrange interpolation
        </div>
        <div className="message-stage message-polynomial-stage">
          <div className="message-stage-heading">
            <h3>
              <span className="message-step">2</span> Polynomial
            </h3>
            <span className="message-degree">
              <MathText>{'\\deg p < 5'}</MathText>
            </span>
          </div>
          <div
            className="message-polynomial"
            aria-label={'Interpolated polynomial: ' + polynomialTex(polynomial)}
          >
            <MathText>{'p(X)=' + polynomialTex(polynomial) + '\\pmod{257}'}</MathText>
          </div>
          {!withCodeword && (
            <div
              className="message-matches"
              role="group"
              aria-label="The polynomial matches the message"
            >
              {MESSAGE_POINTS.map((point) => (
                <span key={point}>
                  <Check size={12} />
                  <MathText>
                    {'p(' + point + ')=' + evaluate(polynomial, point, MESSAGE_Q)}
                  </MathText>
                </span>
              ))}
            </div>
          )}
        </div>
        {withCodeword ? (
          <>
            <div className="message-transition">
              <ArrowDown size={14} /> Evaluate at more points
            </div>
            <div className="message-stage message-codeword-stage">
              <div className="message-stage-heading">
                <h3>
                  <span className="message-step">3</span> Valid codeword <MathText>c</MathText>
                </h3>
                <div className="message-length">
                  <button
                    className="icon-button"
                    aria-label="Decrease evaluation points"
                    disabled={n === MESSAGE_K}
                    onClick={() => resize(n - 1)}
                  >
                    <Minus size={14} />
                  </button>
                  <span>
                    <MathText>{'n=' + n}</MathText>
                  </span>
                  <button
                    className="icon-button"
                    aria-label="Increase evaluation points"
                    disabled={n === MESSAGE_MAX_N}
                    onClick={() => resize(n + 1)}
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
              <div className="message-output-scroll" ref={viewport}>
                <div className="message-output-tape" role="group" aria-label="Codeword">
                  <span className="message-vector-label">
                    <MathText>{'c='}</MathText>
                  </span>
                  {word.map((value, index) => (
                    <div key={index} className="message-output-symbol is-kept">
                      <span className="message-point">
                        <MathText>{'x=' + index}</MathText>
                      </span>
                      <button
                        aria-label={'Codeword, position ' + (index + 1) + ', value ' + value}
                        title={'p(' + index + ') = ' + value}
                      >
                        {value}
                      </button>
                    </div>
                  ))}
                  <div
                    className="message-resize-handle"
                    role="slider"
                    tabIndex={0}
                    aria-label="Evaluation points"
                    aria-valuemin={MESSAGE_K}
                    aria-valuemax={MESSAGE_MAX_N}
                    aria-valuenow={n}
                    aria-valuetext={n + ' evaluations; ' + (n - MESSAGE_K) + ' symbols can be lost'}
                    aria-describedby="message-drag-help"
                    onPointerDown={(event) => {
                      if (event.button !== 0) return;
                      event.preventDefault();
                      event.currentTarget.focus();
                      drag.current = {
                        x: event.clientX,
                        n,
                        scroll: viewport.current?.scrollLeft ?? 0,
                      };
                      event.currentTarget.setPointerCapture(event.pointerId);
                    }}
                    onPointerMove={(event) => {
                      if (!drag.current) return;
                      const delta =
                        event.clientX -
                        drag.current.x +
                        (viewport.current?.scrollLeft ?? 0) -
                        drag.current.scroll;
                      resize(drag.current.n + Math.round(delta / 56));
                    }}
                    onPointerUp={(event) => {
                      drag.current = null;
                      if (event.currentTarget.hasPointerCapture(event.pointerId))
                        event.currentTarget.releasePointerCapture(event.pointerId);
                    }}
                    onPointerCancel={() => {
                      drag.current = null;
                    }}
                    onLostPointerCapture={() => {
                      drag.current = null;
                    }}
                    onKeyDown={(event) => {
                      const next = {
                        ArrowRight: n + 1,
                        ArrowUp: n + 1,
                        ArrowLeft: n - 1,
                        ArrowDown: n - 1,
                        Home: MESSAGE_K,
                        End: MESSAGE_MAX_N,
                      }[event.key];
                      if (next !== undefined) {
                        event.preventDefault();
                        resize(next);
                      }
                    }}
                  >
                    <GripVertical size={18} />
                    <span aria-hidden="true">↔</span>
                  </div>
                </div>
              </div>
              <div className="message-output-meta">
                <span id="message-drag-help">
                  Drag the right edge to add evaluations.{' '}
                  <span className="muted">5–24 in this demo.</span>
                </span>
                <MathText>
                  {'D=\\{0,1,\\ldots,' + (n - 1) + '\\},\\quad \\rho=\\frac{5}{' + n + '}'}
                </MathText>
              </div>
            </div>
            <MessageTransmission
              word={word}
              channel={settings.channel}
              onChange={(channel) => update({ channel })}
            />
          </>
        ) : (
          <div className="message-next">
            <p>
              This polynomial passes through all five message values. Extra evaluations will let us
              recover lost data.
            </p>
            <button className="text-button" onClick={() => navigate('evaluation-codeword')}>
              Message to codeword <ArrowRight size={15} />
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
