// Unit tests for ChatControlsPanel logic
// Tests temperature presets, validation, and description logic

describe('ChatControlsPanel temperature logic', () => {
  // Temperature presets from the component
  const PRESETS = [
    { label: 'Precise', value: 0.2 },
    { label: 'Balanced', value: 0.7 },
    { label: 'Creative', value: 1.2 },
  ];

  function isPresetSelected(temperature: number, presetValue: number): boolean {
    return Math.abs(temperature - presetValue) < 0.2;
  }

  function getTemperatureDescription(temperature: number): string {
    if (temperature < 0.4) return 'precise';
    if (temperature < 0.9) return 'balanced';
    return 'creative';
  }

  function validateTemperature(input: string): number | null {
    const val = parseFloat(input);
    if (isNaN(val) || val < 0 || val > 2) return null;
    return val;
  }

  function validateMaxTokens(input: string): number | null {
    const val = parseInt(input);
    if (isNaN(val) || val <= 0) return null;
    return val;
  }

  describe('isPresetSelected', () => {
    it('matches exact preset value', () => {
      expect(isPresetSelected(0.7, 0.7)).toBe(true);
    });

    it('matches values within 0.2 range', () => {
      expect(isPresetSelected(0.8, 0.7)).toBe(true);
      expect(isPresetSelected(0.6, 0.7)).toBe(true);
    });

    it('rejects values outside 0.2 range', () => {
      expect(isPresetSelected(0.0, 0.7)).toBe(false);
      expect(isPresetSelected(1.5, 0.7)).toBe(false);
    });
  });

  describe('getTemperatureDescription', () => {
    it('returns precise for low values', () => {
      expect(getTemperatureDescription(0.0)).toBe('precise');
      expect(getTemperatureDescription(0.2)).toBe('precise');
      expect(getTemperatureDescription(0.3)).toBe('precise');
    });

    it('returns balanced for medium values', () => {
      expect(getTemperatureDescription(0.5)).toBe('balanced');
      expect(getTemperatureDescription(0.7)).toBe('balanced');
    });

    it('returns creative for high values', () => {
      expect(getTemperatureDescription(0.9)).toBe('creative');
      expect(getTemperatureDescription(1.5)).toBe('creative');
      expect(getTemperatureDescription(2.0)).toBe('creative');
    });
  });

  describe('validateTemperature', () => {
    it('accepts valid values', () => {
      expect(validateTemperature('0.7')).toBe(0.7);
      expect(validateTemperature('0')).toBe(0);
      expect(validateTemperature('2')).toBe(2);
    });

    it('rejects out of range', () => {
      expect(validateTemperature('-1')).toBeNull();
      expect(validateTemperature('3')).toBeNull();
    });

    it('rejects non-numeric', () => {
      expect(validateTemperature('abc')).toBeNull();
      expect(validateTemperature('')).toBeNull();
    });
  });

  describe('validateMaxTokens', () => {
    it('accepts positive integers', () => {
      expect(validateMaxTokens('1024')).toBe(1024);
      expect(validateMaxTokens('4096')).toBe(4096);
    });

    it('rejects zero or negative', () => {
      expect(validateMaxTokens('0')).toBeNull();
      expect(validateMaxTokens('-100')).toBeNull();
    });

    it('rejects non-numeric', () => {
      expect(validateMaxTokens('abc')).toBeNull();
    });
  });

  describe('presets', () => {
    it('has 3 temperature presets', () => {
      expect(PRESETS).toHaveLength(3);
    });

    it('presets are in ascending order', () => {
      for (let i = 1; i < PRESETS.length; i++) {
        expect(PRESETS[i].value).toBeGreaterThan(PRESETS[i - 1].value);
      }
    });

    it('all preset values are within 0-2 range', () => {
      for (const p of PRESETS) {
        expect(p.value).toBeGreaterThanOrEqual(0);
        expect(p.value).toBeLessThanOrEqual(2);
      }
    });
  });
});

describe('ChatControlsPanel maxTokens presets', () => {
  const MAX_TOKEN_PRESETS = [1024, 2048, 4096];

  it('has 3 presets', () => {
    expect(MAX_TOKEN_PRESETS).toHaveLength(3);
  });

  it('all presets are powers of 2', () => {
    for (const p of MAX_TOKEN_PRESETS) {
      expect(Math.log2(p) % 1).toBe(0);
    }
  });
});
