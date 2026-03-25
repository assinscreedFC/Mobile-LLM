import { generateUUID } from '../../utils/uuid';

describe('generateUUID', () => {
  it('returns a string matching UUID v4 format', () => {
    const uuid = generateUUID();
    expect(uuid).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );
  });

  it('returns unique values on successive calls', () => {
    const uuids = new Set(Array.from({ length: 100 }, () => generateUUID()));
    expect(uuids.size).toBe(100);
  });

  it('has 4 as the version digit', () => {
    const uuid = generateUUID();
    expect(uuid[14]).toBe('4');
  });

  it('has 8, 9, a, or b as the variant digit', () => {
    const uuid = generateUUID();
    expect(['8', '9', 'a', 'b']).toContain(uuid[19]);
  });
});
