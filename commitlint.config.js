/** @type {import('@commitlint/types').UserConfig} */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      2,
      'always',
      [
        'core',
        'directives',
        'events',
        'devtools',
        'plugins',
        'store',
        'types',
        'docs',
        'extension',
        'deps',
        'release',
      ],
    ],
    // Release-please and Dependabot generate longer subjects than the default 100.
    'header-max-length': [2, 'always', 120],
    'body-max-line-length': [0],
  },
};
