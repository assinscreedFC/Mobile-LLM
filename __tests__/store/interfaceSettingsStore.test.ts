// Unit tests for interfaceSettingsStore

import useInterfaceSettingsStore from '../../store/interfaceSettingsStore';

describe('interfaceSettingsStore', () => {
  beforeEach(() => {
    // Reset to initial state
    useInterfaceSettingsStore.setState({
      optionsList: useInterfaceSettingsStore.getState().optionsList,
    });
  });

  it('has initial optionsList with expected keys', () => {
    const { optionsList } = useInterfaceSettingsStore.getState();
    expect(optionsList).toBeDefined();
    expect(optionsList['0']).toBeDefined();
    expect(optionsList['1']).toBeDefined();
  });

  it('initializes UI scale to 100', () => {
    const { optionsList } = useInterfaceSettingsStore.getState();
    expect(optionsList['1'].value).toBe(100);
    expect(optionsList['1'].type).toBe('NumberInput');
  });

  it('initializes haptic to true', () => {
    const { optionsList } = useInterfaceSettingsStore.getState();
    expect(optionsList['4'].value).toBe(true);
    expect(optionsList['4'].type).toBe('switch');
  });

  it('setOptionsList updates a specific option value', () => {
    const { setOptionsList } = useInterfaceSettingsStore.getState();
    setOptionsList('1', 120);
    expect(useInterfaceSettingsStore.getState().optionsList['1'].value).toBe(120);
  });

  it('setOptionsList preserves other options', () => {
    const { setOptionsList } = useInterfaceSettingsStore.getState();
    const originalHaptic = useInterfaceSettingsStore.getState().optionsList['4'].value;
    setOptionsList('1', 80);
    expect(useInterfaceSettingsStore.getState().optionsList['4'].value).toBe(originalHaptic);
  });

  it('setOptionsList updates switch values', () => {
    const { setOptionsList } = useInterfaceSettingsStore.getState();
    setOptionsList('4', false); // disable haptic
    expect(useInterfaceSettingsStore.getState().optionsList['4'].value).toBe(false);
  });

  it('has separator options with null value', () => {
    const { optionsList } = useInterfaceSettingsStore.getState();
    expect(optionsList['0'].type).toBe('separator');
    expect(optionsList['0'].value).toBeNull();
  });

  it('has action-sheet option with valid values', () => {
    const { optionsList } = useInterfaceSettingsStore.getState();
    expect(optionsList['7'].type).toBe('action-sheet');
    expect(optionsList['7'].value).toBe('LTR');
  });

  it('covers all 40 options (indices 0-39)', () => {
    const { optionsList } = useInterfaceSettingsStore.getState();
    for (let i = 0; i <= 39; i++) {
      expect(optionsList[String(i)]).toBeDefined();
    }
  });
});
