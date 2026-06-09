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

module.exports = {
  mainSchemas: [login, refresh],
  innerSchemas: []
}
