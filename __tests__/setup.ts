// Global test setup — mocks for Expo & React Native modules

// --- expo-secure-store ---
// Use a module-level store that's accessible inside jest.mock via require
jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  const mod = {
    getItemAsync: jest.fn(async (key: string) => store.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => { store.set(key, value); }),
    deleteItemAsync: jest.fn(async (key: string) => { store.delete(key); }),
    __store: store, // exposed for reset
  };
  return mod;
});

// Helper to reset between tests
(globalThis as any).__secureStoreReset = () => {
  const ss = jest.requireMock('expo-secure-store');
  ss.__store.clear();
  ss.getItemAsync.mockClear();
  ss.setItemAsync.mockClear();
  ss.deleteItemAsync.mockClear();
};

// --- expo-router ---
jest.mock('expo-router', () => ({
  router: {
    replace: jest.fn(),
    push: jest.fn(),
    back: jest.fn(),
  },
  useRouter: () => ({
    replace: jest.fn(),
    push: jest.fn(),
    back: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
  useSegments: () => [],
  Stack: { Screen: () => null },
}));

// --- @react-native-async-storage/async-storage ---
jest.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map<string, string>();
  return {
    default: {
      getItem: jest.fn(async (key: string) => store.get(key) ?? null),
      setItem: jest.fn(async (key: string, value: string) => { store.set(key, value); }),
      removeItem: jest.fn(async (key: string) => { store.delete(key); }),
      multiGet: jest.fn(async (keys: string[]) => keys.map((k: string) => [k, store.get(k) ?? null])),
      multiSet: jest.fn(async (pairs: [string, string][]) => { pairs.forEach(([k, v]: [string, string]) => store.set(k, v)); }),
    },
  };
});

// --- expo-localization ---
jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'fr', languageTag: 'fr-FR' }],
  locale: 'fr-FR',
}));

// --- expo-haptics ---
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Error: 'error', Warning: 'warning' },
}));

// --- lucide-react-native ---
jest.mock('lucide-react-native', () => {
  const { View } = require('react-native');
  return new Proxy({}, {
    get: () => (props: any) => View(props),
  });
});

// --- react-native-webview ---
jest.mock('react-native-webview', () => {
  const { View } = require('react-native');
  return { default: View, WebView: View };
});

// --- react-native-markdown-display ---
jest.mock('react-native-markdown-display', () => {
  const { Text } = require('react-native');
  return { default: (props: any) => Text({ children: props.children }) };
});

// --- react-native-sse (EventSource) ---
jest.mock('react-native-sse', () => {
  return require('./__mocks__/eventSource').MockEventSource;
});

// --- expo-clipboard ---
jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn(),
  getStringAsync: jest.fn(async () => ''),
}));

// --- expo-speech ---
jest.mock('expo-speech', () => ({
  speak: jest.fn(),
  stop: jest.fn(),
  isSpeakingAsync: jest.fn(async () => false),
}));

// --- Global fetch mock ---
(globalThis as any).fetch = jest.fn();

// Silence console noise in tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
beforeAll(() => {
  console.error = jest.fn();
  console.warn = jest.fn();
});
afterAll(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});
