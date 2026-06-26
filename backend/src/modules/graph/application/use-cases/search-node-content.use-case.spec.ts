import { describe, it, expect, beforeEach } from 'vitest';
import { SearchNodeContentUseCase } from './search-node-content.use-case';
import type { NodeContentSearchQuery } from '../../domain/ports/node-content-search-query';

class FakeNodeContentSearchQuery implements NodeContentSearchQuery {
  calls: Array<{ grafoId: string; term: string }> = [];
  async matchingNodeRefs(_userId: string, grafoId: string, term: string): Promise<string[]> {
    this.calls.push({ grafoId, term });
    return ['ref-1'];
  }
}

describe('SearchNodeContentUseCase', () => {
  let search: FakeNodeContentSearchQuery;
  let useCase: SearchNodeContentUseCase;

  beforeEach(() => {
    search = new FakeNodeContentSearchQuery();
    useCase = new SearchNodeContentUseCase(search);
  });

  it('trims the term and delegates the search', async () => {
    const res = await useCase.execute('u1', 'g1', '  mitose  ');
    expect(res).toEqual(['ref-1']);
    expect(search.calls).toEqual([{ grafoId: 'g1', term: 'mitose' }]);
  });

  it('caps the term at 200 chars', async () => {
    await useCase.execute('u1', 'g1', 'x'.repeat(300));
    expect(search.calls[0]?.term).toHaveLength(200);
  });

  it('returns no matches for a blank term without querying', async () => {
    expect(await useCase.execute('u1', 'g1', '   ')).toEqual([]);
    expect(search.calls).toHaveLength(0);
  });

  it('returns no matches when no graph is given', async () => {
    expect(await useCase.execute('u1', '', 'mitose')).toEqual([]);
    expect(search.calls).toHaveLength(0);
  });
});
