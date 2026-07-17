module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@babylonjs/core(?:/.*)?$': '<rootDir>/__mocks__/babylonjs-mock.js',
    '^opencascade.js$': '<rootDir>/__mocks__/opencascade-mock.js'
  },
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.next/',
    '<rootDir>/skillorix fixed/',
    '<rootDir>/tests/occt-canary.test.ts',
    '<rootDir>/__tests__/components/VoiceModule.test.tsx',
  ],
  transform: {
    '^.+\.(tsx)$': ['babel-jest', { presets: ['@babel/preset-typescript', '@babel/preset-react'] }],
    '^.+\.(ts)$': ['ts-jest', { tsconfig: './tsconfig.json', babelConfig: true }]
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(@babylonjs))/',
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
};
