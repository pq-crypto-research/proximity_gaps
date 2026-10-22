import { useMemo, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { AgreementTapes } from '../components/AgreementTapes';
import { Slider, Toggle } from '../components/Controls';
import { MathText } from '../components/Math';
import {
  analyzePrize,
  bruteForcePrizeWorstCase,
  DEFAULT_PRIZE,
  PRIZE_DOMAIN,
  PRIZE_N,
  PRIZE_Q,
  PRIZE_TARGET_COUNT,
  prizePairProfile,
  type PrizeSettings,
} from '../core/proximityPrize';
import { useExperiment } from '../state/ExperimentContext';
import './ProximityPrize.css';

export default function ProximityPrize() {
  const { experiment, patch } = useExperiment();
  const settings = experiment.prize ?? DEFAULT_PRIZE;
  const [onlySupport, setOnlySupport] = useState(false);
  const worst = useMemo(bruteForcePrizeWorstCase, []);
  const analysis = useMemo(
    () => analyzePrize(settings.f, settings.g, settings.radius),
    [settings.f, settings.g, settings.radius],
  );
  const profile = useMemo(() => prizePairProfile(settings.f, settings.g), [settings.f, settings.g]);
  const followWorst = settings.followWorst ?? false;
  const selected = analysis.challenges[settings.alpha];
  const [u0, u1] = selected.inputs;
  const minAgreement = PRIZE_N - settings.radius;
  function worstSettings(radius: number): PrizeSettings {
    const pair = worst.witnesses[radius];
    const result = analyzePrize(pair.f, pair.g, radius);
    return {
      ...pair,
      radius,
      alpha: result.challenges.find((c) => c.bad)?.alpha ?? 0,
      followWorst: true,
    };
  }
  const update = (change: Partial<PrizeSettings>) => {
    const next =
      change.radius !== undefined && followWorst
        ? worstSettings(change.radius)
        : { ...settings, ...change, ...(change.f || change.g ? { followWorst: false } : {}) };
    patch({ prize: next });
  };
  const safe = worst.counts[settings.radius] <= PRIZE_TARGET_COUNT;
  const largestGridRadius = worst.counts.reduce(
    (best, count, radius) => (count <= PRIZE_TARGET_COUNT ? radius : best),
    -1,
  );
  const verdict = selected.bad
    ? 'MCA error'
    : selected.qualifies
      ? 'MCA agreement'
      : 'No qualifying agreement';
  const failingInput = [u0.supportErrors > 0 ? 'f' : '', u1.supportErrors > 0 ? 'g' : '']
    .filter(Boolean)
    .join(' and ');
  const cIsNearest = selected.c.distance === selected.nearest.distance;
  const codewordLabels: [string, string, string] = [
    u0.supportErrors ? 'Best match on S' : 'Matches f on S',
    u1.supportErrors ? 'Best match on S' : 'Matches g on S',
    cIsNearest ? 'Nearest codeword' : 'Failing witness',
  ];

  return (
    <div className="mca-lesson prize-lesson">
      <header className="mca-heading">
        <h2>Proximity Prize</h2>
        <p>How much disagreement can we allow while keeping MCA errors rare?</p>
      </header>
      <section
        className="experiment-panel prize-overview"
        aria-label="Error probability across delta"
      >
        <div className="prize-overview-heading">
          <div>
            <h3>Larger δ can mean more MCA errors</h3>
            <p>Smaller S qualifies → error probability rises or stays flat. It never decreases.</p>
          </div>
          <span className="prize-target-label">
            Toy target: at most <strong>2/5</strong>
          </span>
        </div>
        <div className="prize-profile-grid" role="group" aria-label="Delta thresholds">
          {worst.counts.map((count, radius) => (
            <button
              key={radius}
              aria-label={`Delta ${radius}/4, worst-case error ${count}/5`}
              aria-pressed={settings.radius === radius}
              className={count <= PRIZE_TARGET_COUNT ? 'prize-profile-safe' : 'prize-profile-bad'}
              onClick={() => update({ radius })}
            >
              <MathText>{`\\delta=\\frac{${radius}}4`}</MathText>
              <span className="prize-profile-bar" aria-hidden="true">
                <i style={{ height: `${(count / PRIZE_Q) * 100}%` }} />
              </span>
              <strong>
                Worst: {count}/5 <span>({(count / PRIZE_Q) * 100}%)</span>
              </strong>
              {!followWorst && <small>This pair: {profile[radius]}/5</small>}
            </button>
          ))}
        </div>
        <p className="prize-chart-caption">
          Exact brute force over all input pairs.{' '}
          {followWorst
            ? 'Changing δ loads a pair attaining that worst case.'
            : '“Worst” is over all f,g; “This pair” uses only the vectors below.'}
        </p>
        <div className="prize-delta-control" role="group" aria-label="Proximity Prize controls">
          <MathText>{`\\delta=\\frac{${settings.radius}}4`}</MathText>
          <Slider
            label="Delta"
            value={settings.radius}
            max={4}
            onChange={(radius) => update({ radius })}
            markers={[
              { value: 0, label: '0' },
              { value: 4, label: '1' },
            ]}
          />
          <div className="prize-threshold">
            <MathText>{`|S|\\ge(1-\\delta)n=${minAgreement}`}</MathText>
            <span>At least {minAgreement} of 4 points must agree</span>
          </div>
        </div>
        <div
          className={`prize-target-result ${safe ? 'prize-target-safe' : 'prize-target-exceeded'}`}
          role="status"
          aria-label="Prize target"
        >
          <span>
            <strong>{safe ? 'Target met' : 'Target exceeded'}</strong> · worst-case error{' '}
            <b data-testid="prize-worst-count">{worst.counts[settings.radius]}/5</b>
          </span>
          <span>
            Largest tested δ within target: <MathText>{`\\frac{${largestGridRadius}}4`}</MathText>
          </span>
        </div>
      </section>
      <section className="experiment-panel mca-workbench" aria-label="Proximity Prize experiment">
        <div className="panel-topline">
          <div className="prize-pair-heading">
            <h3>{followWorst ? 'Worst pair at this δ' : 'Your input pair'}</h3>
            <span>
              Error probability for these f,g:{' '}
              <strong data-testid="prize-pair-count">{analysis.badCount}/5</strong>
            </span>
          </div>
          <div className="mca-actions">
            <Toggle
              label="Follow worst pair"
              checked={followWorst}
              onChange={(follow) =>
                patch({
                  prize: follow
                    ? worstSettings(settings.radius)
                    : { ...settings, followWorst: false },
                })
              }
            />
            <button
              className="text-button"
              onClick={() => {
                patch({ prize: DEFAULT_PRIZE });
                setOnlySupport(false);
              }}
            >
              <RotateCcw size={13} aria-hidden="true" /> Reset example
            </button>
          </div>
        </div>
        <AgreementTapes
          domain={PRIZE_DOMAIN}
          q={PRIZE_Q}
          settings={settings}
          update={update}
          support={selected.support}
          c={selected.c}
          u0={u0}
          u1={u1}
          word={selected.word}
          nearestDistance={selected.nearest.distance}
          inputValid={[
            analysis.nearestInputs[0].distance === 0,
            analysis.nearestInputs[1].distance === 0,
          ]}
          minAgreement={minAgreement}
          qualifies={selected.qualifies}
          onlySupport={onlySupport}
          setOnlySupport={setOnlySupport}
          prefix="Prize"
          codewordLabels={codewordLabels}
          alphaChoices={
            <div className="mca-challenge-buttons" role="group" aria-label="All 5 alpha values">
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
                  aria-label={`Alpha ${challenge.alpha}: ${challenge.bad ? 'MCA error' : challenge.qualifies ? 'MCA agreement' : 'no qualifying agreement'}`}
                  aria-pressed={settings.alpha === challenge.alpha}
                  onClick={() => update({ alpha: challenge.alpha })}
                >
                  {challenge.alpha}
                </button>
              ))}
            </div>
          }
        />
        <div
          className={`mca-verdict ${selected.bad ? 'mca-verdict-error' : selected.qualifies ? 'mca-verdict-agreement' : ''}`}
          role="status"
          aria-label="Prize MCA result"
          aria-atomic="true"
        >
          <strong>{verdict}</strong>
          <p>
            {selected.bad ? (
              <>
                h and c agree on {selected.support.length} points, but no codeword matches{' '}
                {failingInput} throughout this S.
              </>
            ) : selected.qualifies ? (
              <>
                <MathText>{'f|_S=u_0|_S'}</MathText> and <MathText>{'g|_S=u_1|_S'}</MathText>. Every
                qualifying agreement set has explanations for both inputs.
              </>
            ) : (
              <>
                <MathText>{`|S|\\ge(1-\\delta)n=${minAgreement}`}</MathText>. The largest agreement
                has only {selected.support.length} points. S is too small.
              </>
            )}
          </p>
        </div>
      </section>
    </div>
  );
}
