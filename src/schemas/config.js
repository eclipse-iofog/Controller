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

const configUpdate = {
  id: '/configUpdate',
  type: 'object',
  properties: {
    port: { type: 'integer', minimum: 0, maximum: 65535 },
    sslCert: { type: 'string' },
    sslKey: { type: 'string' },
    intermediateCert: { type: 'string', optional: true },
    logDir: { type: 'string' },
    logSize: { type: 'integer' }
  }
}

const configElement = {
  id: '/configElement',
  type: 'object',
  properties: {
    key: { type: 'string', minLength: 1 },
    value: { type: 'string' }
  },
  required: ['key', 'value'],
  additionalProperties: true
}

module.exports = {
  mainSchemas: [configUpdate, configElement],
  innerSchemas: []
}
