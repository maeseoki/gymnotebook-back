const expoPreset = require('jest-expo/jest-preset')

module.exports = {
  ...expoPreset,
  setupFiles: ['<rootDir>/src/test/env.ts', ...expoPreset.setupFiles],
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/.expo/'],
  moduleNameMapper: {
    ...expoPreset.moduleNameMapper,
    '^@react-native/virtualized-lists$': '<rootDir>/src/test/virtualizedListsMock.tsx',
    '^react-native/Libraries/Lists/FlatList$': '<rootDir>/src/test/FlatListMock.tsx',
    '^@gymnotebook/contracts$': '<rootDir>/../../packages/contracts/dist/index.js',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  globals: {
    IS_REACT_ACT_ENVIRONMENT: true,
  },
}
