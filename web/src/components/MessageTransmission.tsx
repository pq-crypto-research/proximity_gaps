import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, Check, RotateCcw, Shuffle, TriangleAlert } from 'lucide-react';
import {
  DEFAULT_CHANNEL,
  MESSAGE_K,
  parseMessageSymbol,
  type MessageChannel,
} from '../core/message';
import { decodeCorruptions, transmit, type ReceivedSymbol } from '../core/transmission';
import { polynomialTex } from '../core/math';
import { Slider, Toggle } from './Controls';
import { MathText } from './Math';
import './MessageTransmission.css';

function ReceivedCell({
  value,
  index,
  onChange,
}: {
  value: ReceivedSymbol;
  index: number;
  onChange: (value: ReceivedSymbol) => void;
}) {
  const [draft, setDraft] = useState(value === null ? '' : String(value));
  const source = useRef(value);
  useEffect(() => {
    if (value !== source.current) setDraft(value === null ? '' : String(value));
    source.current = value;
  }, [value]);
  const finish = () => setDraft(value === null ? '' : String(value));
  return (
    <input
      className="transmission-cell"
      aria-label={'Received, position ' + (index + 1)}
      aria-describedby="received-input-help"
      aria-invalid={draft !== '' && parseMessageSymbol(draft) === null}
      type="text"
      autoComplete="off"
      spellCheck={false}
      placeholder="×"
      value={draft}
      onFocus={(event) => event.currentTarget.select()}
      onChange={(event) => {
        const raw = event.target.value;
        setDraft(raw);
        const parsed = raw === '' ? null : parseMessageSymbol(raw);
        if (raw === '' || parsed !== null) {
          source.current = parsed;
          onChange(parsed);
        }
      }}
      onBlur={finish}
      onKeyDown={(event) => {
        if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
          event.preventDefault();
          finish();
        }
      }}
    />
  );
}

