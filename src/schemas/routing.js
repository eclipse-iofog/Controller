/*
 *  *******************************************************************************
 *  * Copyright (c) 2020 Edgeworx, Inc.
 *  *
 *  * This program and the accompanying materials are made available under the
 *  * terms of the Eclipse Public License v. 2.0 which is available at
 *  * http://www.eclipse.org/legal/epl-2.0
 *  *
 *  * SPDX-License-Identifier: EPL-2.0
 *  *******************************************************************************
 *
 */

const { nameRegex } = require('./utils/utils')

const routingCreate = {
  'id': '/routingCreate',
  'type': 'object',
  'properties': {
    'name': {
      'type': 'string',
      'pattern': nameRegex
    }
  },
  'oneOf': [
    {
      'properties': {
        'from': {
          'type': 'string',
          'pattern': nameRegex
        },
        'to': {
          'type': 'string',
          'pattern': nameRegex
        },
        'application': {
          'type': 'string',
          'pattern': nameRegex
        }
      },
      'required': ['name', 'from', 'to', 'application']
    },
    {
      'properties': {
        'sourceMicroserviceUuid': {
          'type': 'string'
        },
        'destMicroserviceUuid': {
          'type': 'string'
        }
      },
      'required': ['name', 'sourceMicroserviceUuid', 'destMicroserviceUuid']
    }
  ],
  'additionalProperties': true
}

const routingUpdate = {
  'id': '/routingUpdate',
  'type': 'object',
  'properties': {
    'name': {
      'type': 'string',
      'pattern': nameRegex
    }
  },
  'oneOf': [
    {
      'properties': {
        'from': {
          'type': 'string',
          'pattern': nameRegex
        },
        'to': {
          'type': 'string',
          'pattern': nameRegex
        },
        'application': {
          'type': 'string',
          'pattern': nameRegex
        }
      },
      'required': ['from', 'to', 'application']
    },
    {
      'properties': {
        'sourceMicroserviceUuid': {
          'type': 'string'
        },
        'destMicroserviceUuid': {
          'type': 'string'
        }
      },
      'required': ['sourceMicroserviceUuid', 'destMicroserviceUuid']
    }
  ],
  'additionalProperties': true
}

module.exports = {
  mainSchemas: [routingUpdate, routingCreate],
  innerSchemas: [routingCreate]
}
