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
const { nameRegex, colorRegex, versionRegex } = require('./utils/utils')

const edgeResourceCreate = {
  'id': '/edgeResourceCreate',
  'type': 'object',
  'allOf': [
    { '$ref': '/edgeResource' }
  ],
  required: ['name', 'version'],
  additionalProperties: true
}

const edgeResourceUpdate = {
  'id': '/edgeResourceUpdate',
  'type': 'object',
  'allOf': [
    { '$ref': '/edgeResource' }
  ],
  additionalProperties: true
}

const edgeResource = {
  'id': '/edgeResource',
  'type': 'object',
  'properties': {
    'display': { '$ref': '/edgeResourceDisplay' },
    name: {
      type: 'string',
      'minLength': 1,
      'pattern': nameRegex
    },
    version: {
      type: 'string',
      'minLength': 1,
      'pattern': versionRegex
    },
    description: { type: 'string' },
    orchestrationTags: { type: 'array', items: { type: 'string' } },
    interfaceProtocol: { 'enum': ['http', 'https', 'ws', 'wss'] }
  },
  oneOf: [
    {
      properties: {
        interfaceProtocol: { enum: ['http', 'https', 'ws', 'wss'] },
        interface: {
          type: 'object',
          properties: {
            endpoints: { type: 'array', items: { '$ref': '/edgeResourceHTTPEndpoint' } }
          }
        }
      }
    }
  ]
}

const edgeResourceHTTPEndpoint = {
  id: '/edgeResourceHTTPEndpoint',
  type: 'object',
  properties: {
    name: { type: 'string', pattern: nameRegex },
    description: { type: 'string' },
    method: { enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'] },
    url: { type: 'string' },
    requestType: { type: 'string' },
    responseType: { type: 'string' },
    requestPayloadExample: { type: 'string' },
    responsePayloadExample: { type: 'string' }
  }
}

const edgeResourceDisplay = {
  'id': '/edgeResourceDisplay',
  'type': 'object',
  properties: {
    name: { type: 'string' },
    color: { type: 'string', pattern: colorRegex },
    icon: { type: 'string' }
  },
  additionalProperties: true
}

module.exports = {
  mainSchemas: [edgeResourceCreate, edgeResourceUpdate],
  innerSchemas: [edgeResourceDisplay, edgeResourceHTTPEndpoint, edgeResource]
}
