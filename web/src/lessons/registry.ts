import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import type { LessonId } from '../state/model';

export type LessonDefinition = {
  id: LessonId;
  number: string;
  title: string;
  shortTitle: string;
  group: string;
  description: string;
  question: string;
  noteSection: string;
  noteSource?: 'stark' | 'soundness';
  parameterMode?: 'mca' | 'linear-combination' | 'prize' | 'message';
  component: LazyExoticComponent<ComponentType>;
};

export const lessons: LessonDefinition[] = [
  {
    id: 'message-interpolation',
    number: '01',
    title: 'Message interpolation',
    shortTitle: 'Message interpolation',
    group: 'Encoding',
    description: 'Interpolate a polynomial through five editable message values.',
    question: 'Which polynomial passes through every message value?',
    noteSection: '1. Reed-Solomon Codes: The Basic Idea',
    parameterMode: 'message',
    component: lazy(() => import('./MessageInterpolation')),
  },
  {
    id: 'evaluation-codeword',
    number: '02',
    title: 'Message to codeword',
    shortTitle: 'Message to codeword',
    group: 'Encoding',
    description: 'Interpolate the message, then add evaluations to recover lost data.',
    question: 'What do the extra evaluations buy us?',
    noteSection: '1. Reed-Solomon Codes: The Basic Idea',
    parameterMode: 'message',
    component: lazy(() => import('./EvaluationCodeword')),
  },
  {
    id: 'tape-polynomial',
    number: '03',
    title: 'Coefficients to polynomial',
    shortTitle: 'Coefficients to polynomial',
    group: 'Encoding',
    description: 'An alternative encoding: use the entries as polynomial coefficients.',
    question: 'How do coefficients describe a polynomial?',
    noteSection: '1. Reed-Solomon Codes: The Basic Idea',
    component: lazy(() => import('./TapePolynomial')),
  },
  {
    id: 'interleaved-rs',
    number: '04',
    title: 'Interleaved Reed–Solomon codes',
    shortTitle: 'Interleaved RS',
    group: 'Encoding',
    description: 'Encode each message, then read the matrix one column at a time.',
    question: 'When does an entire column agree?',
    noteSection: 'Interleaving and common agreement support',
    noteSource: 'soundness',
    component: lazy(() => import('./InterleavedRS')),
  },
  {
    id: 'hamming-distance',
    number: '05',
    title: 'Count what changed.',
    shortTitle: 'Measure errors',
    group: 'Distance & decoding',
    description: 'Compare the sent and received words, one coordinate at a time.',
    question: 'How far apart are two words?',
    noteSection: '2. Distance, Hamming Balls, and List Size',
    component: lazy(() => import('./HammingDistance')),
  },
  {
    id: 'hamming-ball',
    number: '06',
    title: 'A neighborhood of words.',
    shortTitle: 'Grow a Hamming ball',
    group: 'Distance & decoding',
    description: 'A word is a point. A radius tells us which other words are nearby.',
    question: 'What lives inside a Hamming ball?',
    noteSection: '2. Distance, Hamming Balls, and List Size',
    component: lazy(() => import('./HammingBall')),
  },
  {
    id: 'decoding-radius',
    number: '07',
    title: 'List decoding',
    shortTitle: 'List decoding',
    group: 'Distance & decoding',
    description:
      'Learn why decoding can return a list, then explore all nearby polynomial candidates.',
    question: 'Which low-degree polynomials are close to this table?',
    noteSection: '3. Unique Decoding vs List Decoding',
    component: lazy(() => import('./DecodingRadius')),
  },
  {
    id: 'random-linear-combination',
    number: '08',
    title: 'Random linear combination',
    shortTitle: 'Random Linear Combination',
    group: 'Agreement & soundness',
    description: 'Multiply one vector by alpha, then add. Can two words make a codeword?',
    question: 'Can two non-codewords combine into a valid codeword?',
    noteSection: 'Mutual correlated agreement',
    noteSource: 'soundness',
    parameterMode: 'linear-combination',
    component: lazy(() => import('./RandomLinearCombination')),
  },
  {
    id: 'mutual-correlated-agreement',
    number: '09',
    title: 'Mutual correlated agreement',
    shortTitle: 'MCA',
    group: 'Agreement & soundness',
    description: 'Compare f, g, and their combination with codewords on the same agreement set.',
    question: 'Can combining rows create a misleading polynomial agreement?',
    noteSection: 'Mutual correlated agreement',
    noteSource: 'soundness',
    parameterMode: 'mca',
    component: lazy(() => import('./MutualAgreement')),
  },
  {
    id: 'proximity-prize',
    number: '10',
    title: 'Proximity Prize',
    shortTitle: 'Proximity Prize',
    group: 'Agreement & soundness',
    description:
      'Vary delta and compute the exact worst-case MCA error for a tiny smooth-domain code.',
    question: 'How much error can we allow while keeping every input pair below a target?',
    noteSection: 'Mutual correlated agreement',
    noteSource: 'soundness',
    parameterMode: 'prize',
    component: lazy(() => import('./ProximityPrize')),
  },
  {
    id: 'codes-to-proofs',
    number: '11',
    title: 'From codes to proofs',
    shortTitle: 'From codes to proofs',
    group: 'STARKs',
    description:
      'Follow trace values through interpolation, low-degree extension, and a local FRI check.',
    question: 'How do Reed–Solomon codes support a STARK?',
    noteSection: 'From codes to proofs',
    noteSource: 'stark',
    component: lazy(() => import('./CodesToProofs')),
  },
];

export const referencePage: LessonDefinition = {
  id: 'further-reading',
  number: '',
  title: 'Further reading',
  shortTitle: 'Further reading',
  group: 'Reference',
  description: 'Definitions, notes, and papers.',
  question: '',
  noteSection: '',
  component: lazy(() => import('./FurtherReadingPage')),
};
