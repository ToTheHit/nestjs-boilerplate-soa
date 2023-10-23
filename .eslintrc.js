module.exports = {
  env: {
    mocha: true,
    node: true,
    jest: true
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },

  plugins: [
    'node',
    '@typescript-eslint/eslint-plugin',
    "@typescript-eslint",
    "import"
  ],
  root: true,
  globals: {
    NodeJS: true
  },
  ignorePatterns: ['.eslintrc.js'],
  extends: [
    'eslint:recommended',
    'airbnb-base',
    "plugin:import/typescript",
    "plugin:@typescript-eslint/recommended",
    'plugin:import/typescript',
  ],
  overrides: [
    {
      files: ['*.spec.js', '*spec.ts'],
      rules: {
        'max-nested-callbacks': [1, 5],
      },
    },
  ],
  rules: {
    'class-methods-use-this': 0,
    'default-param-last': 0,
    "@typescript-eslint/unbound-method": "error",
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    'import/no-extraneous-dependencies': [
      'error', {
        devDependencies: false,
        optionalDependencies: false,
        peerDependencies: false,
        packageDir: './',
      },
    ],

    // # Possible Errors
    'arrow-parens': [2, 'as-needed'],
    'comma-dangle': [
      2,
      'never',
    ],
    'valid-jsdoc': [
      1,
      {
        requireReturn: false,
        requireReturnDescription: false,
      },
    ],

    // # Disable extension rule for ESM
    'import/extensions': ['error', 'ignorePackages', {
      js: 'off',
      mjs: 'off',
      ts: 'off'
    }],

    // # Best Practices
    curly: [
      2,
      'all',
    ],
    'dot-notation': 1,
    'no-multi-spaces': [
      2,
      {
        exceptions: {
          VariableDeclarator: true,
        },
      },
    ],
    'no-unmodified-loop-condition': 2,
    'no-useless-call': 'error',
    'no-undef-init': 'error',

    // # Node.js and CommonJS
    'callback-return': 2,
    'global-require': 2,
    'handle-callback-err': 2,
    'no-mixed-requires': [
      2,
      {
        grouping: true,
        allowCall: false,
      },
    ],
    'no-new-require': 2,
    'no-path-concat': 2,
    'no-sync': 2,

    // # Styling Issues
    'brace-style': [
      1,
      '1tbs',
    ],
    camelcase: 0,
    indent: [
      2,
      4,
      {
        SwitchCase: 1,
      },
    ],
    'linebreak-style': 2,
    'max-depth': [
      1,
      4,
    ],
    'padding-line-between-statements': [
      'error',
      { blankLine: 'always', prev: ['const', 'let', 'var'], next: '*' },
      { blankLine: 'any', prev: ['const', 'let', 'var'], next: ['const', 'let', 'var'] },
    ],
    'newline-before-return': 2,
    'max-len': [
      1,
      120,
    ],
    'max-nested-callbacks': [
      1,
      3,
    ],
    'max-params': [
      1,
      {
        max: 5,
      },
    ],
    'max-statements': [
      1,
      {
        max: 15,
      },
    ],
    'max-statements-per-line': [
      1,
      {
        max: 1,
      },
    ],
    'no-underscore-dangle': 0,
    'no-restricted-syntax': [
      2,
      'DebuggerStatement',
      'LabeledStatement',
      'WithStatement',
    ],
    'operator-assignment': 2,
    'operator-linebreak': [
      'error',
      'after',
      {
        overrides: {
          '?': 'before',
          ':': 'before',
        },
      },
    ],
    'sort-vars': 2,

    // # ECMASCript 6
    'arrow-body-style': 0,
    'constructor-super': 2,
    'no-this-before-super': 2,
    'prefer-arrow-callback': 0,
    'prefer-spread': 2,
    'require-yield': 2,
  },
  "settings": {
    "import/resolver": {
      "typescript": {
        "alwaysTryTypes": true,
        "project": "./tsconfig.json"
      },
      "node": true
    }
  },
};
