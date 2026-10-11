import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { corrupt, distance, encode, isDefaultExample } from '../core/math';
import {
  defaultExperiment,
  experimentUrl,
  readLocation,
  validExperiment,
  type Experiment,
  type LessonId,
} from './model';

type Store = ReturnType<typeof readLocation> & { savedExperiment?: Experiment };
type ContextValue = Store & {
  navigationExperiment: Experiment;
  patch: (change: Partial<Experiment>) => void;
  setExample: (coefficients: number[], n: number) => void;
  setErrors: (errors: number, newSeed?: number) => void;
  loadDefault: (ambiguity?: boolean) => void;
  loadPreset: (experiment: Experiment, notice?: string) => void;
  setField: (q: number) => void;
  navigate: (id: LessonId) => void;
  reset: () => void;
  notify: (message: string) => void;
};

const Context = createContext<ContextValue | null>(null);

function changeLesson(store: Store, lesson: LessonId): Store {
  if (store.lesson === lesson) return { ...store, notice: '' };
  return {
    ...store,
    lesson,
    experiment: store.savedExperiment ?? store.experiment,
    savedExperiment: undefined,
    notice: '',
  };
}

export function ExperimentProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<Store>(() => {
    const savedExperiment = window.history.state?.visualLab?.savedExperiment;
    return {
      ...readLocation(window.location.pathname, window.location.search),
      savedExperiment: validExperiment(savedExperiment) ? savedExperiment : undefined,
    };
  });
  useEffect(() => {
    const onPop = (event: PopStateEvent) => {
      const location = readLocation(window.location.pathname, window.location.search);
      // Moving between our lessons keeps the current message. Unrelated/shared
      // history entries still restore their explicitly serialized experiment.
      setStore((s) =>
        event.state?.visualLab ||
        window.location.pathname + window.location.search === experimentUrl(s.lesson, s.experiment)
          ? changeLesson(s, location.lesson)
          : location,
      );
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  useEffect(() => {
    window.history.replaceState(
      { ...window.history.state, visualLab: { savedExperiment: store.savedExperiment } },
      '',
      experimentUrl(store.lesson, store.experiment),
    );
  }, [store]);

  const patch = (change: Partial<Experiment>) =>
    setStore((s) => ({ ...s, experiment: { ...s.experiment, ...change } }));
  const notify = (notice: string) => setStore((s) => ({ ...s, notice }));
  const setExample = (coefficients: number[], n: number) =>
    setStore((s) => {
      const length = Math.max(n, coefficients.length);
      return {
        ...s,
        notice: '',
        experiment: {
          ...s.experiment,
          coefficients,
          n: length,
          received: encode(coefficients, length, s.experiment.q),
          radius: 0,
          distanceRadius: Math.min(s.experiment.distanceRadius, length),
        },
      };
    });
  const setErrors = (errors: number, newSeed?: number) =>
    setStore((s) => {
      const e = s.experiment;
      const seed = newSeed ?? e.seed;
      const pattern = newSeed === undefined ? e.pattern : 'seeded';
      const sent = encode(e.coefficients, e.n, e.q);
      const received = corrupt(
        sent,
        errors,
        e.q,
        seed,
        pattern === 'ambiguity' && isDefaultExample(e.coefficients, e.n, e.q),
      );
      return {
        ...s,
        experiment: { ...e, received, seed, pattern, radius: e.linked ? errors : e.radius },
      };
    });
  const loadPreset = (experiment: Experiment, notice = '') =>
    setStore((s) => ({
      ...s,
      // Presets belong to the current lesson; repeated presets must keep the
      // original experiment available when the reader moves to another lesson.
      savedExperiment: s.savedExperiment ?? s.experiment,
      experiment,
      notice,
    }));
  const loadDefault = (ambiguity = false) => {
    const experiment = defaultExperiment();
    if (ambiguity) {
      experiment.received = corrupt(experiment.received, 3, 17, 1, true);
      experiment.radius = 3;
    }
    loadPreset(
      experiment,
      ambiguity
        ? 'Loaded the exact three-error ambiguity example.'
        : 'Loaded the default Reed–Solomon example.',
    );
  };
  const setField = (q: number) =>
    setStore((s) => ({
      ...s,
      experiment: defaultExperiment(q),
      notice: `Loaded a fresh example over the field with ${q} elements.`,
    }));
  const navigate = (lesson: LessonId) => {
    const next = changeLesson(store, lesson);
    window.history.pushState(
      { visualLab: { savedExperiment: next.savedExperiment } },
      '',
      experimentUrl(lesson, next.experiment),
    );
    setStore((s) => changeLesson(s, lesson));
    window.scrollTo({ top: 0, behavior: 'instant' });
  };
  const reset = () =>
    setStore((s) => ({
      ...s,
      experiment: defaultExperiment(),
      savedExperiment: undefined,
      notice: 'All experiments reset to their starting values.',
    }));
  return (
    <Context.Provider
      value={{
        ...store,
        navigationExperiment: store.savedExperiment ?? store.experiment,
        patch,
        setExample,
        setErrors,
        loadDefault,
        loadPreset,
        setField,
        navigate,
        reset,
        notify,
      }}
    >
      {children}
    </Context.Provider>
  );
}

export function useExperiment() {
  const context = useContext(Context);
  if (!context) throw new Error('ExperimentProvider is missing.');
  const e = context.experiment;
  const sent = encode(e.coefficients, e.n, e.q);
  return { ...context, sent, errors: distance(sent, e.received) };
}
