module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  globals: {
    'ts-jest': {
      babelConfig: true,
      tsconfig: 'tsconfig.json'
    }
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@babylonjs/core$': '<rootDir>/__mocks__/babylonjs-mock.js',
    '^opencascade.js$': '<rootDir>/__mocks__/opencascade-mock.js'
  },
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/.next/'],
  transform: {
    '^.+\.(tsx)$': ['babel-jest', { presets: ['@babel/preset-typescript', '@babel/preset-react'] }],
    '^.+\.(ts)$': ['ts-jest', { tsconfig: './tsconfig.json' }]
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(@babylonjs))/',
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
};
