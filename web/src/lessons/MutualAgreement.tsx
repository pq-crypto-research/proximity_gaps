import { useMemo, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { MathText } from '../components/Math';
import { AgreementTapes } from '../components/AgreementTapes';
import {
  analyzeMca,
  MCA_DOMAIN,
  MCA_MIN_AGREEMENT,
  MCA_PRESETS,
  MCA_Q,
  type McaSettings,
} from '../core/agreement';
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
  const update = (change: Partial<McaSettings>) => patch({ mca: { ...settings, ...change } });
  const broken = support.filter(
    (i) => settings.f[i] !== u0.word[i] || settings.g[i] !== u1.word[i],
  );
  const verdict = selected.bad
    ? 'MCA error'
    : selected.qualifies
      ? 'MCA agreement'
      : 'No qualifying agreement';

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
        <AgreementTapes
          domain={MCA_DOMAIN}
          q={MCA_Q}
          settings={settings}
          update={update}
          support={support}
          c={c}
          u0={u0}
          u1={u1}
          word={selected.word}
          nearestDistance={c.distance}
          inputValid={[u0.distance === 0, u1.distance === 0]}
          minAgreement={MCA_MIN_AGREEMENT}
          qualifies={selected.qualifies}
          onlySupport={onlySupport}
          setOnlySupport={setOnlySupport}
        />
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
    </div>
  );
}
