var OFF = 0, WARN = 1, ERROR = 2;

module.exports = {
  'env': {
    'es6': true,
    'node': true,
  },

  'extends': 'google',
  'rules': {
    "linebreak-style": 0,
    'require-jsdoc': [OFF, {
      'require': {
        'FunctionDeclaration': true,
        'MethodDefinition': true,
        'ClassDeclaration': false
      }
    }],
    'max-len': [WARN, 132],
    'no-invalid-this': OFF,
    'no-multi-str': OFF,
    'semi': [ERROR, 'never'],
    'space-before-function-paren': OFF,
    'object-curly-spacing': ['error', 'always'],
  },

  'parserOptions': {
    'sourceType': 'module',
    'ecmaVersion': 2017,
  }
}