export function MessageTransmission({
  word,
  channel,
  onChange,
}: {
  word: number[];
  channel?: MessageChannel;
  onChange: (channel: MessageChannel) => void;
}) {
  const settings = channel ?? DEFAULT_CHANNEL;
  const { mode, seed } = settings;
  const count = Math.min(settings.count, word.length);
  const [reveal, setReveal] = useState(false);
  const loss = mode === 'loss';
  const received = useMemo(
    () => settings.received ?? transmit(word, { mode, seed, count }),
    [word, mode, seed, count, settings.received],
  );
  // Only received values enter the decoder. It gets neither the message nor damage locations.
  const decoded = useMemo(() => decodeCorruptions(received), [received]);
  const missing = received.filter((value) => value === null).length;
  const errors = received.filter((value, i) => value !== null && value !== word[i]).length;
  const custom = settings.received !== undefined;
  const budget = word.length - MESSAGE_K;
  const cost = missing + 2 * errors;
  const guaranteed = cost <= budget;
  const limit = Math.max(0, Math.floor((budget - missing) / 2));
  const survivors = word.length - missing;
  const update = (change: Partial<MessageChannel>) => onChange({ mode, seed, count, ...change });
  const edit = (index: number, value: ReceivedSymbol) => {
    const next = received.map((old, i) => (i === index ? value : old));
    const nextMode = value !== null && value !== word[index] ? 'errors' : mode;
    update({
      received: next,
      mode: nextMode,
      count: next.filter((value, i) =>
        nextMode === 'loss' ? value === null : value !== null && value !== word[i],
      ).length,
    });
  };

  return (
    <>
      <div className="message-transition">
        <ArrowDown size={14} /> Send through a noisy channel
      </div>
      <div className="message-stage transmission-stage">
        <div className="message-stage-heading">
          <h3>
            <span className="message-step">4</span> What arrives?
          </h3>
          <div className="transmission-modes" role="group" aria-label="Channel damage type">
            <button
              aria-pressed={loss}
              onClick={() => update({ mode: 'loss', received: undefined })}
            >
              Missing symbols
            </button>
            <button
              aria-pressed={!loss}
              onClick={() => update({ mode: 'errors', received: undefined })}
            >
              Wrong values
            </button>
          </div>
        </div>
        <div className="transmission-controls">
          <Slider
            label={loss ? 'Lost symbols' : 'Corrupted symbols'}
            value={count}
            max={word.length}
            onChange={(count) => update({ count, received: undefined })}
          />
          <button
            className="text-button"
            onClick={() => {
              const fresh = Math.floor(Math.random() * 0xffffffff) + 1;
              update({
                seed: fresh === seed ? (seed % 0xffffffff) + 1 : fresh,
                received: undefined,
              });
            }}
          >
            <Shuffle size={13} /> Randomize positions
          </button>
        </div>
        <div className="transmission-explanation">
          <span>
            {custom
              ? `Edited received vector: ${missing} missing, ${errors} wrong. Error locations are hidden from the decoder.`
              : loss
                ? 'Symbols disappear at random positions. The receiver knows where the holes are.'
                : 'Values change at random positions. The receiver is not told which ones are wrong.'}
          </span>
          {(!loss || custom) && (
            <Toggle label="Reveal changed positions" checked={reveal} onChange={setReveal} />
          )}
        </div>
        <div className="message-output-scroll">
          <div className="message-output-tape" role="group" aria-label="Received word">
            <span className="message-vector-label">
              <MathText>{'w='}</MathText>
            </span>
            {received.map((value, index) => (
              <div
                key={index}
                className={
                  'message-output-symbol transmission-symbol ' +
                  (value === null
                    ? 'is-missing'
                    : reveal && value !== word[index]
                      ? 'is-corrupt'
                      : loss && !custom
                        ? 'is-present'
                        : '')
                }
              >
                <span className="message-point">
                  <MathText>{'x=' + index}</MathText>
                </span>
                <ReceivedCell
                  value={value}
                  index={index}
                  onChange={(value) => edit(index, value)}
                />
              </div>
            ))}
          </div>
        </div>
        <div className="transmission-edit-help">
          <span id="received-input-help">
            Edit any value. Clear a cell to mark it missing. Integers wrap modulo 257.
          </span>
          <button className="text-button" onClick={() => update({ count: 0, received: undefined })}>
            <RotateCcw size={12} /> Restore sent vector
          </button>
        </div>
        <div className={'transmission-budget ' + (guaranteed ? '' : 'is-exceeded')}>
          <div className="transmission-budget-title">
            <span>
              Redundancy budget <MathText>{'n-k=' + budget}</MathText>
            </span>
            <strong>
              {cost} / {budget} used
            </strong>
          </div>
          <div
            className="transmission-budget-slots"
            role="img"
            aria-label={cost + ' of ' + budget + ' redundancy units used'}
          >
            {Array.from({ length: Math.max(budget, cost) }, (_, i) => (
              <span
                key={i}
                className={
                  (i < cost ? 'is-used' : '') +
                  (i >= budget ? ' is-overflow' : '') +
                  (i >= missing && i < cost && (i - missing) % 2 === 1 ? ' pair-end' : '')
                }
              />
            ))}
            {budget === 0 && cost === 0 && (
              <span className="no-redundancy">
                No spare evaluations yet — drag the codeword’s edge to add some.
              </span>
            )}
          </div>
          <p>
            {missing > 0 && errors > 0 ? (
              <>
                <strong>
                  {missing} missing + 2 × {errors} wrong = {cost} units.
                </strong>{' '}
                Recovery is guaranteed when <MathText>{'s+2e\\le n-k'}</MathText>.
              </>
            ) : loss && errors === 0 ? (
              <>
                <strong>1 missing symbol uses 1 unit.</strong> Keep any 5 correct evaluations to
                reconstruct the polynomial.
              </>
            ) : (
              <>
                <strong>1 unknown error uses 2 units.</strong> The receiver must locate the bad
                positions as well as correct their values.
              </>
            )}
          </p>
        </div>
      </div>
      <div
        className={
          'transmission-result ' + (guaranteed && decoded ? 'is-recovered' : 'is-uncertain')
        }
        aria-live="polite"
      >
        <div className="transmission-result-title">
          {guaranteed && decoded ? <Check size={15} /> : <TriangleAlert size={15} />}
          <strong>
            {guaranteed && decoded
              ? 'The receiver reconstructed the polynomial'
              : survivors < MESSAGE_K
                ? 'Too few surviving evaluations'
                : 'Recovery is no longer guaranteed'}
          </strong>
        </div>
        <p>
          {survivors < MESSAGE_K ? (
            <>
              {survivors} evaluations survived; 5 are needed.{' '}
              <MathText>{'257^{' + (MESSAGE_K - survivors) + '}'}</MathText> different
              degree-less-than-5 polynomials fit these same surviving values.
            </>
          ) : errors === 0 ? (
            `${survivors} evaluations survived; only 5 are needed. No particular position has to survive.`
          ) : guaranteed ? (
            `${errors} wrong ${errors === 1 ? 'value' : 'values'} corrected without knowing their positions${missing ? `, with ${missing} missing` : ''}. With ${survivors} received values, correction of up to ${limit} errors is guaranteed.`
          ) : (
            `${errors} wrong values exceed the guaranteed limit of ${limit}${missing ? ` with ${missing} missing` : ''}. ${decoded ? 'This time the decoder returned a different codeword.' : `This time no codeword is within ${limit} changes of the received values.`}`
          )}
        </p>
        {decoded && (
          <>
            <div
              className="transmission-polynomial"
              aria-label={
                (guaranteed ? 'Recovered polynomial: ' : 'Decoder candidate: ') +
                polynomialTex(decoded.coefficients)
              }
            >
              <MathText>
                {'\\widehat p(X)=' + polynomialTex(decoded.coefficients) + '\\pmod{257}'}
              </MathText>
            </div>
            <div
              className="transmission-message"
              aria-label={
                (guaranteed ? 'Recovered message: ' : 'Candidate message: ') +
                decoded.message.join(', ')
              }
            >
              <span>Evaluate at 0, 1, 2, 3, 4:</span>
              <MathText>{'\\widehat m=[' + decoded.message.join(',') + ']'}</MathText>
            </div>
          </>
        )}
        <p className="transmission-receiver-note">
          The decoder gets only the received vector w, not the original message or polynomial.
        </p>
      </div>
    </>
  );
}
