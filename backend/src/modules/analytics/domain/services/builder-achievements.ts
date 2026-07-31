// Catálogo de marcos do Construtor (criação) e do Explorador (amplitude do mapa).
// Usa a mesma mecânica genérica das conquistas de estudo (achievement-eval).
import { buildAchievements, type Achievement, type AchievementDef } from './achievement-eval';

export interface BuilderSignals {
  created: number;
  flashcardsCreated: number;
  concepts: number;
  subjects: number;
}

type Metric = keyof BuilderSignals;

const DEFS: AchievementDef<Metric>[] = [
  {
    id: 'created-10',
    title: 'Primeiros tijolos',
    description: '10 conteúdos criados',
    metric: 'created',
    target: 10,
  },
  {
    id: 'created-50',
    title: 'Ganhando forma',
    description: '50 conteúdos criados',
    metric: 'created',
    target: 50,
  },
  {
    id: 'created-200',
    title: 'Oficina cheia',
    description: '200 conteúdos criados',
    metric: 'created',
    target: 200,
  },
  {
    id: 'created-1000',
    title: 'Fábrica de conteúdo',
    description: '1000 conteúdos criados',
    metric: 'created',
    target: 1000,
  },
  {
    id: 'flashcards-100',
    title: 'Cem cartas',
    description: '100 flashcards criados',
    metric: 'flashcardsCreated',
    target: 100,
  },
  {
    id: 'flashcards-500',
    title: 'Baralho vasto',
    description: '500 flashcards criados',
    metric: 'flashcardsCreated',
    target: 500,
  },
  {
    id: 'concepts-100',
    title: 'Mapa em formação',
    description: '100 conceitos no mapa',
    metric: 'concepts',
    target: 100,
  },
  {
    id: 'concepts-500',
    title: 'Território amplo',
    description: '500 conceitos no mapa',
    metric: 'concepts',
    target: 500,
  },
  {
    id: 'concepts-1000',
    title: 'Cartógrafo',
    description: '1000 conceitos no mapa',
    metric: 'concepts',
    target: 1000,
  },
  {
    id: 'subjects-5',
    title: 'Explorador',
    description: '5 assuntos no mapa',
    metric: 'subjects',
    target: 5,
  },
  {
    id: 'subjects-15',
    title: 'Multidisciplinar',
    description: '15 assuntos no mapa',
    metric: 'subjects',
    target: 15,
  },
  {
    id: 'subjects-40',
    title: 'Polímata',
    description: '40 assuntos no mapa',
    metric: 'subjects',
    target: 40,
  },
];

/** Avalia os marcos de construtor/explorador. @example evaluateBuilderAchievements({ created: 12, flashcardsCreated: 8, concepts: 300, subjects: 6 }) */
export function evaluateBuilderAchievements(s: BuilderSignals): Achievement[] {
  return buildAchievements(DEFS, s);
}
