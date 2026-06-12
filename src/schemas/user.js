const login = {
  id: '/login',
  type: 'object',
  properties: {
    email: {
      type: 'string',
      minLength: 1
    },
    password: { type: 'string' },
    totp: { type: 'string' }
  },
  required: ['email', 'password'],
  additionalProperties: true
}

const refresh = {
  id: '/refresh',
  type: 'object',
  properties: {
    refreshToken: { type: 'string' }
  },
  required: ['refreshToken'],
  additionalProperties: true
}

const mfaConfirm = {
  id: '/mfaConfirm',
  type: 'object',
  properties: {
    code: { type: 'string' }
  },
  required: ['code'],
  additionalProperties: true
}

const mfaDisable = {
  id: '/mfaDisable',
  type: 'object',
  properties: {
    password: { type: 'string' },
    code: { type: 'string' }
  },
  required: ['password', 'code'],
  additionalProperties: true
}

const changePassword = {
  id: '/changePassword',
  type: 'object',
  properties: {
    currentPassword: { type: 'string' },
    newPassword: { type: 'string' },
    resetToken: { type: 'string' }
  },
  required: ['newPassword'],
  additionalProperties: true
}

const interactionLogin = {
  id: '/interactionLogin',
  type: 'object',
  properties: {
    email: {
      type: 'string',
      minLength: 1
    },
    password: { type: 'string' }
  },
  required: ['email', 'password'],
  additionalProperties: true
}

const interactionMfa = {
  id: '/interactionMfa',
  type: 'object',
  properties: {
    code: { type: 'string' }
  },
  required: ['code'],
  additionalProperties: true
}

const createAuthUser = {
  id: '/createAuthUser',
  type: 'object',
  properties: {
    email: {
      type: 'string',
      pattern: '^(([^<>()\\[\\]\\\\.,;:\\s@"]+(\\.[^<>()\\[\\]\\\\.,;:\\s@"]+)*)|(".+"))@((\\[[0-9]{1,3}\\.[0-9]{1,3}' +
      '\\.[0-9]{1,3}\\.[0-9]{1,3}])|(([a-zA-Z\\-0-9]+\\.)+[a-zA-Z]{2,}))$'
    },
    password: { type: 'string' },
    groups: {
      type: 'array',
      items: { type: 'string' }
    }
  },
  required: ['email', 'password'],
  additionalProperties: true
}

const updateAuthUser = {
  id: '/updateAuthUser',
  type: 'object',
  properties: {
    email: {
      type: 'string',
      pattern: '^(([^<>()\\[\\]\\\\.,;:\\s@"]+(\\.[^<>()\\[\\]\\\\.,;:\\s@"]+)*)|(".+"))@((\\[[0-9]{1,3}\\.[0-9]{1,3}' +
      '\\.[0-9]{1,3}\\.[0-9]{1,3}])|(([a-zA-Z\\-0-9]+\\.)+[a-zA-Z]{2,}))$'
    },
    groups: {
      type: 'array',
      items: { type: 'string' }
    }
  },
  additionalProperties: true
}

const createAuthGroup = {
  id: '/createAuthGroup',
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1 }
  },
  required: ['name'],
  additionalProperties: true
}

const updateAuthGroup = {
  id: '/updateAuthGroup',
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1 }
  },
  required: ['name'],
  additionalProperties: true
}

module.exports = {
  mainSchemas: [login, refresh, mfaConfirm, mfaDisable, changePassword, interactionLogin, interactionMfa, createAuthUser, updateAuthUser, createAuthGroup, updateAuthGroup],
  innerSchemas: []
}
