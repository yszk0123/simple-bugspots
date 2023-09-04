module.exports = {
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  testRegex: '\\.test\\.tsx?$',
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  setupFiles: ['<rootDir>/src/setupJest.ts'],
  prettierPath: require.resolve('prettier-2'),
};
