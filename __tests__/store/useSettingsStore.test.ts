// Must mock AsyncStorage BEFORE importing the store
jest.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map<string, string>();
  return {
    __esModule: true,
    default: {
      getItem: jest.fn(async (key: string) => store.get(key) ?? null),
      setItem: jest.fn(async (key: string, value: string) => { store.set(key, value); }),
      removeItem: jest.fn(async (key: string) => { store.delete(key); }),
    },
  };
});

import { useSettingsStore } from '../../store/useSettingsStore';

// For persisted stores, use the actions (not setState) to avoid triggering storage.setItem
// on raw setState calls which can fail if persist middleware isn't fully initialized
describe('useSettingsStore', () => {
  it('has correct initial values', () => {
    const state = useSettingsStore.getState();
    expect(state.themeMode).toBe('systeme');
    expect(state.language).toBe('systeme');
    expect(state.notificationsEnabled).toBe(false);
  });

  it('setThemeMode updates themeMode', () => {
    useSettingsStore.getState().setThemeMode('sombre');
    expect(useSettingsStore.getState().themeMode).toBe('sombre');

    useSettingsStore.getState().setThemeMode('clair');
    expect(useSettingsStore.getState().themeMode).toBe('clair');

    // Reset
    useSettingsStore.getState().setThemeMode('systeme');
  });

  it('setLanguage updates language', () => {
    useSettingsStore.getState().setLanguage('en');
    expect(useSettingsStore.getState().language).toBe('en');

    useSettingsStore.getState().setLanguage('zh');
    expect(useSettingsStore.getState().language).toBe('zh');

    // Reset
    useSettingsStore.getState().setLanguage('systeme');
  });

  it('setNotificationsEnabled updates notificationsEnabled', () => {
    useSettingsStore.getState().setNotificationsEnabled(true);
    expect(useSettingsStore.getState().notificationsEnabled).toBe(true);

    useSettingsStore.getState().setNotificationsEnabled(false);
    expect(useSettingsStore.getState().notificationsEnabled).toBe(false);
  });
});
