module.exports = {
  extends: ['@brickblock/eslint-config-base'],
  plugins: ['jest'],
  env: {
    'jest/globals': true,
  },
  rules: {
    'jest/no-disabled-tests': 'warn',
    'jest/no-focused-tests': 'error',
    'jest/no-identical-title': 'error',
    'jest/prefer-to-have-length': 'warn',
    'jest/valid-expect': 'error',
    'no-case-declarations': 0,
    'promise/catch-or-return': 0
  },
}
