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
  parameterMode?: 'mca' | 'linear-combination';
  component: LazyExoticComponent<ComponentType>;
};

export const lessons: LessonDefinition[] = [
  {
    id: 'tape-polynomial',
    number: '01',
    title: 'A message, a polynomial.',
    shortTitle: 'Tape to polynomial',
    group: 'Encoding',
    description: 'Every number has a place. Together, they describe a polynomial.',
    question: 'How does a message become mathematics?',
    noteSection: '1. Reed-Solomon Codes: The Basic Idea',
    component: lazy(() => import('./TapePolynomial')),
  },
  {
    id: 'evaluation-codeword',
    number: '02',
    title: 'A little more redundancy.',
    shortTitle: 'Build a codeword',
    group: 'Encoding',
    description: 'Evaluate one polynomial at many points. The results form a codeword.',
    question: 'What do the extra symbols buy us?',
    noteSection: '1. Reed-Solomon Codes: The Basic Idea',
    component: lazy(() => import('./EvaluationCodeword')),
  },
  {
    id: 'hamming-distance',
    number: '03',
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
    number: '04',
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
    number: '05',
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
    id: 'interleaved-rs',
    number: '06',
    title: 'Interleaved Reed–Solomon codes',
    shortTitle: 'Interleaved RS',
    group: 'Agreement & soundness',
    description: 'Encode each message, then read the matrix one column at a time.',
    question: 'When does an entire column agree?',
    noteSection: 'Interleaving and common agreement support',
    noteSource: 'soundness',
    component: lazy(() => import('./InterleavedRS')),
  },
  {
    id: 'random-linear-combination',
    number: '07',
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
    number: '08',
    title: 'Mutual correlated agreement',
    shortTitle: 'MCA',
    group: 'Agreement & soundness',
    description: 'Follow an affine line of words and inspect the same agreement positions.',
    question: 'Can combining rows create a misleading polynomial agreement?',
    noteSection: 'Mutual correlated agreement',
    noteSource: 'soundness',
    parameterMode: 'mca',
    component: lazy(() => import('./MutualAgreement')),
  },
  {
    id: 'codes-to-proofs',
    number: '09',
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
