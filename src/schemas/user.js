/*
 *  *******************************************************************************
 *  * Copyright (c) 2023 Datasance Teknoloji A.S.
 *  *
 *  * This program and the accompanying materials are made available under the
 *  * terms of the Eclipse Public License v. 2.0 which is available at
 *  * http://www.eclipse.org/legal/epl-2.0
 *  *
 *  * SPDX-License-Identifier: EPL-2.0
 *  *******************************************************************************
 *
 */

const login = {
  id: '/login',
  type: 'object',
  properties: {
    email: {
      type: 'string',
      pattern: '^(([^<>()\\[\\]\\\\.,;:\\s@"]+(\\.[^<>()\\[\\]\\\\.,;:\\s@"]+)*)|(".+"))@((\\[[0-9]{1,3}\\.[0-9]{1,3}' +
      '\\.[0-9]{1,3}\\.[0-9]{1,3}])|(([a-zA-Z\\-0-9]+\\.)+[a-zA-Z]{2,}))$'
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
  mainSchemas: [login, refresh, mfaConfirm, mfaDisable, changePassword, createAuthUser, updateAuthUser, createAuthGroup, updateAuthGroup],
  innerSchemas: []
}
