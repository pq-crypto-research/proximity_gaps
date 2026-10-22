import { RotateCcw, WandSparkles } from 'lucide-react';
import { useExperiment } from '../state/ExperimentContext';
import { MathText } from '../components/Math';
import { WordComparison } from '../components/WordComparison';
import { Slider, Stat } from '../components/Controls';
import { BallScene } from '../visuals/BallScene';

export default function HammingDistance() {
  const { experiment: e, sent, errors, patch, setErrors } = useExperiment();
  return (
    <>
      <section className="experiment-panel distance-experiment">
        <div className="panel-topline">
          <span className="micro-label">COMPARE ONE COORDINATE AT A TIME</span>
          <div className="button-row">
            <button className="text-button" onClick={() => setErrors(Math.min(2, e.n))}>
              <WandSparkles size={14} /> Add two errors
            </button>
            <button className="text-button" onClick={() => patch({ received: sent })}>
              <RotateCcw size={14} /> Restore
            </button>
          </div>
        </div>
        <div className="distance-comparison">
          <WordComparison
            reference={sent}
            received={e.received}
            q={e.q}
            onChange={(index, value) =>
              patch({ received: e.received.map((a, i) => (i === index ? value : a)) })
            }
          />
          <div className="distance-totals" aria-live="polite">
            <Stat
              label="Different coordinates"
              value={<MathText>{'\\Delta=' + errors}</MathText>}
            />
            <Stat
              label="Fraction of the word"
              value={<MathText>{'\\delta=\\frac{' + errors + '}{' + e.n + '}'}</MathText>}
              detail={((errors / e.n) * 100).toFixed(1) + '%'}
            />
          </div>
        </div>
        <p className="distance-caption">
          Edit the received row. Each unequal column contributes exactly one to Δ.
        </p>
        <div className="distance-neighborhood">
          <div className="distance-radius-control">
            <Slider
              label="Comparison radius"
              value={e.distanceRadius}
              max={e.n}
              onChange={(distanceRadius) => patch({ distanceRadius })}
            />
            <div
              className={'distance-membership' + (errors > e.distanceRadius ? ' is-outside' : '')}
            >
              <MathText>
                {'w ' +
                  (errors <= e.distanceRadius ? '\\in' : '\\notin') +
                  ' B(c,' +
                  e.distanceRadius +
                  ')'}
              </MathText>
              <p>
                {errors} differences {errors <= e.distanceRadius ? 'fit inside' : 'exceed'} a radius
                of {e.distanceRadius}.
              </p>
            </div>
          </div>
          <div className="distance-mini-ball">
            <BallScene
              label="Distance of the received word from the sent codeword"
              maxDistance={e.n}
              radius={e.distanceRadius}
              centerLabel="c"
              coincidentLabel={errors === 0 ? 'c = w' : undefined}
              points={[{ id: 'received', label: 'w', distance: errors, emphasis: true }]}
            />
          </div>
        </div>
      </section>
    </>
  );
}
