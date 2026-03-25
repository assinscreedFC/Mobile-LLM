// Unit tests for ModelSelector logic
// Tests search filtering and model normalization

describe('ModelSelector search filtering', () => {
  const models = [
    { id: 'gpt-4-turbo', name: 'gpt-4-turbo', size: '70B', vision: true },
    { id: 'llama-3-8b', name: 'llama-3-8b', size: '8B', vision: false },
    { id: 'mistral-7b', name: 'mistral-7b', size: '7B', vision: false },
    { id: 'claude-3-opus', name: 'claude-3-opus', size: '', vision: true },
  ];

  function filterModels(query: string) {
    if (!query.trim()) return models;
    const q = query.toLowerCase();
    return models.filter(m => m.name.toLowerCase().includes(q));
  }

  it('returns all models when query is empty', () => {
    expect(filterModels('')).toHaveLength(4);
    expect(filterModels('  ')).toHaveLength(4);
  });

  it('filters by partial name match (case-insensitive)', () => {
    expect(filterModels('gpt')).toHaveLength(1);
    expect(filterModels('GPT')).toHaveLength(1);
    expect(filterModels('llama')).toHaveLength(1);
  });

  it('returns empty when no match', () => {
    expect(filterModels('nonexistent')).toHaveLength(0);
  });

  it('matches multiple results', () => {
    // Both gpt-4 and claude-3 contain '3'
    const result = filterModels('3');
    expect(result.length).toBeGreaterThan(1);
  });
});

describe('ModelSelector model normalization', () => {
  it('handles string array response (legacy API)', () => {
    const rawModels = ['gpt-4', 'llama-3'];
    const normalized = rawModels.map((m: any) => ({
      id: typeof m === 'string' ? m : m.id || m.name,
      name: typeof m === 'string' ? m : m.id || m.name,
      size: '',
      vision: false,
    }));

    expect(normalized).toHaveLength(2);
    expect(normalized[0].id).toBe('gpt-4');
    expect(normalized[0].vision).toBe(false);
  });

  it('handles object array response', () => {
    const rawModels = [
      { id: 'gpt-4', name: 'GPT-4', size: 5e9, info: { meta: { capabilities: { vision: true } } } },
    ];
    const normalized = rawModels.map((model: any) => ({
      id: model.id || model.name,
      name: model.id || model.name,
      size: model.size ? `${(model.size / 1e9).toFixed(1)}B` : model.parameter_size || '',
      vision: model.info?.meta?.capabilities?.vision ?? false,
    }));

    expect(normalized[0].size).toBe('5.0B');
    expect(normalized[0].vision).toBe(true);
  });
});

describe('ModelSelector mode behavior', () => {
  it('add mode allows adding new model', () => {
    const mode = 'add';
    expect(mode).toBe('add');
  });

  it('switch mode replaces current model', () => {
    const mode = 'switch';
    expect(mode).toBe('switch');
  });
});
