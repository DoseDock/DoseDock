module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)',
  ],
  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@screens/(.*)$': '<rootDir>/src/screens/$1',
    '^@data/(.*)$': '<rootDir>/src/data/$1',
    '^@types$': '<rootDir>/src/types/index.ts',
    '^@engine/(.*)$': '<rootDir>/src/engine/$1',
    '^@store/(.*)$': '<rootDir>/src/store/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@notifications/(.*)$': '<rootDir>/src/notifications/$1',
    '^@device/(.*)$': '<rootDir>/src/device/$1',
    '^@i18n/(.*)$': '<rootDir>/src/i18n/$1',
    '^@theme/(.*)$': '<rootDir>/src/theme/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/types/**',
  ],
};



