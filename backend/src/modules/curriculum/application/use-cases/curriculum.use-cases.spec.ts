import { describe, it, expect } from 'vitest';
import { CreateAssuntoUseCase } from './create-assunto.use-case';
import { CreateTopicoUseCase } from './create-topico.use-case';
import { ListSubjectsUseCase } from './curriculum-queries.use-cases';
import { AssuntoNotFoundError } from '../../domain/errors';
import type { CurriculumRepository } from '../../domain/ports/curriculum-repository';
import type { CurriculumQuery } from '../../domain/ports/curriculum-query';
import type {
  ConceptHierarchyAssunto,
  CreateConceptInput,
  CreatedNode,
  FilterAssunto,
  SubjectSummary,
  TreeAssunto,
} from '../../domain/curriculum-views';

class FakeRepo implements CurriculumRepository {
  constructor(private readonly assuntoExists = true) {}
  async createAssunto(_userId: string, nome: string): Promise<CreatedNode> {
    return { id: 'a1', nome };
  }
  async createTopico(_userId: string, nome: string): Promise<CreatedNode> {
    if (!this.assuntoExists) throw new AssuntoNotFoundError();
    return { id: 't1', nome };
  }
  async createConceito(_userId: string, input: CreateConceptInput): Promise<CreatedNode> {
    return { id: 'c1', nome: input.nome };
  }
}

class FakeQuery implements CurriculumQuery {
  constructor(private readonly subjects: SubjectSummary[] = []) {}
  async listSubjects(): Promise<SubjectSummary[]> {
    return this.subjects;
  }
  async conceptHierarchy(): Promise<ConceptHierarchyAssunto[]> {
    return [];
  }
  async hierarquiaTree(): Promise<TreeAssunto[]> {
    return [];
  }
  async flashcardFilterData(): Promise<FilterAssunto[]> {
    return [];
  }
}

describe('curriculum use-cases', () => {
  it('creates a subject', async () => {
    expect(await new CreateAssuntoUseCase(new FakeRepo()).execute('u1', 'Bio')).toEqual({
      id: 'a1',
      nome: 'Bio',
    });
  });

  it('creates a topic under an existing subject', async () => {
    expect(await new CreateTopicoUseCase(new FakeRepo()).execute('u1', 'Cel', 'a1')).toEqual({
      id: 't1',
      nome: 'Cel',
    });
  });

  it('propagates AssuntoNotFound when the subject is missing', async () => {
    await expect(
      new CreateTopicoUseCase(new FakeRepo(false)).execute('u1', 'Cel', 'ghost'),
    ).rejects.toBeInstanceOf(AssuntoNotFoundError);
  });

  it('lists subjects via the query', async () => {
    const subjects: SubjectSummary[] = [{ id: 'a1', nome: 'Bio', descricao: null, topicos: [] }];
    expect(await new ListSubjectsUseCase(new FakeQuery(subjects)).execute('u1')).toBe(subjects);
  });
});
