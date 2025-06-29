module.exports = {
  extends: ['airbnb-base', 'plugin:import/errors', 'plugin:import/warnings'],
  env: { node: true, es2022: true, jest: true },
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  rules: {
    'import/extensions': ['error', 'ignorePackages', { js: 'always' }],
    'no-console': 'off'
  },
  settings: { 'import/resolver': { node: { extensions: ['.js'] } } }
}; 