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

const registryCreate = {
  'id': '/registryCreate',
  'type': 'object',
  'properties': {
    'url': { 'type': 'string', 'minLength': 1 },
    'isPublic': { 'type': 'boolean' },
    'username': { 'type': 'string', 'minLength': 1 },
    'password': { 'type': 'string' },
    'email': {
      'type': 'string',
      'pattern': '^(([^<>()\\[\\]\\\\.,;:\\s@"]+(\\.[^<>()\\[\\]\\\\.,;:\\s@"]+)*)|(".+"))@((\\[[0-9]{1,3}\\.[0-9]{1,3}' +
      '\\.[0-9]{1,3}\\.[0-9]{1,3}])|(([a-zA-Z\\-0-9]+\\.)+[a-zA-Z]{2,}))$'
    }
  },
  'required': ['url', 'isPublic', 'username', 'password', 'email'],
  'additionalProperties': true
}

const registryDelete = {
  'id': '/registryDelete',
  'type': 'object',
  'properties': {
    'id': { 'type': 'integer' }
  },
  'required': ['id'],
  'additionalProperties': true
}

const registryUpdate = {
  'id': '/registryUpdate',
  'type': 'object',
  'properties': {
    'url': { 'type': 'string', 'minLength': 1 },
    'isPublic': { 'type': 'boolean' },
    'username': { 'type': 'string', 'minLength': 1 },
    'password': { 'type': 'string' },
    'email': {
      'type': 'string',
      'pattern': '^(([^<>()\\[\\]\\\\.,;:\\s@"]+(\\.[^<>()\\[\\]\\\\.,;:\\s@"]+)*)|(".+"))@((\\[[0-9]{1,3}\\.[0-9]{1,3}' +
      '\\.[0-9]{1,3}\\.[0-9]{1,3}])|(([a-zA-Z\\-0-9]+\\.)+[a-zA-Z]{2,}))$'
    }
  },
  'additionalProperties': true
}

module.exports = {
  mainSchemas: [registryCreate, registryDelete, registryUpdate]
}
