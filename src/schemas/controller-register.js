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

const controllerRegister = {
  'id': '/controllerRegister',
  'type': 'object',
  'properties': {
    'uuid': { 'type': 'string' },
    'name': { 'type': 'string', 'enum': ['controller'] },
    'images': {
      'type': 'array',
      'minItems': 1,
      'maxItems': 4,
      'items': { '$ref': '/image' }
    },
    'registryId': { 'type': 'integer' },
    'ports': {
      'type': 'array',
      'items': { '$ref': '/ports' }
    },
    'volumeMappings': {
      'type': 'array',
      'items': { '$ref': '/volumeMappings' }
    },
    'env': {
      'type': 'array',
      'items': { '$ref': '/env' }
    },
    'config': { 'type': 'string' },
    'hostNetworkMode': { 'type': 'boolean' },
    'runtime': { 'type': 'string' }
  },
  'required': ['uuid', 'images', 'registryId'],
  'additionalProperties': false
}

module.exports = {
  mainSchemas: [controllerRegister],
  innerSchemas: []
}
