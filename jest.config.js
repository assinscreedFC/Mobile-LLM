module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.ts'],
  transform: {
    '^.+\\.(ts|tsx|js|jsx)$': ['babel-jest', {
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
        '@babel/preset-typescript',
      ],
    }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native-sse|zustand|@react-native-async-storage/async-storage|expo|@expo))',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testMatch: ['**/__tests__/**/*.test.(ts|tsx)'],
  moduleNameMapper: {
    '^react-native$': '<rootDir>/__tests__/__mocks__/react-native.ts',
  },
  collectCoverageFrom: [
    'store/**/*.ts',
    'services/**/*.ts',
    'utils/**/*.ts',
    'i18n/translations.ts',
    '!**/node_modules/**',
    '!utils/useHaptics.ts',
    '!utils/useUIScale.ts',
  ],
};
