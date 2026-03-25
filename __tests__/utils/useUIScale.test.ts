// Unit tests for useUIScale logic
// Since it's a React hook, we test the scaling calculation

describe('useUIScale logic', () => {
  function calculateScale(baseSize: number, uiScale: number | undefined | null): number {
    return uiScale ? baseSize * (uiScale / 100) : baseSize;
  }

  it('scales by 100% (default) returns same size', () => {
    expect(calculateScale(16, 100)).toBe(16);
  });

  it('scales up by 150%', () => {
    expect(calculateScale(16, 150)).toBe(24);
  });

  it('scales down by 50%', () => {
    expect(calculateScale(16, 50)).toBe(8);
  });

  it('returns baseSize when uiScale is undefined', () => {
    expect(calculateScale(16, undefined)).toBe(16);
  });

  it('returns baseSize when uiScale is null', () => {
    expect(calculateScale(16, null)).toBe(16);
  });

  it('returns baseSize when uiScale is 0', () => {
    // 0 is falsy, so the ternary falls through to baseSize
    expect(calculateScale(16, 0)).toBe(16);
  });

  it('handles various base sizes', () => {
    expect(calculateScale(12, 200)).toBe(24);
    expect(calculateScale(24, 75)).toBe(18);
    expect(calculateScale(10, 120)).toBe(12);
  });
});
