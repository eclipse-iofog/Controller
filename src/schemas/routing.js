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

const routingCreate = {
  'id': '/routingCreate',
  'type': 'object',
  'properties': {
    'name': {
      'type': 'string',
      'pattern': '^[a-z0-9]([-a-z0-9]*[a-z0-9])?(\\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*$'
    },
    'from': {
      'type': 'string',
      'pattern': '^[a-z0-9]([-a-z0-9]*[a-z0-9])?(\\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*$'
    },
    'to': {
      'type': 'string',
      'pattern': '^[a-z0-9]([-a-z0-9]*[a-z0-9])?(\\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*$'
    },
    'application': {
      'type': 'string',
      'pattern': '^[a-z0-9]([-a-z0-9]*[a-z0-9])?(\\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*$'
    }
  },
  'required': ['name', 'from', 'to', 'application'],
  'additionalProperties': true
}

const routingUpdate = {
  'id': '/routingUpdate',
  'type': 'object',
  'properties': {
    'name': {
      'type': 'string',
      'pattern': '^[a-z0-9]([-a-z0-9]*[a-z0-9])?(\\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*$'
    },
    'from': {
      'type': 'string',
      'pattern': '^[a-z0-9]([-a-z0-9]*[a-z0-9])?(\\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*$'
    },
    'to': {
      'type': 'string',
      'pattern': '^[a-z0-9]([-a-z0-9]*[a-z0-9])?(\\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*$'
    }
  },
  'required': ['from', 'to'],
  'additionalProperties': true
}

module.exports = {
  mainSchemas: [routingUpdate, routingCreate],
  innerSchemas: [routingCreate]
}
