import { describe, it, expect } from 'vitest';
import {
  CreateEditalUseCase,
  LinkEditalToProvaUseCase,
  ListEditaisUseCase,
} from './edital.use-cases';
import type { EditalRepository } from '../../domain/ports/edital-repository';
import type { CreateEditalInput, Edital } from '../../domain/prova';

class FakeEditalRepository implements EditalRepository {
  created: Array<{ userId: string; input: CreateEditalInput }> = [];
  links: Array<{ editalId: string; provaId: string; grafoId: string }> = [];
  constructor(private readonly editais: Edital[] = []) {}
  async create(userId: string, input: CreateEditalInput): Promise<{ editalId: string }> {
    this.created.push({ userId, input });
    return { editalId: 'ed-1' };
  }
  async linkToProva(_u: string, editalId: string, provaId: string, grafoId: string): Promise<void> {
    this.links.push({ editalId, provaId, grafoId });
  }
  async listByUser(): Promise<Edital[]> {
    return this.editais;
  }
}

describe('edital use-cases', () => {
  it('creates an edital forwarding the input', async () => {
    const repo = new FakeEditalRepository();
    const input: CreateEditalInput = {
      titulo: 'SERPRO',
      programa: '...',
      grafoId: 'g1',
      provaId: 'p1',
    };
    const res = await new CreateEditalUseCase(repo).execute('u1', input);
    expect(res).toEqual({ editalId: 'ed-1' });
    expect(repo.created[0]).toEqual({ userId: 'u1', input });
  });

  it('links an edital to a prova', async () => {
    const repo = new FakeEditalRepository();
    const res = await new LinkEditalToProvaUseCase(repo).execute('u1', 'e1', 'p1', 'g1');
    expect(res).toEqual({ success: true });
    expect(repo.links[0]).toEqual({ editalId: 'e1', provaId: 'p1', grafoId: 'g1' });
  });

  it('lists the user editais', async () => {
    const editais: Edital[] = [{ id: 'e1', titulo: 'X', provaId: 'p1' }];
    expect(await new ListEditaisUseCase(new FakeEditalRepository(editais)).execute('u1')).toEqual(
      editais,
    );
  });
});
