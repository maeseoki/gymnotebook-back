module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/.expo/'],
  moduleNameMapper: {
    '^@gymnotebook/contracts$': '<rootDir>/../../packages/contracts/dist/index.js',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
